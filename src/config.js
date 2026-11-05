/**
 * Configuración central de la aplicación.
 *
 * - Carga `.env` con la API nativa de Node (`process.loadEnvFile`) en lugar de
 *   `dotenv`: menos dependencias y menos código en el arranque en frío.
 * - En Vercel las variables las inyecta la plataforma, por eso no se intenta
 *   leer un archivo `.env` allí.
 * - Cualquier variable numérica mal configurada falla rápido y con un mensaje
 *   claro, en vez de producir comportamientos silenciosos.
 */

import { loadEnvFile } from 'node:process';
import {
  MAX_PRODUCTOS_POR_PAGINA,
  PRODUCTOS_POR_PAGINA,
} from './domain/producto.js';

// Node >= 20.19 incluye loadEnvFile. Si no existe `.env`, no es un error.
if (!process.env.VERCEL) {
  try {
    loadEnvFile();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/**
 * Lee un entero desde una variable de entorno.
 * @param {string} nombre
 * @param {number} valorPorDefecto
 * @param {number} minimo
 * @returns {number}
 */
function enteroDesdeEnv(nombre, valorPorDefecto, minimo) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') return valorPorDefecto;

  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < minimo) {
    throw new Error(
      `La variable de entorno ${nombre} debe ser un entero mayor o igual que ${minimo}`,
    );
  }
  return numero;
}

/** Configuración inmutable, agrupada por área. */
export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGODB_URI,

  db: Object.freeze({
    // En serverless conviene un pool pequeño: cada instancia atiende pocas
    // peticiones concurrentes y así no agotamos las conexiones de Atlas.
    maxPoolSize: enteroDesdeEnv('MONGODB_MAX_POOL_SIZE', 5, 1),
    // Fallar rápido si Atlas no responde; Vercel espera una respuesta acotada.
    serverSelectionTimeoutMS: enteroDesdeEnv(
      'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
      5_000,
      1,
    ),
    socketTimeoutMS: enteroDesdeEnv('MONGODB_SOCKET_TIMEOUT_MS', 45_000, 1),
    // 0 desactiva el cierre por inactividad (útil en tests locales).
    maxIdleTimeMS: enteroDesdeEnv('MONGODB_MAX_IDLE_TIME_MS', 60_000, 0),
  }),

  http: Object.freeze({
    defaultPageSize: PRODUCTOS_POR_PAGINA,
    maxPageSize: MAX_PRODUCTOS_POR_PAGINA,
    // Corta consultas que se eternizan; Vercel tiene su propio maxDuration.
    queryTimeoutMS: enteroDesdeEnv('QUERY_TIMEOUT_MS', 5_000, 1),
    // 0 desactiva la caché del CDN.
    cacheSeconds: enteroDesdeEnv('CACHE_SECONDS', 60, 0),
    staleSeconds: enteroDesdeEnv('STALE_SECONDS', 300, 0),
  }),
});

/**
 * Devuelve la URI de MongoDB o lanza un error explícito.
 * Se valida de forma perezosa para no romper el build de Vercel cuando la
 * variable todavía no está disponible.
 * @returns {string}
 */
export function obtenerMongoUri() {
  if (!config.mongoUri) {
    throw new Error('La variable de entorno MONGODB_URI no está configurada');
  }
  return config.mongoUri;
}
