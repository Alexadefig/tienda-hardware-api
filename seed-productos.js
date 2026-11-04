require('dotenv').config(); // Carga las variables de entorno del archivo .env
const mongoose = require('mongoose');
const Producto = require('./models/Producto');

// 1. Datos iniciales válidos (al menos 5 productos variados)
const productosIniciales = [
    {
        codigo: 'CPU-01',
        nombre: 'Intel Core i7-14700K',
        categoria: 'Procesadores',
        precio: 420.50,
        stock: 15,
        compatibleCon: ['LGA1700', 'DDR4', 'DDR5'],
        destacado: true
    },
    {
        codigo: 'GPU-01',
        nombre: 'NVIDIA GeForce RTX 4070 Super',
        categoria: 'Tarjetas Gráficas',
        precio: 650.00,
        stock: 8,
        compatibleCon: ['PCIe 4.0'],
        destacado: true
    },
    {
        codigo: 'RAM-01',
        nombre: 'Corsair Vengeance 32GB (2x16GB)',
        categoria: 'Memorias RAM',
        precio: 115.99,
        stock: 25,
        compatibleCon: ['DDR5'],
        destacado: false
    },
    {
        codigo: 'SSD-01',
        nombre: 'Samsung 990 PRO NVMe 2TB',
        categoria: 'Almacenamiento',
        precio: 179.90,
        stock: 30,
        compatibleCon: ['PCIe 4.0', 'M.2 2280'],
        destacado: false
    },
    {
        codigo: 'CPU-02',
        nombre: 'AMD Ryzen 7 7800X3D',
        categoria: 'Procesadores',
        precio: 390.00,
        stock: 12,
        compatibleCon: ['AM5', 'DDR5'],
        destacado: true
    }
];

// 2. Función principal asíncrona
async function seedDatabase() {
    try {
        console.log('Conectando a MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conexión establecida con éxito.');

        // Limpiar colección existente
        console.log('Limpiando colección de productos anterior...');
        await Producto.deleteMany({});
        console.log(' Colección vaciada.');

        // Insertar lote de productos válidos
        console.log('Insertando lote de productos iniciales...');
        const insertados = await Producto.insertMany(productosIniciales);
        console.log(`¡Éxito! Se han guardado ${insertados.length} productos en la base de datos.`);

//bloqueo de datos inválidos 

        console.log('\nIniciando prueba defensiva con datos inválidos a propósito...');
        try {
            const productoInvalido = new Producto({
                codigo: 'bad-01',
                nombre: 'RTX',             // Error: menos de 4 caracteres
                categoria: 'Monitores',      // Error: fuera del enum
                precio: -50,                 // Error: menor que 0
                stock: 4.5                   // Error: no es entero
            });

            // Forzamos la validación
            await productoInvalido.save();
            console.log('Falló la prueba defensiva: El producto inválido se guardó (no debería pasar).');
        } catch (errorValidacion) {
            console.log('¡Mongoose bloqueó correctamente la inserción inválida!');
            console.log('Errores detectados por campo:');

            if (errorValidacion.errors) {
                for (const campo in errorValidacion.errors) {
                    console.log(`Campo [${campo}]: ${errorValidacion.errors[campo].message}`);
                }
            } else {
                console.log('Error:', errorValidacion.message);
            }
        }

    } catch (errorGeneral) {
        console.error('Error crítico durante el proceso de seed:', errorGeneral.message);
    } finally {
        // Cerrar conexión con la base de datos al finalizar
        await mongoose.disconnect();
        console.log('\nConexión cerrada. Script finalizado.');
    }
}

// Ejecutar el script
seedDatabase();