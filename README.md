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
