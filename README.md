# Bomberman Roguelike — v6.38.0 (React + TypeScript + Vite)

A procedural Bomberman roguelike rewritten as a modern React application.

### Versión v6.38.0 — Corrección de Canvas en Tablets/Móviles y Configuración de GitHub Actions
- **Fix Bug de Canvas Minúsculo en Tablets**: En Google Chrome para Android e iPads, `#game-container` colapsaba a un tamaño ínfimo e injugable debido a una regla `container-type: size;` con altura no definida en el contenedor padre. Se migró a `container-type: inline-size;` y se dotó a `#game-stage` y `#game-container` de un dimensionamiento estricto basado en viewport `min()` bidireccional.
- **Escalado Responsivo para Tabletas y Móviles**: El canvas y el contenedor del juego ahora ocupan el máximo espacio visible cuadrado en orientación vertical (portrait) y horizontal (landscape), garantizando visibilidad nítida, controles táctiles accesibles y renderizado pixel-perfect.
- **Auditoría de Acciones de GitHub (GitHub Actions vs Pages Legacy)**: Se aclaró la razón por la que GitHub ejecutaba `pages-build-deployment` (constructor Jekyll por defecto) en lugar del workflow de Vite, indicando cómo activar **GitHub Actions** en los ajustes de Pages del repositorio.

### Versión v6.37.0 — Corrección de Campos de Rayo y Despliegue en GitHub Pages
- **Fix Runtime Error (`allowDiagonals`)**: Se solucionó la excepción `ReferenceError: allowDiagonals is not defined` en `drawBombEffectFieldsV6323`, restaurando el renderizado de campos eléctricos (shock) en las explosiones.
- **Rutas Relativas en Vite (`base: './'`)**: Configurado en `vite.config.ts` para que los bundles y assets carguen correctamente bajo cualquier subdirectorio de GitHub Pages (ej. `https://usuario.github.io/Bomberman_roguelike/`).
- **Flujo Automático con GitHub Actions (`.github/workflows/deploy.yml`)**: Compilación y publicación automática a GitHub Pages con cada push a la rama `main`.

## Cómo publicar en GitHub Pages (Con Vite + React)

Al usar Vite, los archivos fuente (`src/`, TypeScript, JSX) deben compilarse a HTML, JS y CSS estáticos en la carpeta `dist/`. Tenés dos opciones:

### Opción 1: Automática con GitHub Actions (Recomendada)
El repositorio ya incluye el archivo `.github/workflows/deploy.yml`. Solo necesitás:
1. En GitHub, abrí tu repositorio (`Bomberman_roguelike`).
2. Andá a **Settings** > **Pages** (en el menú lateral izquierdo).
3. En la sección **Build and deployment** > **Source**, cambiá de `Deploy from a branch` a **`GitHub Actions`**.
4. ¡Listo! Cada vez que hagas `git push` a `main`, GitHub compilará el juego y lo publicará automáticamente.

### Opción 2: Compilar manualmente y subir la carpeta dist
1. Ejecutá en tu terminal:
   ```bash
   npm run build
   ```
2. Esto generará la carpeta `dist/` optimizada y lista para producción.
3. Podés subir el contenido de `dist/` a la rama `gh-pages` de tu repositorio.

### Versión v6.36.0 — Minicompetencia y Clasificación Global (Firebase Auth & Firestore)
- **Autenticación con Google y Perfil de Jugador**: Identificación segura de usuarios con Firebase Auth (`GoogleAuthProvider` e inicio de sesión como invitado) para registrar estadísticas persistentes y avatar del jugador.
- **Clasificación Global en Tiempo Real**: Colección `/leaderboard` en Cloud Firestore con sincronización en vivo (`onSnapshot`). Podio arcade con medallas (`👑 #1`, `🥈 #2`, `🥉 #3`), detalles de profundidad, tiempo, monedas y enemigos eliminados.
- **Sincronización Automática de Partidas**: Al concluir una partida (Game Over), el récord se evalúa y sube automáticamente a la tabla mundial y al perfil del usuario. Los usuarios no autenticados disponen de un botón directo para registrar su puntaje sin perderlo.
- **Pestaña Competitiva en Menú de Inicio**: Selector de pestañas `[ 💣 JUGAR ]` y `[ 🏆 CLASIFICACIÓN ]` integrado directamente en la interfaz superpuesta `#start-screen`.
- **Seguridad Firestore Hardened**: Reglas `firestore.rules` con validación estricta de esquema y propiedad de autoría por UID.

### Versión v6.35.0 — Superposición Frontal del Menú de Inicio (Canvas Overlay Start Screen)
- **Superposición centrada sobre el canvas**: En pantallas móviles y compactas, el menú `#start-screen` ya no se ubica debajo del canvas ni requiere scroll. Aparece centrado directamente sobre el canvas como un diálogo modal arcade interactivo.
- **Prevención de toques accidentales**: Evita la confusión del jugador al intentar mover el personaje antes de iniciar la partida, manteniendo la selección de gráficos y el botón de inicio al alcance inmediato.
- **Transición suave**: Desaparece instantáneamente al presionar "INICIAR PARTIDA" para dar paso al juego sin obstrucciones.

## Features

- **Procedural Dungeon Generation**: Dynamic room layout, obstacles, destructible blocks, traps, and secrets every run.
- **Roguelike Progression & Builds**: Relics, elemental bombs (Fire, Ice, Electric, Toxic, Gravity, Fragment, Pierce), stackable abilities, and synergies.
- **Boss Fights & Enemies**: Multi-phase bosses, specialized crawling and flying enemies with tactical AI behaviors.
- **11 Unique Biomes**: Real-time or depth-based biome progression (Winter, Autumn, Spring, Summer, Underground, Clouds, Mountains, Beach, Space, Sky, Inferno) with dynamic liquid surfaces and environmental weather effects.
- **Run Persistence**: Automatic run save and resume capabilities via localStorage.
- **Quality & Dev Tools**: Switchable graphics fidelity (Low, Medium, High) and God Mode toggle for testing.
- **Responsive & Mobile Ready**: Full keyboard controls (`WASD` / arrows + `Space` for bombs, `Esc`/`P` for pause) plus invisible mobile gesture and action touch zones.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Controls

- **Move**: `W`, `A`, `S`, `D` or Arrow keys
- **Bomb**: `Space` or `Z` (tap to drop, hold for grab/throw when unlocked)
- **Pause**: `Esc` or `P`
- **Mobile**: Left half screen for directional movement, right half screen for bomb actions.
