# Cuentas Claras

Aplicación de gastos en pesos mexicanos para registrar compras, repartir saldos, cerrar periodos y compartir reportes.

## Funciones

- Libro local de gastos, integrantes y cierres; no requiere cuenta ni registro.
- Categorías para gastos, filtros por categoría y método de pago, y búsqueda de categorías tolerante a acentos.
- Conversor de referencia USD/EUR → MXN con la API pública de [Frankfurter](https://www.frankfurter.dev/). No necesita API key ni registro. Solo se consulta cuando se abre o actualiza el conversor; nunca se mandan gastos ni nombres. La última respuesta se guarda en el navegador por seis horas y se conserva como alternativa sin conexión.
- Reportes Excel individuales y generales, descarga y envío voluntario.
- Interacciones accesibles: pestañas de método con teclado y swipe, carril horizontal nativo, acciones de gasto por swipe con botones alternativos, switches con estado, diálogo de confirmación y movimiento reducido.
- Política de privacidad dentro de la aplicación en **Privacidad**.

Las tasas de Frankfurter son referencias del último día hábil y no garantizan el precio de una operación bancaria.

## Datos y almacenamiento

Los gastos y saldos se guardan en `localStorage` del navegador; la aplicación no los sincroniza a una base de datos. Los libros de la versión anterior se migran añadiendo la categoría **Otros**, sin eliminar sus gastos. Las tasas se guardan en una clave local separada. Limpiar los datos del sitio elimina ambos almacenamientos.

No se añadió un índice de base de datos: el dominio de la aplicación no consulta tablas SQL ni persiste gastos en una base de datos. La política de privacidad describe el tratamiento técnico del alojamiento y de las acciones de exportación/compartir.

## Referencias de código abierto

- [Frankfurter](https://github.com/lineofflight/frankfurter), API y datos de divisas de código abierto.
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
