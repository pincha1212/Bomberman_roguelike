# Bomberman Roguelike v3.2.2.1 — Large Boss Edition

## v3.2.1 — Optimization Update

- HUD/DOM updates throttled to reduce layout work.
- Adaptive visual quality for slower devices.
- Particle cap to prevent effect spikes during explosions and boss fights.
- Reduced expensive lighting work on low-performance frames.
- Enemy direction decisions now use their existing timer instead of a per-frame random roll.
- Gameplay timing and movement speed remain frame-rate independent.


Build estático para GitHub Pages.

## Qué cambia
- Bosses colosales de más de 2 casillas de ancho.
- Mucha más vida y tres fases reales.
- Proyectiles dirigidos con patrones más agresivos.
- Olas radiales de proyectiles.
- Carga contra el jugador en fases 2 y 3.
- Refuerzos durante el combate.
- Aura, armadura, núcleo, corona y efectos visuales del Coloso.
- Arena de jefe despejada y salida bloqueada hasta derrotarlo.
- Movimiento libre del jugador conservado: la cuadrícula sigue siendo solo para colisiones del mapa.

## Controles
- WASD / flechas: mover
- Espacio: bomba
- P / Escape: pausa
- En móvil: joystick + botón de bomba

## Ejecutar
Abrí `index.html` directamente o publicá la carpeta en GitHub Pages.


## v3.2.2 — Large Support Update
- Soporte optimizado para bosses grandes y muchas entidades simultáneas.
- Límite seguro de proyectiles, enemigos y partículas para evitar saturación.
- Sombras y efectos del boss adaptativos según rendimiento.
- Cámara con ligero seguimiento del boss durante combates grandes.
- Conserva el movimiento libre y las mecánicas de v3.2.1.


## v3.2.3 — Adaptive Interface Update
- HUD reorganizado en grupos compactos y con posicionamiento adaptable.
- La interfaz evita ocupar la zona inmediata del jugador según su posición en pantalla.
- Las etiquetas de run/sala reducen su presencia durante el movimiento.
- La barra del jefe queda compacta en el borde superior para liberar el centro de combate.
- Ajustes específicos para pantallas pequeñas y controles táctiles.
- El minimapa mantiene su esquina y activa un estado de evitación cuando el jugador se aproxima.
- No cambia la lógica de combate, movimiento libre, bosses, amenazas, recompensas ni rendimiento de v3.2.2.


## v3.2.4 — Movement Update
- Collision box de movimiento reducida para evitar enganches en esquinas.
- Padding de seguridad frente a paredes.
- Colisión por solapamiento real: tocar exactamente el borde de una celda no bloquea el movimiento.
- Movimiento diagonal habilitado y normalizado para mantener la misma velocidad efectiva.
- Deslizamiento independiente por ejes para recorrer paredes y salir de esquinas con mayor suavidad.
- Substeps de 2.25 px para reducir wall-clipping a velocidades altas.
- Se mantiene el movimiento libre de v2.1 y la interfaz adaptativa de v3.2.3.


## v3.2.5 — Movement Update
- Movimiento exclusivamente cardinal: arriba, abajo, izquierda y derecha.
- Diagonales deshabilitadas tanto en teclado como en joystick.
- Cuando se pulsan dos ejes simultáneamente, se conserva un solo eje de movimiento.
- Se mantiene la colisión rectangular, hitbox reducida, padding y wall sliding de v3.2.4.
- El personaje no puede desplazarse en diagonal para cortar esquinas.


## v3.3 — Trap Update
- Trampas ocultas hasta su activación.
- Al activarse se hacen visibles con feedback visual y sonoro.
- Cada trampa es de un solo uso y no puede volver a dañar al jugador.
- Se eliminó completamente el minimapa del juego y de la interfaz.
- Se conserva el movimiento cardinal de v3.2.5 y el resto de sistemas roguelike.


## v3.4 — Assisted Motion Update

Revisión profunda del control del jugador para reducir la sensación de movimiento tosco sin abandonar el movimiento cardinal.

- Movimiento exclusivamente arriba/abajo/izquierda/derecha.
- Aceleración y frenado suaves para evitar cambios bruscos.
- Inversión de dirección con frenado controlado.
- Buffer de entrada breve para que los giros no se pierdan por milisegundos.
- Asistencia de carril en intersecciones: el jugador puede centrarse suavemente antes de girar.
- Corrección de carril por etapas: nunca se mueve X e Y simultáneamente.
- Colisiones conservan hitbox reducida, padding y substeps.
- Si un frente está bloqueado, el eje activo se detiene sin empujar ni generar desplazamiento diagonal.
- Teclado y joystick pasan por el mismo selector cardinal.
- Sin minimapa.


## v3.4 — Estructura modular

La versión v3.4 mantiene el gameplay de Assisted Motion y ahora divide el JavaScript en archivos por responsabilidad para facilitar auditorías y correcciones puntuales:

- `js/01-core.js` — configuración, estado, audio, rendimiento y UI adaptativa.
- `js/02-input.js` — teclado, joystick, botón de bomba y pausa.
- `js/03-world.js` — generación de salas, jefe, amenazas, trampas y refuerzos.
- `js/04-enemies.js` — creación/configuración de enemigos.
- `js/05-player.js` — movimiento cardinal asistido y colisiones del jugador.
- `js/06-combat.js` — bombas, explosiones, daño y actualización de combate.
- `js/07-render.js` — renderizado del mapa, sprites y efectos.
- `js/08-loop-ui.js` — game loop, HUD, recompensas, flujo de run y arranque.

