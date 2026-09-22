# BOMBERMAN // DESCENT — Roguelike v2.0

Versión 2.0 enfocada en **inmersión**, sin backend ni Node. Preparada para GitHub Pages.

## Qué cambia en v2.0

- Presentación de run más cinematográfica: entrada de cada profundidad y tipo de sala.
- Iluminación dinámica alrededor del jugador y de las bombas.
- Viñeta ambiental y oscurecimiento progresivo cuando la vida está baja.
- Partículas ambientales de polvo para dar profundidad al escenario.
- Indicador de peligro cuando una bomba cercana está a punto de detonar.
- Feedback sonoro procedural mediante Web Audio API: bomba, explosión, daño, pickup, salida y UI.
- La música no es necesaria ni depende de archivos externos: el audio se genera localmente en el navegador.
- Barra visual de reliquias activas durante las recompensas.
- Se conserva la economía, salas especiales, reliquias, rerolls y progresión roguelike de v1.1.
- Sigue funcionando en PC y controles táctiles.

## Archivos

- `index.html` — estructura de la interfaz.
- `styles.css` — presentación y efectos visuales.
- `game.js` — lógica completa del juego.

## Ejecutar

Abrir `index.html` directamente en un navegador moderno o publicarlo mediante GitHub Pages.

## Controles

- WASD / flechas: mover
- Espacio / Z: colocar bomba
- P / Esc: pausar
- Móvil: joystick + botón de bomba

## Nota de audio

El navegador requiere una interacción del usuario para habilitar AudioContext. El juego lo inicializa al comenzar la run.
