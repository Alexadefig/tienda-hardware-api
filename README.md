La API devuelve 20 productos por página de forma predeterminada, ordenados por precio ascendente. Se puede solicitar otra página y ajustar el tamaño (máximo 100 productos):

- Primera página: https://tienda-hardware-api.vercel.app/api/productos
- Segunda página con 20 productos: https://tienda-hardware-api.vercel.app/api/productos?pagina=2&limite=20
- Filtrar por categoría: https://tienda-hardware-api.vercel.app/api/productos?categoria=Tarjetas%20Gráficas
- Filtrar por precio máximo y compatibilidad: https://tienda-hardware-api.vercel.app/api/productos?precioMax=300&compatibilidad=DDR5

La respuesta incluye `total` (coincidencias de todos los resultados), `pagina`, `limite`, `totalPaginas`, `filtrosAplicados` y `productos`. Los valores de filtro y paginación inválidos reciben una respuesta `400`.
