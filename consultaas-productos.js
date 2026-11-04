require('dotenv').config(); // Carga la variable MONGODB_URI desde archivo .env
const mongoose = require('mongoose');
const Producto = require('./models/Producto');

async function ejecutarConsultas() {
    try {
        // 1. Conexión a la base de datos MongoDB Atlas
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB Atlas para ejecutar consultas.\n');

        // CONSULTA A: Tarjetas Gráficas con stock mayor a 0

        console.log('CONSULTA A: Tarjetas Gráficas con stock disponible');
        const consultaA = await Producto.find({
            categoria: 'Tarjetas Gráficas',
            stock: { $gt: 0 }
        });
        console.log(consultaA);
        console.log('\n');


        // CONSULTA B: Componentes <= 150 con proyección
        console.log('CONSULTA B: Económicos (<= 150) sin _id');
        const consultaB = await Producto.find(
            { precio: { $lte: 150 } }, // Filtro: less than or equal
            { nombre: 1, precio: 1, categoria: 1, _id: 0 } // Proyección
        );
        console.log(consultaB);
        console.log('\n');
        // CONSULTA C: Compatibles con 'DDR5' o 'AM5' usando el operador $in
        console.log('CONSULTA C: Componentes compatibles con DDR5 o AM5 ($in)');
        const consultaC = await Producto.find({
            compatibleCon: { $in: ['DDR5', 'AM5'] }
        });
        console.log(consultaC);
        console.log('\n');

        // CONSULTA D: Top 3 más caros que sean destacados (orden descendente)
        console.log('CONSULTA D: Top 3 productos destacados más caros');
        const consultaD = await Producto.find(
            { destacado: true },
            { nombre: 1, precio: 1, _id: 0 } // Solo nombre y precio (sin _id)
        )
            .sort({ precio: -1 })
            .limit(3);

        console.log(consultaD);
        console.log('\n');

    } catch (error) {
        console.error('Error al ejecutar las consultas:', error.message);
    } finally {
        // 2. Cerrar la conexión limpiamente
        await mongoose.disconnect();
        console.log('Conexión cerrada con éxito.');
    }
}

// Ejecutar la función
ejecutarConsultas();
