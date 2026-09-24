# Bomberman Roguelike

## Cómo usar

### Abrir localmente

Abrí `index.html` directamente en un navegador moderno.

También podés servir la carpeta con cualquier servidor HTTP local si el navegador bloquea recursos al abrir archivos directamente. No necesita Node, backend ni base de datos.

### Publicar en GitHub Pages

Subí la estructura completa del proyecto al repositorio y activá GitHub Pages usando la rama y carpeta donde esté `index.html`. Las rutas del proyecto son relativas para que funcione dentro de una subruta del repositorio.

### Controles

- Movimiento: `WASD` o flechas.
- Bomba: `ESPACIO`.
- En dispositivos táctiles: joystick virtual y botón de bomba.

### Debug Mode

Abrí el juego con `?debug=1`, por ejemplo:

```text
index.html?debug=1
```

Desde Debug Mode podés consultar el estado del jugador, mundo, navegación, rendimiento y ejecutar las pruebas integradas.

### Estructura básica

- `index.html`: entrada de la aplicación.
- `css/`: estilos separados por sistema.
- `js/`: lógica del juego separada por módulos.

No hace falta instalar dependencias para ejecutar la versión publicada.
