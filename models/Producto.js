const mongoose = require('mongoose');

// Definición del esquema con todas las reglas de validación exigidas
const productoSchema = new mongoose.Schema(
    {
        codigo: {
            type: String,
            required: [true, 'El código del producto es obligatorio'],
            unique: true,
            uppercase: true, // Convierte automáticamente a mayúsculas
            trim: true       // Elimina espacios en blanco al inicio y al final
        },
        nombre: {
            type: String,
            required: [true, 'El nombre es obligatorio'],
            trim: true,
            minlength: [4, 'El nombre debe tener al menos 4 caracteres']
        },
        categoria: {
            type: String,
            required: [true, 'La categoría es obligatoria'],
            enum: {
                values: [
                    'Procesadores',
                    'Tarjetas Gráficas',
                    'Memorias RAM',
                    'Almacenamiento'
                ],
                message: '{VALUE} no es una categoría válida'
            }
        },
        precio: {
            type: Number,
            required: [true, 'El precio es obligatorio'],
            min: [0, 'El precio no puede ser inferior a 0']
        },
        stock: {
            type: Number,
            required: [true, 'El stock es obligatorio'],
            min: [0, 'El stock no puede ser inferior a 0'],
            validate: {
                validator: Number.isInteger,
                message: 'El stock debe ser un número entero'
            }
        },
        compatibleCon: {
            type: [String],
            default: []
        },
        destacado: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true // Genera automáticamente createdAt y updatedAt
    }
);

// Protección para evitar recompilación del modelo en entornos serverless (ej. Next.js, Vercel, hot-reload)
const Producto = mongoose.models.Producto || mongoose.model('Producto', productoSchema);

module.exports = Producto;