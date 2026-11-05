/**
 * Constantes de dominio del catálogo.
 *
 * Se aíslan del modelo de Mongoose para que la validación de la API y los
 * tests no necesiten cargar la base de datos ni el ODM. Esto reduce el tiempo
 * de arranque y mantiene una única fuente de verdad para categorías y límites.
 */

/** Categorías permitidas. `Object.freeze` evita mutaciones accidentales. */
export const CATEGORIAS = Object.freeze([
  'Procesadores',
  'Tarjetas Gráficas',
  'Memorias RAM',
  'Almacenamiento',
]);

/** Tamaño de página por defecto de la API. */
export const PRODUCTOS_POR_PAGINA = 20;

/** Tope de productos que un cliente puede pedir en una sola página. */
export const MAX_PRODUCTOS_POR_PAGINA = 100;

/**
 * Orden estable de los resultados.
 * Incluir `_id` como desempate evita que dos productos con el mismo precio
 * cambien de posición entre páginas (paginación determinista).
 */
export const ORDEN_PRODUCTOS = Object.freeze({ precio: 1, _id: 1 });

/** Proyección común: no exponemos el version key interno de Mongoose. */
export const PROYECCION_PRODUCTO = Object.freeze({ __v: 0 });
