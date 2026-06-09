<div align="center">
  <h1>tiksa POS</h1>
  <p><strong>Tu negocio, en control.</strong></p>
  <p>Sistema de punto de venta (POS) completo para negocios colombianos.</p>
  <p>
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express" alt="Express" />
    <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite" alt="SQLite" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss" alt="TailwindCSS" />
    <img src="https://img.shields.io/badge/license-Custom-red" alt="License" />
  </p>
</div>

---

## Descripción

**tiksa POS** es un sistema de punto de venta moderno, rápido y completo, diseñado específicamente para las necesidades del negocio colombiano. Incluye facturación electrónica, control de inventario, gestión de clientes, domicilios, cartera, reportes y más — todo en una interfaz limpia inspirada en Alegra.

---

## Funcionalidades

### Punto de Venta (POS)
- Búsqueda rápida de productos por nombre o código interno
- Atajos de teclado (`Ctrl+K`, `Ctrl+B`, `Ctrl+Enter`, `+`/`-`, `Ctrl+D`, `Ctrl+Q`)
- Lectura de códigos de barras
- 4 listas de precios por producto (Consumo, Reventa, Trabajadores, Misma empresa)
- Presentaciones múltiples por producto (tallas, empaques con factor de stock)
- 7 métodos de pago: Efectivo, Débito, Crédito, Transferencia, **Nequi**, **Daviplata**, Consignación
- Descuento por ítem (porcentaje)
- Nota / observación por ítem
- Ventas a crédito con validación de cupo
- Domicilios con datos del destinatario
- Auto-guardado como temporal cada 30 segundos
- Generación de CUFE (código único de facturación electrónica)
- Impresión de ticket

### Dashboard
- Indicadores clave: ventas, ganancia, número de facturas, ticket promedio
- Gráfico de tendencia de ventas (7 días)
- Desglose por método de pago
- Productos más vendidos
- Proyección de stock (días hasta agotarse)
- Horas pico y días fuertes
- Alertas de créditos pendientes y productos sin stock
- Resumen de domicilios del día

### Historial de Facturas
- Listado paginado con filtros por fecha, método de pago, usuario y texto
- Anular factura (restaura stock automáticamente)
- **Anular y Copiar** — anula y abre los mismos ítems en POS
- Eliminar permanente (solo admin)
- Vista previa / impresión de ticket
- Exportar a CSV

### Domicilios
- Flujo completo: Pendiente → Camino → Entregado
- Botones de copia rápida: Copia Caja, Copia Despacho, Copia Repartidor
- Anular factura desde domicilio
- Historial con filtros

### Inventario
- CRUD completo de productos
- Categorías
- Stock mínimo con indicadores (verde/amarillo/rojo)
- **Ajuste de stock** con modal de agregar/retirar y botones rápidos (+1, +5, +10, +50, +100)
- 4 precios + costo + margen
- Presentaciones por producto
- IVA: 19%, 5%, 0%, Excluido
- Desactivar producto (eliminación suave)

### Clientes
- CRUD completo
- Tipo de persona (Natural / Jurídica)
- Régimen fiscal (Simplificado / Común / Gran contribuyente)
- Lista de precios asignada
- Cupo de crédito con saldo pendiente
- Búsqueda por nombre o NIT

### Cartera / Creditos
- Facturas a crédito con saldo pendiente
- Registro de abonos (parciales o totales)
- Estado automático: activo → pagado

### Cierre de Caja
- Apertura de caja
- Movimientos de efectivo (ingresos / egresos)
- Consignaciones bancarias
- Cuadre de caja: esperado vs real
- Resumen del día: ventas POS, electrónicas, gastos, ganancia, domicilios

### Reportes
- Ventas por día (gráfico + tabla con IVA desglosado)
- Productos más vendidos (cantidad e ingresos)
- Ventas por método de pago
- Indicadores: total ventas, ganancia, facturas, IVA

### Gastos
- Registro de gastos por categoría
- Filtro por fecha y categoría

### Notas Credito
- Notas crédito totales y parciales
- Desglose de IVA (19% y 5%)
- Anular nota crédito (restaura inventario)

### Cambios y Devoluciones
- Devolución contra factura original
- Selección de ítems a devolver
- Producto de reemplazo
- Cálculo automático de diferencia
- Causales: Producto defectuoso, Cambio de talla, No le gustó, Producto equivocado, Garantía

### Usuarios
- 4 roles: Admin, Encargado, Cajero, Domicilios
- Permisos granulares por rol
- Activar / desactivar usuarios

### Auditoria
- Registro de todas las acciones del sistema
- Filtro por tipo, usuario y fecha
- Limpieza de registros antiguos

---

## Stack Tecnológico

| Capa        | Tecnología                                                  |
| ----------- | ----------------------------------------------------------- |
| Frontend    | React 18 + Vite + TailwindCSS 3 + Lucide + Recharts        |
| Backend     | Express 4 + better-sqlite3 + JWT + Helmet + express-rate-limit |
| Base de datos | SQLite (WAL mode)                                        |
| Tiempo      | Colombia (America/Bogota) — hardcodeado                     |
| Moneda      | COP (Peso Colombiano)                                       |

---

## Requisitos

- **Node.js** 18+
- **npm** 9+

---

## Instalación Rápida

```bash
# Clonar
git clone https://github.com/jhongutis21-lang/tiksa.git
cd tiksa

# Backend
cd backend
npm install
cp .env.example .env   # editar variables
npm run seed           # crear datos de ejemplo
npm start              # http://localhost:5000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Variables de Entorno (`.env`)

```env
PORT=5000
JWT_SECRET=            # se genera automáticamente si está vacío
JWT_EXPIRES_IN=8h
```

### Usuarios por Defecto (seed)

| Usuario | Contraseña | Rol       |
| ------- | ---------- | --------- |
| admin   | admin123   | Admin     |
| cajero  | cajero123  | Cajero    |
| dom     | dom123     | Domicilios |

---

## Scripts Disponibles

### Backend
| Comando       | Descripción                     |
| ------------- | ------------------------------- |
| `npm start`   | Inicia servidor en producción   |
| `npm run dev` | Inicia con nodemon (desarrollo) |
| `npm run seed`| Poblar base de datos con datos demo |

### Frontend
| Comando       | Descripción                     |
| ------------- | ------------------------------- |
| `npm run dev` | Servidor de desarrollo Vite     |
| `npm run build`| Build para producción          |
| `npm run preview`| Vista previa del build        |

Todo es posible
---

## Licencia

**Copyright © 2026 Jhonatan David Gutierrez Gutierrez — Todos los derechos reservados.**

Se permite ver y leer el código con fines educativos o de consulta.  
Queda prohibido copiar, modificar, distribuir o usar el software sin autorización previa por escrito del autor.

Hecho con [OpenCode](https://opencode.ai) — asistido por inteligencia artificial.

---

<p align="center">Hecho para negocios colombianos</p>
