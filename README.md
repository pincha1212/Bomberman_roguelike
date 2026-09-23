# Bomberman Roguelike v3.15.4

Build completa lista para GitHub Pages, con el juego modular y el Debug Lab integrado.

## Estructura

- `index.html` — juego principal.
- `styles.css` — interfaz del juego.
- `js/` — módulos del motor.
- `debug/debug.html` — laboratorio de pruebas aisladas.
- `debug/debug.css` — interfaz del laboratorio.

## Debug Lab

Desde el menú principal, `ABRIR DEBUG LAB` abre `debug/debug.html`.
El laboratorio carga el motor real con `../index.html?debug=1` y su JavaScript se carga con `../js/18-debug-mode.js`. Las rutas son relativas para funcionar tanto en `https://usuario.github.io/` como en `https://usuario.github.io/repositorio/`.

## GitHub Pages

Subí el contenido de este ZIP directamente a la raíz de la fuente publicada. `index.html` debe quedar en el nivel superior del repositorio/fuente de Pages.
