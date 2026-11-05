/**
 * Modelo `Producto`.
 *
 * Reglas de rendimiento:
 * - `autoIndex: false`: los índices se crean de forma explícita con
 *   `npm run db:indexes`; así cada arranque en frío no intenta recrearlos.
 * - Los índices están diseñados para el orden real de la API
 *   (`precio` ascendente y `_id` como desempate) y para los filtros más usados.
 * - `versionKey: false`: no escribimos ni devolvemos `__v`.
 * - `collection: 'productos'` fija el nombre y evita sorpresas si cambia la
 *   pluralización de Mongoose.
 */

import mongoose from 'mongoose';
import { CATEGORIAS } from '../domain/producto.js';

const productoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código del producto es obligatorio'],
      uppercase: true,
      trim: true,
      maxlength: [40, 'El código no puede superar los 40 caracteres'],
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [4, 'El nombre debe tener al menos 4 caracteres'],
      maxlength: [120, 'El nombre no puede superar los 120 caracteres'],
    },
    categoria: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      trim: true,
      enum: {
        values: CATEGORIAS,
        message: '{VALUE} no es una categoría válida',
      },
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser inferior a 0'],
    },
    stock: {
      type: Number,
      required: [true, 'El stock es obligatorio'],
      min: [0, 'El stock no puede ser inferior a 0'],
      validate: {
        validator: Number.isInteger,
        message: 'El stock debe ser un número entero',
      },
    },
    compatibleCon: {
      // Validamos y limpiamos cada elemento del array.
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
    },
    destacado: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'productos',
    autoIndex: false,
    autoCreate: false,
  },
);

// --- Índices -----------------------------------------------------------------
// Un único índice compuesto sirve para: filtrar por categoría, ordenar por
// precio y desempatar por _id. Evita un sort en memoria.
productoSchema.index(
  { categoria: 1, precio: 1, _id: 1 },
  { name: 'categoria_precio_id' },
);

// Índice para el listado sin filtro y para `precioMax` + orden por precio.
productoSchema.index(
  { precio: 1, _id: 1 },
  { name: 'precio_asc_id_asc' },
);

// Índice multikey para compatibilidad + orden por precio.
productoSchema.index(
  { compatibleCon: 1, precio: 1, _id: 1 },
  { name: 'compatibilidad_precio_id' },
);

// Índice para la consulta de destacados más caros (script de consultas).
productoSchema.index(
  { destacado: 1, precio: -1 },
  { name: 'destacado_precio_desc' },
);

// `unique` no es un validador de Mongoose, sino una restricción del índice.
// Se deja el nombre autogenerado (`codigo_1`) para coincidir con el índice que
// ya existe en despliegues anteriores y evitar conflictos de nombre.
productoSchema.index({ codigo: 1 }, { unique: true });

// En desarrollo con hot reload, reutilizamos el modelo ya compilado.
export const Producto =
  mongoose.models.Producto ?? mongoose.model('Producto', productoSchema);

export default Producto;
