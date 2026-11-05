/**
 * Detección de errores transitorios de infraestructura.
 *
 * Distinguir un fallo de conexión/timeout de un error de programación permite
 * devolver 503 o 504 (reintentables) en lugar de un 500 genérico. Eso mejora
 * la experiencia de los clientes y la observabilidad.
 */

const ERRORES_DE_CONEXION = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoTimeoutError',
  'MongoTopologyClosedError',
]);

/** Código de MongoDB para `MaxTimeMSExpired`. */
const CODIGO_TIMEOUT = 50;

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function esErrorDeConexion(error) {
  if (!error || typeof error !== 'object') return false;
  return (
    ERRORES_DE_CONEXION.has(error.name) ||
    ERRORES_DE_CONEXION.has(error.cause?.name)
  );
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function esTimeoutDeConsulta(error) {
  if (!error || typeof error !== 'object') return false;
  return error.code === CODIGO_TIMEOUT || error.name === 'MongoExecutionTimeoutError';
}
