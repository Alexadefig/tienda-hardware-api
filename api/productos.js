require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../models/Producto');

let conn = null;

async function conectarDB() {
    if (conn == null) {
        conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
    }
    return conn;
}

module.exports = async (req, res) => {
    // Solo permitimos el método GET para consultar el inventario
    if (req.method !== 'GET') {
        return res.status(405).json({ mensaje: 'Método no permitido. Solo se acepta GET.' });
    }

    try {
        // 1.conexión a la base de datos
        await conectarDB();

        // 2. Extraer los parámetros de consulta
        const { categoria, precioMax, compatibilidad } = req.query;

        // 3. Construir dinámicamente el objeto de filtros
        const filtro = {};

        // Filtro opcional por categoría exacta
        if (categoria) {
            filtro.categoria = categoria;
        }

        // Filtro opcional por precio máximo ($lte: menor o igual)
        if (precioMax) {
            const precioNum = parseFloat(precioMax);
            if (!isNaN(precioNum)) {
                filtro.precio = { $lte: precioNum };
            }
        }

        // Filtro opcional por compatibilidad ($in en el arreglo compatibleCon)
        if (compatibilidad) {
            filtro.compatibleCon = { $in: [compatibilidad] };
        }

        // 4. Ejecutar la búsqueda ordenada por precio ascendente (.sort({ precio: 1 }))
        const productos = await Producto.find(filtro).sort({ precio: 1 });

        // 5. Responder con el total de coincidencias y la lista de productos
        return res.status(200).json({
            total: productos.length,
            filtrosAplicados: filtro,
            productos
        });

    } catch (error) {
        console.error('Error en /api/productos:', error);
        return res.status(500).json({
            mensaje: 'Error interno del servidor al consultar productos',
            error: error.message
        });
    }
};