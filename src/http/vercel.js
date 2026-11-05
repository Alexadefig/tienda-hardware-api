/**
 * Adaptador entre las respuestas neutrales de la aplicación y el runtime
 * Node.js de Vercel (o cualquier `http.ServerResponse`).
 *
 * Mantener este adaptador separado evita que la lógica de negocio dependa de
 * `req`/`res` y facilita los tests.
 */

import { randomUUID } from 'node:crypto';

/**
 * Usa el ID que ya asigna Vercel si existe; si no, genera uno.
 * @param {import('node:http').IncomingMessage} req
 * @returns {string}
 */
export function crearRequestId(req) {
  return (
    req.headers?.['x-vercel-id'] ??
    req.headers?.['x-request-id'] ??
    randomUUID()
  );
}

/**
 * Extrae la query desde `req.url`. `URLSearchParams` conserva duplicados y
 * decodifica los valores, algo que `req.query` no siempre garantiza.
 * @param {import('node:http').IncomingMessage} req
 * @returns {URLSearchParams}
 */
export function extraerSearchParams(req) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  return url.searchParams;
}

/**
 * Envía una respuesta neutral. Soporta el `res` de Vercel (con `status` y
 * `json`) y un `http.ServerResponse` estándar.
 *
 * @param {import('node:http').ServerResponse & { status?: Function, json?: Function }} res
 * @param {{ status: number, body?: unknown, headers?: Record<string, string> }} resultado
 * @param {{ method?: string }} [opciones]
 */
export function enviarResultado(res, resultado, { method = 'GET' } = {}) {
  for (const [nombre, valor] of Object.entries(resultado.headers ?? {})) {
    if (valor !== undefined) res.setHeader(nombre, valor);
  }

  if (typeof res.status === 'function') {
    res.status(resultado.status);
  } else {
    res.statusCode = resultado.status;
  }

  // HEAD debe llevar cabeceras, pero no cuerpo.
  if (resultado.status === 204 || method === 'HEAD' || resultado.body === undefined) {
    return res.end();
  }

  if (typeof res.json === 'function') {
    return res.json(resultado.body);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(resultado.body));
}
