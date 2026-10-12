# Cuentas Claras

Aplicación de gastos exclusivamente en pesos mexicanos ($ MXN) para registrar compras, repartir saldos, cerrar periodos y compartir reportes.

## Funciones

- Libro local de gastos, integrantes y cierres en pesos mexicanos ($ MXN); no requiere cuenta ni registro.
- Categorías para gastos, filtros por categoría y método de pago, y búsqueda de categorías tolerante a acentos.
- Reportes Excel individuales y generales, descarga y envío voluntario.
- Interacciones accesibles: pestañas de método con teclado y swipe, carril horizontal nativo, acciones de gasto por swipe con botones alternativos, switches con estado, diálogo de confirmación y movimiento reducido.
- Política de privacidad dentro de la aplicación en **Privacidad**.

## Datos y almacenamiento

Los gastos y saldos se guardan en `localStorage` del navegador; la aplicación no los sincroniza a una base de datos. Los libros de la versión anterior se migran añadiendo la categoría **Otros**, sin eliminar sus gastos. Limpiar los datos del sitio elimina el almacenamiento local.

No se añadió un índice de base de datos: el dominio de la aplicación no consulta tablas SQL ni persiste gastos en una base de datos. La política de privacidad describe el tratamiento técnico del alojamiento y de las acciones de exportación/compartir.

## Referencias de código abierto

- [Radix UI Primitives](https://github.com/radix-ui/primitives), primitivas React accesibles reutilizadas para pestañas, switches y paneles.
- [SheetJS Community Edition 0.20.3](https://github.com/e965/sheetjs-npm-publisher), versión parcheada usada para generar reportes Excel; sustituye la versión vulnerable `xlsx@0.18.5`.

## Comprobaciones

```sh
npm test
npm run typecheck
npm run lint
npm audit
npm run build
```
