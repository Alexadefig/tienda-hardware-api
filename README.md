# Tienda Hardware API

API serverless de catálogo de hardware sobre **Node.js + MongoDB Atlas + Mongoose + Vercel**.

La URL pública sigue funcionando igual:

- `https://tienda-hardware-api.vercel.app/api/productos`

---

## Stack

| Pieza | Versión / decisión |
| --- | --- |
| Node.js | `>= 20.19` (recomendado 22 LTS) |
| Módulos | ESM nativo (`"type": "module"`) |
| Base de datos | MongoDB Atlas |
| ODM | Mongoose 9 |
| Variables de entorno | `process.loadEnvFile()` nativo (sin `dotenv`) |
| Deploy | Vercel Functions (`/api`) |
| Tests | `node:test` nativo (sin dependencias) |

---

## Estructura

```text
.
├── api/
│   ├── productos.js          # Función serverless fina (adaptador Vercel)
│   └── health.js             # Health check con ping a MongoDB
├── src/
│   ├── config.js             # Configuración + carga de .env
│   ├── db.js                 # Conexión única y reutilizable
│   ├── domain/producto.js    # Constantes puras (categorías, límites)
│   ├── models/producto.js    # Esquema, validaciones e índices
│   ├── lib/
│   │   ├── query.js          # Validación pura de query params
│   │   └── errors.js         # Clasificación de errores de Mongo
│   ├── services/productos.js # Consultas optimizadas
│   └── http/
│       ├── productos.js      # Caso de uso HTTP
│       ├── health.js         # Caso de uso de salud
│       ├── result.js         # Respuestas neutrales
│       ├── cache.js          # Cabeceras de caché
│       └── vercel.js         # Adaptador req/res
├── scripts/
│   ├── seed.js               # Seed idempotente / reset
│   ├── consultas.js          # Consultas de ejemplo A–D
│   └── ensure-indexes.js     # Creación explícita de índices
├── test/query.test.js        # Tests de validación
├── server.js                 # Servidor local sin CLI de Vercel
└── vercel.json
```

---

## Endpoints

### `GET /api/productos`

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `pagina` | entero `>= 1` | Página solicitada (default `1`) |
| `limite` | entero `1..100` | Productos por página (default `20`) |
| `categoria` | enum | `Procesadores`, `Tarjetas Gráficas`, `Memorias RAM`, `Almacenamiento` |
| `precioMax` | número `>= 0` | Precio máximo |
| `compatibilidad` | texto | Ej. `DDR5`, `AM5`, `PCIe 4.0` |

Orden: **precio ascendente** y `_id` como desempate (paginación estable).

```bash
# Primera página
curl "https://tienda-hardware-api.vercel.app/api/productos"

# Segunda página, 20 por página
curl "https://tienda-hardware-api.vercel.app/api/productos?pagina=2&limite=20"

# Filtrar por categoría
curl "https://tienda-hardware-api.vercel.app/api/productos?categoria=Tarjetas%20Gr%C3%A1ficas"

# Precio máximo + compatibilidad
curl "https://tienda-hardware-api.vercel.app/api/productos?precioMax=300&compatibilidad=DDR5"
```

Respuesta:

```json
{
  "total": 5,
  "pagina": 1,
  "limite": 20,
  "totalPaginas": 1,
  "filtrosAplicados": {},
  "productos": []
}
```

Errores de validación: `400` con `{ "mensaje": "..." }`.
Método no permitido: `405`.
Base de datos no disponible: `503`.
Timeout de consulta: `504`.

### `GET /api/health`

Hace un `ping` real a MongoDB. Responde `200` si la base está disponible y `503` si no. No se cachea.

---

## Puesta en marcha local

```bash
npm install
cp .env.example .env          # editar MONGODB_URI
npm run db:indexes            # crear índices una vez
npm run seed                  # cargar/actualizar productos
npm run dev                   # http://localhost:3000
```

Probar:

```bash
curl "http://localhost:3000/api/productos?limite=5"
curl "http://localhost:3000/api/health"
```

