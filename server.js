/**
 * Servidor HTTP local para desarrollo.
 *
 * Vercel ejecuta `api/productos.js` y `api/health.js`; este servidor permite
 * probar exactamente la misma lógica sin instalar la CLI de Vercel.
 *
 * Uso:
 *   npm run dev
 *   curl "http://localhost:3000/api/productos?pagina=1&limite=5"
 */

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { cerrarDB } from './src/db.js';
import { manejarHealth } from './src/http/health.js';
import { manejarProductos } from './src/http/productos.js';
import { respuestaError, respuestaJson } from './src/http/result.js';

const PUERTO = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(PUERTO) || PUERTO < 1 || PUERTO > 65_535) {
  console.error('PORT debe ser un entero entre 1 y 65535');
  process.exit(1);
}

const RUTAS = Object.freeze({
  '/api/productos': manejarProductos,
  '/api/health': manejarHealth,
});

const servidor = createServer(async (req, res) => {
  const inicio = performance.now();
  const requestId = req.headers['x-request-id'] ?? randomUUID();
  let resultado;

  try {
    const url = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? 'localhost'}`,
    );

    if (url.pathname === '/') {
      resultado = respuestaJson(200, {
        nombre: 'Tienda Hardware API',
        endpoints: ['/api/productos', '/api/health'],
      });
    } else {
      const manejador = RUTAS[url.pathname];

      resultado = manejador
        ? await manejador({
            method: req.method,
            searchParams: url.searchParams,
            requestId,
          })
        : respuestaError(404, 'Ruta no encontrada');
    }
  } catch (error) {
    console.error('[server]', requestId, error);
    resultado = respuestaError(500, 'Error interno del servidor');
  }

  for (const [nombre, valor] of Object.entries(resultado.headers ?? {})) {
    res.setHeader(nombre, valor);
  }
  res.setHeader('X-Request-Id', requestId);
  res.statusCode = resultado.status;

  if (
    req.method === 'HEAD' ||
    resultado.status === 204 ||
    resultado.body === undefined
  ) {
    res.end();
  } else {
    res.end(JSON.stringify(resultado.body));
  }

  const duracion = Math.round(performance.now() - inicio);
  console.log(`${req.method} ${req.url} -> ${resultado.status} (${duracion} ms)`);
});

servidor.on('error', (error) => {
  console.error('[server] No se pudo iniciar:', error.message);
  process.exit(1);
});

servidor.listen(PUERTO, () => {
  console.log(`API local: http://localhost:${PUERTO}`);
  console.log(`Productos: http://localhost:${PUERTO}/api/productos`);
  console.log(`Salud:     http://localhost:${PUERTO}/api/health`);
});

let cerrando = false;

/**
 * Apagado ordenado: deja de aceptar peticiones y cierra MongoDB.
 * @param {string} senal
 */
async function apagar(senal) {
  if (cerrando) return;
  cerrando = true;
  console.log(`\n${senal} recibido. Cerrando servidor...`);

  servidor.close(async () => {
    await cerrarDB();
    process.exit(0);
  });

  // Si alguna conexión queda colgada, forzamos la salida.
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
