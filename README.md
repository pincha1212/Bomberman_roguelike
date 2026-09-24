# BOMBERMAN // DESCENT — Roguelike v3.28.0

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


## v3.25.0 — Progressive Difficulty
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


## v3.24.1 — AI Stress & Recovery Fix

- Intersecciones: seguir recto es una decisión válida; los tests ya no exigen un giro artificial.
- Recovery: se registra la dirección físicamente bloqueada y la cantidad de fallos consecutivos.
- Recovery local: una dirección bloqueada repetidamente queda excluida como candidata.
- Recovery local exige una comprobación física de 2 px antes de aceptar el nuevo vector.
- AI Stress incorpora un caso específico de bloqueo repetido para evitar regresiones.
- BFS sigue reservado para recovery excepcional y no puede devolver la misma dirección bloqueada.
- Debug expone `blockedDirection` y `blockedDirectionFrames`.


## Validación v3.24.1

- AI Stress: intersecciones aceptan continuidad recta.
- Recovery stress: dirección bloqueada repetidamente no vuelve a seleccionarse.
- BFS: 0 en recovery con salida local.
- Movimiento cardinal conservado.


## v3.25.0 — Boss Update
- Tres fases de boss según porcentaje de vida: 1, 2 y 3.
- Patrones de bajo coste: `aimed`, `cross`, `tri-shot`.
- Telegraph corto antes de cada patrón.
- Cap de 6 proyectiles propios del sistema v3.25.
- Proyectiles con vida limitada y eliminación por impacto, borde o expiración.
- Velocidad de patrón progresiva por fase.
- Integración por wrapper sobre `update`, `draw`, `initLevel` y `startGame`; no reemplaza el resto del motor.
- Sin A*, BFS ni búsquedas de ruta para el boss.
- Nuevo `js/27-boss-system.js`.
- Nuevo `js/28-boss-stress.js`.
- Stress: fases, umbrales y límite de proyectiles.

## Validación v3.25.0
- `node --check`: JS afectado PASS.
- Boss Stress: 5/5 fases PASS.
- Cap de proyectiles: PASS.
- O(1) por trigger de patrón; sin pathfinding por frame.
- Prueba visual en navegador/GitHub Pages: no realizada.

## v3.26.0 — Feedback Update
- Feedback de combate desacoplado en `js/29-feedback-system.js`.
- Impactos: partículas breves, anillo y flash corto.
- Explosiones: dos anillos, partículas ampliadas, flash y pequeña respuesta de cámara.
- Daño: respuesta visual y sonora independiente del sistema de daño existente.
- Partículas reutilizadas desde un pool de 96 objetos.
- Anillos reutilizados desde un pool de 12 objetos.
- Sonido sintetizado con `AudioContext` lazy; sin archivos de audio externos.
- Límite de 10 sonidos por segundo y cooldown de 55 ms.
- Actualización de feedback acotada por frame; sin búsqueda de entidades ni pathfinding.
- Hooks sobre `explodeBomb` y `takeDamage` sin reemplazar sus reglas.
- `js/30-feedback-stress.js` expone `runFeedbackStressV326()` para validar el presupuesto del sistema.

## Validación v3.26.0
- `node --check`: módulos v3.26 PASS.
- Feedback Stress: PASS; 96 partículas máximas, 12 anillos máximos.
- Benchmark del pool: 10.000 updates ≈ 11,8 ms en harness aislado.
- Sonido limitado a 10 eventos/segundo y cooldown de 55 ms.
- Sin audio externo ni assets adicionales.
- Prueba visual en navegador/GitHub Pages: pendiente.


## v3.27.0 — Roguelike Update
- Economía de run reforzada sin duplicar la economía base existente: recompensas de limpieza, bonuses por reliquias y reroll como gasto.
- Nuevo gasto de monedas: reroll de la oferta de reliquias, una vez por sala.
- Pool de 12 reliquias v3.27 con rareza `common`, `uncommon` y `rare`.
- Protección contra duplicados dentro de la nueva capa de reliquias.
- Sinergias por etiquetas: combustión, demolición, economía, movilidad, supervivencia y riesgo.
- Bonificaciones de sinergia derivadas: no se acumulan cada frame ni pisan los stats base del juego.
- Decisiones de ruta entre salas: se ofrecen 3 opciones de las 4 rutas disponibles (`ESTÁNDAR`, `TESORO`, `ÉLITE`, `SANTUARIO`).
- `ÉLITE` añade presión física limitada y mejora la calidad de la siguiente oferta de reliquias.
- `TESORO` entrega monedas al entrar; `SANTUARIO` recupera vida; cada ruta modifica la recompensa de limpieza.
- La ruta elegida se aplica en la próxima llamada normal a `initLevel()`.
- La mejora estadística existente de la pantalla de recompensa se conserva; la capa v3.27 agrega decisiones antes de continuar.
- Nuevo `js/31-roguelike-update.js`.
- Nuevo `js/32-roguelike-stress.js`.