> `npm run db:indexes` es importante: `autoIndex` está desactivado para que los
> arranques en frío de Vercel no reconstruyan índices. Sin índices la API
> funciona, pero pierde el rendimiento esperado.

---

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local con `--watch` |
| `npm start` | Servidor local sin watch |
| `npm run seed` | Upsert por `codigo` (idempotente) |
| `npm run seed:reset` | Vacía la colección y reinserta |
| `npm run db:indexes` | Crea/verifica los índices |
| `npm run consultas` | Ejecuta las consultas A–D en paralelo |
| `npm test` | Tests de validación con `node:test` |
| `npm run test:watch` | Tests en modo watch |

---

## Decisiones de rendimiento

| Optimización | Por qué |
| --- | --- |
| **Conexión cacheada en `globalThis`** | Las instancias tibias de Vercel reutilizan el pool; se deduplican conexiones concurrentes. |
| **Pool pequeño (`maxPoolSize=5`)** | Evita agotar las conexiones de Atlas con muchas instancias serverless. |
| **`bufferCommands: false`** | Falla rápido si no hay conexión en vez de acumular operaciones en memoria. |
| **`autoIndex: false` + script** | No se paga la creación/verificación de índices en cada arranque en frío. |
| **Índices compuestos** | `categoria + precio + _id`, `compatibleCon + precio + _id` y `precio + _id` cubren filtros y orden sin `sort` en memoria. |
| **`Promise.all` count + find** | Las dos consultas se solapan, reduciendo la latencia total. |
| **`.lean()` + proyección** | Menos CPU (sin hidratar documentos) y menos bytes (`__v` excluido). |
| **`maxTimeMS`** | Corta consultas lentas y devuelve `504` en vez de colgar la función. |
| **Compresión `zlib`** | Reduce el tráfico de red del protocolo de MongoDB. |
| **Caché CDN (`s-maxage`)** | Vercel sirve respuestas repetidas sin invocar la función ni consultar MongoDB. |
| **Categorías/constantes puras** | La validación no carga Mongoose; tests más rápidos. |
| **Sin `dotenv`** | Una dependencia menos y carga nativa de `.env`. |

### Caché

Las respuestas `200` se publican con:

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

Se puede ajustar con `CACHE_SECONDS` y `STALE_SECONDS`. Con `CACHE_SECONDS=0` se
desactiva (`no-store`). Los cambios del catálogo pueden tardar hasta ~60 s en
verse desde el CDN.

---

## Variables de entorno

| Variable | Default | Descripción |
| --- | --- | --- |
| `MONGODB_URI` | — | **Obligatoria**. Cadena de conexión de Atlas. |
| `MONGODB_MAX_POOL_SIZE` | `5` | Conexiones por instancia |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000` | Espera máxima para elegir servidor |
| `MONGODB_SOCKET_TIMEOUT_MS` | `45000` | Timeout de socket |
| `MONGODB_MAX_IDLE_TIME_MS` | `60000` | Cierre de conexiones inactivas |
| `QUERY_TIMEOUT_MS` | `5000` | `maxTimeMS` de las consultas |
| `CACHE_SECONDS` | `60` | `s-maxage` del CDN |
| `STALE_SECONDS` | `300` | `stale-while-revalidate` |
| `PORT` | `3000` | Solo servidor local |

El archivo `.env` está ignorado por Git. Usar `.env.example` como plantilla.

---

## Deploy en Vercel

1. Configurar `MONGODB_URI` en **Project Settings → Environment Variables**.
2. Desplegar con `vercel --prod` (o desde Git).
3. Ejecutar una vez contra la base de producción:

```bash
npm run db:indexes
```

Vercel detecta automáticamente las funciones de `api/`. `vercel.json` fija
`maxDuration: 10` para las funciones.

---

## Tests

```bash
npm test
```

Cubren paginación, filtros, duplicados, valores vacíos, categorías, precios,
límites y desbordamiento de página. No requieren conexión a MongoDB.
