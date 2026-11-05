/**
 * Caso de uso: listar productos.
 *
 * No depende de Vercel ni de Node: recibe método y `URLSearchParams`, y
 * devuelve una respuesta neutral. Esto permite probar la lógica y reutilizarla
 * en el servidor local.
 */

import { conectarDB } from '../db.js';
import { esErrorDeConexion, esTimeoutDeConsulta } from '../lib/errors.js';
import { parsearQueryProductos } from '../lib/query.js';
import { listarProductos } from '../services/productos.js';
import { cabecerasCache } from './cache.js';
import { respuestaError, respuestaJson } from './result.js';

/**
 * @param {{ method?: string, searchParams: URLSearchParams, requestId?: string }} peticion
 */
export async function manejarProductos({ method, searchParams, requestId }) {
  const metodo = method ?? 'GET';

  if (metodo !== 'GET' && metodo !== 'HEAD') {
    return respuestaError(405, 'Método no permitido. Solo se acepta GET.', {
      Allow: 'GET, HEAD',
    });
  }

  const validacion = parsearQueryProductos(searchParams);
  if (!validacion.ok) {
    return respuestaError(400, validacion.mensaje);
  }

  const { pagina, limite, filtro } = validacion.params;

  try {
    await conectarDB();
    const { total, productos, totalPaginas } = await listarProductos({
      filtro,
      pagina,
      limite,
    });

    return respuestaJson(
      200,
      {
        total,
        pagina,
        limite,
        totalPaginas,
        filtrosAplicados: filtro,
        productos,
      },
      cabecerasCache(),
    );
  } catch (error) {
    // Log estructurado: fácil de filtrar en los logs de Vercel.
    console.error(
      JSON.stringify({
        nivel: 'error',
        ruta: '/api/productos',
        requestId,
        tipo: error?.name,
        mensaje: error?.message,
      }),
    );

    if (esTimeoutDeConsulta(error)) {
      return respuestaError(
        504,
        'La consulta tardó demasiado. Intenta con menos resultados.',
        { 'Retry-After': '2' },
      );
    }

    if (esErrorDeConexion(error)) {
      return respuestaError(
        503,
        'Servicio temporalmente no disponible. Intenta nuevamente.',
        { 'Retry-After': '5' },
      );
    }

    return respuestaError(
      500,
      'Error interno del servidor al consultar productos',
    );
  }
}
