import React, { useEffect } from 'react';
import './css/main.css';
import { initGameEngine } from './engine/gameEngine';

export const App: React.FC = () => {
  useEffect(() => {
    document.body.className = 'game-body v4-theme';
    initGameEngine();
  }, []);

  return (
    <div id="app-wrapper">
      <main id="main-menu" className="main-menu" aria-label="Menú principal">
        <aside className="menu-rail menu-rail-left" aria-label="Resumen de la aventura">
          <div className="menu-rail-top">
            <span className="menu-kicker">BOMBERMAN ROGUELIKE</span>
            <span className="menu-version">v6.34.0</span>
          </div>
          <div className="menu-rail-content">
            <div className="menu-mark">💣</div>
            <h2 className="menu-rail-title pixel-font">ROGUELIKE</h2>
            <p className="menu-rail-subtitle">ROGUELIKE POR PARTIDAS</p>
            <p className="menu-rail-copy">Entrá, rompé el mapa, aprovechá cada apertura y sobreviví a la presión de la sala.</p>
            <div className="menu-feature-list">
              <div className="menu-feature">
                <span>01</span>
                <strong>MAPA PROCEDURAL</strong>
                <small>Cada partida reorganiza el desafío.</small>
              </div>
              <div className="menu-feature">
                <span>02</span>
                <strong>LOOT Y RELIQUIAS</strong>
                <small>Construí una configuración distinta.</small>
              </div>
              <div className="menu-feature">
                <span>03</span>
                <strong>JEFES Y TRAMPAS</strong>
                <small>Las decisiones importan en cada sala.</small>
              </div>
            </div>
          </div>
        </aside>

        <div id="game-layout" className="game-layout info-panel-collapsed" aria-label="Partida e información">
          <div id="game-stage" className="game-stage" aria-label="Área de juego">
            <section id="game-container" aria-label="Área de juego">
              <canvas id="gameCanvas" width={600} height={600}></canvas>
              <div id="immersion-vignette"></div>
              <div id="god-mode-indicator" className="god-mode-indicator hidden" aria-hidden="true">
                GOD MODE · INVULNERABLE
              </div>
              <div
                id="ui-floating-toasts"
                className="ui-floating-toasts"
                aria-live="polite"
                aria-relevant="additions"
                aria-atomic="false"
              ></div>

              {/* Death / Run Summary */}
              <div id="game-over-screen" className="screen hidden death-screen">
                <div className="death-kicker pixel-font">PARTIDA TERMINADA</div>
                <div className="death-icon">💀</div>
                <h1 className="death-title pixel-font">GAME OVER</h1>
                <div id="go-record" className="death-record">PARTIDA FINALIZADA</div>
                <div className="death-cause">
                  CAUSA · <strong id="go-cause">Daño recibido</strong>
                </div>
                <div className="death-summary-grid">
                  <div className="death-stat"><span>PARTIDA</span><strong id="go-run">PARTIDA 01</strong></div>
                  <div className="death-stat"><span>PROFUNDIDAD</span><strong id="go-level">1</strong></div>
                  <div className="death-stat"><span>TIEMPO</span><strong id="go-time">00:00</strong></div>
                  <div className="death-stat"><span>ENEMIGOS</span><strong id="go-kills">0</strong></div>
                  <div className="death-stat"><span>MONEDAS</span><strong id="go-coins">0</strong></div>
                  <div className="death-stat"><span>PUNTAJE</span><strong id="go-score">0</strong></div>
                </div>
                <div className="death-records">
                  <div><span>MEJOR PROFUNDIDAD</span><strong id="go-best">0</strong></div>
                  <div><span>MEJOR PUNTAJE</span><strong id="go-best-score">0</strong></div>
                </div>
                <div className="death-relics-wrap">
                  <div className="death-section-label">RELIQUIAS CONSEGUIDAS <span id="go-relics">0</span></div>
                  <div id="go-relic-list" className="death-relic-list"></div>
                </div>
                <div className="death-journey-wrap">
                  <div className="death-section-label">BIOMAS RECORRIDOS</div>
                  <div id="go-biome-list" className="death-biome-list"></div>
                  <div className="death-section-label">VERBOS DESCUBIERTOS</div>
                  <div id="go-verb-list" className="death-verb-list"></div>
                </div>
                <button id="btn-restart" className="btn-pixel death-restart">NUEVA PARTIDA</button>
              </div>

              {/* Reward screen */}
              <div id="level-complete-screen" className="screen hidden">
                <div className="reward-kicker">RECOMPENSA DE PARTIDA</div>
                <h1 id="reward-title" className="text-lg mb-1 text-yellow-300 pixel-font">PROFUNDIDAD 01 SUPERADA</h1>
                <p id="reward-meta" className="text-xs text-slate-300 mb-4">+10 monedas · elegí 1 mejora para la próxima sala</p>
                <div id="relic-strip" className="relic-strip"></div>
                <div id="upgrade-options" className="reward-grid"></div>
                <div id="reward-footer" className="reward-footer"></div>
              </div>

              {/* Pause */}
              <div id="pause-screen" className="screen hidden">
                <div className="reward-kicker">PARTIDA PAUSADA</div>
                <h1 className="text-xl mb-3 text-cyan-300 pixel-font">PAUSA</h1>
                <button id="btn-resume" className="btn-pixel">CONTINUAR</button>
              </div>
            </section>
          </div>

          <button
            id="btn-toggle-game-info"
            className="game-info-toggle"
            type="button"
            aria-controls="game-info-panel"
            aria-expanded="false"
            aria-label="Mostrar información de la partida"
          >
            INFO +
          </button>
          <aside id="game-info-panel" className="game-info-panel" aria-label="Información de la partida" aria-hidden="true">
            <div className="game-info-header">
              <div className="game-info-kicker">ESTADO DE LA PARTIDA</div>
              <div id="run-banner">PARTIDA 01 · DEPTH 01</div>
              <div id="room-banner">◆ NORMAL · Sin modificadores</div>
              <div id="biome-rule-banner" className="biome-rule-banner" aria-live="polite"></div>
            </div>

            <section className="biome-switch-card" aria-label="Cambiar bioma durante la partida">
              <div className="biome-switch-head">
                <div>
                  <span className="biome-switch-kicker">ENTORNO</span>
                  <strong>BIOMA ACTUAL</strong>
                </div>
                <span id="biome-switch-status">AUTOMÁTICO</span>
              </div>
              <select id="biome-switch-select" className="biome-switch-select" aria-label="Seleccionar bioma" defaultValue="winter">
                <option value="winter">INVIERNO</option>
                <option value="autumn">OTOÑO</option>
                <option value="spring">PRIMAVERA</option>
                <option value="summer">VERANO</option>
                <option value="underground">BAJO TIERRA</option>
                <option value="clouds">NUBES</option>
                <option value="mountains">MONTAÑAS</option>
                <option value="beach">PLAYA</option>
                <option value="space">ESPACIO</option>
                <option value="sky">CIELO</option>
                <option value="inferno">INFIERNO</option>
              </select>
              <p className="biome-switch-note">Podés cambiar de bioma en cualquier momento de la partida.</p>
            </section>

            <section className="dev-tools-card" aria-label="Herramientas de desarrollo">
              <div className="dev-tools-head">
                <div>
                  <span className="dev-tools-kicker">DESARROLLO</span>
                  <strong>GOD MODE</strong>
                </div>
                <span id="god-mode-status" className="dev-tools-status">OFF</span>
              </div>
              <button id="btn-god-mode" className="btn-pixel dev-tools-button" type="button" aria-pressed="false">
                ACTIVAR GOD MODE
              </button>
              <p className="dev-tools-note">Invulnerabilidad total: no consume vida, escudo ni reliquias.</p>
            </section>

            <div id="ui-layer" aria-label="Interfaz de juego">
              <div className="flex flex-col gap-1.5">
                <div className="info-section-title">JUGADOR</div>
                <div className="flex gap-1.5 flex-wrap">
                  <div className="stat-badge text-red-400">❤️ <span id="ui-health">3</span></div>
                  <div className="stat-badge text-cyan-300 hidden" id="ui-shield-badge">🛡️ <span id="ui-shield">SI</span></div>
                  <div id="ui-score-badge" className="stat-badge text-yellow-300">⭐ <span id="ui-score">0</span></div>
                  <div id="ui-coins-badge" className="stat-badge text-amber-300">¢ <span id="ui-coins">0</span></div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <div className="stat-badge text-purple-300">🚩 PROFUNDIDAD <span id="ui-level">1</span></div>
                  <div className="stat-badge text-red-300">⏱ <span id="ui-timer">80s</span></div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 info-column-right">
                <div className="info-section-title">CAPACIDADES</div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <div className="stat-badge bomb-stat text-amber-400" id="bomb-stat">
                    💣 <span id="ui-bombs">1/1</span>
                    <span className="bomb-capacity" aria-hidden="true"><span id="ui-bombs-fill"></span></span>
                  </div>
                  <div className="stat-badge text-orange-400">🔥 <span id="ui-range">1</span></div>
                  <div className="stat-badge text-emerald-400">👟 <span id="ui-speed">3</span></div>
                  <div id="ui-relics-badge" className="stat-badge text-purple-300">✦ <span id="ui-relics">0</span></div>
                </div>
                <div className="info-element-card">
                  <span className="info-element-label">ELEMENTO ACTIVO</span>
                  <strong id="ui-bomb-element">NORMAL</strong>
                </div>
              </div>
            </div>

            <div id="ui-powerup-toast" className="powerup-toast hidden" aria-live="polite" aria-atomic="true">
              <span id="ui-powerup-toast-icon" className="powerup-toast-icon" aria-hidden="true">◆</span>
              <span className="powerup-toast-copy">
                <strong id="ui-powerup-toast-name">POWER-UP</strong>
                <small id="ui-powerup-toast-desc">—</small>
              </span>
            </div>

            <section className="info-card" aria-label="Reliquias activas">
              <div className="info-card-title">RELIQUIAS ACTIVAS <span id="ui-relic-count-label">0</span></div>
              <div id="ui-relic-list" className="info-relic-list">
                <div className="info-empty">Sin reliquias activas</div>
              </div>
            </section>
          </aside>
        </div>

        <aside id="start-screen" className="menu-panel" aria-label="Iniciar partida">
          <div className="menu-panel-glow"></div>
          <div className="menu-panel-head">
            <span className="menu-kicker">NUEVA PARTIDA</span>
            <span className="menu-status-dot"><span></span> READY</span>
          </div>
          <div className="menu-hero-icon">💣💥</div>
          <h1 className="menu-title pixel-font">BOMBERMAN</h1>
          <h2 className="menu-subtitle pixel-font">ROGUELIKE // PARTIDAS</h2>
          <div className="menu-rules">
            <div><b>PARTIDAS</b><span>Cada partida genera una progresión distinta.</span></div>
            <div><b>LOOT</b><span>Monedas, powerups y reliquias para construir tu partida.</span></div>
            <div><b>RIESGO</b><span>Trampas, presión, refuerzos y jefes te obligan a moverte.</span></div>
          </div>
          <section className="quality-selector" aria-label="Calidad gráfica">
            <div className="quality-selector-head">
              <div>
                <span className="quality-selector-kicker">CONFIGURACIÓN</span>
                <strong>DETALLES GRÁFICOS</strong>
              </div>
              <span id="quality-selected-summary" className="quality-selected-summary">
                DETALLES MEDIOS · Gama media
              </span>
            </div>
            <div className="quality-options" role="radiogroup" aria-label="Nivel de detalles">
              <button className="quality-option" type="button" data-quality-option="low" role="radio" aria-checked="false">
                <strong>BAJO</strong><span>Gama baja</span>
              </button>
              <button className="quality-option" type="button" data-quality-option="medium" role="radio" aria-checked="false">
                <strong>MEDIO</strong><span>Gama media</span>
              </button>
              <button className="quality-option" type="button" data-quality-option="high" role="radio" aria-checked="false">
                <strong>MÁXIMO</strong><span>Gama alta</span>
              </button>
            </div>
            <p className="quality-selector-note">Elegí el nivel antes de comenzar la partida.</p>
          </section>
          <div className="menu-actions">
            <button id="btn-resume-run" className="btn-pixel menu-resume-button hidden" type="button">
              CONTINUAR PARTIDA
            </button>
            <button id="btn-start" className="btn-pixel menu-start-button" type="button">
              INICIAR PARTIDA
            </button>
            <div className="menu-hint">
              <span>TECLADO</span><strong>WASD / ↑↓←→</strong><span>· BOMBA</span><strong>ESPACIO</strong>
            </div>
          </div>
          <div className="menu-footer">
            <span>PROCEDURAL COMBAT</span>
            <span>•</span>
            <span>ADAPTIVE MOTION</span>
            <span>•</span>
            <span>MÁS PROFUNDA CADA PARTIDA</span>
          </div>
        </aside>
      </main>

      <div id="mobile-controls" aria-label="Controles táctiles invisibles">
        <div id="mobile-gesture-zone" aria-label="Movimiento: deslizar en cualquier dirección en la mitad izquierda"></div>
        <div id="mobile-action-zone" aria-label="Acciones: toque corto para colocar una bomba; mantener pulsado para agarrar o lanzar"></div>
      </div>
    </div>
  );
};

export default App;
