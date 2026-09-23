# Bomberman Roguelike v3.15.1 — Debug Lab

Modo de pruebas aislado para la build actual del juego.

## Qué permite comprobar

- Movimiento cardinal y colisiones.
- Colocación y detonación de bombas.
- Daño, inmunidad temporal y prevención de doble golpe.
- Las cinco trampas y su activación de un solo uso.
- Comportamiento básico de enemigos.
- Seguimiento y límites de cámara.
- Reinicio limpio de una run.

## Uso

Abrí `debug.html` desde la misma carpeta que `index.html`, `styles.css` y `js/`.

El laboratorio carga el juego real dentro de un iframe y ejecuta las pruebas sobre ese motor. Cada prueba prepara un estado aislado antes de ejecutar el escenario.

El modo debug no se carga desde `index.html`, por lo que no altera la partida normal.
