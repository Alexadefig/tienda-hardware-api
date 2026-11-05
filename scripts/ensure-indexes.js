/**
 * Crea de forma explícita los índices definidos en el modelo.
 *
 * Se ejecuta una vez después del despliegue (o cuando cambien los índices):
 *   npm run db:indexes
 *
 * `createIndexes()` es idempotente: si un índice ya existe con la misma
 * definición, MongoDB no hace nada.
 */

import { cerrarDB, conectarDB } from '../src/db.js';
import { Producto } from '../src/models/producto.js';

async function main() {
  try {
    await conectarDB();
    console.log('Creando índices...');

    await Producto.createIndexes();
    console.log('Índices asegurados.');

    const indices = await Producto.collection.indexes();
    console.log('\nÍndices actuales:');
    for (const indice of indices) {
      const unico = indice.unique ? ' (unique)' : '';
      console.log(`- ${indice.name}${unico}: ${JSON.stringify(indice.key)}`);
    }
  } catch (error) {
    console.error('No se pudieron crear los índices:', error.message);
    process.exitCode = 1;
  } finally {
    await cerrarDB();
  }
}

await main();
