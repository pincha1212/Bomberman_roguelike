# Bomberman Roguelike — v6.44.0 (React + TypeScript + Vite)

A procedural Bomberman roguelike rewritten as a modern React application.

### Versión v6.44.0 — Panel de Configuración de Audio en el Menú de Pausa
- **Panel de Audio Integrado en Pausa**: Nuevo panel retro arcade dentro de la pantalla de pausa (`#pause-screen`) que permite regular de forma independiente el volumen de música (BGM) y el de efectos sonoros (SFX).
- **Controles con `<input type="range">`**: Sliders analógicos retro (`min="0" max="100"`) con indicadores de porcentaje en tiempo real, track con gradiente dinámico y thumbs pixel-art brillantes con respuesta táctil y de ratón.
- **Controlador de Audio Dedicado (`src/engine/audioController.ts`)**:
  - Enrutamiento completo de Web Audio API mediante nodos `masterGain`, `musicGainNode` y `sfxGainNode`.
  - Sintetizador chiptune retro BGM con arpegios y líneas de bajo procedurales de 8-bit inspirados en Bomberman, que se reproducen durante el juego, bajan suavemente al pausar y se detienen al finalizar la partida.
  - Enrutamiento y escalado dinámico de todos los efectos de sonido (`sfx` y `feedbackPoolPlaySound`) por el volumen configurado.
  - Feedback sonoro inmediato al deslizar la barra de efectos (preview blip).
  - Persistencia automática de las preferencias en `localStorage` (`bomberman_music_volume`, `bomberman_sfx_volume`).

### Versión v6.43.0 — Manejo Seguro de ResizeObserver y Desacoplamiento de Ciclos
- **Desacoplamiento con requestAnimationFrame**: Los callbacks de `ResizeObserver` en `src/hooks/useDynamicCanvasSize.ts` y en el motor del juego ahora se programan mediante `requestAnimationFrame`, evitando mutaciones sincrónicas de layout en el mismo frame de renderizado.
- **Mutaciones Condicionales de Estilos**: Se valida que las propiedades `style.width` y `style.height` de `#gameCanvas` y `#game-container` solo se modifiquen cuando los valores calculados hayan cambiado efectivamente, suprimiendo disparos recursivos de redimensionamiento.
- **Filtrado de Notificaciones Benignas del Navegador**: El detector global de errores en `gameEngine.js` ahora ignora los eventos no fatales `ResizeObserver loop completed with undelivered notifications` y `ResizeObserver loop limit exceeded` emitidos de forma informativa por motores Chromium y WebKit, previniendo modales de error espurios durante el juego.

### Versión v6.42.0 — Centrado Dinámico y Seguimiento Fluido de Cámara + Escala Óptima del Mapa
- **Seguimiento Continuo y Centrado de Cámara**: La cámara ahora se enfoca dinámicamente en Bomberman en cada movimiento (`targetX = playerCenterX - canvas.width / 2`, `targetY = playerCenterY - canvas.height / 2`), eliminando la zona muerta excesiva (de 96px a 20px) y aumentando la suavidad reactiva (`smoothness: 0.28`). El jugador ya no se aleja hacia los bordes sin que la cámara lo acompañe.
- **Resolución Retro Óptima (Sin Mapa Reducido)**: Se fijó el buffer de renderizado interno en la resolución nativa de 600×600 para que las baldosas de 48px conserven su tamaño y escala visual retro completa. El escalado a pantalla completa y dispositivos táctiles se gestiona vía CSS (`style.width/height`) con filtrado pixel-perfect, permitiendo que el mapa se aprecie grande, claro y sin barras vacías.
- **Restauración del HUD Superpuesto (`#ui-layer`)**: Se reubicaron los indicadores de salud (❤️), bombas (💣), tiempo (⏱), nivel (🚩) y toasts de mejoras directamente dentro de `#game-container`, superpuestos sobre el canvas tal como se diseñó para la vista de partida.

### Versión v6.41.0 — Modo Pantalla Completa (Fullscreen API) para Escritorio
- **Botón de Pantalla Completa en el Menú Principal**: Nuevo botón retro arcade `[ ⛶ PANTALLA COMPLETA ]` ubicado en las acciones del menú de inicio (`#start-screen`) y en el riel de información (`menu-rail-top`).
- **Integración con Fullscreen API Multi-Navegador**: Soporte completo para `requestFullscreen` y `exitFullscreen` con compatibilidad cruzada (Chrome, Firefox, Safari y Edge).
- **Sincronización de Estado en Tiempo Real**: Detección bidireccional mediante eventos `fullscreenchange`. Al alternar la vista o presionar la tecla `Esc`, el botón actualiza su estado, etiqueta visual e icono dinámicamente (`⛶ PANTALLA COMPLETA` / `🗗 SALIR DE PANTALLA COMPLETA`).
- **Inmersión Total en Dispositivos de Escritorio**: Elimina las distracciones de la interfaz del navegador, maximizando el lienzo del juego con relación de aspecto pixel-perfect.

### Versión v6.40.0 — Aprovisionamiento y Manejo Robusto de Conexión Firebase / Firestore
- **Aprovisionamiento Automático (`fax.ProvisionFirebase`)**: Activación de la API de tokens de seguridad (`securetoken.googleapis.com`) y servicios de identidad para el proyecto Firebase (`citric-partition-qsmzh`) y base de datos `ai-studio-bombermanrogueli-1709919d-888a-4b89-be9a-9c5d158f7b63`.
- **Despliegue y Validación de Reglas (`fax.DeployRules`)**: Sincronización activa de `firestore.rules` con soporte de lectura para la clasificación pública y escritura autenticada con esquema estricto.
- **Manejador Estandarizado de Errores Firestore (`src/firebase/firestoreErrors.ts`)**: Implementación de `handleFirestoreError` con metadatos de autenticación estructurados (`FirestoreErrorInfo`) para operaciones de consulta, lista y escritura según las directrices de integración.
- **Tolerancia a Estado Offline y Propagación de Tokens**: `testConnection()` y `LeaderboardView` ahora manejan estados de conexión intermitente sin interrumpir el flujo ni generar errores no controlados.

### Versión v6.39.0 — Hook React Dinámico de Redimensionamiento para Dispositivos Táctiles (`useDynamicCanvasSize`)
- **Hook de React en Tiempo Real (`src/hooks/useDynamicCanvasSize.ts`)**: Monitorea continuamente las dimensiones de la pantalla (`window.innerWidth/innerHeight`, `visualViewport`, cambios de orientación y `ResizeObserver` en el stage).
- **Detección Automática de Dispositivos Táctiles**: Detecta capacidades táctiles (`ontouchstart`, `navigator.maxTouchPoints > 0`, media queries `pointer: coarse` y `hover: none`) para tablets, smartphones y emuladores táctiles.
- **Ajuste Dinámico de Propiedades de Canvas**: Ajusta en tiempo real tanto las propiedades DOM del elemento (`canvas.width` y `canvas.height`) como sus estilos (`style.width`, `style.height`, `aspect-ratio: 1 / 1`) y el contenedor `#game-container`, permitiendo que el lienzo aproveche el 100% del espacio disponible sin deformación ni barras de scroll.
- **Preservación de Renderizado Pixel-Art**: Al cambiar el tamaño del buffer canvas, restaura automáticamente `ctx.imageSmoothingEnabled = false` para mantener la estética nítida y retro del juego.

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