## Validación v3.27.0
- `node --check`: módulos v3.27 PASS.
- Stress aislado: unicidad de ofertas, adquisición de reliquia, sinergias, selección de 3 rutas, pool de rooms y generación con sesgo de calidad.
- Guard de economía: las monedas que ya entrega el sistema base no se vuelven a cobrar; v3.27 suma únicamente el incremento propio.
- No se modifica el loop principal, pathfinding, colisión ni lógica de boss.
- Prueba visual en navegador/GitHub Pages: pendiente.


## v3.28.0 — Debug Lab

- Nueva capa de diagnóstico sobre el Debug Engine existente, sin reemplazar el runtime ni la suite de tests.
- Snapshot estructurado de engine, player, world, enemies, economía/reliquias v3.27, feedback v3.26 y boss v3.25.
- State diff entre snapshots consecutivos para localizar cambios relevantes.
- Inspector dedicado de enemigo con bloqueo físico, recovery, ruta, memoria corta y detección de velocidad diagonal.
- Timeline circular de hasta 120 muestras con profundidad, room, monedas, enemigos, bloqueos y errores.
- Captura local de errores de `window.error`, `unhandledrejection`, `console.error` y `console.warn`.
- Health checks para estado, grid, economía, reliquias duplicadas, cardinalidad de enemigos, límites de feedback y proyectiles del boss.
- Exportación de un reporte JSON con snapshot, diff, timeline, eventos y errores.
- Atajos: `F8` abre/cierra Debug Lab, `F9` captura snapshot, `Shift+F10` inicia/detiene timeline.
- Nuevo `js/34-debug-lab-stress.js` para verificar snapshot, diff, checks y límites del laboratorio.


## v3.28.1 — Debug Lab corrective patch

Correcciones derivadas del reporte real de v3.28.0:

- Eliminado el error repetitivo `No se encontró runner de tests compatible` cuando la suite no expone un runner público.
- Detección de runners en `DEBUG_TESTS`, namespaces de Debug Engine y globals compatibles.
- Ausencia del runner ahora se informa como `WARN` cuando existen pruebas individuales, sin generar un `window.error` artificial.
- Health Checks distinguen `PASS`, `WARN` y `FAIL`.
- `threat` no expuesto se muestra explícitamente como `NO EXPUESTO`.
- Se separa `actualDirection` derivada de la velocidad de la propiedad `direction` del enemigo.
- Los snapshots informan añadidos/cambios/eliminados correctamente.
- Timeline y snapshots mantienen su función original sin modificar gameplay.

### Validación 3.28.1

- Syntax checks: PASS.
- Harness de Debug Lab: PASS.
- Runner ausente: WARN controlado, sin runtime error.
- Runner compatible simulado: PASS.
- Health checks con WARN/FAIL: PASS.
- Snapshot diff: PASS.
- Integridad del delta: PASS.


## v3.28.2 — Debug Mode unificado

- Se elimina la duplicación entre `DEBUG MODE` y `Debug Lab`: la interfaz anterior de Debug Mode queda como único entorno de diagnóstico.
- Se integran al Debug Mode los nuevos controles de snapshot, diff, health checks y timeline del laboratorio.
- La lista de tests se resuelve dinámicamente y conserva los 16 tests disponibles de la suite actual.
- `DEBUG_MODE.runAllTests()` queda como runner único; ya no depende de un runner externo del laboratorio.
- Se incorpora `DEBUG LAB STRESS` dentro de la suite existente para validar snapshot, diff, health checks y límites de historial/timeline.
- La salida de cada test para copiar queda reducida a texto plano: `TEST: PASS/FAIL — resultado`. No se copia JSON de detalles.
- El timeline usa un snapshot liviano y no ejecuta navegación/BFS continuo.
- La dirección física de enemigos se deriva de `vx/vy` como `actualDirection`, manteniendo separada la dirección declarada por la IA.
- `33-debug-lab.js` y `34-debug-lab-stress.js` dejan de cargarse; `20-debug-visuals.js` tampoco se referencia.
- Para actualizar el repositorio, eliminar de la versión anterior `js/33-debug-lab.js` y `js/34-debug-lab-stress.js`.

### Validación v3.28.2

- `node --check`: `18-debug-mode.js` PASS.
- `node --check`: `19-debug-overlay.js` PASS.
- Harness unificado: 16 tests detectables, runner único, health checks sin `undefined`, reporte textual simple y `DEBUG LAB STRESS` PASS.
- Sin prueba visual de GitHub Pages realizada en esta validación.
