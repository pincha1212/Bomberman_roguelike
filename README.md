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


## v3.28.3 — Corrección de Enemy Behavior Stress

- El fallo observado en `enemy-behavior-stress` no se reproduce con la IA y colisión aisladas: los 5 roles completan la prueba con movimiento, estados diferenciados y BFS=0.
- El stress ahora reinicia el estado global de IA entre escenarios, fija `threatLevel=0`, limpia objetos temporales y restaura el runtime al terminar.
- La validación de alerta observa varios frames del estado esperado en lugar de exigir únicamente el último frame.
- Un `FAIL` de una prueba funcional ya no se contabiliza como `RUNTIME ERRORS`; queda separado como resultado de la suite.
- Se mantiene la IA de juego sin cambios.


## v3.28.3 — Verificación y corrección de Enemy Behavior Stress

La salida v3.28.2 mostraba `ENEMY-BEHAVIOR-STRESS: FAIL` y simultáneamente `RUNTIME ERRORS: 1`. La investigación separó ambos problemas:

- La IA v3.24.1 + colisión v3.20, ejecutadas de forma aislada con el mismo escenario, producen `5/5 roles`, estados `chase/patrol/flee/aggressive` y `BFS=0`. No se encontró evidencia de una falla de comportamiento del juego.
- El stress original reutilizaba estado global de IA entre escenarios y no fijaba `threatLevel`, por lo que podía depender del estado que otros tests hubieran dejado atrás.
- v3.28.3 reinicia el estado global de IA por caso, fija `threatLevel=0`, restaura el runtime completo al finalizar y valida los estados esperados durante varios frames.
- Un fallo funcional de una prueba ya no se suma a `RUNTIME ERRORS`; los errores de ejecución quedan reservados para excepciones del runtime, recursos, promesas no controladas o acciones.
- La suite termina generando automáticamente un snapshot y un diagnóstico para que el reporte de copia no quede en `PENDIENTE`.
- El resultado bruto de `ROGUELIKE-STRESS` se normaliza a texto simple en vez de mostrar `[object Object]`.


## v3.28.4 — Debug Mode visual/navigation + threat instrumentation

- Se mantiene Debug Mode como única interfaz de depuración.
- NAVEGACIÓN incorpora un mapa visual del nivel usando la misma rejilla del juego.
- Se visualizan alcance del jugador, ruta del objetivo seleccionado, jugador, enemigos, bombas, explosiones y dirección real de IA según los toggles.
- Se agregó selector JUGADOR/E<n> y actualización manual de navegación para evitar recalcular BFS en cada render del panel.
- Se agregó navegación rápida entre secciones del panel.
- El caché de navegación pasa a 700 ms para reducir el coste del análisis en vivo.
- `threat-state` ahora detecta `gameState.threatLevel`, que es la propiedad usada por el runtime/HUD.
- Se mantiene el snapshot y diagnóstico automáticos al finalizar la suite.
- El reporte continúa siendo texto plano copiable.

### Validación v3.28.4

- Syntax: PASS.
- Threat Level instrumentation: PASS.
- Navigation visual DOM/canvas: PASS.
- Unified Debug Mode references: PASS.
- Harness: PASS.
- No se afirma validación visual en GitHub Pages.

==================================================
v3.28.5 — DEBUG MODE NAVIGATION FIX
==================================================

Corrección del Debug Mode unificado.

Problema auditado:
- La barra de navegación rápida existía en el HTML, pero el overlay no tenía un contenedor interno de scroll vertical.
- `#debug-overlay` usaba `overflow:hidden`, por lo que los botones no controlaban de forma fiable el desplazamiento por sectores y el contenido inferior podía quedar fuera de la zona visible.
- Además, el reporte podía seguir mostrando la versión anterior desde `18-debug-mode.js`.

Cambios:
- contenedor interno `.debug-scroll` para todas las secciones;
- barra superior persistente con saltos a todos los sectores principales;
- scroll interno mediante `scrollTo()`;
- indicador visual del sector activo mediante `IntersectionObserver`;
- navegación horizontal de botones cuando el ancho es reducido;
- cache-busters de `18-debug-mode.js` y `19-debug-overlay.js` a v3.28.5;
- versión del reporte y del bootstrap de Debug Mode actualizada a v3.28.5.

Validación:
- suite detectada: 16 tests;
- health checks: 15 PASS / 0 WARN / 0 FAIL;
- threat-state: PASS (`threat=0`);
- navegación visual: presente;
- entorno único: confirmado;
- sintaxis JS: PASS.

No se realizó una prueba visual en GitHub Pages dentro de esta validación.



==================================================
38. v3.29.0 — OPTIMIZACIÓN FINAL PRE-v4
==================================================

Segunda pasada de rendimiento realizada después de sumar enemigos, feedback visual, partículas, bosses y navegación de debug.

