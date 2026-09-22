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
