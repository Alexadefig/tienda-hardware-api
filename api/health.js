/**
 * GET /api/health
 *
 * Endpoint de salud para monitoreo. Hace ping real a MongoDB.
 */

import { manejarHealth } from '../src/http/health.js';
import { respuestaError } from '../src/http/result.js';
import { crearRequestId, enviarResultado } from '../src/http/vercel.js';

export default async function handler(req, res) {
  const requestId = crearRequestId(req);

  let resultado;
  try {
    resultado = await manejarHealth({ method: req.method });
  } catch (error) {
    console.error(
      JSON.stringify({
        nivel: 'error',
        ruta: '/api/health',
        requestId,
        tipo: error?.name,
        mensaje: error?.message,
      }),
    );
    resultado = respuestaError(500, 'Error interno del servidor');
  }

  resultado.headers = {
    ...resultado.headers,
    'X-Request-Id': requestId,
  };

  return enviarResultado(res, resultado, { method: req.method });
}
