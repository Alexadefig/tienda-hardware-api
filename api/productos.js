/**
 * GET /api/productos
 *
 * Función serverless de Vercel. Es deliberadamente delgada: valida, delega en
 * el caso de uso y adapta la respuesta. Toda la optimización vive en
 * `src/services` y `src/db`.
 */

import { manejarProductos } from '../src/http/productos.js';
import { respuestaError } from '../src/http/result.js';
import {
  crearRequestId,
  enviarResultado,
  extraerSearchParams,
} from '../src/http/vercel.js';

export default async function handler(req, res) {
  const requestId = crearRequestId(req);

  let resultado;
  try {
    resultado = await manejarProductos({
      method: req.method,
      searchParams: extraerSearchParams(req),
      requestId,
    });
  } catch (error) {
    // Red de seguridad: un bug inesperado nunca debe tumbar la función.
    console.error(
      JSON.stringify({
        nivel: 'error',
        ruta: '/api/productos',
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
