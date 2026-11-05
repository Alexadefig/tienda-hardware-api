/**
 * Tests de la validación de query (sin base de datos).
 * Ejecutar con: npm test
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { construirFiltro, parsearQueryProductos } from '../src/lib/query.js';

/** @param {string} query */
const parsear = (query) => parsearQueryProductos(new URLSearchParams(query));

test('aplica página y límite por defecto', () => {
  const resultado = parsear('');

  assert.equal(resultado.ok, true);
  assert.equal(resultado.params.pagina, 1);
  assert.equal(resultado.params.limite, 20);
  assert.deepEqual(resultado.params.filtro, {});
});

test('normaliza filtros válidos', () => {
  const resultado = parsear(
    'categoria=Memorias%20RAM&precioMax=300&compatibilidad=DDR5&pagina=2&limite=50',
  );

  assert.equal(resultado.ok, true);
  assert.deepEqual(resultado.params.filtro, {
    categoria: 'Memorias RAM',
    precio: { $lte: 300 },
    compatibleCon: 'DDR5',
  });
  assert.equal(resultado.params.pagina, 2);
  assert.equal(resultado.params.limite, 50);
});

test('rechaza parámetros duplicados', () => {
  const resultado = parsear(
    'categoria=Memorias%20RAM&categoria=Procesadores',
  );

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /único valor/);
});

test('rechaza parámetros vacíos', () => {
  assert.equal(parsear('categoria=').ok, false);
  assert.equal(parsear('pagina=').ok, false);
  assert.equal(parsear('compatibilidad=%20%20').ok, false);
});

test('rechaza categoría inválida', () => {
  const resultado = parsear('categoria=Monitores');

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /categoría/);
});

test('rechaza precios inválidos', () => {
  for (const valor of ['-1', 'abc', '1e3', 'NaN', 'Infinity', '1.2.3']) {
    const resultado = parsear(`precioMax=${encodeURIComponent(valor)}`);
    assert.equal(resultado.ok, false, `debería rechazar "${valor}"`);
  }
});

test('acepta precios decimales no negativos', () => {
  for (const valor of ['0', '0.5', '.5', '10.', '150.25']) {
    const resultado = parsear(`precioMax=${encodeURIComponent(valor)}`);
    assert.equal(resultado.ok, true, `debería aceptar "${valor}"`);
  }
});

test('rechaza página y límite inválidos', () => {
  for (const valor of ['0', '-1', 'abc', '1.5', '1e3']) {
    assert.equal(
      parsear(`pagina=${encodeURIComponent(valor)}`).ok,
      false,
      `página inválida: ${valor}`,
    );
  }

  for (const valor of ['0', '101', 'abc', '1.5']) {
    assert.equal(
      parsear(`limite=${encodeURIComponent(valor)}`).ok,
      false,
      `límite inválido: ${valor}`,
    );
  }
});

test('rechaza desbordamiento de paginación', () => {
  const resultado = parsear('pagina=9007199254740991&limite=100');

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /demasiado grande/);
});

test('ignora parámetros desconocidos', () => {
  const resultado = parsear('foo=bar&pagina=1');

  assert.equal(resultado.ok, true);
  assert.equal(resultado.params.pagina, 1);
});

test('construirFiltro no muta la entrada', () => {
  const entrada = Object.freeze({
    categoria: 'Procesadores',
    precioMax: 100,
    compatibilidad: 'AM5',
  });

  assert.deepEqual(construirFiltro(entrada), {
    categoria: 'Procesadores',
    precio: { $lte: 100 },
    compatibleCon: 'AM5',
  });
});