Los scripts se cargan en ese orden desde `index.html`. No se usa bundler ni Node: sigue siendo un proyecto estático listo para GitHub Pages. La división es estructural y no pretende cambiar la jugabilidad de v3.4.


## V3.5 — Interface Update
- Menú principal rediseñado para aprovechar el espacio exterior al canvas en escritorio.
- Layout responsive en tres columnas, dos columnas o una columna según el dispositivo.
- Canvas escalable con límites distintos para escritorio, tablet, móvil y landscape.
- Panel de inicio separado del área de juego para que el HUD de partida no comparta espacio con el menú.
- Durante la run, el canvas recupera el foco visual y el menú exterior desaparece.
- Controles táctiles reservados para dispositivos coarse-touch o pantallas pequeñas y fijados al borde inferior en móvil.
- Conserva la estructura modular de v3.4 y no modifica la lógica de combate/movimiento.


## v3.6 — Damage Immunity Fix

- Corregida la inmunidad infinita del jugador después de recibir daño.
- La inmunidad temporal ahora descuenta su contador en cada actualización.
- Daño normal: 1500 ms de invulnerabilidad.
- Escudo roto: 1000 ms de invulnerabilidad.
- Al llegar a 0 ms, `isInvincible` vuelve automáticamente a `false`.
- `takeDamage()` también bloquea impactos duplicados durante el mismo periodo de invulnerabilidad.
- La inmunidad se reinicia al comenzar una nueva run y al cambiar de profundidad.
- Se mantienen la interfaz adaptativa de v3.5, el movimiento asistido y la estructura modular del proyecto.


## v3.7 — Player Follow Camera Update

- La cámara ahora sigue al personaje al desplazarse por mapas mayores que el canvas.
- Seguimiento vertical y horizontal con zona de seguridad para evitar micro-sacudidas.
- Desplazamiento suave e independiente del FPS.
- Límites de cámara ajustados al tamaño real de cada mapa: nunca muestra fuera del escenario.
- La cámara se reinicia correctamente al comenzar una nueva profundidad.
- Se añade `js/09-camera.js` como módulo independiente para facilitar futuras auditorías.
- No modifica el movimiento cardinal asistido ni las colisiones.


## v3.8 — Bomb Reset Fix

- Corregido el bloqueo de bombas después de morir y reiniciar la partida.
- `initLevel()` ahora sincroniza `player.bombsPlaced` con el reinicio del array de bombas.
- El jugador vuelve a disponer de su cupo completo de bombas al comenzar una nueva run.
- La misma corrección también evita conservar un contador de bombas usado al pasar a otra profundidad.
- No se modifica el movimiento, daño, trampas, cámara, bosses ni la interfaz.


## v3.9 — Combat & Feedback Update
- Feedback visual/audio reforzado al colocar bombas, recibir daño, derrotar enemigos y golpear al boss.
- Preview temporal del alcance de cada bomba, respetando paredes y bloques.
- Animación de mecha con progreso visual y aviso de urgencia en los últimos 650 ms.
- Hit-stop corto que ralentiza únicamente el movimiento/animación; timers críticos continúan normalmente.
- Retroceso visual del jugador al recibir daño y feedback de muerte.
- Diferenciación cromática por fuente de daño: enemigo, boss/proyectil, trampa y escudo.
- Protección explícita contra más de una aplicación de daño al jugador en el mismo frame.
- Nuevo módulo `js/10-feedback.js`.


## v3.10 — Bomb Handling Update

- Colocación de bombas aislada en `js/11-bombs.js`.
- Una pulsación = una bomba; mantener pulsado permite repetición controlada con retardo y cooldown.
- Bloqueo de colocación accidental cuando el input de movimiento acaba de activarse.
- Bomba con estado de salida segura y bloqueo al abandonar la casilla.
- Geometría de explosión centralizada para evitar discrepancias entre preview y detonación.
- Cadenas visibles mediante enlaces y contador `CADENA ×N`.
- Bombas del jugador identificadas visualmente con aro cian.
- HUD muestra bombas disponibles/máximas y una barra de capacidad.
- Se conservan el feedback de v3.9 para mecha, preview de alcance e impacto.


## v3.10 — Bomb Handling Update (completado sobre v3.9)

- Repetición al mantener bomba con retardo inicial y cooldown seguro.
- Gracia corta contra colocación accidental al cambiar de dirección.
- Ocupación de bombas y salida segura conservadas.
- Geometría de explosión unificada entre preview y detonación.
- Contacto de explosión estricto para evitar golpes fantasma en esquinas/bordes.
- Cadenas visibles con enlaces temporales y contador `CADENA ×N`.
- Bombas del jugador identificadas con aro cian.
- HUD de bombas: disponibles/máximas + barra de capacidad.
- Se conserva el feedback de v3.9 para mecha y preview de alcance.

## v3.10.1 — Bomb Escape Fix

Corrección puntual del movimiento tras colocar una bomba. La bomba propia permanece atravesable mientras la hitbox de movimiento del jugador siga tocando su casilla; solo pasa a ser sólida cuando el jugador la abandona por completo. Esto evita que la bomba se vuelva sólida un frame demasiado pronto y deje al personaje atrapado al intentar huir.

