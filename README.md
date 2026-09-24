# BOMBERMAN // DESCENT — Roguelike v3.19.0

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


## v3.17.0 — Optimization Update

- Cache de terreno estático del mapa; reconstrucción solo al cambiar sala/geometría.
- Preview de alcance de bombas cacheado mientras el terreno permanezca sin cambios.
- Claves numéricas para el conjunto de peligro de IA, evitando strings temporales por consulta.
- Contador de revisión de grid para invalidación segura de caches.
- Sin cambios en la lógica cardinal/lane-lock de v3.16.8.


## v3.19.0 — Stable AI Update

- Histéresis de giro en intersecciones: mantener dirección cuando sigue siendo válida y la alternativa no mejora de forma suficiente.
- Commit breve de dirección para evitar giros consecutivos inútiles en el mismo nodo.
- Ruido de patrulla determinista para evitar oscilaciones por decisiones aleatorias sucesivas.
- Recovery local primero: búsqueda de salida física inmediata antes de ejecutar BFS.
- BFS limitado al recovery excepcional y con cooldown para evitar recalculaciones repetidas.
- Recuperación física reinicia indicadores transitorios al recuperar movimiento.
- Stress tests de IA ampliados de 7 a 8 escenarios, incluyendo estabilidad de intersección y control de uso excepcional de BFS.
- Debug expone lock de giro y llamadas BFS por enemigo.
