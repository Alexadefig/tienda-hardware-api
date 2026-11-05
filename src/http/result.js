/**
 * Utilidades para construir respuestas HTTP neutrales.
 *
 * El handler no conoce Vercel ni Node: devuelve `{ status, body, headers }`.
 * Eso permite reutilizarlo desde el servidor local, desde tests y desde la
 * función serverless sin duplicar lógica.
 */

const CABECERAS_BASE = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
});

/**
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [headers]
 */
export function respuestaJson(status, body, headers = {}) {
  return {
    status,
    body,
    headers: { ...CABECERAS_BASE, ...headers },
  };
}

/**
 * Las respuestas de error nunca se cachean: un 400/500 no debe quedar en el
 * CDN ni en el navegador.
 * @param {number} status
 * @param {string} mensaje
 * @param {Record<string, string>} [headers]
 */
export function respuestaError(status, mensaje, headers = {}) {
  return respuestaJson(
    status,
    { mensaje },
    { 'Cache-Control': 'no-store', ...headers },
  );
}
