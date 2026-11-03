# Plan de Mejora Integral: Escalamiento en Tablets, Desbloqueo Infalible de Salida, Reseteo Elemental al Morir, Rebalanceo de Velocidad y Persistencia Cloud SQL (v6.54.0)

## Resumen Ejecutivo
Este plan consolida las mejoras críticas de jugabilidad, visuales y de balance solicitadas:
1. **Reseteo Estricto de Habilidades Elementales al Morir (Bugfix de Veneno/Elementos):** Garantiza que al morir o reiniciar la partida, el elemento de la bomba vuelva inmediatamente a `NORMAL` (`player.bombElementV612 = 'normal'`), impidiendo que el veneno u otros efectos sobrevivan entre partidas.
2. **Maximizador de Canvas para Tablets y Pantallas Táctiles:** Elimina la sensación de juego diminuto escalando el canvas al 94-96% del área visible sin letterboxing restrictivo.
3. **Sistema Infalible de Salida (Anti-Bloqueo de Nivel):** Revela y abre automáticamente la salida al eliminar al último enemigo (destruyendo el bloque que la oculte) o genera un portal de rescate en la zona central si el colapso u otro factor obstruye la salida original.
4. **Rebalanceo de Velocidad Enemiga:** Reducción sustancial (~30-35%) de las velocidades base de todos los enemigos (Rastrero, Volador, Especial) para una experiencia más táctica.
5. **Tiempo de Exploración Expandido:** Mayor ventana de tiempo antes del inicio de colapso de mapa (105s salas normales / 135s salas de jefe).
6. **Persistencia de Partidas en Cloud SQL:** Registro de rachas, récords y analíticas en la base de datos PostgreSQL provisionada en `citric-partition-qsmzh`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmaciones y decisiones integradas:

- **Corrección de Persistencia Elemental:** Al morir, `player.bombElementV612` se restablece a `'normal'`, limpiando `effectIds` y actualizando el HUD (`UI: NORMAL`). No se hereda veneno, hielo ni fuego a la nueva partida.
- **Apertura de Salida:**
  - *Al morir todos los enemigos:* Si el bloque de salida sigue intacto, se volatiliza con partículas doradas y la puerta queda abierta (`EXIT_OPEN`).
  - *Failsafe Central:* Si la salida original estuviera bloqueada por pilares de colapso, se abre un portal de rescate en la zona 5×5 central inmune.
- **Tamaño en Tablets:** El contenedor CSS y el hook dinámico aprovechan hasta `min(96vw, 92dvh)` en lugar de los límites reducidos anteriores (`62dvh`).
- **Velocidades Enemigas Reducidas:** Rastrero baja a 0.80, Volador a 0.65 y Especial a 1.10.
- **Enfoque Técnico:** Sin paneles de depuración invasivos en pantalla; corrección directa en el motor.

---

## 1. Overview & Core Concept

- **Qué Resuelve:** Evita que el jugador conserve elementos de partidas anteriores tras morir (como bombas de veneno), asegura que nunca quede atrapado en un piso tras vencer a los enemigos, amplía la visibilidad en tablets y modera la velocidad enemiga.
- **Público Objetivo:** Jugadores en tablets, móviles y PC que buscan una experiencia roguelike justa, con controles cómodos y progresión limpia desde cada inicio.
- **Valor Principal:** Integridad de reinicio por partida (run limpia), legibilidad visual superior y fluidez garantizada al avanzar entre salas.

---

## 2. Experiencia de Usuario & Diseño Visual

### Ciclo de Muerte y Nueva Partida Limpia
```
┌────────────────────────────────────────────────────────┐
│  Partida Activa: Bomba Elemental (ej. Veneno / Fuego)  │
└──────────────────────────┬─────────────────────────────┘
                           │ Muerte del Jugador (Game Over)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Limpieza Total del Estado del Jugador                 │
│  - player.bombElementV612 = 'normal'                   │
│  - HUD "ELEMENTO ACTIVO" -> NORMAL                     │
│  - Reliquias y modificadores restablecidos             │
└──────────────────────────┬─────────────────────────────┘
                           │ "NUEVA PARTIDA"
                           ▼
┌────────────────────────────────────────────────────────┐
│  Profundidad 01: Bomba Clásica Normal                  │
└────────────────────────────────────────────────────────┘
```

### Visual de Salida y Canvas en Tablets
- **Canvas Ampliado:** El canvas abarca prácticamente todo el alto y ancho disponible en tablets, con baldosas grandes de 48px escaladas limpiamente con `image-rendering: pixelated`.
- **Efecto de Salida Revelada:** Cuando el último enemigo muere, un haz luminoso y partículas (`particleLoot` + `particleShield`) indican la posición de la salida abierta. Si el bloque de cobertura no había sido detonado, explota automáticamente en destellos dorados sin dañar al jugador.

---

## 3. Decisiones Clave de Producto & Trade-Offs

