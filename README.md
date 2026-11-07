# FREYR-Labeler · Santa Fe

Visor web para anotación de vegetación de los humedales del Paraná, Santa Fe (Argentina).

**Clases:** 0 Pajonal · 1 Vegetación herbácea · 2 Bosque de humedal · 255 Ignorar.

## Uso

Abre el visor, selecciona mapa satelital o calles, elige una clase y crea un punto o polígono. Completa intérprete, confianza y observaciones y guarda. Exporta periódicamente el GeoJSON.

**Aviso importante:** las anotaciones se almacenan únicamente en el navegador (localStorage). No son compartidas entre usuarios y pueden perderse al borrar datos del navegador. Es necesario exportar respaldos GeoJSON. Las imágenes Esri se utilizan como referencia visual, no como observaciones Sentinel-2 con fecha conocida.

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

## Publicación

GitHub Actions compila `frontend/` y despliega `frontend/dist` en GitHub Pages. En Settings → Pages, seleccionar **GitHub Actions**.

## Próximos pasos

Capas Sentinel-2 fechadas, muestreo estratificado, revisión de expertos, API persistente, validación espacial y versiones de datasets.
