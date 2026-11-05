require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const LIMITE_MAXIMO = 100;

let conexionPromise = null;

function conectarDB() {
    if (!conexionPromise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('La variable de entorno MONGODB_URI no está configurada');
        }

        conexionPromise = mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        }).catch((error) => {
            conexionPromise = null;
            throw error;
        });
    }
    return conexionPromise;
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ mensaje: 'Método no permitido. Solo se acepta GET.' });
    }

    const query = req.query || {};
    const parametrosTexto = ['categoria', 'precioMax', 'compatibilidad', 'pagina', 'limite'];
    for (const parametro of parametrosTexto) {
        if (query[parametro] !== undefined &&
            (typeof query[parametro] !== 'string' || query[parametro].trim() === '')) {
            return res.status(400).json({
                mensaje: `El parámetro "${parametro}" debe tener un único valor de texto no vacío`
            });
        }
    }

    const { categoria, precioMax, compatibilidad } = query;
    const paginaValida = query.pagina === undefined || /^\d+$/.test(query.pagina);
    const limiteValido = query.limite === undefined || /^\d+$/.test(query.limite);
    if (!paginaValida) {
        return res.status(400).json({ mensaje: 'El parámetro "pagina" debe ser un entero mayor que 0' });
    }
    if (!limiteValido) {
        return res.status(400).json({
            mensaje: `El parámetro "limite" debe ser un entero entre 1 y ${LIMITE_MAXIMO}`
        });
    }

    const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
    const limite = query.limite === undefined ? 20 : Number(query.limite);

    if (!Number.isSafeInteger(pagina) || pagina < 1) {
        return res.status(400).json({ mensaje: 'El parámetro "pagina" debe ser un entero mayor que 0' });
    }
    if (!Number.isSafeInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
        return res.status(400).json({
            mensaje: `El parámetro "limite" debe ser un entero entre 1 y ${LIMITE_MAXIMO}`
        });
    }
    if (!Number.isSafeInteger((pagina - 1) * limite)) {
        return res.status(400).json({ mensaje: 'El valor de "pagina" es demasiado grande' });
    }

    const filtro = {};
    if (categoria !== undefined) {
        const categoriasValidas = Producto.schema.path('categoria').enumValues;
        if (!categoriasValidas.includes(categoria.trim())) {
            return res.status(400).json({ mensaje: 'La categoría indicada no es válida' });
        }
        filtro.categoria = categoria.trim();
    }

    if (precioMax !== undefined) {
        const precioTexto = precioMax.trim();
        if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(precioTexto)) {
            return res.status(400).json({
                mensaje: 'El parámetro "precioMax" debe ser un número mayor o igual que 0'
            });
        }
        const precioNum = Number(precioTexto);
        if (!Number.isFinite(precioNum)) {
            return res.status(400).json({
                mensaje: 'El parámetro "precioMax" debe ser un número mayor o igual que 0'
            });
        }
        filtro.precio = { $lte: precioNum };
    }

    if (compatibilidad !== undefined) {
        filtro.compatibleCon = compatibilidad.trim();
    }

    try {
        await conectarDB();

        const [total, productos] = await Promise.all([
            Producto.countDocuments(filtro).exec(),
            Producto.find(filtro)
                .sort({ precio: 1, _id: 1 })
                .skip((pagina - 1) * limite)
                .limit(limite)
                .lean()
                .exec()
        ]);

        return res.status(200).json({
            total,
            pagina,
            limite,
            totalPaginas: Math.ceil(total / limite),
            filtrosAplicados: filtro,
            productos
        });
    } catch (error) {
        console.error('Error en /api/productos:', error);
        return res.status(500).json({
            mensaje: 'Error interno del servidor al consultar productos'
        });
    }
};