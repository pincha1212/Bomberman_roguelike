# BOMBERMAN // DESCENT — Roguelike v3.23.0

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


## v3.22.0 — Robust Collision Update

- Lane-lock tolerante: evita snap exacto dentro de la tolerancia normal.
- Correcciones laterales limitadas a `enemyLaneCorrectionStep`.
- Validación de límites del mundo en `gridGetOverlappedTiles`.
- Instrumentación de colisión: bloqueos, correcciones, snaps, entradas diagonales y movimiento.
- Nuevo `js/22-collision-stress.js` con seis escenarios automáticos: esquina, corredor, obstáculo, bomba, enemigos superpuestos y recuperación de lane-lock.
- El stress test comprueba específicamente ausencia de movimiento diagonal, ausencia de snap normal y recuperación del avance después de una corrección fuerte.
- BFS de IA no se modifica y continúa reservado al recovery excepcional de v3.19.


## v3.22.0 — Rooms Update

Se agregaron seis topologías procedurales: `corridors`, `intersection`, `small-chambers`, `large-chamber`, `open-zone`, `dead-end`. Cada room revalida la conectividad jugador→salida después de crear la room secreta y aplica un corredor de reparación únicamente si la ruta deja de existir.

Debug Engine: `ROOM STRESS` valida las seis topologías, cantidad de celdas alcanzables, longitud de ruta y registro de reparación.


## v3.23.0 — Progressive Difficulty
- Escalado centralizado por profundidad para enemigos, presión, trampas y densidad.
- Límites: 22 enemigos, 1.24x velocidad, +6 trampas, +0.08 densidad de bloques.
- Nuevo `js/24-difficulty.js`.
- Nuevo `js/25-difficulty-stress.js`.
- Stress: perfiles monótonos y límites por profundidad.
- `js/12-enemy-ai.js` queda normalizado bajo `js/` para conservar la actualización de navegación v3.21.

- La primera oleada conserva un intervalo derivado del tiempo de sala; las oleadas siguientes usan el intervalo de amenaza escalado.
- El escalado no modifica el pathfinding: BFS queda reservado al recovery excepcional.


## v3.24.0 — Enemy Behaviors Update

- Cinco arquetipos: `chaser`, `patroller`, `evasive`, `aggressive`, `flyer`.
- El arquetipo se fija al crear la entidad y se conserva durante su vida.
- `chaser`: prioriza distancia al jugador y continuidad de persecución.
- `patroller`: prioriza continuidad, ramificaciones locales y memoria corta.
- `evasive`: evita peligro y jugador cercano.
- `aggressive`: persigue con menor penalización de reversa y una velocidad específica del rol.
- `flyer`: mantiene movimiento cardinal y utiliza `canFly` para atravesar bloques.
- El peligro de bombas/explosiones mantiene prioridad sobre el rol.
- BFS permanece reservado al recovery excepcional.
- Debug muestra arquetipo y etiqueta del enemigo.
- Nuevo `js/26-enemy-behavior-stress.js` para validar los cinco roles.
