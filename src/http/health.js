/**
 * Health check con ping real a MongoDB.
 *
 * No se cachea (`no-store`) para que un monitor siempre vea el estado actual.
 * Devuelve 503 si la base no responde, lo que permite configurar alertas.
 */

import mongoose from 'mongoose';
import { conectarDB } from '../db.js';
import { respuestaError, respuestaJson } from './result.js';

/**
 * @param {{ method?: string }} [peticion]
 */
export async function manejarHealth({ method } = {}) {
  const metodo = method ?? 'GET';

  if (metodo !== 'GET' && metodo !== 'HEAD') {
    return respuestaError(405, 'Método no permitido. Solo se acepta GET.', {
      Allow: 'GET, HEAD',
    });
  }

  try {
    await conectarDB();

    const db = mongoose.connection.db;
    if (!db) throw new Error('La conexión de MongoDB no está inicializada');

    // `ping` es la comprobación más liviana disponible en MongoDB.
    await db.admin().ping();

    return respuestaJson(
      200,
      {
        estado: 'ok',
        baseDeDatos: 'conectada',
        uptimeSegundos: Math.round(process.uptime()),
      },
      { 'Cache-Control': 'no-store' },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        nivel: 'error',
        ruta: '/api/health',
        tipo: error?.name,
        mensaje: error?.message,
      }),
    );

    return respuestaError(503, 'Base de datos no disponible', {
      'Retry-After': '5',
    });
  }
}
