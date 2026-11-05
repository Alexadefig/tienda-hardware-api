/**
 * Seed idempotente del catálogo.
 *
 * Uso:
 *   npm run seed          # crea o actualiza por `codigo` (no borra nada)
 *   npm run seed:reset    # vacía la colección y vuelve a insertar
 *
 * Diferencias con el seed original:
 * - Por defecto usa `bulkWrite` con upsert: se puede ejecutar varias veces sin
 *   duplicar datos ni dejar la tienda vacía durante unos segundos.
 * - Valida los datos antes de escribir, con mensajes por campo.
 * - Asegura los índices al final (`createIndexes`), porque `autoIndex` está
 *   desactivado para no pagar ese costo en cada arranque en frío.
 */

import { cerrarDB, conectarDB } from '../src/db.js';
import { Producto } from '../src/models/producto.js';

const PRODUCTOS_INICIALES = Object.freeze([
  {
    codigo: 'CPU-01',
    nombre: 'Intel Core i7-14700K',
    categoria: 'Procesadores',
    precio: 420.5,
    stock: 15,
    compatibleCon: ['LGA1700', 'DDR4', 'DDR5'],
    destacado: true,
  },
  {
    codigo: 'GPU-01',
    nombre: 'NVIDIA GeForce RTX 4070 Super',
    categoria: 'Tarjetas Gráficas',
    precio: 650.0,
    stock: 8,
    compatibleCon: ['PCIe 4.0'],
    destacado: true,
  },
  {
    codigo: 'RAM-01',
    nombre: 'Corsair Vengeance 32GB (2x16GB)',
    categoria: 'Memorias RAM',
    precio: 115.99,
    stock: 25,
    compatibleCon: ['DDR5'],
    destacado: false,
  },
  {
    codigo: 'SSD-01',
    nombre: 'Samsung 990 PRO NVMe 2TB',
    categoria: 'Almacenamiento',
    precio: 179.9,
    stock: 30,
    compatibleCon: ['PCIe 4.0', 'M.2 2280'],
    destacado: false,
  },
  {
    codigo: 'CPU-02',
    nombre: 'AMD Ryzen 7 7800X3D',
    categoria: 'Procesadores',
    precio: 390.0,
    stock: 12,
    compatibleCon: ['AM5', 'DDR5'],
    destacado: true,
  },
]);

/**
 * Valida todos los documentos antes de tocar la base.
 * @param {Array<Record<string, unknown>>} productos
 */
async function validarProductos(productos) {
  const errores = [];

  for (const datos of productos) {
    try {
      await new Producto(datos).validate();
    } catch (error) {
      if (!error.errors) {
        errores.push(`${datos.codigo ?? 'sin-codigo'} -> ${error.message}`);
        continue;
      }

      for (const campo of Object.keys(error.errors)) {
        errores.push(
          `${datos.codigo ?? 'sin-codigo'} -> [${campo}] ${error.errors[campo].message}`,
        );
      }
    }
  }

  if (errores.length > 0) {
    throw new Error(`Datos inválidos:\n${errores.join('\n')}`);
  }
}

async function main() {
  const reiniciar = process.argv.slice(2).includes('--reset');

  try {
    console.log('Conectando a MongoDB...');
    await conectarDB();
    console.log('Conexión establecida.');

    await validarProductos(PRODUCTOS_INICIALES);

    if (reiniciar) {
      console.log('Modo --reset: eliminando productos existentes...');
      const { deletedCount } = await Producto.deleteMany({});
      console.log(`Productos eliminados: ${deletedCount}`);

      const insertados = await Producto.insertMany(PRODUCTOS_INICIALES);
      console.log(`Productos insertados: ${insertados.length}`);
    } else {
      const operaciones = PRODUCTOS_INICIALES.map((producto) => ({
        updateOne: {
          filter: { codigo: producto.codigo },
          update: { $set: producto, $unset: { __v: '' } },
          upsert: true,
        },
      }));

      const resultado = await Producto.bulkWrite(operaciones, { ordered: false });
      console.log(
        `Upserts: ${resultado.upsertedCount}, modificados: ${resultado.modifiedCount}, coincidencias: ${resultado.matchedCount}`,
      );
    }

    // Deja el catálogo listo para las consultas de la API.
    await Producto.createIndexes();
    console.log('Índices asegurados.');

    // Prueba defensiva: el esquema debe rechazar datos inválidos sin escribir.
    console.log('\nPrueba defensiva con datos inválidos...');
    const productoInvalido = new Producto({
      codigo: 'bad-01',
      nombre: 'RTX', // menos de 4 caracteres
      categoria: 'Monitores', // fuera del enum
      precio: -50, // negativo
      stock: 4.5, // no entero
    });

    const errorValidacion = await productoInvalido.validate().then(
      () => null,
      (error) => error,
    );

    if (!errorValidacion) {
      console.warn('La validación no bloqueó el producto inválido (revisar esquema).');
    } else {
      console.log('La validación bloqueó correctamente el producto inválido:');
      const errores = errorValidacion.errors ?? {};
      for (const campo of Object.keys(errores)) {
        console.log(`- [${campo}] ${errores[campo].message}`);
      }
    }
  } catch (error) {
    console.error('Error durante el seed:', error.message);
    process.exitCode = 1;
  } finally {
    await cerrarDB();
    console.log('Conexión cerrada.');
  }
}

await main();
