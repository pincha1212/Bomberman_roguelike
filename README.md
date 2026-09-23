# Bomberman Roguelike v3.15 — Death & Restart Update

## Enfoque

Esta versión pule el cierre de una run y garantiza un reinicio limpio. La muerte ahora muestra un resumen completo de la partida y el siguiente intento vuelve a iniciar todos los sistemas temporales y entidades desde cero.

## Resumen de muerte

La pantalla final informa:

- Profundidad alcanzada.
- Enemigos derrotados.
- Monedas obtenidas.
- Reliquias conseguidas.
- Tiempo de run activo.
- Puntaje total.
- Mejor profundidad histórica.
- Mejor puntaje histórico.
- Causa del último daño letal.

Los récords se guardan en `localStorage` y se distinguen cuando la run establece una nueva marca.

## Reinicio limpio

Cada nueva run limpia de forma centralizada:

- bombas y contador de bombas;
- explosiones y proyectiles;
- enemigos y jefe;
- trampas y estados temporales de movimiento;
- timers de sala, amenaza, daño, bombas y feedback;
- partículas y textos flotantes;
- input de teclado, joystick y retención de bomba;
- velocidad, vida, escudo, alcance y modificadores de reliquias;
- cámara, shake y estado de animación.

La run también tiene un reloj propio que no avanza mientras el juego está pausado.

## Arquitectura

El ciclo de vida de la run está aislado en `js/17-run-lifecycle.js`, para facilitar auditorías y pruebas de reinicio sin mezclarlo con combate, movimiento o generación del mapa.

## Compatibilidad

Proyecto web estático para GitHub Pages. HTML, CSS y JavaScript vanilla, sin backend ni bundler.
