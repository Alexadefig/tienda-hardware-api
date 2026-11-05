/**
 * Consultas de ejemplo sobre el catálogo.
 *
 * Se ejecutan en paralelo (`Promise.all`) para reducir el tiempo total: son
 * independientes entre sí y MongoDB puede atenderlas concurrentemente.
 *
 * Uso:
 *   npm run consultas
 */

import { cerrarDB, conectarDB } from '../src/db.js';
import { Producto } from '../src/models/producto.js';

/** @param {string} titulo @param {unknown} datos */
function imprimir(titulo, datos) {
  console.log(`\n${titulo}`);
  console.log(JSON.stringify(datos, null, 2));
}

async function main() {
  try {
    await conectarDB();
    console.log('Conectado a MongoDB.');

    const [consultaA, consultaB, consultaC, consultaD] = await Promise.all([
      // A: Tarjetas Gráficas con stock. Usa el prefijo `categoria` del índice
      // `categoria_precio_id` y filtra `stock` como condición residual.
      Producto.find({
        categoria: 'Tarjetas Gráficas',
        stock: { $gt: 0 },
      })
        .lean()
        .exec(),

      // B: Económicos con proyección. No devolvemos `_id` ni campos innecesarios.
      Producto.find(
        { precio: { $lte: 150 } },
        { nombre: 1, precio: 1, categoria: 1, _id: 0 },
      )
        .lean()
        .exec(),

      // C: Compatibles con DDR5 o AM5 mediante $in. Aprovecha el índice
      // multikey `compatibilidad_precio_id`.
      Producto.find({ compatibleCon: { $in: ['DDR5', 'AM5'] } })
        .lean()
        .exec(),

      // D: Top 3 destacados más caros. Usa `destacado_precio_desc`.
      Producto.find(
        { destacado: true },
        { nombre: 1, precio: 1, _id: 0 },
      )
        .sort({ precio: -1 })
        .limit(3)
        .lean()
        .exec(),
    ]);

    imprimir('CONSULTA A: Tarjetas Gráficas con stock disponible', consultaA);
    imprimir('CONSULTA B: Económicos (<= 150) sin _id', consultaB);
    imprimir('CONSULTA C: Compatibles con DDR5 o AM5 ($in)', consultaC);
    imprimir('CONSULTA D: Top 3 productos destacados más caros', consultaD);
  } catch (error) {
    console.error('Error al ejecutar las consultas:', error.message);
    process.exitCode = 1;
  } finally {
    await cerrarDB();
    console.log('\nConexión cerrada con éxito.');
  }
}

await main();
