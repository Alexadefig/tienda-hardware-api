/**
 * Cabeceras de caché para respuestas exitosas.
 *
 * Con `s-maxage` Vercel cachea la respuesta en su CDN y evita llegar a la
 * función (y a MongoDB) en peticiones repetidas. `stale-while-revalidate`
 * sirve una copia mientras se refresca en segundo plano, reduciendo latencia.
 * `CDN-Cache-Control` explícita la política solo para el CDN.
 */

import { config } from '../config.js';

/**
 * @returns {Record<string, string>}
 */
export function cabecerasCache() {
  if (config.http.cacheSeconds <= 0) {
    return { 'Cache-Control': 'no-store' };
  }

  const valor = `public, s-maxage=${config.http.cacheSeconds}, stale-while-revalidate=${config.http.staleSeconds}`;

  return {
    'Cache-Control': valor,
    'CDN-Cache-Control': valor,
  };
}
