/**
 * Acceso a datos del catálogo.
 *
 * `countDocuments` y `find` se ejecutan en paralelo con `Promise.all` para
 * aprovechar la latencia de red: aunque son dos operaciones, se solapan.
 *
 * Se usa `countDocuments` (exacto) en lugar de `estimatedDocumentCount`
 * (aproximado) porque `total` y `totalPaginas` forman parte del contrato de la
 * API. Si el catálogo creciera mucho y el total dejara de ser crítico, ese es
 * el primer cambio a evaluar.
 *
 * `lean()` devuelve objetos planos (sin hidratar documentos de Mongoose) y la
 * proyección evita enviar `__v`. Ambas cosas reducen CPU y bytes de respuesta.
 */

import { config } from '../config.js';
import { ORDEN_PRODUCTOS, PROYECCION_PRODUCTO } from '../domain/producto.js';
import { Producto } from '../models/producto.js';

/**
 * @param {{ filtro: Record<string, unknown>, pagina: number, limite: number }} opciones
 * @returns {Promise<{ total: number, productos: unknown[], totalPaginas: number }>}
 */
export async function listarProductos({ filtro, pagina, limite }) {
  const saltar = (pagina - 1) * limite;
  const timeout = config.http.queryTimeoutMS;

  const [total, productos] = await Promise.all([
    Producto.countDocuments(filtro).maxTimeMS(timeout).exec(),
    Producto.find(filtro)
      .select(PROYECCION_PRODUCTO)
      .sort(ORDEN_PRODUCTOS)
      .skip(saltar)
      .limit(limite)
      .lean()
      .maxTimeMS(timeout)
      .exec(),
  ]);

  return {
    total,
    productos,
    totalPaginas: Math.ceil(total / limite),
  };
}
