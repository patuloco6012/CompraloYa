# Compralo Ya – Tienda online

Tienda con carrito, registro/inicio de sesión y pedidos guardados en **MySQL**.
Tecnologías: Node.js + Express + MySQL (HTML, CSS y JS en el frontend).

## Requisitos
- [Node.js](https://nodejs.org) 18 o superior
- MySQL 5.7+ / 8 (o MariaDB con XAMPP)

## Puesta en marcha (VS Code)
1. Abrí esta carpeta en VS Code (`Archivo > Abrir carpeta`).
2. Creá la base de datos: ejecutá el archivo `database.sql` en MySQL Workbench / phpMyAdmin
   (o en la terminal: `mysql -u root -p < database.sql`).
3. Copiá `.env.example` como `.env` y poné tu usuario y contraseña de MySQL.
4. En la terminal de VS Code (`Ctrl + ñ`):
   ```
   npm install
   npm start
   ```
5. Abrí http://localhost:3000

## Qué se guarda en la base de datos
| Tabla | Contenido |
|---|---|
| `usuarios` | nombre, apellido, correo y contraseña (encriptada con bcrypt) |
| `productos` | catálogo, precios y características |
| `pedidos` | usuario, dirección de entrega, total y estado |
| `pedido_items` | productos y cantidades de cada pedido |

Consulta rápida de pedidos con datos del cliente:
```sql
SELECT p.id, u.nombre, u.apellido, u.email, p.direccion, p.localidad, p.total, p.creado_en
FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id ORDER BY p.id DESC;
```

## Personalizar
- **Precios / productos:** editá la tabla `productos` (ej: `UPDATE productos SET precio = 12000 WHERE slug = 'parlante-a005';`).
- **Imágenes:** carpeta `public/img`.
- **Colores:** variables al inicio de `public/css/style.css`.
