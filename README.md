# Bomberman Roguelike — Debug integrado v3.15.2

El menú principal incluye el botón **🧪 ABRIR DEBUG LAB**.

El botón abre `debug/debug.html` en una pestaña nueva para no cerrar ni interrumpir la partida principal.

Estructura necesaria:

```text
index.html
styles.css
js/
debug/
  debug.html
  debug.css
```

El Debug Lab continúa usando `js/18-debug-mode.js` y queda separado del juego normal.

## GitHub Pages

La carpeta `debug/` es parte del sitio publicado. El botón del menú usa una ruta relativa (`./debug/debug.html`) y el laboratorio carga el motor con `../index.html?debug=1`, para que las rutas funcionen tanto en un sitio raíz como en un sitio de proyecto de GitHub Pages.
