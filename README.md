# PLANTA_PRODUCCION_PICONAS - Pro

Archivos incluidos:
- index.html
- styles.css
- app.js
- service-worker.js
- manifest.json

## Despliegue rápido en GitHub Pages

1. Crea un nuevo repositorio en GitHub (por ejemplo `PLANTA_PRODUCCION_PICONAS`).
2. Sube los archivos de este paquete al root del repo.
3. En GitHub, ve a Settings → Pages → Branch: `main` → Folder: `/ (root)` → Save.
4. Espera unos minutos y abre la URL `https://<tu-usuario>.github.io/<tu-repo>/`

## Notas y opciones avanzadas
- La app usa IndexedDB (localForage) para almacenar datos localmente y permite exportar/importar JSON.
- Para multiusuario en la nube, conecta Firestore / Firebase Authentication (se puede añadir).
- Puedes registrar un service worker (ya incluido) para usar offline y PWA.

Si quieres que yo te entregue un ZIP listo para descargar o que lo suba directamente a tu repo (necesitaré acceso), dime cuál prefieres.
