/**
 * Conexión única a MongoDB, reutilizable entre invocaciones serverless.
 *
 * Optimizaciones clave:
 * 1. Se cachea la promesa de conexión en `globalThis`. En Vercel, una instancia
 *    "caliente" reutiliza el proceso y, por tanto, el pool de conexiones.
 * 2. Se deduplican conexiones concurrentes: si llegan 10 peticiones a la vez,
 *    solo se abre un pool.
 * 3. `bufferCommands: false` hace que una query falle rápido si no hay
 *    conexión, en lugar de acumular bufffers y consumir memoria.
 * 4. `autoIndex` y `autoCreate` están desactivados: los índices se gestionan
 *    explícitamente con `npm run db:indexes` para no pagar ese costo en cada
 *    arranque en frío.
 * 5. Compresión zlib del protocolo de MongoDB reduce bytes en la red.
 */

import mongoose from 'mongoose';
import { config, obtenerMongoUri } from './config.js';

const ESTADO_CONECTADO = 1;
const ESTADO_DESCONECTADO = 0;

/**
 * Caché global. Usamos un símbolo de texto para sobrevivir a la re-evaluación
 * de módulos en desarrollo (hot reload) y en instancias tibias de Vercel.
 */
const cacheGlobal = globalThis;
const cache = (cacheGlobal.__tiendaHardwareDb ??= {
  promesa: null,
  oyentesInstalados: false,
});

// Opciones globales de Mongoose.
mongoose.set('autoIndex', false);
mongoose.set('strictQuery', true);

const OPCIONES_CONEXION = Object.freeze({
  bufferCommands: false,
  autoCreate: false,
  maxPoolSize: config.db.maxPoolSize,
  minPoolSize: 0,
  maxIdleTimeMS: config.db.maxIdleTimeMS,
  serverSelectionTimeoutMS: config.db.serverSelectionTimeoutMS,
  socketTimeoutMS: config.db.socketTimeoutMS,
  connectTimeoutMS: config.db.serverSelectionTimeoutMS,
  heartbeatFrequencyMS: 10_000,
  // zlib viene incluido en Node; no agrega dependencias.
  compressors: ['zlib'],
  appName: 'tienda-hardware-api',
});

/**
 * Instala una sola vez los listeners de ciclo de vida de la conexión.
 * Si la conexión se cae, limpiamos la promesa cacheada para permitir que la
 * siguiente petición vuelva a conectar.
 */
function instalarOyentes() {
  if (cache.oyentesInstalados) return;
  cache.oyentesInstalados = true;

  const conexion = mongoose.connection;

  conexion.on('disconnected', () => {
    cache.promesa = null;
  });

  conexion.on('error', (error) => {
    // No exponemos detalles internos al cliente; solo dejamos traza en logs.
    console.error('[db] Error de conexión:', error.message);
    cache.promesa = null;
  });
}

/**
 * Devuelve una conexión activa, creándola si hace falta.
 * Es seguro llamar a esta función en cada petición.
 * @returns {Promise<import('mongoose').Connection>}
 */
export async function conectarDB() {
  instalarOyentes();

  if (mongoose.connection.readyState === ESTADO_CONECTADO) {
    return mongoose.connection;
  }

  // Si ya hay una conexión en curso, la reutilizamos. Si esa promesa quedó
  // obsoleta (la conexión se cayó), la descartamos y reintentamos.
  if (cache.promesa) {
    try {
      await cache.promesa;
    } catch {
      // El error real se maneja en el bloque de creación de abajo.
    }
    if (mongoose.connection.readyState === ESTADO_CONECTADO) {
      return mongoose.connection;
    }
    cache.promesa = null;
  }

  cache.promesa = mongoose
    .connect(obtenerMongoUri(), OPCIONES_CONEXION)
    .then((instancia) => {
      if (config.nodeEnv !== 'production') {
        console.log('[db] Conexión establecida con MongoDB');
      }
      return instancia.connection;
    })
    .catch((error) => {
      cache.promesa = null;
      throw error;
    });

  return cache.promesa;
}

/** Indica si hay una conexión lista para usarse. */
export function estaConectada() {
  return mongoose.connection.readyState === ESTADO_CONECTADO;
}

/**
 * Cierra la conexión. Se usa en scripts y en el apagado del servidor local;
 * nunca en el handler de Vercel, donde la conexión debe reutilizarse.
 */
export async function cerrarDB() {
  cache.promesa = null;
  if (mongoose.connection.readyState !== ESTADO_DESCONECTADO) {
    await mongoose.disconnect();
  }
}