| Aspecto | Decisión Adoptada | Justificación | Alternativa Descartada |
| :--- | :--- | :--- | :--- |
| **Persistencia de Elementos** | Restablecer estrictamente a `'normal'` en `resetPlayerRuntimeState()`, `finishRun()` y `beginNewRun()`. | Las bombas elementales son power-ups de la partida actual; conservarlas tras morir rompe la naturaleza roguelike. | Permitir que el jugador empiece con elementos de la partida anterior como herencia. |
| **Apertura de Salida** | Auto-revelado forzado al limpiar enemigos + portal de emergencia si es tapada. | Ningún jugador debe quedar atrapado tras ganar la sala o al acabarse las bombas. | Dejar la puerta oculta bajo un bloque desconocido obligando a detonar todo a ciegas. |
| **Velocidad de Enemigos** | Reducción del ~30-35% en las velocidades base de Rastrero, Volador y Especial. | Hace posible reaccionar, esquivar con dash y colocar bombas estratégicamente en tablets. | Mantener velocidades rápidas que resultaban abrumadoras en controles táctiles. |
| **Viewport en Tablets** | Regla flexible `min(96vw, 92dvh)` en contenedor y canvas. | Maximiza la superficie de juego y legibilidad del mapa sin bordes negros innecesarios. | Conservar el límite fijo de 600px / 62dvh. |

---

## 4. Arquitectura Técnica y Estrategia de Datos

### Diagrama del Sistema

```
 ┌─────────────────────────────────────────────────────────┐
 │                   Motor de Juego (Vite)                 │
 │                                                         │
 │  ┌───────────────────────┐   ┌────────────────────────┐ │
 │  │ resetPlayerRuntime    ├──►│ player.bombElement     │ │
 │  │ State()               │   │ = 'normal'             │ │
 │  └───────────────────────┘   └────────────────────────┘ │
 │                                                         │
 │  ┌───────────────────────┐   ┌────────────────────────┐ │
 │  │ tryUnlockExitCurrent  ├──►│ Último enemigo muerto: │ │
 │  │ Room()                │   │ grid[exit] = EXIT_OPEN │ │
 │  └───────────────────────┘   └────────────────────────┘ │
 │                                                         │
 │  ┌───────────────────────┐   ┌────────────────────────┐ │
 │  │ ENEMY_TYPES           ├──►│ Rastrero: 0.80         │ │
 │  │                       │   │ Volador:  0.65         │ │
 │  │                       │   │ Especial: 1.10         │ │
 │  └───────────────────────┘   └────────────────────────┘ │
 └────────────────────────────┬────────────────────────────┘
                              │ POST /api/runs (al terminar run)
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Backend Cloud SQL / Express               │
 │                                                         │
 │   ┌─────────────────┐         ┌──────────────────────┐  │
 │   │ Express Route   │────────►│ Cloud SQL PostgreSQL │  │
 │   │ /api/runs       │         │ Tabla: game_runs     │  │
 │   └─────────────────┘         └──────────────────────┘  │
 └─────────────────────────────────────────────────────────┘
```

### Fases de Implementación

1. **Fase 1: Corrección de Persistencia Elemental de Bombas**
   - En `resetPlayerRuntimeState()` y `beginNewRun()`, fijar `player.bombElementV612 = 'normal'`.
   - Limpiar `player.effectIds = []` y actualizar el HUD textual (`document.getElementById('ui-bomb-element').textContent = 'NORMAL'`).
   - En `setPlayerBombElementV612('normal')`, asegurar que la sincronización al reiniciar sea total.

2. **Fase 2: Desbloqueo y Revelado Infalible de la Salida**
   - En `tryUnlockExitCurrentRoom()`:
     - Si no quedan enemigos vivos (`gameState.enemies.length === 0`), destruir el bloque que cubra la salida y transformar la baldosa en `TYPES.EXIT_OPEN`.
     - Si la posición original de salida estuviera sobreescrita por pilares de colapso, reubicar la salida a la casilla despejada más cercana dentro del santuario 5×5 central.
     - Añadir aviso flotante `"🚪 SALIDA DESBLOQUEADA"`.

3. **Fase 3: Maximización de Canvas en Tablets y Pantallas Táctiles**
   - En `src/hooks/useDynamicCanvasSize.ts`, ajustar el cálculo para usar hasta `min(availW - 12, availH - 12)` sin restricción forzada de `vh - 60`.
   - En `src/css/11-viewport-layout.css` y `src/css/09-game-information.css`, eliminar el tope `62dvh` y `calc(100dvh - 120px)`, permitiendo que `#game-container` alcance `min(96vw, 92dvh)`.

4. **Fase 4: Rebalanceo de Velocidades y Tiempo de Colapso**
   - En `src/engine/gameEngine.js`:
     - `ENEMY_TYPES.RASTRERO.speed`: `0.80`
     - `ENEMY_TYPES.VOLADOR.speed`: `0.65`
     - `ENEMY_TYPES.ESPECIAL.speed`: `1.10`
     - `initialDelayMs`: `105000` (normal) y `135000` (boss).

5. **Fase 5: Persistencia en Cloud SQL y Actualización de Versión**
   - Conectar endpoint `/api/runs` con Cloud SQL para almacenar estadísticas de la partida.
   - Incrementar versión a **v6.54.0** en `package.json`, `index.html` y `App.tsx`.
