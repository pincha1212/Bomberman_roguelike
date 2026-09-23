# BOMBERMAN // DESCENT — Roguelike v3.16.1

Videojuego web estático desarrollado con HTML, CSS y JavaScript vanilla. Preparado para GitHub Pages, sin backend ni bundler.

## Debug Mode

El motor incorpora un modo de depuración integrado en el mismo runtime del juego. No usa iframe ni un segundo motor.

Abrir normalmente:
`index.html`

Abrir con depuración:
`index.html?debug=1`

Desde el menú principal también está disponible el botón **ABRIR DEBUG MODE**.

### Herramientas

- Estado en tiempo real: FPS, frame time, update, draw, jugador, mundo, cámara y errores.
- Pausa lógica independiente del juego: `F4`.
- Avance de un frame: `F6`.
- Mostrar/ocultar panel: `F3`.
- Ejecutar suite completa: `F7`.
- Visualizadores de grid, colisiones, hitboxes, bombas, explosiones, IA, cámara y spawns.
- Acciones manuales para bomba, daño, enemigo y reinicio de escena.
- Registro de eventos y errores de runtime.
- Tests aislados de movimiento, bombas, daño, trampas, enemigos, cámara y reinicio.

El Debug Mode se carga sobre el mismo `index.html` y conserva la estructura de módulos `js/` del juego.
