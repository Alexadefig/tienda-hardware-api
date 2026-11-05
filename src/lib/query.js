/**
 * Validación y normalización de los parámetros de `GET /api/productos`.
 *
 * Es una función pura (no toca la base de datos), lo que permite testearla
 * rápido y reutilizarla desde el servidor local o desde Vercel.
 *
 * Reglas:
 * - Cada parámetro puede aparecer una sola vez y con un valor no vacío.
 * - `pagina` y `limite` solo aceptan dígitos (nada de `1e3`, `1.5` ni `-1`).
 * - `precioMax` acepta enteros y decimales no negativos.
 * - `categoria` debe pertenecer al enum del modelo.
 * - Los parámetros desconocidos se ignoran para no romper clientes antiguos.
 */

import {
  CATEGORIAS,
  MAX_PRODUCTOS_POR_PAGINA,
  PRODUCTOS_POR_PAGINA,
} from '../domain/producto.js';

const PARAMETROS_CONOCIDOS = Object.freeze([
  'categoria',
  'precioMax',
  'compatibilidad',
  'pagina',
  'limite',
]);

const PRECIO_VALIDO = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
const ENTERO_POSITIVO = /^\d+$/;
const MAX_LONGITUD_COMPATIBILIDAD = 100;

/** Mensaje común para valores duplicados o vacíos. */
const mensajeValorUnico = (nombre) =>
  `El parámetro "${nombre}" debe tener un único valor de texto no vacío`;

/**
 * Lee un parámetro de la query.
 * @param {URLSearchParams} searchParams
 * @param {string} nombre
 * @returns {{ ok: true, valor: string|undefined } | { ok: false, mensaje: string }}
 */
function leerParametro(searchParams, nombre) {
  const valores = searchParams.getAll(nombre);

  if (valores.length > 1) {
    return { ok: false, mensaje: mensajeValorUnico(nombre) };
  }
  if (valores.length === 0) {
    return { ok: true, valor: undefined };
  }

  const valor = valores[0].trim();
  if (valor === '') {
    return { ok: false, mensaje: mensajeValorUnico(nombre) };
  }
  return { ok: true, valor };
}

/**
 * Construye el filtro de MongoDB a partir de valores ya validados.
 * Mantiene la misma forma que la API original (`{ precio: { $lte: n } }`).
 * @param {{ categoria?: string, precioMax?: number, compatibilidad?: string }} entrada
 * @returns {Record<string, unknown>}
 */
export function construirFiltro({ categoria, precioMax, compatibilidad }) {
  const filtro = {};

  if (categoria !== undefined) filtro.categoria = categoria;
  if (precioMax !== undefined) filtro.precio = { $lte: precioMax };
  if (compatibilidad !== undefined) filtro.compatibleCon = compatibilidad;

  return filtro;
}

/**
 * Valida y normaliza toda la query.
 * @param {URLSearchParams} searchParams
 * @returns {{ ok: true, params: { pagina: number, limite: number, filtro: Record<string, unknown> } } | { ok: false, mensaje: string }}
 */
export function parsearQueryProductos(searchParams) {
  const leidos = {};

  for (const nombre of PARAMETROS_CONOCIDOS) {
    const resultado = leerParametro(searchParams, nombre);
    if (!resultado.ok) return resultado;
    leidos[nombre] = resultado.valor;
  }

  const { categoria, compatibilidad } = leidos;

  // --- Categoría -------------------------------------------------------------
  if (categoria !== undefined && !CATEGORIAS.includes(categoria)) {
    return { ok: false, mensaje: 'La categoría indicada no es válida' };
  }

  // --- Precio máximo ---------------------------------------------------------
  let precioMax;
  if (leidos.precioMax !== undefined) {
    if (!PRECIO_VALIDO.test(leidos.precioMax)) {
      return {
        ok: false,
        mensaje: 'El parámetro "precioMax" debe ser un número mayor o igual que 0',
      };
    }
    precioMax = Number(leidos.precioMax);
    if (!Number.isFinite(precioMax)) {
      return {
        ok: false,
        mensaje: 'El parámetro "precioMax" debe ser un número mayor o igual que 0',
      };
    }
  }

  // --- Compatibilidad --------------------------------------------------------
  if (
    compatibilidad !== undefined &&
    compatibilidad.length > MAX_LONGITUD_COMPATIBILIDAD
  ) {
    return {
      ok: false,
      mensaje: `El parámetro "compatibilidad" no puede superar los ${MAX_LONGITUD_COMPATIBILIDAD} caracteres`,
    };
  }

  // --- Paginación ------------------------------------------------------------
  if (
    leidos.pagina !== undefined &&
    !ENTERO_POSITIVO.test(leidos.pagina)
  ) {
    return {
      ok: false,
      mensaje: 'El parámetro "pagina" debe ser un entero mayor que 0',
    };
  }
  if (
    leidos.limite !== undefined &&
    !ENTERO_POSITIVO.test(leidos.limite)
  ) {
    return {
      ok: false,
      mensaje: `El parámetro "limite" debe ser un entero entre 1 y ${MAX_PRODUCTOS_POR_PAGINA}`,
    };
  }

  const pagina = leidos.pagina === undefined ? 1 : Number(leidos.pagina);
  const limite =
    leidos.limite === undefined
      ? PRODUCTOS_POR_PAGINA
      : Number(leidos.limite);

  if (!Number.isSafeInteger(pagina) || pagina < 1) {
    return {
      ok: false,
      mensaje: 'El parámetro "pagina" debe ser un entero mayor que 0',
    };
  }
  if (
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > MAX_PRODUCTOS_POR_PAGINA
  ) {
    return {
      ok: false,
      mensaje: `El parámetro "limite" debe ser un entero entre 1 y ${MAX_PRODUCTOS_POR_PAGINA}`,
    };
  }
  if (!Number.isSafeInteger((pagina - 1) * limite)) {
    return {
      ok: false,
      mensaje: 'El valor de "pagina" es demasiado grande',
    };
  }

  return {
    ok: true,
    params: {
      pagina,
      limite,
      filtro: construirFiltro({ categoria, precioMax, compatibilidad }),
    },
  };
}