Cambios: 
- Debug Mode: actualización de UI desacoplada del frame; máximo aproximado 8 refrescos/s.
- Debug Mode: profiler cacheado para no ordenar muestras en cada refresco.
- Debug Navigation: el mapa visual solo se redibuja cuando cambia el estado relevante.
- IA: eliminado el armado de firmas string de bombas/explosiones cada frame.
- IA: perfiles de comportamiento cacheados por enemigo.
- IA: normalización de arrays/estado de navegación realizada una sola vez.
- IA: comprobación de peligro inminente escalonada y omitida cuando no hay peligro.
- Render: culling de entidades dinámicas fuera de viewport.
- Render: presupuesto visual de partículas separado del presupuesto de simulación.
- Render: FX opcionales reducidos automáticamente en baja calidad.
- Estado: límite para textos flotantes.

Objetivo: dejar v3.29 como base estable de rendimiento para entrar a v4 sin cambiar la lógica de gameplay.


==================================================
39. v3.29.0 — SEGUNDA PASADA DE RENDIMIENTO
==================================================

Ajustes finales de bajo riesgo antes de v4:
- se eliminó el evento `bomber-debug-updated` emitido desde cada frame del game loop; Debug Mode se actualiza por su propio throttle;
- se eliminó una definición duplicada de `enemyPlayerTileV312` y se cachearon coordenadas de tile de enemigos mientras permanezcan en la misma celda;
- `drawEnemyAISignals` y capas de debug evitan trabajo para enemigos fuera del viewport;
- el renderer cachea el viewport de cámara una vez por frame y expone entidades visibles en `BOMBER_ENGINE.getRenderStats()`;
- en escenas realmente cargadas se reduce solo la frecuencia de iluminación y partículas decorativas, sin modificar la simulación ni la velocidad de juego;
- la vista de bombas del Debug Mode cachea el cálculo de blast mientras no cambien bomba/rango/revisión del mapa.

No se modificó la lógica de gameplay de enemigos, colisiones, bombas, bosses o progresión.

La validación de v3.29 se limita a sintaxis, harnesses y auditoría estática/estructural. No se afirma un FPS concreto sin una ejecución real en navegador.


## v4.0 — Visual + Boss Bomb Foundation

- Nuevo sistema visual responsive con tema arcade pixelado inspirado en Bomberman: negro, rojo, naranja y amarillo.
- Responsive para escritorio, tablet y móvil.
- Se mantiene un solo runtime y la estructura modular existente.
- Las bombas comparten estados: `moving → armed → exploding`.
- La posición lógica de detonación (`x/y`) se separa de la posición visual (`worldX/worldY`) para habilitar futuras habilidades de interacción con bombas.
- Los bosses lanzan bombas a celdas vacías aleatorias del mapa, con separación mínima del jugador y del propio boss.
- Las bombas del boss no consumen `player.bombsPlaced`.
- El lanzamiento tiene movimiento interpolado y arco visual antes de armarse.
- Se conserva el sistema anterior de proyectiles y fases.
- Debug Mode expone cantidad y estados de bombas.
- Boss Stress incorpora fases, lanzamiento, movimiento y cap de bombas.

### Validación v4.0

- Syntax check PASS en todos los archivos modificados.
- Debug harness PASS: 16 tests, 15 PASS, 0 WARN, 0 FAIL.
- Boss Stress PASS: 5/5 fases, bombas aleatorias, movimiento `moving → armed`, cap=6.
- No se pudo completar una captura headless del juego completo porque Chromium quedó ejecutando el RAF del runtime; por eso la validación visual final sigue siendo navegador real/GitHub Pages.

---
## v4.1 — Bombs as the core combat language
- Boss attacks reduced to two actions: random bomb throws and ground slam.
- Removed active boss projectile/charge/summon attack paths from the runtime.
- Boss throw bombs use wider phase-based ranges: 2 / 3 / 4.
- Ground slam reuses the shared bomb explosion pipeline with large cross-shaped ranges: 5 / 6 / 7.
- Boss-owned explosions do not damage the boss itself.
- Bombs now expose `interactionState`, `canKick`, `canPush`, `canCarry` and `carriedBy` for future player/bomb skills.
- Existing moving → armed → exploding bomb state model remains the shared foundation.


==================================================
V4.2 — SMART INFORMATION LAYOUT
==================================================

Segunda revisión visual de distribución: el HUD, banners, boss HUD, pantallas
y controles táctiles se adaptan al viewport. Se incorpora perfil dinámico de
tamaño/orientación y se evita depender de posiciones fijas únicas.

## v4.3 — CSS modularization

La hoja `styles.css` de v4.2 tenía 1334 líneas y acumulaba reglas de distintas etapas.
En v4.3 se divide en módulos dentro de `css/` sin cambiar la cascada existente.

Estructura:

- `css/main.css` — manifiesto de carga, mantiene el orden.
- `css/01-base.css` — base global y controles elementales.
- `css/02-ui-systems.css` — HUD, banners, bombas, boss HUD y layout histórico.
- `css/03-menu-layout.css` — menú principal y layouts de pantalla.
- `css/04-relics-screens.css` — reliquias, game over y resultados.
- `css/05-debug.css` — Debug Mode.
- `css/06-v4-theme.css` — identidad visual Bomberman v4.
- `css/07-v4-responsive.css` — responsive e información inteligente v4.2.

`styles.css` queda reducido a un loader de compatibilidad. La página ahora carga directamente `css/main.css`.

La división se hizo preservando exactamente el orden original de las reglas para no cambiar el comportamiento visual por accidente.
