# Luminous Letters

Monorepo con frontend en `client/` y backend en `server/`.

## Desarrollo local
```bash
npm install
npm run dev
```

## Producción en Render
Configura el servicio como **Web Service** con:

- **Root Directory:** vacío
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

Variables recomendadas:

```env
JWT_SECRET=una_clave_larga_y_segura
CORS_ORIGIN=https://luminous-letters.onrender.com
```

El frontend se compila en `client/dist` y el backend lo sirve automáticamente en producción.
