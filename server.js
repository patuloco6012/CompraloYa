require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'compraloya',
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-compraloya',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const parseJson = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Iniciá sesión para continuar.' });
  next();
}

/* ---------- Usuarios ---------- */
app.post('/api/registro', async (req, res) => {
  try {
    const nombre = clean(req.body.nombre, 60);
    const apellido = clean(req.body.apellido, 60);
    const email = clean(req.body.email, 120).toLowerCase();
    const password = String(req.body.password ?? '');

    if (!nombre || !apellido) return res.status(400).json({ error: 'Completá tu nombre y apellido.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Ingresá un correo válido.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length) return res.status(409).json({ error: 'Ese correo ya está registrado. Probá iniciar sesión.' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password_hash) VALUES (?,?,?,?)',
      [nombre, apellido, email, hash]
    );
    req.session.user = { id: r.insertId, nombre, apellido, email };
    res.json({ user: req.session.user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No pudimos crear tu cuenta. Intentá de nuevo.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = clean(req.body.email, 120).toLowerCase();
    const password = String(req.body.password ?? '');
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash)))
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    req.session.user = { id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email };
    res.json({ user: req.session.user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No pudimos iniciar sesión. Intentá de nuevo.' });
  }
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

/* ---------- Productos ---------- */
app.get('/api/productos', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos WHERE activo = 1 ORDER BY id');
    res.json(
      rows.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        descripcion: p.descripcion,
        precio: Number(p.precio),
        imagen: '/img/' + p.imagen,
        caracteristicas: parseJson(p.caracteristicas),
        contenido: parseJson(p.contenido),
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No pudimos cargar los productos.' });
  }
});

/* ---------- Pedidos ---------- */
app.post('/api/pedidos', requireAuth, async (req, res) => {
  const direccion = clean(req.body.direccion, 160);
  const localidad = clean(req.body.localidad, 80);
  const telefono = clean(req.body.telefono, 30) || null;
  const observaciones = clean(req.body.observaciones, 255) || null;
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!direccion || !localidad)
    return res.status(400).json({ error: 'Ingresá la dirección donde recibirás el pedido.' });
  if (!items.length) return res.status(400).json({ error: 'Tu carrito está vacío.' });

  const cantidades = new Map();
  for (const it of items) {
    const id = Number(it.id);
    const cant = Math.min(Math.max(parseInt(it.cantidad, 10) || 0, 0), 20);
    if (id && cant) cantidades.set(id, (cantidades.get(id) || 0) + cant);
  }
  if (!cantidades.size) return res.status(400).json({ error: 'Tu carrito está vacío.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [...cantidades.keys()];
    const [prods] = await conn.query('SELECT id, precio FROM productos WHERE activo = 1 AND id IN (?)', [ids]);
    if (prods.length !== ids.length) throw Object.assign(new Error('prod'), { status: 400 });

    // El total se calcula en el servidor con los precios de la base de datos
    let total = 0;
    for (const p of prods) total += Number(p.precio) * cantidades.get(p.id);

    const [r] = await conn.query(
      'INSERT INTO pedidos (usuario_id, direccion, localidad, telefono, observaciones, total) VALUES (?,?,?,?,?,?)',
      [req.session.user.id, direccion, localidad, telefono, observaciones, total]
    );
    for (const p of prods) {
      await conn.query(
        'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)',
        [r.insertId, p.id, cantidades.get(p.id), p.precio]
      );
    }
    await conn.commit();
    res.json({ ok: true, pedidoId: r.insertId, total });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(e.status || 500).json({ error: 'No pudimos registrar tu pedido. Revisá el carrito e intentá de nuevo.' });
  } finally {
    conn.release();
  }
});

app.get('/api/pedidos', requireAuth, async (req, res) => {
  try {
    const [pedidos] = await pool.query(
      'SELECT id, direccion, localidad, total, estado, creado_en FROM pedidos WHERE usuario_id = ? ORDER BY id DESC',
      [req.session.user.id]
    );
    for (const p of pedidos) {
      const [items] = await pool.query(
        `SELECT pr.nombre, i.cantidad, i.precio_unitario
         FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id WHERE i.pedido_id = ?`,
        [p.id]
      );
      p.items = items;
      p.total = Number(p.total);
    }
    res.json(pedidos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No pudimos cargar tus pedidos.' });
  }
});

app.listen(PORT, () => console.log(`Compralo Ya funcionando en http://localhost:${PORT}`));
