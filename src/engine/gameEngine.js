// @ts-nocheck
// Bomberman Roguelike Game Engine - Ported for React Vite
export function initGameEngine() {
  if (typeof window === "undefined") return;
  if (window.__bomberEngineInitialized) {
    if (typeof window.cancelScheduledGameLoopV632 === "function") {
      window.cancelScheduledGameLoopV632();
    }
    if (typeof window.draw === "function") {
      window.draw();
    }
    return;
  }
  window.__bomberEngineInitialized = true;

  try {
// === js/01-core.js ===
// Bomberman Roguelike v4.6 — Core, configuration, state, audio, performance and adaptive interface
// V2.0 IMMERSIVE SYSTEMS
let audioCtx = null;

const ambient = { dustTimer: 0, lastFoot: 0, introTimer: 0 };
function initAudio(){
    if (window.BOMBER_AUDIO) {
        audioCtx = window.BOMBER_AUDIO.getAudioContext() || audioCtx;
    }
    if(audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { audioCtx = null; }
}
function sfx(type){
    if(!audioCtx) {
        if (window.BOMBER_AUDIO) audioCtx = window.BOMBER_AUDIO.getAudioContext();
        if(!audioCtx) return;
    }
    const sfxVol = window.BOMBER_AUDIO ? (window.BOMBER_AUDIO.getSfxVolume() / 100) : 0.8;
    if (sfxVol <= 0.001) return;

    const now=audioCtx.currentTime, o=audioCtx.createOscillator(), g=audioCtx.createGain();
    const presets={bomb:[70,.08,'square'],boom:[55,.28,'sawtooth'],pickup:[520,.10,'sine'],hurt:[110,.18,'square'],exit:[330,.35,'triangle'],click:[220,.05,'square'],trap:[90,.22,'sawtooth'],alarm:[180,.16,'square'],boss:[62,.5,'sawtooth'],bossHit:[240,.10,'square'],bossRoar:[48,.65,'sawtooth'],bossCharge:[120,.22,'square'],bossWave:[75,.38,'triangle'],damageHit:[135,.12,'square'],enemyKill:[420,.08,'square'],death:[65,.58,'sawtooth'],bombReady:[150,.07,'square']};
    const audioKey = typeof themeAudioV46 === 'function' ? themeAudioV46(type, type) : type;
    const [freq,dur,wave]=presets[audioKey]||presets.click;
    o.type=wave; o.frequency.setValueAtTime(freq,now); o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.55),now+dur);
    const peakGain = 0.06 * sfxVol;
    g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(peakGain,now+.008); g.gain.exponentialRampToValueAtTime(.0001,now+dur);
    o.connect(g);
    const sfxNode = window.BOMBER_AUDIO?.getSfxGainNode();
    if (sfxNode) {
        g.connect(sfxNode);
    } else {
        g.connect(audioCtx.destination);
    }
    o.start(now); o.stop(now+dur+.02);
}
function renderImmersion(){
    const vignette=UI['immersion-vignette'];
    if(!vignette) return;
    const low=player.health<=1, pulse=low ? (0.28+Math.sin(gameState.animFrame*.08)*.12) : .08;
    vignette.style.background=`radial-gradient(circle at 50% 48%, transparent 25%, rgba(2,6,23,${pulse}) 62%, rgba(2,6,23,${low?.62:.38}) 100%)`;
}

function updatePerfSceneV329(){
    const frame=Number(gameState.animFrame||0);
    if(perf.heavySceneFrame===frame) return perf.heavyScene;
    perf.heavySceneFrame=frame;
    perf.heavyScene =
        gameState.enemies.length >= 12 ||
        gameState.particles.length >= 80 ||
        gameState.bombs.length >= 5 ||
        gameState.explosions.length >= 8;
    return perf.heavyScene;
}

function drawAmbientDust(){
    const heavy=updatePerfSceneV329();
    const configured = typeof getDeviceQualityV45 === 'function' ? getDeviceQualityV45().ambientDust : null;
    const theme = typeof getThemeV46 === 'function' ? getThemeV46() : null;
    const ambience = theme?.ambiente || { tipo:'dust', color:'ambientDust', densidad:1, velocidad:.35, sizeMin:1, sizeMax:2, alpha:.45 };
    const density = Math.max(0, Number(ambience.densidad) || 1);
    const baseCount = configured !== null ? Math.min(configured, heavy ? Math.max(6, configured) : configured) : (perf.lowQuality ? 8 : (heavy ? 12 : 24));
    const count = Math.round(baseCount * density);
    if (count <= 0) return;

    ctx.save();
    ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46(ambience.color, 'rgba(226,232,240,.06)') : 'rgba(226,232,240,.06)';

    for(let i=0;i<count;i++){
        const seed=(i*97)%1000;
        const speed=Math.max(.05, Number(ambience.velocidad)||.35);
        const sizeMin=Math.max(.5, Number(ambience.sizeMin)||1);
        const sizeMax=Math.max(sizeMin, Number(ambience.sizeMax)||sizeMin);
        const size=sizeMin + ((i*37)%100)/100*(sizeMax-sizeMin);
        const alpha=Math.min(1, Math.max(.05, Number(ambience.alpha)||.45) * (.72 + (i%4)*.08));
        const travel=gameState.animFrame*speed*(i%3+1);
        const rangeW=canvas.width+80, rangeH=canvas.height+80;
        let x,y;

        if (ambience.tipo === 'snow') {
            x=((seed*3.71 + Math.sin((gameState.animFrame+i)*.025)*12 + travel*.18)%rangeW)-40;
            y=((seed*1.83 + travel)%rangeH)-40;
            ctx.globalAlpha=alpha;
            ctx.beginPath();
            ctx.arc(x,y,Math.max(.7,size*.55),0,Math.PI*2);
            ctx.fill();
        } else if (ambience.tipo === 'ember') {
            x=((seed*3.71 + Math.sin((gameState.animFrame+i)*.045)*9 + travel*.12)%rangeW)-40;
            y=canvas.height+40-((seed*1.83 + travel)%rangeH);
            ctx.globalAlpha=alpha;
            ctx.fillRect(x,y,size,Math.max(1,size*1.5));
        } else {
            x=((seed*3.71+gameState.animFrame*.09*(i%3+1))%rangeW)-40;
            y=((seed*1.83+gameState.animFrame*.035*(i%2+1))%rangeH)-40;
            ctx.globalAlpha=alpha;
            ctx.fillRect(x,y,size,size);
        }
    }
    ctx.restore();
}
function drawLighting(){
    // La iluminación es visual, no gameplay: en calidad reducida o escenas
    // realmente cargadas se actualiza cada 2 frames para contener el coste de
    // los gradientes sin tocar la simulación.
    updatePerfSceneV329();
    if (typeof deviceQualityV45ShouldLighting === 'function' && !deviceQualityV45ShouldLighting()) return;
    if(!perfRenderEveryV329(2)) return;
    ctx.save();
    const pcx=player.x+player.width/2-gameState.camera.x;
    const pcy=player.y+player.height/2-gameState.camera.y;
    const grad=ctx.createRadialGradient(pcx,pcy,35,pcx,pcy,240);
    grad.addColorStop(0, typeof themeColorV46 === 'function' ? themeColorV46('lightingTransparent', 'rgba(0,0,0,0)') : 'rgba(0,0,0,0)'); grad.addColorStop(.65, typeof themeColorV46 === 'function' ? themeColorV46('lightingMid', 'rgba(0,0,0,.12)') : 'rgba(0,0,0,.12)'); grad.addColorStop(1, typeof themeColorV46 === 'function' ? themeColorV46('lightingDark', 'rgba(0,0,0,.52)') : 'rgba(0,0,0,.52)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (typeof deviceQualityV45ShouldBombGlow === 'function' ? deviceQualityV45ShouldBombGlow() : (!perf.lowQuality || gameState.animFrame % 2 === 0)) {
        for(let i=0;i<gameState.bombs.length;i++){
            const b=gameState.bombs[i];
            if(!b) continue;
            const x=(b.x+.5)*TILE_SIZE-gameState.camera.x, y=(b.y+.5)*TILE_SIZE-gameState.camera.y;
            const radius=75+Math.sin(gameState.animFrame*.3)*8;
            const g=ctx.createRadialGradient(x,y,4,x,y,radius); g.addColorStop(0, typeof themeColorV46 === 'function' ? themeColorV46('bombGlow', 'rgba(255,170,50,.20)') : 'rgba(255,170,50,.20)'); g.addColorStop(1, typeof themeColorV46 === 'function' ? themeColorV46('bombGlowOuter', 'rgba(255,80,20,0)') : 'rgba(255,80,20,0)');
            ctx.fillStyle=g; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
        }
    }
    ctx.restore();
}

const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d', { alpha: false });

// V3.2.1 PERFORMANCE LAYER
const perf = {
    lowQuality: false,
    slowFrames: 0,
    fastFrames: 0,
    frameCount: 0,
    lastUi: 0,
    lastQualityChangeFrame: 0,
    qualityFloor: 0,
    lightingFrame: -1,
    heavyScene: false,
    heavySceneFrame: -1,
    adaptiveRoot: null
};
// V3.2.2 LARGE SUPPORT LAYER
// Optimiza entidades grandes y evita que los efectos escalen sin control.
const largeSupport = {
    maxEnemies: 22,
    particleBudget: 150,
    maxFloaters: 48,
    renderParticleBudget: 96,
    shadowEffects: true,
    lastBossDraw: 0
};

function clampLargeEntities(){
    if(gameState.enemies.length > largeSupport.maxEnemies){
        gameState.enemies.length = largeSupport.maxEnemies;
    }
    if(gameState.particles.length > largeSupport.particleBudget){
        gameState.particles.splice(0, gameState.particles.length - largeSupport.particleBudget);
    }
    if(gameState.floaters.length > largeSupport.maxFloaters){
        gameState.floaters.splice(0, gameState.floaters.length - largeSupport.maxFloaters);
    }
}

function perfRenderEveryV329(interval = 1){
    if(interval <= 1) return true;
    if(!perf.lowQuality && !updatePerfSceneV329()) return true;
    return (gameState.animFrame % interval) === 0;
}

function drawLargeBossShadow(b){
    if(!largeSupport.shadowEffects || perf.lowQuality) return;
    ctx.save();
    ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossShadow', 'rgba(0,0,0,.42)') : 'rgba(0,0,0,.42)';
    ctx.beginPath();
    ctx.ellipse(b.x,b.y+b.height*.44,b.width*.46,Math.max(7,b.height*.10),0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
}

// V4.2 ADAPTIVE INFORMATION LAYOUT
// La UI se reubica por perfil de viewport + posición del jugador.
// El cálculo completo solo ocurre cuando cambia el viewport, la posición relevante
// del jugador o el estado del boss; no se recalcula toda la geometría por frame.
const adaptiveUI = {
    lastLayout: '',
    lastPlayerState: false,
    lastBossState: false,
    viewportKey: '',
    resizeDirty: true,
    profile: 'wide'
};

function getAdaptiveViewportProfile() {
    const root = document.getElementById('game-container');
    if (!root) return { key: 'none', profile: 'wide', landscape: false };
    const rect = root.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const landscape = width > height * 1.12;
    let profile = 'wide';
    if (width <= 340) profile = 'tiny';
    else if (width <= 460) profile = 'small';
    else if (width <= 700) profile = 'mobile';
    else if (width <= 920) profile = 'tablet';
    const key = `${width}x${height}|${profile}|${landscape ? 'landscape' : 'portrait'}`;
    return { key, profile, landscape };
}

function applyAdaptiveViewport(root) {
    const view = getAdaptiveViewportProfile();
    if (!adaptiveUI.resizeDirty && adaptiveUI.viewportKey === view.key) return false;
    adaptiveUI.resizeDirty = false;
    adaptiveUI.viewportKey = view.key;
    adaptiveUI.profile = view.profile;
    root.classList.remove('ui-size-tiny','ui-size-small','ui-size-mobile','ui-size-tablet','ui-size-wide',
        'ui-orientation-landscape','ui-orientation-portrait');
    root.classList.add(`ui-size-${view.profile}`);
    root.classList.add(view.landscape ? 'ui-orientation-landscape' : 'ui-orientation-portrait');
    root.dataset.uiProfile = view.profile;
    return true;
}

function markAdaptiveViewportDirty() {
    adaptiveUI.resizeDirty = true;
}

function updateAdaptiveInterface() {
    const root = document.getElementById('game-container');
    if (!root || !player || !gameState.isPlaying) return;

    applyAdaptiveViewport(root);

    const cx = player.x + player.width / 2 - gameState.camera.x;
    const cy = player.y + player.height / 2 - gameState.camera.y;
    const w = canvas.width;
    const h = canvas.height;
    const nx = cx / Math.max(1, w);
    const ny = cy / Math.max(1, h);

    // Elegimos la esquina opuesta al jugador para el HUD lateral.
    let layout;
    if (nx < .34 && ny < .40) layout = 'tl';
    else if (nx > .66 && ny < .40) layout = 'tr';
    else if (nx < .34 && ny > .60) layout = 'bl';
    else if (nx > .66 && ny > .60) layout = 'br';
    else if (ny <= .50) layout = 'tc';
    else layout = 'bc';

    const moving = !!player.isMoving;
    const bossActive = !!(gameState.boss && !gameState.boss.defeated);

    if (layout !== adaptiveUI.lastLayout) {
        root.classList.remove('ui-safe-left','ui-safe-right','ui-safe-center','ui-safe-top','ui-safe-bottom',
            'ui-player-tl','ui-player-tr','ui-player-bl','ui-player-br','ui-player-tc','ui-player-bc');
        root.classList.add(`ui-player-${layout}`);
        adaptiveUI.lastLayout = layout;
    }

    if (moving !== adaptiveUI.lastPlayerState) {
        root.classList.toggle('player-moving', moving);
        adaptiveUI.lastPlayerState = moving;
    }

    if (bossActive !== adaptiveUI.lastBossState) {
        root.classList.toggle('ui-boss-active', bossActive);
        adaptiveUI.lastBossState = bossActive;
    }
}

if (typeof ResizeObserver === 'function') {
    let rAFAdaptive = 0;
    const scheduleAdaptiveResize = () => {
        if (rAFAdaptive) cancelAnimationFrame(rAFAdaptive);
        rAFAdaptive = requestAnimationFrame(() => {
            markAdaptiveViewportDirty();
        });
    };
    window.addEventListener('resize', scheduleAdaptiveResize, { passive: true });
    window.addEventListener('orientationchange', scheduleAdaptiveResize, { passive: true });
    window.addEventListener('fullscreenchange', scheduleAdaptiveResize, { passive: true });
    const gameRoot = document.getElementById('game-container');
    if (gameRoot) {
        const observer = new ResizeObserver(scheduleAdaptiveResize);
        observer.observe(gameRoot);
    }
}

const UI = {};
[
    'ui-health','ui-score','ui-level','ui-bombs','ui-range','ui-speed','ui-coins','ui-relics',
    'ui-timer','ui-threat','ui-shield-badge','room-banner',
    'run-banner','relic-strip','immersion-vignette','ui-powerup-toast',
    'ui-powerup-toast-icon','ui-powerup-toast-name','ui-powerup-toast-desc','ui-bomb-element',
    'ui-relic-list','ui-relic-count-label'
].forEach(id => UI[id] = document.getElementById(id));

        // World and Zoom settings
        const TILE_SIZE = 48; // Zoomed-in tile size for retro feel
        const VIEWPORT_TILES = 11; // 11x11 visible grid tiles
        
        const TYPES = {
            EMPTY: 0,
            WALL: 1,
            BLOCK: 2,
            EXIT_LOCKED: 3,
            EXIT_OPEN: 4
        };

        const POWERUPS = {
            BOMB_UP: 'BOMB_UP',
            FIRE_UP: 'FIRE_UP',
            SPEED_UP: 'SPEED_UP',
            HEALTH_UP: 'HEALTH_UP',
            SHIELD_UP: 'SHIELD_UP',
            BOMB_KICK: 'BOMB_KICK',
            BOMB_FIRE: 'BOMB_FIRE',
            BOMB_ICE: 'BOMB_ICE',
            BOMB_ELECTRIC: 'BOMB_ELECTRIC',
            BOMB_TOXIC: 'BOMB_TOXIC',
            BOMB_GRAVITY: 'BOMB_GRAVITY',
            BOMB_FRAGMENT: 'BOMB_FRAGMENT',
            BOMB_PIERCE: 'BOMB_PIERCE',
            GRAB: 'GRAB',
            THROW: 'THROW'
        };

        const PLAYER_LIMITS_V67 = Object.freeze({
            base: Object.freeze({ maxHealth: 5, maxBombs: 1, bombRange: 1, speed: 3.0 }),
            hard: Object.freeze({ maxHealth: 10, maxBombs: 10, bombRange: 16, speed: 7.0 }),
        });

        // SPEED_UP es un incremento finito: al alcanzar el hard cap central, devuelve false.
        // No existe overflow ni cap paralelo. El no-op en 7.0 es intencional.
        function getPlayerCapacityCapsV67(){
            const cap = {
                ...PLAYER_LIMITS_V67.base,
                maxBombs: 8,
                bombRange: 12
            };
            cap.speed = Number(PLAYER_LIMITS_V67.hard.speed) || 7;
            const owned = new Set();
            for (const relic of (Array.isArray(gameState?.relics) ? gameState.relics : [])) {
                const id = String(relic?.id || ''); if (id) owned.add(id);
            }
            const canonicalRelics = Array.isArray(window.RELICS) ? window.RELICS : (typeof RELICS !== 'undefined' ? RELICS : []);
            for (const id of owned){
                const relic = canonicalRelics.find(r => r.id === id);
                const b = relic?.bonuses || {};
                cap.maxBombs += Number(b.bombs) || 0;
                cap.bombRange += Number(b.range) || 0;
                cap.maxHealth += Number(b.maxHealth) || 0;
            }

            const synergies = typeof window.rogueV327GetActiveSynergies === 'function' ? window.rogueV327GetActiveSynergies() : [];
            for (const synergy of synergies){
                if (synergy.id === 'double_burn' || synergy.id === 'volatile_chain') cap.bombRange += 1;
                if (synergy.id === 'chain_crew') cap.maxBombs += 1;
                if (synergy.id === 'fortress') cap.maxHealth += 1;
            }

            cap.maxHealth = Math.max(1, Math.min(PLAYER_LIMITS_V67.hard.maxHealth, Math.floor(cap.maxHealth)));
            cap.maxBombs = Math.max(1, Math.min(PLAYER_LIMITS_V67.hard.maxBombs, Math.floor(cap.maxBombs)));
            cap.bombRange = Math.max(1, Math.min(PLAYER_LIMITS_V67.hard.bombRange, Math.floor(cap.bombRange)));
            return Object.freeze(cap);
        }

        function clampPlayerCapacitiesV67(options = {}){
            if (typeof player === 'undefined' || !player) return getPlayerCapacityCapsV67();
            const cap = getPlayerCapacityCapsV67();
            const oldMaxHealth = Number(player.maxHealth);
            const currentMaxBombs = Number(player.maxBombs);
            const currentBombRange = Number(player.bombRange);
            const currentHealth = Number(player.health);
            const currentSpeed = Number(player.speed);
            player.maxHealth = cap.maxHealth;
            player.maxBombs = Math.min(Number.isFinite(currentMaxBombs) ? currentMaxBombs : PLAYER_LIMITS_V67.base.maxBombs, cap.maxBombs);
            player.bombRange = Math.min(Number.isFinite(currentBombRange) ? currentBombRange : PLAYER_LIMITS_V67.base.bombRange, cap.bombRange);
            player.health = Math.min(Number.isFinite(currentHealth) ? currentHealth : 1, cap.maxHealth);
            player.speed = Math.min(Number.isFinite(currentSpeed) ? currentSpeed : PLAYER_LIMITS_V67.base.speed, 7.0);
            if (options.healNewMax && Number.isFinite(oldMaxHealth) && cap.maxHealth > oldMaxHealth) player.health = Math.min(player.maxHealth, player.health + (cap.maxHealth - oldMaxHealth));
            return cap;
        }

        const POWERUP_DEFS_V67 = Object.freeze({
            [POWERUPS.BOMB_UP]: Object.freeze({
                id:POWERUPS.BOMB_UP, label:'BOMBA', icon:'💣', rarity:'COMMON', category:'MEJORA',
                desc:'Aumenta en 1 la cantidad máxima de bombas simultáneas.',
                apply:()=>{
                    const cap = getPlayerCapacityCapsV67();
                    if (player.maxBombs >= cap.maxBombs) return false;
                    player.maxBombs = Math.min(cap.maxBombs, player.maxBombs + 1);
                    return true;
                }
            }),
            [POWERUPS.FIRE_UP]: Object.freeze({
                id:POWERUPS.FIRE_UP, label:'RANGO', icon:'🔥', rarity:'COMMON', category:'MEJORA',
                desc:'Aumenta en 1 el alcance de las explosiones.',
                apply:()=>{
                    const cap = getPlayerCapacityCapsV67();
                    if (player.bombRange >= cap.bombRange) return false;
                    player.bombRange = Math.min(cap.bombRange, player.bombRange + 1);
                    return true;
                }
            }),
            [POWERUPS.SPEED_UP]: Object.freeze({ id:POWERUPS.SPEED_UP, label:'BOTAS', icon:'👟', rarity:'COMMON', category:'MEJORA', desc:'Aumenta la velocidad en 0,4.', apply:()=>{ const current=Number(player.speed); if(!Number.isFinite(current)) player.speed=PLAYER_LIMITS_V67.base.speed; if(player.speed>=7.0) return false; player.speed=Math.min(player.speed+0.4,7.0); return true; } }),
            [POWERUPS.HEALTH_UP]: Object.freeze({ id:POWERUPS.HEALTH_UP, label:'VIDA', icon:'❤️', rarity:'COMMON', category:'MEJORA', desc:'Recupera 1 punto de vida actual.', apply:()=>{ if(player.health>=player.maxHealth) return false; player.health=Math.min(player.health+1,player.maxHealth); return true; } }),
            [POWERUPS.SHIELD_UP]: Object.freeze({ id:POWERUPS.SHIELD_UP, label:'ESCUDO', icon:'🛡️', rarity:'UNCOMMON', category:'DEFENSA', desc:'Otorga un escudo que absorbe un impacto.', apply:()=>{ if(player.hasShield) return false; player.hasShield=true; return true; } }),
            [POWERUPS.BOMB_KICK]: Object.freeze({ id:POWERUPS.BOMB_KICK, label:'PATADA', icon:'🥾', rarity:'UNCOMMON', category:'INTERACCION', desc:'Activa permanentemente la capacidad de patear bombas.', apply:()=>{
                if (typeof activateCapabilityPowerupV681 === 'function') return !!activateCapabilityPowerupV681(player, 'KICK');
                return false;
            } }),
            [POWERUPS.BOMB_FIRE]: Object.freeze({ id:POWERUPS.BOMB_FIRE, label:'BOMBA FUEGO', icon:'🔥', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Hace que las próximas bombas sean de fuego.' }),
            [POWERUPS.BOMB_ICE]: Object.freeze({ id:POWERUPS.BOMB_ICE, label:'BOMBA HIELO', icon:'❄️', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Hace que las próximas bombas sean de hielo.' }),
            [POWERUPS.BOMB_ELECTRIC]: Object.freeze({ id:POWERUPS.BOMB_ELECTRIC, label:'BOMBA ELÉCTRICA', icon:'⚡', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Hace que las próximas bombas sean eléctricas.' }),
            [POWERUPS.BOMB_TOXIC]: Object.freeze({ id:POWERUPS.BOMB_TOXIC, label:'BOMBA TÓXICA', icon:'☣', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Deja una nube venenosa que daña a los enemigos que permanecen en ella.' }),
            [POWERUPS.BOMB_GRAVITY]: Object.freeze({ id:POWERUPS.BOMB_GRAVITY, label:'BOMBA GRAVITATORIA', icon:'🌀', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Crea un vórtice que atrae a los enemigos cercanos hacia el origen, incluso fuera de la línea de explosión.' }),
            [POWERUPS.BOMB_FRAGMENT]: Object.freeze({ id:POWERUPS.BOMB_FRAGMENT, label:'BOMBA DE FRAGMENTACIÓN', icon:'💥', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Extiende la explosión en cuatro brazos diagonales. Bloques y esquinas cerradas detienen los fragmentos.' }),
            [POWERUPS.BOMB_PIERCE]: Object.freeze({ id:POWERUPS.BOMB_PIERCE, label:'BOMBA PERFORANTE', icon:'➤', rarity:'ELEMENTAL', category:'BOMBAS', desc:'La explosión atraviesa hasta dos bloques destructibles por dirección. Los muros sólidos la detienen.' })
        });

        function applyPowerupV67(type){
            const key = String(type || '');
            if (['BOMB_FIRE','BOMB_ICE','BOMB_ELECTRIC','BOMB_TOXIC','BOMB_GRAVITY','BOMB_FRAGMENT','BOMB_PIERCE'].includes(key) && typeof applyElementalPowerupV612 === 'function') {
                return !!applyElementalPowerupV612(key);
            }
            if (['KICK','GRAB','THROW'].includes(key) && typeof activateCapabilityPowerupV681 === 'function') {
                const applied = !!activateCapabilityPowerupV681(player, key);
                if (applied && typeof addFloatingText==='function') {
                    const labels = { KICK:'PATADA', GRAB:'AGARRE', THROW:'LANZAMIENTO' };
                    addFloatingText(`✓ ${labels[key]}`, player.x, player.y, '#67e8f9');
                }
                if (typeof updateUI==='function') updateUI();
                return applied;
            }
            const def=POWERUP_DEFS_V67[key]; if(!def) return false;
            const applied=!!def.apply();
            clampPlayerCapacitiesV67();
            if(!applied && typeof addFloatingText==='function') addFloatingText('LÍMITE ALCANZADO',player.x,player.y,'#f97316');
            if(typeof updateUI==='function') updateUI();
            return applied;
        }

        function getPowerupDropPoolV67(){
            const pool = [];
            const cap = getPlayerCapacityCapsV67();
            const capabilityActive = (id) => typeof isCapabilityActiveV681 === 'function' && !!isCapabilityActiveV681(player, id);

            if (Number(player.maxBombs) < Number(cap.maxBombs)) pool.push(POWERUPS.BOMB_UP);
            if (Number(player.bombRange) < Number(cap.bombRange)) pool.push(POWERUPS.FIRE_UP);
            if (Number(player.speed) < Number(PLAYER_LIMITS_V67.hard.speed)) pool.push(POWERUPS.SPEED_UP);
            if (Number(player.health) < Number(player.maxHealth)) pool.push(POWERUPS.HEALTH_UP);
            if (!player.hasShield) pool.push(POWERUPS.SHIELD_UP);
            if (!capabilityActive('KICK')) pool.push(POWERUPS.BOMB_KICK);
            if (!capabilityActive('GRAB')) pool.push(POWERUPS.GRAB);
            if (capabilityActive('GRAB') && !capabilityActive('THROW')) pool.push(POWERUPS.THROW);

            // Las bombas elementales siguen siendo siempre obtenibles: repetir
            // el mismo elemento simplemente vuelve a seleccionarlo.
            pool.push(
                POWERUPS.BOMB_FIRE, POWERUPS.BOMB_ICE, POWERUPS.BOMB_ELECTRIC,
                POWERUPS.BOMB_TOXIC, POWERUPS.BOMB_GRAVITY, POWERUPS.BOMB_FRAGMENT, POWERUPS.BOMB_PIERCE
            );

            // Nunca devolvemos un pool vacío: al alcanzar todas las mejoras
            // permanentes, queda disponible el sistema elemental.
            return Object.freeze(pool.length ? pool : [
                POWERUPS.BOMB_FIRE, POWERUPS.BOMB_ICE, POWERUPS.BOMB_ELECTRIC,
                POWERUPS.BOMB_TOXIC, POWERUPS.BOMB_GRAVITY, POWERUPS.BOMB_FRAGMENT, POWERUPS.BOMB_PIERCE
            ]);
        }

        window.PLAYER_LIMITS_V67=PLAYER_LIMITS_V67;
        window.POWERUP_DEFS_V67=POWERUP_DEFS_V67;
        window.getPlayerCapacityCapsV67=getPlayerCapacityCapsV67;
        window.clampPlayerCapacitiesV67=clampPlayerCapacitiesV67;
        window.applyPowerupV67=applyPowerupV67;
        window.getPowerupDropPoolV67=getPowerupDropPoolV67;

        const ENEMY_TYPES = Object.freeze({
            RASTRERO: Object.freeze({ name: 'Rastrero', color: '#ef4444', speed: 1.4, canFly: false }),
            VOLADOR: Object.freeze({ name: 'Volador', color: '#3b82f6', speed: 1.1, canFly: true }),
            ESPECIAL: Object.freeze({ name: 'Especial', color: '#22c55e', speed: 2.2, canFly: false })
        });

        // v3.24: perfiles de comportamiento separados del tipo visual/fisico.
        // Cada enemigo conserva un solo arquetipo durante toda la vida de la entidad.
        const ENEMY_BEHAVIORS_V324 = Object.freeze({
            CHASER: Object.freeze({
                id: 'chaser', label: 'Perseguidor', distanceWeight: 2.85, distanceLookaheadWeight: 0.72,
                sameDirectionBonus: 3.0, reversePenalty: 22, branchPreference: 0.25, recentPenalty: 1.4,
                loopPenalty: 1.5, turnCommitMs: 220, speedMultiplier: 1.00
            }),
            PATROLLER: Object.freeze({
                id: 'patroller', label: 'Patrullero', distanceWeight: 1.25, distanceLookaheadWeight: 0.42,
                sameDirectionBonus: 4.4, reversePenalty: 27, branchPreference: 1.5, recentPenalty: 3.0,
                loopPenalty: 5.0, turnCommitMs: 320, speedMultiplier: 0.95
            }),
            EVASIVE: Object.freeze({
                id: 'evasive', label: 'Evasivo', distanceWeight: 1.4, distanceLookaheadWeight: 0.5,
                sameDirectionBonus: 2.2, reversePenalty: 10, branchPreference: 0.75, recentPenalty: 2.0,
                loopPenalty: 2.4, turnCommitMs: 190, speedMultiplier: 0.98, fleeRadius: 5
            }),
            AGGRESSIVE: Object.freeze({
                id: 'aggressive', label: 'Agresivo', distanceWeight: 3.35, distanceLookaheadWeight: 0.9,
                sameDirectionBonus: 1.8, reversePenalty: 8, branchPreference: 0.15, recentPenalty: 0.9,
                loopPenalty: 0.8, turnCommitMs: 145, speedMultiplier: 1.08
            }),
            FLYER: Object.freeze({
                id: 'flyer', label: 'Volador', distanceWeight: 3.05, distanceLookaheadWeight: 0.78,
                sameDirectionBonus: 2.5, reversePenalty: 14, branchPreference: 0.35, recentPenalty: 1.0,
                loopPenalty: 1.0, turnCommitMs: 180, speedMultiplier: 0.98,
                aerial: true
            })
        });

        function pickEnemyBehaviorV324(type, level = 1, index = 0, roll = Math.random()) {
            if (type === ENEMY_TYPES.VOLADOR || type?.canFly) return ENEMY_BEHAVIORS_V324.FLYER;
            if (type === ENEMY_TYPES.ESPECIAL) return ENEMY_BEHAVIORS_V324.AGGRESSIVE;

            const d = Math.max(1, Number(level) || 1);
            // Los primeros pisos introducen roles gradualmente; desde d3 aparece
            // el agresivo entre los enemigos terrestres. El roll ocurre solo al spawn.
            const r = Math.max(0, Math.min(0.999999, Number(roll) || 0));
            const aggressiveStart = d >= 3 ? 0.15 : 0;
            if (d >= 3 && r < aggressiveStart) return ENEMY_BEHAVIORS_V324.AGGRESSIVE;
            const patrolCut = 0.45;
            const evasiveCut = 0.72;
            if (r < patrolCut) return ENEMY_BEHAVIORS_V324.CHASER;
            if (r < evasiveCut) return ENEMY_BEHAVIORS_V324.PATROLLER;
            return ENEMY_BEHAVIORS_V324.EVASIVE;
        }

        window.ENEMY_BEHAVIORS_V324 = ENEMY_BEHAVIORS_V324;
        window.pickEnemyBehaviorV324 = pickEnemyBehaviorV324;

        const ROOM_TYPES = {
            STANDARD: {
                id: 'STANDARD', name: 'NORMAL', subtitle: 'Sin modificadores', icon: '◆',
                blockBonus: 0, enemyMult: 1, enemySpeedMult: 1, dropChance: 0.30,
                coinMult: 1, rewardCoins: 10, color: '#94a3b8'
            },
            ELITE: {
                id: 'ELITE', name: 'ÉLITE', subtitle: 'Más enemigos · mejores recompensas', icon: '◆◆',
                blockBonus: -0.03, enemyMult: 1.65, enemySpeedMult: 1.08, dropChance: 0.38,
                coinMult: 1.5, rewardCoins: 25, color: '#fb7185'
            },
            TREASURE: {
                id: 'TREASURE', name: 'TESORO', subtitle: 'Más botín · menos presión', icon: '✦',
                blockBonus: 0.02, enemyMult: 0.65, enemySpeedMult: 0.96, dropChance: 0.52,
                coinMult: 2, rewardCoins: 35, color: '#fbbf24'
            },
            CURSED: {
                id: 'CURSED', name: 'MALDITA', subtitle: 'Enemigos rápidos · botín aumentado', icon: '☠',
                blockBonus: 0.04, enemyMult: 1.35, enemySpeedMult: 1.18, dropChance: 0.42,
                coinMult: 1.75, rewardCoins: 30, color: '#c084fc'
            },
            SHRINE: {
                id: 'SHRINE', name: 'SANTUARIO', subtitle: '+1 vida y escudo al entrar', icon: '✚',
                blockBonus: -0.02, enemyMult: 0.75, enemySpeedMult: 0.95, dropChance: 0.34,
                coinMult: 1.1, rewardCoins: 15, color: '#67e8f9'
            }
            ,BOSS: {
                id: 'BOSS', name: 'JEFE', subtitle: 'Arena de combate · derrotá al guardián', icon: '☠',
                blockBonus: -0.18, enemyMult: 0.25, enemySpeedMult: 1.05, dropChance: 0.50,
                coinMult: 2.5, rewardCoins: 60, color: '#f43f5e'
            }
        };

        const RELICS = [
            { id: 'ember_core', icon: '🔥', name: 'NÚCLEO ÍGNEO', rarity: 'RARE', bonuses: { range: 1 }, desc: '+1 rango de bomba. Las explosiones valen +25 puntos extra.',
              apply: () => { clampPlayerCapacitiesV67(); } },
            { id: 'twin_fuse', icon: '💣', name: 'MECHA GEMELA', rarity: 'UNCOMMON', bonuses: { bombs: 1 }, desc: '+1 bomba máxima.',
              apply: () => { clampPlayerCapacitiesV67(); } },
            { id: 'iron_boots', icon: '👟', name: 'BOTAS DE HIERRO', rarity: 'UNCOMMON', desc: '+0.6 velocidad permanente.',
              apply: () => { const cap = getPlayerCapacityCapsV67(); player.speed = Math.min(player.speed + 0.6, cap.speed); } },
            { id: 'heart_engine', icon: '♥', name: 'MOTOR VITAL', rarity: 'RARE', bonuses: { maxHealth: 1 }, desc: '+1 vida máxima y recuperas 1 vida ahora.',
              apply: () => { clampPlayerCapacitiesV67({ healNewMax: true }); } },
            { id: 'ward_plate', icon: '🛡', name: 'PLACA DE GUARDA', rarity: 'RARE', desc: 'Obtienes un escudo. Un golpe no destruye la run.',
              apply: () => { player.hasShield = true; } },
            { id: 'lucky_charm', icon: '✦', name: 'AMULETO AFORTUNADO', rarity: 'EPIC', desc: '+40% de monedas obtenidas.',
              apply: () => { gameState.coinBonus += 0.40; } },
            { id: 'war_trophy', icon: '⚔', name: 'TROFEO DE GUERRA', rarity: 'EPIC', desc: '+50% de puntos por enemigos.',
              apply: () => { gameState.killScoreMult += 0.50; } },
            { id: 'merchant_seal', icon: '◉', name: 'SELLO DEL MERCADER', rarity: 'EPIC', desc: 'Los rerolls cuestan 5 monedas menos.',
              apply: () => { gameState.rerollDiscount += 5; } }
        ];

        const REWARDS = [
            { id: 'speed', kind: 'UPGRADE', rarity: 'COMMON', name: 'BOTAS', desc: '+0.4 velocidad.', action: () => { const cap = getPlayerCapacityCapsV67(); player.speed = Math.min(player.speed + 0.4, cap.speed); } },
            { id: 'shield', kind: 'UPGRADE', rarity: 'UNCOMMON', name: 'ESCUDO', desc: 'Protección contra un golpe.', action: () => player.hasShield = true },
            { id: 'coin', kind: 'UPGRADE', rarity: 'COMMON', name: 'BOTÍN', desc: '+35 monedas.', action: () => gameState.coins += 35 },
            { id: 'heal', kind: 'UPGRADE', rarity: 'UNCOMMON', name: 'KIT MÉDICO', desc: 'Recupera 2 vidas sin superar el máximo.', action: () => player.health = Math.min(player.health + 2, player.maxHealth) },
            { id: 'bomb_kick', kind: 'UPGRADE', rarity: 'UNCOMMON', name: 'PATADA', desc: 'Capacidad permanente para patear bombas.', action: () => typeof applyPowerupV67 === 'function' ? applyPowerupV67(POWERUPS.BOMB_KICK) : null }
        ];

        const RARITY_COLORS = {
            COMMON: '#94a3b8', UNCOMMON: '#34d399', RARE: '#60a5fa', EPIC: '#c084fc'
        };

        function getAvailableRelics() {
            return RELICS.filter(r => !r.roguelikeOnly && !gameState.relics.some(owned => owned.id === r.id));
        }

        function grantRelic(relic) {
            if (!relic || gameState.relics.some(r => r.id === relic.id)) return false;
            gameState.relics.push(relic);
            relic.apply();
            addFloatingText(`${relic.icon} ${relic.name}`, player.x, player.y, RARITY_COLORS[relic.rarity]);
            updateUI();
            return true;
        }

        let gameState = {
            isPlaying: false,
            // v6.30.3: God Mode de desarrollo, reflejado también en player.
            godModeEnabled: false,
            level: 1,
            score: 0,
            gridWidth: 17,
            gridHeight: 17,
            grid: [],
            bombs: [],
            explosions: [],
            enemies: [],
            items: [],
            particles: [],
            floaters: [],
            hazards: [],
            // v6.0: residuos materiales persistentes del campo de batalla.
            materialResiduesV60: [],
            // v6.1: referencia runtime al eco activo; la persistencia vive en localStorage.
            deathEchoV61: null,
            hazardCooldown: 0,
            boss: null,
            roomTime: 0,
            exitPos: null,
            lastTime: 0,
            keys: {},
            touchControls: { x: 0, y: 0, queuedX: 0, queuedY: 0 },
            lastMoveAxis: 'vertical',
            camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
            shakeTimer: 0,
            shakeIntensity: 0,
            animFrame: 0,
            blastSerial: 0,
            // V3.17: incrementa cuando cambia la geometría destructible del mapa.
            // Permite invalidar caches visuales sin rehacer el terreno cada frame.
            gridRevision: 0,
            lastMoveInputAt: 0,
            paused: false,
            coins: 0,
            relics: [],
            roomType: ROOM_TYPES.STANDARD,
            coinBonus: 0,
            killScoreMult: 1,
            rerollDiscount: 0,
            rerolls: 1,
            blocksBroken: 0,
            totalKills: 0,
            bestDepth: Number(localStorage.getItem('bombermanBestDepth') || 0),
            exitUnlocked: false
        };

        let player = {
            x: 0, y: 0,
            width: TILE_SIZE * 0.7,
            height: TILE_SIZE * 0.7,
            speed: 3.0,
            maxBombs: 1,
            bombsPlaced: 0,
            bombCooldown: 0,
            kickCooldown: 0,
            bombRange: 1,
            health: 3,
            maxHealth: 5,
            firstRelicFlags: { bomb: false, range: false, health: false },
            hasShield: false,
            godModeEnabled: false,
            isInvincible: false,
            invincibleTimer: 0,
            dir: 'down',
            isMoving: false,
            walkCycle: 0,
            _frameScale: 1,
            vx: 0,
            vy: 0,
            inputDir: 0,
            inputAxis: null,
            inputBuffer: null,
            inputBufferTimer: 0
        };

        // Contexto explícito para módulos y hosts que aíslan el scope de cada script.
        // Mantiene referencias vivas sin duplicar el estado del motor.
        window.BOMBER_ENGINE = window.BOMBER_ENGINE || {};
        window.BOMBER_ENGINE.getState = () => gameState;
        window.BOMBER_ENGINE.getPlayer = () => player;
        window.BOMBER_ENGINE.getWorldTypes = () => TYPES;
        window.BOMBER_ENGINE.getTileSize = () => TILE_SIZE;

        window.addEventListener('keydown', (e) => {
            gameState.keys[e.code] = true;
            if (['ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code)) {
                gameState.lastMoveAxis = 'vertical';
                if (!e.repeat) gameState.lastMoveInputAt = performance.now();
            }
            if (['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)) {
                gameState.lastMoveAxis = 'horizontal';
                if (!e.repeat) gameState.lastMoveInputAt = performance.now();
            }
        });
        window.addEventListener('keyup', (e) => gameState.keys[e.code] = false);

;
// === js/02-entity-capabilities.js ===
// Bomberman Roguelike v6.8.5 — Entity Capability Foundation
// Capacidades declarativas + power-ups permanentes y mutuamente excluyentes.
(function initEntityCapabilitiesV681(global) {
    'use strict';

    const ARCHETYPE_CAPABILITIES = Object.freeze({
        player:  Object.freeze({ kick:true,  grab:true,  carry:true,  throw:true }),
        chaser:  Object.freeze({ kick:false, grab:false, carry:false, throw:false }),
        flyer:   Object.freeze({ kick:false, grab:false, carry:false, throw:false }),
        boss:    Object.freeze({ kick:true,  grab:true,  carry:true,  throw:true  }),
        echo:    Object.freeze({ kick:true,  grab:true,  carry:true,  throw:true  }),
        generic: Object.freeze({ kick:false, grab:false, carry:false, throw:false })
    });

    const CAPABILITY_POWERUPS = Object.freeze({
        KICK: Object.freeze({
            id:'KICK', capability:'kick', label:'PATADA', icon:'🥾',
            category:'INTERACCION', rarity:'BASE', permanent:true,
            desc:'Capacidad permanente de empujar bombas al caminar contra ellas.'
        }),
        GRAB: Object.freeze({
            id:'GRAB', capability:'grab', label:'AGARRE', icon:'🧤',
            category:'INTERACCION', rarity:'BASE', permanent:true,
            desc:'Capacidad permanente de levantar una bomba y transportarla.'
        }),
        THROW: Object.freeze({
            id:'THROW', capability:'throw', label:'LANZAMIENTO', icon:'➜',
            category:'INTERACCION', rarity:'BASE', permanent:true,
            requires:['grab'],
            desc:'Capacidad permanente de lanzar la bomba que transportas hacia adelante. Requiere GRAB.'
        })
    });

    function normalizeArchetype(value) {
        const id = String(value || '').toLowerCase();
        return Object.prototype.hasOwnProperty.call(ARCHETYPE_CAPABILITIES, id) ? id : 'generic';
    }

    function getState() {
        return global.BOMBER_ENGINE?.getState?.() || null;
    }

    function getPlayer() {
        return global.BOMBER_ENGINE?.getPlayer?.() || null;
    }

    function getArchetype(entity) {
        if (!entity || typeof entity !== 'object') return 'generic';
        if (entity.archetype) return normalizeArchetype(entity.archetype);

        const player = getPlayer();
        if (player && entity === player) return 'player';

        const state = getState();
        if (state?.boss && entity === state.boss) return 'boss';
        const activeEcho = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state?.level)
            : (state?.deathEchoV61 || null);
        if (activeEcho && entity === activeEcho) return 'echo';

        const aiArchetype = entity.ai?.archetype;
        if (aiArchetype) return normalizeArchetype(aiArchetype);

        if (Array.isArray(state?.enemies) && state.enemies.includes(entity)) return 'chaser';
        return 'generic';
    }

    function getCapabilityProfile(entity, create = true) {
        if (!entity || typeof entity !== 'object') return null;
        if (!entity.capabilityProfileV681 && create) {
            entity.capabilityProfileV681 = {
                permanent: [],
                byGroup: Object.create(null)
            };
        }
        return entity.capabilityProfileV681 || null;
    }

    function hasPermanentCapability(entity, capability) {
        const profile = getCapabilityProfile(entity, false);
        return !!profile?.permanent?.includes(String(capability));
    }

    function getCapabilityPowerupIdsV681() {
        return Object.freeze(Object.keys(CAPABILITY_POWERUPS));
    }

    function getCapabilityPowerupDefV681(powerupId) {
        return CAPABILITY_POWERUPS[String(powerupId)] || null;
    }

    // can* responde a la capacidad declarada por arquetipo (elegibilidad).
    // El estado efectivo de un power-up se consulta con isCapabilityActiveV681.
    function canUseCapability(entity, capability) {
        if (!entity || typeof entity !== 'object') return false;
        const archetype = getArchetype(entity);
        const caps = ARCHETYPE_CAPABILITIES[archetype] || ARCHETYPE_CAPABILITIES.generic;
        return caps[String(capability)] === true;
    }

    function isCapabilityActiveV681(entity, capability) {
        return canUseCapability(entity, capability) && hasPermanentCapability(entity, capability);
    }

    function canKick(entity) { return canUseCapability(entity, 'kick'); }
    function canGrab(entity) { return canUseCapability(entity, 'grab'); }
    function canCarry(entity) { return canUseCapability(entity, 'carry'); }
    function canThrow(entity) { return canUseCapability(entity, 'throw'); }
    function isKickActiveV681(entity) { return isCapabilityActiveV681(entity, 'kick'); }
    function isThrowActiveV681(entity) { return isCapabilityActiveV681(entity, 'throw'); }
    // GRAB implica CARRY: transportar no es un power-up separado.
    function isGrabActiveV681(entity) { return isCapabilityActiveV681(entity, 'grab'); }
    function isCarryActiveV681(entity) { return isCapabilityActiveV681(entity, 'grab') && canUseCapability(entity, 'carry'); }

    function activateCapabilityPowerupV681(entity, powerupId) {
        const def = getCapabilityPowerupDefV681(powerupId);
        if (!entity || !def) return false;

        const archetype = getArchetype(entity);
        const archetypeCaps = ARCHETYPE_CAPABILITIES[archetype] || ARCHETYPE_CAPABILITIES.generic;
        if (archetypeCaps[def.capability] !== true) return false;

        if (Array.isArray(def.requires) && !def.requires.every(required => hasPermanentCapability(entity, required))) return false;

        const profile = getCapabilityProfile(entity, true);
        // THROW depende de GRAB: un cambio posterior a KICK elimina THROW.
        if (def.capability === 'throw' && !hasPermanentCapability(entity, 'grab')) return false;
        if (profile.permanent.includes(def.capability)) return false;

        let switchedExclusiveGroup = false;
        if (def.exclusiveGroup) {
            const activeGroup = profile.byGroup[def.exclusiveGroup];
            if (activeGroup === def.capability) return false;
            if (activeGroup) {
                // Las capacidades del grupo representan la capacidad activa, no un
                // historial de pickups. Cambiar KICK ↔ GRAB reemplaza la anterior.
                const oldDef = Object.values(CAPABILITY_POWERUPS).find(item =>
                    item.exclusiveGroup === def.exclusiveGroup && item.capability === activeGroup
                );
                if (oldDef) {
                    profile.permanent = profile.permanent.filter(capability => {
                        if (capability === oldDef.capability) return false;
                        if (oldDef.capability === 'grab' && (capability === 'carry' || capability === 'throw')) return false;
                        return true;
                    });
                }
                switchedExclusiveGroup = true;
            }
        }

        if (!profile.permanent.includes(def.capability)) profile.permanent.push(def.capability);
        // GRAB habilita automáticamente CARRY: es parte de la capacidad de agarre.
        if (def.capability === 'grab' && archetypeCaps.carry === true && !profile.permanent.includes('carry')) {
            profile.permanent.push('carry');
        }
        if (def.exclusiveGroup) profile.byGroup[def.exclusiveGroup] = def.capability;
        return true;
    }

    function resetEntityCapabilitiesV681(entity) {
        if (!entity || typeof entity !== 'object') return false;
        entity.capabilityProfileV681 = {
            permanent: [],
            byGroup: Object.create(null)
        };
        return true;
    }

    function getActiveCapabilityPowerupsV681(entity) {
        const profile = getCapabilityProfile(entity, false);
        if (!profile) return [];
        return profile.permanent.map(capability =>
            Object.values(CAPABILITY_POWERUPS).find(def => def.capability === capability)?.id
        ).filter(Boolean);
    }

    global.ARCHETYPE_CAPABILITIES = ARCHETYPE_CAPABILITIES;
    global.CAPABILITY_POWERUPS_V681 = CAPABILITY_POWERUPS;
    global.getArchetypeV681 = getArchetype;
    global.canKick = canKick;
    global.canGrab = canGrab;
    global.canCarry = canCarry;
    global.canThrow = canThrow;
    global.isCapabilityActiveV681 = isCapabilityActiveV681;
    global.isKickActiveV681 = isKickActiveV681;
    global.isGrabActiveV681 = isGrabActiveV681;
    global.isCarryActiveV681 = isCarryActiveV681;
    global.isThrowActiveV681 = isThrowActiveV681;
    global.activateCapabilityPowerupV681 = activateCapabilityPowerupV681;
    global.resetEntityCapabilitiesV681 = resetEntityCapabilitiesV681;
    global.getActiveCapabilityPowerupsV681 = getActiveCapabilityPowerupsV681;
    global.getCapabilityPowerupIdsV681 = getCapabilityPowerupIdsV681;
    global.getCapabilityPowerupDefV681 = getCapabilityPowerupDefV681;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEntityArchetype = getArchetype;
    global.BOMBER_ENGINE.canKick = canKick;
    global.BOMBER_ENGINE.canGrab = canGrab;
    global.BOMBER_ENGINE.canCarry = canCarry;
    global.BOMBER_ENGINE.canThrow = canThrow;
    global.BOMBER_ENGINE.isCapabilityActive = isCapabilityActiveV681;
    global.BOMBER_ENGINE.isKickActive = isKickActiveV681;
    global.BOMBER_ENGINE.isGrabActive = isGrabActiveV681;
    global.BOMBER_ENGINE.isCarryActive = isCarryActiveV681;
    global.BOMBER_ENGINE.isThrowActive = isThrowActiveV681;
    global.BOMBER_ENGINE.activateCapabilityPowerup = activateCapabilityPowerupV681;
    global.BOMBER_ENGINE.resetEntityCapabilities = resetEntityCapabilitiesV681;
    global.BOMBER_ENGINE.getCapabilityPowerupIds = getCapabilityPowerupIdsV681;
})(window);

;
// === js/03-device-quality.js ===
/*
 * BOMBERMAN ROGUELIKE v4.5 — Device Quality Configuration
 *
 * Manual visual profile selected before starting a run.
 * Gameplay, physics, AI and dungeon generation are intentionally unaffected.
 */

const DEVICE_QUALITY_V45 = Object.freeze({
    low: Object.freeze({
        id: 'low',
        label: 'DETALLES BAJOS',
        target: 'Gama baja',
        description: 'Menos partículas, iluminación mínima y efectos reducidos.',
        particleSpawn: 0.30,
        particleBudget: 28,
        renderParticleBudget: 24,
        ambientDust: 0,
        lightingEnabled: false,
        lightingEvery: 4,
        bombGlow: false,
        shadowEffects: false,
        feedbackParticles: 0.35,
        feedbackRings: 0.35,
        feedbackFlash: 0.45,
        cameraKick: 0.65,
        maxSoundsPerSecond: 5
    }),
    medium: Object.freeze({
        id: 'medium',
        label: 'DETALLES MEDIOS',
        target: 'Gama media',
        description: 'Equilibrio entre apariencia y carga de trabajo.',
        particleSpawn: 0.60,
        particleBudget: 64,
        renderParticleBudget: 48,
        ambientDust: 10,
        lightingEnabled: true,
        lightingEvery: 2,
        bombGlow: true,
        shadowEffects: true,
        feedbackParticles: 0.65,
        feedbackRings: 0.65,
        feedbackFlash: 0.75,
        cameraKick: 0.85,
        maxSoundsPerSecond: 8
    }),
    high: Object.freeze({
        id: 'high',
        label: 'DETALLES MÁXIMOS',
        target: 'Gama alta',
        description: 'Todos los efectos visuales disponibles dentro de los límites del juego.',
        particleSpawn: 1,
        particleBudget: 120,
        renderParticleBudget: 96,
        ambientDust: 24,
        lightingEnabled: true,
        lightingEvery: 1,
        bombGlow: true,
        shadowEffects: true,
        feedbackParticles: 1,
        feedbackRings: 1,
        feedbackFlash: 1,
        cameraKick: 1,
        maxSoundsPerSecond: 10
    })
});

const DEVICE_QUALITY_V45_STORAGE = 'bombermanRoguelikeQuality';

const deviceQualityV45 = {
    selected: 'medium',
    initialized: false
};

function getDeviceQualityV45(id = deviceQualityV45.selected) {
    return DEVICE_QUALITY_V45[id] || DEVICE_QUALITY_V45.medium;
}

function setDeviceQualityV45(id, persist = true) {
    const next = DEVICE_QUALITY_V45[id] ? id : 'medium';
    deviceQualityV45.selected = next;

    if (persist) {
        try { localStorage.setItem(DEVICE_QUALITY_V45_STORAGE, next); } catch (_) {}
    }

    const profile = getDeviceQualityV45(next);
    if (typeof perf === 'object' && perf) {
        perf.lowQuality = next === 'low';
        perf.fastFrames = 0;
        perf.slowFrames = 0;
    }

    if (typeof largeSupport === 'object' && largeSupport) {
        largeSupport.particleBudget = profile.particleBudget;
        largeSupport.renderParticleBudget = profile.renderParticleBudget;
        largeSupport.shadowEffects = profile.shadowEffects;
    }

    document.body?.setAttribute('data-quality', next);

    document.querySelectorAll('[data-quality-option]').forEach(button => {
        const active = button.getAttribute('data-quality-option') === next;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    const summary = document.getElementById('quality-selected-summary');
    if (summary) {
        summary.textContent = `${profile.label} · ${profile.target}`;
    }

    return profile;
}

function initializeDeviceQualityV45() {
    if (deviceQualityV45.initialized) return getDeviceQualityV45();
    deviceQualityV45.initialized = true;

    let stored = null;
    try { stored = localStorage.getItem(DEVICE_QUALITY_V45_STORAGE); } catch (_) {}

    setDeviceQualityV45(DEVICE_QUALITY_V45[stored] ? stored : 'medium', false);

    document.querySelectorAll('[data-quality-option]').forEach(button => {
        button.addEventListener('click', () => {
            initAudio();
            audioCtx?.resume();
            sfx('click');
            setDeviceQualityV45(button.getAttribute('data-quality-option'));
        });
    });

    return getDeviceQualityV45();
}

function getDeviceQualityV45State() {
    return {
        id: deviceQualityV45.selected,
        ...getDeviceQualityV45()
    };
}

function deviceQualityV45ParticleCount(count) {
    const profile = getDeviceQualityV45();
    return Math.max(0, Math.round(Number(count || 0) * profile.particleSpawn));
}

function deviceQualityV45FeedbackCount(count, kind = 'particles') {
    const profile = getDeviceQualityV45();
    const scale = kind === 'rings' ? profile.feedbackRings : profile.feedbackParticles;
    return Math.max(0, Math.round(Number(count || 0) * scale));
}

function deviceQualityV45ShouldBombGlow() {
    const profile = getDeviceQualityV45();
    return profile.bombGlow && (!perf.lowQuality || gameState.animFrame % 2 === 0);
}

function deviceQualityV45ShouldLighting() {
    const profile = getDeviceQualityV45();
    if (!profile.lightingEnabled) return false;
    const interval = Math.max(1, profile.lightingEvery || 1);
    return gameState.animFrame % interval === 0;
}

function deviceQualityV45FeedbackFlash(alpha) {
    return Number(alpha || 0) * getDeviceQualityV45().feedbackFlash;
}

function deviceQualityV45CameraKick(amount) {
    return Number(amount || 0) * getDeviceQualityV45().cameraKick;
}

function deviceQualityV45Init() {
    return initializeDeviceQualityV45();
}

window.DEVICE_QUALITY_V45 = DEVICE_QUALITY_V45;
window.getDeviceQualityV45 = getDeviceQualityV45;
window.setDeviceQualityV45 = setDeviceQualityV45;
window.getDeviceQualityV45State = getDeviceQualityV45State;
window.deviceQualityV45ParticleCount = deviceQualityV45ParticleCount;
window.deviceQualityV45FeedbackCount = deviceQualityV45FeedbackCount;
window.deviceQualityV45ShouldBombGlow = deviceQualityV45ShouldBombGlow;
window.deviceQualityV45ShouldLighting = deviceQualityV45ShouldLighting;
window.deviceQualityV45FeedbackFlash = deviceQualityV45FeedbackFlash;
window.deviceQualityV45CameraKick = deviceQualityV45CameraKick;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deviceQualityV45Init, { once: true });
} else {
    deviceQualityV45Init();
}

;
// === js/04-theme.js ===
// Bomberman Roguelike v4.6.1 — Visual Themes
// Solo visuales: terreno, bombas, fuego, fondo, partículas y ambiente.
// No introduce mecánicas, hazards, cambios de física ni generación alternativa.
(function initThemeFoundationV461(global) {
    'use strict';

    const THEME_STORAGE_V461 = 'bombermanRoguelikeTheme';

    const CLASSIC_THEME = Object.freeze({
        id: 'classic',
        nombre: 'Clásico',
        tipo: 'visual-only',

        paleta: Object.freeze({
            background: '#090d16',
            floorA: '#0f172a',
            floorB: '#1e293b',
            floorHighlight: 'rgba(255,255,255,0.03)',
            floorShadow: 'rgba(0,0,0,0.2)',

            wallBase: '#475569',
            wallHighlight: '#94a3b8',
            wallShadow: '#334155',
            wallInset: '#1e293b',
            wallDeep: '#0f172a',
            wallAccent: '#38bdf8',

            blockBase: '#b45309',
            blockHighlight: '#f59e0b',
            blockShadow: '#78350f',
            blockPattern: '#92400e',
            blockCore: '#451a03',

            exit: '#facc15',
            exitDark: '#000000',

            playerSuit: '#2563eb',
            playerDark: '#0f172a',
            playerBuckle: '#facc15',
            playerShield: 'rgba(56,189,248,0.8)',
            playerHelmet: '#f8fafc',
            playerFace: '#ffedd5',
            playerAccent: '#ec4899',
            playerBoot: '#dc2626',
            playerMetal: '#94a3b8',

            enemyShadow: 'rgba(0,0,0,0.4)',
            enemyEye: '#ffffff',
            enemyPupil: '#000000',
            enemyRastrero: '#ef4444',
            enemyVolador: '#3b82f6',
            enemyEspecial: '#22c55e',

            bombPlayerRing: 'rgba(34,211,238,.78)',
            bombBossRing: 'rgba(248,113,113,.82)',
            bombMovingFill: 'rgba(255,210,63,.14)',
            bombMovingStroke: 'rgba(255,138,0,.7)',
            bombShadow: 'rgba(0,0,0,0.5)',
            bombBody: '#0f172a',
            bombReflect: 'rgba(255,255,255,0.2)',
            bombCap: '#64748b',
            bombSparkHot: '#facc15',
            bombSparkDanger: '#ef4444',
            bombFuse: '#fee2e2',

            fireOuter: 'rgba(220,38,38,0.8)',
            lightingTransparent: 'rgba(0,0,0,0)',
            lightingMid: 'rgba(0,0,0,.12)',
            lightingDark: 'rgba(0,0,0,.52)',
            bombGlow: 'rgba(255,170,50,.20)',
            bombGlowOuter: 'rgba(255,80,20,0)',
            fireMiddle: '#f97316',
            fireCore: '#fef08a',

            particleImpact: '#fde68a',
            particleFire: '#fb923c',
            particleBlock: '#b45309',
            particleDanger: '#f87171',
            particleShield: '#38bdf8',
            particleLoot: '#fbbf24',
            particleEnemy: '#38bdf8',
            particleEnemyElite: '#fb7185',
            particleBoss: '#f43f5e',
            feedbackRingSoft: '#fed7aa',
            feedbackFlash: '#fff7ed',

            powerupBase: '#0284c7',
            powerupAccent: '#38bdf8',
            relicBase: '#3b1d6b',
            relicAccent: '#c084fc',
            bossBase: '#312e81',
            bossOutline: '#a78bfa',
            bossShoulder: '#4c1d95',
            bossFacePlate: '#111827',
            bossEye: '#e9d5ff',
            bossCrown: '#facc15',
            bossCore: '#c084fc',
            bossRageBase: '#581c1c',
            bossRageOutline: '#fb7185',
            bossRageShoulder: '#991b1b',
            bossRageEye: '#fda4af',
            bossRageCore: '#ef4444',
            bossPhaseMarker: '#fef08a',
            bossShadow: 'rgba(0,0,0,.42)',
            ambientDust: 'rgba(226,232,240,0.06)',
            white: '#ffffff'
        }),

        sprites: Object.freeze({
            floor: 'procedural:floor',
            wall: 'procedural:steel-wall',
            brick: 'procedural:wood-block',
            blockStyle: 'wood-crate', barrelStyle: 'wood-barrel',
            bomb: 'procedural:bomb',
            fire: 'procedural:explosion',
            player: 'procedural:bomberman',
            enemy: 'procedural:enemy',
            powerup: 'procedural:powerup',
            relic: 'procedural:relic',
            exit: 'procedural:exit',
            boss: 'procedural:boss'
        }),

        fondo: Object.freeze({ base: 'background', capas: Object.freeze([]) }),
        ambiente: Object.freeze({ tipo: 'dust', color: 'ambientDust', densidad: 1, velocidad: 0.35, sizeMin: 1, sizeMax: 2, alpha: 0.45 }),
        audio: Object.freeze({
            musica: null,
            sfx: Object.freeze({
                bomb: 'bomb', boom: 'boom', pickup: 'pickup', hurt: 'hurt', exit: 'exit', click: 'click',
                trap: 'trap', alarm: 'alarm', boss: 'boss', bossHit: 'bossHit', bossRoar: 'bossRoar',
                bossCharge: 'bossCharge', bossWave: 'bossWave', damageHit: 'damageHit', enemyKill: 'enemyKill',
                death: 'death', bombReady: 'bombReady'
            })
        }),

        mecanicas: Object.freeze([]),
        nivelGen: Object.freeze({ source: 'v4.4-bomberman-number-generator', densityMin: 0.25, densityMax: 0.72, classicPillarSpacing: 2, symmetry: 'current' }),
        enemigos: Object.freeze({
            pool: Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']),
            colors: Object.freeze({ RASTRERO: 'enemyRastrero', VOLADOR: 'enemyVolador', ESPECIAL: 'enemyEspecial' })
        }),
        // Pool universal: genéricos + capacidades de interacción.
        // THROW forma parte de las capacidades de interacción.
        powerups: Object.freeze({ pool: Object.freeze(['BOMB_UP','FIRE_UP','SPEED_UP','HEALTH_UP','SHIELD_UP','KICK','GRAB']) })
    });

    function createVisualThemeV461(id, nombre, paletteOverrides, spriteOverrides, ambientOverrides) {
        return Object.freeze({
            ...CLASSIC_THEME,
            id,
            nombre,
            paleta: Object.freeze({ ...CLASSIC_THEME.paleta, ...paletteOverrides }),
            sprites: Object.freeze({ ...CLASSIC_THEME.sprites, ...spriteOverrides }),
            ambiente: Object.freeze({ ...CLASSIC_THEME.ambiente, ...ambientOverrides }),
            mecanicas: Object.freeze([])
        });
    }

    const WINTER_THEME_BASE = createVisualThemeV461(
        'winter',
        'Invierno',
        {
            background: '#071321',
            floorA: '#17334a',
            floorB: '#1d465f',
            floorHighlight: 'rgba(226,247,255,.07)',
            floorShadow: 'rgba(1,13,25,.30)',
            wallBase: '#7196aa',
            wallHighlight: '#e1f6ff',
            wallShadow: '#426172',
            wallInset: '#294856',
            wallDeep: '#122b38',
            wallAccent: '#bdeeff',
            blockBase: '#738f9a',
            blockHighlight: '#d8eef4',
            blockShadow: '#47616d',
            blockPattern: '#587782',
            blockCore: '#29434f',
            bombPlayerRing: 'rgba(191,239,255,.90)',
            bombBossRing: 'rgba(248,113,113,.82)',
            bombMovingFill: 'rgba(186,230,253,.18)',
            bombMovingStroke: 'rgba(125,211,252,.84)',
            bombBody: '#10232e',
            bombReflect: 'rgba(255,255,255,.28)',
            bombCap: '#7eaebe',
            bombSparkHot: '#f8fdff',
            bombSparkDanger: '#67d9ff',
            bombFuse: '#ecfeff',
            fireOuter: 'rgba(56,189,248,.88)',
            lightingMid: 'rgba(3,24,42,.10)',
            lightingDark: 'rgba(0,11,24,.48)',
            bombGlow: 'rgba(103,232,249,.20)',
            bombGlowOuter: 'rgba(56,189,248,0)',
            fireMiddle: '#7dd3fc',
            fireCore: '#f0f9ff',
            particleImpact: '#dff7ff',
            particleFire: '#7dd3fc',
            particleBlock: '#a8c8d4',
            particleDanger: '#8be9ff',
            particleShield: '#bae6fd',
            particleLoot: '#e0f2fe',
            particleEnemy: '#67e8f9',
            particleEnemyElite: '#fda4af',
            particleBoss: '#fb7185',
            feedbackRingSoft: '#dbeafe',
            feedbackFlash: '#e0f2fe',
            ambientDust: 'rgba(233,248,255,.82)'
        },
        {
            floor: 'procedural:ice-floor', wall: 'procedural:ice-wall', brick: 'procedural:frozen-block',
            blockStyle: 'ice-crate', barrelStyle: 'ice-drum',
            bomb: 'procedural:ice-bomb', fire: 'procedural:frost-fire'
        },
        { tipo: 'snow', color: 'ambientDust', densidad: 1, velocidad: 0.42, sizeMin: 1, sizeMax: 3, alpha: 0.55 }
    );

    const WINTER_THEME = Object.freeze({
        ...WINTER_THEME_BASE,
        // Winter conserva identidad visual, pero no declara mecánicas, hazards ni power-ups propios.
        mecanicas: Object.freeze([]),
        enemigos: WINTER_THEME_BASE.enemigos,
        powerups: Object.freeze({ pool: Object.freeze(['BOMB_UP','FIRE_UP','SPEED_UP','HEALTH_UP','SHIELD_UP','KICK','GRAB']) })
    });

    const INFERNO_THEME = createVisualThemeV461(
        'inferno',
        'Infierno',
        {
            background: '#160504',
            floorA: '#2a0b07',
            floorB: '#3b1209',
            floorHighlight: 'rgba(255,218,170,.045)',
            floorShadow: 'rgba(10,0,0,.40)',
            wallBase: '#6b2b1c',
            wallHighlight: '#d0784a',
            wallShadow: '#3d120b',
            wallInset: '#2a0d08',
            wallDeep: '#140403',
            wallAccent: '#ff9b3d',
            blockBase: '#7c2d12',
            blockHighlight: '#fb923c',
            blockShadow: '#451407',
            blockPattern: '#9a3412',
            blockCore: '#2a0a03',
            bombPlayerRing: 'rgba(255,138,69,.90)',
            bombBossRing: 'rgba(255,68,43,.92)',
            bombMovingFill: 'rgba(255,160,80,.17)',
            bombMovingStroke: 'rgba(255,138,0,.84)',
            bombBody: '#170907',
            bombReflect: 'rgba(255,230,210,.24)',
            bombCap: '#8b5e48',
            bombSparkHot: '#ffd166',
            bombSparkDanger: '#ff4b2b',
            bombFuse: '#ffe4cc',
            fireOuter: 'rgba(239,68,68,.90)',
            lightingMid: 'rgba(42,0,0,.14)',
            lightingDark: 'rgba(20,0,0,.58)',
            bombGlow: 'rgba(255,112,0,.25)',
            bombGlowOuter: 'rgba(255,70,0,0)',
            fireMiddle: '#ff7a18',
            fireCore: '#ffe066',
            particleImpact: '#ffd166',
            particleFire: '#ff8a3d',
            particleBlock: '#c2410c',
            particleDanger: '#ff5b57',
            particleShield: '#ffb38a',
            particleLoot: '#ffd166',
            particleEnemy: '#fb7185',
            particleEnemyElite: '#ffb4a8',
            particleBoss: '#ff3d2e',
            feedbackRingSoft: '#fed7aa',
            feedbackFlash: '#fff0d6',
            ambientDust: 'rgba(255,153,92,.76)'
        },
        {
            floor: 'procedural:scorched-floor', wall: 'procedural:basalt-wall', brick: 'procedural:charred-block',
            blockStyle: 'lava-crate', barrelStyle: 'lava-drum',
            bomb: 'procedural:inferno-bomb', fire: 'procedural:inferno-flame'
        },
        { tipo: 'ember', color: 'ambientDust', densidad: 0.9, velocidad: 0.52, sizeMin: 1, sizeMax: 2, alpha: 0.58 }
    );

    const AUTUMN_THEME = createVisualThemeV461(
        'autumn',
        'Otoño',
        {
            background:'#140d08', floorA:'#2f1b12', floorB:'#4a2917', floorHighlight:'rgba(255,214,153,.055)', floorShadow:'rgba(15,5,0,.34)',
            wallBase:'#765033', wallHighlight:'#c79a63', wallShadow:'#4a2d1b', wallInset:'#2d1a10', wallDeep:'#170b06', wallAccent:'#e8a24a',
            blockBase:'#8b451f', blockHighlight:'#d48a3a', blockShadow:'#5a2612', blockPattern:'#a85a28', blockCore:'#351207',
            bombPlayerRing:'rgba(251,191,36,.88)', bombMovingFill:'rgba(245,158,11,.18)', bombMovingStroke:'rgba(251,191,36,.82)', bombBody:'#1a100b', bombCap:'#8d6b4d', bombSparkHot:'#fde68a', bombSparkDanger:'#f97316', bombFuse:'#ffedd5',
            fireOuter:'rgba(234,88,12,.90)', bombGlow:'rgba(245,158,11,.24)', bombGlowOuter:'rgba(180,83,9,0)', fireMiddle:'#f97316', fireCore:'#fde68a',
            particleImpact:'#f7d18a', particleFire:'#fb923c', particleBlock:'#b45309', particleDanger:'#ef4444', particleShield:'#f59e0b', particleLoot:'#fbbf24', particleEnemy:'#fb923c', particleEnemyElite:'#fda4af', particleBoss:'#dc2626',
            feedbackRingSoft:'#fed7aa', feedbackFlash:'#fff7ed', ambientDust:'rgba(255,191,105,.48)'
        },
        { floor:'procedural:autumn-floor', wall:'procedural:autumn-wall', brick:'procedural:autumn-block', blockStyle:'leaf-crate', barrelStyle:'leaf-barrel', bomb:'procedural:autumn-bomb', fire:'procedural:autumn-flame' },
        { tipo:'dust', color:'ambientDust', densidad:1.15, velocidad:.26, sizeMin:1, sizeMax:2, alpha:.5 }
    );

    const SPRING_THEME = createVisualThemeV461(
        'spring',
        'Primavera',
        {
            background:'#07130d', floorA:'#163321', floorB:'#20462d', floorHighlight:'rgba(187,247,208,.055)', floorShadow:'rgba(0,18,8,.30)',
            wallBase:'#52745b', wallHighlight:'#9bd3a7', wallShadow:'#304b36', wallInset:'#1d3223', wallDeep:'#0c1c11', wallAccent:'#7ee2a1',
            blockBase:'#5c7f4c', blockHighlight:'#a3c969', blockShadow:'#36502a', blockPattern:'#6f944f', blockCore:'#1e3318',
            bombPlayerRing:'rgba(134,239,172,.88)', bombMovingFill:'rgba(74,222,128,.15)', bombMovingStroke:'rgba(134,239,172,.82)', bombBody:'#0c1b12', bombCap:'#668b70', bombSparkHot:'#dcfce7', bombSparkDanger:'#fb7185', bombFuse:'#ecfdf5',
            fireOuter:'rgba(34,197,94,.84)', bombGlow:'rgba(74,222,128,.20)', bombGlowOuter:'rgba(22,101,52,0)', fireMiddle:'#4ade80', fireCore:'#ecfccb',
            particleImpact:'#d9f99d', particleFire:'#86efac', particleBlock:'#65a30d', particleDanger:'#fb7185', particleShield:'#67e8f9', particleLoot:'#facc15', particleEnemy:'#34d399', particleEnemyElite:'#f9a8d4', particleBoss:'#e879f9',
            feedbackRingSoft:'#bbf7d0', feedbackFlash:'#f0fdf4', ambientDust:'rgba(187,247,208,.42)'
        },
        { floor:'procedural:spring-floor', wall:'procedural:moss-wall', brick:'procedural:hedge-block', blockStyle:'garden-crate', barrelStyle:'garden-pot', bomb:'procedural:spring-bomb', fire:'procedural:verdant-flame' },
        { tipo:'dust', color:'ambientDust', densidad:1.2, velocidad:.18, sizeMin:1, sizeMax:2, alpha:.4 }
    );

    const SUMMER_THEME = createVisualThemeV461(
        'summer',
        'Verano',
        {
            background:'#10100a', floorA:'#40371a', floorB:'#655523', floorHighlight:'rgba(255,244,180,.06)', floorShadow:'rgba(28,21,0,.34)',
            wallBase:'#8a7440', wallHighlight:'#e4c66a', wallShadow:'#5b471f', wallInset:'#392a10', wallDeep:'#1b1306', wallAccent:'#f6d36b',
            blockBase:'#b2742a', blockHighlight:'#f0b85a', blockShadow:'#70410f', blockPattern:'#c88732', blockCore:'#3f2108',
            bombPlayerRing:'rgba(45,212,191,.88)', bombMovingFill:'rgba(20,184,166,.16)', bombMovingStroke:'rgba(45,212,191,.80)', bombBody:'#14201e', bombCap:'#7b8f86', bombSparkHot:'#fef3c7', bombSparkDanger:'#14b8a6', bombFuse:'#fff7ed',
            fireOuter:'rgba(249,115,22,.90)', bombGlow:'rgba(245,158,11,.22)', bombGlowOuter:'rgba(180,83,9,0)', fireMiddle:'#fb923c', fireCore:'#fef08a',
            particleImpact:'#fde68a', particleFire:'#fdba74', particleBlock:'#d97706', particleDanger:'#f43f5e', particleShield:'#2dd4bf', particleLoot:'#fde047', particleEnemy:'#f59e0b', particleEnemyElite:'#fb7185', particleBoss:'#ef4444',
            feedbackRingSoft:'#ccfbf1', feedbackFlash:'#fffbeb', ambientDust:'rgba(253,224,71,.38)'
        },
        { floor:'procedural:sand-floor', wall:'procedural:sunstone-wall', brick:'procedural:sand-block', blockStyle:'sun-crate', barrelStyle:'sun-drum', bomb:'procedural:sun-bomb', fire:'procedural:solar-flame' },
        { tipo:'dust', color:'ambientDust', densidad:.8, velocidad:.12, sizeMin:1, sizeMax:2, alpha:.36 }
    );

    const UNDERGROUND_THEME = createVisualThemeV461(
        'underground',
        'Bajo tierra',
        {
            background:'#0b0713', floorA:'#211532', floorB:'#33204a', floorHighlight:'rgba(221,214,254,.045)', floorShadow:'rgba(8,3,15,.42)',
            wallBase:'#5b4f6f', wallHighlight:'#9f8fbe', wallShadow:'#3a3048', wallInset:'#241b31', wallDeep:'#110b18', wallAccent:'#c4b5fd',
            blockBase:'#66506f', blockHighlight:'#a989ad', blockShadow:'#402d48', blockPattern:'#745a80', blockCore:'#241329',
            bombPlayerRing:'rgba(196,181,253,.88)', bombMovingFill:'rgba(167,139,250,.16)', bombMovingStroke:'rgba(196,181,253,.82)', bombBody:'#110c17', bombCap:'#746888', bombSparkHot:'#f5f3ff', bombSparkDanger:'#e879f9', bombFuse:'#f5f3ff',
            fireOuter:'rgba(192,132,252,.88)', bombGlow:'rgba(168,85,247,.22)', bombGlowOuter:'rgba(76,29,149,0)', fireMiddle:'#c084fc', fireCore:'#f5d0fe',
            particleImpact:'#e9d5ff', particleFire:'#d8b4fe', particleBlock:'#8b5cf6', particleDanger:'#f472b6', particleShield:'#a78bfa', particleLoot:'#f5d0fe', particleEnemy:'#8b5cf6', particleEnemyElite:'#f0abfc', particleBoss:'#c026d3',
            feedbackRingSoft:'#ddd6fe', feedbackFlash:'#faf5ff', ambientDust:'rgba(196,181,253,.36)'
        },
        { floor:'procedural:cavern-floor', wall:'procedural:deep-wall', brick:'procedural:ore-block', blockStyle:'ore-crate', barrelStyle:'ore-barrel', bomb:'procedural:crystal-bomb', fire:'procedural:arcane-flame' },
        { tipo:'dust', color:'ambientDust', densidad:1.05, velocidad:.2, sizeMin:1, sizeMax:2, alpha:.34 }
    );

    const CLOUDS_THEME = createVisualThemeV461(
        'clouds',
        'Nubes',
        {
            background:'#07101c', floorA:'#23364c', floorB:'#38556f', floorHighlight:'rgba(224,242,254,.08)', floorShadow:'rgba(4,14,25,.34)',
            wallBase:'#72869a', wallHighlight:'#c7d8e7', wallShadow:'#4a5e71', wallInset:'#304150', wallDeep:'#152431', wallAccent:'#dbeafe',
            blockBase:'#8299ab', blockHighlight:'#d8e6f1', blockShadow:'#586e81', blockPattern:'#6f8799', blockCore:'#2d4050',
            bombPlayerRing:'rgba(224,242,254,.92)', bombMovingFill:'rgba(147,197,253,.16)', bombMovingStroke:'rgba(191,219,254,.84)', bombBody:'#10202e', bombCap:'#8da7b9', bombSparkHot:'#ffffff', bombSparkDanger:'#60a5fa', bombFuse:'#eff6ff',
            fireOuter:'rgba(96,165,250,.86)', bombGlow:'rgba(125,211,252,.20)', bombGlowOuter:'rgba(59,130,246,0)', fireMiddle:'#93c5fd', fireCore:'#f0f9ff',
            particleImpact:'#e0f2fe', particleFire:'#bae6fd', particleBlock:'#94a3b8', particleDanger:'#60a5fa', particleShield:'#a5f3fc', particleLoot:'#fde68a', particleEnemy:'#38bdf8', particleEnemyElite:'#c4b5fd', particleBoss:'#818cf8',
            feedbackRingSoft:'#dbeafe', feedbackFlash:'#f8fafc', ambientDust:'rgba(219,234,254,.54)'
        },
        { floor:'procedural:cloud-floor', wall:'procedural:sky-wall', brick:'procedural:cloud-block', blockStyle:'cloud-crate', barrelStyle:'cloud-canister', bomb:'procedural:cloud-bomb', fire:'procedural:sky-flame' },
        { tipo:'snow', color:'ambientDust', densidad:.75, velocidad:.28, sizeMin:1, sizeMax:3, alpha:.38 }
    );

    const MOUNTAINS_THEME = createVisualThemeV461(
        'mountains',
        'Montañas',
        {
            background:'#080e13', floorA:'#27333a', floorB:'#38464f', floorHighlight:'rgba(226,232,240,.05)', floorShadow:'rgba(1,6,10,.42)',
            wallBase:'#68747b', wallHighlight:'#b9c5cb', wallShadow:'#3d484e', wallInset:'#273137', wallDeep:'#12191e', wallAccent:'#cbd5e1',
            blockBase:'#6b6258', blockHighlight:'#a8a097', blockShadow:'#464039', blockPattern:'#7d7368', blockCore:'#28231e',
            bombPlayerRing:'rgba(186,230,253,.90)', bombMovingFill:'rgba(148,163,184,.16)', bombMovingStroke:'rgba(203,213,225,.82)', bombBody:'#11171b', bombCap:'#7e8b91', bombSparkHot:'#f8fafc', bombSparkDanger:'#38bdf8', bombFuse:'#f8fafc',
            fireOuter:'rgba(56,189,248,.82)', bombGlow:'rgba(125,211,252,.18)', bombGlowOuter:'rgba(14,116,144,0)', fireMiddle:'#38bdf8', fireCore:'#f0f9ff',
            particleImpact:'#e2e8f0', particleFire:'#7dd3fc', particleBlock:'#a8a29e', particleDanger:'#fb7185', particleShield:'#bae6fd', particleLoot:'#fde68a', particleEnemy:'#94a3b8', particleEnemyElite:'#fca5a5', particleBoss:'#64748b',
            feedbackRingSoft:'#e2e8f0', feedbackFlash:'#f8fafc', ambientDust:'rgba(203,213,225,.34)'
        },
        { floor:'procedural:mountain-floor', wall:'procedural:rock-wall', brick:'procedural:stone-block', blockStyle:'rock-crate', barrelStyle:'rock-barrel', bomb:'procedural:granite-bomb', fire:'procedural:blue-flame' },
        { tipo:'snow', color:'ambientDust', densidad:.48, velocidad:.2, sizeMin:1, sizeMax:2, alpha:.3 }
    );

    const BEACH_THEME = createVisualThemeV461(
        'beach',
        'Playa',
        {
            background:'#061218', floorA:'#16434c', floorB:'#20616a', floorHighlight:'rgba(207,250,254,.065)', floorShadow:'rgba(0,13,18,.36)',
            wallBase:'#557e7d', wallHighlight:'#a9d9cf', wallShadow:'#365b59', wallInset:'#203c3d', wallDeep:'#0c2023', wallAccent:'#67e8f9',
            blockBase:'#a07c4f', blockHighlight:'#d8b985', blockShadow:'#725333', blockPattern:'#b18e5c', blockCore:'#3d2919',
            bombPlayerRing:'rgba(34,211,238,.90)', bombMovingFill:'rgba(45,212,191,.16)', bombMovingStroke:'rgba(103,232,249,.84)', bombBody:'#092027', bombCap:'#6f8e8f', bombSparkHot:'#ecfeff', bombSparkDanger:'#2dd4bf', bombFuse:'#ecfeff',
            fireOuter:'rgba(6,182,212,.84)', bombGlow:'rgba(45,212,191,.20)', bombGlowOuter:'rgba(8,145,178,0)', fireMiddle:'#22d3ee', fireCore:'#ecfeff',
            particleImpact:'#cffafe', particleFire:'#67e8f9', particleBlock:'#d6a76d', particleDanger:'#fb7185', particleShield:'#5eead4', particleLoot:'#fef08a', particleEnemy:'#06b6d4', particleEnemyElite:'#f9a8d4', particleBoss:'#0ea5e9',
            feedbackRingSoft:'#ccfbf1', feedbackFlash:'#ecfeff', ambientDust:'rgba(103,232,249,.34)'
        },
        { floor:'procedural:shore-floor', wall:'procedural:coral-wall', brick:'procedural:sandstone-block', blockStyle:'sand-crate', barrelStyle:'sand-barrel', bomb:'procedural:tide-bomb', fire:'procedural:water-flame' },
        { tipo:'dust', color:'ambientDust', densidad:.65, velocidad:.09, sizeMin:1, sizeMax:2, alpha:.3 }
    );

    const SPACE_THEME = createVisualThemeV461(
        'space',
        'Espacio',
        {
            background:'#030514', floorA:'#11183a', floorB:'#1b2752', floorHighlight:'rgba(165,180,252,.055)', floorShadow:'rgba(0,0,12,.46)',
            wallBase:'#3a466b', wallHighlight:'#7181b8', wallShadow:'#202a4a', wallInset:'#131b31', wallDeep:'#080d1d', wallAccent:'#a5b4fc',
            blockBase:'#414b73', blockHighlight:'#7c8fca', blockShadow:'#252f4f', blockPattern:'#51608e', blockCore:'#141a32',
            bombPlayerRing:'rgba(129,140,248,.92)', bombMovingFill:'rgba(99,102,241,.17)', bombMovingStroke:'rgba(165,180,252,.86)', bombBody:'#080c18', bombCap:'#59658e', bombSparkHot:'#eef2ff', bombSparkDanger:'#22d3ee', bombFuse:'#eef2ff',
            fireOuter:'rgba(99,102,241,.90)', bombGlow:'rgba(129,140,248,.24)', bombGlowOuter:'rgba(79,70,229,0)', fireMiddle:'#818cf8', fireCore:'#e0e7ff',
            particleImpact:'#c7d2fe', particleFire:'#a5b4fc', particleBlock:'#6366f1', particleDanger:'#f472b6', particleShield:'#67e8f9', particleLoot:'#fde68a', particleEnemy:'#22d3ee', particleEnemyElite:'#c084fc', particleBoss:'#e879f9',
            feedbackRingSoft:'#c7d2fe', feedbackFlash:'#eef2ff', ambientDust:'rgba(165,180,252,.42)'
        },
        { floor:'procedural:space-floor', wall:'procedural:starship-wall', brick:'procedural:asteroid-block', blockStyle:'tech-crate', barrelStyle:'tech-drum', bomb:'procedural:cosmic-bomb', fire:'procedural:void-flame' },
        { tipo:'dust', color:'ambientDust', densidad:.7, velocidad:.2, sizeMin:1, sizeMax:2, alpha:.42 }
    );

    const SKY_THEME = createVisualThemeV461(
        'sky',
        'Cielo',
        {
            background:'#10071a', floorA:'#352046', floorB:'#4e2b63', floorHighlight:'rgba(250,232,255,.055)', floorShadow:'rgba(17,3,24,.44)',
            wallBase:'#69547c', wallHighlight:'#b99bc9', wallShadow:'#473556', wallInset:'#2d2038', wallDeep:'#130b19', wallAccent:'#f0abfc',
            blockBase:'#725070', blockHighlight:'#b77a9f', blockShadow:'#4b2d49', blockPattern:'#855d7e', blockCore:'#281526',
            bombPlayerRing:'rgba(240,171,252,.90)', bombMovingFill:'rgba(217,70,239,.16)', bombMovingStroke:'rgba(240,171,252,.84)', bombBody:'#170b1a', bombCap:'#826382', bombSparkHot:'#fdf4ff', bombSparkDanger:'#e879f9', bombFuse:'#fdf4ff',
            fireOuter:'rgba(217,70,239,.86)', bombGlow:'rgba(232,121,249,.22)', bombGlowOuter:'rgba(126,34,206,0)', fireMiddle:'#e879f9', fireCore:'#fdf4ff',
            particleImpact:'#fae8ff', particleFire:'#f0abfc', particleBlock:'#a855f7', particleDanger:'#fb7185', particleShield:'#67e8f9', particleLoot:'#fde68a', particleEnemy:'#d946ef', particleEnemyElite:'#fda4af', particleBoss:'#c026d3',
            feedbackRingSoft:'#f5d0fe', feedbackFlash:'#fdf4ff', ambientDust:'rgba(240,171,252,.40)'
        },
        { floor:'procedural:sky-floor', wall:'procedural:cloudstone-wall', brick:'procedural:twilight-block', blockStyle:'aurora-crate', barrelStyle:'aurora-barrel', bomb:'procedural:aurora-bomb', fire:'procedural:nebula-flame' },
        { tipo:'snow', color:'ambientDust', densidad:.62, velocidad:.16, sizeMin:1, sizeMax:2, alpha:.34 }
    );

    // v6.15: especies por bioma = skin + nombre + exactamente una regla especial.
    // No modifican IA, estadísticas, colisiones, daño ni tipo de enemigo.
    const ENEMY_SKIN_PROFILES_V614 = Object.freeze({
        classic: Object.freeze({
            RASTRERO: Object.freeze({ name:'Rastrero', ruleId:'none', body:'#ef4444', shade:'#991b1b', accent:'#facc15', motif:'classic' }),
            VOLADOR: Object.freeze({ name:'Volador', ruleId:'none', body:'#3b82f6', shade:'#1d4ed8', accent:'#93c5fd', motif:'classic' }),
            ESPECIAL: Object.freeze({ name:'Especial', ruleId:'none', body:'#22c55e', shade:'#15803d', accent:'#bbf7d0', motif:'classic' })
        }),
        winter: Object.freeze({
            RASTRERO: Object.freeze({ name:'Lobo de hielo', ruleId:'ice_resistance', body:'#9dd9ef', shade:'#397b96', accent:'#f5fdff', motif:'snow' }),
            VOLADOR: Object.freeze({ name:'Búho ártico', ruleId:'ice_resistance', body:'#78bce8', shade:'#315f92', accent:'#e0f2fe', motif:'snow' }),
            ESPECIAL: Object.freeze({ name:'Oso de nieve', ruleId:'ice_resistance', body:'#b9e6ef', shade:'#527d8d', accent:'#ffffff', motif:'ice' })
        }),
        autumn: Object.freeze({
            RASTRERO: Object.freeze({ name:'Jabalí', ruleId:'leaf_camouflage', body:'#c96a2d', shade:'#6d2f12', accent:'#f6cf74', motif:'leaf' }),
            VOLADOR: Object.freeze({ name:'Cuervo', ruleId:'leaf_camouflage', body:'#a94d2d', shade:'#64231a', accent:'#ffd27a', motif:'leaf' }),
            ESPECIAL: Object.freeze({ name:'Espantapájaros', ruleId:'leaf_camouflage', body:'#7c6932', shade:'#443914', accent:'#efb34b', motif:'acorn' })
        }),
        spring: Object.freeze({
            RASTRERO: Object.freeze({ name:'Rana', ruleId:'vegetation_regen', body:'#63b86b', shade:'#2e6e3a', accent:'#f5a3c7', motif:'flower' }),
            VOLADOR: Object.freeze({ name:'Abeja', ruleId:'vegetation_regen', body:'#58a9a0', shade:'#245e59', accent:'#f8d36c', motif:'flower' }),
            ESPECIAL: Object.freeze({ name:'Planta carnívora', ruleId:'vegetation_regen', body:'#8abf52', shade:'#4c732c', accent:'#f8b4d9', motif:'vine' })
        }),
        summer: Object.freeze({
            RASTRERO: Object.freeze({ name:'Lagarto', ruleId:'heat_resistance', body:'#d99a32', shade:'#8a5414', accent:'#ffe38a', motif:'sun' }),
            VOLADOR: Object.freeze({ name:'Gaviota', ruleId:'heat_resistance', body:'#4fa7a0', shade:'#235d5a', accent:'#fff0a8', motif:'sun' }),
            ESPECIAL: Object.freeze({ name:'Escarabajo gigante', ruleId:'heat_resistance', body:'#c97938', shade:'#743b18', accent:'#58d8c4', motif:'shell' })
        }),
        underground: Object.freeze({
            RASTRERO: Object.freeze({ name:'Topo', ruleId:'dark_vision', body:'#8e67b7', shade:'#4b2d67', accent:'#d8b4fe', motif:'crystal' }),
            VOLADOR: Object.freeze({ name:'Murciélago', ruleId:'dark_vision', body:'#6f7fb9', shade:'#303b69', accent:'#c4b5fd', motif:'crystal' }),
            ESPECIAL: Object.freeze({ name:'Gusano cavernario', ruleId:'dark_vision', body:'#9e7a61', shade:'#503f35', accent:'#a7f3d0', motif:'ore' })
        }),
        clouds: Object.freeze({
            RASTRERO: Object.freeze({ name:'Criatura de nube', ruleId:'floatation', body:'#b9d8ea', shade:'#607f96', accent:'#ffffff', motif:'cloud' }),
            VOLADOR: Object.freeze({ name:'Ave celestial', ruleId:'floatation', body:'#9dbce0', shade:'#516987', accent:'#dbeafe', motif:'cloud' }),
            ESPECIAL: Object.freeze({ name:'Elemental de tormenta', ruleId:'floatation', body:'#cad7e3', shade:'#6b7c8e', accent:'#93c5fd', motif:'storm' })
        }),
        mountains: Object.freeze({
            RASTRERO: Object.freeze({ name:'Cabra montés', ruleId:'stability', body:'#817d75', shade:'#45423e', accent:'#e5d8b8', motif:'rock' }),
            VOLADOR: Object.freeze({ name:'Águila', ruleId:'stability', body:'#607a79', shade:'#30403f', accent:'#d8eadf', motif:'feather' }),
            ESPECIAL: Object.freeze({ name:'Golem de piedra', ruleId:'stability', body:'#8c7461', shade:'#4b382d', accent:'#d8b08c', motif:'rock' })
        }),
        beach: Object.freeze({
            RASTRERO: Object.freeze({ name:'Cangrejo', ruleId:'terrain_mobility', body:'#e0a353', shade:'#855624', accent:'#8ee7e0', motif:'shell' }),
            VOLADOR: Object.freeze({ name:'Gaviota costera', ruleId:'terrain_mobility', body:'#54b6c5', shade:'#276673', accent:'#f6e3a6', motif:'fin' }),
            ESPECIAL: Object.freeze({ name:'Pulpo', ruleId:'terrain_mobility', body:'#d17d5a', shade:'#713f31', accent:'#f8c46c', motif:'reef' })
        }),
        space: Object.freeze({
            RASTRERO: Object.freeze({ name:'Insecto alienígena', ruleId:'environment_immunity', body:'#7e7cf0', shade:'#36358a', accent:'#57e6ff', motif:'visor' }),
            VOLADOR: Object.freeze({ name:'Dron orgánico', ruleId:'environment_immunity', body:'#4f9fd8', shade:'#254d76', accent:'#c7d2fe', motif:'drone' }),
            ESPECIAL: Object.freeze({ name:'Criatura extraterrestre', ruleId:'environment_immunity', body:'#9c6cf3', shade:'#4a2b82', accent:'#6ee7ff', motif:'tech' })
        }),
        sky: Object.freeze({
            RASTRERO: Object.freeze({ name:'Querubín', ruleId:'high_altitude_speed', body:'#d58de5', shade:'#703f7c', accent:'#8ff3e7', motif:'halo' }),
            VOLADOR: Object.freeze({ name:'Ave luminosa', ruleId:'high_altitude_speed', body:'#9fa9e8', shade:'#505a8e', accent:'#f0abfc', motif:'halo' }),
            ESPECIAL: Object.freeze({ name:'Guardián celeste', ruleId:'high_altitude_speed', body:'#ba83cf', shade:'#603a6f', accent:'#a7f3d0', motif:'star' })
        }),
        inferno: Object.freeze({
            RASTRERO: Object.freeze({ name:'Sabueso infernal', ruleId:'lava_immunity', body:'#e85b2a', shade:'#741f0d', accent:'#ffd166', motif:'horns' }),
            VOLADOR: Object.freeze({ name:'Demonio alado', ruleId:'lava_immunity', body:'#8f3e37', shade:'#46130f', accent:'#ff9b55', motif:'ember' }),
            ESPECIAL: Object.freeze({ name:'Diablillo', ruleId:'lava_immunity', body:'#b43d21', shade:'#57170b', accent:'#ffe066', motif:'demon' })
        })
    });

    function getEnemySkinV614(enemyOrType) {
        const type = enemyOrType?.type || enemyOrType;
        const typeKey = type === ENEMY_TYPES?.RASTRERO || type?.name === 'Rastrero' ? 'RASTRERO'
            : type === ENEMY_TYPES?.VOLADOR || type?.name === 'Volador' ? 'VOLADOR'
            : type === ENEMY_TYPES?.ESPECIAL || type?.name === 'Especial' ? 'ESPECIAL'
            : 'RASTRERO';
        const theme = getThemeV46();
        return ENEMY_SKIN_PROFILES_V614[theme.id]?.[typeKey] || ENEMY_SKIN_PROFILES_V614.classic[typeKey];
    }

    global.ENEMY_SKIN_PROFILES_V614 = ENEMY_SKIN_PROFILES_V614;
    global.getEnemySkinV614 = getEnemySkinV614;
    global.getEnemySpeciesVisualProfileV615 = getEnemySkinV614;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEnemySkin = getEnemySkinV614;

    const registry = { classic: CLASSIC_THEME, winter: WINTER_THEME, autumn: AUTUMN_THEME, spring: SPRING_THEME, summer: SUMMER_THEME, underground: UNDERGROUND_THEME, clouds: CLOUDS_THEME, mountains: MOUNTAINS_THEME, beach: BEACH_THEME, space: SPACE_THEME, sky: SKY_THEME, inferno: INFERNO_THEME };
    let activeThemeId = 'classic';

    function getThemeV46() {
        return registry[activeThemeId] || CLASSIC_THEME;
    }

    function getThemePaletteV46() {
        return getThemeV46().paleta;
    }

    function themeColorV46(key, fallback = '#ffffff') {
        const palette = getThemePaletteV46();
        return Object.prototype.hasOwnProperty.call(palette, key) ? palette[key] : fallback;
    }

    function themeSpriteV46(key, fallback = null) {
        const sprites = getThemeV46().sprites;
        return Object.prototype.hasOwnProperty.call(sprites, key) ? sprites[key] : fallback;
    }

    function themeAudioV46(key, fallback = key) {
        const sfx = getThemeV46().audio?.sfx || {};
        return Object.prototype.hasOwnProperty.call(sfx, key) ? sfx[key] : fallback;
    }

    function themeParticleColorV46(key, fallback = '#ffffff') {
        return themeColorV46(key, fallback);
    }

    function applyThemeCssTokensV46() {
        if (!global.document?.documentElement) return false;
        const root = global.document.documentElement;
        const palette = getThemePaletteV46();
        root.style.setProperty('--theme-background', palette.background);
        root.style.setProperty('--theme-floor-a', palette.floorA);
        root.style.setProperty('--theme-floor-b', palette.floorB);
        root.style.setProperty('--theme-accent', palette.wallAccent);
        if (global.document.body) global.document.body.setAttribute('data-theme', activeThemeId);
        return true;
    }

    function updateThemeSelectorV461() {
        const theme = getThemeV46();
        global.document?.querySelectorAll?.('[data-theme-option]').forEach(button => {
            const active = button.getAttribute('data-theme-option') === activeThemeId;
            button.classList.toggle('is-selected', active);
            button.setAttribute('aria-checked', active ? 'true' : 'false');
        });
    }

    function setActiveThemeV46(id, persist = true) {
        if (!registry[id]) return false;
        activeThemeId = id;
        global.BOMBER_THEME = registry[id];
        applyThemeCssTokensV46();
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
        if (persist) {
            try { global.localStorage.setItem(THEME_STORAGE_V461, id); } catch (_) {}
        }
        updateThemeSelectorV461();
        return true;
    }

    function getThemeOptionsV461() {
        return Object.keys(registry).filter(id => id !== 'classic').map(id => registry[id]);
    }

    function initializeThemeV461() {
        let stored = null;
        try { stored = global.localStorage.getItem(THEME_STORAGE_V461); } catch (_) {}
        setActiveThemeV46(registry[stored] ? stored : 'classic', false);

        global.document?.querySelectorAll?.('[data-theme-option]').forEach(button => {
            button.addEventListener('click', () => {
                if (typeof global.initAudio === 'function') global.initAudio();
                if (global.audioCtx?.resume) global.audioCtx.resume();
                if (typeof global.sfx === 'function') global.sfx('click');
                setActiveThemeV46(button.getAttribute('data-theme-option'));
            });
        });
        updateThemeSelectorV461();
        return getThemeV46();
    }

    global.BOMBER_THEME = CLASSIC_THEME;
    global.THEMES_V46 = registry;
    global.getThemeV46 = getThemeV46;
    global.getThemePaletteV46 = getThemePaletteV46;
    global.themeColorV46 = themeColorV46;
    global.themeSpriteV46 = themeSpriteV46;
    global.themeAudioV46 = themeAudioV46;
    global.themeParticleColorV46 = themeParticleColorV46;
    global.setActiveThemeV46 = setActiveThemeV46;
    global.getThemeOptionsV461 = getThemeOptionsV461;
    global.applyThemeCssTokensV46 = applyThemeCssTokensV46;
    global.initializeThemeV461 = initializeThemeV461;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getTheme = getThemeV46;
    global.BOMBER_ENGINE.getThemeRegistry = () => ({ ...registry });
    global.BOMBER_ENGINE.getThemeId = () => activeThemeId;
    global.BOMBER_ENGINE.getThemeMetadata = () => {
        const theme = getThemeV46();
        return {
            id: theme.id,
            nombre: theme.nombre,
            type: theme.tipo,
            visualOnly: theme.tipo === 'visual-only',
            mechanics: [...theme.mecanicas],
            hazards: [],
            levelGeneration: { ...theme.nivelGen },
            enemyPool: [...theme.enemigos.pool],
            powerupPool: [...theme.powerups.pool]
        };
    };

    if (global.document?.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initializeThemeV461, { once: true });
    } else {
        initializeThemeV461();
    }
})(window);

;
// === js/05-mechanics-registry.js ===
// Bomberman Roguelike v5.4 — Mechanics Registry
// Theme declara IDs. Este módulo resuelve esos IDs a comportamiento reutilizable.
// Ninguna mecánica conoce ni depende de un tema concreto.
(function initMechanicsRegistryV47(global) {
    'use strict';

    const DEFAULT_MOVEMENT = Object.freeze({
        acceleration: 1,
        braking: 1,
        turnCarrySpeed: 1,
        speedMultiplier: 1
    });

    const MECHANICS = Object.freeze({
        slippery: Object.freeze({
            id: 'slippery',
            nombre: 'Suelo resbaladizo',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.92, braking: 0.38, turnCarrySpeed: 1.08, speedMultiplier: 1, stopDeadzone: 0.035 })
        }),
        wind_push: Object.freeze({
            id: 'wind_push',
            nombre: 'Viento',
            category: 'environment',
            wind: Object.freeze({ cycleMs: 2800, gustMs: 900, strength: 0.72, decay: 0.68 })
        }),
        darkness: Object.freeze({
            id: 'darkness',
            nombre: 'Oscuridad',
            category: 'visibility',
            visibility: Object.freeze({ radius: 145, midStop: 0.56, midAlpha: 0.28, outerAlpha: 0.84 })
        }),
        low_gravity: Object.freeze({
            id: 'low_gravity',
            nombre: 'Baja gravedad',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.78, braking: 0.62, turnCarrySpeed: 1.15, speedMultiplier: 1.04 })
        }),
        sand_drift: Object.freeze({
            id: 'sand_drift',
            nombre: 'Deriva de arena',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.88, braking: 0.72, turnCarrySpeed: 1.03, speedMultiplier: 0.94 })
        }),
        water_drag: Object.freeze({
            id: 'water_drag',
            nombre: 'Arrastre de agua',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.82, braking: 1.18, turnCarrySpeed: 0.96, speedMultiplier: 0.86 })
        }),
        muddy: Object.freeze({
            id: 'muddy',
            nombre: 'Terreno pesado',
            category: 'movement',
            movement: Object.freeze({ acceleration: 0.72, braking: 1.25, turnCarrySpeed: 0.82, speedMultiplier: 0.82 })
        })
    });

    function mergeConfig(base, override) {
        if (!base || typeof base !== 'object') return override && typeof override === 'object' ? { ...override } : {};
        if (!override || typeof override !== 'object') return { ...base };
        const result = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) result[key] = mergeConfig(result[key], value);
            else result[key] = value;
        }
        return result;
    }

    function getMechanicConfig(id) {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        const themeConfig = theme?.mechanicConfig?.[id] || {};
        const stageConfig = (typeof gameState !== 'undefined' ? gameState.biomeV49?.stageConfig?.mechanics?.[id] : null) || {};
        return mergeConfig(themeConfig, stageConfig);
    }

    function getActiveMechanicIds() {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        const ids = theme?.mechanics || theme?.mecanicas;
        if (!Array.isArray(ids)) return [];
        return ids.filter(id => {
            if (!MECHANICS[id]) return false;
            const stageConfig = (typeof gameState !== 'undefined' ? gameState.biomeV49?.stageConfig?.mechanics?.[id] : null);
            return stageConfig?.enabled !== false;
        });
    }

    function getActiveMechanics() {
        return getActiveMechanicIds().map(id => MECHANICS[id]);
    }

    function getMovementModifiersV47() {
        const result = { ...DEFAULT_MOVEMENT };

        for (const id of getActiveMechanicIds()) {
            const movement = MECHANICS[id].movement;
            if (!movement) continue;
            const configured = getMechanicConfig(id).movement || getMechanicConfig(id);
            result.acceleration *= Number.isFinite(configured.acceleration) ? configured.acceleration : (Number.isFinite(movement.acceleration) ? movement.acceleration : 1);
            result.braking *= Number.isFinite(configured.braking) ? configured.braking : (Number.isFinite(movement.braking) ? movement.braking : 1);
            result.turnCarrySpeed *= Number.isFinite(configured.turnCarrySpeed) ? configured.turnCarrySpeed : (Number.isFinite(movement.turnCarrySpeed) ? movement.turnCarrySpeed : 1);
            result.speedMultiplier *= Number.isFinite(configured.speedMultiplier) ? configured.speedMultiplier : (Number.isFinite(movement.speedMultiplier) ? movement.speedMultiplier : 1);
        }

        return Object.freeze(result);
    }

    function getWindPushV471() {
        const mechanic = MECHANICS.wind_push;
        if (!getActiveMechanicIds().includes('wind_push')) {
            return Object.freeze({ active: false, axis: null, dir: 0, strength: 0 });
        }
        const configured = { ...mechanic.wind, ...(getMechanicConfig('wind_push').wind || getMechanicConfig('wind_push')) };

        const state = global.BOMBER_ENGINE?.getState?.();
        const roomTime = Math.max(0, Number(state?.roomTime) || 0);
        const cycleMs = Math.max(100, Number(configured.cycleMs) || mechanic.wind.cycleMs);
        const gustMs = Math.min(cycleMs, Math.max(0, Number(configured.gustMs) || mechanic.wind.gustMs));
        const phase = roomTime % cycleMs;
        if (phase >= gustMs) {
            return Object.freeze({ active: false, axis: null, dir: 0, strength: 0 });
        }

        const step = Math.floor(roomTime / cycleMs) % 4;
        const directions = [
            { axis: 'x', dir: 1 },
            { axis: 'y', dir: 1 },
            { axis: 'x', dir: -1 },
            { axis: 'y', dir: -1 }
        ];
        const direction = directions[step];
        const progress = phase / gustMs;
        const envelope = progress < 0.35
            ? progress / 0.35
            : Math.max(0, 1 - (progress - 0.35) / 0.65);
        const configuredStrength = Number(configured.strength);
        const configuredDecay = Number(configured.decay);
        const baseStrength = Number.isFinite(configuredStrength) ? configuredStrength : mechanic.wind.strength;
        const decay = Number.isFinite(configuredDecay) ? configuredDecay : mechanic.wind.decay;
        const strength = baseStrength * (decay + (1 - decay) * envelope);

        return Object.freeze({
            active: strength > 0.001,
            axis: direction.axis,
            dir: direction.dir,
            strength
        });
    }

    function getDarknessProfileV471() {
        const mechanic = MECHANICS.darkness;
        const active = getActiveMechanicIds().includes('darkness');
        if (!active) return Object.freeze({ enabled: false });
        const configured = { ...mechanic.visibility, ...(getMechanicConfig('darkness').visibility || getMechanicConfig('darkness')) };
        return Object.freeze({
            enabled: true,
            radius: Number(configured.radius) || mechanic.visibility.radius,
            midStop: Number(configured.midStop) || mechanic.visibility.midStop,
            midAlpha: Number.isFinite(Number(configured.midAlpha)) ? Number(configured.midAlpha) : mechanic.visibility.midAlpha,
            outerAlpha: Number.isFinite(Number(configured.outerAlpha)) ? Number(configured.outerAlpha) : mechanic.visibility.outerAlpha
        });
    }

    function getMechanicsMetadataV47() {
        return getActiveMechanics().map(mechanic => ({
            id: mechanic.id,
            nombre: mechanic.nombre,
            category: mechanic.category
        }));
    }

    global.MECHANICS = MECHANICS;
    global.getActiveMechanicIdsV47 = getActiveMechanicIds;
    global.getActiveMechanicsV47 = getActiveMechanics;
    global.getMovementModifiersV47 = getMovementModifiersV47;
    global.getMechanicConfigV49 = getMechanicConfig;
    global.getWindPushV471 = getWindPushV471;
    global.getDarknessProfileV471 = getDarknessProfileV471;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getMechanicsRegistry = () => ({ ...MECHANICS });
    global.BOMBER_ENGINE.getActiveMechanicIds = getActiveMechanicIds;
    global.BOMBER_ENGINE.getActiveMechanics = getMechanicsMetadataV47;
    global.BOMBER_ENGINE.getMovementModifiers = getMovementModifiersV47;
    global.BOMBER_ENGINE.getMechanicConfig = getMechanicConfig;
    global.BOMBER_ENGINE.getWindPush = getWindPushV471;
    global.BOMBER_ENGINE.getDarknessProfile = getDarknessProfileV471;

})(window);

;
// === js/06-relics.js ===
// Bomberman Roguelike v3.14 — Powerups & Relics 2
// Categorías de build y modificadores combinables.

const RELIC_CATEGORIES = {
    BOMB: { id: 'BOMB', label: 'BOMB', icon: '💣', color: '#fbbf24' },
    FIRE: { id: 'FIRE', label: 'FIRE', icon: '🔥', color: '#fb923c' },
    SPEED: { id: 'SPEED', label: 'SPEED', icon: '⚡', color: '#34d399' },
    DEFENSE: { id: 'DEFENSE', label: 'DEFENSE', icon: '🛡', color: '#60a5fa' },
    MOVEMENT: { id: 'MOVEMENT', label: 'MOVEMENT', icon: '🧲', color: '#22d3ee' },
    RISK: { id: 'RISK', label: 'RISK', icon: '☠', color: '#f43f5e' },
    ECONOMY: { id: 'ECONOMY', label: 'ECONOMY', icon: '¢', color: '#facc15' }
};

const RELIC_MOD_DEFAULTS = {
    bombFuseMultiplier: 1,
    turnAssistBonus: 0,
    turnSnapBonus: 0,
    inputBufferBonus: 0,
    unstablePowder: false,
    economyBonus: 0
};

function resetRelicModifiers(){
    gameState.relicMods = { ...RELIC_MOD_DEFAULTS };
}

function getRelicCategoryMeta(category){
    return RELIC_CATEGORIES[category] || RELIC_CATEGORIES.BOMB;
}

function getRelicCategoryLabel(category){
    const meta = getRelicCategoryMeta(category);
    return `${meta.icon} ${meta.label}`;
}

function getRelicCategoryColor(category){
    return getRelicCategoryMeta(category).color;
}

function getBombFuseMultiplier(){
    return Math.max(0.5, Number(gameState.relicMods?.bombFuseMultiplier || 1));
}

function getPlayerExplosionInset(exp){
    if (exp?.owner === 'player' && gameState.relicMods?.unstablePowder) return 1;
    return 5;
}

function applyRelicCategoryMetadata(relic){
    if (!relic) return relic;
    const meta = getRelicCategoryMeta(relic.category);
    relic.categoryLabel = meta.label;
    relic.categoryIcon = meta.icon;
    relic.categoryColor = meta.color;
    return relic;
}

// Categorías para las reliquias que ya existían en la run.
const existingRelicCategories = {
    ember_core: 'FIRE',
    twin_fuse: 'BOMB',
    iron_boots: 'SPEED',
    heart_engine: 'DEFENSE',
    ward_plate: 'DEFENSE',
    lucky_charm: 'ECONOMY',
    war_trophy: 'RISK',
    merchant_seal: 'ECONOMY'
};

Object.keys(existingRelicCategories).forEach(id => {
    const relic = RELICS.find(r => r.id === id);
    if (relic) applyRelicCategoryMetadata(Object.assign(relic, { category: existingRelicCategories[id] }));
});

const RELICS_V314 = [
    {
        id: 'short_fuse', icon: '⏱', name: 'MECHA CORTA', rarity: 'UNCOMMON', category: 'BOMB',
        desc: 'Las bombas tienen una mecha 28% más corta.',
        apply: () => { gameState.relicMods.bombFuseMultiplier *= 0.72; }
    },
    {
        id: 'unstable_powder', icon: '🧨', name: 'PÓLVORA INESTABLE', rarity: 'RARE', category: 'RISK',
        desc: '+1 rango de bomba. Tus propias explosiones son menos tolerantes al roce.',
        apply: () => { gameState.relicMods.unstablePowder = true; if (typeof clampPlayerCapacitiesV67 === 'function') clampPlayerCapacitiesV67(); }
    },
    {
        id: 'magnetic_boots', icon: '🧲', name: 'BOTAS MAGNÉTICAS', rarity: 'RARE', category: 'MOVEMENT',
        desc: 'Mejora la asistencia de giro y amplía la ventana para tomar una esquina.',
        apply: () => {
            gameState.relicMods.turnAssistBonus += 4;
            gameState.relicMods.turnSnapBonus += 1.25;
            gameState.relicMods.inputBufferBonus += 75;
        }
    },
    {
        id: 'heat_lens', icon: '🔆', name: 'LENTE TÉRMICA', rarity: 'UNCOMMON', category: 'FIRE',
        desc: '+1 rango de bomba y +10% de puntuación por objetivos dañados con fuego.',
        apply: () => { gameState.fireScoreMult = (gameState.fireScoreMult || 1) + 0.10; }
    },
    {
        id: 'salvage_core', icon: '🪙', name: 'NÚCLEO DE SALVAMENTO', rarity: 'UNCOMMON', category: 'ECONOMY',
        desc: '+20% de monedas obtenidas. Se combina con otros bonos económicos.',
        apply: () => { gameState.coinBonus += 0.20; gameState.relicMods.economyBonus += 0.20; }
    },
    {
        id: 'kinetic_shell', icon: '🔷', name: 'CAPARAZÓN CINÉTICO', rarity: 'RARE', category: 'DEFENSE',
        desc: 'Tras recibir un golpe obtenés 250 ms adicionales de invulnerabilidad.',
        apply: () => { gameState.hitInvulnerabilityBonus = (gameState.hitInvulnerabilityBonus || 0) + 250; }
    }
];

RELICS_V314.forEach(relic => applyRelicCategoryMetadata(relic));
RELICS.push(...RELICS_V314);

const ROGUELIKE_RELICS_CANONICAL_V613 = [
    { id:'ember_core_rogue', icon:'🔥', name:'NÚCLEO DE BRASA', rarity:'COMMON', category:'FIRE', roguelikeOnly:true, tags:['combustion'], bonuses:{ range:1 }, desc:'+1 rango de bomba.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'double_charge', icon:'💣', name:'DOBLE CARGA', rarity:'COMMON', category:'BOMB', roguelikeOnly:true, tags:['demolition'], bonuses:{ bombs:1 }, desc:'+1 bomba máxima.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'hot_boots', icon:'👟', name:'BOTAS CALIENTES', rarity:'COMMON', category:'SPEED', roguelikeOnly:true, tags:['mobility'], bonuses:{ speed:0.35 }, desc:'+0.35 velocidad.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'salvage_hook', icon:'🪝', name:'GANCHO CHATARRERO', rarity:'COMMON', category:'ECONOMY', roguelikeOnly:true, tags:['economy'], bonuses:{ coinBlock:1 }, desc:'+1 moneda por bloque destruido.', apply:()=>{} },
    { id:'bounty_seal', icon:'¢', name:'SELLO DE COBRO', rarity:'COMMON', category:'ECONOMY', roguelikeOnly:true, tags:['economy','combat'], bonuses:{ coinEnemy:2 }, desc:'+2 monedas por enemigo eliminado.', apply:()=>{} },
    { id:'iron_heart', icon:'♥', name:'CORAZÓN DE HIERRO', rarity:'UNCOMMON', category:'DEFENSE', roguelikeOnly:true, tags:['survival'], bonuses:{ maxHealth:1 }, desc:'+1 vida máxima.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'blast_capacitor', icon:'⚡', name:'CAPACITOR DE ESTALLIDO', rarity:'UNCOMMON', category:'BOMB', roguelikeOnly:true, tags:['combustion','demolition'], bonuses:{ range:1, fuseMs:-200 }, desc:'+1 rango y mecha 200 ms más corta.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'quick_wick', icon:'⏱', name:'MECHA CORTA', rarity:'UNCOMMON', category:'BOMB', roguelikeOnly:true, tags:['demolition','mobility'], bonuses:{ fuseMs:-350 }, desc:'Mecha 350 ms más corta.', apply:()=>{} },
    { id:'greedy_spark', icon:'✦', name:'CHISPA CODICIOSA', rarity:'UNCOMMON', category:'ECONOMY', roguelikeOnly:true, tags:['economy'], bonuses:{ coinMultiplier:0.20 }, desc:'+20% a todas las monedas ganadas.', apply:()=>{} },
    { id:'glass_fuse', icon:'◆', name:'MECHA DE VIDRIO', rarity:'RARE', category:'RISK', roguelikeOnly:true, tags:['combustion','risk'], bonuses:{ range:2, maxHealth:-1 }, desc:'+2 rango, -1 vida máxima.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'redline', icon:'↯', name:'LÍNEA ROJA', rarity:'RARE', category:'RISK', roguelikeOnly:true, tags:['mobility','risk'], bonuses:{ speed:0.6, maxHealth:-1 }, desc:'+0.6 velocidad, -1 vida máxima.', apply:()=>{ clampPlayerCapacitiesV67(); if(typeof rogueV327ApplyDerivedBonuses==='function') rogueV327ApplyDerivedBonuses(); } },
    { id:'last_stand', icon:'🛡', name:'ÚLTIMA RESERVA', rarity:'RARE', category:'DEFENSE', roguelikeOnly:true, tags:['survival','risk'], bonuses:{ roomHeal:1 }, desc:'Recuperás 1 vida al entrar a cada sala.', apply:()=>{} }
];

ROGUELIKE_RELICS_CANONICAL_V613.forEach(relic => applyRelicCategoryMetadata(relic));
RELICS.push(...ROGUELIKE_RELICS_CANONICAL_V613);

// Categoría por defecto para cualquier reliquia futura añadida por otro módulo.
RELICS.forEach(applyRelicCategoryMetadata);

if (!gameState.relicMods) resetRelicModifiers();

;
// === js/07-input.js ===
// Bomberman Roguelike v3.6 — Keyboard, D-pad móvil, bomba y pausa

        function togglePause() {
            if (!gameState.isPlaying) return;
            gameState.paused = !gameState.paused;
            const screen = document.getElementById('pause-screen');
            if (screen) screen.classList.toggle('hidden', !gameState.paused);
            if (window.BOMBER_AUDIO) {
                if (gameState.paused) {
                    window.BOMBER_AUDIO.onPause();
                } else {
                    window.BOMBER_AUDIO.onResume();
                }
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
        });

        // v6.9.5: el movimiento táctil usa exclusivamente el D-pad digital.
        // El movimiento táctil usa exclusivamente el D-pad digital, alineado
        // con el sistema de movimiento por tiles.

        // V3.10: un único sistema de input para bomba.
        // Una pulsación coloca una bomba; mantener pulsado permite repetir con
        // retardo/cooldown controlados y nunca depende del auto-repeat del teclado.
        const setupBombInput = () => {
            const bombBtn = document.getElementById('btn-bomb-mobile');
            const startHold = (event, source='input') => {
                event?.preventDefault?.();
                if (typeof beginBombHold === 'function') beginBombHold(source, event);
            };
            const endHold = (event) => {
                event?.preventDefault?.();
                bombBtn?.classList.remove('is-pressed');
                if (typeof endBombHold === 'function') endBombHold();
            };

            window.addEventListener('keydown', (e) => {
                if (e.code !== 'Space' && e.code !== 'KeyZ') return;
                if (!gameState.isPlaying) return;
                e.preventDefault();
                if (e.repeat) return;
                startHold(e, 'keyboard');
            });
            window.addEventListener('keyup', (e) => {
                if (e.code === 'Space' || e.code === 'KeyZ') endHold(e);
            });
            window.addEventListener('blur', () => endHold());

            if (!bombBtn) return;
            bombBtn.addEventListener('pointerdown', (e) => {
                bombBtn.classList.add('is-pressed');
                startHold(e, 'pointer');
                try { bombBtn.setPointerCapture(e.pointerId); } catch (_) {}
            }, {passive:false});
            bombBtn.addEventListener('pointerup', endHold, {passive:false});
            bombBtn.addEventListener('pointercancel', endHold, {passive:false});
            bombBtn.addEventListener('contextmenu', (e) => e.preventDefault());
        };
        setupBombInput();



// v6.31.4 — Controles táctiles invisibles: izquierda mueve; derecha toca/ mantiene.
(function setupInvisibleTouchControlsV6314() {
    const moveZone = document.getElementById('mobile-gesture-zone');
    const actionZone = document.getElementById('mobile-action-zone');
    if (!moveZone || !actionZone) return;

    const dirs = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const movePointers = new Map();
    const actionPointers = new Map();
    const threshold = 22;
    const longPressMs = 360;

    function canControl() {
        return !!(gameState?.isPlaying && !gameState.paused && !document.hidden);
    }
    function isTouchLayout() {
        return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    }
    function getCarriedBomb() {
        if (typeof window.getCarriedBombForEntityV682 !== 'function' || !window.player) return null;
        return window.getCarriedBombForEntityV682(window.player) || null;
    }
    function move(dir) {
        const v = dirs[dir];
        if (!v || !canControl() || !gameState?.touchControls) return;
        gameState.touchControls.x = v[0];
        gameState.touchControls.y = v[1];
        gameState.touchControls.queuedX = v[0];
        gameState.touchControls.queuedY = v[1];
        gameState.lastMoveAxis = v[0] ? 'horizontal' : 'vertical';
        gameState.lastMoveInputAt = performance.now();
    }
    function clearMove(id) {
        movePointers.delete(id);
        if (!movePointers.size && gameState?.touchControls) {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
        }
    }
    function performShortTap() {
        if (!canControl()) return;
        // Existing bomb placement flow: one immediate placement, no repeat-hold.
        if (typeof beginBombHold === 'function') {
            beginBombHold('pointer');
            if (typeof endBombHold === 'function') endBombHold();
        }
    }
    function performLongPress() {
        if (!canControl()) return;
        if (getCarriedBomb()) {
            if (typeof window.throwCarriedBombV683 === 'function') {
                window.throwCarriedBombV683(window.player);
            }
        } else if (typeof window.tryGrabPlayerBombV610 === 'function') {
            window.tryGrabPlayerBombV610();
        }
    }
    function cancelAction(id) {
        const state = actionPointers.get(id);
        if (!state) return;
        if (state.timer) window.clearTimeout(state.timer);
        actionPointers.delete(id);
    }
    function reset() {
        for (const id of actionPointers.keys()) cancelAction(id);
        movePointers.clear();
        if (gameState?.touchControls) {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
            gameState.touchControls.queuedX = 0;
            gameState.touchControls.queuedY = 0;
        }
        if (typeof endBombHold === 'function') endBombHold();
    }

    moveZone.addEventListener('pointerdown', e => {
        if (!isTouchLayout() || !canControl()) return;
        e.preventDefault();
        movePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
        try { moveZone.setPointerCapture(e.pointerId); } catch (_) {}
    }, {passive:false});
    moveZone.addEventListener('pointermove', e => {
        const point = movePointers.get(e.pointerId);
        if (!point) return;
        e.preventDefault();
        const dx = e.clientX - point.x;
        const dy = e.clientY - point.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
        const dir = Math.abs(dx) > Math.abs(dy)
            ? (dx < 0 ? 'left' : 'right')
            : (dy < 0 ? 'up' : 'down');
        point.x = e.clientX;
        point.y = e.clientY;
        move(dir);
    }, {passive:false});
    const releaseMove = e => {
        if (!movePointers.has(e.pointerId)) return;
        e.preventDefault?.();
        clearMove(e.pointerId);
    };
    moveZone.addEventListener('pointerup', releaseMove, {passive:false});
    moveZone.addEventListener('pointercancel', releaseMove, {passive:false});
    moveZone.addEventListener('lostpointercapture', releaseMove);

    actionZone.addEventListener('pointerdown', e => {
        if (!isTouchLayout() || !canControl()) return;
        e.preventDefault();
        if (actionPointers.has(e.pointerId)) return;
        const state = {startedAt:performance.now(), longTriggered:false, timer:null};
        state.timer = window.setTimeout(() => {
            const current = actionPointers.get(e.pointerId);
            if (!current || !canControl()) return;
            current.longTriggered = true;
            performLongPress();
        }, longPressMs);
        actionPointers.set(e.pointerId, state);
        try { actionZone.setPointerCapture(e.pointerId); } catch (_) {}
    }, {passive:false});

    const releaseAction = e => {
        const state = actionPointers.get(e.pointerId);
        if (!state) return;
        e.preventDefault?.();
        if (state.timer) window.clearTimeout(state.timer);
        actionPointers.delete(e.pointerId);
        // A release before the threshold is a short tap: place one bomb.
        if (!state.longTriggered && canControl()) performShortTap();
    };
    actionZone.addEventListener('pointerup', releaseAction, {passive:false});
    actionZone.addEventListener('pointercancel', e => cancelAction(e.pointerId), {passive:false});
    actionZone.addEventListener('lostpointercapture', e => {
        // Pointer capture may be lost after a normal pointerup; only clean up
        // a still-pending action to avoid converting a long press into a tap.
        cancelAction(e.pointerId);
    });
    actionZone.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    document.addEventListener('gameplay:ended', reset);
})();

;
// === js/08-dungeon-generator.js ===
// Bomberman Roguelike v6.12.20 — deterministic procedural layout generator.
// Generates only validated MapData. It never mutates gameState or executes gameplay.
(function installDungeonGenerator(global) {
    'use strict';

    const VERSION = '6.12.20';
    const UINT32_MAX_PLUS_ONE = 4294967296;

    const TILE_SCHEMA = Object.freeze({
        EMPTY: 'EMPTY',
        WALL: 'WALL',
        BLOCK: 'BLOCK',
        EXIT_LOCKED: 'EXIT_LOCKED',
        EXIT_OPEN: 'EXIT_OPEN'
    });

    const DEFAULT_PROFILE = Object.freeze({
        width: 15,
        height: 15,
        topology: 'rooms-corridors',
        targetRooms: 4,
        minRoomSize: 3,
        maxRoomSize: 5,
        maxAttempts: 20,
        blockDensity: 0.34,
        preservePlayerSafeSpawn: true,
        preserveExit: true
    });

    const SEED_STREAMS = Object.freeze([
        'layoutSeed',
        'blockSeed',
        'enemySeed',
        'powerUpSeed',
        'hazardSeed'
    ]);

    const PENDING_REQUEST_KEY = '__BOMBERMAN_PROCEDURAL_MAP_REQUEST_V61220__';

    function normalizeSeed(seed) {
        if (seed === undefined || seed === null) return '0';
        return String(seed).trim() || '0';
    }

    function normalizeProfile(profile = {}) {
        const source = profile && typeof profile === 'object' ? profile : {};
        let width = Number.isFinite(Number(source.width)) ? Math.floor(Number(source.width)) : DEFAULT_PROFILE.width;
        let height = Number.isFinite(Number(source.height)) ? Math.floor(Number(source.height)) : DEFAULT_PROFILE.height;
        width = Math.max(9, Math.min(31, width));
        height = Math.max(9, Math.min(31, height));
        if (width % 2 === 0) width -= 1;
        if (height % 2 === 0) height -= 1;

        let targetRooms = Number.isFinite(Number(source.targetRooms))
            ? Math.floor(Number(source.targetRooms))
            : DEFAULT_PROFILE.targetRooms;
        targetRooms = Math.max(2, Math.min(8, targetRooms));

        let minRoomSize = Number.isFinite(Number(source.minRoomSize))
            ? Math.floor(Number(source.minRoomSize))
            : DEFAULT_PROFILE.minRoomSize;
        let maxRoomSize = Number.isFinite(Number(source.maxRoomSize))
            ? Math.floor(Number(source.maxRoomSize))
            : DEFAULT_PROFILE.maxRoomSize;
        minRoomSize = Math.max(3, Math.min(7, minRoomSize));
        maxRoomSize = Math.max(minRoomSize, Math.min(9, maxRoomSize));
        if (minRoomSize % 2 === 0) minRoomSize -= 1;
        if (maxRoomSize % 2 === 0) maxRoomSize -= 1;

        const maxAttempts = Number.isFinite(Number(source.maxAttempts))
            ? Math.floor(Number(source.maxAttempts))
            : DEFAULT_PROFILE.maxAttempts;
        const blockDensity = Number.isFinite(Number(source.blockDensity))
            ? Math.max(0, Math.min(0.60, Number(source.blockDensity)))
            : DEFAULT_PROFILE.blockDensity;

        return Object.freeze({
            ...DEFAULT_PROFILE,
            ...source,
            width,
            height,
            targetRooms,
            minRoomSize,
            maxRoomSize,
            maxAttempts: Math.max(1, Math.min(100, maxAttempts)),
            blockDensity
        });
    }

    function hashString(input) {
        let h = 2166136261 >>> 0;
        const text = normalizeSeed(input);
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h += h << 13;
        h ^= h >>> 7;
        h += h << 3;
        h ^= h >>> 17;
        h += h << 5;
        return h >>> 0;
    }

    function mixSeed(rootSeed, streamName) {
        return hashString(`${normalizeSeed(rootSeed)}|${streamName}`);
    }

    function createRng(seed) {
        let state = hashString(seed) || 0x9E3779B9;
        return Object.freeze({
            next() {
                state = (state + 0x6D2B79F5) >>> 0;
                let t = state;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX_PLUS_ONE;
            },
            int(min, max) {
                if (!Number.isFinite(min) || !Number.isFinite(max)) throw new TypeError('rng_int_bounds_invalid');
                const lo = Math.ceil(Math.min(min, max));
                const hi = Math.floor(Math.max(min, max));
                return lo + Math.floor(this.next() * (hi - lo + 1));
            },
            pick(array) {
                if (!Array.isArray(array) || array.length === 0) return undefined;
                return array[this.int(0, array.length - 1)];
            }
        });
    }

    function createSeedBundle(seed) {
        const rootSeed = normalizeSeed(seed);
        const streams = {};
        SEED_STREAMS.forEach(name => {
            streams[name] = mixSeed(rootSeed, name);
        });
        return Object.freeze({ rootSeed, ...streams });
    }

    function createSeededRngs(seed) {
        const seeds = createSeedBundle(seed);
        const rngs = {};
        SEED_STREAMS.forEach(name => {
            rngs[name] = createRng(seeds[name]);
        });
        return Object.freeze({ seeds, rngs: Object.freeze(rngs) });
    }

    function inBounds(x, y, width, height) {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    function roomIntersects(a, b, padding = 1) {
        return !(
            a.x + a.w + padding <= b.x ||
            b.x + b.w + padding <= a.x ||
            a.y + a.h + padding <= b.y ||
            b.y + b.h + padding <= a.y
        );
    }

    function carveRect(tiles, room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
        }
    }

    function carveCorridor(tiles, from, to, horizontalFirst) {
        let x = from.x;
        let y = from.y;
        tiles[y][x] = TILE_SCHEMA.EMPTY;

        if (horizontalFirst) {
            while (x !== to.x) {
                x += Math.sign(to.x - x);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
            while (y !== to.y) {
                y += Math.sign(to.y - y);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
        } else {
            while (y !== to.y) {
                y += Math.sign(to.y - y);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
            while (x !== to.x) {
                x += Math.sign(to.x - x);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
        }
    }

    function roomCells(room) {
        const cells = [];
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) cells.push({ x, y });
        }
        return cells;
    }

    function cellKey(x, y) {
        return `${x},${y}`;
    }

    function findPath(tiles, start, goal) {
        const queue = [start];
        const visited = new Set([cellKey(start.x, start.y)]);
        const directions = [[1,0],[-1,0],[0,1],[0,-1]];

        while (queue.length) {
            const current = queue.shift();
            if (current.x === goal.x && current.y === goal.y) return true;
            for (const [dx, dy] of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                if (!inBounds(nx, ny, tiles[0].length, tiles.length)) continue;
                if (tiles[ny][nx] !== TILE_SCHEMA.EMPTY) continue;
                const key = cellKey(nx, ny);
                if (visited.has(key)) continue;
                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
        return false;
    }

    function createEmptyMapData(seed, profile = {}) {
        const normalizedProfile = normalizeProfile(profile);
        return {
            width: normalizedProfile.width,
            height: normalizedProfile.height,
            tiles: Array.from({ length: normalizedProfile.height }, () => Array(normalizedProfile.width).fill(TILE_SCHEMA.WALL)),
            rooms: [],
            corridors: [],
            playerSpawn: null,
            enemySpawns: [],
            destructibleBlocks: [],
            powerUps: [],
            hazards: [],
            exit: null,
            metadata: {
                seed: normalizeSeed(seed),
                depth: null,
                biome: null,
                stage: null,
                profile: normalizedProfile
            }
        };
    }

    function placeRooms(mapData, rng, profile) {
        const { width, height } = mapData;
        const rooms = [];
        const target = Math.min(profile.targetRooms, Math.max(2, Math.floor((width - 2) / 3)));

        const firstRoom = { x: 1, y: 1, w: 3, h: 3 };
        rooms.push(firstRoom);
        carveRect(mapData.tiles, firstRoom);

        let attempts = 0;
        while (rooms.length < target && attempts < 60) {
            attempts++;
            const w = rng.int(profile.minRoomSize, profile.maxRoomSize) | 1;
            const h = rng.int(profile.minRoomSize, profile.maxRoomSize) | 1;
            const maxX = width - w - 1;
            const maxY = height - h - 1;
            if (maxX < 1 || maxY < 1) break;

            let x = rng.int(1, maxX);
            let y = rng.int(1, maxY);
            if (x % 2 === 0) x -= 1;
            if (y % 2 === 0) y -= 1;
            if (x < 1 || y < 1) continue;

            const room = { x, y, w, h };
            if (rooms.some(existing => roomIntersects(room, existing, 1))) continue;

            rooms.push(room);
            carveRect(mapData.tiles, room);
        }

        mapData.rooms = rooms;
        return rooms.length >= 2;
    }

    function connectRooms(mapData, rng) {
        const corridors = [];
        for (let i = 1; i < mapData.rooms.length; i++) {
            const previous = mapData.rooms[i - 1];
            const current = mapData.rooms[i];
            const from = {
                x: previous.x + Math.floor(previous.w / 2),
                y: previous.y + Math.floor(previous.h / 2)
            };
            const to = {
                x: current.x + Math.floor(current.w / 2),
                y: current.y + Math.floor(current.h / 2)
            };
            const horizontalFirst = rng.next() >= 0.5;
            carveCorridor(mapData.tiles, from, to, horizontalFirst);
            corridors.push({ from, to, horizontalFirst });
        }

        mapData.corridors = corridors;
        return corridors.length >= 1;
    }

    function addDestructibleBlocks(mapData, rng, profile) {
        const protectedCells = new Set();
        const spawn = mapData.playerSpawn;
        const exit = mapData.exit;
        if (spawn) protectedCells.add(cellKey(spawn.x, spawn.y));
        if (exit) protectedCells.add(cellKey(exit.x, exit.y));

        // Keep corridor centerline and immediate player escape lanes free.
        for (const corridor of mapData.corridors) {
            let x = corridor.from.x;
            let y = corridor.from.y;
            protectedCells.add(cellKey(x, y));
            if (corridor.horizontalFirst) {
                while (x !== corridor.to.x) {
                    x += Math.sign(corridor.to.x - x);
                    protectedCells.add(cellKey(x, y));
                }
                while (y !== corridor.to.y) {
                    y += Math.sign(corridor.to.y - y);
                    protectedCells.add(cellKey(x, y));
                }
            } else {
                while (y !== corridor.to.y) {
                    y += Math.sign(corridor.to.y - y);
                    protectedCells.add(cellKey(x, y));
                }
                while (x !== corridor.to.x) {
                    x += Math.sign(corridor.to.x - x);
                    protectedCells.add(cellKey(x, y));
                }
            }
        }
        if (profile.preservePlayerSafeSpawn) {
            [[1,1],[2,1],[1,2],[2,2],[1,3],[3,1]].forEach(([x,y]) => {
                if (inBounds(x,y,mapData.width,mapData.height)) protectedCells.add(cellKey(x,y));
            });
        }

        const candidates = [];
        for (const room of mapData.rooms) {
            for (const {x,y} of roomCells(room)) {
                if (mapData.tiles[y][x] !== TILE_SCHEMA.EMPTY) continue;
                if (protectedCells.has(cellKey(x,y))) continue;
                candidates.push({x,y});
            }
        }

        // Deterministic shuffle.
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const target = Math.floor(candidates.length * profile.blockDensity);
        for (const cell of candidates) {
            if (mapData.destructibleBlocks.length >= target) break;
            if (mapData.tiles[cell.y][cell.x] !== TILE_SCHEMA.EMPTY) continue;
            mapData.tiles[cell.y][cell.x] = TILE_SCHEMA.BLOCK;
            if (!findPath(mapData.tiles, mapData.playerSpawn, mapData.exit)) {
                mapData.tiles[cell.y][cell.x] = TILE_SCHEMA.EMPTY;
                continue;
            }
            mapData.destructibleBlocks.push(cell);
        }
    }

    function generateAttempt(seed, profile, attempt) {
        const seeded = createSeededRngs(`${normalizeSeed(seed)}|attempt|${attempt}`);
        const mapData = createEmptyMapData(seed, profile);

        // Basic rooms + corridors. Geometry is fully deterministic per attempt.
        if (!placeRooms(mapData, seeded.rngs.layoutSeed, profile)) return null;
        if (!connectRooms(mapData, seeded.rngs.layoutSeed)) return null;

        const firstRoom = mapData.rooms[0];
        const lastRoom = mapData.rooms[mapData.rooms.length - 1];
        mapData.playerSpawn = { x: firstRoom.x, y: firstRoom.y };
        mapData.exit = {
            x: lastRoom.x + Math.floor(lastRoom.w / 2),
            y: lastRoom.y + Math.floor(lastRoom.h / 2),
            state: 'LOCKED'
        };

        if (!mapData.tiles[mapData.playerSpawn.y] || mapData.tiles[mapData.playerSpawn.y][mapData.playerSpawn.x] !== TILE_SCHEMA.EMPTY) return null;
        if (!mapData.tiles[mapData.exit.y] || mapData.tiles[mapData.exit.y][mapData.exit.x] !== TILE_SCHEMA.EMPTY) return null;

        addDestructibleBlocks(mapData, seeded.rngs.blockSeed, profile);

        if (!findPath(mapData.tiles, mapData.playerSpawn, mapData.exit)) return null;

        mapData.metadata.attempt = attempt;
        mapData.metadata.seedStreams = createSeedBundle(`${normalizeSeed(seed)}|attempt|${attempt}`);
        return mapData;
    }

    function validateMapData(mapData) {
        const errors = [];
        if (!mapData || typeof mapData !== 'object') return { valid: false, errors: ['map_data_missing'] };
        if (!Number.isInteger(mapData.width) || mapData.width < 9 || mapData.width % 2 === 0) errors.push('width_invalid');
        if (!Number.isInteger(mapData.height) || mapData.height < 9 || mapData.height % 2 === 0) errors.push('height_invalid');
        if (!Array.isArray(mapData.tiles) || mapData.tiles.length !== mapData.height) errors.push('tiles_missing');
        if (!Array.isArray(mapData.rooms) || mapData.rooms.length < 2) errors.push('rooms_missing');
        if (!mapData.playerSpawn) errors.push('player_spawn_missing');
        if (!mapData.exit) errors.push('exit_missing');

        if (Array.isArray(mapData.tiles) && mapData.tiles.length === mapData.height) {
            for (let y = 0; y < mapData.height; y++) {
                if (!Array.isArray(mapData.tiles[y]) || mapData.tiles[y].length !== mapData.width) {
                    errors.push('row_shape_invalid');
                    break;
                }
                for (let x = 0; x < mapData.width; x++) {
                    const tile = mapData.tiles[y][x];
                    if (!Object.values(TILE_SCHEMA).includes(tile)) errors.push('tile_value_invalid');
                    if ((x === 0 || y === 0 || x === mapData.width - 1 || y === mapData.height - 1) && tile !== TILE_SCHEMA.WALL) {
                        errors.push('boundary_open');
                    }
                }
            }
        }

        if (Array.isArray(mapData.rooms)) {
            for (let i = 0; i < mapData.rooms.length; i++) {
                const a = mapData.rooms[i];
                if (!Number.isInteger(a.x) || !Number.isInteger(a.y) || !Number.isInteger(a.w) || !Number.isInteger(a.h)) {
                    errors.push('room_invalid');
                    continue;
                }
                if (a.x < 1 || a.y < 1 || a.x + a.w > mapData.width - 1 || a.y + a.h > mapData.height - 1) errors.push('room_out_of_bounds');
                for (let j = i + 1; j < mapData.rooms.length; j++) {
                    if (roomIntersects(a, mapData.rooms[j], 1)) errors.push('rooms_overlap');
                }
            }
        }

        const start = mapData.playerSpawn;
        const exit = mapData.exit;
        if (start && !inBounds(start.x, start.y, mapData.width, mapData.height)) errors.push('player_spawn_out_of_bounds');
        if (exit && !inBounds(exit.x, exit.y, mapData.width, mapData.height)) errors.push('exit_out_of_bounds');
        if (start && mapData.tiles?.[start.y]?.[start.x] !== TILE_SCHEMA.EMPTY) errors.push('player_spawn_blocked');
        if (exit && mapData.tiles?.[exit.y]?.[exit.x] !== TILE_SCHEMA.EMPTY) errors.push('exit_blocked');
        if (start && exit && Array.isArray(mapData.tiles) && !findPath(mapData.tiles, start, exit)) errors.push('no_start_to_exit_path');

        return { valid: errors.length === 0, errors: [...new Set(errors)] };
    }

    function generate(seed, profile = {}) {
        const normalizedSeed = normalizeSeed(seed);
        const normalizedProfile = normalizeProfile(profile);
        for (let attempt = 0; attempt < normalizedProfile.maxAttempts; attempt++) {
            const mapData = generateAttempt(normalizedSeed, normalizedProfile, attempt);
            if (!mapData) continue;
            const validation = validateMapData(mapData);
            if (!validation.valid) continue;
            return Object.freeze({
                status: 'GENERATED',
                gameplayReady: false,
                generated: true,
                deterministic: true,
                attempts: attempt + 1,
                request: createRequest(normalizedSeed, normalizedProfile),
                validation,
                mapData: deepFreeze(mapData)
            });
        }
        return Object.freeze({
            status: 'REJECTED',
            gameplayReady: false,
            generated: false,
            deterministic: true,
            attempts: normalizedProfile.maxAttempts,
            request: createRequest(normalizedSeed, normalizedProfile),
            validation: { valid: false, errors: ['generation_failed_after_max_attempts'] },
            mapData: null
        });
    }

    function createRequest(seed, profile = {}) {
        const normalizedSeed = normalizeSeed(seed);
        return Object.freeze({
            contractVersion: VERSION,
            seed: normalizedSeed,
            profile: normalizeProfile(profile),
            seeds: createSeedBundle(normalizedSeed)
        });
    }

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.keys(value).forEach(key => deepFreeze(value[key]));
        return value;
    }

    function cloneData(value) {
        if (Array.isArray(value)) return value.map(cloneData);
        if (value && typeof value === 'object') {
            const result = {};
            Object.keys(value).forEach(key => result[key] = cloneData(value[key]));
            return result;
        }
        return value;
    }

    function mapDataFingerprint(mapData) {
        return JSON.stringify(mapData);
    }

    function validateResult(result) {
        if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
        if (!result.generated || result.status !== 'GENERATED' || !result.mapData) return { valid: false, errors: result.validation?.errors || ['generation_not_valid'] };
        return validateMapData(result.mapData);
    }

    function readProceduralRequest(level = 1) {
        const pending = global[PENDING_REQUEST_KEY];
        if (pending && typeof pending === 'object') return cloneData(pending);

        try {
            if (!global.location || typeof global.location.search !== 'string') return null;
            const params = new URLSearchParams(global.location.search);
            if (params.get('map') !== 'procedural') return null;
            const seedParam = params.get('seed');
            const seed = seedParam ? seedParam : `procedural-depth-${level}`;
            return {
                enabled: true,
                seed: normalizeSeed(seed),
                profile: {}
            };
        } catch (_error) {
            return null;
        }
    }

    function requestProceduralMap(seed, profile = {}) {
        const request = {
            enabled: true,
            seed: normalizeSeed(seed),
            profile: cloneData(normalizeProfile(profile))
        };
        global[PENDING_REQUEST_KEY] = request;
        return cloneData(request);
    }

    function clearProceduralRequest() {
        try { delete global[PENDING_REQUEST_KEY]; } catch (_error) { global[PENDING_REQUEST_KEY] = null; }
    }

    const api = Object.freeze({
        version: VERSION,
        tileSchema: TILE_SCHEMA,
        seedStreams: SEED_STREAMS,
        defaultProfile: DEFAULT_PROFILE,
        normalizeSeed,
        normalizeProfile,
        createRng,
        createSeedBundle,
        createSeededRngs,
        createEmptyMapData,
        cloneData,
        mapDataFingerprint,
        createRequest,
        generate,
        validateMapData,
        validateResult,
        getRunRequest: readProceduralRequest,
        requestProceduralMap,
        clearProceduralRequest
    });

    global.DungeonGenerator = api;
    global.DUNGEON_GENERATOR_V61220 = api;
})(typeof window !== 'undefined' ? window : globalThis);

;
// === js/09-difficulty.js ===
// Bomberman Roguelike v3.23 — Progressive difficulty controller.
// Una sola fuente de verdad para escalado de enemigos, presión, trampas y densidad.
(() => {
    'use strict';

    const LIMITS = Object.freeze({
        minRoomTime: 32000,
        maxEnemies: 22,
        maxEnemySpeedMult: 1.24,
        maxTrapBonus: 6,
        maxBlockDensityBonus: 0.08
    });

    function depthV323(value) {
        const depth = Number(value);
        return Number.isFinite(depth) ? Math.max(1, Math.floor(depth)) : 1;
    }

    function getDifficultyV323(depth = gameState?.level || 1) {
        const d = depthV323(depth);
        const steps = d - 1;
        const tier = Math.floor(steps / 5);

        const enemyCountMult = 1 + Math.min(0.72, steps * 0.045);
        const enemySpeedMult = 1 + Math.min(0.20, steps * 0.012);
        const trapBonus = Math.min(LIMITS.maxTrapBonus, Math.floor(steps / 2));
        const blockDensityBonus = Math.min(LIMITS.maxBlockDensityBonus, Math.floor(steps / 3) * 0.01);
        const roomTimeMult = 1 - Math.min(0.22, steps * 0.012);
        const maxEnemies = Math.min(LIMITS.maxEnemies, 8 + Math.floor(d * 0.85));
        const eliteBonus = Math.min(0.24, tier * 0.04);

        return Object.freeze({
            version: '3.23.0',
            depth: d,
            tier,
            intensity: 1 + Math.min(1.5, steps * 0.06),
            enemyCountMult,
            enemySpeedMult: Math.min(LIMITS.maxEnemySpeedMult, enemySpeedMult),
            trapBonus,
            blockDensityBonus,
            roomTimeMult,
            maxEnemies,
            eliteBonus,
            limits: LIMITS
        });
    }

    function applyDifficultyV323() {
        const profile = getDifficultyV323(gameState?.level || 1);
        gameState.difficulty = profile;
        return profile;
    }

    function getDifficultyRoomTimeV323(baseMs) {
        const profile = gameState?.difficulty || getDifficultyV323();
        const base = Math.max(0, Number(baseMs) || 0);
        return Math.max(LIMITS.minRoomTime, Math.round(base * profile.roomTimeMult));
    }


    function getDifficultyTrapCountV323(baseCount) {
        const profile = gameState?.difficulty || getDifficultyV323();
        return Math.max(0, Math.round((Number(baseCount) || 0) + profile.trapBonus));
    }

    window.BOMBER_DIFFICULTY_V323 = Object.freeze({
        version: '3.23.0',
        limits: LIMITS,
        get: getDifficultyV323,
        apply: applyDifficultyV323,
        roomTime: getDifficultyRoomTimeV323,
        trapCount: getDifficultyTrapCountV323
    });

    window.getDifficultyV323 = getDifficultyV323;
    window.applyDifficultyV323 = applyDifficultyV323;
    window.getDifficultyRoomTimeV323 = getDifficultyRoomTimeV323;
    window.getDifficultyTrapCountV323 = getDifficultyTrapCountV323;
})();

;
// === js/10-world.js ===
// Bomberman Roguelike v6.27.0 — Level generation without periodic enemy reinforcements.
        function applyProceduralMapV61220() {
            const generator = (typeof window !== 'undefined') ? window.DungeonGenerator : null;
            if (!generator || typeof generator.getRunRequest !== 'function') return false;

            const request = generator.getRunRequest(gameState.level);
            if (!request || request.enabled !== true) return false;

            const profile = {
                ...(request.profile || {}),
                width: gameState.gridWidth,
                height: gameState.gridHeight,
                targetRooms: gameState.gridWidth >= 21 ? 5 : (gameState.gridWidth >= 17 ? 4 : 3)
            };
            const result = generator.generate(request.seed, profile);
            const validation = typeof generator.validateResult === 'function'
                ? generator.validateResult(result)
                : { valid: false, errors: ['generator_validator_missing'] };

            if (!result || result.generated !== true || !result.mapData || validation.valid !== true) {
                return false;
            }

            const tileMap = {
                EMPTY: TYPES.EMPTY,
                WALL: TYPES.WALL,
                BLOCK: TYPES.BLOCK,
                EXIT_LOCKED: TYPES.EXIT_LOCKED,
                EXIT_OPEN: TYPES.EXIT_OPEN
            };
            const mapData = result.mapData;
            const nextGrid = mapData.tiles.map(row => row.map(tile => tileMap[tile]));
            if (nextGrid.some(row => row.some(tile => !Number.isInteger(tile)))) return false;

            gameState.grid = nextGrid;
            gameState.gridWidth = mapData.width;
            gameState.gridHeight = mapData.height;
            gameState.exitPos = mapData.exit ? { x: mapData.exit.x, y: mapData.exit.y } : null;
            if (mapData.playerSpawn) {
                player.x = mapData.playerSpawn.x * TILE_SIZE + (TILE_SIZE - player.width) / 2;
                player.y = mapData.playerSpawn.y * TILE_SIZE + (TILE_SIZE - player.height) / 2;
                if (typeof gridResetTileMove === 'function') gridResetTileMove(player, false);
            }
            gameState.proceduralMapActive = true;
            gameState.proceduralMapSeed = request.seed;

            // Mantener el flujo visual existente: la salida procedural queda oculta bajo un bloque.
            if (gameState.exitPos && gameState.grid[gameState.exitPos.y]?.[gameState.exitPos.x] === TYPES.EMPTY) {
                gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.BLOCK;
            }

            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            return true;
        }

        function buildClassicMapV61220() {
            gameState.proceduralMapActive = false;
            gameState.proceduralMapSeed = null;
            gameState.grid = Array(gameState.gridHeight).fill().map(() => Array(gameState.gridWidth).fill(TYPES.EMPTY));

            // Outer walls & pillar walls
            for (let y = 0; y < gameState.gridHeight; y++) {
                for (let x = 0; x < gameState.gridWidth; x++) {
                    if (x === 0 || x === gameState.gridWidth - 1 || y === 0 || y === gameState.gridHeight - 1) {
                        gameState.grid[y][x] = TYPES.WALL;
                    } else if (x % 2 === 0 && y % 2 === 0) {
                        gameState.grid[y][x] = TYPES.WALL;
                    }
                }
            }

            const blockDensity = 0.42;
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    if ((x <= 2 && y <= 2) || (x === 1 && y === 3) || (x === 3 && y === 1)) continue;
                    if (Math.random() < blockDensity) gameState.grid[y][x] = TYPES.BLOCK;
                }
            }

            let blocks = [];
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.BLOCK) blocks.push({ x, y });
                }
            }

            if (blocks.length > 0) {
                const exitBlock = blocks[Math.floor(Math.random() * blocks.length)];
                gameState.exitPos = { x: exitBlock.x, y: exitBlock.y };
            } else {
                gameState.exitPos = { x: gameState.gridWidth - 2, y: gameState.gridHeight - 2 };
                gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            gameState.exitUnlocked = true;
            }

            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
        }

        function setExitStateV613(open = false) {
            const pos = gameState.exitPos;
            if (!pos || !gameState.grid?.[pos.y]) return false;
            const current = gameState.grid[pos.y][pos.x];
            if (current === TYPES.BLOCK && open) return false;
            gameState.grid[pos.y][pos.x] = open ? TYPES.EXIT_OPEN : TYPES.EXIT_LOCKED;
            gameState.exitUnlocked = !!open;
            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            return true;
        }

        function tryUnlockExitCurrentRoom() {
            if (!gameState?.exitPos || gameState.roomType?.id === 'BOSS') return false;
            if (gameState.exitUnlocked) return true;
            if (Array.isArray(gameState.enemies) && gameState.enemies.length > 0) return false;
            const pos = gameState.exitPos;
            const tile = gameState.grid?.[pos.y]?.[pos.x];
            if (tile === TYPES.BLOCK) return false;
            return setExitStateV613(true);
        }

        function initLevel() {
            const requestedRoomType = gameState.__roomTypeOverrideV626;
            gameState.roomType = requestedRoomType && ROOM_TYPES[requestedRoomType] ? ROOM_TYPES[requestedRoomType] : ROOM_TYPES.STANDARD;
            if (typeof applyDifficultyV323 === 'function') applyDifficultyV323();
            gameState.gridWidth = 15;
            gameState.gridHeight = 15;

            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            gameState.bombs = [];
            if (typeof materialResetV60 === 'function') materialResetV60();
            player.bombsPlaced = 0;
            gameState.explosions = [];
            gameState.enemies = [];
            gameState.items = [];
            gameState.particles = [];
            gameState.floaters = [];
            gameState.hazards = [];
            gameState.boss = null;
            gameState.blastSerial = 0;
            gameState.roomTime = typeof getDifficultyRoomTimeV323 === 'function'
                ? getDifficultyRoomTimeV323(Math.max(35000, 80000 - gameState.level * 1500))
                : Math.max(35000, 80000 - gameState.level * 1500);

            // El mapa nunca se publica parcialmente: el generador trabaja sobre MapData aislado.
            player.x = TILE_SIZE + (TILE_SIZE - player.width) / 2;
            player.y = TILE_SIZE + (TILE_SIZE - player.height) / 2;
            // El spawn inicia una nueva navegación: nunca heredar un tile-move
            // activo ni su objetivo de la sala anterior.
            if (typeof gridResetTileMove === 'function') gridResetTileMove(player, false);

            const proceduralApplied = applyProceduralMapV61220();
            if (!proceduralApplied) buildClassicMapV61220();
            // Tanto el mapa procedural como el fallback dejan el jugador en un
            // spawn válido y limpio para la nueva profundidad.
            if (typeof gridResetTileMove === 'function') gridResetTileMove(player, false);

            if (typeof resetCameraToPlayer === 'function') resetCameraToPlayer();

            if (gameState.roomType?.id === 'BOSS') {
                if (typeof spawnBossV626 === 'function') spawnBossV626();
            } else {
                spawnEnemies();
            }
            gameState.__roomTypeOverrideV626 = null;
            updateRoguePresentation();
            updateUI();
        }

        function damageBoss(amount = 1) {
            const b = gameState.boss;
            if (!b || b.defeated || Number(b.invuln) > 0) return false;
            const maxHp = Math.max(1, Number(b.maxHp) || Number(b.maxHealth) || 1);
            const currentHp = Number.isFinite(b.hp) ? b.hp : (Number.isFinite(b.health) ? b.health : maxHp);
            const damage = Math.max(1, Number(amount) || 1);
            b.maxHp = maxHp;
            b.maxHealth = maxHp;
            b.hp = Math.max(0, currentHp - damage);
            b.health = b.hp; // mirror field used by older UI/save code
            b.invuln = 220;
            triggerBossHitFeedback(b);
            b.flash = 180;
            gameState.score += 75;
            sfx('bossHit');
            triggerScreenShake(3, 100);
            addFloatingText(`-${damage}`, b.x, b.y - b.height / 2, '#fb7185');
            if (typeof bossV41SetHUD === 'function') bossV41SetHUD(b, typeof bossV41GetPhase === 'function' ? bossV41GetPhase(b) : b.phase || 1);
            if (b.hp <= 0) defeatBoss();
            return true;
        }

        function defeatBoss() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            b.defeated = true;
            b.hp = 0;
            b.health = 0;
            b.maxHp = Math.max(1, Number(b.maxHp) || Number(b.maxHealth) || 1);
            b.maxHealth = b.maxHp;
            if (gameState.exitPos && gameState.grid?.[gameState.exitPos.y]) gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            gameState.coins += 30;
            gameState.score += 1500;
            addParticles(b.x, b.y, 'particleBoss', 55);
            addFloatingText('☠ JEFE DERROTADO', b.x, b.y - 50, '#facc15');
            addFloatingText('+30¢  +1500', b.x, b.y + 20, '#fbbf24');
            sfx('boom');
            triggerScreenShake(12, 500);
            if (typeof bossV41SetHUD === 'function') bossV41SetHUD(b, 0);
            updateUI();
        }

        function updateBoss(dt) {
            // v6.26: el Boss V4.1 es la única autoridad de actualización cuando está cargado.
            if (typeof updateBossV41 === 'function') return;
            const b=gameState.boss;
            if(!b || b.defeated) return;
            b.invuln=Math.max(0,b.invuln-dt); b.flash=Math.max(0,b.flash-dt);
            b.moveTimer-=dt;
            const ratio=b.hp/b.maxHp;
            b.phase=ratio<=.33?3:(ratio<=.66?2:1);
            const scale=Math.min(getCombatMotionDt(dt)/16.6667,2);

            if(b.moveTimer<=0){
                b.moveTimer=760-Math.min(260,b.phase*80);
                const dx=player.x+player.width/2-b.x, dy=player.y+player.height/2-b.y;
                if(Math.abs(dx)>Math.abs(dy)){b.vx=Math.sign(dx)*(0.8+b.phase*.3);b.vy=0;} else {b.vx=0;b.vy=Math.sign(dy)*(0.8+b.phase*.3);}
            }
            const nx=b.x+b.vx*scale, ny=b.y+b.vy*scale;
            if(!rectCollidesSolid(nx-b.width/2,ny-b.height/2,b.width,b.height)){b.x=nx;b.y=ny;} else {b.vx*=-1;b.vy*=-1;}

            // Los ataques del Boss viven únicamente en js/27-boss-system.js.
            const hit={left:b.x-b.width*.38,right:b.x+b.width*.38,top:b.y-b.height*.38,bottom:b.y+b.height*.38};
            const ph={left:player.x+5,right:player.x+player.width-5,top:player.y+5,bottom:player.y+player.height-5};
            if(checkOverlap(hit,ph)) takeDamage('boss-contact', b.x, b.y);
        }

        function drawBoss() {
            const b=gameState.boss; if(!b || b.defeated) return;
            drawLargeBossShadow(b);
            ctx.save();
            const pulse=1+Math.sin(gameState.animFrame*.10)*.035;
            const rage=b.phase===3;
            ctx.translate(b.x,b.y);ctx.scale(pulse,pulse);
            ctx.globalAlpha = b.flash > 0 ? .55 : (b.invuln > 0 && Math.floor(gameState.animFrame / 3) % 2 === 0 ? .72 : 1);
            const aura=ctx.createRadialGradient(0,0,20,0,0,b.width*.8);
            aura.addColorStop(0,rage?'rgba(244,63,94,.20)':'rgba(168,85,247,.16)');
            aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,b.width*.8,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(0,0,0,.58)';ctx.beginPath();ctx.ellipse(0,b.height*.43,b.width*.48,10,0,0,Math.PI*2);ctx.fill();
            // Massive armored body
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageBase', '#581c1c') : '#581c1c') : (typeof themeColorV46 === 'function' ? themeColorV46('bossBase', '#312e81') : '#312e81');
            ctx.strokeStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageOutline', '#fb7185') : '#fb7185') : (typeof themeColorV46 === 'function' ? themeColorV46('bossOutline', '#a78bfa') : '#a78bfa');ctx.lineWidth=5;
            ctx.beginPath();ctx.roundRect(-b.width*.43,-b.height*.42,b.width*.86,b.height*.84,18);ctx.fill();ctx.stroke();
            // Shoulder armor
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageShoulder', '#991b1b') : '#991b1b') : (typeof themeColorV46 === 'function' ? themeColorV46('bossShoulder', '#4c1d95') : '#4c1d95');
            ctx.beginPath();ctx.arc(-b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.arc(b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.fill();
            // Face plate
            ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossFacePlate', '#111827') : '#111827';ctx.fillRect(-b.width*.25,-b.height*.19,b.width*.50,b.height*.30);
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageEye', '#fda4af') : '#fda4af') : (typeof themeColorV46 === 'function' ? themeColorV46('bossEye', '#e9d5ff') : '#e9d5ff');ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;
            ctx.fillRect(-b.width*.16,-b.height*.10,b.width*.10,7);ctx.fillRect(b.width*.06,-b.height*.10,b.width*.10,7);ctx.shadowBlur=0;
            // Crown / horns
            ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossCrown', '#facc15') : '#facc15';ctx.beginPath();ctx.moveTo(-b.width*.28,-b.height*.38);ctx.lineTo(-b.width*.17,-b.height*.62);ctx.lineTo(-b.width*.04,-b.height*.38);ctx.lineTo(b.width*.08,-b.height*.62);ctx.lineTo(b.width*.25,-b.height*.38);ctx.closePath();ctx.fill();
            // Core
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageCore', '#ef4444') : '#ef4444') : (typeof themeColorV46 === 'function' ? themeColorV46('bossCore', '#c084fc') : '#c084fc');ctx.shadowBlur=18;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(0,b.height*.15,b.width*.10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            // Phase markers
            ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossPhaseMarker', '#fef08a') : '#fef08a';for(let i=0;i<b.phase;i++){ctx.beginPath();ctx.arc(-10+(i-1)*10,b.height*.34,3,0,Math.PI*2);ctx.fill();}
            ctx.restore();
        }

        // V3.12.3: el sistema de trampas/hazards vive en js/17-traps.js.
        // Este módulo mantiene la generación del nivel y delega allí la lógica
        // de generación, activación, efectos y renderizado de trampas.
        // v6.27: el reloj de sala continúa, pero no genera enemigos nuevos.
        // La cantidad de enemigos queda fija al entrar en la sala.
        function updateRoomTimerV627(dt) {
            const elapsed = Math.max(0, Number(dt) || 0);
            gameState.roomTime = Math.max(0, (Number(gameState.roomTime) || 0) - elapsed);
        }

;
// === js/11-enemies.js ===
// Bomberman Roguelike v6.26.0 — Enemy spawning delegated to biome authority
        function spawnEnemies() {
            if (typeof isBossRoomV626 === 'function' && isBossRoomV626()) return;
            const diff = gameState.difficulty || (typeof getDifficultyV323 === 'function' ? getDifficultyV323(gameState.level) : null);
            const maxEnemies = diff?.maxEnemies || largeSupport.maxEnemies;
            const spawnCap = typeof getDifficultyEnemySpawnCapV619 === 'function'
                ? getDifficultyEnemySpawnCapV619(gameState.level)
                : Math.min(12, 2 + Math.max(1, Math.floor(Number(gameState.level) || 1)));
            const count = Math.min(spawnCap, maxEnemies, Math.max(1, Math.round(Math.min(3 + Math.floor(gameState.level * 1.5), 12) * gameState.roomType.enemyMult * (diff?.enemyCountMult || 1))));
            const candidates = [];
            const px = Math.floor((player.x + player.width / 2) / TILE_SIZE);
            const py = Math.floor((player.y + player.height / 2) / TILE_SIZE);
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    const distance = Math.abs(x - px) + Math.abs(y - py);
                    if (distance >= 7) candidates.push({x, y, distance});
                }
            }
            // Si el mapa es muy compacto, bajamos el radio de seguridad solo lo necesario.
            if (candidates.length < count) {
                for (let y = 1; y < gameState.gridHeight - 1; y++) {
                    for (let x = 1; x < gameState.gridWidth - 1; x++) {
                        if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                            const distance = Math.abs(x - px) + Math.abs(y - py);
                        if (distance >= 5 && !candidates.some(c => c.x === x && c.y === y)) candidates.push({x, y, distance});
                    }
                }
            }

            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }

            const spawnTotal = Math.min(count, candidates.length);
            const spawnPlan = typeof buildEnemySpawnPlanV626 === 'function'
                ? buildEnemySpawnPlanV626(spawnTotal)
                : [];
            for (let i = 0; i < spawnTotal; i++) {
                const {x, y} = candidates[i];
                const spec = spawnPlan[i] || (typeof resolveEnemySpawnSpecV626 === 'function' ? resolveEnemySpawnSpecV626({ index: i, count: spawnTotal }) : null);
                const entity = typeof makeEnemyEntityV626 === 'function'
                    ? makeEnemyEntityV626({ x, y }, spec, { source: 'initial' })
                    : null;
                if (entity) gameState.enemies.push(entity);
            }
        }

        function triggerScreenShake(intensity = 6, duration = 300) {
            gameState.shakeIntensity = intensity;
            gameState.shakeTimer = duration;
        }

        function addFloatingText(text, x, y, color = '#facc15') {
            gameState.floaters.push({
                text, x, y, color, opacity: 1.0, life: 60
            });
            if (typeof pushInformationFeedV61221 === 'function') {
                pushInformationFeedV61221(text, color);
            }
        }

        function addParticles(x, y, colorOrThemeKey, count = 8) {
            const color = typeof themeParticleColorV46 === 'function' ? themeParticleColorV46(colorOrThemeKey, colorOrThemeKey) : colorOrThemeKey;
            const requested = typeof deviceQualityV45ParticleCount === 'function' ? deviceQualityV45ParticleCount(count) : count;
            const room = Math.max(0, largeSupport.particleBudget - gameState.particles.length);
            count = Math.min(requested, room, perf.lowQuality ? 5 : requested);
            for (let i = 0; i < count; i++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = 1 + Math.random() * 3;
                gameState.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 4,
                    color,
                    life: 20 + Math.random() * 20
                });
            }
        }


;
// === js/12-information-ui.js ===
// v6.30.3 — Notificaciones flotantes temporales; sustituye el registro persistente.
(function installInformationUIV6303(global){
    'use strict';

    const TOAST_LIFETIME_MS = 1500;
    const MAX_VISIBLE_TOASTS = 3;
    const state = { nextId: 1, timers: new Map() };

    function getContainer(){
        return global.document?.getElementById('ui-floating-toasts') || null;
    }

    function removeToast(id, node){
        const timer = state.timers.get(id);
        if (timer) global.clearTimeout(timer);
        state.timers.delete(id);
        if (node?.isConnected) node.remove();
    }

    function clearInformationFeedV61221(){
        for (const [id, timer] of state.timers) {
            global.clearTimeout(timer);
            state.timers.delete(id);
        }
        const container = getContainer();
        if (container) container.replaceChildren();
    }

    function safeAccent(value){
        const color = String(value || '').trim();
        return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#facc15';
    }

    function pushInformationFeedV61221(text, color = '#facc15'){
        const value = String(text ?? '').trim();
        const container = getContainer();
        if (!value || !container) return false;

        const id = state.nextId++;
        const toast = global.document.createElement('div');
        toast.className = 'runtime-toast';
        toast.dataset.toastId = String(id);
        toast.style.setProperty('--toast-accent', safeAccent(color));

        const accent = global.document.createElement('span');
        accent.className = 'runtime-toast-accent';
        accent.setAttribute('aria-hidden', 'true');
        const label = global.document.createElement('span');
        label.className = 'runtime-toast-text';
        label.textContent = value;
        toast.append(accent, label);
        container.appendChild(toast);

        // Mantener una pila corta para que mensajes consecutivos no tapen el mundo.
        while (container.children.length > MAX_VISIBLE_TOASTS) {
            const oldest = container.firstElementChild;
            const oldestId = Number(oldest?.dataset?.toastId);
            if (oldest && Number.isFinite(oldestId)) removeToast(oldestId, oldest);
            else oldest?.remove();
        }

        const timer = global.setTimeout(() => removeToast(id, toast), TOAST_LIFETIME_MS);
        state.timers.set(id, timer);
        return true;
    }

    // Compatibilidad con antiguos consumidores que actualizaban el feed por dt.
    // Los toasts usan reloj de interfaz para respetar 1,5 s incluso durante pausa.
    function updateInformationFeedV61221(){ /* Temporalidad gestionada por setTimeout + CSS. */ }

    global.pushInformationFeedV61221 = pushInformationFeedV61221;
    global.updateInformationFeedV61221 = updateInformationFeedV61221;
    global.clearInformationFeedV61221 = clearInformationFeedV61221;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.clearTransientNotifications = clearInformationFeedV61221;
})(window);

;
// === js/13-bombs.js ===
// Bomberman Roguelike v6.12.6 — Classic Bomberman bomb handling
// Núcleo de colocación, retención segura, ocupación, mecha y cadenas.

const BOMB_HANDLING = {
    normalFuse: 2000,
    cursedFuse: 1600,
    warningStart: 900,
    placementCooldown: 150,
    holdInitialDelay: 300,
    holdRepeat: 180,
    movePlacementGrace: 90,
};

const bombInputState = {
    held: false,
    source: null,
    startedAt: 0,
    lastRepeatAt: 0,
    blockedByMovement: false
};

const bombHandlingFx = { chainLinks: [] };


// v4.0: todas las bombas comparten una pequeña máquina de estados.
// Separamos lógica de detonación (tile x/y) de su posición visual (worldX/worldY)
// para permitir bombas lanzadas, empujadas, atrapadas o desviadas en futuras habilidades.
const BOMB_V4_STATES = Object.freeze({ MOVING: 'moving', ARMED: 'armed', CARRIED: 'carried', EXPLODING: 'exploding' });

function ensureBombV4State(bomb){
    if (!bomb || typeof bomb !== 'object') return null;
    if (!bomb.state) bomb.state = bomb.owner === 'boss' ? BOMB_V4_STATES.MOVING : BOMB_V4_STATES.ARMED;
    if (!bomb.motionState) bomb.motionState = bomb.state === BOMB_V4_STATES.MOVING ? BOMB_V4_STATES.MOVING : 'idle';
    if (!Number.isFinite(bomb.worldX)) bomb.worldX = (Number(bomb.x) + .5) * TILE_SIZE;
    if (!Number.isFinite(bomb.worldY)) bomb.worldY = (Number(bomb.y) + .5) * TILE_SIZE;
    if (!Number.isFinite(bomb.motionProgress)) bomb.motionProgress = bomb.state === BOMB_V4_STATES.MOVING ? 0 : 1;
    if (!Number.isFinite(bomb.motionTimer)) bomb.motionTimer = 0;
    if (!Number.isFinite(bomb.motionDuration)) bomb.motionDuration = 0;
    if (!Number.isFinite(bomb.motionStartX)) bomb.motionStartX = bomb.worldX;
    if (!Number.isFinite(bomb.motionStartY)) bomb.motionStartY = bomb.worldY;
    if (!Number.isFinite(bomb.motionTargetX)) bomb.motionTargetX = bomb.worldX;
    if (!Number.isFinite(bomb.motionTargetY)) bomb.motionTargetY = bomb.worldY;
    if (!Number.isFinite(bomb.motionTargetTileX)) bomb.motionTargetTileX = Math.round(bomb.motionTargetX / TILE_SIZE - .5);
    if (!Number.isFinite(bomb.motionTargetTileY)) bomb.motionTargetTileY = Math.round(bomb.motionTargetY / TILE_SIZE - .5);
    if (typeof bomb.pendingDetonation !== 'boolean') bomb.pendingDetonation = false;
    if (!Number.isFinite(bomb.motionArc)) bomb.motionArc = 0;
    if (!Number.isFinite(bomb.motionRotation)) bomb.motionRotation = 0;
    if (!Number.isFinite(bomb.motionRotationSpeed)) bomb.motionRotationSpeed = 0;
    if (!Number.isFinite(bomb.bobPhase)) bomb.bobPhase = 0;
    if (!Array.isArray(bomb.motionQueue)) bomb.motionQueue = []; // destinos en coordenadas de CASILLA {x,y}
    if (typeof bomb.preserveTimerOnArm !== 'boolean') bomb.preserveTimerOnArm = false;
    if (!bomb.interactionState) bomb.interactionState = 'free';
    if (typeof bomb.canKick !== 'boolean') bomb.canKick = bomb.owner !== 'boss';
    if (typeof bomb.canPush !== 'boolean') bomb.canPush = bomb.owner !== 'boss';
    if (typeof bomb.canCarry !== 'boolean') bomb.canCarry = false;
    if (!Object.prototype.hasOwnProperty.call(bomb, 'carriedBy')) bomb.carriedBy = null;
    if (!Number.isFinite(bomb.timer)) bomb.timer = Number(bomb.fuseTotal || 0);
    return bomb;
}

function startBombV4Motion(bomb, targetX, targetY, durationMs = 360, arc = 18){
    if (!bomb) return false;
    ensureBombV4State(bomb);

    const worldTargetX = Number(targetX);
    const worldTargetY = Number(targetY);
    if (!Number.isFinite(worldTargetX) || !Number.isFinite(worldTargetY)) return false;

    const targetTileX = Math.round(worldTargetX / TILE_SIZE - 0.5);
    const targetTileY = Math.round(worldTargetY / TILE_SIZE - 0.5);
    const liquidMotionMultiplier = typeof getBombLiquidMotionMultiplierV631 === 'function'
        ? getBombLiquidMotionMultiplierV631(targetTileX, targetTileY)
        : 1;
    const adjustedDurationMs = Math.max(80, (Number(durationMs) || 360) * liquidMotionMultiplier);
    if (targetTileX < 0 || targetTileY < 0 ||
        targetTileX >= gameState.gridWidth || targetTileY >= gameState.gridHeight) {
        // Nunca permitimos que una bomba tenga un objetivo aéreo fuera del mapa.
        return false;
    }

    const startWorldX = Number.isFinite(bomb.worldX)
        ? bomb.worldX
        : (Number(bomb.x) + .5) * TILE_SIZE;
    const startWorldY = Number.isFinite(bomb.worldY)
        ? bomb.worldY
        : (Number(bomb.y) + .5) * TILE_SIZE;
    if (!Number.isFinite(startWorldX) || !Number.isFinite(startWorldY)) return false;

    bomb.state = BOMB_V4_STATES.MOVING;
    bomb.motionState = BOMB_V4_STATES.MOVING;
    bomb.motionProgress = 0;
    bomb.motionTimer = adjustedDurationMs;
    bomb.motionDuration = bomb.motionTimer;
    bomb.motionStartX = startWorldX;
    bomb.motionStartY = startWorldY;
    bomb.motionTargetX = worldTargetX;
    bomb.motionTargetY = worldTargetY;
    bomb.motionTargetTileX = targetTileX;
    bomb.motionTargetTileY = targetTileY;
    bomb.motionArc = Number.isFinite(arc) ? arc : 18;
    bomb.motionRotation = 0;
    bomb.motionRotationSpeed = 0.18;
    bomb.playerPassThrough = true;
    return true;
}

function armBombV4(bomb){
    if (!bomb) return false;
    ensureBombV4State(bomb);
    const preserveTimer = bomb.preserveTimerOnArm === true;
    const remainingTimer = Number(bomb.timer);
    bomb.state = BOMB_V4_STATES.ARMED;
    bomb.motionState = 'idle';
    bomb.motionProgress = 1;
    bomb.motionTimer = 0;
    bomb.motionDuration = 0;
    bomb.worldX = (Number(bomb.x) + .5) * TILE_SIZE;
    bomb.worldY = (Number(bomb.y) + .5) * TILE_SIZE;
    bomb.playerPassThrough = false;
    bomb.justArmed = true;
    if (preserveTimer && Number.isFinite(remainingTimer)) {
        // El salto no regala mecha: si llegó a cero durante el vuelo, queda
        // pendiente de detonación y explota apenas toca suelo.
        bomb.timer = Math.max(0, remainingTimer);
    } else {
        bomb.timer = Math.max(120, Number(bomb.fuseTotal || bomb.timer || 120));
    }
    bomb.preserveTimerOnArm = false;
    bomb.warnBucket = Math.ceil(bomb.timer / 300);
    return true;
}

function getBombV4WorldPosition(bomb){
    ensureBombV4State(bomb);
    return { x: Number(bomb.worldX), y: Number(bomb.worldY) };
}

function updateBombV4Motion(bomb, dt){
    if (!bomb) return false;
    ensureBombV4State(bomb);
    bomb.bobPhase += dt * 0.009;
    if (bomb.state !== BOMB_V4_STATES.MOVING) return false;

    bomb.motionTimer = Math.max(0, bomb.motionTimer - dt);
    const duration = Math.max(1, bomb.motionDuration);
    const raw = 1 - bomb.motionTimer / duration;
    const t = Math.max(0, Math.min(1, raw));
    bomb.motionProgress = t;
    const eased = t * t * (3 - 2 * t);
    const baseX = bomb.motionStartX + (bomb.motionTargetX - bomb.motionStartX) * eased;
    const baseY = bomb.motionStartY + (bomb.motionTargetY - bomb.motionStartY) * eased;
    const arc = Math.sin(Math.PI * eased) * bomb.motionArc;
    bomb.worldX = baseX;
    bomb.worldY = baseY - arc;
    bomb.motionRotation += (bomb.motionRotationSpeed || 0) * Math.max(0.5, Math.min(2, dt / 16.6667));

    if (bomb.motionTimer <= 0) {
        const targetTileX = Number(bomb.motionTargetTileX);
        const targetTileY = Number(bomb.motionTargetTileY);
        const targetInBounds = Number.isInteger(targetTileX) && Number.isInteger(targetTileY) &&
            targetTileX >= 0 && targetTileY >= 0 &&
            targetTileX < gameState.gridWidth && targetTileY < gameState.gridHeight;

        if (!targetInBounds) {
            // Guardia final: una bomba jamás puede armarse fuera del tablero.
            const safeX = Math.max(0, Math.min(gameState.gridWidth - 1, Number(bomb.x) || 0));
            const safeY = Math.max(0, Math.min(gameState.gridHeight - 1, Number(bomb.y) || 0));
            bomb.x = safeX;
            bomb.y = safeY;
            bomb.worldX = (safeX + .5) * TILE_SIZE;
            bomb.worldY = (safeY + .5) * TILE_SIZE;
            bomb.motionQueue.length = 0;
            bomb.pendingDetonation = false;
            armBombV4(bomb);
            return true;
        }

        bomb.x = targetTileX;
        bomb.y = targetTileY;
        bomb.worldX = (targetTileX + .5) * TILE_SIZE;
        bomb.worldY = (targetTileY + .5) * TILE_SIZE;

        if (bomb.motionQueue.length) {
            // motionQueue SIEMPRE usa coordenadas de CASILLA.
            const next = bomb.motionQueue.shift();
            const nextTileX = Number(next.x);
            const nextTileY = Number(next.y);
            const nextInBounds = Number.isInteger(nextTileX) && Number.isInteger(nextTileY) &&
                nextTileX >= 0 && nextTileY >= 0 &&
                nextTileX < gameState.gridWidth && nextTileY < gameState.gridHeight;

            if (!nextInBounds) {
                bomb.motionQueue.length = 0;
                armBombV4(bomb);
                return true;
            }

            const nextWorldX = (nextTileX + 0.5) * TILE_SIZE;
            const nextWorldY = (nextTileY + 0.5) * TILE_SIZE;
            bomb.motionTargetTileX = nextTileX;
            bomb.motionTargetTileY = nextTileY;
            bomb.preserveTimerOnArm = true;
            if (!startBombV4Motion(
                bomb,
                nextWorldX,
                nextWorldY,
                Number(next.durationMs) || 220,
                Number(next.arc) || TILE_SIZE * .30
            )) {
                bomb.motionQueue.length = 0;
                armBombV4(bomb);
            }
            return true;
        }

        armBombV4(bomb);
        return true;
    }
    return false;
}

function bombV4StateSummary(bomb){
    if (!bomb) return 'N/D';
    ensureBombV4State(bomb);
    return `${bomb.state}/${bomb.motionState}`;
}

function getBombAtTile(gx, gy){
    return gameState.bombs.find(b => {
        if (!b || b.x !== gx || b.y !== gy) return false;
        ensureBombV4State(b);
        return b.state !== BOMB_V4_STATES.MOVING;
    }) || null;
}

function markBombEscapeState(){
    // La salida segura termina SOLO cuando la hitbox de movimiento del jugador
    // deja de tocar por completo la casilla de la bomba. Antes se usaba el
    // centro del jugador; eso podía volver sólida la bomba un frame demasiado
    // pronto y dejar al jugador atrapado en su propio borde.
    const playerBox = typeof getMovementHitbox === 'function'
        ? getMovementHitbox(player.x, player.y, player.width, player.height)
        : {
            left: player.x, right: player.x + player.width,
            top: player.y, bottom: player.y + player.height
        };

    gameState.bombs.forEach(bomb => {
        if (!bomb.playerPassThrough) return;

        const bombRect = {
            left: bomb.x * TILE_SIZE,
            right: (bomb.x + 1) * TILE_SIZE,
            top: bomb.y * TILE_SIZE,
            bottom: (bomb.y + 1) * TILE_SIZE
        };

        const stillOverlaps = playerBox.right > bombRect.left &&
            playerBox.left < bombRect.right &&
            playerBox.bottom > bombRect.top &&
            playerBox.top < bombRect.bottom;

        // Mientras cualquier parte de la hitbox siga dentro de la celda,
        // la bomba continúa atravesable para garantizar una huida completa.
        if (!stillOverlaps) {
            bomb.playerPassThrough = false;
            bomb.justArmed = true;
        }
    });
}

function beginBombHold(source='input'){
    if (bombInputState.held) return false;
    bombInputState.held = true;
    bombInputState.source = source;
    bombInputState.startedAt = performance.now();
    bombInputState.lastRepeatAt = 0;
    bombInputState.blockedByMovement = false;
    const placed = requestBombPlacement('press');
    // Si la colocación inicial falla porque todavía te estás moviendo, no se
    // cancela la retención: el siguiente intento debe volver a probar cuando
    // haya pasado el retardo inicial.
    bombInputState.blockedByMovement = false;
    return placed;
}

function endBombHold(){
    bombInputState.held = false;
    bombInputState.source = null;
    bombInputState.startedAt = 0;
    bombInputState.lastRepeatAt = 0;
    bombInputState.blockedByMovement = false;
}

function isRecentMovementInput(){
    return player.isMoving && performance.now() - (gameState.lastMoveInputAt || 0) < BOMB_HANDLING.movePlacementGrace;
}

function requestBombPlacement(reason='press'){
    if (!gameState.isPlaying || gameState.paused) return false;

    // GRAB es una acción explícita: con el powerup activo, una pulsación de
    // bomba intenta primero recoger/dejar una bomba. Solo si no hay una acción
    // de GRAB válida se comporta como el botón clásico de colocar bomba.
    if (reason === 'press' && typeof window.handlePlayerBombActionV683 === 'function') {
        const interactionResult = window.handlePlayerBombActionV683();
        if (interactionResult) return true;
    } else if (reason === 'press' && typeof window.tryGrabPlayerBombV610 === 'function' && typeof window.isGrabActiveV681 === 'function' && window.isGrabActiveV681(player)) {
        const grabResult = window.tryGrabPlayerBombV610();
        if (grabResult) return true;
    }

    if (reason === 'press' && isRecentMovementInput()) return false;
    const before = player.bombsPlaced;
    const placed = placeBomb(reason);
    if (placed && player.bombsPlaced > before && navigator.vibrate) {
        try { navigator.vibrate(10); } catch (_) {}
    }
    return placed;
}

function getBombKickDirectionV67(){
    const touch=gameState?.touchControls||{};
    if(Math.abs(Number(touch.x))>=Math.abs(Number(touch.y)) && Math.abs(Number(touch.x))>=.25) return {dx:Math.sign(Number(touch.x)),dy:0};
    if(Math.abs(Number(touch.y))>=.25) return {dx:0,dy:Math.sign(Number(touch.y))};
    const keys=gameState?.keys||{};
    if(keys.ArrowLeft||keys.KeyA) return {dx:-1,dy:0};
    if(keys.ArrowRight||keys.KeyD) return {dx:1,dy:0};
    if(keys.ArrowUp||keys.KeyW) return {dx:0,dy:-1};
    if(keys.ArrowDown||keys.KeyS) return {dx:0,dy:1};
    const currentPlayer = getRuntimePlayerV682();
    if (['up','down','left','right'].includes(currentPlayer?.dir)) {
        if (currentPlayer.dir === 'left') return {dx:-1,dy:0};
        if (currentPlayer.dir === 'right') return {dx:1,dy:0};
        if (currentPlayer.dir === 'up') return {dx:0,dy:-1};
        if (currentPlayer.dir === 'down') return {dx:0,dy:1};
    }
    return {dx:0,dy:0};
}

function getRuntimePlayerV682(){
    return globalThis.BOMBER_ENGINE?.getPlayer?.()
        || globalThis.player
        || (typeof player !== 'undefined' ? player : null);
}

function kickBombV67(bomb,dx,dy){
    const currentPlayer = getRuntimePlayerV682();
    if(!bomb||!currentPlayer||typeof globalThis.startBombKickV682!=='function') return false;
    return !!globalThis.startBombKickV682(bomb,currentPlayer,{x:Number(dx)||0,y:Number(dy)||0});
}

function getAdjacentPlayerBombV67(){
    const currentPlayer = getRuntimePlayerV682();
    if(!currentPlayer||typeof globalThis.getAdjacentPlayerBombV682!=='function') return null;
    return globalThis.getAdjacentPlayerBombV682(currentPlayer);
}

function tryKickPlayerBombsV67(){
    if(typeof globalThis.processPlayerBombInteractionV682==='function') return !!globalThis.processPlayerBombInteractionV682();
    return false;
}

function placeBomb(reason='manual'){
    if (!gameState.isPlaying || gameState.paused) return false;
    if ((player.bombCooldown || 0) > 0) return false;
    if (player.bombsPlaced >= player.maxBombs) return false;

    const gx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const gy = Math.floor((player.y + player.height / 2) / TILE_SIZE);
    if (getBombAtTile(gx, gy)) return false;
    if (!gameState.grid[gy] || gameState.grid[gy][gx] === TYPES.WALL || gameState.grid[gy][gx] === TYPES.BLOCK) return false;
    const materialMods = typeof getBombMaterialModifiersV67 === 'function' ? getBombMaterialModifiersV67(gx, gy) : { fuseMultiplier:1, canPlace:true, kickOnPlace:false };
    if (!materialMods.canPlace) return false;

    const baseFuse = gameState.roomType.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
    const fuseTotal = Math.max(700, Math.round(baseFuse * (typeof getBombFuseMultiplier === 'function' ? getBombFuseMultiplier() : 1) * materialMods.fuseMultiplier));
    const bomb = {
        id: `bomb-${gameState.animFrame}-${Math.random().toString(36).slice(2,7)}`,
        owner: 'player',
        x: gx, y: gy,
        range: Math.max(1, player.bombRange),
        timer: fuseTotal,
        fuseTotal,
        warnBucket: Math.ceil(fuseTotal / 300),
        scalePulse: 1,
        playerPassThrough: true,
        justArmed: false,
        placedAtFrame: gameState.animFrame,
        placementReason: reason,
        state: BOMB_V4_STATES.ARMED,
        motionState: 'idle',
        worldX: (gx + .5) * TILE_SIZE,
        worldY: (gy + .5) * TILE_SIZE,
        motionProgress: 1,
        motionTimer: 0,
        motionDuration: 0,
        motionStartX: (gx + .5) * TILE_SIZE,
        motionStartY: (gy + .5) * TILE_SIZE,
        motionTargetX: (gx + .5) * TILE_SIZE,
        motionTargetY: (gy + .5) * TILE_SIZE,
        motionArc: 0,
        motionRotation: 0,
        motionRotationSpeed: 0,
        bobPhase: 0,
        motionQueue: [],
        preserveTimerOnArm: false,
        countsTowardPlayerCapacity: true,
        elementV612: typeof getPlayerBombElementV612 === 'function' ? getPlayerBombElementV612() : 'normal'
    };

    if (typeof applyElementToBombV612 === 'function') applyElementToBombV612(bomb);
    gameState.bombs.push(bomb);
    player.bombsPlaced++;
    if (typeof playerFSMStartBomb === 'function') playerFSMStartBomb();
    player.bombCooldown = BOMB_HANDLING.placementCooldown;
    if (typeof triggerBombPlacedFeedback === 'function') triggerBombPlacedFeedback(bomb);
    sfx('bomb');
    updateUI(true);
    return true;
}

function resetBombHandlingState(){
    endBombHold();
    player.bombCooldown = 0;
    bombHandlingFx.chainLinks.length = 0;
}

function getExplosionCellRect(exp, inset=5){
    return {
        left: exp.x * TILE_SIZE + inset,
        right: (exp.x + 1) * TILE_SIZE - inset,
        top: exp.y * TILE_SIZE + inset,
        bottom: (exp.y + 1) * TILE_SIZE - inset
    };
}

function explosionOverlapsRect(rect, exp, inset=5){
    const cell = getExplosionCellRect(exp, inset);
    return rect.right > cell.left && rect.left < cell.right &&
           rect.bottom > cell.top && rect.top < cell.bottom;
}

function calculateBombBlastCells(bomb){
    if (!bomb) return [];
    const cellsByKey = new Map();
    const addCell = (x, y, block, fragment = false) => {
        const key = `${x},${y}`;
        const previous = cellsByKey.get(key);
        if (previous) {
            previous.block = !!previous.block || !!block;
            previous.fragment = !!previous.fragment || !!fragment;
            return;
        }
        cellsByKey.set(key, { x, y, block:!!block, ...(fragment ? { fragment:true } : {}) });
    };
    addCell(bomb.x, bomb.y, false);
    const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
    const pierceLimit = bomb.elementV612 === 'pierce' ? 2 : 0;
    for (const dir of dirs){
        let blocksPierced = 0;
        for (let r=1; r<=bomb.range; r++){
            const x=bomb.x+dir.dx*r, y=bomb.y+dir.dy*r;
            if(x<0 || x>=gameState.gridWidth || y<0 || y>=gameState.gridHeight) break;
            const type=gameState.grid[y]?.[x];
            if(type===TYPES.WALL) break;
            const block=type===TYPES.BLOCK;
            addCell(x,y,block);
            if (block) {
                if (blocksPierced < pierceLimit) { blocksPierced++; continue; }
                break;
            }
        }
    }

    // Cuatro esquirlas diagonales. Comprueban las dos casillas ortogonales
    // contiguas para no atravesar esquinas cerradas; los bloques paran la esquirla.
    if (bomb.elementV612 === 'fragment') {
        const diagonalDirs = [{dx:1,dy:1},{dx:-1,dy:1},{dx:1,dy:-1},{dx:-1,dy:-1}];
        const fragmentRange = Math.max(1, Math.min(3, Math.floor(Number(bomb.range) || 1)));
        for (const dir of diagonalDirs) {
            for (let r=1; r<=fragmentRange; r++) {
                const x=bomb.x+dir.dx*r, y=bomb.y+dir.dy*r;
                if(x<0 || x>=gameState.gridWidth || y<0 || y>=gameState.gridHeight) break;
                const previousX=x-dir.dx, previousY=y-dir.dy;
                const sideA=gameState.grid?.[previousY]?.[x];
                const sideB=gameState.grid?.[y]?.[previousX];
                if (sideA===TYPES.WALL || sideA===TYPES.BLOCK || sideB===TYPES.WALL || sideB===TYPES.BLOCK) break;
                const type=gameState.grid[y]?.[x];
                if(type===TYPES.WALL) break;
                const block=type===TYPES.BLOCK;
                addCell(x,y,block,true);
                if(block) break;
            }
        }
    }
    return [...cellsByKey.values()];
}



function registerBombChainLink(from,to,index,total){
    bombHandlingFx.chainLinks.push({
        x1:from.x,y1:from.y,x2:to.x,y2:to.y,
        timer:220,max:220,index,total
    });
}

function updateBombInput(dt){
    if(!bombInputState.held || !gameState.isPlaying || gameState.paused) return;
    // Una retención nunca queda bloqueada de forma permanente por un intento
    // fallido durante el movimiento; cada repetición vuelve a intentar colocar.
    const now=performance.now();
    const heldFor=now-bombInputState.startedAt;
    if(heldFor < BOMB_HANDLING.holdInitialDelay) return;
    if(now-bombInputState.lastRepeatAt < BOMB_HANDLING.holdRepeat) return;
    requestBombPlacement('hold');
    bombInputState.lastRepeatAt=now;
}

function bombUpdate(dt){
    // ÚNICA FUENTE DE VERDAD DEL CICLO DE VIDA DE LAS BOMBAS.
    // Todo: cooldowns, movimiento, salto, mecha, límites y detonación pasa por aquí.
    player.bombCooldown=Math.max(0,(player.bombCooldown||0)-dt);
    player.kickCooldown=Math.max(0,(player.kickCooldown||0)-dt);
    if(typeof window.updateBombEntityInteractionsV682==='function') window.updateBombEntityInteractionsV682();
    updateBombInput(dt);
    markBombEscapeState();

    for(let i=bombHandlingFx.chainLinks.length-1;i>=0;i--){
        bombHandlingFx.chainLinks[i].timer-=dt;
        if(bombHandlingFx.chainLinks[i].timer<=0) bombHandlingFx.chainLinks.splice(i,1);
    }

    for(let i=gameState.bombs.length-1;i>=0;i--){
        const bomb=gameState.bombs[i];
        if(!bomb) continue;
        ensureBombV4State(bomb);

        // La mecha corre durante ARMADO y VUELO, pero queda pausada en CARRIED.
        let liquidPausedFuse = false;
        let liquidFuseRate = 1;
        let biomeBombRate = 1;
        let biomeBombMotion = 1;
        let biomeBombInstant = false;
        const biomeBombEffect = typeof getLivingBiomeBombModifiersV620 === 'function' ? getLivingBiomeBombModifiersV620(bomb) : null;
        if (biomeBombEffect) {
            biomeBombRate = Math.max(0.1, Number(biomeBombEffect.fuseRate) || 1);
            biomeBombMotion = Math.max(0.4, Number(biomeBombEffect.motionMultiplier) || 1);
            biomeBombInstant = !!biomeBombEffect.instant;
        }
        const preLiquidEffect = typeof getLiquidBombEffectV631 === 'function'
            ? getLiquidBombEffectV631(bomb.x, bomb.y)
            : null;
        if (bomb.state !== BOMB_V4_STATES.CARRIED && preLiquidEffect) {
            liquidPausedFuse = Number(preLiquidEffect.sinkBombAfterMs) > 0 || Number(preLiquidEffect.bombFuseRate) === 0;
            liquidFuseRate = Number(preLiquidEffect.bombFuseRate);
        }
        if(bomb.state !== BOMB_V4_STATES.CARRIED && !liquidPausedFuse){
            bomb.timer-=dt * liquidFuseRate * biomeBombRate;
            if(bomb.timer<=0) bomb.pendingDetonation=true;
        }

        if (biomeBombMotion !== 1) bomb.__biomeMotionMultiplierV620 = biomeBombMotion;
        updateBombV4Motion(bomb, dt * biomeBombMotion);
        ensureBombV4State(bomb);

        const liquidProcess = typeof processBombLiquidV631 === 'function'
            ? processBombLiquidV631(bomb, dt)
            : { consumed:false, pausedFuse:false, instant:false };
        if (liquidProcess.consumed) {
            gameState.bombs.splice(i, 1);
            if (bomb.countsTowardPlayerCapacity !== false) player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);
            if (typeof addParticles === 'function') addParticles((bomb.x + 0.5) * TILE_SIZE, (bomb.y + 0.5) * TILE_SIZE, 'particleImpact', 8);
            continue;
        }
        if (liquidProcess.instant || biomeBombInstant) bomb.pendingDetonation = true;
        if (liquidProcess.pausedFuse) bomb.pendingDetonation = false;

        if(bomb.state !== BOMB_V4_STATES.ARMED) continue;
        if(bomb.timer>0 && bomb.timer<=BOMB_HANDLING.warningStart){
            const bucket=Math.ceil(bomb.timer/300);
            if(bucket!==bomb.warnBucket){
                bomb.warnBucket=bucket;
                sfx('bomb');
            }
        }

        if(bomb.pendingDetonation || bomb.timer<=0){
            bomb.pendingDetonation=false;
            explodeBomb(i);
        }
    }
}

// Compatibilidad: el loop existente sigue llamando updateBombHandling(), pero
// ya no contiene lógica propia. Desde v6.7.1 todo desemboca en bombUpdate().
function updateBombHandling(dt){
    return bombUpdate(dt);
}

function drawBombChainLinks(){
    if(!bombHandlingFx.chainLinks.length) return;
    ctx.save();
    ctx.lineCap='round';
    for(const link of bombHandlingFx.chainLinks){
        const a=link.timer/link.max;
        const x1=(link.x1+.5)*TILE_SIZE, y1=(link.y1+.5)*TILE_SIZE;
        const x2=(link.x2+.5)*TILE_SIZE, y2=(link.y2+.5)*TILE_SIZE;
        ctx.strokeStyle=`rgba(251,191,36,${.25+.7*a})`;
        ctx.lineWidth=2+a*2;
        ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle=`rgba(34,211,238,${.15+.45*a})`;
        ctx.beginPath(); ctx.arc(x2,y2,5+4*a,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

window.BOMB_V4_STATES = BOMB_V4_STATES;
window.ensureBombV4State = ensureBombV4State;
window.startBombV4Motion = startBombV4Motion;
window.armBombV4 = armBombV4;
window.getBombV4WorldPosition = getBombV4WorldPosition;
window.bombV4StateSummary = bombV4StateSummary;
window.kickBombV67 = kickBombV67;
window.bombUpdate = bombUpdate;
window.updateBombHandling = updateBombHandling;
window.tryKickPlayerBombsV67 = tryKickPlayerBombsV67;
window.getBombKickDirectionV67 = getBombKickDirectionV67;
window.getAdjacentPlayerBombV67 = getAdjacentPlayerBombV67;
window.placeBomb = placeBomb;

;
// === js/14-collision.js ===
// Bomberman Roguelike v3.20.0 — Robust Grid Motion & Collision
// Una única fuente de verdad para colisiones contra la rejilla.
// El movimiento sigue siendo continuo, pero paredes/bloques se resuelven por celdas.

const GRID_COLLISION_V312 = {
    epsilon: 0.001,
    playerInset: 5,
    playerPadding: 1.5,
    entityInsetRatio: 0.47,
    defaultMaxStep: 2.0,
    centerSnapRadius: 7.0,
    enemyLaneTolerance: 2.0,
    enemyLaneCorrectionStep: 1.8,
    // v3.20: corrección controlada; nunca se hace snap exacto salvo una
    // diferencia subpíxel residual.
    enemyLaneSnapEpsilon: 0.15
};


function gridGetEntityRect(entity, x, y, kind = null) {
    const resolvedKind = kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');

    if (resolvedKind === 'player') {
        const inset = GRID_COLLISION_V312.playerInset;
        const pad = GRID_COLLISION_V312.playerPadding;
        return {
            left: x + inset + pad,
            right: x + entity.width - inset - pad,
            top: y + inset + pad,
            bottom: y + entity.height - inset - pad
        };
    }

    const halfW = entity.width * GRID_COLLISION_V312.entityInsetRatio;
    const halfH = entity.height * GRID_COLLISION_V312.entityInsetRatio;
    return {
        left: x - halfW,
        right: x + halfW,
        top: y - halfH,
        bottom: y + halfH
    };
}

function gridGetOverlappedTiles(rect) {
    if (!rect || rect.right <= rect.left || rect.bottom <= rect.top) return [];
    // v3.20: una entidad parcialmente fuera del mundo no puede ser ocupable.
    const worldRight = gameState.gridWidth * TILE_SIZE;
    const worldBottom = gameState.gridHeight * TILE_SIZE;
    if (rect.left < 0 || rect.top < 0 || rect.right > worldRight || rect.bottom > worldBottom) return [];

    const minGX = Math.max(0, Math.floor(rect.left / TILE_SIZE));
    const maxGX = Math.min(gameState.gridWidth - 1, Math.floor((rect.right - GRID_COLLISION_V312.epsilon) / TILE_SIZE));
    const minGY = Math.max(0, Math.floor(rect.top / TILE_SIZE));
    const maxGY = Math.min(gameState.gridHeight - 1, Math.floor((rect.bottom - GRID_COLLISION_V312.epsilon) / TILE_SIZE));
    const tiles = [];

    for (let gy = minGY; gy <= maxGY; gy++) {
        for (let gx = minGX; gx <= maxGX; gx++) tiles.push({ x: gx, y: gy });
    }
    return tiles;
}

function gridIsInside(x, y) {
    return x >= 0 && y >= 0 && x < gameState.gridWidth && y < gameState.gridHeight;
}

function gridTileIsBlocked(gx, gy, options = {}) {
    if (!gridIsInside(gx, gy)) return true;
    const tile = gameState.grid[gy]?.[gx];
    const canFly = !!options.canFly;

    if (tile === TYPES.WALL) return true;
    if (!canFly && tile === TYPES.BLOCK) return true;
    return false;
}

function gridCurrentTile(entity, kind = null) {
    const resolvedKind = kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    if (resolvedKind === 'player') {
        return {
            x: Math.floor((entity.x + entity.width / 2) / TILE_SIZE),
            y: Math.floor((entity.y + entity.height / 2) / TILE_SIZE)
        };
    }
    return {
        x: Math.floor(entity.x / TILE_SIZE),
        y: Math.floor(entity.y / TILE_SIZE)
    };
}

function gridTileCenter(gx, gy) {
    return {
        x: gx * TILE_SIZE + TILE_SIZE / 2,
        y: gy * TILE_SIZE + TILE_SIZE / 2
    };
}

function gridCanOccupy(entity, x, y, options = {}) {
    const kind = options.kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    const rect = gridGetEntityRect(entity, x, y, kind);
    const tiles = gridGetOverlappedTiles(rect);

    if (!tiles.length) return false;

    const current = gridCurrentTile(entity, kind);
    const allowCurrentBombTile = options.allowCurrentBombTile !== false;

    for (const tile of tiles) {
        if (gridTileIsBlocked(tile.x, tile.y, options)) return false;

        // Bombas = pared para TODAS las entidades que usan la colisión de rejilla.
        // La única excepción controlada es la casilla en la que la entidad ya está
        // parada mientras termina de salir de una bomba recién colocada.
        if (!options.ignoreBombs) {
            const currentTile = tile.x === current.x && tile.y === current.y;
            const bomb = typeof getBombAtTile === 'function'
                ? getBombAtTile(tile.x, tile.y)
                : gameState.bombs?.find(b => b && b.x === tile.x && b.y === tile.y && b.state !== 'moving');
            const playerPassThrough = kind === 'player' && bomb && bomb.playerPassThrough === true;
            if (bomb && !playerPassThrough && !(allowCurrentBombTile && currentTile)) return false;
        }

        if (options.avoidDanger && typeof isEnemyBombDanger === 'function' && isEnemyBombDanger(tile.x, tile.y)) {
            const currentTile = tile.x === current.x && tile.y === current.y;
            if (!currentTile) return false;
        }
    }

    return true;
}


// v6.9.1 — Movimiento discreto por tiles.
// Las entidades se desplazan de centro de celda a centro de celda. La animación
// puede interpolar entre ambos centros, pero nunca cambia de carril ni termina
// una orden en una posición intermedia.
function gridGetEntityTileCenterPosition(entity, gx, gy, kind = null) {
    const resolvedKind = kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    const center = gridTileCenter(gx, gy);
    if (resolvedKind === 'player') {
        return { x: center.x - Number(entity.width) / 2, y: center.y - Number(entity.height) / 2 };
    }
    return center;
}

function gridSnapEntityToTile(entity, gx, gy, kind = null) {
    if (!entity || !gridIsInside(gx, gy)) return false;
    const resolvedKind = kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    const pos = gridGetEntityTileCenterPosition(entity, gx, gy, resolvedKind);
    entity.x = pos.x;
    entity.y = pos.y;
    return true;
}

function gridResetTileMove(entity, initialized = false) {
    if (!entity) return false;
    entity._tileMoveActive = false;
    entity._tileMoveTargetX = null;
    entity._tileMoveTargetY = null;
    entity._tileMoveTargetGX = null;
    entity._tileMoveTargetGY = null;
    entity._tileMoveInitialized = !!initialized;
    return true;
}

function gridBeginTileMove(entity, gx, gy, options = {}) {
    if (!entity || !gridIsInside(gx, gy)) return false;
    const kind = options.kind || (entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player');
    if (!gridCanOccupy(entity, gridGetEntityTileCenterPosition(entity, gx, gy, kind).x, gridGetEntityTileCenterPosition(entity, gx, gy, kind).y, options)) return false;
    const pos = gridGetEntityTileCenterPosition(entity, gx, gy, kind);
    entity._tileMoveTargetX = pos.x;
    entity._tileMoveTargetY = pos.y;
    entity._tileMoveTargetGX = gx;
    entity._tileMoveTargetGY = gy;
    entity._tileMoveActive = true;
    return true;
}

function gridAdvanceTileMove(entity, speedPxPerFrame, dt, options = {}) {
    if (!entity?._tileMoveActive) return { active: false, arrived: false, moved: false };
    const safeDt = Math.max(0, Number(dt) || 0);
    const safeSpeed = Math.max(0, Number(speedPxPerFrame) || 0);
    const scale = Math.min(safeDt / 16.6667, 2);
    let remaining = safeSpeed * scale;

    // Si este frame no tiene delta o velocidad efectiva, no inventamos
    // desplazamiento ni animación. El movimiento queda pendiente para el
    // siguiente frame con un delta válido.
    if (remaining <= 0) return { active: true, arrived: false, moved: false };
    const tx = Number(entity._tileMoveTargetX);
    const ty = Number(entity._tileMoveTargetY);
    const cx = Number(entity.x);
    const cy = Number(entity.y);
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist <= 0.001 || remaining >= dist) {
        entity.x = tx;
        entity.y = ty;
        entity._tileMoveActive = false;
        return { active: false, arrived: true, moved: dist > 0.001 };
    }
    if (Math.abs(dx) > 0.001) entity.x += Math.sign(dx) * Math.min(remaining, Math.abs(dx));
    else if (Math.abs(dy) > 0.001) entity.y += Math.sign(dy) * Math.min(remaining, Math.abs(dy));
    return { active: true, arrived: false, moved: remaining > 0 };
}

function gridMoveCardinal(entity, dx, dy, options = {}) {
    if (!dx && !dy) return { moved: false, blocked: false, laneCorrected: false, movedPx: 0, laneCorrectionPx: 0, diagonalInputResolved: false };

    const originalDx = dx;
    const originalDy = dy;
    const startX = Number(entity?.x || 0);
    const startY = Number(entity?.y || 0);
    let diagonalInputResolved = false;

    // La navegación del juego es estrictamente cardinal.
    if (dx && dy) {
        diagonalInputResolved = true;
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
        else dx = 0;
    }

    const amount = dx || dy;
    const axis = dx ? 'x' : 'y';
    const maxStep = options.maxStep || GRID_COLLISION_V312.defaultMaxStep;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / maxStep));
    const step = amount / steps;
    let moved = false;
    let blocked = false;
    let laneCorrected = false;
    let laneCorrectionConsumed = false;
    let movedPx = 0;
    let laneCorrectionPx = 0;

    for (let i = 0; i < steps; i++) {
        // Enemigos: un corredor tiene un eje de avance y otro eje bloqueado al
        // centro de su celda. Así no pueden quedar "entre dos pisos/celdas" ni
        // cortar una esquina mientras siguen desplazándose. La corrección es
        // gradual y cardinal; nunca combina X e Y en el mismo paso.
        if (options.kind === 'enemy' && options.laneLock) {
            const tile = gridCurrentTile(entity, 'enemy');
            const center = gridTileCenter(tile.x, tile.y);
            const laneAxis = axis === 'x' ? 'y' : 'x';
            const currentLane = entity[laneAxis];
            const targetLane = center[laneAxis];
            const offset = targetLane - currentLane;
            const tolerance = options.laneTolerance ?? GRID_COLLISION_V312.enemyLaneTolerance;

            if (Math.abs(offset) > tolerance) {
                const correctionStep = options.laneCorrectionStep || GRID_COLLISION_V312.enemyLaneCorrectionStep;
                const correction = Math.sign(offset) * Math.min(Math.abs(offset), correctionStep, maxStep);
                const nextX = laneAxis === 'x' ? entity.x + correction : entity.x;
                const nextY = laneAxis === 'y' ? entity.y + correction : entity.y;
                if (!gridCanOccupy(entity, nextX, nextY, options)) {
                    blocked = true;
                    break;
                }
                entity.x = nextX;
                entity.y = nextY;
                moved = true;
                movedPx += Math.abs(correction);
                laneCorrectionPx += Math.abs(correction);
                laneCorrected = true;
                laneCorrectionConsumed = true;
                // La corrección lateral sigue siendo estrictamente cardinal.
                // No se agrega avance longitudinal en este mismo substep.
                continue;
            }

            // v3.20: dentro de tolerancia NO hacemos snap al centro. El pequeño
            // error lateral se conserva para evitar micro-parones y saltos
            // visuales. Solo un residuo subpíxel puede normalizarse.
            const residual = Math.abs(offset);
            if (residual > GRID_COLLISION_V312.enemyLaneSnapEpsilon) {
                // Mantener la posición dentro de la tolerancia es suficiente.
                // El movimiento longitudinal puede continuar normalmente.
            } else if (residual > 0) {
                const snapX = laneAxis === 'x' ? center.x : entity.x;
                const snapY = laneAxis === 'y' ? center.y : entity.y;
                if (!gridCanOccupy(entity, snapX, snapY, options)) {
                    blocked = true;
                    break;
                }
                const snapDistance = Math.abs(center[laneAxis] - entity[laneAxis]);
                if (snapDistance > 0) {
                    entity.x = snapX;
                    entity.y = snapY;
                    laneCorrected = true;
                    laneCorrectionConsumed = true;
                    laneCorrectionPx += snapDistance;
                    movedPx += snapDistance;
                }
            }
        }

        // Una corrección de lane consume el frame lógico completo. No dejamos
        // que los substeps restantes avancen por el eje longitudinal: el punto
        // final del frame debe seguir siendo estrictamente cardinal.
        if (laneCorrectionConsumed) break;

        const nextX = axis === 'x' ? entity.x + step : entity.x;
        const nextY = axis === 'y' ? entity.y + step : entity.y;
        if (!gridCanOccupy(entity, nextX, nextY, options)) {
            blocked = true;
            break;
        }
        entity.x = nextX;
        entity.y = nextY;
        moved = true;
        movedPx += Math.abs(step);
    }

    const result = {
        moved,
        blocked,
        laneCorrected,
        movedPx,
        laneCorrectionPx,
        diagonalInputResolved,
        laneCorrectionConsumed,
        input: { dx: originalDx, dy: originalDy }
    };
    return result;
}

function gridIsNearTileCenter(entity, radius = GRID_COLLISION_V312.centerSnapRadius) {
    const kind = entity && entity.__gridAnchor === 'center' ? 'enemy' : 'player';
    const tile = gridCurrentTile(entity, kind);
    const center = gridTileCenter(tile.x, tile.y);
    if (kind === 'player') {
        const cx = entity.x + entity.width / 2;
        const cy = entity.y + entity.height / 2;
        return Math.abs(cx - center.x) <= radius && Math.abs(cy - center.y) <= radius;
    }
    return Math.abs(entity.x - center.x) <= radius && Math.abs(entity.y - center.y) <= radius;
}


;
// === js/15-bomb-interactions.js ===
// Bomberman Roguelike v6.12.6 — Bomberman-style bomb interactions
// KICK / GRAB son capacidades declarativas resueltas por 02-entity-capabilities.js.
// Este módulo contiene exclusivamente la interacción física con bombas.
(function installBombInteractionsV682(global) {
    'use strict';

    const KICK_SPEED_TILES_PER_SECOND = 6;
    // El jugador tiene un cap duro de 4 tiles por patada. Las entidades no-jugador
    // conservan el comportamiento previo: se detienen por obstáculo, sin cap nuevo.
    const PLAYER_KICK_DISTANCE_V682 = 4;
    const PLAYER_KICK_COOLDOWN_MS_V682 = 180;
    const CARRY_HEIGHT = 0.38;

    function getState() { return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }
    function getPlayer() { return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }
    function tileSize() { return Number(global.BOMBER_ENGINE?.getTileSize?.() || global.TILE_SIZE || 48); }

    function isBombCarried(bomb) {
        return !!bomb && typeof global.BOMB_V4_STATES === 'object' && bomb.state === global.BOMB_V4_STATES.CARRIED;
    }

    function getCarriedBombForEntity(entity) {
        if (!entity || typeof entity !== 'object') return null;
        if (entity.carriedBombV682 && isBombCarried(entity.carriedBombV682)) return entity.carriedBombV682;
        const state = getState();
        const found = state?.bombs?.find(b => isBombCarried(b) && b.carriedBy === entity);
        if (found) {
            entity.carriedBombV682 = found;
            return found;
        }
        return null;
    }

    function getEntityTile(entity) {
        if (!entity) return null;
        if (typeof global.gridCurrentTile === 'function') {
            try {
                const kind = entity === getPlayer() ? 'player' : 'enemy';
                return global.gridCurrentTile(entity, kind);
            } catch (_) {}
        }
        const tile = tileSize();
        if (entity === getPlayer()) {
            return { x: Math.floor((entity.x + entity.width / 2) / tile), y: Math.floor((entity.y + entity.height / 2) / tile) };
        }
        return { x: Math.floor(entity.x / tile), y: Math.floor(entity.y / tile) };
    }

    function parseDirection(value) {
        const key = String(value || '').toLowerCase();
        if (key === 'up' || key === 'north') return { x: 0, y: -1 };
        if (key === 'down' || key === 'south') return { x: 0, y: 1 };
        if (key === 'left' || key === 'west') return { x: -1, y: 0 };
        if (key === 'right' || key === 'east') return { x: 1, y: 0 };
        return null;
    }

    function getEntityInputDirection(entity) {
        const state = getState();
        if (!entity || !state) return null;
        const player = getPlayer();
        if (entity === player) {
            const keys = state.keys || {};
            let dx = 0, dy = 0;
            if (keys.ArrowLeft || keys.KeyA) dx = -1;
            else if (keys.ArrowRight || keys.KeyD) dx = 1;
            if (keys.ArrowUp || keys.KeyW) dy = -1;
            else if (keys.ArrowDown || keys.KeyS) dy = 1;

            if (!dx && !dy && state.touchControls) {
                const tx = Number(state.touchControls.x) || 0;
                const ty = Number(state.touchControls.y) || 0;
                if (Math.abs(tx) >= Math.abs(ty) && Math.abs(tx) >= 0.2) dx = tx < 0 ? -1 : 1;
                else if (Math.abs(ty) >= 0.2) dy = ty < 0 ? -1 : 1;
            }
            if (dx && dy) {
                if (state.lastMoveAxis === 'vertical') dx = 0;
                else dy = 0;
            }
            return dx || dy ? { x: dx, y: dy } : null;
        }

        const desired = parseDirection(entity.desiredDirection) || parseDirection(entity.lastDirection) || parseDirection(entity.dir);
        if (desired) return desired;
        const vx = Number(entity.vx) || 0;
        const vy = Number(entity.vy) || 0;
        if (Math.abs(vx) >= Math.abs(vy) && Math.abs(vx) > 0.01) return { x: vx < 0 ? -1 : 1, y: 0 };
        if (Math.abs(vy) > 0.01) return { x: 0, y: vy < 0 ? -1 : 1 };
        return null;
    }

    function getArchetype(entity) {
        return typeof global.getArchetypeV681 === 'function' ? global.getArchetypeV681(entity) : 'generic';
    }

    function entityCanUse(entity, capability) {
        const archetype = getArchetype(entity);
        if (archetype === 'player') {
            if (capability === 'kick') return !!global.isKickActiveV681?.(entity);
            if (capability === 'grab' || capability === 'carry') return !!global.isGrabActiveV681?.(entity);
            if (capability === 'throw') return !!global.isThrowActiveV681?.(entity);
            return false;
        }
        if (capability === 'kick') return !!global.canKick?.(entity);
        if (capability === 'grab' || capability === 'carry') return !!global.canGrab?.(entity);
        if (capability === 'throw') return !!global.canThrow?.(entity);
        return false;
    }

    function cellHasEntity(gx, gy, ignoredEntity = null) {
        const state = getState();
        if (!state) return false;
        const tile = tileSize();
        const rect = { left: gx * tile, right: (gx + 1) * tile, top: gy * tile, bottom: (gy + 1) * tile };
        const candidates = [];
        const player = getPlayer();
        if (player) candidates.push(player);
        if (Array.isArray(state.enemies)) candidates.push(...state.enemies);
        if (state.boss) candidates.push(state.boss);
        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state.level)
            : state.deathEchoV61;
        if (echo) candidates.push(echo);

        for (const entity of candidates) {
            if (!entity || entity === ignoredEntity || entity.defeated) continue;
            const w = Number(entity.width) || tile * 0.7;
            const h = Number(entity.height) || tile * 0.7;
            const cx = entity === player ? entity.x + w / 2 : entity.x;
            const cy = entity === player ? entity.y + h / 2 : entity.y;
            if (cx + w / 2 > rect.left && cx - w / 2 < rect.right && cy + h / 2 > rect.top && cy - h / 2 < rect.bottom) return true;
        }
        return false;
    }

    function cellFreeForKick(gx, gy, bomb, ignoredEntity) {
        const state = getState();
        if (!state || gx < 0 || gy < 0 || gx >= state.gridWidth || gy >= state.gridHeight) return false;
        const tileValue = state.grid?.[gy]?.[gx];
        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || global.TYPES || {};
        if (tileValue === types.WALL || tileValue === types.BLOCK) return false;
        if (typeof global.isBombMotionLandingTileFreeV67 === 'function' && !global.isBombMotionLandingTileFreeV67(gx, gy, bomb)) return false;
        if (cellHasEntity(gx, gy, ignoredEntity)) return false;
        return true;
    }

    function getAdjacentArmedBomb(entity, dir) {
        const state = getState();
        const tile = getEntityTile(entity);
        if (!state || !tile || !dir) return null;
        const gx = tile.x + dir.x;
        const gy = tile.y + dir.y;
        return state.bombs?.find(b => b && b.x === gx && b.y === gy && b.state === global.BOMB_V4_STATES.ARMED && !isBombCarried(b)) || null;
    }

    function getFacingDirection(entity) {
        if (!entity) return null;
        const key = String(entity.dir || entity.facing || entity.lastDirection || '').toLowerCase();
        if (key === 'up' || key === 'north') return { x: 0, y: -1 };
        if (key === 'down' || key === 'south') return { x: 0, y: 1 };
        if (key === 'left' || key === 'west') return { x: -1, y: 0 };
        if (key === 'right' || key === 'east') return { x: 1, y: 0 };
        return getEntityInputDirection(entity);
    }

    // GRAB se activa desde CUALQUIERA de las cuatro casillas adyacentes.
    // No exige que el jugador esté mirando hacia la bomba.
    function getAdjacentGrabBombAnyDirection(entity) {
        if (!entity || !entityCanUse(entity, 'grab')) return null;
        const tile = getEntityTile(entity);
        const state = getState();
        if (!tile || !state) return null;

        const facing = getFacingDirection(entity);
        const dirs = [
            facing,
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 }
        ].filter(Boolean);

        const seen = new Set();
        for (const dir of dirs) {
            const key = `${dir.x},${dir.y}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const bomb = getAdjacentArmedBomb(entity, dir);
            if (bomb) return bomb;
        }
        return null;
    }

    function startBombKickV682(bomb, entity, dir) {
        const state = getState();
        if (!bomb || !entity || !dir || !state) return false;
        if (!entityCanUse(entity, 'kick')) return false;
        if (entity === getPlayer() && Number(entity.kickCooldown) > 0) return false;
        if (bomb.state !== global.BOMB_V4_STATES.ARMED || bomb.carriedBy) return false;
        const entityTile = getEntityTile(entity);
        if (entityTile && entityTile.x === bomb.x && entityTile.y === bomb.y) return false;
        const targetX = Number(bomb.x) + dir.x;
        const targetY = Number(bomb.y) + dir.y;
        if (!cellFreeForKick(targetX, targetY, bomb, entity)) return false;

        const tile = tileSize();
        const startX = Number.isFinite(bomb.worldX) ? bomb.worldX : (bomb.x + 0.5) * tile;
        const startY = Number.isFinite(bomb.worldY) ? bomb.worldY : (bomb.y + 0.5) * tile;
        bomb.state = global.BOMB_V4_STATES.MOVING;
        bomb.motionState = global.BOMB_V4_STATES.MOVING;
        bomb.motionDirection = { x: dir.x, y: dir.y };
        bomb.motionSpeed = tile * KICK_SPEED_TILES_PER_SECOND / 1000;
        bomb.motionStartX = startX;
        bomb.motionStartY = startY;
        bomb.motionTargetTileX = targetX;
        bomb.motionTargetTileY = targetY;
        bomb.motionTargetX = (targetX + 0.5) * tile;
        bomb.motionTargetY = (targetY + 0.5) * tile;
        bomb.motionProgress = 0;
        bomb.motionTimer = 0;
        bomb.motionDuration = 0;
        bomb.motionArc = 0;
        bomb.motionRotation = 0;
        bomb.interactionMotionV682 = 'kick';
        bomb.interactionActorV682 = entity;
        if (entity === getPlayer()) bomb.kickRemainingV682 = PLAYER_KICK_DISTANCE_V682;
        else delete bomb.kickRemainingV682;
        bomb.playerPassThrough = true;
        bomb.justArmed = false;
        bomb.preserveTimerOnArm = true;
        if (entity === getPlayer()) entity.kickCooldown = PLAYER_KICK_COOLDOWN_MS_V682;
        return true;
    }

    function stopBombKickV682(bomb) {
        if (!bomb) return false;
        bomb.interactionMotionV682 = null;
        bomb.interactionActorV682 = null;
        bomb.motionDirection = null;
        bomb.motionSpeed = 0;
        bomb.motionQueue = [];
        bomb.preserveTimerOnArm = true;
        return typeof global.armBombV4 === 'function' ? global.armBombV4(bomb) : false;
    }

    function updateBombKickMotionV682(bomb, dt) {
        if (!bomb || bomb.state !== global.BOMB_V4_STATES.MOVING || bomb.interactionMotionV682 !== 'kick') return false;
        const dir = bomb.motionDirection;
        if (!dir || Math.abs(dir.x) + Math.abs(dir.y) !== 1) return stopBombKickV682(bomb);
        const hasPlayerKickLimit = bomb.interactionActorV682 === getPlayer();
        if (hasPlayerKickLimit && !Number.isFinite(Number(bomb.kickRemainingV682))) {
            bomb.kickRemainingV682 = PLAYER_KICK_DISTANCE_V682;
        }
        if (hasPlayerKickLimit && Number(bomb.kickRemainingV682) <= 0) return stopBombKickV682(bomb);
        const tile = tileSize();
        const speed = Math.max(tile * 6 / 1000, Number(bomb.motionSpeed) || 0);
        let remaining = speed * Math.max(0, Number(dt) || 0);
        const state = getState();

        while (remaining > 0.0001) {
            const targetX = Number(bomb.motionTargetX);
            const targetY = Number(bomb.motionTargetY);
            const dx = targetX - Number(bomb.worldX);
            const dy = targetY - Number(bomb.worldY);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (!Number.isFinite(dist) || dist <= 0.0001) {
                bomb.x = Number(bomb.motionTargetTileX);
                bomb.y = Number(bomb.motionTargetTileY);
                bomb.worldX = (bomb.x + 0.5) * tile;
                bomb.worldY = (bomb.y + 0.5) * tile;
                if (hasPlayerKickLimit) {
                    bomb.kickRemainingV682 = Math.max(0, (Number(bomb.kickRemainingV682) || 0) - 1);
                    if (bomb.kickRemainingV682 <= 0) return stopBombKickV682(bomb);
                }
                const nextX = bomb.x + dir.x;
                const nextY = bomb.y + dir.y;
                if (!cellFreeForKick(nextX, nextY, bomb, bomb.interactionActorV682)) return stopBombKickV682(bomb);
                bomb.motionStartX = bomb.worldX;
                bomb.motionStartY = bomb.worldY;
                bomb.motionTargetTileX = nextX;
                bomb.motionTargetTileY = nextY;
                bomb.motionTargetX = (nextX + 0.5) * tile;
                bomb.motionTargetY = (nextY + 0.5) * tile;
                bomb.motionProgress = 0;
                continue;
            }

            if (!cellFreeForKick(Number(bomb.motionTargetTileX), Number(bomb.motionTargetTileY), bomb, bomb.interactionActorV682)) {
                bomb.worldX = (bomb.x + 0.5) * tile;
                bomb.worldY = (bomb.y + 0.5) * tile;
                return stopBombKickV682(bomb);
            }

            const step = Math.min(remaining, dist);
            bomb.worldX += dir.x * step;
            bomb.worldY += dir.y * step;
            remaining -= step;
            const progressTotal = Math.max(1, tile);
            bomb.motionProgress = Math.max(0, Math.min(1, 1 - dist / progressTotal));

            if (step >= dist - 0.0001) {
                bomb.x = Number(bomb.motionTargetTileX);
                bomb.y = Number(bomb.motionTargetTileY);
                bomb.worldX = (bomb.x + 0.5) * tile;
                bomb.worldY = (bomb.y + 0.5) * tile;
            }
        }
        return true;
    }

    function getCarriedBombWorldPositionV682(bomb) {
        if (!isBombCarried(bomb)) return null;
        const carrier = bomb.carriedBy;
        if (!carrier || typeof carrier !== 'object') return null;
        const tile = tileSize();
        const width = Number(carrier.width) || tile * 0.7;
        const height = Number(carrier.height) || tile * 0.7;
        // El jugador y la mayoría de las entidades usan origen superior izquierdo.
        // Death Echo declara __gridAnchor='center'; sumar media anchura lo desplazaba
        // fuera del fantasma y también dejaba mal guardada su posición visual.
        const centeredAnchor = carrier.__gridAnchor === 'center';
        return {
            x: Number(carrier.x) + (centeredAnchor ? 0 : width * 0.5),
            y: Number(carrier.y) + (centeredAnchor ? 0 : height * 0.5) - tile * CARRY_HEIGHT
        };
    }

    function updateCarriedBombPositionV682(bomb) {
        const pos = getCarriedBombWorldPositionV682(bomb);
        if (!pos) return false;
        // CARRIED no tiene coordenadas de grid válidas. Su posición visual se
        // deriva SIEMPRE del portador para evitar que quede congelada en el
        // punto donde fue agarrada.
        bomb.worldX = pos.x;
        bomb.worldY = pos.y;
        bomb.x = -999;
        bomb.y = -999;
        bomb.motionState = global.BOMB_V4_STATES.CARRIED;
        bomb.motionProgress = 1;
        return true;
    }

    function grabBombV682(entity, bomb) {
        if (!entity || !bomb || bomb.state !== global.BOMB_V4_STATES.ARMED) return false;
        if (!entityCanUse(entity, 'grab')) return false;
        if (getCarriedBombForEntity(entity)) return false;
        if (bomb.carriedBy) return false;

        const tile = getEntityTile(entity);
        if (!tile) return false;
        if (bomb.playerPassThrough && entity === getPlayer()) return false;

        bomb.gridX = Number(bomb.x);
        bomb.gridY = Number(bomb.y);
        bomb.carriedTimer = Math.max(0, Number(bomb.timer) || 0);
        bomb.timer = 0;
        bomb.pendingDetonation = false;
        bomb.carriedBy = entity;
        bomb.state = global.BOMB_V4_STATES.CARRIED;
        bomb.motionState = global.BOMB_V4_STATES.CARRIED;
        bomb.interactionMotionV682 = null;
        bomb.motionDirection = null;
        bomb.x = -999;
        bomb.y = -999;
        bomb.playerPassThrough = false;
        bomb.justArmed = false;
        entity.carriedBombV682 = bomb;
        updateCarriedBombPositionV682(bomb);
        return true;
    }

    function releaseCarriedBombV682(entity, reason = 'drop') {
        const bomb = getCarriedBombForEntity(entity);
        if (!bomb) return false;
        const state = getState();
        const tile = getEntityTile(entity);
        if (!state || !tile) return false;
        const gx = tile.x, gy = tile.y;
        if (gx < 0 || gy < 0 || gx >= state.gridWidth || gy >= state.gridHeight) return false;
        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || global.TYPES || {};
        if (state.grid?.[gy]?.[gx] === types.WALL || state.grid?.[gy]?.[gx] === types.BLOCK) return false;
        const other = typeof global.getBombAtTile === 'function' ? global.getBombAtTile(gx, gy) : null;
        if (other && other !== bomb) return false;

        bomb.x = gx;
        bomb.y = gy;
        bomb.gridX = gx;
        bomb.gridY = gy;
        bomb.worldX = (gx + 0.5) * tileSize();
        bomb.worldY = (gy + 0.5) * tileSize();
        bomb.carriedBy = null;
        bomb.carriedTimer = Math.max(0, Number(bomb.carriedTimer) || 0);
        bomb.timer = bomb.carriedTimer;
        bomb.carriedTimer = 0;
        bomb.pendingDetonation = bomb.timer <= 0;
        bomb.state = global.BOMB_V4_STATES.ARMED;
        bomb.motionState = 'idle';
        bomb.interactionMotionV682 = null;
        bomb.motionDirection = null;
        bomb.motionSpeed = 0;
        bomb.playerPassThrough = true;
        bomb.justArmed = true;
        bomb.preserveTimerOnArm = true;
        if (entity.carriedBombV682 === bomb) entity.carriedBombV682 = null;
        if (reason === 'death') bomb.releasedFromDeathV682 = true;
        return true;
    }

    function prepareCarriedBombForExplosionV682(bomb) {
        if (!isBombCarried(bomb)) return true;
        return !!(bomb.carriedBy && releaseCarriedBombV682(bomb.carriedBy, 'detonation'));
    }

    function processEntity(entity) {
        if (!entity) return;
        const dir = getEntityInputDirection(entity);

        // KICK conserva el comportamiento clásico: caminar contra una bomba
        // adyacente la empuja. GRAB ya no se dispara automáticamente al caminar.
        if (!dir) return;
        const adjacent = getAdjacentArmedBomb(entity, dir);
        if (!adjacent) return;

        startBombKickV682(adjacent, entity, dir);
    }

    function getThrowPathV683(entity, maxDistance = 3) {
        const state = getState();
        const dir = getFacingDirection(entity);
        const tile = getEntityTile(entity);
        if (!state || !dir || !tile) return [];
        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || global.TYPES || {};
        const path = [];
        for (let i = 1; i <= Math.max(1, Number(maxDistance) || 3); i++) {
            const gx = tile.x + dir.x * i;
            const gy = tile.y + dir.y * i;
            if (gx < 0 || gy < 0 || gx >= state.gridWidth || gy >= state.gridHeight) break;
            const cell = state.grid?.[gy]?.[gx];
            if (cell === types.WALL || cell === types.BLOCK) break;
            const bomb = state.bombs?.find(b => b && !isBombCarried(b) && b.state !== global.BOMB_V4_STATES.EXPLODING && b.x === gx && b.y === gy);
            if (bomb) break;
            if (cellHasEntity(gx, gy, entity)) break;
            path.push({ x:gx, y:gy, durationMs:150, arc:Math.max(7, tileSize() * 0.16) });
        }
        return path;
    }

    function throwCarriedBombV683(entity) {
        const bomb = getCarriedBombForEntity(entity);
        if (!bomb || !entityCanUse(entity, 'throw')) return false;
        const path = getThrowPathV683(entity, 3);
        if (!path.length) return false;
        const first = path.shift();
        const timer = Math.max(0, Number(bomb.carriedTimer) || Number(bomb.timer) || 0);
        bomb.carriedBy = null;
        if (entity.carriedBombV682 === bomb) entity.carriedBombV682 = null;
        bomb.carriedTimer = 0;
        bomb.timer = timer;
        bomb.x = -999;
        bomb.y = -999;
        bomb.motionQueue = path;
        bomb.motionDirection = getFacingDirection(entity);
        bomb.motionArc = first.arc;
        bomb.interactionMotionV682 = 'throw';
        bomb.interactionActorV682 = entity;
        bomb.playerPassThrough = true;
        bomb.pendingDetonation = false;
        bomb.preserveTimerOnArm = true;
        const targetWorldX = (first.x + 0.5) * tileSize();
        const targetWorldY = (first.y + 0.5) * tileSize();
        if (typeof global.startBombV4Motion !== 'function' || !global.startBombV4Motion(bomb, targetWorldX, targetWorldY, first.durationMs, first.arc)) {
            bomb.motionQueue.length = 0;
            bomb.x = first.x;
            bomb.y = first.y;
            bomb.worldX = targetWorldX;
            bomb.worldY = targetWorldY;
            bomb.interactionMotionV682 = null;
            bomb.interactionActorV682 = null;
            bomb.motionDirection = null;
            bomb.playerPassThrough = false;
            bomb.state = global.BOMB_V4_STATES.ARMED;
            bomb.motionState = 'idle';
            bomb.preserveTimerOnArm = true;
            return !!global.armBombV4?.(bomb);
        }
        return true;
    }

    function tryGrabPlayerBombV610() {
        const player = getPlayer();
        if (!player || !entityCanUse(player, 'grab')) return false;

        const carried = getCarriedBombForEntity(player);
        if (carried) return releaseCarriedBombV682(player, 'drop');

        const bomb = getAdjacentGrabBombAnyDirection(player);
        if (!bomb) return false;
        return grabBombV682(player, bomb);
    }

    function processPlayerBombInteractionV682() {
        const player = getPlayer();
        if (!player) return false;
        const dir = getEntityInputDirection(player);
        if (!dir) return false;
        const adjacent = getAdjacentArmedBomb(player, dir);
        if (!adjacent) return false;
        return startBombKickV682(adjacent, player, dir);
    }

    function getAdjacentPlayerBombV682(entity) {
        const player = entity || getPlayer();
        if (!player) return null;
        const dir = getEntityInputDirection(player);
        if (!dir) return null;
        return getAdjacentArmedBomb(player, dir);
    }

    function handlePlayerBombActionV683() {
        const player = getPlayer();
        if (!player) return false;
        const carried = getCarriedBombForEntity(player);
        if (carried) {
            if (entityCanUse(player, 'throw')) {
                if (throwCarriedBombV683(player)) return true;
                if (typeof global.addFloatingText === 'function') global.addFloatingText('NO HAY RUTA', player.x, player.y, '#f97316');
                return true;
            }
            return releaseCarriedBombV682(player, 'drop');
        }
        if (entityCanUse(player, 'grab')) return tryGrabPlayerBombV610();
        return false;
    }

    function updateBombEntityInteractionsV682() {
        const state = getState();
        if (!state) return false;
        const entities = [];
        const player = getPlayer();
        if (player) entities.push(player);
        if (Array.isArray(state.enemies)) entities.push(...state.enemies);
        if (state.boss) entities.push(state.boss);
        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state.level)
            : state.deathEchoV61;
        if (echo) entities.push(echo);

        const seen = new Set();
        for (const entity of entities) {
            if (!entity || seen.has(entity) || entity.defeated) continue;
            seen.add(entity);
            processEntity(entity);
        }
        for (const bomb of state.bombs || []) {
            if (isBombCarried(bomb)) updateCarriedBombPositionV682(bomb);
        }
        return true;
    }

    function handleBombActionV682() {
        const player = getPlayer();
        if (!player) return false;
        const carried = getCarriedBombForEntity(player);
        if (!carried) return false;
        return releaseCarriedBombV682(player, 'drop');
    }

    global.getCarriedBombForEntityV682 = getCarriedBombForEntity;
    global.tryGrabPlayerBombV610 = tryGrabPlayerBombV610;
    global.getAdjacentGrabBombAnyDirectionV687 = getAdjacentGrabBombAnyDirection;
    global.getAdjacentPlayerBombV682 = getAdjacentPlayerBombV682;
    global.processPlayerBombInteractionV682 = processPlayerBombInteractionV682;
    global.startBombKickV682 = startBombKickV682;
    global.updateBombKickMotionV682 = updateBombKickMotionV682;
    global.grabBombV682 = grabBombV682;
    global.releaseCarriedBombV682 = releaseCarriedBombV682;
    global.prepareCarriedBombForExplosionV682 = prepareCarriedBombForExplosionV682;
    global.updateCarriedBombPositionV682 = updateCarriedBombPositionV682;
    global.getCarriedBombWorldPositionV682 = getCarriedBombWorldPositionV682;
    global.updateBombEntityInteractionsV682 = updateBombEntityInteractionsV682;
    global.handleBombActionV682 = handleBombActionV682;
    global.handlePlayerBombActionV683 = handlePlayerBombActionV683;
    global.throwCarriedBombV683 = throwCarriedBombV683;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getCarriedBomb = getCarriedBombForEntity;
    global.BOMBER_ENGINE.startBombKick = startBombKickV682;
    global.BOMBER_ENGINE.grabBomb = grabBombV682;
    global.BOMBER_ENGINE.dropCarriedBomb = releaseCarriedBombV682;
})(globalThis);

;
// === js/16-traps.js ===
// Bomberman Roguelike v3.12.3 — Trap & Hazard system
// Trampas de un solo uso, telegraphing justo, efectos claros y reacción a bombas.

const TRAP_TYPES = Object.freeze({
    SPIKE: 'spike',
    FIRE: 'fire',
    ICE: 'ice',
    SLOW: 'slow',
    DELAYED: 'delayed-explosion'
});

const TRAP_DEFS = Object.freeze({
    [TRAP_TYPES.SPIKE]: {
        icon: '✦', name: 'PINCHOS', color: '#f8fafc', telegraph: '#cbd5e1',
        effectText: '¡PINCHOS!', damage: 1
    },
    [TRAP_TYPES.FIRE]: {
        icon: '♨', name: 'FUEGO', color: '#fb7185', telegraph: '#f97316',
        effectText: '¡FUEGO!', damage: 1, activeMs: 850
    },
    [TRAP_TYPES.ICE]: {
        icon: '❄', name: 'HIELO', color: '#67e8f9', telegraph: '#38bdf8',
        effectText: '¡HIELO!', slowFactor: 0.55, slowMs: 1200
    },
    [TRAP_TYPES.SLOW]: {
        icon: '≈', name: 'RALENTIZACIÓN', color: '#c084fc', telegraph: '#a78bfa',
        effectText: '¡RALENTIZADO!', slowFactor: 0.45, slowMs: 1500
    },
    [TRAP_TYPES.DELAYED]: {
        icon: '!', name: 'EXPLOSIÓN', color: '#facc15', telegraph: '#fb923c',
        effectText: '¡TRAMPA ARMADA!', delayMs: 720, range: 1
    }
});

const TRAP_SYSTEM = {
    telegraphDistance: 2.8,
    telegraphPulseMs: 520,
    delayedFlashMs: 720,
    defaultSlowFactor: 0.5,
    maxVisibleActive: 16
};

function trapDefinition(type) {
    return TRAP_DEFS[type] || TRAP_DEFS[TRAP_TYPES.SPIKE];
}

function trapCenter(h) {
    return {
        x: (h.x + 0.5) * TILE_SIZE,
        y: (h.y + 0.5) * TILE_SIZE
    };
}

function trapDistanceToPlayer(h) {
    const c = trapCenter(h);
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    return Math.hypot(px - c.x, py - c.y) / TILE_SIZE;
}

function getHazardSpeedFactor() {
    const timer = player.hazardSlowTimer || 0;
    if (timer <= 0) return 1;
    return Math.max(0.35, Math.min(1, player.hazardSlowFactor || 0.5));
}

function applyHazardSlow(h, def) {
    player.hazardSlowTimer = Math.max(player.hazardSlowTimer || 0, def.slowMs || 1000);
    player.hazardSlowFactor = Math.min(player.hazardSlowFactor || 1, def.slowFactor || TRAP_SYSTEM.defaultSlowFactor);
    player.hazardSlowType = h.type;
}

function clearExpiredHazardSlow(dt) {
    if (!(player.hazardSlowTimer > 0)) return;
    player.hazardSlowTimer = Math.max(0, player.hazardSlowTimer - dt);
    if (player.hazardSlowTimer <= 0) {
        player.hazardSlowFactor = 1;
        player.hazardSlowType = '';
    }
}

function triggerHazard(h, reason = 'player') {
    if (!h || h.triggered || h.effectConsumed) return false;

    const def = trapDefinition(h.type);
    h.triggered = true;
    h.visible = true;
    h.flashTimer = 1200;
    h.telegraphTimer = 0;
    h.effectTimer = def.activeMs || 650;
    h.effectConsumed = true;

    const c = trapCenter(h);
    addParticles(c.x, c.y, 'particleDanger', h.type === TRAP_TYPES.DELAYED ? 14 : 18);
    addFloatingText(def.effectText, c.x, c.y - 8, def.color);
    sfx('trap');
    triggerScreenShake(h.type === TRAP_TYPES.DELAYED ? 3 : 4, 120);

    if (h.type === TRAP_TYPES.DELAYED) {
        h.delayTimer = def.delayMs || TRAP_SYSTEM.delayedFlashMs;
        h.detonated = false;
        addFloatingText(reason === 'bomb' ? 'BOMBA · TRAMPA ARMADA' : '¡HUYE!', c.x, c.y + 18, '#facc15');
        return true;
    }

    if (h.type === TRAP_TYPES.ICE || h.type === TRAP_TYPES.SLOW) {
        applyHazardSlow(h, def);
        return true;
    }

    if (def.damage && reason === 'player') {
        takeDamage('trap', c.x, c.y);
    }

    return true;
}

function getTrapBlastCells(h) {
    const def = trapDefinition(h.type);
    const range = def.range || 1;
    const cells = [{ x: h.x, y: h.y }];
    const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];

    for (const dir of dirs) {
        for (let r = 1; r <= range; r++) {
            const x = h.x + dir.dx * r;
            const y = h.y + dir.dy * r;
            if (x < 0 || x >= gameState.gridWidth || y < 0 || y >= gameState.gridHeight) break;
            const tile = gameState.grid[y]?.[x];
            if (tile === TYPES.WALL) break;
            cells.push({ x, y });
            if (tile === TYPES.BLOCK) break;
        }
    }
    return cells;
}

function spawnHazardExplosion(h) {
    if (!h || h.detonated) return false;
    h.detonated = true;

    const cells = getTrapBlastCells(h);
    const blastId = ++gameState.blastSerial;
    for (const cell of cells) {
        gameState.explosions.push({
            x: cell.x,
            y: cell.y,
            timer: 420,
            blastId,
            owner: 'trap'
        });
    }

    const c = trapCenter(h);
    addParticles(c.x, c.y, 'particleFire', 20);
    addFloatingText('¡TRAMPA EXPLOTA!', c.x, c.y - 18, '#fb923c');
    sfx('boom');
    triggerScreenShake(7, 240);
    return true;
}

function reactHazardsToBlast(cells, bomb) {
    if (!Array.isArray(cells) || !gameState.hazards?.length) return;
    const keys = new Set(cells.map(c => `${c.x},${c.y}`));

    for (const h of gameState.hazards) {
        if (h.triggered || h.effectConsumed) continue;
        if (!keys.has(`${h.x},${h.y}`)) continue;

        // La explosión de una bomba puede armar únicamente las trampas retardadas.
        // El resto conserva su activación por contacto para evitar efectos redundantes.
        if (h.type === TRAP_TYPES.DELAYED) {
            triggerHazard(h, 'bomb');
        }
    }
}

function updateHazards(dt) {
    clearExpiredHazardSlow(dt);

    if (!Array.isArray(gameState.hazards)) return;

    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;

    for (const h of gameState.hazards) {
        if (!h) continue;

        if (h.flashTimer > 0) h.flashTimer = Math.max(0, h.flashTimer - dt);
        if (h.effectTimer > 0) h.effectTimer = Math.max(0, h.effectTimer - dt);

        if (h.triggered) {
            if (h.type === TRAP_TYPES.DELAYED && !h.detonated) {
                h.delayTimer = Math.max(0, h.delayTimer - dt);
                if (h.delayTimer <= 0) spawnHazardExplosion(h);
            }
            continue;
        }

        // Telegraph: la trampa sigue siendo "oculta", pero el jugador recibe
        // una señal justa cuando entra en su radio de proximidad.
        const distance = trapDistanceToPlayer(h);
        if (distance <= TRAP_SYSTEM.telegraphDistance) {
            h.telegraphTimer = Math.min(TRAP_SYSTEM.telegraphPulseMs, h.telegraphTimer + dt);
        } else {
            h.telegraphTimer = Math.max(0, h.telegraphTimer - dt * 1.5);
        }

        // Activación por contacto. Se usa solapamiento de hurtbox para no activar
        // una trampa desde fuera del centro de su celda.
        const left = h.x * TILE_SIZE + TILE_SIZE * 0.18;
        const right = (h.x + 1) * TILE_SIZE - TILE_SIZE * 0.18;
        const top = h.y * TILE_SIZE + TILE_SIZE * 0.18;
        const bottom = (h.y + 1) * TILE_SIZE - TILE_SIZE * 0.18;
        const playerHurt = {
            left: player.x + player.width * 0.30,
            right: player.x + player.width - player.width * 0.30,
            top: player.y + player.height * 0.30,
            bottom: player.y + player.height - player.height * 0.20
        };

        if (playerHurt.right > left && playerHurt.left < right && playerHurt.bottom > top && playerHurt.top < bottom) {
            triggerHazard(h, 'player');
        }
    }
}

function drawTrapIcon(ctx, h, def, x, y, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = def.color;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x, y);
    ctx.restore();
}

function drawHazards() {
    if (!Array.isArray(gameState.hazards)) return;

    for (const h of gameState.hazards) {
        if (!h) continue;
        const def = trapDefinition(h.type);
        const x = h.x * TILE_SIZE;
        const y = h.y * TILE_SIZE;
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;

        if (!h.triggered) {
            const distance = trapDistanceToPlayer(h);
            if (distance <= TRAP_SYSTEM.telegraphDistance && h.telegraphTimer > 0) {
                const phase = (h.telegraphTimer / TRAP_SYSTEM.telegraphPulseMs) * Math.PI * 2 + h.phase;
                const pulse = 0.22 + (Math.sin(phase) + 1) * 0.10;
                ctx.save();
                ctx.strokeStyle = def.telegraph;
                ctx.globalAlpha = Math.min(0.5, pulse);
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(cx, cy, TILE_SIZE * 0.26 + Math.sin(phase) * 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                drawTrapIcon(ctx, h, def, cx, cy - 1, Math.min(0.5, pulse + 0.08));
                ctx.restore();
            }
            continue;
        }

        const active = h.flashTimer > 0 || h.effectTimer > 0 || (h.type === TRAP_TYPES.DELAYED && !h.detonated);
        const pulse = active ? 0.56 + Math.sin(gameState.animFrame * 0.32 + h.phase) * 0.20 : 0.22;

        ctx.save();
        ctx.fillStyle = `${hexToRgba(def.color, Math.max(0.08, pulse * 0.23))}`;
        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.strokeStyle = def.color;
        ctx.globalAlpha = active ? 0.95 : 0.55;
        ctx.lineWidth = active ? 3 : 2;
        ctx.strokeRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);

        if (h.type === TRAP_TYPES.SPIKE) {
            ctx.fillStyle = active ? '#f8fafc' : '#cbd5e1';
            for (let i = 0; i < 5; i++) {
                const ox = cx - 12 + i * 6;
                ctx.beginPath();
                ctx.moveTo(ox - 3, cy + 7);
                ctx.lineTo(ox, cy - 8);
                ctx.lineTo(ox + 3, cy + 7);
                ctx.closePath();
                ctx.fill();
            }
        } else if (h.type === TRAP_TYPES.FIRE) {
            ctx.fillStyle = active ? '#fb7185' : '#f97316';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 11);
            ctx.quadraticCurveTo(cx - 10, cy - 3, cx - 5, cy + 8);
            ctx.quadraticCurveTo(cx, cy + 3, cx + 3, cy + 10);
            ctx.quadraticCurveTo(cx + 11, cy, cx, cy - 11);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(cx, cy + 3, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (h.type === TRAP_TYPES.ICE) {
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const ang = Math.PI / 3 * a;
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * 12, cy + Math.sin(ang) * 12);
            }
            ctx.stroke();
        } else if (h.type === TRAP_TYPES.SLOW) {
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx - 5, cy, 6, Math.PI * 0.2, Math.PI * 1.45);
            ctx.arc(cx + 5, cy, 6, Math.PI * 1.2, Math.PI * 2.45);
            ctx.stroke();
        } else if (h.type === TRAP_TYPES.DELAYED) {
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, h.delayTimer / (TRAP_DEFS[TRAP_TYPES.DELAYED].delayMs || 720)));
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', cx, cy + 1);
        }

        if (!active && h.type !== TRAP_TYPES.DELAYED) {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = def.telegraph;
            ctx.strokeRect(x + 10, y + 10, TILE_SIZE - 20, TILE_SIZE - 20);
        }
        ctx.restore();
    }
}

function hexToRgba(hex, alpha) {
    const normalized = (hex || '#ffffff').replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(c => c + c).join('')
        : normalized;
    const n = parseInt(value, 16);
    if (!Number.isFinite(n)) return `rgba(255,255,255,${alpha})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

;
// === js/17-player.js ===
// Bomberman Roguelike v3.12 — Cardinal assisted player movement and collision helpers
        // V3.2.4 — MOVEMENT UPDATE
        // Movimiento continuo cardinal asistido. La cuadrícula SOLO define las paredes.
        // El personaje usa una hurtbox de movimiento más pequeña que el sprite,
        // con un pequeño "skin" de seguridad para evitar enganches en esquinas.
        // V3.4 — ASSISTED MOTION
        // V4.3.3 — FEEL UPDATE: turn carry + buffered cardinal steering
        // El jugador sigue moviéndose SOLO en los cuatro ejes cardinales.
        // La asistencia no crea diagonales: ayuda a centrar carriles, memoriza
        // brevemente un giro y suaviza aceleración/frenado/reversa.
        const MOVEMENT_COLLISION_INSET = 5;
        const MOVEMENT_WALL_PADDING = 1.5;
        const MOVEMENT_EPSILON = 0.001;
        const MOTION = {
            // v4.3.3 — sensación de control: entrada rápida sin perder continuidad.
            maxStep: 2.0,
            acceleration: 1.05,
            braking: 1.45,
            reverseBraking: 2.35,
            turnAssistRadius: 12,
            turnSnapRadius: 4.5,
            turnCorrectionStep: 3.25,
            turnCarrySpeed: 0.92,
            inputBufferMs: 145,
            stopEpsilon: 0.035,
            axisDeadzone: 0.18
        };

        function getMovementHitbox(x, y, width, height) {
            return gridGetEntityRect({width, height}, x, y, 'player');
        }

        function rectCollidesSolid(x, y, width, height) {
            const probe = { width, height, __gridAnchor: 'topleft' };
            return !gridCanOccupy(probe, x, y, { kind: 'player' });
        }

        function getLaneTarget(axis) {
            const center = axis === 'x' ? player.y + player.height / 2 : player.x + player.width / 2;
            const maxCell = axis === 'x' ? gameState.gridHeight - 1 : gameState.gridWidth - 1;
            // Usamos el centro más cercano, no el piso actual. Así el giro queda
            // asociado a la intersección más cercana y no a la celda de origen.
            const rawCell = Math.round((center / TILE_SIZE) - 0.5);
            const cell = Math.max(0, Math.min(maxCell, rawCell));
            const laneCenter = cell * TILE_SIZE + TILE_SIZE / 2;
            return axis === 'x' ? laneCenter - player.height / 2 : laneCenter - player.width / 2;
        }

        function getLaneOffset(axis) {
            const target = getLaneTarget(axis);
            const current = axis === 'x' ? player.y : player.x;
            return target - current;
        }

        function getCardinalInput() {
            let dx = gameState.touchControls.x;
            let dy = gameState.touchControls.y;

            // v6.9.6: un toque corto puede dejar una orden de UN tile en cola.
            // Esto evita que el jugador tenga que mantener el dedo apoyado durante
            // todo el desplazamiento entre dos centros de tile.
            if (!dx && !dy) {
                dx = Number(gameState.touchControls.queuedX || 0);
                dy = Number(gameState.touchControls.queuedY || 0);
            }

            if (Math.abs(dx) < MOTION.axisDeadzone && Math.abs(dy) < MOTION.axisDeadzone) {
                dx = 0; dy = 0;
                if (gameState.keys['ArrowUp'] || gameState.keys['KeyW']) dy = -1;
                if (gameState.keys['ArrowDown'] || gameState.keys['KeyS']) dy = 1;
                if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) dx = -1;
                if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) dx = 1;
            }

            if (!dx && !dy) return { axis: null, dir: 0 };

            // Dominante + último eje en empate: siempre exactamente un eje.
            if (Math.abs(dx) > Math.abs(dy)) return { axis: 'x', dir: dx < 0 ? -1 : 1 };
            if (Math.abs(dy) > Math.abs(dx)) return { axis: 'y', dir: dy < 0 ? -1 : 1 };
            return gameState.lastMoveAxis === 'horizontal'
                ? { axis: 'x', dir: dx < 0 ? -1 : 1 }
                : { axis: 'y', dir: dy < 0 ? -1 : 1 };
        }

        function updatePlayerMovement(dt) {
            const motionDt = getCombatMotionDt(dt);
            const input = getCardinalInput();
            const movementMods = typeof getMovementModifiersV47 === 'function'
                ? getMovementModifiersV47()
                : { speedMultiplier: 1 };
            const effectMods = typeof getBombEffectMovementModifiersV64 === 'function'
                ? getBombEffectMovementModifiersV64(player)
                : { speedMultiplier: 1 };
            const materialMods = typeof getMaterialMovementModifiersV67 === 'function'
                ? getMaterialMovementModifiersV67(player)
                : { speedMultiplier: 1 };
            const liquidMods = typeof getBiomeLiquidPlayerEffectV631 === 'function'
                ? getBiomeLiquidPlayerEffectV631(player)
                : null;
            const gameplayMods = typeof getGameplayPowerupMovementModifiersV676 === 'function'
                ? getGameplayPowerupMovementModifiersV676(player)
                : { speedMultiplier: 1 };
            const windBias = Number(player.__biomeWindPushV620 || 0);
            const effectiveSpeed = Math.max(0.1, player.speed
                * Number(movementMods.speedMultiplier || 1)
                * Number(effectMods.speedMultiplier || 1)
                * Number(materialMods.speedMultiplier || 1)
                * Number(liquidMods?.playerSpeed || 1)
                * Number(gameplayMods.speedMultiplier || 1)
                * (1 + (windBias * 0.045))
                * (typeof getHazardSpeedFactor === 'function' ? getHazardSpeedFactor() : 1)
                * (typeof getRastreroPlayerSpeedFactorV630 === 'function' ? getRastreroPlayerSpeedFactorV630(player) : 1));

            const playerTile = gridCurrentTile(player, 'player');
            const playerTilePos = gridGetEntityTileCenterPosition(player, playerTile.x, playerTile.y, 'player');
            if (!player._tileMoveActive && (!player._tileMoveInitialized
                || Math.abs(player.x - playerTilePos.x) > 0.01
                || Math.abs(player.y - playerTilePos.y) > 0.01)) {
                gridSnapEntityToTile(player, playerTile.x, playerTile.y, 'player');
                player._tileMoveInitialized = true;
            }

            // Una orden corresponde a UNA celda. El siguiente giro se evalúa
            // únicamente cuando se alcanza el centro de la celda destino.
            if (!player._tileMoveActive && input.axis) {
                const current = gridCurrentTile(player, 'player');
                const gx = current.x + (input.axis === 'x' ? input.dir : 0);
                const gy = current.y + (input.axis === 'y' ? input.dir : 0);
                const started = gridBeginTileMove(player, gx, gy, { kind: 'player' });
                if (started) {
                    // La orden en cola ya fue consumida al iniciar este tile.
                    if (gameState.touchControls) {
                        gameState.touchControls.queuedX = 0;
                        gameState.touchControls.queuedY = 0;
                    }
                    player.dir = input.axis === 'x' ? (input.dir < 0 ? 'left' : 'right') : (input.dir < 0 ? 'up' : 'down');
                    player.vx = input.axis === 'x' ? input.dir * effectiveSpeed : 0;
                    player.vy = input.axis === 'y' ? input.dir * effectiveSpeed : 0;
                } else {
                    player.vx = 0;
                    player.vy = 0;
                    if (typeof globalThis.rastreroPlayerIceMoveBlockedV630 === 'function') {
                        globalThis.rastreroPlayerIceMoveBlockedV630(player);
                    }
                }
            }

            const beforeMoveX = player.x;
            const beforeMoveY = player.y;
            const result = gridAdvanceTileMove(player, effectiveSpeed, motionDt);
            // 'active' no significa que la entidad haya avanzado: también puede
            // quedar activo un movimiento si el delta/speed del frame fue 0.
            // La animación debe depender exclusivamente de desplazamiento real.
            const moved = result.moved;

            if (result.arrived) {
                // La posición final es siempre exactamente el centro del tile.
                player.vx = 0;
                player.vy = 0;
                if (typeof globalThis.rastreroPlayerTileArrivedV630 === 'function') {
                    globalThis.rastreroPlayerTileArrivedV630(player);
                }
                if (typeof globalThis.gameplayPowerupAfterPlayerMovementV676 === 'function') {
                    globalThis.gameplayPowerupAfterPlayerMovementV676(player, beforeMoveX, beforeMoveY);
                }
            }

            player.__biomeWindPushV620 = 0;
            player.isMoving = moved;
            if (moved) player.walkCycle += motionDt * 0.015;

            if (typeof playerFSMSyncMovement === 'function') {
                playerFSMSyncMovement({
                    moving: moved,
                    inputActive: !!input.axis
                });
            }
        }

        function approach(value, target, amount) {
            if (value < target) return Math.min(value + amount, target);
            if (value > target) return Math.max(value - amount, target);
            return target;
        }


;
// === js/18-player-fsm.js ===
// Bomberman Roguelike v5.7 — Player FSM
// Máquina de estados finitos del jugador.
//
// REGLA ARQUITECTÓNICA:
// - La FSM decide el estado lógico/presentacional del jugador.
// - Gameplay (movimiento, bombas, daño) emite eventos.
// - Render/animación SOLO lee el estado.
// - No se cambia player.fsmState directamente desde otros módulos.

(function installPlayerFSM(global) {
    'use strict';

    const STATES = Object.freeze({
        QUIETO: 'QUIETO',
        CAMINANDO: 'CAMINANDO',
        PONIENDO_BOMBA: 'PONIENDO_BOMBA',
        MUERTO: 'MUERTO'
    });

    const EVENTS = Object.freeze({
        MOVE_START: 'MOVE_START',
        MOVE_STOP: 'MOVE_STOP',
        BOMB_START: 'BOMB_START',
        BOMB_FINISHED: 'BOMB_FINISHED',
        DEATH: 'DEATH',
        RESPAWN: 'RESPAWN',
        RESET: 'RESET'
    });

    // Tabla cerrada y auditable. Un evento no listado es una transición inválida.
    const TRANSITIONS = Object.freeze({
        [STATES.QUIETO]: Object.freeze({
            [EVENTS.MOVE_START]: STATES.CAMINANDO,
            [EVENTS.BOMB_START]: STATES.PONIENDO_BOMBA,
            [EVENTS.DEATH]: STATES.MUERTO,
            [EVENTS.RESET]: STATES.QUIETO
        }),
        [STATES.CAMINANDO]: Object.freeze({
            [EVENTS.MOVE_STOP]: STATES.QUIETO,
            [EVENTS.BOMB_START]: STATES.PONIENDO_BOMBA,
            [EVENTS.DEATH]: STATES.MUERTO,
            [EVENTS.RESET]: STATES.QUIETO
        }),
        [STATES.PONIENDO_BOMBA]: Object.freeze({
            [EVENTS.BOMB_FINISHED]: '__RESOLVE_MOVEMENT__',
            [EVENTS.DEATH]: STATES.MUERTO,
            [EVENTS.RESET]: STATES.QUIETO
        }),
        [STATES.MUERTO]: Object.freeze({
            [EVENTS.RESPAWN]: STATES.QUIETO,
            [EVENTS.RESET]: STATES.QUIETO
        })
    });

    const ANIMATIONS = Object.freeze({
        [STATES.QUIETO]: 'idle',
        [STATES.CAMINANDO]: 'walk',
        [STATES.PONIENDO_BOMBA]: 'plant-bomb',
        [STATES.MUERTO]: 'death'
    });

    const CONFIG = Object.freeze({
        bombAnimationMs: 150,
        maxHistory: 80
    });

    class PlayerFSM {
        constructor() {
            this.state = STATES.QUIETO;
            this.context = {
                moving: false,
                inputActive: false
            };
            this.bombAnimationRemaining = 0;
            this.history = [];
            this._record(null, 'INIT', STATES.QUIETO, 'OK');
        }

        getState() {
            return this.state;
        }

        getAnimation() {
            return ANIMATIONS[this.state] || ANIMATIONS[STATES.QUIETO];
        }

        can(event) {
            const table = TRANSITIONS[this.state];
            return !!table && Object.prototype.hasOwnProperty.call(table, event);
        }

        transition(event, payload = {}) {
            const from = this.state;

            if (!this.can(event)) {
                this._record(from, event, from, 'REJECTED');
                return false;
            }

            let to = TRANSITIONS[from][event];

            if (to === '__RESOLVE_MOVEMENT__') {
                to = this.context.moving
                    ? STATES.CAMINANDO
                    : STATES.QUIETO;
            }

            if (!STATES[to]) {
                this._record(from, event, from, 'INVALID_TARGET');
                return false;
            }

            this.state = to;
            this._record(from, event, to, 'OK', payload);
            return true;
        }

        syncMovement({ moving = false, inputActive = false } = {}) {
            this.context.moving = !!moving;
            this.context.inputActive = !!inputActive;

            // Bomb planting is transient and owns the animation state until
            // BOMB_FINISHED. Movement gameplay may continue underneath it.
            if (this.state === STATES.PONIENDO_BOMBA || this.state === STATES.MUERTO) {
                return false;
            }

            const target = this.context.moving
                ? STATES.CAMINANDO
                : STATES.QUIETO;

            if (target === this.state) return false;

            return this.transition(
                target === STATES.CAMINANDO
                    ? EVENTS.MOVE_START
                    : EVENTS.MOVE_STOP,
                { moving: this.context.moving, inputActive: this.context.inputActive }
            );
        }

        startBomb() {
            if (this.state === STATES.MUERTO) return false;
            if (this.state === STATES.PONIENDO_BOMBA) return false;

            const changed = this.transition(EVENTS.BOMB_START, { source: 'bomb-placed' });
            if (changed) this.bombAnimationRemaining = CONFIG.bombAnimationMs;
            return changed;
        }

        finishBomb(source = 'timer') {
            if (this.state !== STATES.PONIENDO_BOMBA) return false;
            this.bombAnimationRemaining = 0;
            return this.transition(EVENTS.BOMB_FINISHED, { source });
        }

        update(dt) {
            if (this.state !== STATES.PONIENDO_BOMBA) return;

            const safeDt = Math.max(0, Math.min(Number(dt) || 0, 100));
            this.bombAnimationRemaining = Math.max(0, this.bombAnimationRemaining - safeDt);

            if (this.bombAnimationRemaining <= 0) {
                this.finishBomb('timer');
            }
        }

        die(source = 'unknown') {
            this.bombAnimationRemaining = 0;
            return this.transition(EVENTS.DEATH, { source });
        }

        reset(source = 'reset') {
            this.context.moving = false;
            this.context.inputActive = false;
            this.bombAnimationRemaining = 0;
            return this.transition(EVENTS.RESET, { source });
        }

        getHistory() {
            return this.history.map(entry => ({ ...entry }));
        }

        clearHistory() {
            this.history.length = 0;
        }

        validate() {
            const errors = [];

            for (const state of Object.values(STATES)) {
                if (!TRANSITIONS[state]) {
                    errors.push(`Falta tabla de transición para ${state}`);
                }
                if (!ANIMATIONS[state]) {
                    errors.push(`Falta animación para ${state}`);
                }
            }

            for (const [state, table] of Object.entries(TRANSITIONS)) {
                for (const [event, target] of Object.entries(table)) {
                    if (!Object.values(EVENTS).includes(event)) {
                        errors.push(`Evento desconocido ${event} en ${state}`);
                    }
                    if (target !== '__RESOLVE_MOVEMENT__' && !STATES[target]) {
                        errors.push(`Destino inválido ${target} en ${state}.${event}`);
                    }
                }
            }

            const deadTransitions = TRANSITIONS[STATES.MUERTO];
            for (const forbidden of [EVENTS.MOVE_START, EVENTS.MOVE_STOP, EVENTS.BOMB_START, EVENTS.BOMB_FINISHED]) {
                if (Object.prototype.hasOwnProperty.call(deadTransitions, forbidden)) {
                    errors.push(`MUERTO expone transición prohibida ${forbidden}`);
                }
            }

            return {
                valid: errors.length === 0,
                errors
            };
        }

        _record(from, event, to, result, payload = {}) {
            this.history.push({
                time: Number(global.performance?.now?.() || Date.now()),
                from,
                event,
                to,
                result,
                payload
            });

            while (this.history.length > CONFIG.maxHistory) {
                this.history.shift();
            }
        }
    }

    const fsm = new PlayerFSM();

    global.PLAYER_FSM_STATES = STATES;
    global.PLAYER_FSM_EVENTS = EVENTS;
    global.PLAYER_FSM_ANIMATIONS = ANIMATIONS;
    global.PLAYER_FSM_CONFIG = CONFIG;
    global.PlayerFSM = PlayerFSM;
    global.playerFSM = fsm;

    // API pequeña y estable para el resto del juego.
    global.playerFSMGetState = () => fsm.getState();
    global.playerFSMGetAnimation = () => fsm.getAnimation();
    global.playerFSMCan = event => fsm.can(event);
    global.playerFSMSyncMovement = payload => fsm.syncMovement(payload);
    global.playerFSMStartBomb = () => fsm.startBomb();
    global.playerFSMFinishBombAnimation = source => fsm.finishBomb(source || 'animation');
    global.playerFSMUpdate = dt => fsm.update(dt);
    global.playerFSMDeath = source => fsm.die(source || 'unknown');
    global.playerFSMReset = source => fsm.reset(source || 'reset');
    global.playerFSMGetHistory = () => fsm.getHistory();
    global.playerFSMValidate = () => fsm.validate();
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.playerFSM = fsm;
    global.BOMBER_ENGINE.getPlayerFSMState = () => fsm.getState();
    global.BOMBER_ENGINE.getPlayerFSMAnimation = () => fsm.getAnimation();
    global.BOMBER_ENGINE.getPlayerFSMHistory = () => fsm.getHistory();
    global.BOMBER_ENGINE.validatePlayerFSM = () => fsm.validate();
})(window);

;
// === js/19-enemy-ai.js ===
// Bomberman Roguelike v6.10.2 — Enemy Behaviors Update
// Navegación local tipo corredor/intersección: la IA decide una dirección
// v3.21: decisiones locales + memoria corta + continuidad de ruta; BFS solo para recovery excepcional.
// y 15-collision.js se ocupa del movimiento y las paredes.

const enemyAI_V312 = {
    roomKey: '',
    dangerCooldown: 0,
    dangerSignature: '',
    dangerBombCount: -1,
    dangerExplosionCount: -1,
    dangerBlastSerial: -1,
    danger: new Set(),
    playerTileFrame: -1,
    playerTileX: -1,
    playerTileY: -1,
    visionInterval: 75,
    decisionInterval: 62,
    memoryMs: 900,
    turnRadius: 9,
    lookaheadTiles: 3,
    stuckMs: 180,
    physicalRecoveryMs: 220,
    wallPauseMs: 2000,
    blockedRetryMs: 180,
    cornerAssistSpeed: 1.15,
    recoveryPathNodes: 240,
    cursor: 0,
    decisionCursor: 0,
    // v3.19: estabilización de decisiones y recovery.
    turnHysteresis: 3.5,
    turnCommitMs: 150,
    recoveryCooldownMs: 280,
    recoveryTriggerMs: 220,
    // v3.24.1: una dirección que falla repetidamente queda temporalmente vetada
    // para evitar que el recovery seleccione de nuevo el mismo bloqueo físico.
    repeatedBlockTriggerFrames: 6,
    // v3.21: memoria corta de navegación y protección contra ciclos locales.
    navigationMemoryMs: 900,
    navigationMemoryTiles: 6,
    recentTilePenalty: 1.8,
    repeatedTilePenalty: 3.2,
    branchPreference: 0.45,
    navigationTurnCommitMs: 240,
    behaviorVersion: '3.24.1'
};

const ENEMY_DIRS_V312 = [
    { x: 0, y: -1, dir: 'up' },
    { x: 0, y: 1, dir: 'down' },
    { x: -1, y: 0, dir: 'left' },
    { x: 1, y: 0, dir: 'right' }
];

const ENEMY_DIR_INDEX_V312 = new Map(ENEMY_DIRS_V312.map((d, i) => [d.dir, i]));
const ENEMY_OPPOSITE_V312 = { up: 'down', down: 'up', left: 'right', right: 'left' };


// v6.28 — helpers de grid para entidades centradas (Death Echo).
// No cambian la navegación de los enemigos normales: se usan explícitamente
// desde Death Echo para que sus decisiones tácticas siempre partan de una celda.
function gridEntityTileV628(entity) {
    if (!entity || typeof TILE_SIZE !== 'number' || TILE_SIZE <= 0) return { x: 0, y: 0 };
    const width = Math.max(1, Number(gameState?.gridWidth) || 1);
    const height = Math.max(1, Number(gameState?.gridHeight) || 1);
    const clampTile = (value, max) => Math.max(0, Math.min(max - 1, Math.trunc(value)));

    // Mientras hay un desplazamiento tile-to-tile, la celda lógica es el
    // destino ya reservado, no el lado de la línea media que ocupa el sprite.
    if (entity._tileMoveActive && Number.isFinite(Number(entity._tileMoveTargetGX)) && Number.isFinite(Number(entity._tileMoveTargetGY))) {
        return {
            x: clampTile(Number(entity._tileMoveTargetGX), width),
            y: clampTile(Number(entity._tileMoveTargetGY), height)
        };
    }

    if (entity.__gridAnchor === 'center') {
        return {
            x: clampTile(Math.round((Number(entity.x) - TILE_SIZE / 2) / TILE_SIZE), width),
            y: clampTile(Math.round((Number(entity.y) - TILE_SIZE / 2) / TILE_SIZE), height)
        };
    }

    const x = Number(entity.x) + (Number(entity.width) || 0) / 2;
    const y = Number(entity.y) + (Number(entity.height) || 0) / 2;
    return {
        x: clampTile(Math.floor(x / TILE_SIZE), width),
        y: clampTile(Math.floor(y / TILE_SIZE), height)
    };
}

function gridEntityCenteredV628(entity, tolerancePx = 1.25) {
    if (!entity || entity._tileMoveActive || typeof TILE_SIZE !== 'number' || TILE_SIZE <= 0) return false;
    const tile = gridEntityTileV628(entity);
    const centerX = (tile.x + 0.5) * TILE_SIZE;
    const centerY = (tile.y + 0.5) * TILE_SIZE;
    const tolerance = Math.max(0.1, Number(tolerancePx) || 1.25);
    return Math.abs(Number(entity.x) - centerX) <= tolerance && Math.abs(Number(entity.y) - centerY) <= tolerance;
}

function gridSnapEntityCenteredV628(entity, gx, gy) {
    if (!entity || !Number.isInteger(Number(gx)) || !Number.isInteger(Number(gy))) return false;
    const x = Number(gx);
    const y = Number(gy);
    if (typeof gridIsInside === 'function' && !gridIsInside(x, y)) return false;
    entity.__gridAnchor = 'center';
    if (typeof gridSnapEntityToTile === 'function') {
        if (!gridSnapEntityToTile(entity, x, y, 'enemy')) return false;
    } else {
        entity.x = (x + 0.5) * TILE_SIZE;
        entity.y = (y + 0.5) * TILE_SIZE;
    }
    entity._tileMoveActive = false;
    entity._tileMoveTargetGX = x;
    entity._tileMoveTargetGY = y;
    entity._tileMoveTargetX = (x + 0.5) * TILE_SIZE;
    entity._tileMoveTargetY = (y + 0.5) * TILE_SIZE;
    return true;
}

window.gridEntityTileV628 = gridEntityTileV628;
window.gridEntityCenteredV628 = gridEntityCenteredV628;
window.gridSnapEntityCenteredV628 = gridSnapEntityCenteredV628;

let enemyBehaviorProfileMapV329 = null;
let enemyBehaviorProfileSourceV329 = null;

function getEnemyBehaviorProfileMapV329() {
    const source = window.ENEMY_BEHAVIORS_V324 || {};
    if (source === enemyBehaviorProfileSourceV329 && enemyBehaviorProfileMapV329) return enemyBehaviorProfileMapV329;
    enemyBehaviorProfileSourceV329 = source;
    enemyBehaviorProfileMapV329 = new Map();
    for (const profile of Object.values(source)) {
        if (profile?.id) enemyBehaviorProfileMapV329.set(profile.id, profile);
    }
    return enemyBehaviorProfileMapV329;
}

function enemyBehaviorProfileV324(e, index = 0) {
    const id = String(e?.aiBehavior || e?.ai?.archetype || '').toLowerCase();
    const fallbackId = ['chaser','patroller','evasive'][Math.abs(Number(index) || 0) % 3];
    const cacheKey = id || (e?.type === ENEMY_TYPES.VOLADOR || e?.type?.canFly ? 'flyer' : e?.type === ENEMY_TYPES.ESPECIAL ? 'aggressive' : fallbackId);
    if (e?.ai && e.ai.__behaviorProfileKey === cacheKey && e.ai.__behaviorProfile) return e.ai.__behaviorProfile;
    const profiles = getEnemyBehaviorProfileMapV329();
    let profile = profiles.get(cacheKey);
    if (!profile && (e?.type === ENEMY_TYPES.VOLADOR || e?.type?.canFly)) profile = profiles.get('flyer');
    if (!profile && e?.type === ENEMY_TYPES.ESPECIAL) profile = profiles.get('aggressive');
    profile = profile || profiles.get('chaser') || profiles.values().next().value || null;
    if (e?.ai) {
        e.ai.__behaviorProfileKey = cacheKey;
        e.ai.__behaviorProfile = profile;
    }
    return profile;
}


function enemyTileV312(e) {
    const x = Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(e.x / TILE_SIZE)));
    const y = Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(e.y / TILE_SIZE)));
    const cache = e.__v329TileCache;
    if (cache && cache.x === x && cache.y === y && cache.w === gameState.gridWidth && cache.h === gameState.gridHeight) return cache.tile;
    const tile = { x, y };
    e.__v329TileCache = { x, y, w: gameState.gridWidth, h: gameState.gridHeight, tile };
    return tile;
}

function enemyTileKeyV312(x, y) {
    // V3.17: keys numéricas evitan crear strings temporales en cada consulta de peligro.
    return y * gameState.gridWidth + x;
}

function enemyCenterV312(x, y) {
    return gridTileCenter(x, y);
}

function enemyDangerV312(x, y, e = null) {
    // La Criatura de Nube atraviesa bombas y sus zonas proyectadas; las llamas
    // que ya están activas siguen siendo peligrosas.
    if (e && typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e)) {
        return !!gameState.explosions?.some(exp => exp && exp.x === x && exp.y === y);
    }
    return enemyAI_V312.danger.has(enemyTileKeyV312(x, y));
}

function rebuildEnemyDangerV312() {
    const danger = new Set();
    for (const bomb of gameState.bombs) {
        if (!bomb) continue;
        danger.add(enemyTileKeyV312(bomb.x, bomb.y));
        if (typeof calculateBombBlastCells === 'function') {
            for (const cell of calculateBombBlastCells(bomb)) {
                danger.add(enemyTileKeyV312(cell.x, cell.y));
            }
        }
    }
    for (const exp of gameState.explosions) {
        if (exp) danger.add(enemyTileKeyV312(exp.x, exp.y));
    }
    enemyAI_V312.danger = danger;
}

function updateEnemyDangerV312(dt) {
    const bombCount = gameState.bombs.length;
    const explosionCount = gameState.explosions.length;
    const blastSerial = Number(gameState.blastSerial || 0);
    enemyAI_V312.dangerCooldown -= dt;
    const structureChanged = bombCount !== enemyAI_V312.dangerBombCount || explosionCount !== enemyAI_V312.dangerExplosionCount || blastSerial !== enemyAI_V312.dangerBlastSerial;
    if (structureChanged || enemyAI_V312.dangerCooldown <= 0) {
        enemyAI_V312.dangerCooldown = 95;
        enemyAI_V312.dangerBombCount = bombCount;
        enemyAI_V312.dangerExplosionCount = explosionCount;
        enemyAI_V312.dangerBlastSerial = blastSerial;
        rebuildEnemyDangerV312();
    }
}

function ensureEnemyMotionStateV312(e, index) {
    if (!e.__gridAnchor) e.__gridAnchor = 'center';
    if (!e.ai) {
        e.ai = {
            behavior: 'patrol',
            alert: 'patrol',
            archetype: String(e.aiBehavior || ''),
            direction: e.lastDirection || null,
            desiredDirection: e.desiredDirection || e.lastDirection || null,
            decisionTimer: 15 + (index * 19) % 45,
            visionTimer: (index * 23) % 60,
            seesPlayer: false,
            lastSeenX: -1,
            lastSeenY: -1,
            memoryTimer: 0,
            patrolX: -1,
            patrolY: -1,
            surroundX: -1,
            surroundY: -1,
            surroundTimer: 0,
            stuckTimer: 0,
            blockedTimer: 0,
            physicalBlockedTimer: 0,
            physicalBlocked: false,
            cornerCorrectionMs: 0,
            recoveryCount: 0,
            lastRecoveryReason: '',
            lastRecoveryPathNodes: 0,
            lastX: e.x,
            lastY: e.y,
            slot: index % 4,
            lastDecisionTileX: -1,
            lastDecisionTileY: -1,
            turnLockTimer: 0,
            lastTurnTileKey: -1,
            lastTurnDirection: null,
            recoveryCooldownTimer: 0,
            recoveryPathCalls: 0,
            wallPauseMs: 0,
            blockedRetryMs: 0,
            blockedDirection: null,
            wallPauseExpired: false,
            blockedDirection: null,
            blockedDirectionFrames: 0,
            // v3.21: memoria corta de tiles visitados para evitar ciclos locales.
            recentTileKeys: [],
            navigationMemoryTimer: 0,
            lastNavigationTileKey: -1,
            navigationTurnCount: 0,
            lastTurnFromDirection: null,
            lastTurnAtTileKey: -1
        };
    }

    const ai = e.ai;
    const profile = enemyBehaviorProfileV324(e, index);
    ai.archetype = profile?.id || ai.archetype || 'chaser';
    ai.archetypeLabel = profile?.label || ai.archetypeLabel || ai.archetype;

    // Compatibilidad de estados antiguos: se normaliza una sola vez por enemigo.
    if (!ai.__compatNormalizedV329) {
        ai.turnLockTimer = Number.isFinite(Number(ai.turnLockTimer)) ? Number(ai.turnLockTimer) : 0;
        ai.lastTurnTileKey = Number.isFinite(Number(ai.lastTurnTileKey)) ? Number(ai.lastTurnTileKey) : -1;
        ai.lastTurnDirection = ai.lastTurnDirection || null;
        ai.recoveryCooldownTimer = Number.isFinite(Number(ai.recoveryCooldownTimer)) ? Number(ai.recoveryCooldownTimer) : 0;
        ai.recoveryPathCalls = Number.isFinite(Number(ai.recoveryPathCalls)) ? Number(ai.recoveryPathCalls) : 0;
        ai.blockedDirection = ai.blockedDirection || null;
        ai.blockedDirectionFrames = Number.isFinite(Number(ai.blockedDirectionFrames)) ? Number(ai.blockedDirectionFrames) : 0;
        ai.recentTileKeys = Array.isArray(ai.recentTileKeys) ? ai.recentTileKeys.filter(Number.isFinite).slice(-enemyAI_V312.navigationMemoryTiles) : [];
        ai.navigationMemoryTimer = Number.isFinite(Number(ai.navigationMemoryTimer)) ? Number(ai.navigationMemoryTimer) : 0;
        ai.lastNavigationTileKey = Number.isFinite(Number(ai.lastNavigationTileKey)) ? Number(ai.lastNavigationTileKey) : -1;
        ai.navigationTurnCount = Number.isFinite(Number(ai.navigationTurnCount)) ? Number(ai.navigationTurnCount) : 0;
        ai.lastTurnFromDirection = ai.lastTurnFromDirection || null;
        ai.lastTurnAtTileKey = Number.isFinite(Number(ai.lastTurnAtTileKey)) ? Number(ai.lastTurnAtTileKey) : -1;
        ai.__compatNormalizedV329 = true;
    }
    if (!Array.isArray(ai.recentTileKeys)) ai.recentTileKeys = [];
    if (ai.recentTileKeys.length > enemyAI_V312.navigationMemoryTiles) ai.recentTileKeys.splice(0, ai.recentTileKeys.length - enemyAI_V312.navigationMemoryTiles);
    if (!ai.recentTileKeys.length) {
        const initialTile = enemyTileV312(e);
        const initialKey = enemyTileKeyV312(initialTile.x, initialTile.y);
        ai.recentTileKeys.push(initialKey);
        ai.lastNavigationTileKey = initialKey;
        ai.navigationMemoryTimer = enemyAI_V312.navigationMemoryMs;
    }

    // Un enemigo nunca arranca con una dirección que choque contra una pared.
    if (!e.ai.direction || !enemyDirectionPassableV312(e, enemyDirectionV312(e.ai.direction), false)) {
        const choices = enemyAvailableDirectionsV312(e, false);
        const safeChoices = choices.filter(d => d.dir !== ENEMY_OPPOSITE_V312[e.lastDirection || '']);
        const chosen = safeChoices[0] || choices[0] || ENEMY_DIRS_V312[index % ENEMY_DIRS_V312.length];
        e.ai.direction = chosen.dir;
        e.ai.desiredDirection = chosen.dir;
        e.lastDirection = chosen.dir;
    }
    if (!e.ai.desiredDirection) e.ai.desiredDirection = e.ai.direction;
    return e.ai;
}

function enemyVisionBlockedV312(gx, gy) {
    if (!gridIsInside(gx, gy)) return true;
    const tile = gameState.grid[gy]?.[gx];
    return tile === TYPES.WALL || tile === TYPES.BLOCK;
}

function enemyAxisLineClearV312(ex, ey, px, py) {
    const egx = Math.floor(ex / TILE_SIZE);
    const egy = Math.floor(ey / TILE_SIZE);
    const pgx = Math.floor(px / TILE_SIZE);
    const pgy = Math.floor(py / TILE_SIZE);

    if (egx === pgx) {
        const step = pgy >= egy ? 1 : -1;
        for (let gy = egy + step; gy !== pgy; gy += step) {
            if (enemyVisionBlockedV312(egx, gy)) return false;
        }
        return true;
    }
    if (egy === pgy) {
        const step = pgx >= egx ? 1 : -1;
        for (let gx = egx + step; gx !== pgx; gx += step) {
            if (enemyVisionBlockedV312(gx, egy)) return false;
        }
        return true;
    }
    return false;
}

function enemyCanSeePlayerV312(e) {
    const ex = e.x;
    const ey = e.y;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    const exTile = enemyTileV312(e);
    const pxTile = {
        x: Math.floor(px / TILE_SIZE),
        y: Math.floor(py / TILE_SIZE)
    };
    const tileDistance = Math.abs(pxTile.x - exTile.x) + Math.abs(pxTile.y - exTile.y);
    if (tileDistance > 9) return false;

    // En proximidad inmediata, el enemigo detecta al jugador aunque haya girado
    // apenas dentro de la misma zona del corredor.
    if (tileDistance <= 1) return true;

    return enemyAxisLineClearV312(ex, ey, px, py);
}

function enemyPlayerTileV312() {
    const frame = Number(gameState.animFrame || 0);
    if (enemyAI_V312.playerTileFrame === frame) return { x: enemyAI_V312.playerTileX, y: enemyAI_V312.playerTileY };
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    enemyAI_V312.playerTileFrame = frame;
    enemyAI_V312.playerTileX = Math.max(0, Math.min(gameState.gridWidth - 1, Math.floor(px / TILE_SIZE)));
    enemyAI_V312.playerTileY = Math.max(0, Math.min(gameState.gridHeight - 1, Math.floor(py / TILE_SIZE)));
    return { x: enemyAI_V312.playerTileX, y: enemyAI_V312.playerTileY };
}

function enemyDirectionV312(dir) {
    const index = ENEMY_DIR_INDEX_V312.get(String(dir || '').toLowerCase());
    return ENEMY_DIRS_V312[index == null ? 1 : index];
}

function enemyImmediateDirectionPassableV312(e, dir, avoidDanger = false, probe = 1.0) {
    if (!e || !dir) return false;
    const nx = e.x + dir.x * probe;
    const ny = e.y + dir.y * probe;
    return gridCanOccupy(e, nx, ny, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
        avoidDanger,
        allowCurrentBombTile: true
    });
}

function enemyPhysicalDirectionChoicesV312(e, avoidDanger = false) {
    return ENEMY_DIRS_V312.filter(dir => enemyImmediateDirectionPassableV312(e, dir, avoidDanger));
}

function updateEnemyIntentV312(e, index, dt) {
    const ai = ensureEnemyMotionStateV312(e, index);
    ai.decisionTimer -= dt;
    ai.visionTimer -= dt;
    ai.turnLockTimer = Math.max(0, Number(ai.turnLockTimer || 0) - dt);
    ai.recoveryCooldownTimer = Math.max(0, Number(ai.recoveryCooldownTimer || 0) - dt);

    const wasWallPaused = Number(ai.wallPauseMs || 0) > 0;
    ai.wallPauseMs = Math.max(0, Number(ai.wallPauseMs || 0) - Number(dt || 0));
    ai.blockedRetryMs = Math.max(0, Number(ai.blockedRetryMs || 0) - Number(dt || 0));
    if (ai.wallPauseMs > 0 || ai.wallPauseExpired) {
        // Al chocar contra una pared/bloque/bomba, el enemigo conserva su
        // dirección y queda inmóvil. La decisión de giro se hace recién después
        // de los 2 s; moveEnemyV312 ejecuta ese giro de forma tile-to-tile.
        return;
    }
    if (wasWallPaused && !ai.wallPauseExpired && ai.blockedDirection) {
        ai.wallPauseExpired = true;
    }
    ai.navigationMemoryTimer = Math.max(0, Number(ai.navigationMemoryTimer || 0) - dt);
    if (ai.navigationMemoryTimer <= 0 && Array.isArray(ai.recentTileKeys)) {
        const currentTile = enemyTileV312(e);
        ai.recentTileKeys = [enemyTileKeyV312(currentTile.x, currentTile.y)];
        ai.lastNavigationTileKey = ai.recentTileKeys[0];
        ai.navigationMemoryTimer = enemyAI_V312.navigationMemoryMs;
    }
    ai.memoryTimer = Math.max(0, ai.memoryTimer - dt);
    ai.surroundTimer = Math.max(0, ai.surroundTimer - dt);

    if (ai.visionTimer <= 0) {
        ai.visionTimer = enemyAI_V312.visionInterval + (index % 3) * 9;
        const sees = enemyCanSeePlayerV312(e);
        ai.seesPlayer = sees;
        if (sees) {
            const pt = enemyPlayerTileV312();
            ai.lastSeenX = pt.x;
            ai.lastSeenY = pt.y;
            ai.memoryTimer = enemyAI_V312.memoryMs;
            if (e.type === ENEMY_TYPES.ESPECIAL) ai.surroundTimer = 0;
        }
    }

    const tile = enemyTileV312(e);
    const dangerHere = enemyDangerV312(tile.x, tile.y, e);
    if (!Number.isFinite(ai.dangerCheckTimer)) ai.dangerCheckTimer = 0;
    ai.dangerCheckTimer -= dt;
    let imminentDanger = false;
    if (enemyAI_V312.danger.size > 0 && ai.dangerCheckTimer <= 0) {
        ai.dangerCheckTimer = 75 + (index % 3) * 12;
        imminentDanger = enemyAvailableDirectionsV312(e, false).some(dir => {
            const next = enemyProjectedTileV312(e, dir, 1);
            return enemyDangerV312(next.x, next.y, e);
        });
        ai.imminentDanger = imminentDanger;
    } else {
        imminentDanger = !!ai.imminentDanger;
    }

    const profile = enemyBehaviorProfileV324(e, index);
    const playerTile = enemyPlayerTileV312();
    const playerDistance = enemyDistanceToV312(tile.x, tile.y, playerTile.x, playerTile.y);
    const evasiveEngaged = profile.id === 'evasive' && (ai.seesPlayer || playerDistance <= Number(profile.fleeRadius || 5));
    const patrollerEngaged = profile.id === 'patroller' && playerDistance <= 4 && (ai.seesPlayer || ai.memoryTimer > 0);
    if (dangerHere || imminentDanger || evasiveEngaged) {
        ai.alert = 'flee';
        ai.behavior = profile.id;
    } else if ((ai.seesPlayer || ai.memoryTimer > 0) && profile.id !== 'patroller') {
        ai.alert = profile.id === 'aggressive' ? 'aggressive' : 'chase';
        ai.behavior = profile.id;
    } else if (patrollerEngaged) {
        ai.alert = 'chase';
        ai.behavior = profile.id;
    } else {
        ai.alert = 'patrol';
        ai.behavior = profile.id;
    }

    const currentDir = enemyDirectionV312(ai.direction);
    const physicalPassable = enemyDirectionPassableV312(e, currentDir, false);
    const currentPassable = enemyDirectionPassableV312(e, currentDir, ai.alert === 'flee');

    // Una pared/bloque/bomba no produce un giro instantáneo. El choque físico
    // abre una pausa de 2 s; solo el peligro real puede saltarse esta espera.
    if (!physicalPassable && !ai.wallPauseExpired && Number(ai.wallPauseMs || 0) <= 0) {
        ai.wallPauseMs = enemyAI_V312.wallPauseMs;
        ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
        ai.blockedDirection = currentDir.dir;
        ai.wallPauseExpired = false;
        e.vx = 0;
        e.vy = 0;
        return;
    }

    const atCenterRaw = enemyIsNearCenterV312(e);
    // Durante una recuperación física no tratamos la cercanía al centro como
    // una intersección normal: primero dejamos terminar la corrección lateral.
    const atCenter = atCenterRaw && !(ai.physicalBlocked && ai.physicalBlockedTimer < enemyAI_V312.physicalRecoveryMs);

    // La rejilla sirve para anticipar paredes. El bloqueo físico se confirma
    // solamente después de que gridMoveCardinal() falle con el hitbox real.
    // Así la IA puede corregir la alineación lateral antes de abandonar la ruta.
    if (!currentPassable) ai.blockedTimer += dt;
    else ai.blockedTimer = 0;

    const repeatedBlock = Number(ai.blockedDirectionFrames || 0) >= enemyAI_V312.repeatedBlockTriggerFrames;
    const shouldDecide = atCenter || !currentPassable || repeatedBlock || ai.physicalBlockedTimer >= enemyAI_V312.physicalRecoveryMs || ai.decisionTimer <= 0 || ai.alert === 'flee';
    if (!shouldDecide) return;

    if (ai.patrolX >= 0 && tile.x === ai.patrolX && tile.y === ai.patrolY && ai.alert === 'patrol') {
        ai.patrolX = -1;
        ai.patrolY = -1;
    }

    let chosen = enemyChooseDirectionAtIntersectionV312(e);
    if (!chosen) return;

    if (repeatedBlock && ai.blockedDirection === currentDir.dir && chosen.dir === currentDir.dir) {
        const recovery = enemyChooseLocalRecoveryDirectionV319(e);
        if (recovery) chosen = recovery;
    }

    ai.desiredDirection = chosen.dir;
    ai.decisionTimer = enemyAI_V312.decisionInterval + (index % 3) * 10;
    if (chosen.dir !== currentDir.dir && enemyImmediateDirectionPassableV312(e, chosen, ai.alert === 'flee', 0.75)) {
        const wasRecovery = Number(ai.physicalBlockedTimer || 0) > 0 || Number(ai.stuckTimer || 0) > 0;
        ai.direction = chosen.dir;
        e.lastDirection = chosen.dir;
        if (wasRecovery) {
            ai.recoveryCount += 1;
            ai.lastRecoveryReason = ai.lastRecoveryPathNodes > 0 ? 'replan-ruta' : 'replan-fisico';
            ai.blockedTimer = 0;
            ai.physicalBlockedTimer = 0;
            ai.physicalBlocked = false;
            ai.recoveryCooldownTimer = Math.max(Number(ai.recoveryCooldownTimer || 0), enemyAI_V312.recoveryCooldownMs);
        } else {
            ai.turnLockTimer = Number(profile.turnCommitMs || enemyAI_V312.navigationTurnCommitMs);
            ai.lastTurnTileKey = enemyTileKeyV312(tile.x, tile.y);
            ai.lastTurnDirection = chosen.dir;
            ai.lastTurnFromDirection = currentDir.dir;
            ai.lastTurnAtTileKey = enemyTileKeyV312(tile.x, tile.y);
            ai.navigationTurnCount = Number(ai.navigationTurnCount || 0) + 1;
        }
    }
    ai.lastDecisionTileX = tile.x;
    ai.lastDecisionTileY = tile.y;

    if (!currentPassable || ai.alert === 'flee') {
        ai.direction = chosen.dir;
        e.lastDirection = chosen.dir;
        ai.blockedTimer = 0;
    }


}

function getEnemyMovementSpeedV610(e) {
    const profile = enemyBehaviorProfileV324(e);
    const gameplaySpeedMultiplier = typeof getGameplayPowerupEnemySpeedMultiplierV676 === 'function'
        ? Math.max(0.1, Number(getGameplayPowerupEnemySpeedMultiplierV676(e)) || 1)
        : 1;
    const elementalEffectMultiplier = typeof getBombEffectEnemyMovementMultiplierV6306 === 'function'
        ? Math.max(0.28, Number(getBombEffectEnemyMovementMultiplierV6306(e)) || 1)
        : 1;
    return Math.max(0.1, Number(e.baseSpeed) || 1)
        * Number(profile.speedMultiplier || 1)
        * gameplaySpeedMultiplier
        * elementalEffectMultiplier;
}

function moveEnemyV312(e, dt) {
    const ai = e.ai;
    const speed = getEnemyMovementSpeedV610(e);
    const safeDt = Math.max(0, Number(dt) || 0);

    if (!e._tileMoveInitialized) {
        const tile = enemyTileV312(e);
        gridSnapEntityToTile(e, tile.x, tile.y, 'enemy');
        e._tileMoveInitialized = true;
    }

    if (e._tileMoveActive) {
        const result = gridAdvanceTileMove(e, speed, dt, { kind:'enemy', canFly:!!e.type.canFly, ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e), allowCurrentBombTile:false });
        if (result.arrived) {
            e.vx = 0;
            e.vy = 0;
            ai.stuckTimer = 0;
            ai.physicalBlockedTimer = 0;
            ai.physicalBlocked = false;
            ai.cornerCorrectionMs = 0;
            ai.blockedDirection = null;
            ai.blockedDirectionFrames = 0;
            e.lastX = e.x;
            e.lastY = e.y;
        }
        return;
    }

    // Si una pared/bloque/bomba desaparece mientras el enemigo está esperando,
    // reintenta primero la dirección que quería seguir. No queda congelado en
    // un bloqueo antiguo.
    if (Number(ai.wallPauseMs || 0) > 0) {
        ai.wallPauseMs = Math.max(0, Number(ai.wallPauseMs || 0) - safeDt);
        ai.blockedRetryMs = Math.max(0, Number(ai.blockedRetryMs || 0) - safeDt);
        if (ai.blockedDirection && ai.blockedRetryMs <= 0) {
            const blockedDir = enemyDirectionV312(ai.blockedDirection);
            if (enemyImmediateDirectionPassableV312(e, blockedDir, false, 1.0)) {
                ai.wallPauseMs = 0;
                ai.wallPauseExpired = false;
                ai.blockedRetryMs = 0;
                ai.direction = blockedDir.dir;
                ai.desiredDirection = blockedDir.dir;
            } else {
                ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
            }
        }
        e.vx = 0;
        e.vy = 0;
        return;
    }

    if (ai.wallPauseExpired && ai.blockedDirection) {
        const current = enemyDirectionV312(ai.direction);
        let next = enemyChooseLocalRecoveryDirectionV319(e);
        if (!next) {
            const options = enemyAvailableDirectionsV312(e, false);
            next = options.find(dir => dir.dir !== ai.blockedDirection && dir.dir !== current.dir)
                || options.find(dir => dir.dir === ENEMY_OPPOSITE_V312[ai.blockedDirection])
                || options[0]
                || null;
        }
        if (next) {
            ai.direction = next.dir;
            ai.desiredDirection = next.dir;
            e.lastDirection = next.dir;
            ai.blockedDirection = null;
            ai.wallPauseExpired = false;
            ai.blockedTimer = 0;
            ai.physicalBlocked = false;
            ai.physicalBlockedTimer = 0;
        } else {
            ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
            return;
        }
    }

    const dir = enemyDirectionV312(ai.direction);
    const tile = enemyTileV312(e);
    const gx = tile.x + dir.x;
    const gy = tile.y + dir.y;
    const started = gridBeginTileMove(e, gx, gy, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
        allowCurrentBombTile: false
    });
    if (!started) {
        // El giro no es instantáneo: 2 s de pausa visible antes de cambiar de
        // corredor. Si durante la espera aparece espacio, puede continuar recto.
        ai.wallPauseMs = enemyAI_V312.wallPauseMs;
        ai.blockedRetryMs = enemyAI_V312.blockedRetryMs;
        ai.blockedDirection = dir.dir;
        ai.wallPauseExpired = false;
        e.vx = 0;
        e.vy = 0;
        ai.blockedTimer = (ai.blockedTimer || 0) + safeDt;
        return;
    }

    e.vx = dir.x * speed;
    e.vy = dir.y * speed;
}

function updateEnemyAI(dt) {
    if (!gameState.isPlaying || gameState.paused) return;

    const roomKey = `${gameState.level}:${gameState.roomType.id}`;
    if (enemyAI_V312.roomKey !== roomKey) {
        enemyAI_V312.roomKey = roomKey;
        enemyAI_V312.dangerCooldown = 0;
        enemyAI_V312.dangerSignature = '';
        enemyAI_V312.dangerBombCount = -1;
        enemyAI_V312.dangerExplosionCount = -1;
        enemyAI_V312.dangerBlastSerial = -1;
        enemyAI_V312.danger.clear();
        enemyAI_V312.cursor = 0;
        enemyAI_V312.decisionCursor = 0;
        for (let i = 0; i < gameState.enemies.length; i++) {
            ensureEnemyMotionStateV312(gameState.enemies[i], i);
        }
    }

    updateEnemyDangerV312(dt);

    const count = gameState.enemies.length;
    if (!count) return;

    // Movimiento todos los frames para que no pierda fluidez.
    // La parte costosa (visión/decisión) ya está temporizada por enemigo.
    for (let i = 0; i < count; i++) {
        const e = gameState.enemies[i];
        if (!e) continue;
        updateEnemyIntentV312(e, i, dt);
        moveEnemyV312(e, dt);
    }
}

function drawEnemyAISignals() {
    if (!gameState.enemies.length) return;
    if (!perfRenderEveryV329(2)) return;
    for (const e of gameState.enemies) {
        if (!e.ai || e.ai.alert === 'patrol') continue;
        if (typeof isWorldRectVisibleV329 === 'function' && !isWorldRectVisibleV329(e.x - e.width, e.y - e.height, e.width * 2, e.height * 2, TILE_SIZE)) continue;
        let color = '#facc15';
        let label = '';
        if (e.ai.alert === 'flee') { color = '#f97316'; label = '!'; }
        else if (e.ai.alert === 'surround') { color = '#22c55e'; label = '×'; }
        else if (e.ai.alert === 'chase') { color = '#ef4444'; label = '>'; }
        ctx.save();
        ctx.globalAlpha = 0.66 + Math.sin(gameState.animFrame * 0.14 + e.x) * 0.14;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y - e.height * 0.56, 7, 0, Math.PI * 2);
        ctx.stroke();
        if (label) {
            ctx.fillStyle = color;
            ctx.font = '9px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(label, e.x, e.y - e.height * 0.82);
        }
        ctx.restore();
    }
}

;
// === js/19-enemy-ai-navigation.js ===
// BOMBERMAN ROGUELIKE v6.31.6 — Navegación y elección de rutas de la IA enemiga.
// Extracción mecánica desde js/19-enemy-ai.js; las implementaciones se conservan.

function enemyRecoveryDirectionByPathV312(e) {
    if (!e || !gameState.grid?.length) return null;
    e.ai = e.ai || {};
    e.ai.recoveryPathCalls = Number(e.ai.recoveryPathCalls || 0) + 1;
    const start = enemyTileV312(e);
    const target = enemyTargetForStateV312(e);
    if (!target) return null;
    const tx = Math.max(0, Math.min(gameState.gridWidth - 1, Number(target.x) || 0));
    const ty = Math.max(0, Math.min(gameState.gridHeight - 1, Number(target.y) || 0));
    if (start.x === tx && start.y === ty) return null;

    const queue = [{ x: start.x, y: start.y }];
    let cursor = 0;
    const parent = new Map();
    const visited = new Set([`${start.x},${start.y}`]);
    const keyOf = (x, y) => `${x},${y}`;
    const avoidDanger = e.ai?.alert === 'flee';
    let found = null;

    while (cursor < queue.length && visited.size <= enemyAI_V312.recoveryPathNodes) {
        const current = queue[cursor++];
        if (current.x === tx && current.y === ty) {
            found = current;
            break;
        }

        for (const dir of ENEMY_DIRS_V312) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            if (!gridIsInside(nx, ny)) continue;
            const key = keyOf(nx, ny);
            if (visited.has(key)) continue;
            const center = enemyCenterV312(nx, ny);
            if (!gridCanOccupy(e, center.x, center.y, {
                kind: 'enemy',
                canFly: !!e.type.canFly,
                ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
                avoidDanger,
                allowCurrentBombTile: true
            })) continue;
            visited.add(key);
            parent.set(key, current);
            queue.push({ x: nx, y: ny });
        }
    }

    if (!found) return null;

    let current = found;
    while (true) {
        const prev = parent.get(keyOf(current.x, current.y));
        if (!prev) return null;
        if (prev.x === start.x && prev.y === start.y) {
            return {
                dir: directionBetweenEnemyCellsV312(start, current),
                nodes: visited.size
            };
        }
        current = prev;
    }
}

function directionBetweenEnemyCellsV312(from, to) {
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'down';
    if (to.y < from.y) return 'up';
    return null;
}

function enemyDirectionPassableV312(e, dir, avoidDanger = false) {
    const tile = enemyTileV312(e);
    const next = { x: tile.x + dir.x, y: tile.y + dir.y };
    if (!gridIsInside(next.x, next.y)) return false;
    const center = enemyCenterV312(next.x, next.y);
    return gridCanOccupy(e, center.x, center.y, {
        kind: 'enemy',
        canFly: !!e.type.canFly,
        ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
        avoidDanger,
        allowCurrentBombTile: true
    });
}

function enemyAvailableDirectionsV312(e, avoidDanger = false) {
    return ENEMY_DIRS_V312.filter(dir => enemyDirectionPassableV312(e, dir, avoidDanger));
}

function enemyIsNearCenterV312(e) {
    return gridIsNearTileCenter(e, enemyAI_V312.turnRadius);
}

function enemyDistanceToV312(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function enemyProjectedTileV312(e, dir, steps = 1) {
    const start = enemyTileV312(e);
    return {
        x: start.x + dir.x * steps,
        y: start.y + dir.y * steps
    };
}

function enemyDirectionDangerDistanceV312(e, dir) {
    const start = enemyTileV312(e);
    let safeSteps = 0;
    for (let i = 1; i <= enemyAI_V312.lookaheadTiles; i++) {
        const tx = start.x + dir.x * i;
        const ty = start.y + dir.y * i;
        if (!gridIsInside(tx, ty)) break;
        if (enemyDangerV312(tx, ty, e)) break;
        if (!gridTileIsBlocked(tx, ty, { canFly: !!e.type.canFly })) safeSteps++;
        else break;
    }
    return safeSteps;
}

function enemyCountOpenNeighborsV312(e, x, y) {
    let count = 0;
    for (const dir of ENEMY_DIRS_V312) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        if (!gridIsInside(nx, ny)) continue;
        const center = enemyCenterV312(nx, ny);
        if (gridCanOccupy(e, center.x, center.y, {
            kind: 'enemy',
            canFly: !!e.type.canFly,
            ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e),
            avoidDanger: false,
            allowCurrentBombTile: true
        })) count++;
    }
    return count;
}

function enemyChoosePatrolTargetV312(e) {
    const start = enemyTileV312(e);
    const candidates = [];
    for (let i = 0; i < 20; i++) {
        const x = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridWidth - 2));
        const y = 1 + Math.floor(Math.random() * Math.max(1, gameState.gridHeight - 2));
        const center = enemyCenterV312(x, y);
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly,
            ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e), avoidDanger: true })) continue;
        const d = enemyDistanceToV312(x, y, start.x, start.y);
        const options = enemyCountOpenNeighborsV312(e, x, y);
        if (d >= 3 && options >= 2) candidates.push({ x, y, d, options });
    }

    candidates.sort((a, b) => {
        const sa = a.d + a.options * 0.9;
        const sb = b.d + b.options * 0.9;
        return sb - sa;
    });
    return candidates[0] || { x: start.x, y: start.y };
}

function enemyChooseSurroundTargetV312(e) {
    const pt = enemyPlayerTileV312();
    const candidates = [
        { x: pt.x + 1, y: pt.y, slot: 0 },
        { x: pt.x - 1, y: pt.y, slot: 1 },
        { x: pt.x, y: pt.y + 1, slot: 2 },
        { x: pt.x, y: pt.y - 1, slot: 3 }
    ];

    let best = null;
    const et = enemyTileV312(e);
    for (const c of candidates) {
        const center = enemyCenterV312(c.x, c.y);
        if (!gridCanOccupy(e, center.x, center.y, { kind: 'enemy', canFly: !!e.type.canFly,
            ignoreBombs: typeof enemyIgnoresBombsV630 === 'function' && enemyIgnoresBombsV630(e), avoidDanger: true })) continue;
        const distance = enemyDistanceToV312(c.x, c.y, et.x, et.y);
        const slotPenalty = c.slot === e.ai.slot ? 0 : 0.45;
        const playerEdgePenalty = c.x === et.x && c.y === et.y ? 100 : 0;
        const score = distance + slotPenalty + playerEdgePenalty;
        if (!best || score < best.score) best = { x: c.x, y: c.y, score };
    }
    return best || { x: pt.x, y: pt.y, score: 0 };
}


function enemyRecentNavigationPenaltyV321(e, key, options = {}) {
    const recent = e?.ai?.recentTileKeys;
    if (!Array.isArray(recent) || !recent.length) return 0;
    const index = recent.lastIndexOf(key);
    if (index < 0) return 0;
    const age = recent.length - 1 - index;
    const recencyWeight = Math.max(1, enemyAI_V312.navigationMemoryTiles - age);
    let penalty = recencyWeight * enemyAI_V312.recentTilePenalty;
    if (age <= 1) penalty += enemyAI_V312.repeatedTilePenalty;
    if (options.recovery) penalty *= 0.15;
    if (options.flee) penalty *= 0.35;
    return penalty;
}

function enemyNavigationLoopRiskV321(e, dir) {
    const next = enemyProjectedTileV312(e, dir, 1);
    const key = enemyTileKeyV312(next.x, next.y);
    const recent = e?.ai?.recentTileKeys || [];
    if (recent.length < 2) return 0;
    if (recent[recent.length - 2] === key) return 1;
    if (recent.length >= 3 && recent[recent.length - 3] === key) return 0.7;
    return 0;
}

function enemyLocalBranchScoreV321(e, dir) {
    const next = enemyProjectedTileV312(e, dir, 1);
    if (!gridIsInside(next.x, next.y)) return -2;
    // Solo necesitamos conectividad estática aquí. Evitar gridCanOccupy() y su
    // geometría de hitbox reduce el coste de puntuar hasta cuatro candidatos.
    let exits = 0;
    for (const probe of ENEMY_DIRS_V312) {
        const x = next.x + probe.x;
        const y = next.y + probe.y;
        if (!gridIsInside(x, y)) continue;
        if (!gridTileIsBlocked(x, y, { canFly: !!e.type.canFly })) exits += 1;
    }
    return exits;
}

function enemyDirectionScoreV312(e, dir, target, options = {}) {
    const next = enemyProjectedTileV312(e, dir, 1);
    const next2 = enemyProjectedTileV312(e, dir, 2);
    const currentDir = e.ai.direction;
    const reverse = ENEMY_OPPOSITE_V312[currentDir] === dir.dir;
    const same = currentDir === dir.dir;
    const danger = enemyDangerV312(next.x, next.y, e) ? 1 : 0;
    const danger2 = enemyDangerV312(next2.x, next2.y, e) ? 1 : 0;
    const distance = enemyDistanceToV312(next.x, next.y, target.x, target.y);
    const distance2 = enemyDistanceToV312(next2.x, next2.y, target.x, target.y);
    const openAhead = enemyDirectionDangerDistanceV312(e, dir);
    const branchScore = options.patrol ? enemyLocalBranchScoreV321(e, dir) : 0;
    const recentPenalty = enemyRecentNavigationPenaltyV321(e, enemyTileKeyV312(next.x, next.y), {
        recovery: !!options.recovery,
        flee: !!options.flee
    });
    const loopRisk = enemyNavigationLoopRiskV321(e, dir);

    const profile = enemyBehaviorProfileV324(e);
    const sameBonus = Number(profile.sameDirectionBonus ?? 2.8);
    const distanceWeight = Number(profile.distanceWeight ?? 2.0);
    const lookaheadWeight = Number(profile.distanceLookaheadWeight ?? 0.55);
    const reversePenalty = Number(profile.reversePenalty ?? 24);
    const branchWeight = Number(profile.branchPreference ?? enemyAI_V312.branchPreference);
    const recentWeight = Number(profile.recentPenalty ?? 1.8);
    const loopWeight = Number(profile.loopPenalty ?? 1.2);

    let score = distance * distanceWeight + distance2 * lookaheadWeight;
    score += danger * 2500 + danger2 * 750;
    score -= same ? sameBonus : 0;
    if (same && !reverse) score -= sameBonus * 0.45;
    score += reverse ? (options.allowReverse ? Math.min(8, reversePenalty * 0.18) : reversePenalty) : 0;
    score -= openAhead * 0.7;
    score -= branchScore * branchWeight * (options.patrol ? 1.0 : 0.35);
    score += recentPenalty * (recentWeight / Math.max(1, enemyAI_V312.recentTilePenalty));
    score += loopRisk * loopWeight;

    if (options.patrol) {
        // v3.19: ruido determinista. Evita que la misma intersección produzca
        // giros distintos en cada decisión solo por un random nuevo.
        const slot = Number(e.ai?.slot || 0);
        const seed = Math.abs(slot * 17 + next.x * 31 + next.y * 47) % 17;
        score += seed * 0.12;
    }
    if (options.urgent) score += reverse ? 4 : 0;
    return score;
}

function enemyChooseFleeDirectionV312(e) {
    const possible = enemyAvailableDirectionsV312(e, true);
    if (!possible.length) return null;

    const tile = enemyTileV312(e);
    let best = null;
    for (const dir of possible) {
        const next = enemyProjectedTileV312(e, dir, 1);
        const next2 = enemyProjectedTileV312(e, dir, 2);
        const dangerNow = enemyDangerV312(next.x, next.y, e) ? 1 : 0;
        const dangerSoon = enemyDangerV312(next2.x, next2.y, e) ? 1 : 0;
        const safety = enemyDirectionDangerDistanceV312(e, dir);
        const playerTile = enemyPlayerTileV312();
        const awayFromPlayer = enemyDistanceToV312(next.x, next.y, playerTile.x, playerTile.y);
        const reverse = ENEMY_OPPOSITE_V312[e.ai.direction] === dir.dir;
        const same = e.ai.direction === dir.dir;
        const profile = enemyBehaviorProfileV324(e);
        const awayWeight = profile.id === 'evasive' ? 3.2 : profile.id === 'flyer' ? 1.6 : 1.8;
        const score = dangerNow * 4000 + dangerSoon * 1200 - safety * (profile.id === 'evasive' ? 34 : 30) - awayFromPlayer * awayWeight + (reverse ? 2 : 0) - (same ? 2 : 0);
        if (!best || score < best.score) best = { dir, score, tile };
    }
    return best ? best.dir : null;
}

function enemyTargetForStateV312(e) {
    const ai = e.ai;
    const playerTile = enemyPlayerTileV312();
    const profile = enemyBehaviorProfileV324(e);

    if (ai.alert === 'flee') {
        return {
            x: playerTile.x + (playerTile.x >= enemyTileV312(e).x ? -4 : 4),
            y: playerTile.y + (playerTile.y >= enemyTileV312(e).y ? -4 : 4)
        };
    }

    if (profile.id === 'patroller' && ai.alert === 'patrol') {
        if (ai.patrolX < 0 || ai.patrolY < 0) {
            const patrol = enemyChoosePatrolTargetV312(e);
            ai.patrolX = patrol.x;
            ai.patrolY = patrol.y;
        }
        return { x: ai.patrolX, y: ai.patrolY };
    }

    if (ai.seesPlayer) {
        if (profile.id === 'evasive') {
            return { x: playerTile.x + (playerTile.x >= enemyTileV312(e).x ? -4 : 4), y: playerTile.y + (playerTile.y >= enemyTileV312(e).y ? -4 : 4) };
        }
        if (profile.id === 'aggressive' || profile.id === 'flyer') return playerTile;
        if (e.type === ENEMY_TYPES.ESPECIAL) {
            if (ai.surroundTimer <= 0 || ai.surroundX < 0 || ai.surroundY < 0) {
                const surround = enemyChooseSurroundTargetV312(e);
                ai.surroundX = surround.x;
                ai.surroundY = surround.y;
                ai.surroundTimer = 320;
            }
            return { x: ai.surroundX, y: ai.surroundY };
        }

        // En corredores rectos, perseguir la celda del jugador es más importante
        // que cualquier preferencia de patrulla.
        return playerTile;
    }

    if (ai.memoryTimer > 0 && ai.lastSeenX >= 0) {
        return { x: ai.lastSeenX, y: ai.lastSeenY };
    }

    if (ai.patrolX < 0 || ai.patrolY < 0) {
        const patrol = enemyChoosePatrolTargetV312(e);
        ai.patrolX = patrol.x;
        ai.patrolY = patrol.y;
    }
    return { x: ai.patrolX, y: ai.patrolY };
}

function enemyIsIntersectionNodeV319(e, possible, currentDir) {
    if (!e || !possible?.length) return false;
    if (possible.length >= 3) return true;
    // Esquina: continuar recto deja de ser posible; el giro sí es una decisión real.
    if (!currentDir) return true;
    const hasCurrent = possible.some(dir => dir.dir === currentDir.dir);
    if (!hasCurrent) return true;
    return possible.some(dir => dir.dir !== currentDir.dir && dir.dir !== ENEMY_OPPOSITE_V312[currentDir.dir]);
}

function enemyChooseLocalRecoveryDirectionV319(e) {
    const ai = e.ai;
    ai.lastRecoveryPathNodes = 0;
    const avoidDanger = ai.alert === 'flee';
    const physical = enemyPhysicalDirectionChoicesV312(e, avoidDanger);
    if (!physical.length) return null;

    const current = enemyDirectionV312(ai.direction);
    const blockedDirection = ai.blockedDirection || current.dir;
    const target = enemyTargetForStateV312(e) || enemyPlayerTileV312();

    // v3.24.1: no permitir que el recovery vuelva a elegir la dirección que
    // acaba de quedar físicamente bloqueada. Además exigimos una pequeña holgura
    // física, no solo un probe de 1 px, para evitar falsos positivos en esquinas.
    const executable = physical.filter(dir =>
        dir.dir !== blockedDirection &&
        enemyImmediateDirectionPassableV312(e, dir, avoidDanger, 2.0)
    );
    if (!executable.length) return null;

    const alternatives = executable.filter(dir => dir.dir !== current.dir && dir.dir !== ENEMY_OPPOSITE_V312[current.dir]);
    const options = alternatives.length
        ? alternatives
        : executable.filter(dir => dir.dir !== current.dir);
    if (!options.length) return null;

    let best = null;
    for (const dir of options) {
        const score = enemyDirectionScoreV312(e, dir, target, { allowReverse: true, urgent: true, recovery: true, flee: avoidDanger });
        if (!best || score < best.score) best = { dir, score };
    }
    return best?.dir || null;
}

function enemyChooseDirectionAtIntersectionV312(e) {
    const ai = e.ai;
    const profile = enemyBehaviorProfileV324(e);
    const tile = enemyTileV312(e);
    const dangerHere = enemyDangerV312(tile.x, tile.y, e);
    const physicalChoices = enemyPhysicalDirectionChoicesV312(e, ai.alert === 'flee');
    const possible = physicalChoices.length && ai.physicalBlocked
        ? physicalChoices
        : enemyAvailableDirectionsV312(e, false);
    if (!possible.length) return null;

    const currentDir = enemyDirectionV312(ai.direction);
    const currentPassable = possible.some(dir => dir.dir === currentDir.dir);
    const exceptionalRecovery =
        Number(ai.physicalBlockedTimer || 0) >= enemyAI_V312.recoveryTriggerMs ||
        Number(ai.stuckTimer || 0) >= enemyAI_V312.stuckMs ||
        Number(ai.blockedDirectionFrames || 0) >= enemyAI_V312.repeatedBlockTriggerFrames;

    const repeatedSameBlock =
        !!ai.blockedDirection &&
        ai.blockedDirection === currentDir.dir &&
        Number(ai.blockedDirectionFrames || 0) >= enemyAI_V312.repeatedBlockTriggerFrames;

    // v3.24.1: si el mismo vector ya falló suficientes veces, forzar una salida
    // local distinta antes de permitir que el scoring normal lo vuelva a escoger.
    if (repeatedSameBlock) {
        const forcedRecovery = enemyChooseLocalRecoveryDirectionV319(e);
        if (forcedRecovery) return forcedRecovery;
    }

    // v3.19: recovery local primero. BFS queda reservado para un bloqueo físico
    // persistente donde las alternativas inmediatas no permiten salir.
    if (exceptionalRecovery) {
        const localRecovery = enemyChooseLocalRecoveryDirectionV319(e);
        if (localRecovery) return localRecovery;

        if (ai.recoveryCooldownTimer <= 0) {
            const recovery = enemyRecoveryDirectionByPathV312(e);
            if (recovery?.dir && recovery.dir !== ai.blockedDirection && recovery.dir !== currentDir.dir) {
                ai.lastRecoveryPathNodes = recovery.nodes;
                ai.recoveryCooldownTimer = enemyAI_V312.recoveryCooldownMs;
                const recoveryDir = enemyDirectionV312(recovery.dir);
                if (enemyImmediateDirectionPassableV312(e, recoveryDir, ai.alert === 'flee', 2.0)) {
                    return recoveryDir;
                }
            }
        }
    }

    if (dangerHere || ai.alert === 'flee') {
        return enemyChooseFleeDirectionV312(e) || possible[0];
    }

    const filtered = possible.length > 1
        ? possible.filter(dir => dir.dir !== ENEMY_OPPOSITE_V312[ai.direction])
        : possible;
    let options = filtered.length ? filtered : possible;

    // v3.21: durante el mismo nodo no encadenar un segundo giro salvo peligro
    // o bloqueo. Evita secuencias como RIGHT→UP→LEFT dentro de la misma zona.
    const currentTileKey = enemyTileKeyV312(tile.x, tile.y);
    const sameTurnNode = ai.lastTurnAtTileKey === currentTileKey;
    if (sameTurnNode && currentPassable && !dangerHere && ai.alert !== 'flee' && options.length > 1) {
        const committed = options.filter(dir => dir.dir === ai.direction);
        if (committed.length) options = committed;
    }

    // Prioridad estable de persecución: si el jugador está en el mismo
    // corredor y el giro requerido está disponible, no dejamos que el
    // scoring general lo reemplace por una dirección lateral equivalente.
    if (ai.seesPlayer && ['chaser','aggressive','flyer'].includes(profile.id)) {
        const pt = enemyPlayerTileV312();
        const et = enemyTileV312(e);
        if (pt.x === et.x) {
            const wanted = pt.y < et.y ? 'up' : pt.y > et.y ? 'down' : null;
            const direct = options.find(dir => dir.dir === wanted);
            if (direct && !(Number(ai.turnLockTimer || 0) > 0 && currentPassable && direct.dir !== currentDir.dir)) return direct;
        }
        if (pt.y === et.y) {
            const wanted = pt.x < et.x ? 'left' : pt.x > et.x ? 'right' : null;
            const direct = options.find(dir => dir.dir === wanted);
            if (direct && !(Number(ai.turnLockTimer || 0) > 0 && currentPassable && direct.dir !== currentDir.dir)) return direct;
        }
    }

    const atNode = enemyIsIntersectionNodeV319(e, options, currentDir);
    const target = enemyTargetForStateV312(e);
    let best = options[0];
    let bestScore = Infinity;
    for (const dir of options) {
        const score = enemyDirectionScoreV312(e, dir, target, {
            patrol: profile.id === 'patroller' && ai.alert === 'patrol',
            urgent: ai.alert === 'chase' || ai.alert === 'aggressive' || ai.alert === 'surround',
            recovery: exceptionalRecovery,
            flee: ai.alert === 'flee'
        });
        if (score < bestScore) {
            bestScore = score;
            best = dir;
        }
    }

    // v3.19: mantener dirección si sigue siendo válida. Un giro solo se acepta
    // cuando mejora de forma suficiente la puntuación o existe peligro real.
    if (currentPassable && best.dir !== currentDir.dir && atNode) {
        const currentScore = enemyDirectionScoreV312(e, currentDir, target, {
            patrol: profile.id === 'patroller' && ai.alert === 'patrol',
            urgent: ai.alert === 'chase' || ai.alert === 'aggressive' || ai.alert === 'surround',
            recovery: false,
            flee: ai.alert === 'flee'
        });
        const turnLocked = Number(ai.turnLockTimer || 0) > 0;
        const materiallyBetter = bestScore + enemyAI_V312.turnHysteresis < currentScore;
        if (turnLocked || !materiallyBetter) return currentDir;
    }

    // Fuera de una intersección/esquina real, no fabricamos giros.
    if (currentPassable && best.dir !== currentDir.dir && !atNode) return currentDir;

    return best;
}

;
// === js/20-combat.js ===
// Bomberman Roguelike v6.32.2 — Bombs, explosions, damage and gameplay simulation
        function explodeBomb(bombIndex) {
            const first = gameState.bombs[bombIndex];
            if (!first) return;
            if (first.state === 'carried' && typeof globalThis.prepareCarriedBombForExplosionV682 === 'function') {
                globalThis.prepareCarriedBombForExplosionV682(first);
            }

            // La cola evita recursión y mantiene una secuencia determinista
            // para las detonaciones en cadena.
            gameState.bombs.splice(bombIndex, 1);
            if (first.countsTowardPlayerCapacity !== false) player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);

            const queue = [{ bomb: first, parent: null }];
            let detonatedCount = 0;

            while (queue.length) {
                const entry = queue.shift();
                const bomb = entry?.bomb;
                if (!bomb) continue;

                detonatedCount++;
                // v6.30.9: el feedback de detonación se centraliza en el listener
                // BOMBA_EXPLOTO; aquí solo se resuelven alcance e hitboxes lógicas.
                if (gameState.relics.some(r => r.id === 'ember_core')) gameState.score += 25;

                const blastId = ++gameState.blastSerial;
                if (typeof gameplayPowerupOnBombExplodedV676 === 'function') gameplayPowerupOnBombExplodedV676(bomb);
                const cells = calculateBombBlastCells(bomb);
                const blastKeys = new Set(cells.map(c => `${c.x},${c.y}`));
                // V3.12.3: algunas trampas reaccionan al paso de una explosión.
                if (typeof reactHazardsToBlast === 'function') reactHazardsToBlast(cells, bomb);

                // v5.9: publicación desacoplada. Los listeners de sonido y
                // destrucción de bloques reaccionan al mismo evento sin que
                // explodeBomb conozca sus implementaciones.
                if (typeof gameEventBus !== 'undefined' && typeof GAME_EVENTS_V59 !== 'undefined') {
                    gameEventBus.emit(GAME_EVENTS_V59.BOMBA_EXPLOTO, Object.freeze({
                        bomb,
                        cells: Object.freeze(cells.map(cell => Object.freeze({ ...cell }))),
                        blastId,
                        chainIndex: detonatedCount
                    }));
                } else {
                    throw new Error('v5.9: Event Bus no disponible para BOMBA_EXPLOTO');
                }

                // Una bomba alcanzada por la llama queda marcada para la siguiente
                // iteración. No hay recursión ni detonación doble de la misma bomba.
                for (let i = gameState.bombs.length - 1; i >= 0; i--) {
                    const other = gameState.bombs[i];
                    if (!other || !blastKeys.has(`${other.x},${other.y}`)) continue;
                    if (other.state === 'moving' || other.motionState === 'moving') continue;
                    if (typeof isBombSubmergedV631 === 'function' && isBombSubmergedV631(other)) continue;
                    gameState.bombs.splice(i, 1);
                    if (other.countsTowardPlayerCapacity !== false) player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);
                    registerBombChainLink(bomb, other, detonatedCount + 1, detonatedCount + 1);
                    queue.push({ bomb: other, parent: bomb });
                }

                for (const cell of cells) {
                    gameState.explosions.push({
                        x: cell.x,
                        y: cell.y,
                        timer: 100,
                        blastId,
                        owner: bomb.owner || 'player',
                        elementV612: bomb.elementV612 || 'normal'
                    });
                }
            }

            if (detonatedCount > 1) {
                // Mantener la información de cadena; la explosión continua ya
                // es la única silueta y no debe recibir un segundo burst circular.
                addFloatingText(`CADENA ×${detonatedCount}`, (first.x + 0.5) * TILE_SIZE, (first.y - 0.15) * TILE_SIZE, '#fbbf24');
            }
            updateUI(true);
        }

        function update(dt) {
            clampLargeEntities();
            if (!gameState.isPlaying || gameState.paused) return;

            // Fuente única de actualización para power-ups universales.
            if (typeof gameplayPowerupUpdateV676 === 'function') gameplayPowerupUpdateV676(dt);
            if (typeof tickRunClock === 'function') tickRunClock(dt);
            gameState.animFrame++;
            updateCombatFeedback(dt);
            renderImmersion();

            // V3.6: la inmunidad tras recibir daño es temporal.
            // El contador se descuenta cada frame y se desactiva al llegar a cero.
            updatePlayerInvulnerability(dt);

            updateRoomTimerV627(dt);
            updateHazards(dt);
            if (typeof materialUpdateV60 === 'function') materialUpdateV60(dt);
            if (typeof updateBiomeLiquidPlayerEffectsV631 === 'function') updateBiomeLiquidPlayerEffectsV631(dt);
            updateBoss(dt);

            // Shake countdown
            if (gameState.shakeTimer > 0) {
                gameState.shakeTimer -= dt;
            }

            // V3.4: movimiento asistido cardinal. Nunca se combinan X e Y.
            updatePlayerMovement(dt);
            if (typeof playerFSMUpdate === 'function') playerFSMUpdate(dt);

            // V3.7: la cámara acompaña al personaje al recorrer sectores del mapa.
            // V3.12.4: la cámara no puede detener el game loop si el módulo no está disponible.
            if (typeof updateCamera === 'function') updateCamera(dt);

            updateAdaptiveInterface();

            // v6.7.1: bombUpdate() es la única fuente de verdad del ciclo de
            // vida de las bombas. updateBombHandling() queda solo como wrapper
            // de compatibilidad para llamadas heredadas.
            bombUpdate(dt);
            if (typeof updateElementalBombsV612 === 'function') updateElementalBombsV612(dt);

            // Hitbox estándar para recoger objetos (ocupa casi todo el sprite)
            let pRect = { left: player.x, right: player.x + player.width, top: player.y, bottom: player.y + player.height };
            
            // Hitbox reducida (hurtbox) para recibir daño.
            // Es mucho más pequeña para evitar que te maten a través de esquinas o rozando paredes.
            let pMarginX = player.width * 0.3; // 30% más pequeña a los lados
            let pMarginY = player.height * 0.3; // 30% más pequeña arriba
            let pHurtbox = { 
                left: player.x + pMarginX, 
                right: player.x + player.width - pMarginX, 
                top: player.y + pMarginY, 
                bottom: player.y + player.height - (pMarginY * 0.5) // Más ajustado a los pies
            };

            // Update Explosions
            for (let i = gameState.explosions.length - 1; i >= 0; i--) {
                let exp = gameState.explosions[i];
                exp.timer -= dt;
                
                // Reducimos un poquito el hitbox de la explosión para que sea más justo
                // Contacto estricto: tocar apenas una esquina/borde de la celda no cuenta como golpe.
                if (explosionOverlapsRect(pHurtbox, exp, typeof getPlayerExplosionInset === 'function' ? getPlayerExplosionInset(exp) : 5)) {
                    const damageSource = exp.owner === 'trap' ? 'trap' : 'explosion';
                    takeDamage(damageSource, (exp.x + .5) * TILE_SIZE, (exp.y + .5) * TILE_SIZE);
                }

                // v6.1: los ecos reciben daño de las mismas explosiones del campo.
                if (typeof damageDeathEchoV61 === 'function') damageDeathEchoV61(exp);

                if (gameState.boss && !gameState.boss.defeated && exp.owner !== 'boss') {
                    const b = gameState.boss;
                    const bossRect = { left:b.x-b.width/2, right:b.x+b.width/2, top:b.y-b.height/2, bottom:b.y+b.height/2 };
                    if (explosionOverlapsRect(bossRect, exp, 5) && b.lastBlastHitId !== exp.blastId) {
                        if (damageBoss(1)) b.lastBlastHitId = exp.blastId;
                    }
                }

                for (let j = gameState.enemies.length - 1; j >= 0; j--) {
                    let e = gameState.enemies[j];
                    // El enemigo tiene hitbox completo para que sea fácil matarlo con bombas
                    let eFullRect = { left: e.x - e.width/2, right: e.x + e.width/2, top: e.y - e.height/2, bottom: e.y + e.height/2 };
                    if (explosionOverlapsRect(eFullRect, exp, 5)) {
                        if (typeof enemyBlastInteractionV630 === 'function' && enemyBlastInteractionV630(e, exp)) continue;
                        if (typeof enemyOnDefeatedV630 === 'function') enemyOnDefeatedV630(e, exp);
                        triggerEnemyDefeatFeedback(e);
                        gameState.enemies.splice(j, 1);
                        const fireScoreMult = gameState.fireScoreMult || 1;
                        const killScore = Math.round(100 * gameState.killScoreMult * fireScoreMult * (e.elite ? 1.25 : 1));
                        const killCoins = Math.max(2, Math.round((2 + Math.random() * 3) * (1 + gameState.coinBonus) * gameState.roomType.coinMult));
                        gameState.score += killScore;
                        gameState.coins += killCoins;
                        gameState.totalKills++;
                        if (typeof gameplayPowerupOnEnemyDefeatedV676 === 'function') gameplayPowerupOnEnemyDefeatedV676(e);
                        addFloatingText(`+${killScore}  +${killCoins}¢`, e.x, e.y, e.elite ? '#fb7185' : '#38bdf8');
                        if (typeof tryUnlockExitCurrentRoom === 'function') tryUnlockExitCurrentRoom();
                    }
                }

                if (exp.timer <= 0) gameState.explosions.splice(i, 1);
            }

            // v6.1: el eco tiene IA propia y se actualiza fuera de la IA legacy.
            if (typeof updateDeathEchoV61 === 'function') updateDeathEchoV61(dt);

            // V3.11: IA de enemigos aislada y con pathfinding dosificado.
            updateEnemyAI(dt);

            // Contacto jugador-enemigo: separado del movimiento para que la IA
            // no pueda romper accidentalmente el sistema de daño.
            for (let j = gameState.enemies.length - 1; j >= 0; j--) {
                const e = gameState.enemies[j];
                if (!e || (typeof isEnemyBuriedV630 === 'function' && isEnemyBuriedV630(e))) continue;
                const eHitbox = {
                    left: e.x - e.width * 0.3,
                    right: e.x + e.width * 0.3,
                    top: e.y - e.height * 0.3,
                    bottom: e.y + e.height * 0.3
                };
                if (checkOverlap(pHurtbox, eHitbox)) {
                    if (e.type?.contactDamage === 0) {
                        // Winter obstacles are not attackers: their gameplay role is to
                        // occupy space and force route calculation under slippery movement.
                        continue;
                    }
                    takeDamage('enemy', e.x, e.y);
                }
            }

            // Items pickup
            for (let i = gameState.items.length - 1; i >= 0; i--) {
                let it = gameState.items[i];
                let itRect = { left: it.x * TILE_SIZE, right: (it.x+1)*TILE_SIZE, top: it.y*TILE_SIZE, bottom: (it.y+1)*TILE_SIZE };
                if (checkOverlap(pRect, itRect)) {
                    let pickupApplied = true;
                    if (it.type === 'RELIC') {
                        const relic = RELICS.find(r => r.id === it.relicId);
                        pickupApplied = !!relic;
                        if (relic) grantRelic(relic);
                    } else if (typeof applyPowerupV67 === 'function') {
                        pickupApplied = !!applyPowerupV67(it.type);
                    }

                    if (typeof showPowerupFeedbackV688 === 'function') {
                        showPowerupFeedbackV688(it, pickupApplied);
                    }

                    // Un pickup que no puede aplicarse no se consume. Esto evita
                    // perder capacidades ya activas o mejoras que llegaron a su límite.
                    if (!pickupApplied) {
                        addFloatingText('NO APLICADO', (it.x + 0.5) * TILE_SIZE, (it.y + 0.25) * TILE_SIZE, '#f97316');
                        continue;
                    }

                    // El feedback visual específico es estético y no controla la recogida.
                    // Si el renderer de feedback no está disponible, se conserva el burst histórico.
                    const pickupFxHandled = typeof feedbackPoolPowerupPickupV6322 === 'function'
                        && feedbackPoolPowerupPickupV6322(it);
                    if (!pickupFxHandled) {
                        addParticles((it.x + 0.5) * TILE_SIZE, (it.y + 0.5) * TILE_SIZE, 'particleLoot', 10);
                    }
                    gameState.items.splice(i, 1);
                    sfx('pickup');
                    updateUI(true);
                }
            }

            // Update Particles
            for (let i = gameState.particles.length - 1; i >= 0; i--) {
                let p = gameState.particles[i];
                const particleFrameScale = Math.min(dt / 16.6667, 2);
                p.x += p.vx * particleFrameScale;
                p.y += p.vy * particleFrameScale;
                p.life -= particleFrameScale;
                if (p.life <= 0) gameState.particles.splice(i, 1);
            }

            // Update Floaters
            for (let i = gameState.floaters.length - 1; i >= 0; i--) {
                let f = gameState.floaters[i];
                const floaterFrameScale = Math.min(dt / 16.6667, 2);
                f.y -= 0.8 * floaterFrameScale;
                f.opacity -= 0.02 * floaterFrameScale;
                f.life -= floaterFrameScale;
                if (f.life <= 0) gameState.floaters.splice(i, 1);
            }

            // v5.8 ECS: sincroniza la capa de entidades después del gameplay del frame.
            // No modifica la fuente de verdad legacy; solo normaliza Position/Health/Explosive.
            if (typeof ecsUpdate === 'function') ecsUpdate(dt);

            updateUI();

            // Exit Check
            let pgx = Math.floor((player.x + player.width/2) / TILE_SIZE);
            let pgy = Math.floor((player.y + player.height/2) / TILE_SIZE);
            if (gameState.grid[pgy] && gameState.grid[pgy][pgx] === TYPES.EXIT_OPEN) {
                sfx('exit');
                completeLevel();
            }
        }

        function checkOverlap(r1, r2) {
            return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
        }

        function updatePlayerInvulnerability(dt) {
            const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
            const godMode = typeof window.isGodModeActiveV616 === 'function' && window.isGodModeActiveV616();
            if (Number(p.invincibleTimer) > 0) p.invincibleTimer = Math.max(0, p.invincibleTimer - Math.max(0, Number(dt) || 0));
            else p.invincibleTimer = 0;
            p.isInvincible = !!godMode || p.invincibleTimer > 0;
        }

        function takeDamage(source='unknown', sourceX=null, sourceY=null) {
            const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
            const gs = window.BOMBER_ENGINE?.getState?.() || gameState;
            const sx = sourceX == null ? p.x : sourceX;
            const sy = sourceY == null ? p.y : sourceY;
            // Bloqueo antes de consumir escudo, restar vida o disparar efectos de daño/muerte.
            if ((typeof window.isGodModeActiveV616 === 'function' && window.isGodModeActiveV616()) || gs.godModeEnabled === true || p.godModeEnabled === true) {
                p.isInvincible = true;
                return false;
            }
            if (!canApplyPlayerDamage()) {
                return false;
            }

            sfx('hurt');
            if (p.hasShield) {
                p.hasShield = false;
                p.isInvincible = true;
                p.invincibleTimer = 1000 + (Number(gs.hitInvulnerabilityBonus) || 0);
                addFloatingText('ESCUDO ROTO!', p.x, p.y, '#38bdf8');
                addParticles(p.x, p.y, 'particleShield', 16);
                triggerPlayerDamageFeedback(source, sx, sy, false, true);
                triggerScreenShake(5, 200);
                updateUI(true);
                return true;
            }

            p.health--;
            p.isInvincible = true;
            p.invincibleTimer = 1500 + (Number(gs.hitInvulnerabilityBonus) || 0);
            const lethal = p.health <= 0;
            addParticles(p.x, p.y, 'particleDanger', lethal ? 26 : 15);
            triggerPlayerDamageFeedback(source, sx, sy, lethal, false);
            triggerScreenShake(lethal ? 14 : 10, lethal ? 520 : 400);
            if (lethal) sfx('death');
            if (lethal && typeof globalThis.releaseCarriedBombV682 === 'function') {
                globalThis.releaseCarriedBombV682(p, 'death');
            }
            if (lethal && typeof playerFSMDeath === 'function') playerFSMDeath(source);
            updateUI(true);
            if (typeof gameplayPowerupOnDamageV676 === 'function') gameplayPowerupOnDamageV676();
            if (lethal) gameOver(source);
            return true;
        }


;
// === js/21-mobile-performance.js ===
/*
 * Bomberman Roguelike v6.5 — Mobile Performance Controller
 *
 * Objetivo: priorizar legibilidad y gameplay en móviles sin cambiar la simulación.
 * No elimina entidades ni efectos de gameplay; reduce únicamente su representación.
 */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'bomberman_render_profile_v65';

    const PROFILES = Object.freeze({
        low: Object.freeze({
            id: 'low',
            particleBudget: 20,
            floaterBudget: 8,
            showAmbientDust: false,
            showLighting: false,
            showCombatFeedback: false,
            showRoomDecor: false,
            showEnemyAISignals: false,
            useCanvasFilter: false
        }),
        medium: Object.freeze({
            id: 'medium',
            particleBudget: 48,
            floaterBudget: 16,
            showAmbientDust: true,
            showLighting: false,
            showCombatFeedback: true,
            showRoomDecor: true,
            showEnemyAISignals: false,
            useCanvasFilter: true
        }),
        high: Object.freeze({
            id: 'high',
            particleBudget: 96,
            floaterBudget: 24,
            showAmbientDust: true,
            showLighting: true,
            showCombatFeedback: true,
            showRoomDecor: true,
            showEnemyAISignals: true,
            useCanvasFilter: true
        })
    });

    function detectRecommendedProfile() {
        const coarse = !!global.matchMedia?.('(pointer: coarse)').matches;
        const cores = Number(global.navigator?.hardwareConcurrency || 4);
        const memory = Number(global.navigator?.deviceMemory || 0);
        const smallViewport = Math.min(global.innerWidth || 9999, global.innerHeight || 9999) <= 820;

        if (coarse && (cores <= 6 || (memory > 0 && memory <= 4) || smallViewport)) return 'low';
        if (coarse || smallViewport) return 'medium';
        return 'high';
    }

    function readProfileId() {
        try {
            const saved = global.localStorage?.getItem(STORAGE_KEY);
            if (saved && PROFILES[saved]) return saved;
        } catch (_) {}
        return detectRecommendedProfile();
    }

    let profileId = readProfileId();

    function getProfile() {
        return PROFILES[profileId] || PROFILES.medium;
    }

    function setProfile(nextId, persist = true) {
        if (!PROFILES[nextId]) return false;
        profileId = nextId;
        if (persist) {
            try { global.localStorage?.setItem(STORAGE_KEY, nextId); } catch (_) {}
        }
        document.body?.classList.toggle('mobile-performance-low', profileId === 'low');
        document.body?.classList.toggle('mobile-performance-medium', profileId === 'medium');
        document.body?.classList.toggle('mobile-performance-high', profileId === 'high');
        return true;
    }

    setProfile(profileId, false);

    global.BOMBER_RENDER_PROFILE_V65 = PROFILES;
    global.getBomberRenderProfileV65 = getProfile;
    global.setBomberRenderProfileV65 = setProfile;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getRenderProfile = getProfile;
    global.BOMBER_ENGINE.setRenderProfile = setProfile;
    global.BOMBER_ENGINE.getRenderProfileAudit = () => ({
        profile: getProfile().id,
        recommended: detectRecommendedProfile(),
        mobile: !!global.matchMedia?.('(pointer: coarse)').matches,
        cores: Number(global.navigator?.hardwareConcurrency || 0),
        memoryGB: Number(global.navigator?.deviceMemory || 0)
    });
})(window);

;
// === js/07-render-tiles.js ===
// Bomberman Roguelike v6.31.5 — Renderizador: tiles, paredes y bloques
// Extracción mecánica desde js/07-render.js. Cuerpos conservados sin cambios.

// Bomberman Roguelike v6.30.7 — Canvas renderer con fusión cromática elemental
// V6.25.0: Canvas conserva skins/especies de enemigos por bioma. Cache procedural preservado.
// V3.17: cache de terreno estático para evitar reconstruir la cuadrícula completa
// en cada frame. El mapa se regenera solo cuando cambia la referencia/revisión.

// V6.21: infraestructura común para tiles procedurales en Canvas 2D.
// El caché por tile complementa al caché de terreno existente; no crea un segundo renderer.

// V6.22/V6.23/V6.24: paredes y objetos procedurales; una sola ruta visual Canvas 2D.
const BIOME_WALL_SPECS_V622 = Object.freeze({
    classic: Object.freeze({ family: 'structured', base: '#475569', light: '#94a3b8', shadow: '#334155', deep: '#0f172a', accent: '#38bdf8', inset: '#1e293b' }),
    winter: Object.freeze({ family: 'rock', base: '#526f7e', light: '#d9f4ff', shadow: '#314956', deep: '#1b2c35', accent: '#8ee8ff', secondary: '#6ea7bb', detail: 'ice' }),
    autumn: Object.freeze({ family: 'organic', base: '#3f2418', light: '#8e5a32', shadow: '#24140d', deep: '#170c08', accent: '#d28a2e', secondary: '#63351f', detail: 'roots' }),
    spring: Object.freeze({ family: 'organic', base: '#687164', light: '#b5c4ab', shadow: '#404a3e', deep: '#252d23', accent: '#4f8f4f', secondary: '#7da263', detail: 'vine' }),
    summer: Object.freeze({ family: 'structured', base: '#a84f32', light: '#e28a5f', shadow: '#70321f', deep: '#4b2116', accent: '#c97a55', secondary: '#8f422a', detail: 'brick' }),
    underground: Object.freeze({ family: 'rock', base: '#292a32', light: '#666674', shadow: '#17181f', deep: '#0b0b10', accent: '#a56cff', secondary: '#573987', detail: 'crystal' }),
    clouds: Object.freeze({ family: 'cloud', base: '#66788c', light: '#aabbd0', shadow: '#415064', deep: '#2d3745', accent: '#ffe34f', secondary: '#8296ad', detail: 'lightning' }),
    mountains: Object.freeze({ family: 'rock', base: '#4d535b', light: '#929aa4', shadow: '#2e3339', deep: '#171b20', accent: '#c1cad2', secondary: '#646c76', detail: 'facets' }),
    beach: Object.freeze({ family: 'organic', base: '#98755a', light: '#dbc39d', shadow: '#684d3b', deep: '#433125', accent: '#d76b49', secondary: '#b79a6f', detail: 'coral' }),
    space: Object.freeze({ family: 'structured', base: '#384652', light: '#7e95a7', shadow: '#202932', deep: '#10161b', accent: '#53b8d9', secondary: '#566673', detail: 'panel' }),
    sky: Object.freeze({ family: 'column', base: '#d8d5ce', light: '#fffdf6', shadow: '#aaa69d', deep: '#78736b', accent: '#cabca3', secondary: '#ece7db', detail: 'marble' }),
    inferno: Object.freeze({ family: 'rock', base: '#34201c', light: '#704337', shadow: '#1d100e', deep: '#100807', accent: '#ff7a21', secondary: '#8d2f1e', detail: 'magma' })
});

function getBiomeWallSpecV622() {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    return BIOME_WALL_SPECS_V622[themeId] || BIOME_WALL_SPECS_V622.classic;
}

function drawWallFaceV622(targetCtx, x, y, size, spec) {
    const edge = Math.max(2, Math.floor(size * 0.06));
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x, y, size, size);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x + edge, y + edge, size - edge * 2, size - edge * 2);
    targetCtx.fillStyle = spec.light;
    targetCtx.globalAlpha = 0.36;
    targetCtx.fillRect(x + edge, y + edge, size - edge * 2, Math.max(2, edge));
    targetCtx.fillRect(x + edge, y + edge, Math.max(2, edge), size - edge * 2);
    targetCtx.globalAlpha = 1;
    targetCtx.fillStyle = spec.deep;
    targetCtx.globalAlpha = 0.30;
    targetCtx.fillRect(x + size * 0.16, y + size * 0.16, size * 0.68, size * 0.68);
    targetCtx.globalAlpha = 1;
}

function drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    const n = Math.abs(Number(seed) || 0) + 1;
    const inset = size * 0.11;
    const colors = [spec.base, spec.secondary || spec.shadow, spec.light];
    for (let i = 0; i < 5; i++) {
        const px = x + inset + ((n * (i + 7) * 23) % 67) / 67 * (size - inset * 2);
        const py = y + inset + ((n * (i + 3) * 29) % 71) / 71 * (size - inset * 2);
        const w = size * (0.18 + ((n + i) % 4) * 0.035);
        const h = size * (0.14 + ((n + i * 2) % 3) * 0.04);
        drawTilePolygonV621(targetCtx, [
            [px, py + h * 0.35], [px + w * 0.35, py], [px + w, py + h * 0.24],
            [px + w * 0.78, py + h], [px + w * 0.22, py + h * 0.82]
        ], colors[i % colors.length]);
    }
    drawTileCrackV621(targetCtx, x, y, size, spec.accent, n, 2);
    drawTileNoiseV621(targetCtx, x + inset, y + inset, size - inset * 2, spec.accent, n + 5, 8, 0.11);

    if (spec.detail === 'crystal') {
        const crystal = spec.accent;
        drawTilePolygonV621(targetCtx, [[x + size*.16, y + size*.75], [x + size*.25, y + size*.48], [x + size*.31, y + size*.76]], crystal);
        drawTilePolygonV621(targetCtx, [[x + size*.68, y + size*.72], [x + size*.76, y + size*.34], [x + size*.84, y + size*.72]], spec.secondary);
    } else if (spec.detail === 'magma') {
        targetCtx.save();
        targetCtx.strokeStyle = spec.accent;
        targetCtx.lineWidth = Math.max(2, size * 0.04);
        targetCtx.globalAlpha = 0.9;
        targetCtx.beginPath();
        targetCtx.moveTo(x + size*.22, y + size*.10);
        targetCtx.lineTo(x + size*.34, y + size*.35);
        targetCtx.lineTo(x + size*.27, y + size*.57);
        targetCtx.lineTo(x + size*.45, y + size*.83);
        targetCtx.moveTo(x + size*.72, y + size*.16);
        targetCtx.lineTo(x + size*.62, y + size*.45);
        targetCtx.lineTo(x + size*.76, y + size*.70);
        targetCtx.stroke();
        targetCtx.restore();
    } else if (spec.detail === 'ice') {
        drawTilePolygonV621(targetCtx, [[x+size*.18,y+size*.15],[x+size*.32,y+size*.08],[x+size*.28,y+size*.28]], spec.light);
        drawTilePolygonV621(targetCtx, [[x+size*.69,y+size*.78],[x+size*.82,y+size*.63],[x+size*.84,y+size*.88]], spec.accent);
    }
}

function drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    if (spec.detail === 'roots') {
        const trunkW = size * 0.22;
        targetCtx.fillStyle = spec.base;
        targetCtx.fillRect(x + size*.14, y + size*.08, trunkW, size*.78);
        targetCtx.fillRect(x + size*.52, y + size*.04, trunkW, size*.82);
        targetCtx.fillStyle = spec.light;
        targetCtx.fillRect(x + size*.17, y + size*.12, Math.max(2, size*.045), size*.62);
        targetCtx.fillRect(x + size*.55, y + size*.08, Math.max(2, size*.045), size*.66);
        targetCtx.fillStyle = spec.shadow;
        targetCtx.beginPath();
        targetCtx.moveTo(x+size*.12,y+size*.88); targetCtx.lineTo(x+size*.29,y+size*.70); targetCtx.lineTo(x+size*.38,y+size*.88); targetCtx.closePath(); targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(x+size*.43,y+size*.88); targetCtx.lineTo(x+size*.61,y+size*.70); targetCtx.lineTo(x+size*.86,y+size*.89); targetCtx.closePath(); targetCtx.fill();
        drawTileNoiseV621(targetCtx, x+size*.1, y+size*.08, size*.8, spec.accent, seed, 10, .14);
    } else if (spec.detail === 'vine') {
        for (let i = 0; i < 4; i++) {
            targetCtx.save();
            targetCtx.strokeStyle = i % 2 ? spec.accent : spec.secondary;
            targetCtx.lineWidth = Math.max(2, size*.035);
            targetCtx.beginPath();
            targetCtx.moveTo(x + size*(0.12 + i*.23), y + size*.08);
            targetCtx.quadraticCurveTo(x + size*(0.02 + i*.25), y + size*.42, x + size*(0.16 + i*.19), y + size*.90);
            targetCtx.stroke();
            targetCtx.restore();
        }
        drawTileNoiseV621(targetCtx, x+size*.08, y+size*.08, size*.84, spec.accent, seed+9, 14, .12);
    } else if (spec.detail === 'coral') {
        targetCtx.fillStyle = spec.accent;
        targetCtx.fillRect(x+size*.16, y+size*.72, size*.16, size*.14);
        targetCtx.fillRect(x+size*.36, y+size*.63, size*.10, size*.23);
        targetCtx.fillRect(x+size*.72, y+size*.70, size*.13, size*.15);
        targetCtx.fillStyle = spec.secondary;
        for (let i=0;i<4;i++) targetCtx.fillRect(x+size*(.22+i*.16), y+size*(.20+(i%2)*.08), size*.05, size*.05);
    }
}

function drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    const edge = Math.max(2, size*.045);
    targetCtx.strokeStyle = spec.shadow;
    targetCtx.lineWidth = Math.max(2, size*.035);
    targetCtx.beginPath();
    targetCtx.moveTo(x+size*.05, y+size*.33); targetCtx.lineTo(x+size*.95, y+size*.33);
    targetCtx.moveTo(x+size*.05, y+size*.67); targetCtx.lineTo(x+size*.95, y+size*.67);
    targetCtx.stroke();

    if (spec.detail === 'brick') {
        targetCtx.beginPath();
        targetCtx.moveTo(x+size*.50,y+edge); targetCtx.lineTo(x+size*.50,y+size*.33);
        targetCtx.moveTo(x+size*.26,y+size*.33); targetCtx.lineTo(x+size*.26,y+size*.67);
        targetCtx.moveTo(x+size*.74,y+size*.33); targetCtx.lineTo(x+size*.74,y+size*.67);
        targetCtx.moveTo(x+size*.50,y+size*.67); targetCtx.lineTo(x+size*.50,y+size-edge);
        targetCtx.stroke();
    } else {
        targetCtx.fillStyle = spec.accent;
        const rivet = Math.max(2, size*.045);
        [[.13,.13],[.87,.13],[.13,.87],[.87,.87]].forEach(([rx,ry]) => targetCtx.fillRect(x+size*rx-rivet/2,y+size*ry-rivet/2,rivet,rivet));
        targetCtx.fillStyle = spec.secondary || spec.light;
        targetCtx.globalAlpha = .35;
        targetCtx.fillRect(x+size*.20,y+size*.18,size*.60,Math.max(2,size*.035));
        targetCtx.globalAlpha = 1;
    }
}

function drawCloudWallV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.secondary;
    [[.24,.55,.23],[.46,.39,.30],[.70,.55,.24]].forEach(([cx,cy,r]) => {
        targetCtx.beginPath();
        targetCtx.arc(x+size*cx,y+size*cy,size*r,0,Math.PI*2);
        targetCtx.fill();
    });
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.12,y+size*.58,size*.76,size*.18);
    targetCtx.fillStyle = spec.accent;
    drawTilePolygonV621(targetCtx, [[x+size*.68,y+size*.12],[x+size*.61,y+size*.42],[x+size*.69,y+size*.42],[x+size*.62,y+size*.78]], spec.accent);
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.18, size*.76, spec.light, seed, 8, .09);
}

function drawSkyWallV622(targetCtx, x, y, size, spec) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    const cols = [0.18,0.46,0.74];
    cols.forEach((offset, i) => {
        const w = size*.18;
        targetCtx.fillStyle = spec.secondary;
        targetCtx.fillRect(x+size*offset, y+size*.16, w, size*.66);
        targetCtx.fillStyle = spec.light;
        targetCtx.fillRect(x+size*offset, y+size*.20, w*.22, size*.60);
        targetCtx.fillStyle = spec.shadow;
        targetCtx.fillRect(x+size*(offset+w/size-.06), y+size*.20, size*.06, size*.60);
        targetCtx.fillStyle = spec.accent;
        targetCtx.fillRect(x+size*(offset-.04), y+size*.09, w+size*.08, size*.10);
        targetCtx.fillRect(x+size*(offset-.04), y+size*.76, w+size*.08, size*.09);
    });
    drawTileCrackV621(targetCtx, x, y, size, spec.accent, 7, 1);
}

function drawWinterWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawAutumnWallV622(targetCtx, x, y, size, spec, seed) { drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSpringWallV622(targetCtx, x, y, size, spec, seed) { drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSummerWallV622(targetCtx, x, y, size, spec, seed) { drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawUndergroundWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawCloudWallEntryV622(targetCtx, x, y, size, spec, seed) { drawCloudWallV622(targetCtx, x, y, size, spec, seed); }
function drawMountainWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawBeachWallV622(targetCtx, x, y, size, spec, seed) { drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSpaceWallV622(targetCtx, x, y, size, spec, seed) { drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSkyWallEntryV622(targetCtx, x, y, size, spec, seed) { drawSkyWallV622(targetCtx, x, y, size, spec, seed); }
function drawInfernoWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }

function drawBiomeWallV622(targetCtx, x, y, size, seed = 0) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const spec = BIOME_WALL_SPECS_V622[themeId] || BIOME_WALL_SPECS_V622.classic;
    switch (themeId) {
        case 'winter': return drawWinterWallV622(targetCtx, x, y, size, spec, seed);
        case 'autumn': return drawAutumnWallV622(targetCtx, x, y, size, spec, seed);
        case 'spring': return drawSpringWallV622(targetCtx, x, y, size, spec, seed);
        case 'summer': return drawSummerWallV622(targetCtx, x, y, size, spec, seed);
        case 'underground': return drawUndergroundWallV622(targetCtx, x, y, size, spec, seed);
        case 'clouds': return drawCloudWallEntryV622(targetCtx, x, y, size, spec, seed);
        case 'mountains': return drawMountainWallV622(targetCtx, x, y, size, spec, seed);
        case 'beach': return drawBeachWallV622(targetCtx, x, y, size, spec, seed);
        case 'space': return drawSpaceWallV622(targetCtx, x, y, size, spec, seed);
        case 'sky': return drawSkyWallEntryV622(targetCtx, x, y, size, spec, seed);
        case 'inferno': return drawInfernoWallV622(targetCtx, x, y, size, spec, seed);
        default: return drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed);
    }
}
const BIOME_BLOCK_SPECS_V623 = Object.freeze({
    classic: Object.freeze({ family: 'crate', base: '#8f4f2b', light: '#d38a4b', shadow: '#5a2e1b', deep: '#2f180d', accent: '#f0b35c', secondary: '#6f3a24', detail: 'wood' }),
    winter: Object.freeze({ family: 'ice', base: '#d9f4ff', light: '#ffffff', shadow: '#7fb2c5', deep: '#5a91a8', accent: '#8ee8ff', secondary: '#b7e9fa', detail: 'crack' }),
    autumn: Object.freeze({ family: 'leafcrate', base: '#7b421f', light: '#c7792d', shadow: '#4a2413', deep: '#26130a', accent: '#e8752f', secondary: '#a52e26', detail: 'leaves' }),
    spring: Object.freeze({ family: 'shrub', base: '#3f6d38', light: '#78a85f', shadow: '#274124', deep: '#192719', accent: '#f48fb1', secondary: '#fff4f8', detail: 'flowers' }),
    summer: Object.freeze({ family: 'cactus', base: '#2d7f4f', light: '#73bf77', shadow: '#1b4e2f', deep: '#12351f', accent: '#8fd17b', secondary: '#b89a68', detail: 'rocks' }),
    underground: Object.freeze({ family: 'ore', base: '#4b4650', light: '#7f7784', shadow: '#2b2730', deep: '#17151a', accent: '#d7aa43', secondary: '#a98b62', detail: 'gold' }),
    clouds: Object.freeze({ family: 'cloud', base: '#eef6ff', light: '#ffffff', shadow: '#9fb3c7', deep: '#d0deea', accent: '#ffffff', secondary: '#c4d7e8', detail: 'soft' }),
    mountains: Object.freeze({ family: 'stones', base: '#8f979f', light: '#c7cdd2', shadow: '#5b6269', deep: '#353a3f', accent: '#e3e8eb', secondary: '#737b83', detail: 'pile' }),
    beach: Object.freeze({ family: 'barrelcrate', base: '#8a5a34', light: '#d39a5f', shadow: '#4f2d19', deep: '#2a180e', accent: '#c97a48', secondary: '#e2c07c', detail: 'coastal' }),
    space: Object.freeze({ family: 'tech', base: '#d98a26', light: '#ffd36a', shadow: '#8a4c12', deep: '#3e240c', accent: '#56d9ff', secondary: '#6e7f8d', detail: 'core' }),
    sky: Object.freeze({ family: 'altar', base: '#d8d4ca', light: '#ffffff', shadow: '#9c978d', deep: '#625e57', accent: '#eee6d1', secondary: '#b8b2a7', detail: 'sacred' }),
    inferno: Object.freeze({ family: 'emberrock', base: '#37211d', light: '#704137', shadow: '#1d100e', deep: '#0e0706', accent: '#ff8a24', secondary: '#c33d1c', detail: 'embers' })
});

function getBiomeBlockSpecV623() {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    return BIOME_BLOCK_SPECS_V623[themeId] || BIOME_BLOCK_SPECS_V623.classic;
}

function drawBiomeBlockFrameV623(targetCtx, x, y, size, spec) {
    const inset = Math.max(3, Math.floor(size * 0.08));
    drawTileShadowV621(targetCtx, x, y, size, spec.shadow);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x + 1, y + 1, size - 2, size - 3);
    drawTileBorderV621(targetCtx, x, y, size, {
        highlight: spec.light,
        shadow: spec.shadow
    });
    targetCtx.fillStyle = spec.deep;
    targetCtx.globalAlpha = 0.20;
    targetCtx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    targetCtx.globalAlpha = 1;
    drawTileHighlightV621(targetCtx, x, y, size, spec.light, 0.24);
}

function drawIceBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const inset = size * 0.16;
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x + inset, y + inset, size - inset * 2, size * 0.62);
    drawTilePolygonV621(targetCtx, [[x+size*.14,y+size*.18],[x+size*.30,y+size*.10],[x+size*.44,y+size*.18],[x+size*.56,y+size*.11],[x+size*.78,y+size*.18],[x+size*.70,y+size*.30],[x+size*.28,y+size*.28]], spec.light);
    drawTileCrackV621(targetCtx, x, y, size, spec.accent, seed + 3, 3);
    drawTileCrackV621(targetCtx, x + size*.18, y + size*.20, size*.64, '#5fa8c5', seed + 11, 2);
}

function drawLeafCrateV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x+size*.13, y+size*.18, size*.74, size*.62);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.17, y+size*.27, size*.66, Math.max(2,size*.045));
    targetCtx.fillRect(x+size*.17, y+size*.55, size*.66, Math.max(2,size*.045));
    drawTilePolygonV621(targetCtx, [[x+size*.08,y+size*.28],[x+size*.22,y+size*.12],[x+size*.31,y+size*.26],[x+size*.19,y+size*.37]], spec.accent);
    drawTilePolygonV621(targetCtx, [[x+size*.69,y+size*.18],[x+size*.82,y+size*.06],[x+size*.92,y+size*.22],[x+size*.79,y+size*.30]], spec.secondary);
    drawTilePolygonV621(targetCtx, [[x+size*.43,y+size*.10],[x+size*.55,y+size*.04],[x+size*.61,y+size*.21],[x+size*.49,y+size*.27]], spec.accent);
    drawTileNoiseV621(targetCtx, x+size*.10, y+size*.10, size*.80, spec.light, seed + 4, 7, 0.12);
}

function drawFlowerShrubV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.base;
    [[.28,.58,.23],[.50,.47,.29],[.72,.58,.23],[.39,.70,.22],[.61,.70,.22]].forEach(([cx,cy,r]) => {
        targetCtx.beginPath();
        targetCtx.arc(x+size*cx, y+size*cy, size*r, 0, Math.PI*2);
        targetCtx.fill();
    });
    const flowers = [
        [.27,.39,spec.accent],[.48,.31,spec.secondary],[.69,.42,'#ef5350'],[.42,.56,'#ffffff'],[.62,.57,spec.accent]
    ];
    flowers.forEach(([fx,fy,color], i) => {
        targetCtx.fillStyle = color;
        for(let p=0;p<4;p++){
            const a=(Math.PI/2)*p;
            targetCtx.beginPath();
            targetCtx.arc(x+size*fx+Math.cos(a)*size*.055, y+size*fy+Math.sin(a)*size*.055, Math.max(2,size*.035), 0, Math.PI*2);
            targetCtx.fill();
        }
        targetCtx.fillStyle = '#ffd54f';
        targetCtx.fillRect(x+size*fx-1, y+size*fy-1, 2, 2);
    });
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.26, size*.76, spec.light, seed+2, 9, .10);
}

function drawCactusV623(targetCtx, x, y, size, spec) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x+size*.18, y+size*.78, size*.64, size*.10);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.26, y+size*.81, size*.15, size*.07);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.42, y+size*.22, size*.17, size*.58);
    targetCtx.fillRect(x+size*.28, y+size*.42, size*.15, size*.25);
    targetCtx.fillRect(x+size*.63, y+size*.34, size*.15, size*.28);
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.45, y+size*.26, Math.max(2,size*.045), size*.48);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.53, y+size*.22, Math.max(2,size*.04), size*.58);
    targetCtx.fillStyle = spec.secondary;
    [[.25,.78,.10],[.55,.82,.13],[.77,.78,.09]].forEach(([cx,cy,r])=>{
        targetCtx.beginPath(); targetCtx.arc(x+size*cx,y+size*cy,size*r,0,Math.PI*2); targetCtx.fill();
    });
}

function drawOreBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const pts = [[.14,.69],[.22,.32],[.48,.18],[.76,.30],[.86,.65],[.62,.84],[.36,.82]];
    drawTilePolygonV621(targetCtx, pts.map(([px,py])=>[x+size*px,y+size*py]), spec.base, spec.shadow, Math.max(1,size*.025));
    drawTilePolygonV621(targetCtx, [[x+size*.23,y+size*.58],[x+size*.39,y+size*.27],[x+size*.54,y+size*.42],[x+size*.46,y+size*.70]], spec.light);
    targetCtx.strokeStyle = spec.accent;
    targetCtx.lineWidth = Math.max(2,size*.035);
    targetCtx.beginPath();
    targetCtx.moveTo(x+size*.30,y+size*.62); targetCtx.lineTo(x+size*.49,y+size*.52); targetCtx.lineTo(x+size*.66,y+size*.62);
    targetCtx.moveTo(x+size*.56,y+size*.38); targetCtx.lineTo(x+size*.72,y+size*.31);
    targetCtx.stroke();
    targetCtx.fillStyle = spec.accent;
    [[.35,.48],[.63,.55],[.73,.36]].forEach(([px,py])=>{
        targetCtx.fillRect(x+size*px, y+size*py, Math.max(2,size*.05), Math.max(2,size*.05));
    });
    drawTileNoiseV621(targetCtx, x+size*.15, y+size*.20, size*.70, spec.secondary, seed+5, 8, .14);
}

function drawCloudBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const puffs = [[.25,.60,.22],[.43,.46,.28],[.66,.56,.27],[.81,.66,.18],[.53,.68,.29]];
    puffs.forEach(([cx,cy,r],i)=>{
        targetCtx.fillStyle = i===1 || i===4 ? spec.light : spec.base;
        targetCtx.beginPath();
        targetCtx.arc(x+size*cx,y+size*cy,size*r,0,Math.PI*2);
        targetCtx.fill();
    });
    targetCtx.fillStyle = spec.shadow;
    targetCtx.globalAlpha = .20;
    targetCtx.fillRect(x+size*.19,y+size*.66,size*.60,size*.10);
    targetCtx.globalAlpha = 1;
    drawTileNoiseV621(targetCtx, x+size*.18, y+size*.30, size*.62, spec.light, seed+3, 8, .16);
}

function drawStonePileV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const stones = [
        [[.14,.74],[.25,.38],[.43,.46],[.39,.76]],
        [[.35,.78],[.46,.28],[.62,.34],[.68,.74]],
        [[.58,.75],[.69,.42],[.86,.49],[.82,.79]]
    ];
    stones.forEach((shape,i)=>{
        drawTilePolygonV621(targetCtx, shape.map(([px,py])=>[x+size*px,y+size*py]), i===1 ? spec.light : spec.base, spec.shadow, Math.max(1,size*.025));
    });
    drawTileHighlightV621(targetCtx, x, y, size, spec.accent, .18);
    drawTileNoiseV621(targetCtx, x+size*.13, y+size*.24, size*.74, spec.accent, seed+6, 7, .10);
}

function drawBeachBarrelCrateV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.50,y+size*.30,size*.32,size*.48);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.54,y+size*.26,size*.28,size*.48);
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.58,y+size*.30,Math.max(2,size*.05),size*.40);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.14,y+size*.32,size*.30,size*.34);
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x+size*.17,y+size*.35,size*.24,size*.28);
    targetCtx.fillStyle = spec.accent;
    targetCtx.fillRect(x+size*.19,y+size*.45,size*.20,Math.max(2,size*.04));
    targetCtx.fillRect(x+size*.14,y+size*.70,size*.32,Math.max(2,size*.05));
    drawTilePolygonV621(targetCtx, [[x+size*.70,y+size*.18],[x+size*.76,y+size*.11],[x+size*.82,y+size*.18],[x+size*.76,y+size*.23]], spec.secondary);
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.24, size*.72, spec.light, seed+4, 7, .10);
}

function drawTechBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.deep;
    targetCtx.fillRect(x+size*.14,y+size*.16,size*.72,size*.68);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.18,y+size*.20,size*.64,size*.60);
    targetCtx.fillStyle = spec.secondary;
    [[.20,.23],[.76,.23],[.20,.72],[.76,.72]].forEach(([px,py])=>targetCtx.fillRect(x+size*px,y+size*py,size*.08,size*.08));
    targetCtx.fillStyle = '#123b52';
    targetCtx.fillRect(x+size*.38,y+size*.36,size*.24,size*.24);
    targetCtx.fillStyle = spec.accent;
    targetCtx.beginPath(); targetCtx.arc(x+size*.50,y+size*.48,size*.095,0,Math.PI*2); targetCtx.fill();
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.22,y+size*.26,size*.14,Math.max(2,size*.04));
    drawTileNoiseV621(targetCtx, x+size*.16, y+size*.20, size*.68, spec.secondary, seed+7, 6, .08);
}

function drawAltarV623(targetCtx, x, y, size, spec) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.14,y+size*.72,size*.72,size*.12);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.21,y+size*.58,size*.58,size*.16);
    targetCtx.fillRect(x+size*.28,y+size*.36,size*.44,size*.24);
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.31,y+size*.39,size*.12,size*.16);
    targetCtx.fillRect(x+size*.28,y+size*.58,size*.08,size*.11);
    targetCtx.fillStyle = spec.accent;
    targetCtx.globalAlpha=.40;
    targetCtx.fillRect(x+size*.36,y+size*.15,size*.28,size*.12);
    targetCtx.globalAlpha=1;
    drawTileCrackV621(targetCtx, x+size*.20, y+size*.34, size*.56, spec.secondary, 9, 2);
}

function drawEmberRockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    drawTilePolygonV621(targetCtx, [[x+size*.12,y+size*.76],[x+size*.20,y+size*.40],[x+size*.40,y+size*.22],[x+size*.58,y+size*.36],[x+size*.54,y+size*.66],[x+size*.76,y+size*.42],[x+size*.89,y+size*.74],[x+size*.72,y+size*.86],[x+size*.40,y+size*.82]], spec.base);
    targetCtx.strokeStyle = spec.secondary;
    targetCtx.lineWidth = Math.max(2,size*.035);
    targetCtx.beginPath();
    targetCtx.moveTo(x+size*.25,y+size*.62); targetCtx.lineTo(x+size*.36,y+size*.46); targetCtx.lineTo(x+size*.50,y+size*.52);
    targetCtx.moveTo(x+size*.63,y+size*.65); targetCtx.lineTo(x+size*.72,y+size*.48);
    targetCtx.stroke();
    targetCtx.fillStyle = spec.accent;
    [[.31,.56,.045],[.58,.42,.038],[.71,.60,.032]].forEach(([px,py,r])=>{
        targetCtx.beginPath(); targetCtx.arc(x+size*px,y+size*py,size*r,0,Math.PI*2); targetCtx.fill();
    });
    targetCtx.fillStyle = spec.secondary;
    drawTilePolygonV621(targetCtx, [[x+size*.35,y+size*.36],[x+size*.42,y+size*.20],[x+size*.47,y+size*.38]], spec.secondary);
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.20, size*.76, spec.secondary, seed+8, 8, .12);
}

function drawAutumnBlockV623(targetCtx, x, y, size, spec, seed) { drawLeafCrateV623(targetCtx, x, y, size, spec, seed); }
function drawSpringBlockV623(targetCtx, x, y, size, spec, seed) { drawFlowerShrubV623(targetCtx, x, y, size, spec, seed); }
function drawSummerBlockV623(targetCtx, x, y, size, spec, seed) { drawCactusV623(targetCtx, x, y, size, spec, seed); }
function drawBeachBlockEntryV623(targetCtx, x, y, size, spec, seed) { drawBeachBarrelCrateV623(targetCtx, x, y, size, spec, seed); }

function drawBiomeBlockV623(targetCtx, x, y, size, seed = 0) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const spec = BIOME_BLOCK_SPECS_V623[themeId] || BIOME_BLOCK_SPECS_V623.classic;
    switch (themeId) {
        case 'winter': return drawIceBlockV623(targetCtx, x, y, size, spec, seed);
        case 'autumn': return drawAutumnBlockV623(targetCtx, x, y, size, spec, seed);
        case 'spring': return drawSpringBlockV623(targetCtx, x, y, size, spec, seed);
        case 'summer': return drawSummerBlockV623(targetCtx, x, y, size, spec, seed);
        case 'underground': return drawOreBlockV623(targetCtx, x, y, size, spec, seed);
        case 'clouds': return drawCloudBlockV623(targetCtx, x, y, size, spec, seed);
        case 'mountains': return drawStonePileV623(targetCtx, x, y, size, spec, seed);
        case 'beach': return drawBeachBlockEntryV623(targetCtx, x, y, size, spec, seed);
        case 'space': return drawTechBlockV623(targetCtx, x, y, size, spec, seed);
        case 'sky': return drawAltarV623(targetCtx, x, y, size, spec, seed);
        case 'inferno': return drawEmberRockV623(targetCtx, x, y, size, spec, seed);
        default: return drawBiomeTileBaseV621(targetCtx, x, y, 'block', size, seed);
    }
}

const renderTileCacheV621 = new Map();

const BIOME_TILE_PROFILES_V621 = Object.freeze({
    classic: Object.freeze({ wall: 'base', block: 'base' }),
    winter: Object.freeze({ wall: 'base', block: 'base' }),
    autumn: Object.freeze({ wall: 'base', block: 'base' }),
    spring: Object.freeze({ wall: 'base', block: 'base' }),
    summer: Object.freeze({ wall: 'base', block: 'base' }),
    underground: Object.freeze({ wall: 'base', block: 'base' }),
    clouds: Object.freeze({ wall: 'base', block: 'base' }),
    mountains: Object.freeze({ wall: 'base', block: 'base' }),
    beach: Object.freeze({ wall: 'base', block: 'base' }),
    space: Object.freeze({ wall: 'base', block: 'base' }),
    sky: Object.freeze({ wall: 'base', block: 'base' }),
    inferno: Object.freeze({ wall: 'base', block: 'base' })
});

const BIOME_TILE_FALLBACK_PALETTE_V621 = Object.freeze({
    wall: Object.freeze({ base: '#475569', highlight: '#94a3b8', shadow: '#334155', deep: '#0f172a', accent: '#38bdf8' }),
    block: Object.freeze({ base: '#b45309', highlight: '#f59e0b', shadow: '#78350f', deep: '#451a03', accent: '#92400e' })
});


function getBiomeTilePaletteV621(type) {
    const base = BIOME_TILE_FALLBACK_PALETTE_V621[type] || BIOME_TILE_FALLBACK_PALETTE_V621.wall;
    if (typeof themeColorV46 !== 'function') return base;
    if (type === 'wall') {
        return {
            base: themeColorV46('wallBase', base.base),
            highlight: themeColorV46('wallHighlight', base.highlight),
            shadow: themeColorV46('wallShadow', base.shadow),
            inset: themeColorV46('wallInset', '#1e293b'),
            deep: themeColorV46('wallDeep', base.deep),
            accent: themeColorV46('wallAccent', base.accent)
        };
    }
    return {
        base: themeColorV46('blockBase', base.base),
        highlight: themeColorV46('blockHighlight', base.highlight),
        shadow: themeColorV46('blockShadow', base.shadow),
        inset: themeColorV46('blockPattern', base.accent),
        deep: themeColorV46('blockCore', base.deep),
        accent: themeColorV46('blockPattern', base.accent)
    };
}

function drawTileShadowV621(targetCtx, x, y, size, color) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(x, y + Math.max(2, size * 0.08), size, Math.max(2, size * 0.08));
    targetCtx.fillRect(x + size - Math.max(2, size * 0.08), y, Math.max(2, size * 0.08), size);
}

function drawTileBorderV621(targetCtx, x, y, size, colors) {
    const edge = Math.max(2, Math.floor(size * 0.05));
    targetCtx.fillStyle = colors.highlight;
    targetCtx.fillRect(x, y, size, edge);
    targetCtx.fillRect(x, y, edge, size);
    targetCtx.fillStyle = colors.shadow;
    targetCtx.fillRect(x, y + size - edge, size, edge);
    targetCtx.fillRect(x + size - edge, y, edge, size);
}

function drawTileHighlightV621(targetCtx, x, y, size, color, alpha = 0.24) {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = color;
    targetCtx.fillRect(x + size * 0.14, y + size * 0.12, size * 0.32, Math.max(2, size * 0.05));
    targetCtx.fillRect(x + size * 0.14, y + size * 0.12, Math.max(2, size * 0.05), size * 0.22);
    targetCtx.restore();
}

function drawTileCrackV621(targetCtx, x, y, size, color, seed = 0, branches = 2) {
    const s = Math.abs(Number(seed) || 0) + 1;
    const startX = x + size * (0.28 + ((s * 17) % 29) / 100);
    const startY = y + size * (0.16 + ((s * 23) % 24) / 100);
    targetCtx.save();
    targetCtx.strokeStyle = color;
    targetCtx.globalAlpha = 0.52;
    targetCtx.lineWidth = Math.max(1, Math.floor(size * 0.035));
    targetCtx.beginPath();
    targetCtx.moveTo(startX, startY);
    let px = startX, py = startY;
    for (let i = 0; i < 3; i++) {
        px += size * (0.08 + ((s * (i + 3) * 11) % 13) / 100);
        py += size * (0.08 + ((s * (i + 5) * 7) % 11) / 100);
        targetCtx.lineTo(px, py);
    }
    targetCtx.stroke();
    for (let i = 0; i < Math.min(3, branches); i++) {
        const bx = startX + size * (0.12 + i * 0.16);
        const by = startY + size * (0.12 + i * 0.18);
        targetCtx.beginPath();
        targetCtx.moveTo(bx, by);
        targetCtx.lineTo(bx + size * 0.10, by - size * 0.08);
        targetCtx.stroke();
    }
    targetCtx.restore();
}

function drawTileNoiseV621(targetCtx, x, y, size, color, seed = 0, density = 10, alpha = 0.14) {
    const s = Math.abs(Number(seed) || 0) + 13;
    const count = Math.max(0, Math.floor(density));
    targetCtx.save();
    targetCtx.fillStyle = color;
    targetCtx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
        const nx = (s * (i + 5) * 37) % 97 / 97;
        const ny = (s * (i + 7) * 53) % 89 / 89;
        const dot = 1 + ((s + i) % 2);
        targetCtx.fillRect(x + nx * size, y + ny * size, dot, dot);
    }
    targetCtx.restore();
}

function drawTilePolygonV621(targetCtx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
    if (!Array.isArray(points) || points.length < 3) return;
    targetCtx.beginPath();
    targetCtx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) targetCtx.lineTo(points[i][0], points[i][1]);
    targetCtx.closePath();
    targetCtx.fillStyle = fillStyle;
    targetCtx.fill();
    if (strokeStyle) {
        targetCtx.strokeStyle = strokeStyle;
        targetCtx.lineWidth = lineWidth;
        targetCtx.stroke();
    }
}

function drawBiomeTileBaseV621(targetCtx, x, y, type, size, seed = 0) {
    const colors = getBiomeTilePaletteV621(type);
    const isWall = type === 'wall';
    const inset = Math.max(4, Math.floor(size * 0.12));
    const inner = size - inset * 2;
    targetCtx.fillStyle = colors.shadow;
    targetCtx.fillRect(x, y, size, size);
    targetCtx.fillStyle = colors.base;
    targetCtx.fillRect(x + 2, y + 2, size - 4, size - 5);
    drawTileBorderV621(targetCtx, x, y, size, colors);
    targetCtx.fillStyle = colors.deep;
    targetCtx.fillRect(x + inset, y + inset, inner, inner);
    drawTileHighlightV621(targetCtx, x, y, size, colors.highlight, 0.28);
    drawTileNoiseV621(targetCtx, x + 3, y + 3, size - 6, colors.accent, seed, isWall ? 8 : 12, 0.16);
    if (isWall) drawTileCrackV621(targetCtx, x, y, size, colors.accent, seed, 2);
    return colors;
}

function createTileSurfaceV621(width, height) {
    // V6.24.1: OffscreenCanvas es una optimizacion, no un requisito del render.
    // Solo se acepta si realmente podemos obtener un contexto 2D. Si falla,
    // se cae al canvas normal sin interrumpir el render del juego.
    if (typeof OffscreenCanvas === 'function') {
        try {
            const offscreen = new OffscreenCanvas(width, height);
            if (offscreen && typeof offscreen.getContext === 'function' && offscreen.getContext('2d')) {
                return offscreen;
            }
        } catch (_) {
            // Fallback inmediato al canvas DOM.
        }
    }
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        try {
            const surface = document.createElement('canvas');
            surface.width = width;
            surface.height = height;
            if (typeof surface.getContext === 'function' && surface.getContext('2d')) return surface;
        } catch (_) {
            // Sin superficie disponible, el llamador usara el fallback visual.
        }
    }
    return null;
}

function getBiomeTileKeyV621(themeId, type, variant = 0) {
    return `${themeId || 'classic'}|${type}|${TILE_SIZE}|${variant}`;
}

function getBiomeTileVariantV621(type, gridX = 0, gridY = 0) {
    if (type !== 'block') return 0;
    const levelSeed = Math.max(1, Number(gameState?.level) || 1);
    return Math.abs((gridX * 17 + gridY * 31 + levelSeed * 13) % 7) === 0 ? 1 : 0;
}

function buildBiomeTileCacheV621(type, variant = 0) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const key = getBiomeTileKeyV621(themeId, type, variant);
    const cached = renderTileCacheV621.get(key);
    if (cached) return cached;

    const surface = createTileSurfaceV621(TILE_SIZE, TILE_SIZE);
    if (!surface) return null;
    let tileCtx = null;
    try {
        tileCtx = surface.getContext('2d', { alpha: true });
    } catch (_) {
        tileCtx = null;
    }
    if (!tileCtx) return null;

    try {
        if (type === 'wall' && typeof drawBiomeWallV622 === 'function') {
            // V6.22: WALL pasa por el dibujo procedural cacheado.
            drawBiomeWallV622(tileCtx, 0, 0, TILE_SIZE, variant);
        } else if (type === 'block' && typeof drawBiomeBlockV623 === 'function') {
            // V6.23: BLOCK pasa por el dibujo destructible procedural cacheado.
            // La celda sigue siendo TYPES.BLOCK; solo cambia su representacion.
            drawBiomeBlockV623(tileCtx, 0, 0, TILE_SIZE, variant);
        } else {
            drawBiomeTileBaseV621(tileCtx, 0, 0, type, TILE_SIZE, variant);
        }
    } catch (_) {
        // Un fallo visual de un tile no puede abortar la construccion de todo el mapa.
        tileCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
        drawBiomeTileBaseV621(tileCtx, 0, 0, type, TILE_SIZE, variant);
    }

    renderTileCacheV621.set(key, surface);
    return surface;
}

function invalidateRenderTileCacheV621() {
    renderTileCacheV621.clear();
}

function drawCachedBiomeTileV621(targetCtx, type, gridX, gridY) {
    const variant = getBiomeTileVariantV621(type, gridX, gridY);
    const surface = buildBiomeTileCacheV621(type, variant);
    if (surface) targetCtx.drawImage(surface, gridX * TILE_SIZE, gridY * TILE_SIZE);
    return !!surface;
}


;
// === js/07-render-explosions.js ===
// Bomberman Roguelike v6.31.21 — Renderizador de explosiones elementales continuas
// Extracción mecánica desde js/07-render.js. Cuerpos conservados sin cambios.

let blastVisualSerialV6308 = 0;

function getExplosionEffectKeyV6308(effectId) {
    const key = String(effectId || 'normal').toLowerCase();
    const aliases = {
        normal: 'fire', fire: 'fire', heat: 'fire',
        ice: 'ice', frost: 'ice', cold: 'ice',
        electric: 'electric', shock: 'electric', arc: 'arc',
        steam: 'steam', plasma: 'plasma', acid: 'acid', poison: 'toxic', toxin: 'toxic'
    };
    return aliases[key] || key;
}

function mixExplosionColorV6308(a, b, amount) {
    const parse = value => {
        const text = String(value || '').trim();
        const short = text.match(/^#([0-9a-f]{3})$/i);
        const full = text.match(/^#([0-9a-f]{6})$/i);
        let hex = full?.[1] || (short ? short[1].split('').map(ch => ch + ch).join('') : 'f97316');
        return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    };
    const aa = parse(a), bb = parse(b), t = Math.max(0, Math.min(1, Number(amount) || 0));
    return '#' + aa.map((v, i) => Math.max(0, Math.min(255, Math.round(v*(1-t)+bb[i]*t))).toString(16).padStart(2,'0')).join('');
}

function explosionPaletteV6308(effectId) {
    const key = getExplosionEffectKeyV6308(effectId);
    const fire = {
        outer: typeof themeColorV46 === 'function' ? themeColorV46('fireOuter', '#b91c1c') : '#b91c1c',
        middle: typeof themeColorV46 === 'function' ? themeColorV46('fireMiddle', '#f97316') : '#f97316',
        core: typeof themeColorV46 === 'function' ? themeColorV46('fireCore', '#fff1a8') : '#fff1a8'
    };
    const palettes = {
        fire,
        ice: { outer:'#123f70', middle:'#38bdf8', core:'#e0f2fe' },
        electric: { outer:'#1d4ed8', middle:'#22d3ee', core:'#f0fdff' },
        arc: { outer:'#1e40af', middle:'#06b6d4', core:'#ffffff' },
        steam: { outer:'#475569', middle:'#cbd5e1', core:'#ffffff' },
        plasma: { outer:'#6b21a8', middle:'#d946ef', core:'#fae8ff' },
        acid: { outer:'#365314', middle:'#84cc16', core:'#ecfccb' },
        toxic: { outer:'#14532d', middle:'#65a30d', core:'#d9f99d' },
        gravity: { outer:'#3b0764', middle:'#a855f7', core:'#f5d0fe' },
        fragment: { outer:'#881337', middle:'#fb7185', core:'#ffe4e6' },
        pierce: { outer:'#713f12', middle:'#fbbf24', core:'#fef3c7' }
    };
    if (palettes[key]) return palettes[key];
    const def = window.BOMB_EFFECT_DEFS_V64?.[String(effectId || '').toLowerCase()];
    if (def?.color) return {
        outer: mixExplosionColorV6308(def.color, '#111827', 0.55),
        middle: String(def.color),
        core: String(def.core || '#fff7ed')
    };
    return fire;
}

// Los campos elementales persistentes se dibujan en capas independientes al final del archivo; la silueta de fuego aprobada permanece intacta.

function registerBombBlastVisualV6308(payload) {
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState;
    const inputCells = Array.isArray(payload?.cells) ? payload.cells : [];
    if (!state || !inputCells.length) return false;
    if (!Array.isArray(state.bombBlastVisualsV6308)) state.bombBlastVisualsV6308 = [];

    const bomb = payload.bomb || {};
    const incomingId = payload.blastId == null ? null : String(payload.blastId);
    if (incomingId && state.bombBlastVisualsV6308.some(item => item.blastId === incomingId)) return true;

    let element = String(bomb.elementV612 || 'normal').toLowerCase();
    if (element === 'normal' && Array.isArray(bomb.effectIds) && bomb.effectIds.length) {
        const fromEffect = getExplosionEffectKeyV6308(bomb.effectIds[0]);
        if (fromEffect !== 'fire' || String(bomb.effectIds[0]).toLowerCase() === 'heat') element = fromEffect;
        else element = 'normal';
    }
    element = getExplosionEffectKeyV6308(element);

    const uniqueCells = new Map();
    for (const cell of inputCells) {
        const x = Number(cell?.x), y = Number(cell?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const tx = Math.trunc(x), ty = Math.trunc(y);
        uniqueCells.set(`${tx},${ty}`, { x: tx, y: ty, element, fragment: !!cell.fragment, block: !!cell.block });
    }
    if (!uniqueCells.size) return false;

    const fallback = uniqueCells.values().next().value;
    const originX = Number.isFinite(Number(bomb.x)) ? Math.trunc(Number(bomb.x)) : fallback.x;
    const originY = Number.isFinite(Number(bomb.y)) ? Math.trunc(Number(bomb.y)) : fallback.y;
    const cells = [...uniqueCells.values()].map(cell => ({ ...cell, origin: cell.x === originX && cell.y === originY }));
    const maxDistance = Math.max(1, ...cells.map(cell => element === 'fragment' ? Math.max(Math.abs(cell.x-originX), Math.abs(cell.y-originY)) : Math.abs(cell.x-originX)+Math.abs(cell.y-originY)));

    state.bombBlastVisualsV6308.push({
        visualId: incomingId || `visual-${++blastVisualSerialV6308}`,
        blastId: incomingId,
        originX, originY,
        element,
        ageMs: 0,
        durationMs: 350,
        expansionMs: 80,
        settleMs: 250,
        maxDistance,
        cells
    });
    if (state.bombBlastVisualsV6308.length > 96) state.bombBlastVisualsV6308.splice(0, state.bombBlastVisualsV6308.length - 96);
    return true;
}

function updateBombBlastVisualsV6308(dt) {
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState;
    if (!state || !Array.isArray(state.bombBlastVisualsV6308)) return;
    if (!state.isPlaying) { state.bombBlastVisualsV6308.length = 0; return; }
    if (state.paused) return;
    const elapsed = Math.max(0, Math.min(1000, Number(dt) || 0));
    for (const visual of state.bombBlastVisualsV6308) visual.ageMs += elapsed;
    for (let i = state.bombBlastVisualsV6308.length - 1; i >= 0; i--) {
        if (!state.bombBlastVisualsV6308[i] || state.bombBlastVisualsV6308[i].ageMs >= 350) state.bombBlastVisualsV6308.splice(i, 1);
    }
}

function resetBombBlastVisualsV6308() {
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState;
    if (state && Array.isArray(state.bombBlastVisualsV6308)) state.bombBlastVisualsV6308.length = 0;
}

function explosionCanConnectV6331(a, b, dx, dy, allowDiagonals) {
    if (!allowDiagonals) return dx === 0 || dy === 0;
    const aRoot = !!a?.origin, bRoot = !!b?.origin;
    const diagonal = dx !== 0 && dy !== 0;
    if (diagonal) return (aRoot && b?.fragment) || (bRoot && a?.fragment) || (a?.fragment && b?.fragment);
    // Evitar que cada esquirla diagonal se una accidentalmente al brazo cardinal
    // que pasa al costado: la rama solo entra en la cruz en el origen.
    if (aRoot || bRoot) return true;
    return !!a?.fragment === !!b?.fragment;
}

function explosionComponentsV6308(cellMap, allowDiagonals = false) {
    const directions = allowDiagonals
        ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
        : [[1,0],[-1,0],[0,1],[0,-1]];
    const keyOf = (x,y) => `${x},${y}`;
    const unvisited = new Set(cellMap.keys());
    const components = [];
    while (unvisited.size) {
        const seed = unvisited.values().next().value;
        unvisited.delete(seed);
        const queue = [cellMap.get(seed)];
        const component = [];
        while (queue.length) {
            const cell = queue.pop();
            component.push(cell);
            for (const [dx,dy] of directions) {
                const key = keyOf(cell.x+dx, cell.y+dy);
                if (!unvisited.has(key)) continue;
                const next = cellMap.get(key);
                if (!explosionCanConnectV6331(cell, next, dx, dy, allowDiagonals)) continue;
                unvisited.delete(key);
                queue.push(next);
            }
        }
        if (component.some(cell => isWorldTileVisibleV329(cell.x, cell.y, 1))) components.push(component);
    }
    return components;
}

function explosionGraphPathsV6308(component, allowDiagonals = false) {
    const keyOf = cell => `${cell.x},${cell.y}`;
    const edgeKey = (a,b) => [keyOf(a),keyOf(b)].sort().join('|');
    const cells = new Map(component.map(cell => [keyOf(cell),cell]));
    const neighbors = new Map();
    for (const cell of component) {
        const around = [];
        for (const [dx,dy] of (allowDiagonals ? [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1]])) {
            const next = cells.get(`${cell.x+dx},${cell.y+dy}`);
            if (next && explosionCanConnectV6331(cell, next, dx, dy, allowDiagonals)) around.push(next);
        }
        neighbors.set(keyOf(cell), around);
    }
    const visited = new Set();
    const paths = [];
    function walk(start,next) {
        const points = [start];
        let previous = start, current = next, closed = false;
        for (let guard=0; guard<=component.length+2; guard++) {
            visited.add(edgeKey(previous,current));
            points.push(current);
            const around = neighbors.get(keyOf(current)) || [];
            if (around.length !== 2) break;
            const following = around.find(cell => keyOf(cell) !== keyOf(previous));
            if (!following) break;
            if (visited.has(edgeKey(current,following))) {
                if (keyOf(following) === keyOf(start)) { points.push(start); closed = true; }
                break;
            }
            previous=current; current=following;
        }
        return { points, closed };
    }
    for (const cell of component) {
        const around = neighbors.get(keyOf(cell)) || [];
        if (around.length === 2) continue;
        for (const next of around) if (!visited.has(edgeKey(cell,next))) paths.push(walk(cell,next));
    }
    for (const cell of component) for (const next of neighbors.get(keyOf(cell)) || []) {
        if (!visited.has(edgeKey(cell,next))) paths.push(walk(cell,next));
    }
    return { paths, neighbors };
}

// Suelo helado persistente de BOMB_ICE.
// Se limita a los campos frost: no modifica ni vuelve a dibujar fuego/electricidad.
// La película azul se extiende sobre casillas vecinas con un pequeño solape para
// ocultar las juntas del suelo y leerse como una sola capa de hielo.
function drawElementalResiduesV6308(targetCtx, effectFields) {
    const target = targetCtx || (typeof ctx !== 'undefined' ? ctx : null);
    if (!target || typeof target.save !== 'function' || typeof TILE_SIZE === 'undefined') return 0;

    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState || null;
    const source = Array.isArray(effectFields) ? effectFields : state?.bombEffectFieldsV64;
    if (!Array.isArray(source) || source.length === 0) return 0;

    const cells = new Map();
    for (const field of source) {
        if (!field || String(field.effectId || '').toLowerCase() !== 'frost') continue;
        const x = Math.trunc(Number(field.x)), y = Math.trunc(Number(field.y));
        const remaining = Math.max(0, Number(field.remainingMs) || 0);
        if (!Number.isInteger(x) || !Number.isInteger(y) || remaining <= 0) continue;
        const tile = state?.grid?.[y]?.[x];
        if (typeof TYPES !== 'undefined' && (tile === TYPES.WALL || tile === TYPES.BLOCK)) continue;
        const key = `${x},${y}`;
        const previous = cells.get(key);
        if (!previous || remaining > previous.remainingMs) {
            const total = Math.max(remaining, Number(field.visualTotalMs) || 2800);
            const life = Math.max(0, Math.min(1, remaining / total));
            const fade = life < 0.24 ? life / 0.24 : 1;
            cells.set(key, { x, y, remainingMs: remaining, alpha: fade * (0.94 + 0.06 * life) });
        }
    }
    if (!cells.size) return 0;

    const keyOf = (x, y) => `${x},${y}`;
    const unvisited = new Set(cells.keys());
    const components = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (unvisited.size) {
        const first = unvisited.values().next().value;
        unvisited.delete(first);
        const queue = [cells.get(first)], component = [];
        while (queue.length) {
            const cell = queue.pop();
            component.push(cell);
            for (const [dx, dy] of dirs) {
                const nextKey = keyOf(cell.x + dx, cell.y + dy);
                if (!unvisited.has(nextKey)) continue;
                unvisited.delete(nextKey);
                queue.push(cells.get(nextKey));
            }
        }
        components.push(component);
    }

    const visible = cell => typeof isWorldTileVisibleV329 !== 'function' || isWorldTileVisibleV329(cell.x, cell.y, 1);
    const hash = (x, y, salt = 0) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
        return n - Math.floor(n);
    };
    const size = Number(TILE_SIZE) || 48;
    const frame = Number(state?.animFrame) || 0;
    let rendered = 0;

    target.save();
    target.globalCompositeOperation = 'source-over';
    target.lineCap = 'round';
    target.lineJoin = 'round';

    for (const component of components) {
        const shown = component.filter(visible);
        if (!shown.length) continue;
        const minX = Math.min(...shown.map(c => c.x)) * size;
        const minY = Math.min(...shown.map(c => c.y)) * size;
        const maxX = Math.max(...shown.map(c => c.x + 1)) * size;
        const maxY = Math.max(...shown.map(c => c.y + 1)) * size;
        const gradient = target.createLinearGradient(minX, minY, maxX, maxY);
        gradient.addColorStop(0, 'rgba(187,244,255,0.48)');
        gradient.addColorStop(0.46, 'rgba(66,190,235,0.31)');
        gradient.addColorStop(1, 'rgba(35,116,190,0.42)');

        // Película base con solape solamente donde existe una casilla vecina.
        for (const cell of shown) {
            const x = cell.x * size, y = cell.y * size;
            const hasW = cells.has(keyOf(cell.x - 1, cell.y));
            const hasE = cells.has(keyOf(cell.x + 1, cell.y));
            const hasN = cells.has(keyOf(cell.x, cell.y - 1));
            const hasS = cells.has(keyOf(cell.x, cell.y + 1));
            const bleed = Math.max(1.25, size * 0.035);
            target.globalAlpha = cell.alpha;
            target.fillStyle = gradient;
            target.fillRect(x - (hasW ? bleed : 0), y - (hasN ? bleed : 0), size + (hasW ? bleed : 0) + (hasE ? bleed : 0), size + (hasN ? bleed : 0) + (hasS ? bleed : 0));

            // Reflejos suaves y diagonales de hielo; no se dibuja un contorno por tile.
            const r = hash(cell.x, cell.y, 1);
            target.globalAlpha = cell.alpha * (0.14 + 0.08 * Math.sin(frame * 0.08 + r * 6.28));
            target.fillStyle = r > 0.5 ? 'rgba(238,253,255,0.9)' : 'rgba(7,91,151,0.6)';
            target.beginPath();
            if (r > 0.5) {
                target.moveTo(x + size * 0.10, y + size * (0.20 + r * 0.15));
                target.lineTo(x + size * (0.48 + r * 0.18), y + size * 0.07);
                target.lineTo(x + size * 0.38, y + size * 0.42);
            } else {
                target.moveTo(x + size * 0.55, y + size * 0.62);
                target.lineTo(x + size * 0.94, y + size * (0.48 + r * 0.12));
                target.lineTo(x + size * 0.72, y + size * 0.90);
            }
            target.closePath();
            target.fill();

            // Fisuras cristalinas discretas, solo en algunas casillas para evitar ruido.
            if (hash(cell.x, cell.y, 2) > 0.69) {
                const ox = x + size * (0.20 + hash(cell.x, cell.y, 3) * 0.35);
                const oy = y + size * (0.18 + hash(cell.x, cell.y, 4) * 0.36);
                const bend = (hash(cell.x, cell.y, 5) - 0.5) * size * 0.22;
                target.globalAlpha = cell.alpha * 0.48;
                target.strokeStyle = 'rgba(235,251,255,0.95)';
                target.lineWidth = Math.max(0.65, size * 0.014);
                target.beginPath();
                target.moveTo(ox, oy);
                target.lineTo(ox + size * 0.15, oy + bend);
                target.lineTo(ox + size * 0.25, oy + bend - size * 0.07);
                target.moveTo(ox + size * 0.15, oy + bend);
                target.lineTo(ox + size * 0.19, oy + bend + size * 0.11);
                target.stroke();
            }

            // Destello tipo escarcha que respira lentamente mientras el campo existe.
            if (hash(cell.x, cell.y, 6) > 0.62) {
                const cx = x + size * (0.22 + hash(cell.x, cell.y, 7) * 0.56);
                const cy = y + size * (0.22 + hash(cell.x, cell.y, 8) * 0.56);
                const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12 + cell.x * 2.1 + cell.y * 1.7);
                const arm = size * (0.035 + pulse * 0.025);
                target.globalAlpha = cell.alpha * (0.25 + pulse * 0.38);
                target.strokeStyle = '#effcff';
                target.lineWidth = Math.max(0.7, size * 0.016);
                target.beginPath();
                target.moveTo(cx - arm, cy); target.lineTo(cx + arm, cy);
                target.moveTo(cx, cy - arm); target.lineTo(cx, cy + arm);
                target.moveTo(cx - arm * 0.58, cy - arm * 0.58); target.lineTo(cx + arm * 0.58, cy + arm * 0.58);
                target.stroke();
            }
            rendered++;
        }
    }

    target.restore();
    return rendered;
}

function drawExplosionClustersV6308(blastVisuals = []) {
    const visuals = Array.isArray(blastVisuals) ? blastVisuals : [];
    if (!visuals.length) return 0;

    // Un mapa por elemento evita que explosiones de colores distintos se
    // fusionen en una celda o creen gradientes entre paletas incompatibles.
    const mapsByElement = new Map();
    const keyOf = (x, y) => `${x},${y}`;
    for (const visual of visuals) {
        if (!visual || !(Number(visual.ageMs) >= 0) || Number(visual.ageMs) >= 350) continue;
        const age = Math.max(0, Number(visual.ageMs) || 0);
        const expansion = age < 80 ? Math.max(0, Math.min(1, age / 80)) : 1;
        const originX = Math.trunc(Number(visual.originX) || 0);
        const originY = Math.trunc(Number(visual.originY) || 0);
        const sourceCells = Array.isArray(visual.cells) ? visual.cells : [];
        const maxDistance = Math.max(1, Number(visual.maxDistance) || 1);
        const element = getExplosionEffectKeyV6308(String(visual.element || 'fire'));
        let group = mapsByElement.get(element);
        if (!group) {
            group = { element, palette: explosionPaletteV6308(element), cellMap: new Map() };
            mapsByElement.set(element, group);
        }

        for (const raw of sourceCells) {
            const x = Math.trunc(Number(raw?.x)), y = Math.trunc(Number(raw?.y));
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            const distance = element === 'fragment'
                ? Math.max(Math.abs(x - originX), Math.abs(y - originY))
                : Math.abs(x - originX) + Math.abs(y - originY);
            if (age < 80 && distance > maxDistance * expansion + 0.0001) continue;
            const key = keyOf(x, y);
            let cell = group.cellMap.get(key);
            if (!cell) {
                cell = { x, y, alpha: 0, ageMs: Infinity, fragment: false, block: false, origin: false };
                group.cellMap.set(key, cell);
            }
            cell.fragment = cell.fragment || !!raw.fragment;
            cell.block = cell.block || !!raw.block;
            cell.origin = cell.origin || !!raw.origin;
            cell.alpha = Math.max(cell.alpha, age < 80 ? 0.55 + 0.45 * expansion : 1);
            cell.ageMs = Math.min(cell.ageMs, age);
        }
    }
    if (!mapsByElement.size) return 0;

    const groups = [...mapsByElement.values()].sort((a, b) => a.element.localeCompare(b.element));
    const size = TILE_SIZE, frame = Number(gameState.animFrame) || 0;
    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    const keyOfCell = cell => keyOf(cell.x, cell.y);
    let visibleCellCount = 0;

    function softJunction(cell, color, width) {
        const p = center(cell), h = width * 0.49, r = width * 0.16;
        ctx.beginPath();
        ctx.moveTo(p.x - h + r, p.y - h); ctx.lineTo(p.x + h - r, p.y - h);
        ctx.quadraticCurveTo(p.x + h, p.y - h, p.x + h, p.y - h + r); ctx.lineTo(p.x + h, p.y + h - r);
        ctx.quadraticCurveTo(p.x + h, p.y + h, p.x + h - r, p.y + h); ctx.lineTo(p.x - h + r, p.y + h);
        ctx.quadraticCurveTo(p.x - h, p.y + h, p.x - h, p.y + h - r); ctx.lineTo(p.x - h, p.y - h + r);
        ctx.quadraticCurveTo(p.x - h, p.y - h, p.x - h + r, p.y - h); ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
    }

    function taperedTip(cell, neighbor, color, width, extension, seed, scale) {
        const p = center(cell), n = center(neighbor), dx = Math.sign(p.x - n.x), dy = Math.sign(p.y - n.y), px = -dy, py = dx;
        const baseX = p.x - dx * size * 0.10 * scale, baseY = p.y - dy * size * 0.10 * scale, half = width * 0.39;
        const wave = Math.sin(frame * 0.23 + seed) * size * 0.012;
        const tipX = p.x + dx * extension * scale + px * wave, tipY = p.y + dy * extension * scale + py * wave;
        const cx = p.x + dx * extension * scale * 0.52, cy = p.y + dy * extension * scale * 0.52;
        ctx.beginPath();
        ctx.moveTo(baseX + px * half, baseY + py * half);
        ctx.quadraticCurveTo(cx + px * half, cy + py * half, tipX, tipY);
        ctx.quadraticCurveTo(cx - px * half * 0.72, cy - py * half * 0.72, baseX - px * half, baseY - py * half);
        ctx.quadraticCurveTo(baseX - dx * size * 0.02 * scale, baseY - dy * size * 0.02 * scale, baseX + px * half, baseY + py * half);
        ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }

    function drawLayer(component, paths, neighbors, palette, channel, width, extension, scale, licks, outer) {
        const color = palette[channel];
        // Color uniforme dentro de cada grupo elemental: no se crean gradientes
        // desde una celda vecina perteneciente a otro elemento.
        for (const path of paths) {
            for (let i = 1; i < path.points.length; i++) {
                const a = path.points[i - 1], b = path.points[i], pa = center(a), pb = center(b);
                ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
                ctx.strokeStyle = color; ctx.lineWidth = width * scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                if (outer) { ctx.shadowColor = color; ctx.shadowBlur = Math.min(12, size * 0.22); }
                ctx.stroke(); ctx.shadowBlur = 0;
            }
        }
        for (const cell of component) {
            const around = neighbors.get(keyOfCell(cell)) || [];
            let turn = false;
            if (around.length === 2) turn = (around[0].x !== around[1].x && around[0].y !== around[1].y);
            if (around.length >= 3 || turn) softJunction(cell, color, width * scale);
        }
        for (const path of paths) {
            const pts = path.points;
            if (pts.length < 2 || path.closed) continue;
            const first = pts[0], second = pts[1], last = pts[pts.length - 1], before = pts[pts.length - 2];
            if ((neighbors.get(keyOfCell(first)) || []).length === 1) taperedTip(first, second, color, width * scale, extension * scale, first.x * 7 + first.y * 13, 1);
            if ((neighbors.get(keyOfCell(last)) || []).length === 1) taperedTip(last, before, color, width * scale, extension * scale, last.x * 11 + last.y * 5, 1);
            if (!licks) continue;
            for (let i = 1; i < pts.length - 1; i++) {
                const cell = pts[i], around = neighbors.get(keyOfCell(cell)) || [];
                if (around.length !== 2) continue;
                const horizontal = pts[i - 1].y === cell.y && pts[i + 1].y === cell.y;
                const vertical = pts[i - 1].x === cell.x && pts[i + 1].x === cell.x;
                if ((!horizontal && !vertical) || Math.abs(cell.x * 7 + cell.y * 11) % 3 !== 0) continue;
                const p = center(cell), tangent = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }, side = ((cell.x * 5 + cell.y * 3) & 1) ? 1 : -1;
                const nx = -tangent.y * side, ny = tangent.x * side, base = width * scale * 0.37, half = size * 0.065;
                const bx = p.x + nx * base, by = p.y + ny * base, wave = Math.sin(frame * 0.19 + cell.x * 3.1 + cell.y * 8.7) * size * 0.018;
                const tx = bx + nx * (size * 0.17 + wave) + tangent.x * Math.cos(frame * 0.16 + cell.y) * size * 0.04;
                const ty = by + ny * (size * 0.17 + wave) + tangent.y * Math.cos(frame * 0.16 + cell.y) * size * 0.04;
                ctx.beginPath(); ctx.moveTo(bx - tangent.x * half, by - tangent.y * half);
                ctx.quadraticCurveTo(bx + nx * size * 0.07 - tangent.x * half * 0.4, by + ny * size * 0.07 - tangent.y * half * 0.4, tx, ty);
                ctx.quadraticCurveTo(bx + nx * size * 0.12 + tangent.x * half * 0.4, by + ny * size * 0.12 + tangent.y * half * 0.4, bx + tangent.x * half, by + tangent.y * half);
                ctx.closePath(); ctx.fillStyle = color; ctx.fill();
            }
        }
        if (component.length === 1) {
            const cell = component[0];
            softJunction(cell, color, width * scale * 0.86);
            for (let i = 0; i < 4; i++) {
                const neighbor = [
                    { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 },
                    { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y }
                ][i];
                taperedTip(cell, neighbor, color, width * scale * 0.68, extension * scale * 0.72, cell.x * 9 + cell.y * 7 + i, 1);
            }
        }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const group of groups) {
        const allowDiagonals = group.element === 'fragment';
        const { components } = { components: explosionComponentsV6308(group.cellMap, allowDiagonals) };
        if (!components.length) continue;
        visibleCellCount += components.reduce((sum, component) => sum + component.length, 0);
        for (const component of components) {
            const { paths, neighbors } = explosionGraphPathsV6308(component, allowDiagonals);
            const age = component.reduce((sum, cell) => sum + (Number.isFinite(cell.ageMs) ? cell.ageMs : 0), 0) / component.length;
            const visibility = component.reduce((sum, cell) => sum + cell.alpha, 0) / component.length;
            const ease = age < 80 ? Math.max(0, Math.min(1, age / 80)) : 1;
            const scale = age < 80 ? 0.70 + 0.30 * ease : age < 250 ? 1 + Math.sin(frame * 0.9 + component[0].x) * 0.012 : 1 - 0.18 * Math.max(0, Math.min(1, (age - 250) / 100));
            const fadeCore = age < 250 ? 1 : Math.max(0, 1 - (age - 250) / 30);
            const fadeMiddle = age < 265 ? 1 : Math.max(0, 1 - (age - 265) / 50);
            const fadeOuter = age < 270 ? 1 : Math.max(0, 1 - (age - 270) / 80);
            const expansionLicks = age >= 80 && age < 250;
            ctx.globalAlpha = visibility * fadeOuter;
            drawLayer(component, paths, neighbors, group.palette, 'outer', size * 0.82, size * 0.14, scale, expansionLicks, true);
            ctx.globalAlpha = visibility * fadeMiddle;
            drawLayer(component, paths, neighbors, group.palette, 'middle', size * 0.57, size * 0.115, scale, expansionLicks, false);
            ctx.globalAlpha = visibility * fadeCore;
            drawLayer(component, paths, neighbors, group.palette, 'core', size * 0.285, size * 0.075, scale, expansionLicks, false);
        }
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    return visibleCellCount;
}

// v6.32.2 hotfix: los campos SHOCK seguían aplicando daño, pero no se dibujaban
// después de los 350 ms de la explosión inicial. Esta capa es puramente visual:
// usa las mismas casillas lógicas del campo existente y no modifica daño/colisiones.
function drawBombEffectFieldsV6323(fields = []) {
    if (!Array.isArray(fields) || !fields.length || typeof ctx === 'undefined' || typeof TILE_SIZE !== 'number') return 0;

    const size = TILE_SIZE;
    const frame = Number(gameState?.animFrame) || 0;
    const groups = new Map();
    const keyOf = (x, y) => `${x},${y}`;

    for (const field of fields) {
        // Solo campos eléctricos creados por bombas. No dibujar estados de entidades
        // ni campos ambientales y no cambiar el comportamiento de otros elementos.
        if (!field || field.effectId !== 'shock' || field.sourceBombId == null) continue;
        const x = Number(field.x), y = Number(field.y), remaining = Number(field.remainingMs);
        if (!Number.isInteger(x) || !Number.isInteger(y) || !(remaining > 0)) continue;
        if (typeof isWorldTileVisibleV329 === 'function' && !isWorldTileVisibleV329(x, y, 1)) continue;

        const sourceId = String(field.sourceBombId);
        let group = groups.get(sourceId);
        if (!group) {
            group = { cellMap: new Map(), remainingMs: remaining, totalMs: Number(field.visualTotalMs) || remaining };
            groups.set(sourceId, group);
        }
        group.remainingMs = Math.max(group.remainingMs, remaining);
        group.totalMs = Math.max(group.totalMs, Number(field.visualTotalMs) || remaining);
        const key = keyOf(x, y);
        const existing = group.cellMap.get(key);
        const cell = {
            x, y,
            alpha: Math.max(0.2, Math.min(1, remaining / Math.max(1, Number(field.visualTotalMs) || remaining))),
            ageMs: Math.max(0, Number(field.visualAgeMs) || 0)
        };
        if (!existing || cell.alpha > existing.alpha) group.cellMap.set(key, cell);
    }
    if (!groups.size) return 0;

    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    const cellKey = cell => keyOf(cell.x, cell.y);
    let drawnCells = 0;

    function lightningPoints(a, b) {
        const p = center(a), q = center(b);
        const dx = (q.x - p.x) / size, dy = (q.y - p.y) / size;
        const nx = -dy, ny = dx;
        const phase = frame * 0.61 + a.x * 9.17 + a.y * 14.3 + b.x * 5.23 + b.y * 3.97;
        const offsets = [
            Math.sin(phase) * size * 0.13,
            Math.sin(phase * 1.37 + 2.2) * size * 0.18,
            Math.sin(phase * 1.91 + 1.1) * size * 0.10
        ];
        return [p,
            { x: p.x + (q.x - p.x) * 0.28 + nx * offsets[0], y: p.y + (q.y - p.y) * 0.28 + ny * offsets[0] },
            { x: p.x + (q.x - p.x) * 0.56 + nx * offsets[1], y: p.y + (q.y - p.y) * 0.56 + ny * offsets[1] },
            { x: p.x + (q.x - p.x) * 0.79 + nx * offsets[2], y: p.y + (q.y - p.y) * 0.79 + ny * offsets[2] },
            q
        ];
    }

    const layers = [
        { color: '#1d4ed8', width: size * 0.22, opacity: 0.52, glow: size * 0.30 },
        { color: '#22d3ee', width: size * 0.105, opacity: 0.92, glow: size * 0.13 },
        { color: '#f0fdff', width: size * 0.038, opacity: 0.96, glow: size * 0.045 }
    ];

    function strokeBolt(points, alpha) {
        for (const layer of layers) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = Math.max(1, layer.width);
            ctx.globalAlpha = alpha * layer.opacity;
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = Math.min(18, layer.glow);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    // Traza una rama continua por ruta: tres pasadas por ruta, no tres por cada
    // casilla. Evita que el brillo eléctrico degrade el rendimiento en móviles.
    function strokeLightningRoute(path, alpha) {
        if (!path || path.points.length < 2) return;
        for (const layer of layers) {
            ctx.beginPath();
            const start = center(path.points[0]);
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < path.points.length; i++) {
                const points = lightningPoints(path.points[i - 1], path.points[i]);
                for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
            }
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = Math.max(1, layer.width);
            ctx.globalAlpha = alpha * layer.opacity;
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = Math.min(18, layer.glow);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let totalBranchCount = 0;
    for (const group of groups.values()) {
        const allowDiagonals = false;
        const components = explosionComponentsV6308(group.cellMap, allowDiagonals);
        for (const component of components) {
            if (!component.length) continue;
            drawnCells += component.length;
            const { paths, neighbors } = explosionGraphPathsV6308(component, allowDiagonals);
            const remainingRatio = Math.max(0, Math.min(1, group.remainingMs / Math.max(1, group.totalMs)));
            // El campo permanece legible mientras daña; solo se desvanece al final.
            const fadeOut = Math.min(1, group.remainingMs / 300);
            const pulse = 0.73 + 0.20 * Math.sin(frame * 0.47 + component[0].x * 2.1 + component[0].y * 3.7);
            const alpha = Math.max(0, Math.min(1, (0.70 + remainingRatio * 0.18) * pulse * fadeOut));
            for (const path of paths) strokeLightningRoute(path, alpha);

            // Descargas cortas en una selección limitada de nodos para mantener
            // un coste acotado cuando coinciden varias explosiones.
            for (const cell of component) {
                if (totalBranchCount >= 48) break;
                const around = neighbors.get(cellKey(cell)) || [];
                const seed = Math.abs(cell.x * 13 + cell.y * 7);
                if ((around.length < 2 && seed % 2 !== 0) || seed % 3 !== 0) continue;
                totalBranchCount++;
                const side = seed % 4;
                const dirs = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
                const dir = dirs[side];
                const p = center(cell);
                const phase = frame * 0.7 + cell.x * 4.3 + cell.y * 6.1;
                const end = { x: p.x + dir.x * size * (0.22 + 0.05 * Math.sin(phase)), y: p.y + dir.y * size * (0.22 + 0.05 * Math.sin(phase)) };
                const bend = { x: (p.x + end.x) / 2 + (dir.y ? Math.sin(phase) : 0) * size * 0.10, y: (p.y + end.y) / 2 + (dir.x ? Math.sin(phase) : 0) * size * 0.10 };
                strokeBolt([p, bend, end], alpha * 0.74);
            }
        }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    return drawnCells;
}

// v6.32.5: llamas orgánicas persistentes para los campos HEAT de BOMB_FIRE.
// Es una capa visual sobre las mismas celdas del sistema de efectos: no crea
// campos, no cambia duración/daño y no modifica hitboxes.
function drawPersistentFireFieldsV6324(fields = []) {
    if (!Array.isArray(fields) || !fields.length || typeof ctx === 'undefined' || typeof TILE_SIZE !== 'number') return 0;

    const size = TILE_SIZE;
    const frame = Number(gameState?.animFrame) || 0;
    const groups = new Map();
    const keyOf = (x, y) => `${x},${y}`;

    for (const field of fields) {
        // HEAT de bombas únicamente: no dibujar calor ambiental ni estados aislados.
        if (!field || field.effectId !== 'heat' || field.sourceBombId == null) continue;
        const x = Number(field.x), y = Number(field.y), remaining = Number(field.remainingMs);
        if (!Number.isInteger(x) || !Number.isInteger(y) || !(remaining > 0)) continue;
        if (typeof isWorldTileVisibleV329 === 'function' && !isWorldTileVisibleV329(x, y, 1)) continue;

        const sourceId = String(field.sourceBombId);
        let group = groups.get(sourceId);
        if (!group) {
            group = { cellMap: new Map(), remainingMs: remaining, totalMs: Number(field.visualTotalMs) || remaining };
            groups.set(sourceId, group);
        }
        group.remainingMs = Math.max(group.remainingMs, remaining);
        group.totalMs = Math.max(group.totalMs, Number(field.visualTotalMs) || remaining);
        const key = keyOf(x, y);
        const cell = {
            x, y,
            alpha: Math.max(0.25, Math.min(1, remaining / Math.max(1, Number(field.visualTotalMs) || remaining))),
            ageMs: Math.max(0, Number(field.visualAgeMs) || 0)
        };
        const previous = group.cellMap.get(key);
        if (!previous || cell.alpha > previous.alpha) group.cellMap.set(key, cell);
    }
    if (!groups.size) return 0;

    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    let drawnCells = 0;
    let tongueBudget = 72;

    // El campo se construye con manchas orgánicas y llamas independientes.
    // No se dibujan trazos largos entre centros de casillas: eso parecía un láser.
    function drawFireBed(cell, alpha, phase, orientation = 'horizontal') {
        const p = center(cell);
        const wobble = Math.sin(phase) * size * 0.035;
        const stretch = 1 + Math.sin(phase * 0.63) * 0.045;
        const vertical = orientation === 'vertical';

        ctx.save();
        // La mancha redondeada gira siguiendo el eje de la conexión. En filas
        // horizontales conserva la geometría aprobada; en columnas se rota 90°
        // para que su eje largo acompañe al puente vertical y no lo cruce de lado.
        ctx.translate(p.x, p.y);
        if (vertical) ctx.rotate(Math.PI / 2);
        ctx.translate(0, size * 0.14);
        ctx.rotate(Math.sin(phase * 0.47) * 0.10);
        ctx.scale(stretch, 1);

        // Capa oscura irregular, pegada al suelo y solapada con las celdas vecinas.
        ctx.globalAlpha = alpha * 0.52;
        ctx.fillStyle = '#9a3412';
        ctx.shadowColor = '#c2410c';
        ctx.shadowBlur = Math.min(10, size * 0.19);
        ctx.beginPath();
        ctx.moveTo(-size * 0.49, size * 0.015);
        ctx.bezierCurveTo(-size * 0.57, -size * 0.10, -size * 0.35, -size * 0.26, -size * 0.20, -size * (0.19 + wobble / size));
        ctx.bezierCurveTo(-size * 0.08, -size * 0.31, size * 0.025, -size * 0.20, size * 0.15, -size * 0.22);
        ctx.bezierCurveTo(size * 0.32, -size * 0.31, size * 0.55, -size * 0.13, size * 0.48, size * 0.015);
        ctx.bezierCurveTo(size * 0.39, size * 0.15, size * 0.17, size * 0.19, size * 0.015, size * 0.13);
        ctx.bezierCurveTo(-size * 0.18, size * 0.20, -size * 0.40, size * 0.15, -size * 0.49, size * 0.015);
        ctx.closePath();
        ctx.fill();

        // Centro naranja irregular: evita una línea homogénea a lo largo del alcance.
        ctx.globalAlpha = alpha * (0.33 + 0.06 * Math.sin(phase * 1.17));
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#fb923c';
        ctx.shadowBlur = Math.min(8, size * 0.14);
        ctx.beginPath();
        ctx.moveTo(-size * 0.36, size * 0.025);
        ctx.bezierCurveTo(-size * 0.34, -size * 0.11, -size * 0.12, -size * 0.18, size * 0.015, -size * 0.12);
        ctx.bezierCurveTo(size * 0.15, -size * 0.20, size * 0.39, -size * 0.08, size * 0.36, size * 0.035);
        ctx.bezierCurveTo(size * 0.22, size * 0.12, -size * 0.18, size * 0.13, -size * 0.36, size * 0.025);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // La unión usa la misma silueta orgánica en ambos sentidos. En vertical se
    // rota y se estira solo a lo largo del eje de conexión para cubrir el hueco
    // entre los centros de las casillas; no se construye un tubo vertical aparte.
    function drawFireBridge(cell, neighbor, alpha, phase) {
        const a = center(cell);
        const b = center(neighbor);
        const horizontal = cell.y === neighbor.y;
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        const wobble = Math.sin(phase * 1.37) * size * 0.025;

        ctx.save();
        if (horizontal) {
            // Geometría horizontal original: no alterar el aspecto ya aprobado.
            ctx.translate(midX, midY + size * 0.13);
        } else {
            // Misma lengua rotada 90°. El factor 1.55 da solape con las dos
            // casillas y la centra en el corredor, evitando el hueco vertical.
            ctx.translate(midX, midY);
            ctx.rotate(Math.PI / 2);
            ctx.scale(1.55, 1);
        }

        ctx.globalAlpha = alpha * (0.82 + 0.08 * Math.sin(phase * 1.61));
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = Math.min(8, size * 0.15);
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.moveTo(-size * 0.37, size * 0.015);
        ctx.bezierCurveTo(-size * 0.43, -size * 0.11, -size * 0.28, -size * (0.22 + wobble / size), -size * 0.16, -size * 0.105);
        ctx.bezierCurveTo(-size * 0.075, -size * 0.21, size * 0.015, -size * 0.17, size * 0.075, -size * 0.09);
        ctx.bezierCurveTo(size * 0.20, -size * 0.22, size * 0.39, -size * 0.12, size * 0.36, size * 0.025);
        ctx.bezierCurveTo(size * 0.28, size * 0.16, size * 0.12, size * 0.18, size * 0.015, size * 0.115);
        ctx.bezierCurveTo(-size * 0.12, size * 0.19, -size * 0.31, size * 0.13, -size * 0.37, size * 0.015);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha *= 0.82;
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#fb923c';
        ctx.shadowBlur = Math.min(6, size * 0.11);
        ctx.beginPath();
        ctx.moveTo(-size * 0.26, size * 0.015);
        ctx.bezierCurveTo(-size * 0.28, -size * 0.09, -size * 0.12, -size * (0.15 + wobble / size), -size * 0.035, -size * 0.065);
        ctx.bezierCurveTo(size * 0.07, -size * 0.16, size * 0.23, -size * 0.085, size * 0.25, size * 0.02);
        ctx.bezierCurveTo(size * 0.17, size * 0.105, -size * 0.14, size * 0.12, -size * 0.26, size * 0.015);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawFlameTongue(cell, alpha, phase, lane) {
        const p = center(cell);
        const laneOffset = lane * size * 0.205;
        const oscillation = Math.sin(phase * 1.31 + lane * 2.4);
        const width = size * (0.115 + 0.025 * (0.5 + Math.sin(phase * 0.91 + lane)));
        const height = size * (0.30 + 0.18 * (0.5 + Math.sin(phase * 0.73 + lane * 1.8)));
        const lean = Math.sin(phase * 0.67 + lane * 2.9) * size * 0.10;
        const baseY = p.y + size * (0.20 + 0.015 * oscillation);
        const baseX = p.x + laneOffset;
        const tipX = lean;

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha * (0.76 + 0.16 * Math.sin(phase * 1.7))));
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = Math.min(10, size * 0.19);

        // Silueta exterior roja: base ancha, cuerpo curvado y punta afilada.
        ctx.fillStyle = lane === 1 ? '#c2410c' : '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-width * 0.58, 0);
        ctx.bezierCurveTo(-width * 0.92, -height * 0.12, tipX - width * 0.55, -height * 0.25, tipX - width * 0.21, -height * 0.52);
        ctx.bezierCurveTo(tipX - width * 0.12, -height * 0.66, tipX - width * 0.02, -height * 0.88, tipX + width * 0.10, -height);
        ctx.bezierCurveTo(tipX + width * 0.48, -height * 0.75, tipX + width * 0.31, -height * 0.52, tipX + width * 0.62, -height * 0.32);
        ctx.bezierCurveTo(width * 0.92, -height * 0.15, width * 0.74, -height * 0.035, width * 0.55, 0);
        ctx.quadraticCurveTo(0, size * 0.045, -width * 0.58, 0);
        ctx.closePath();
        ctx.fill();

        // Lengua interior naranja: desplazada respecto de la silueta para dar profundidad.
        ctx.globalAlpha *= 0.91;
        ctx.fillStyle = '#fb923c';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = Math.min(7, size * 0.12);
        ctx.beginPath();
        ctx.moveTo(-width * 0.34, -size * 0.008);
        ctx.bezierCurveTo(-width * 0.45, -height * 0.18, tipX - width * 0.22, -height * 0.30, tipX - width * 0.04, -height * 0.56);
        ctx.bezierCurveTo(tipX + width * 0.02, -height * 0.69, tipX + width * 0.07, -height * 0.78, tipX + width * 0.15, -height * 0.83);
        ctx.bezierCurveTo(tipX + width * 0.38, -height * 0.61, tipX + width * 0.19, -height * 0.43, width * 0.38, -height * 0.27);
        ctx.bezierCurveTo(width * 0.50, -height * 0.13, width * 0.38, -size * 0.015, width * 0.28, 0);
        ctx.quadraticCurveTo(0, size * 0.02, -width * 0.34, -size * 0.008);
        ctx.closePath();
        ctx.fill();

        // Núcleo amarillo pequeño; no cubre toda la llama ni forma un trazo recto.
        ctx.globalAlpha *= 0.84;
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = Math.min(4, size * 0.07);
        ctx.beginPath();
        ctx.moveTo(-width * 0.12, -size * 0.01);
        ctx.bezierCurveTo(-width * 0.20, -height * 0.18, tipX + width * 0.01, -height * 0.34, tipX + width * 0.12, -height * 0.58);
        ctx.bezierCurveTo(tipX + width * 0.23, -height * 0.43, width * 0.20, -height * 0.20, width * 0.15, -size * 0.005);
        ctx.quadraticCurveTo(0, size * 0.008, -width * 0.12, -size * 0.01);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    // El fuego usa composición normal: la adición luminosa excesiva producía aspecto de láser.
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const group of groups.values()) {
        const components = explosionComponentsV6308(group.cellMap);
        for (const component of components) {
            if (!component.length) continue;
            drawnCells += component.length;
            const remainingRatio = Math.max(0, Math.min(1, group.remainingMs / Math.max(1, group.totalMs)));
            const fadeOut = Math.max(0, Math.min(1, group.remainingMs / 360));
            const pulse = 0.86 + 0.10 * Math.sin(frame * 0.39 + component[0].x * 1.7 + component[0].y * 2.9);
            const alpha = Math.max(0, Math.min(1, (0.68 + remainingRatio * 0.16) * pulse * fadeOut));

            // Conectar las casillas adyacentes antes de dibujar las lenguas individuales.
            // Solo se dibujan los vecinos derecha/abajo para evitar uniones duplicadas.
            const componentKeys = new Set(component.map(cell => keyOf(cell.x, cell.y)));
            for (const cell of component) {
                const rightKey = keyOf(cell.x + 1, cell.y);
                const downKey = keyOf(cell.x, cell.y + 1);
                const phase = frame * 0.29 + cell.x * 3.9 + cell.y * 5.3;
                if (componentKeys.has(rightKey)) {
                    drawFireBridge(cell, { x: cell.x + 1, y: cell.y }, alpha, phase);
                }
                if (componentKeys.has(downKey)) {
                    drawFireBridge(cell, { x: cell.x, y: cell.y + 1 }, alpha, phase + 1.1);
                }
            }

            // Primera pasada: masa baja e irregular sobre las casillas afectadas.
            // La orientación sigue a las conexiones locales: las filas mantienen
            // el diseño horizontal; las columnas giran 90°. En codos/uniones se
            // superponen ambas orientaciones con menos opacidad para cerrar el nudo.
            for (const cell of component) {
                const phase = frame * 0.41 + cell.x * 4.7 + cell.y * 7.1;
                const hasLeft = componentKeys.has(keyOf(cell.x - 1, cell.y));
                const hasRight = componentKeys.has(keyOf(cell.x + 1, cell.y));
                const hasUp = componentKeys.has(keyOf(cell.x, cell.y - 1));
                const hasDown = componentKeys.has(keyOf(cell.x, cell.y + 1));
                const horizontal = hasLeft || hasRight;
                const vertical = hasUp || hasDown;
                const bedAlpha = alpha * (0.90 + 0.10 * Math.sin(phase));

                if (vertical && horizontal) {
                    drawFireBed(cell, bedAlpha * 0.68, phase, 'horizontal');
                    drawFireBed(cell, bedAlpha * 0.68, phase + 0.37, 'vertical');
                } else {
                    drawFireBed(cell, bedAlpha, phase, vertical ? 'vertical' : 'horizontal');
                }
            }

            // Segunda pasada: puntas de fuego separadas y curvas, en lugar de un tubo continuo.
            for (const cell of component) {
                if (tongueBudget <= 0) break;
                const seed = Math.abs(cell.x * 13 + cell.y * 7);
                const phase = frame * 0.34 + seed * 0.83;
                // Cada casilla aporta dos o tres lenguas; alternar su número evita un patrón regular.
                const count = seed % 3 === 0 ? 3 : 2;
                const lanes = count === 3 ? [-1, 0, 1] : (seed % 2 === 0 ? [-0.72, 0.55] : [-0.45, 0.78]);
                for (let i = 0; i < lanes.length; i++) {
                    if (tongueBudget <= 0) break;
                    drawFlameTongue(cell, alpha * (0.87 + 0.13 * Math.sin(phase + i)), phase + i * 1.73, lanes[i]);
                    tongueBudget--;
                }
            }
        }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    return drawnCells;
}

// v6.33.0: campos persistentes para las nuevas bombas tóxica y gravitatoria.
// Esta capa solo representa campos ya creados por 38-bomb-effects.js; no decide
// alcance, duración, daño ni desplazamiento. Las llamas existentes quedan intactas.
function drawAdvancedBombFieldsV6330(fields = []) {
    const target = typeof ctx !== 'undefined' ? ctx : null;
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState || null;
    if (!target || !state || !Array.isArray(fields) || !fields.length || typeof TILE_SIZE !== 'number') return 0;
    const frame = Number(state.animFrame) || 0, size = TILE_SIZE, groups = new Map();
    for (const field of fields) {
        const effectId = String(field?.effectId || '');
        if (!field || !['toxin','gravity'].includes(effectId) || field.sourceBombId == null) continue;
        const x = Math.trunc(Number(field.x)), y = Math.trunc(Number(field.y)), remaining = Number(field.remainingMs) || 0;
        if (!Number.isInteger(x) || !Number.isInteger(y) || remaining <= 0) continue;
        const tile = state.grid?.[y]?.[x];
        if (typeof TYPES !== 'undefined' && (tile === TYPES.WALL || tile === TYPES.BLOCK)) continue;
        if (typeof isWorldTileVisibleV329 === 'function' && !isWorldTileVisibleV329(x, y, 1)) continue;
        const groupKey = `${effectId}:${field.sourceBombId}`;
        let group = groups.get(groupKey);
        if (!group) group = { effectId, originX:Number.isFinite(Number(field.originX)) ? Number(field.originX) : x, originY:Number.isFinite(Number(field.originY)) ? Number(field.originY) : y, cells:new Map() };
        groups.set(groupKey, group);
        const key = `${x},${y}`, total = Math.max(1, Number(field.visualTotalMs) || remaining);
        const life = Math.max(0, Math.min(1, remaining / total)), fade = life < 0.24 ? life / 0.24 : 1;
        const previous = group.cells.get(key);
        if (!previous || remaining > previous.remaining) group.cells.set(key, { x, y, remaining, alpha:fade * (0.85 + 0.15 * life) });
    }
    if (!groups.size) return 0;
    const hash = (x,y,salt=0) => { const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453; return n - Math.floor(n); };
    let drawn = 0;
    target.save(); target.globalCompositeOperation = 'source-over'; target.lineCap = 'round'; target.lineJoin = 'round';
    for (const group of groups.values()) for (const cell of group.cells.values()) {
        const px = (cell.x + 0.5) * size, py = (cell.y + 0.5) * size;
        const pulse = 0.88 + 0.12 * Math.sin(frame * 0.13 + cell.x * 1.7 + cell.y * 2.3), alpha = Math.max(0, Math.min(1, cell.alpha * pulse));
        if (group.effectId === 'toxin') {
            target.globalAlpha = alpha * 0.34; target.fillStyle = '#166534';
            target.beginPath(); target.ellipse(px, py + size * 0.05, size * (0.46 + pulse * 0.04), size * 0.31, Math.sin(frame * 0.035 + cell.x) * 0.12, 0, Math.PI * 2); target.fill();
            target.globalAlpha = alpha * 0.32; target.fillStyle = '#65a30d';
            for (let puff = 0; puff < 3; puff++) {
                const phase = frame * 0.045 + cell.x * 2.3 + cell.y * 1.9 + puff * 2.1;
                const bx = px + Math.sin(phase) * size * 0.17, by = py - size * 0.05 + Math.cos(phase * 0.83) * size * 0.12;
                target.beginPath(); target.ellipse(bx, by, size * (0.14 + hash(cell.x,cell.y,puff) * 0.055), size * 0.12, phase * 0.2, 0, Math.PI * 2); target.fill();
            }
            target.globalAlpha = alpha * 0.72; target.strokeStyle = '#d9f99d'; target.lineWidth = Math.max(0.8, size * 0.018);
            const bubblePhase = frame * 0.06 + cell.x * 3.2 + cell.y * 7.1;
            target.beginPath(); target.arc(px + Math.sin(bubblePhase) * size * 0.19, py - size * (0.12 + 0.05 * Math.sin(bubblePhase)), size * 0.035, 0, Math.PI * 2); target.stroke();
        } else {
            target.globalAlpha = alpha * 0.24; target.fillStyle = '#6b21a8';
            target.beginPath(); target.ellipse(px, py, size * 0.44, size * 0.30, frame * 0.018, 0, Math.PI * 2); target.fill();
            target.globalAlpha = alpha * 0.82; target.strokeStyle = '#c084fc'; target.lineWidth = Math.max(1, size * 0.025);
            for (let arc = 0; arc < 2; arc++) { const rotation = -frame * 0.035 + arc * Math.PI; target.beginPath(); target.arc(px, py, size * (0.15 + arc * 0.095), rotation, rotation + Math.PI * 1.25); target.stroke(); }
            target.globalAlpha = alpha * 0.88; target.fillStyle = '#f5d0fe';
            const angle = Math.atan2(group.originY - cell.y, group.originX - cell.x), ax = px + Math.cos(angle) * size * 0.21, ay = py + Math.sin(angle) * size * 0.21;
            target.save(); target.translate(ax, ay); target.rotate(angle); target.beginPath(); target.moveTo(size * 0.09, 0); target.lineTo(-size * 0.035, -size * 0.055); target.lineTo(-size * 0.015, 0); target.lineTo(-size * 0.035, size * 0.055); target.closePath(); target.fill(); target.restore();
        }
        drawn++;
    }
    target.restore(); target.globalAlpha = 1; target.shadowBlur = 0; target.globalCompositeOperation = 'source-over';
    return drawn;
}

window.registerBombBlastVisualV6308 = registerBombBlastVisualV6308;
window.updateBombBlastVisualsV6308 = updateBombBlastVisualsV6308;
window.resetBombBlastVisualsV6308 = resetBombBlastVisualsV6308;
window.drawElementalResiduesV6308 = drawElementalResiduesV6308;
window.drawBombEffectFieldsV6323 = drawBombEffectFieldsV6323;
window.drawPersistentFireFieldsV6324 = drawPersistentFireFieldsV6324;
window.drawAdvancedBombFieldsV6330 = drawAdvancedBombFieldsV6330;

;
// === js/07-render.js ===
// Bomberman Roguelike v6.31.5 — Canvas renderer coordinador.
// Tiles y explosiones viven en archivos específicos cargados antes de este.

const renderCacheV317 = {
    canvas: null,
    width: 0,
    height: 0,
    grid: null,
    gridRevision: -1,
    builds: 0,
    lastBuildMs: 0
};

function invalidateRenderCacheV317() {
    renderCacheV317.grid = null;
    renderCacheV317.gridRevision = -1;
    if (typeof invalidateRenderTileCacheV621 === 'function') invalidateRenderTileCacheV621();
}

function buildTerrainCacheV317() {
    const width = Math.max(1, gameState.gridWidth * TILE_SIZE);
    const height = Math.max(1, gameState.gridHeight * TILE_SIZE);
    if (!renderCacheV317.canvas) renderCacheV317.canvas = document.createElement('canvas');
    if (renderCacheV317.width !== width || renderCacheV317.height !== height) {
        renderCacheV317.canvas.width = width;
        renderCacheV317.canvas.height = height;
        renderCacheV317.width = width;
        renderCacheV317.height = height;
    }

    const cacheCtx = renderCacheV317.canvas.getContext('2d', { alpha: false });
    cacheCtx.clearRect(0, 0, width, height);
    const start = performance.now();

    for (let y = 0; y < gameState.gridHeight; y++) {
        const row = gameState.grid[y];
        if (!row) continue;
        for (let x = 0; x < gameState.gridWidth; x++) {
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const isAlt = (x + y) % 2 === 0;

            cacheCtx.fillStyle = isAlt ? (typeof themeColorV46 === 'function' ? themeColorV46('floorA') : '#0f172a') : (typeof themeColorV46 === 'function' ? themeColorV46('floorB') : '#1e293b');
            cacheCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            cacheCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('floorHighlight') : 'rgba(255, 255, 255, 0.03)';
            cacheCtx.fillRect(px, py, TILE_SIZE, 2);
            cacheCtx.fillRect(px, py, 2, TILE_SIZE);
            cacheCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('floorShadow') : 'rgba(0, 0, 0, 0.2)';
            cacheCtx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
            cacheCtx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);

            const tile = row[x];
            if (typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(x, y)) drawBiomeLiquidTileV630(px, py, x, y, cacheCtx);
            if (tile === TYPES.WALL) drawCachedBiomeTileV621(cacheCtx, 'wall', x, y);
            else if (tile === TYPES.BLOCK) drawCachedBiomeTileV621(cacheCtx, 'block', x, y);
        }
    }

    renderCacheV317.grid = gameState.grid;
    renderCacheV317.gridRevision = gameState.gridRevision || 0;
    renderCacheV317.builds++;
    renderCacheV317.lastBuildMs = performance.now() - start;
}

function ensureTerrainCacheV317() {
    const revision = gameState.gridRevision || 0;
    if (
        renderCacheV317.grid !== gameState.grid ||
        renderCacheV317.gridRevision !== revision ||
        renderCacheV317.width !== gameState.gridWidth * TILE_SIZE ||
        renderCacheV317.height !== gameState.gridHeight * TILE_SIZE
    ) {
        buildTerrainCacheV317();
    }
    return renderCacheV317.canvas;
}

window.BOMBER_ENGINE = window.BOMBER_ENGINE || {};
window.BOMBER_ENGINE.getRenderStats = () => ({
    themeId: typeof getThemeV46 === 'function' ? getThemeV46().id : 'legacy',
    themeSprites: typeof themeSpriteV46 === 'function' ? { floor: themeSpriteV46('floor'), wall: themeSpriteV46('wall'), brick: themeSpriteV46('brick'), bomb: themeSpriteV46('bomb'), fire: themeSpriteV46('fire'), player: themeSpriteV46('player'), enemy: themeSpriteV46('enemy'), powerup: themeSpriteV46('powerup'), exit: themeSpriteV46('exit'), boss: themeSpriteV46('boss') } : {},
    terrainCacheBuilds: renderCacheV317.builds,
    terrainCacheLastBuildMs: renderCacheV317.lastBuildMs,
    terrainTileCacheEntries: renderTileCacheV621.size,
    terrainCacheReady: !!renderCacheV317.canvas && renderCacheV317.grid === gameState.grid && renderCacheV317.gridRevision === (gameState.gridRevision || 0),
    visible: { ...renderStatsV329 }
});

const renderViewportV329 = { left: 0, top: 0, right: 0, bottom: 0, frame: -1 };
const renderStatsV329 = { items: 0, bombs: 0, explosions: 0, enemies: 0, particles: 0, floaters: 0 };

function updateRenderViewportV329(){
    renderViewportV329.left = Number(gameState.camera?.x) || 0;
    renderViewportV329.top = Number(gameState.camera?.y) || 0;
    renderViewportV329.right = renderViewportV329.left + canvas.width;
    renderViewportV329.bottom = renderViewportV329.top + canvas.height;
    renderViewportV329.frame = Number(gameState.animFrame || 0);
    renderStatsV329.items = 0;
    renderStatsV329.bombs = 0;
    renderStatsV329.explosions = 0;
    renderStatsV329.enemies = 0;
    renderStatsV329.particles = 0;
    renderStatsV329.floaters = 0;
}

function isWorldRectVisibleV329(x, y, width, height, margin = TILE_SIZE){
    const left = renderViewportV329.frame >= 0 ? renderViewportV329.left : (Number(gameState.camera?.x) || 0);
    const top = renderViewportV329.frame >= 0 ? renderViewportV329.top : (Number(gameState.camera?.y) || 0);
    const right = renderViewportV329.frame >= 0 ? renderViewportV329.right : left + canvas.width;
    const bottom = renderViewportV329.frame >= 0 ? renderViewportV329.bottom : top + canvas.height;
    return x + width >= left - margin && x <= right + margin && y + height >= top - margin && y <= bottom + margin;
}

function isWorldTileVisibleV329(tileX, tileY, margin = 1){
    return isWorldRectVisibleV329(tileX*TILE_SIZE, tileY*TILE_SIZE, TILE_SIZE, TILE_SIZE, margin*TILE_SIZE);
}

// v6.30.9: la animación estética es un estado visual independiente de gameState.explosions,
// que conserva su duración original para daño, hitboxes y combate.


// Helper compartido: el caché del terreno lo invoca desde buildTerrainCacheV317().
        function drawBiomeLiquidTileV630(x, y, gx, gy, targetCtx = ctx) {
            const liquid = typeof getLiquidKindV630 === 'function' ? getLiquidKindV630() : null;
            if (!liquid) return;
            const north = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx, gy - 1);
            const south = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx, gy + 1);
            const west = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx - 1, gy);
            const east = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx + 1, gy);

            targetCtx.fillStyle = liquid.edge;
            targetCtx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            targetCtx.fillStyle = liquid.color;
            targetCtx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);

            // Bordes redondeados entre celdas para que la mancha se lea como una sola masa.
            const r = Math.max(5, TILE_SIZE * 0.18);
            targetCtx.fillStyle = liquid.color;
            if (north) targetCtx.fillRect(x + r, y, TILE_SIZE - r * 2, r + 2);
            if (south) targetCtx.fillRect(x + r, y + TILE_SIZE - r - 2, TILE_SIZE - r * 2, r + 2);
            if (west) targetCtx.fillRect(x, y + r, r + 2, TILE_SIZE - r * 2);
            if (east) targetCtx.fillRect(x + TILE_SIZE - r - 2, y + r, r + 2, TILE_SIZE - r * 2);

            // Brillo irregular, fijo por coordenada para que no "tiemble" en el cache.
            const mark = Math.abs((gx * 37 + gy * 53 + Number(gameState.level || 1) * 17) % 4);
            targetCtx.fillStyle = liquid.hi;
            targetCtx.globalAlpha = 0.34;
            if (liquid.shimmer) {
                if (mark === 0 || mark === 2) {
                    targetCtx.fillRect(x + TILE_SIZE * 0.18, y + TILE_SIZE * 0.30, TILE_SIZE * 0.28, 2);
                    targetCtx.fillRect(x + TILE_SIZE * 0.54, y + TILE_SIZE * 0.62, TILE_SIZE * 0.22, 2);
                } else {
                    targetCtx.fillRect(x + TILE_SIZE * 0.30, y + TILE_SIZE * 0.50, TILE_SIZE * 0.22, 2);
                }
            } else {
                targetCtx.fillRect(x + TILE_SIZE * 0.22, y + TILE_SIZE * 0.36, TILE_SIZE * 0.20, 2);
            }
            targetCtx.globalAlpha = 1;

            if (liquid.id === 'lava') {
                targetCtx.fillStyle = liquid.hi;
                targetCtx.globalAlpha = 0.32;
                targetCtx.fillRect(x + TILE_SIZE * 0.42, y + TILE_SIZE * 0.18, 3, TILE_SIZE * 0.36);
                targetCtx.globalAlpha = 1;
            } else if (liquid.id === 'toxic') {
                targetCtx.fillStyle = liquid.hi;
                targetCtx.globalAlpha = 0.24;
                targetCtx.beginPath();
                targetCtx.arc(x + TILE_SIZE * 0.70, y + TILE_SIZE * 0.28, Math.max(2, TILE_SIZE * 0.07), 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.globalAlpha = 1;
            } else if (liquid.id === 'mud') {
                targetCtx.fillStyle = liquid.edge;
                targetCtx.globalAlpha = 0.32;
                targetCtx.fillRect(x + TILE_SIZE * 0.60, y + TILE_SIZE * 0.58, TILE_SIZE * 0.16, 2);
                targetCtx.globalAlpha = 1;
            }
        }


function getRenderProfileV65() {
    return typeof getBomberRenderProfileV65 === 'function'
        ? getBomberRenderProfileV65()
        : { particleBudget: 96, floaterBudget: 24, showAmbientDust: true, showLighting: true, showCombatFeedback: true, showRoomDecor: true, showEnemyAISignals: true, useCanvasFilter: true };
}

function draw() {
            updateRenderViewportV329();
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('background') : '#090d16';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            
            // Screen Shake Effect
            let shakeX = 0, shakeY = 0;
            if (gameState.shakeTimer > 0) {
                shakeX = (Math.random() - 0.5) * gameState.shakeIntensity;
                shakeY = (Math.random() - 0.5) * gameState.shakeIntensity;
            }

            // Apply Camera Translation
            ctx.translate(-Math.floor(gameState.camera.x) + shakeX, -Math.floor(gameState.camera.y) + shakeY);

            // V3.17: terreno estático pre-renderizado. Solo se reconstruye al cambiar el mapa.
            const terrainCache = ensureTerrainCacheV317();
            ctx.drawImage(terrainCache, 0, 0);

            // Exit portal stays dynamic because it is animated.
            if (gameState.exitPos) {
                const ex = gameState.exitPos.x;
                const ey = gameState.exitPos.y;
                if (gameState.grid[ey]?.[ex] === TYPES.EXIT_OPEN) {
                    drawExitPortal(ex * TILE_SIZE, ey * TILE_SIZE);
                }
            }

            // V3.13: acentos espaciales; las salas se leen en el propio piso, sin minimapa.
            if (getRenderProfileV65().showRoomDecor && typeof drawRoomDesignLayerV313 === 'function') drawRoomDesignLayerV313();

            // v6.0: residuos materiales persistentes; quedan por debajo de items, bombas y personajes.
            if (typeof drawMaterialResiduesV60 === 'function') drawMaterialResiduesV60(ctx);
            // v6.32.2 hotfix: campos eléctricos que siguen activos tras la explosión.
            // Es solo renderizado: el sistema de campos conserva toda la autoridad del daño.
            if (typeof drawBombEffectFieldsV6323 === 'function') {
                renderStatsV329.explosions += drawBombEffectFieldsV6323(gameState.bombEffectFieldsV64);
            }
            // v6.32.4: fuego residual visible mientras los campos HEAT hacen daño.
            if (typeof drawPersistentFireFieldsV6324 === 'function') {
                renderStatsV329.explosions += drawPersistentFireFieldsV6324(gameState.bombEffectFieldsV64);
            }
            // v6.32.6: hielo persistente de BOMB_ICE.
            // Se suma a los campos eléctricos y de fuego existentes; no los reemplaza.
            if (typeof drawElementalResiduesV6308 === 'function') {
                renderStatsV329.explosions += drawElementalResiduesV6308(ctx, gameState.bombEffectFieldsV64);
            }
            // v6.33.0: nube tóxica y vórtices gravitatorios persistentes.
            if (typeof drawAdvancedBombFieldsV6330 === 'function') {
                renderStatsV329.explosions += drawAdvancedBombFieldsV6330(gameState.bombEffectFieldsV64);
            }
            // V3.3: las trampas aparecen visualmente solo después de activarse.
            drawHazards();
            // v6.30.0: campos temporales de habilidades RASTRERO, dibujados en el Canvas único.
            if (typeof drawRastreroAbilityEffectsV630 === 'function') drawRastreroAbilityEffectsV630(ctx);

            // Draw Items / Powerups
            for(let i=0;i<gameState.items.length;i++){
                const it=gameState.items[i];
                if(it && isWorldTileVisibleV329(it.x, it.y, 1)){ renderStatsV329.items++; drawPowerupSprite(it); }
            }

            // Draw Bombs
            for(let i=0;i<gameState.bombs.length;i++){
                const b=gameState.bombs[i];
                if(!b) continue;
                if (b.state === 'carried' || b.motionState === 'carried') continue;
                const bombPos = typeof getBombV4WorldPosition === 'function' ? getBombV4WorldPosition(b) : {x:(b.x + .5) * TILE_SIZE, y:(b.y + .5) * TILE_SIZE};
                if(!isWorldRectVisibleV329(bombPos.x - TILE_SIZE * .55, bombPos.y - TILE_SIZE * .55, TILE_SIZE * 1.1, TILE_SIZE * 1.1, TILE_SIZE)) continue;
                renderStatsV329.bombs++;
                drawBombSprite(bombPos.x, bombPos.y, b);
            }
            drawBombChainLinks();
            // v6.30.9: solo la animación estética de 350 ms.
            // gameState.explosions conserva en exclusiva la hitbox y el daño lógico.
            renderStatsV329.explosions += drawExplosionClustersV6308(gameState.bombBlastVisualsV6308);

            // Draw Enemies
            for(let i=0;i<gameState.enemies.length;i++){
                const e=gameState.enemies[i];
                if(e && isWorldRectVisibleV329(e.x-e.width/2, e.y-e.height/2, e.width, e.height, TILE_SIZE)){ renderStatsV329.enemies++; if (typeof drawRastreroEnemySpriteV630 === 'function') drawRastreroEnemySpriteV630(e, drawEnemySprite); else drawEnemySprite(e); }
            }
            if (getRenderProfileV65().showEnemyAISignals && typeof drawEnemyAISignals === 'function') drawEnemyAISignals();

            // v6.1: eco persistente del intento anterior. Se dibuja antes del boss
            // y del jugador para conservar la jerarquía visual actual.
            if (typeof drawDeathEchoV61 === 'function') drawDeathEchoV61();

            // Draw Boss
            drawBoss();

            // Draw Player Bomberman
            if (!player.isInvincible || Math.floor(gameState.animFrame / 4) % 2 === 0) {
                drawBombermanSprite(player.x, player.y);
                if (typeof drawWinterBodyEffectsV64 === 'function') drawWinterBodyEffectsV64(player);
            }
            // Una bomba agarrada pertenece visualmente al portador, no al suelo.
            const carriedPlayerBomb = typeof globalThis.getCarriedBombForEntityV682 === 'function'
                ? globalThis.getCarriedBombForEntityV682(player)
                : null;
            if (carriedPlayerBomb) {
                const carriedPos = typeof globalThis.getCarriedBombWorldPositionV682 === 'function'
                    ? globalThis.getCarriedBombWorldPositionV682(carriedPlayerBomb)
                    : {
                        x: player.x + player.width / 2,
                        y: player.y + player.height / 2 - TILE_SIZE * 0.38
                    };
                if (carriedPos) drawBombSprite(carriedPos.x, carriedPos.y, carriedPlayerBomb);
            }

            // Draw Particles: el presupuesto visual es menor que el de simulación.
            const profileV65 = getRenderProfileV65();
            const particleLimit = Math.min(gameState.particles.length, Number(profileV65.particleBudget) || 24);
            for(let i=Math.max(0, gameState.particles.length-particleLimit); i<gameState.particles.length; i++){
                const p=gameState.particles[i];
                if(!p || !isWorldRectVisibleV329(p.x, p.y, p.size || 1, p.size || 1, TILE_SIZE)) continue;
                renderStatsV329.particles++;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            // Los mensajes informativos se muestran en el panel DOM externo.
            renderStatsV329.floaters = 0;

            ctx.restore();

            if (getRenderProfileV65().showAmbientDust) drawAmbientDust();
            if (getRenderProfileV65().showLighting) drawLighting();
            if (getRenderProfileV65().showCombatFeedback) renderCombatFeedback();
        }

        function drawDeathEchoV61() {
            const ghost = gameState.deathEchoV61
                || (window.BOMBER_ENGINE?.getDeathEcho ? window.BOMBER_ENGINE.getDeathEcho(gameState.level) : null)
                || (window.BOMBER_ENGINE?.getActiveDeathEcho ? window.BOMBER_ENGINE.getActiveDeathEcho(gameState.level) : null);

            if (!ghost || ghost.defeated) return;
            if (![ghost.x, ghost.y, ghost.width, ghost.height].every(Number.isFinite)) return;

            const visible = typeof isWorldRectVisibleV329 === 'function'
                ? isWorldRectVisibleV329(ghost.x, ghost.y, ghost.width, ghost.height, TILE_SIZE * 1.5)
                : true;
            if (!visible) return;

            // El eco utiliza EXACTAMENTE el mismo diseño geométrico del jugador.
            // La diferencia es monocromática + alpha 0.50. No hay aura, ojos,
            // partículas ni una segunda animación superpuesta.
            drawBombermanSprite(ghost.x - ghost.width / 2, ghost.y - ghost.height / 2, ghost, { ghost: true });

            // La bomba transportada por el eco se dibuja sobre el portador, no en el suelo.
            const carriedEchoBomb = typeof globalThis.getCarriedBombForEntityV682 === 'function'
                ? globalThis.getCarriedBombForEntityV682(ghost)
                : null;
            if (carriedEchoBomb) {
                const carriedPos = typeof globalThis.getCarriedBombWorldPositionV682 === 'function'
                    ? globalThis.getCarriedBombWorldPositionV682(carriedEchoBomb)
                    : { x: ghost.x, y: ghost.y - TILE_SIZE * 0.38 };
                if (carriedPos && Number.isFinite(carriedPos.x) && Number.isFinite(carriedPos.y)) {
                    drawBombSprite(carriedPos.x, carriedPos.y, carriedEchoBomb);
                }
            }
        }

        function drawExitPortal(x, y) {
            let pulse = Math.sin(gameState.animFrame * 0.1) * 3;
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('exit') : '#facc15';
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE*0.35 + pulse, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyPupil') : '#000000';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText('🚪', x + 10, y + 32);
        }

        function drawBombermanSprite(x, y, actor = player, options = {}) {
            ctx.save();

            const isGhost = options.ghost === true;
            const actorWidth = Number(actor.width) || Number(player.width) || TILE_SIZE * 0.68;
            const actorHeight = Number(actor.height) || Number(player.height) || TILE_SIZE * 0.68;
            const actorDir = ['up', 'down', 'left', 'right'].includes(actor.dir) ? actor.dir : 'down';
            if (isGhost) {
                // En móvil bajo evitamos ctx.filter, que es costoso en algunos Canvas 2D.
                if (getRenderProfileV65().useCanvasFilter) ctx.filter = 'grayscale(1) contrast(1.18)';
                ctx.globalAlpha = 0.5;
            }
            const walkCycle = Number(actor.walkCycle ?? ((actor.visualTime || 0) * 0.015));
            const fsmState = !isGhost && typeof playerFSMGetState === 'function'
                ? playerFSMGetState()
                : (actor.isMoving ? 'CAMINANDO' : 'QUIETO');
            const walkingAnimation = actor.isMoving || fsmState === 'CAMINANDO';
            const plantingAnimation = !isGhost && fsmState === 'PONIENDO_BOMBA';
            const deadAnimation = !isGhost && fsmState === 'MUERTO';

            // v5.7: el render solo consume la FSM; no cambia gameplay ni estado.
            let bounce = plantingAnimation
                ? Math.sin(gameState.animFrame * 0.24) * 1.5
                : Math.sin(walkCycle * 4) * (walkingAnimation ? 3 : 1);
            if (isGhost && !walkingAnimation) bounce = Math.sin(Number(actor.visualTime || 0) * 0.003) * 0.8;
            const recoil = !isGhost && typeof getPlayerRenderRecoil === 'function' ? getPlayerRenderRecoil() : { x: 0, y: 0 };
            let px = x + recoil.x, py = y + bounce + recoil.y;

            if (deadAnimation) ctx.globalAlpha = 0.65;

            // Sombra
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombShadow') : 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(px + actorWidth/2, y + actorHeight, actorWidth/2.2, 5, 0, 0, Math.PI*2);
            ctx.fill();

            // Burbuja de Escudo
            if (plantingAnimation) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombPlayerRing') : 'rgba(34, 211, 238, 0.78)';
                ctx.lineWidth = 2;
                ctx.globalAlpha = isGhost ? 0.5 : (deadAnimation ? 0.35 : 0.8);
                ctx.beginPath();
                ctx.arc(px + actorWidth / 2, py + actorHeight / 2, actorWidth * (0.58 + Math.sin(gameState.animFrame * 0.35) * 0.05), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = isGhost ? 0.5 : (deadAnimation ? 0.65 : 1);
            }

            if (actor.hasShield) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerShield') : 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(px + actorWidth/2, py + actorHeight/2, actorWidth*0.8, 0, Math.PI*2);
                ctx.stroke();
            }

            // Traje (Azul)
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerSuit') : '#2563eb';
            ctx.fillRect(px + 6, py + 12, actorWidth - 12, actorHeight - 16);
            
            // Cinturón
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
            ctx.fillRect(px + 6, py + 22, actorWidth - 12, 4);
            // Hebilla
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerBuckle') : '#facc15';
            if (actorDir === 'down') {
                ctx.fillRect(px + actorWidth/2 - 4, py + 21, 8, 6);
            } else if (actorDir === 'left') {
                ctx.fillRect(px + 4, py + 21, 4, 6);
            } else if (actorDir === 'right') {
                ctx.fillRect(px + actorWidth - 8, py + 21, 4, 6);
            }

            // Casco (Blanco)
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerHelmet') : '#f8fafc';
            ctx.beginPath();
            ctx.arc(px + actorWidth/2, py + 10, 14, 0, Math.PI*2);
            ctx.fill();

            // Rostro Direccional
            if (actorDir === 'down') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + actorWidth/2 - 9, py + 4, 18, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + actorWidth/2 - 5, py + 7, 3, 6);
                ctx.fillRect(px + actorWidth/2 + 2, py + 7, 3, 6);
            } else if (actorDir === 'left') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + actorWidth/2 - 12, py + 4, 14, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + actorWidth/2 - 7, py + 7, 3, 6);
            } else if (actorDir === 'right') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + actorWidth/2 - 2, py + 4, 14, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + actorWidth/2 + 4, py + 7, 3, 6);
            }

            // Antena
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerMetal') : '#94a3b8'; 
            ctx.fillRect(px + actorWidth/2 - 2, py - 6, 4, 4);
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerAccent') : '#ec4899'; 
            ctx.beginPath();
            ctx.arc(px + actorWidth/2, py - 8, 5, 0, Math.PI*2);
            ctx.fill();

            // Guantes
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerAccent') : '#ec4899';
            if (actorDir !== 'right') { 
                ctx.beginPath(); ctx.arc(px + 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }
            if (actorDir !== 'left') { 
                ctx.beginPath(); ctx.arc(px + actorWidth - 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }

            // Pies (Zapatos Rojos) animando
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerBoot') : '#dc2626';
            let leftFootY = py + actorHeight - 4 + (walkingAnimation && Math.floor(walkCycle*4)%2===0 ? -4 : 0);
            let rightFootY = py + actorHeight - 4 + (walkingAnimation && Math.floor(walkCycle*4)%2===1 ? -4 : 0);
            
            if (actorDir === 'right') {
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 - 2, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 + 6, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else if (actorDir === 'left') {
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 - 6, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 + 2, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.ellipse(px + 8, leftFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + actorWidth - 8, rightFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
            }

            ctx.restore();
        }


        function drawEnemySprite(e) {
            ctx.save();
            const inheritedAlpha = ctx.globalAlpha;
            const enemySpecies = typeof getEnemyBiomeSpeciesProfileV615 === 'function' ? getEnemyBiomeSpeciesProfileV615(e) : null;
            const enemySkin = enemySpecies || (typeof getEnemySkinV614 === 'function' ? getEnemySkinV614(e) : null);
            const skinBody = enemySkin?.body || e.type.color;
            const skinShade = enemySkin?.shade || e.type.color;
            const skinAccent = enemySkin?.accent || themeColorV46('enemyEye', '#ffffff');
            const skinMotif = enemySkin?.motif || 'classic';
            if (e.elite) {
                ctx.strokeStyle = gameState.roomType.color;
                ctx.globalAlpha = inheritedAlpha * (0.45 + Math.sin(gameState.animFrame * 0.15) * 0.1);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y, TILE_SIZE * 0.48, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = inheritedAlpha;
            }
            let floaty = e.type.canFly ? Math.sin((gameState.animFrame + e.x) * 0.1) * 4 : Math.sin((gameState.animFrame + e.x) * 0.3) * 2;
            
            // Sombra
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyShadow') : 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.height/2, e.width/2, 4, 0, 0, Math.PI*2);
            ctx.fill();

            // Cuerpo base; la skin solo cambia la representación visual.
            ctx.fillStyle = skinBody;
            ctx.beginPath();
            if (e.type.canFly) {
                // Cola de fantasma
                ctx.arc(e.x, e.y + floaty, e.width/2, Math.PI, 0);
                ctx.lineTo(e.x + e.width/2, e.y + e.height/2 + floaty);
                ctx.lineTo(e.x + e.width/4, e.y + e.height/4 + floaty);
                ctx.lineTo(e.x, e.y + e.height/2 + floaty);
                ctx.lineTo(e.x - e.width/4, e.y + e.height/4 + floaty);
                ctx.lineTo(e.x - e.width/2, e.y + e.height/2 + floaty);
                ctx.fill();
            } else {
                ctx.arc(e.x, e.y + floaty, e.width/2, 0, Math.PI*2);
                ctx.fill();
            }

            // Motivo de bioma: accesorio ligero, procedural y barato.
            const motifY = e.y + floaty;
            ctx.fillStyle = skinAccent;
            ctx.strokeStyle = skinShade;
            ctx.lineWidth = 2;
            if (skinMotif === 'snow' || skinMotif === 'ice') {
                ctx.beginPath();
                ctx.moveTo(e.x - 7, motifY - e.height * 0.34); ctx.lineTo(e.x, motifY - e.height * 0.52); ctx.lineTo(e.x + 7, motifY - e.height * 0.34);
                ctx.stroke();
                if (skinMotif === 'ice') { ctx.beginPath(); ctx.moveTo(e.x, motifY - 2); ctx.lineTo(e.x, motifY - 12); ctx.stroke(); }
            } else if (skinMotif === 'leaf') {
                ctx.beginPath(); ctx.ellipse(e.x - 8, motifY - 10, 4, 7, -0.65, 0, Math.PI * 2); ctx.ellipse(e.x + 8, motifY - 10, 4, 7, 0.65, 0, Math.PI * 2); ctx.fill();
            } else if (skinMotif === 'acorn') {
                ctx.beginPath(); ctx.arc(e.x, motifY - 8, 6, Math.PI, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = skinShade; ctx.beginPath(); ctx.moveTo(e.x - 6, motifY - 8); ctx.lineTo(e.x + 6, motifY - 8); ctx.stroke();
                ctx.fillStyle = skinAccent; ctx.fillRect(e.x - 2, motifY - 15, 4, 4);
            } else if (skinMotif === 'flower') {
                for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 8, motifY - 10 + Math.sin(a) * 3, 3, 0, Math.PI * 2); ctx.fill(); }
            } else if (skinMotif === 'vine') {
                ctx.beginPath(); ctx.arc(e.x, motifY - 12, 7, 0, Math.PI * 2); ctx.stroke();
            } else if (skinMotif === 'sun') {
                for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 9, motifY - 10 + Math.sin(a) * 5); ctx.lineTo(e.x + Math.cos(a) * 13, motifY - 10 + Math.sin(a) * 7); ctx.stroke(); }
            } else if (skinMotif === 'crystal' || skinMotif === 'ore') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 15); ctx.lineTo(e.x + 6, motifY - 6); ctx.lineTo(e.x, motifY - 2); ctx.lineTo(e.x - 6, motifY - 6); ctx.closePath(); ctx.fill();
            } else if (skinMotif === 'cloud') {
                ctx.beginPath(); ctx.arc(e.x - 5, motifY - 9, 4, 0, Math.PI * 2); ctx.arc(e.x, motifY - 12, 5, 0, Math.PI * 2); ctx.arc(e.x + 5, motifY - 9, 4, 0, Math.PI * 2); ctx.fill();
            } else if (skinMotif === 'storm') {
                ctx.beginPath(); ctx.moveTo(e.x - 3, motifY - 17); ctx.lineTo(e.x + 3, motifY - 9); ctx.lineTo(e.x - 1, motifY - 8); ctx.lineTo(e.x + 3, motifY - 2); ctx.stroke();
            } else if (skinMotif === 'rock' || skinMotif === 'feather') {
                ctx.beginPath(); ctx.moveTo(e.x - 8, motifY - 7); ctx.lineTo(e.x - 4, motifY - 15); ctx.lineTo(e.x, motifY - 9); ctx.lineTo(e.x + 5, motifY - 16); ctx.lineTo(e.x + 9, motifY - 7); ctx.stroke();
            } else if (skinMotif === 'shell' || skinMotif === 'reef') {
                ctx.beginPath(); ctx.arc(e.x, motifY + 6, 7, Math.PI, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(e.x - 6, motifY + 6); ctx.lineTo(e.x - 2, motifY - 1); ctx.moveTo(e.x, motifY + 6); ctx.lineTo(e.x, motifY - 2); ctx.moveTo(e.x + 6, motifY + 6); ctx.lineTo(e.x + 2, motifY - 1); ctx.stroke();
            } else if (skinMotif === 'fin') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 16); ctx.lineTo(e.x + 6, motifY - 7); ctx.lineTo(e.x - 2, motifY - 8); ctx.closePath(); ctx.fill();
            } else if (skinMotif === 'visor' || skinMotif === 'drone') {
                ctx.fillStyle = skinAccent; ctx.globalAlpha = inheritedAlpha * 0.9; ctx.fillRect(e.x - 8, motifY - 5, 16, 5); ctx.globalAlpha = inheritedAlpha;
                ctx.strokeStyle = skinShade; ctx.beginPath(); ctx.moveTo(e.x, motifY - 12); ctx.lineTo(e.x, motifY - 19); ctx.stroke();
            } else if (skinMotif === 'tech') {
                ctx.strokeStyle = skinAccent; ctx.strokeRect(e.x - 8, motifY - 14, 16, 20);
                ctx.fillStyle = skinAccent; ctx.fillRect(e.x - 3, motifY - 9, 6, 3);
            } else if (skinMotif === 'halo') {
                ctx.beginPath(); ctx.ellipse(e.x, motifY - 11, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
            } else if (skinMotif === 'star') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 17); ctx.lineTo(e.x + 3, motifY - 9); ctx.lineTo(e.x + 11, motifY - 9); ctx.lineTo(e.x + 4, motifY - 4); ctx.lineTo(e.x + 7, motifY + 4); ctx.lineTo(e.x, motifY - 1); ctx.lineTo(e.x - 7, motifY + 4); ctx.lineTo(e.x - 4, motifY - 4); ctx.lineTo(e.x - 11, motifY - 9); ctx.lineTo(e.x - 3, motifY - 9); ctx.closePath(); ctx.stroke();
            } else if (skinMotif === 'horns' || skinMotif === 'demon') {
                ctx.beginPath(); ctx.moveTo(e.x - 10, motifY - 9); ctx.lineTo(e.x - 6, motifY - 18); ctx.lineTo(e.x - 2, motifY - 10); ctx.moveTo(e.x + 10, motifY - 9); ctx.lineTo(e.x + 6, motifY - 18); ctx.lineTo(e.x + 2, motifY - 10); ctx.stroke();
            } else if (skinMotif === 'ember') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 17); ctx.quadraticCurveTo(e.x + 8, motifY - 10, e.x, motifY - 4); ctx.quadraticCurveTo(e.x - 7, motifY - 10, e.x, motifY - 17); ctx.fill();
            }

            // Ojos mirando a la dirección de movimiento
            let eyeOffsetX = e.vx > 0 ? 3 : (e.vx < 0 ? -3 : 0);
            
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyEye') : '#ffffff'; 
            ctx.beginPath();
            ctx.arc(e.x - 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.arc(e.x + 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyPupil') : '#000000'; 
            ctx.beginPath();
            ctx.arc(e.x - 3 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.arc(e.x + 5 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.fill();

            // Cejas enojadas para los Rastreros (Rojos)
            if (e.type.name === 'Rastrero') {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyPupil') : '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(e.x - 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x - 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.moveTo(e.x + 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x + 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.stroke();
            }

            if (e.hunterMarkedV676) {
                ctx.strokeStyle = '#facc15';
                ctx.globalAlpha = inheritedAlpha * 0.8;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y + floaty, TILE_SIZE * 0.50, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = inheritedAlpha;
            }

            ctx.restore();
        }

        function drawBombSprite(cx, cy, b) {
            if (typeof ensureBombV4State === 'function') ensureBombV4State(b);
            const moving = b?.motionState === 'moving' || b?.state === 'moving';
            const pulse = Math.sin(gameState.animFrame * 0.2 + (b?.bobPhase || 0)) * 0.08;
            let scale = 1.0 + pulse + (moving ? 0.04 * Math.sin((b.motionProgress || 0) * Math.PI * 2) : 0);
            const submergedLiquid = typeof isBombSubmergedV631 === 'function' && isBombSubmergedV631(b);
            const sinkElapsed = Number(b?.biomeLiquidState?.elapsedMs) || 0;
            const sinkEffect = submergedLiquid && typeof getLiquidBombEffectV631 === 'function' ? getLiquidBombEffectV631(b.x, b.y) : null;
            const sinkProgress = sinkEffect?.sinkBombAfterMs > 0 ? Math.max(0, Math.min(1, sinkElapsed / sinkEffect.sinkBombAfterMs)) : 0;
            ctx.save();
            ctx.translate(cx, cy + (sinkProgress * TILE_SIZE * 0.22));
            if (typeof getBombElementDefV612 === 'function' && b?.elementV612 && b.elementV612 !== 'normal') { const ed=getBombElementDefV612(b); ctx.strokeStyle=ed.color; ctx.lineWidth=3; ctx.globalAlpha=.9; ctx.beginPath(); ctx.arc(0,0,TILE_SIZE*.48,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
            if (moving) ctx.rotate((b.motionRotation || 0) * 0.35);
            else if (Number.isFinite(b.windTilt)) ctx.rotate(Number(b.windTilt));
            ctx.scale(scale * (1 - sinkProgress * 0.20), scale * (1 - sinkProgress * 0.20));
            ctx.globalAlpha *= 1 - sinkProgress * 0.65;

            const bossBomb = (b.owner || 'player') === 'boss';
            // La bomba del jugador usa un aro cian; la bomba del boss usa identidad roja.
            if (!bossBomb) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombPlayerRing') : 'rgba(34,211,238,.78)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE * .42, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (bossBomb) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombBossRing') : 'rgba(248,113,113,.82)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE * .44, 0, Math.PI * 2);
                ctx.stroke();
            }
            renderBombFuseFeedback(0, 0, b);
            if (moving) {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombMovingFill') : 'rgba(255,210,63,.14)';
                ctx.beginPath(); ctx.arc(0, 0, TILE_SIZE * .49, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombMovingStroke') : 'rgba(255,138,0,.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4,4]);
                ctx.beginPath(); ctx.arc(0, 0, TILE_SIZE * .43, -Math.PI*.25, Math.PI*1.2); ctx.stroke();
                ctx.setLineDash([]);
            }

            // La sombra queda en el suelo para que el salto de la bomba sea legible.
            const jumpArc = moving ? Math.sin(Math.PI * (b?.motionProgress || 0)) * Number(b?.motionArc || 0) : 0;
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombShadow') : 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(0, TILE_SIZE*0.3 + jumpArc, TILE_SIZE*0.3, 4, 0, 0, Math.PI*2); ctx.fill();

            // Cuerpo brillante
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombBody') : '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, TILE_SIZE*0.35, 0, Math.PI*2);
            ctx.fill();
            
            // Reflejo
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombReflect', 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(-6, -6, TILE_SIZE*0.1, 0, Math.PI*2);
            ctx.fill();

            // Tapa y mecha
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombCap') : '#64748b';
            ctx.fillRect(-4, -TILE_SIZE*0.38, 8, 6);

            let sparkColor = gameState.animFrame % 4 < 2 ? (typeof themeColorV46 === 'function' ? themeColorV46('bombSparkHot') : '#facc15') : (typeof themeColorV46 === 'function' ? themeColorV46('bombSparkDanger') : '#ef4444');
            ctx.fillStyle = sparkColor;
            ctx.beginPath();
            ctx.arc(0, -TILE_SIZE*0.45, 5 + (b.timer < 650 ? Math.sin(gameState.animFrame*.8)*2 : 0), 0, Math.PI*2);
            ctx.fill();
            if(b.timer < 650){
                ctx.strokeStyle=typeof themeColorV46 === 'function' ? themeColorV46('bombFuse') : '#fee2e2';
                ctx.lineWidth=2;
                ctx.beginPath();
                ctx.moveTo(0,-TILE_SIZE*.47);
                ctx.lineTo(Math.cos(gameState.animFrame)*7,-TILE_SIZE*.58+Math.sin(gameState.animFrame)*5);
                ctx.stroke();
            }

            ctx.restore();
        }


        function drawPowerupSprite(item) {
            const x = item.x * TILE_SIZE;
            const y = item.y * TILE_SIZE;
            const type = item.type;
            const gameplayMeta = globalThis.GAMEPLAY_POWERUP_DEFS_V676?.[type] || globalThis.POWERUP_DEFS_V67?.[type] || globalThis.CAPABILITY_POWERUPS_V681?.[type] || globalThis.ELEMENTAL_BOMB_POWERUP_DEFS_V612?.[type] || null;
            let floaty = Math.sin((gameState.animFrame + x) * 0.1) * 3;
            if (type === 'RELIC') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('relicBase') : '#3b1d6b';
                ctx.fillRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('relicAccent') : '#c084fc';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                const relic = RELICS.find(r => r.id === item.relicId);
                ctx.font = '14px "Press Start 2P"';
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('white') : '#ffffff';
                ctx.fillText(relic?.icon || '✦', x + 11, y + 31 + floaty);
                return;
            }
            const rarityColor = gameplayMeta ? (globalThis.GAMEPLAY_POWERUP_RARITY_COLORS_V676?.[gameplayMeta.rarity] || '#94a3b8') : null;
            const elementalTag = ({
                BOMB_FIRE: { label:'FUEGO', color:'#fb923c' },
                BOMB_ICE: { label:'HIELO', color:'#38bdf8' },
                BOMB_ELECTRIC: { label:'ELÉC.', color:'#facc15' },
                BOMB_TOXIC: { label:'TÓXICA', color:'#84cc16' },
                BOMB_GRAVITY: { label:'GRAV.', color:'#c084fc' },
                BOMB_FRAGMENT: { label:'FRAG.', color:'#fb7185' },
                BOMB_PIERCE: { label:'PERFOR.', color:'#fbbf24' }
            })[type] || null;
            ctx.fillStyle = gameplayMeta ? 'rgba(15,23,42,.90)' : (typeof themeColorV46 === 'function' ? themeColorV46('powerupBase') : '#0284c7');
            ctx.fillRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);
            ctx.strokeStyle = elementalTag?.color || rarityColor || (typeof themeColorV46 === 'function' ? themeColorV46('powerupAccent') : '#38bdf8');
            ctx.lineWidth = elementalTag ? 1.5 : 1;
            ctx.strokeRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);

            ctx.font = '14px "Press Start 2P"';
            let icon = gameplayMeta?.icon || '💣';
            // El color de fondo no debe heredarse como color del glifo: eso volvía
            // casi invisibles algunos iconos contra la placa oscura del objeto.
            ctx.fillStyle = elementalTag?.color || '#f8fafc';
            if (type === POWERUPS.FIRE_UP) icon = '🔥';
            if (type === POWERUPS.SPEED_UP) icon = '👟';
            if (type === POWERUPS.HEALTH_UP) icon = '❤️';
            if (type === POWERUPS.SHIELD_UP) icon = '🛡️';
            if (elementalTag) {
                // Elementos centrados y con una etiqueta propia en el suelo:
                // se puede identificar la bomba antes de recogerla.
                ctx.textAlign = 'center';
                ctx.font = '15px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
                ctx.fillText(icon, x + TILE_SIZE / 2, y + TILE_SIZE * 0.66 + floaty);
                ctx.textAlign = 'start';
                const tagHeight = Math.max(7, TILE_SIZE * 0.18);
                const tagY = y + TILE_SIZE - tagHeight - 1 + floaty * 0.18;
                ctx.globalAlpha = 0.96;
                ctx.fillStyle = 'rgba(2,6,23,0.96)';
                ctx.fillRect(x + 3, tagY, TILE_SIZE - 6, tagHeight);
                ctx.strokeStyle = elementalTag.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 3.5, tagY + 0.5, TILE_SIZE - 7, tagHeight - 1);
                ctx.font = `600 ${Math.max(6, Math.min(7.5, TILE_SIZE * 0.16))}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(elementalTag.label, x + TILE_SIZE / 2, tagY + tagHeight / 2, TILE_SIZE - 9);
                ctx.textAlign = 'start';
                ctx.textBaseline = 'alphabetic';
                ctx.globalAlpha = 1;
            } else {
                ctx.fillText(icon, x + 10, y + 30 + floaty);
                if (gameplayMeta) {
                    ctx.font = '7px Inter, sans-serif';
                    ctx.fillStyle = rarityColor || '#cbd5e1';
                    ctx.textAlign = 'center';
                    ctx.fillText(gameplayMeta.rarity, x + TILE_SIZE / 2, y + TILE_SIZE - 7 + floaty);
                    ctx.textAlign = 'start';
                }
            }
        }

;
// === js/23-camera.js ===
// Bomberman Roguelike v3.7 — Player-follow camera
// Responsabilidad única: mantener al jugador visible y acompañarlo al recorrer el mapa.

const CAMERA = {
    // v6.42.0: Seguimiento activo y centrado continuo de Bomberman
    deadzoneX: 20,
    deadzoneY: 20,
    smoothness: 0.28
};

function clampCameraPosition(value, maxValue) {
    return Math.max(0, Math.min(maxValue, value));
}

function getCameraBounds() {
    const worldWidth = gameState.gridWidth * TILE_SIZE;
    const worldHeight = gameState.gridHeight * TILE_SIZE;

    return {
        maxX: Math.max(0, worldWidth - canvas.width),
        maxY: Math.max(0, worldHeight - canvas.height)
    };
}

function getCameraTarget() {
    const bounds = getCameraBounds();
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Centrado fluido y dinámico: la cámara siempre sigue a Bomberman manteniéndolo en foco
    const targetX = playerCenterX - canvas.width / 2;
    const targetY = playerCenterY - canvas.height / 2;

    return {
        x: clampCameraPosition(targetX, bounds.maxX),
        y: clampCameraPosition(targetY, bounds.maxY)
    };
}

function resetCameraToPlayer() {
    const bounds = getCameraBounds();
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    gameState.camera.x = clampCameraPosition(playerCenterX - canvas.width / 2, bounds.maxX);
    gameState.camera.y = clampCameraPosition(playerCenterY - canvas.height / 2, bounds.maxY);
    gameState.camera.targetX = gameState.camera.x;
    gameState.camera.targetY = gameState.camera.y;
}

function updateCamera(dt) {
    if (!player || !gameState.gridWidth || !gameState.gridHeight) return;

    const target = getCameraTarget();
    gameState.camera.targetX = target.x;
    gameState.camera.targetY = target.y;

    // Suavizado independiente del FPS. En frames largos no se queda detrás del jugador.
    const frameScale = Math.min(Math.max(dt, 0) / 16.6667, 3);
    const followFactor = 1 - Math.pow(1 - CAMERA.smoothness, frameScale);

    gameState.camera.x += (gameState.camera.targetX - gameState.camera.x) * followFactor;
    gameState.camera.y += (gameState.camera.targetY - gameState.camera.y) * followFactor;

    const bounds = getCameraBounds();
    gameState.camera.x = clampCameraPosition(gameState.camera.x, bounds.maxX);
    gameState.camera.y = clampCameraPosition(gameState.camera.y, bounds.maxY);
}

;
// === js/24-feedback.js ===
// Bomberman Roguelike v6.32.2 — Combat & Feedback
// Feedback visual/audio aislado para facilitar futuras iteraciones.
const combatFeedback = {
    hitStop: 0,
    hitStopScale: 0.18,
    flash: 0,
    flashColor: 'rgba(255,255,255,1)',
    flashAlpha: 0,
    playerHit: 0,
    playerHitColor: '#ef4444',
    playerRecoilX: 0,
    playerRecoilY: 0,
    death: 0,
    bombPulse: 0,
    lastBomb: null
};

function clamp01(v){ return Math.max(0, Math.min(1, v)); }

// Solo ralentiza el movimiento/animación durante el impacto.
// Bombas, explosiones, inmunidad, amenazas y timers críticos siguen corriendo.
function getCombatMotionDt(dt){
    return combatFeedback.hitStop > 0 ? dt * combatFeedback.hitStopScale : dt;
}

function updateCombatFeedback(dt){
    combatFeedback.hitStop = Math.max(0, combatFeedback.hitStop - dt);
    combatFeedback.flash = Math.max(0, combatFeedback.flash - dt);
    combatFeedback.playerHit = Math.max(0, combatFeedback.playerHit - dt);
    combatFeedback.bombPulse = Math.max(0, combatFeedback.bombPulse - dt);
    combatFeedback.death = Math.max(0, combatFeedback.death - dt);

    const recoilScale = combatFeedback.playerHit > 0 ? Math.max(0, combatFeedback.playerHit / 220) : 0;
    combatFeedback.playerRecoilX *= Math.pow(0.0008, dt / 220);
    combatFeedback.playerRecoilY *= Math.pow(0.0008, dt / 220);
    if(recoilScale <= 0){
        combatFeedback.playerRecoilX = 0;
        combatFeedback.playerRecoilY = 0;
    }
}

function triggerCombatFlash(color='rgba(255,255,255,1)', alpha=.35, duration=110){
    const scaledAlpha = typeof deviceQualityV45FeedbackFlash === 'function'
        ? deviceQualityV45FeedbackFlash(alpha)
        : alpha;
    combatFeedback.flashColor = color;
    combatFeedback.flashAlpha = scaledAlpha;
    combatFeedback.flash = Math.max(combatFeedback.flash, duration);
}

function triggerHitStop(duration=85){
    combatFeedback.hitStop = Math.max(combatFeedback.hitStop, duration);
}

function triggerBombPlacedFeedback(bomb){
    combatFeedback.bombPulse = 420;
    combatFeedback.lastBomb = bomb;
    triggerCombatFlash('rgba(251,191,36,1)', .12, 70);
    sfx('bombReady');
    addParticles((bomb.x + .5) * TILE_SIZE, (bomb.y + .5) * TILE_SIZE, 'particleImpact', 8);
}

function triggerEnemyDefeatFeedback(e){
    const color = e.elite ? (typeof themeColorV46 === 'function' ? themeColorV46('particleEnemyElite', '#fb7185') : '#fb7185') : (typeof themeColorV46 === 'function' ? themeColorV46('particleEnemy', '#38bdf8') : '#38bdf8');
    addParticles(e.x, e.y, e.elite ? 'particleEnemyElite' : 'particleEnemy', e.elite ? 22 : 15);
    addFloatingText(e.elite ? '★ KO ELITE' : 'KO', e.x, e.y - e.height * .55, color);
    triggerCombatFlash('rgba(56,189,248,1)', e.elite ? .16 : .09, 75);
    triggerHitStop(50);
    sfx('enemyKill');
}

function triggerBossHitFeedback(b){
    addParticles(b.x, b.y, 'particleBoss', 12);
    triggerCombatFlash('rgba(244,63,94,1)', .12, 80);
    triggerHitStop(70);
}

function triggerPlayerDamageFeedback(source='unknown', sourceX=null, sourceY=null, lethal=false, shield=false){
    const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    const sx = sourceX == null ? p.x : sourceX;
    const sy = sourceY == null ? p.y : sourceY;
    const dx = px - sx;
    const dy = py - sy;
    const len = Math.hypot(dx,dy) || 1;
    const strength = shield ? 3.5 : 5.5;

    combatFeedback.playerRecoilX = dx / len * strength;
    combatFeedback.playerRecoilY = dy / len * strength;
    combatFeedback.playerHit = shield ? 180 : 240;
    combatFeedback.playerHitColor = shield ? '#38bdf8' :
        source === 'boss-contact' ? '#c084fc' :
        source === 'trap' ? '#f43f5e' : '#ef4444';

    const sourceLabel = shield ? 'ESCUDO' :
        source === 'boss-contact' ? 'JEFE' :
        source === 'trap' ? 'TRAMPA' :
        source === 'explosion' ? 'EXPLOSIÓN' : 'IMPACTO';
    const sourceColor = shield ? '#38bdf8' :
        source === 'boss-contact' ? '#c084fc' :
        source === 'trap' ? '#f43f5e' : '#ef4444';
    if(!shield || source !== 'unknown') addFloatingText(`¡${sourceLabel}!`, p.x, p.y - p.height * .7, sourceColor);
    triggerCombatFlash(shield ? 'rgba(56,189,248,1)' :
        source === 'boss-contact' ? 'rgba(192,132,252,1)' :
        'rgba(239,68,68,1)', shield ? .22 : .20, shield ? 95 : 120);
    triggerHitStop(shield ? 70 : 90);
    if(lethal){
        combatFeedback.death = 900;
        triggerCombatFlash('rgba(239,68,68,1)', .32, 260);
    }
}

function getPlayerRenderRecoil(){
    return { x: combatFeedback.playerRecoilX, y: combatFeedback.playerRecoilY };
}

// El daño al jugador ya tenía inmunidad temporal. Este guard añade una segunda
// barrera explícita: una sola aplicación de daño por frame.
function canApplyPlayerDamage(){
    const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
    const gs = window.BOMBER_ENGINE?.getState?.() || gameState;
    if(p.isInvincible) return false;
    if(p.lastDamageFrame === gs.animFrame) return false;
    p.lastDamageFrame = gs.animFrame;
    return true;
}

function renderBombFuseFeedback(cx,cy,bomb){
    const max= Math.max(1, bomb.maxTimer || 2000);
    const progress=1-clamp01(bomb.timer/max);
    const urgent=bomb.timer<650;
    const pulse=urgent ? (0.65+Math.sin(gameState.animFrame*.7)*.35) : (0.45+Math.sin(gameState.animFrame*.22)*.2);
    ctx.save();
    ctx.strokeStyle=urgent ? `rgba(239,68,68,${pulse})` : `rgba(250,204,21,.72)`;
    ctx.lineWidth=urgent ? 4 : 2;
    ctx.beginPath();
    ctx.arc(cx,cy,TILE_SIZE*.45,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);
    ctx.stroke();

    if(urgent){
        ctx.fillStyle=`rgba(239,68,68,${.10+pulse*.08})`;
        ctx.beginPath(); ctx.arc(cx,cy,TILE_SIZE*.48,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function renderPlayerDamageFeedback(){
    const r=getPlayerRenderRecoil();
    if(combatFeedback.playerHit>0){
        const x=player.x+player.width/2-gameState.camera.x+r.x, y=player.y+player.height/2-gameState.camera.y+r.y;
        const a=Math.min(1, combatFeedback.playerHit/150);
        ctx.save();
        ctx.strokeStyle=combatFeedback.playerHitColor;
        ctx.globalAlpha=.7*a;
        ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(x,y,player.width*.72+(1-a)*8,0,Math.PI*2); ctx.stroke();
        ctx.restore();
    }
}

function renderCombatFeedback(){
    renderPlayerDamageFeedback();
    if(combatFeedback.flash>0){
        const a=combatFeedback.flashAlpha*Math.min(1,combatFeedback.flash/120);
        ctx.save();
        ctx.fillStyle=combatFeedback.flashColor;
        ctx.globalAlpha=Math.max(0,a);
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
    }
    if(combatFeedback.death>0){
        const p=1-clamp01(combatFeedback.death/900);
        const baseAlpha=(1-p)*.28;
        const alpha=typeof deviceQualityV45FeedbackFlash === 'function'
            ? deviceQualityV45FeedbackFlash(baseAlpha)
            : baseAlpha;
        ctx.save();
        ctx.fillStyle='rgba(127,29,29,1)';
        ctx.globalAlpha=alpha;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
    }
}

/* Unified pooled visual/audio feedback. */
const FEEDBACK_POOL_CONFIG = Object.freeze({
    enabled: true,
    maxParticles: 96,
    maxBursts: 24,
    maxRings: 12,
    particleLifeMin: 180,
    particleLifeMax: 460,
    particleSpeedMin: 0.8,
    particleSpeedMax: 2.8,
    flashMaxAlpha: 0.22,
    impactFlashMs: 90,
    explosionFlashMs: 55,
    cameraKickImpact: 1.6,
    cameraKickExplosion: 3.4,
    ringLifeMs: 260,
    soundEnabled: true,
    soundCooldownMs: 55,
    maxSoundsPerSecond: 10
});

const feedbackPool = {
    installed: false,
    originalUpdate: null,
    originalDraw: null,
    originalExplodeBomb: null,
    originalTakeDamage: null,
    particles: [],
    rings: [],
    flashAlpha: 0,
    flashTimer: 0,
    flashDuration: FEEDBACK_POOL_CONFIG.impactFlashMs,
    impactCount: 0,
    explosionCount: 0,
    damageCount: 0,
    particlesSpawned: 0,
    soundsPlayed: 0,
    lastSoundAt: -Infinity,
    soundWindowStart: 0,
    soundWindowCount: 0,
    audioContext: null
};

function feedbackPoolClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function feedbackPoolPoolInit() {
    if (feedbackPool.particles.length !== FEEDBACK_POOL_CONFIG.maxParticles) {
        feedbackPool.particles = Array.from({ length: FEEDBACK_POOL_CONFIG.maxParticles }, () => ({
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: 0,
            life: 0,
            maxLife: 1,
            alpha: 1,
            gravity: 0,
            color: '#fff',
            spark: false
        }));
    }

    if (feedbackPool.rings.length !== FEEDBACK_POOL_CONFIG.maxRings) {
        feedbackPool.rings = Array.from({ length: FEEDBACK_POOL_CONFIG.maxRings }, () => ({
            active: false,
            x: 0,
            y: 0,
            radius: 0,
            maxRadius: 0,
            life: 0,
            maxLife: FEEDBACK_POOL_CONFIG.ringLifeMs,
            color: '#fff',
            width: 2
        }));
    }
}

function feedbackPoolFindParticle() {
    for (let i = 0; i < feedbackPool.particles.length; i++) {
        if (!feedbackPool.particles[i].active) return feedbackPool.particles[i];
    }
    return null;
}

function feedbackPoolFindRing() {
    for (let i = 0; i < feedbackPool.rings.length; i++) {
        if (!feedbackPool.rings[i].active) return feedbackPool.rings[i];
    }
    return null;
}

function feedbackPoolSpawnParticles(x, y, color, count, scale = 1) {
    if (!FEEDBACK_POOL_CONFIG.enabled) return;

    const scaledCount = typeof deviceQualityV45FeedbackCount === 'function' ? deviceQualityV45FeedbackCount(count, 'particles') : count;
    const targetCount = Math.min(scaledCount, FEEDBACK_POOL_CONFIG.maxParticles);
    for (let i = 0; i < targetCount; i++) {
        const p = feedbackPoolFindParticle();
        if (!p) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = (
            FEEDBACK_POOL_CONFIG.particleSpeedMin +
            Math.random() * (FEEDBACK_POOL_CONFIG.particleSpeedMax - FEEDBACK_POOL_CONFIG.particleSpeedMin)
        ) * scale;

        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = (1.2 + Math.random() * 2.6) * scale;
        p.maxLife = FEEDBACK_POOL_CONFIG.particleLifeMin +
            Math.random() * (FEEDBACK_POOL_CONFIG.particleLifeMax - FEEDBACK_POOL_CONFIG.particleLifeMin);
        p.life = p.maxLife;
        p.alpha = 0.8 + Math.random() * 0.2;
        p.gravity = 0.012 + Math.random() * 0.02;
        p.color = color;
        p.spark = false;
        feedbackPool.particlesSpawned += 1;
    }
}

function feedbackPoolExplosionSparks(x, y, color = '#fff1a8', count = 9) {
    if (!FEEDBACK_POOL_CONFIG.enabled) return 0;
    if (feedbackPool.particles.length !== FEEDBACK_POOL_CONFIG.maxParticles) feedbackPoolPoolInit();
    const requested = Math.max(0, Math.trunc(Number(count) || 0));
    const scaled = typeof deviceQualityV45FeedbackCount === 'function'
        ? deviceQualityV45FeedbackCount(requested, 'particles')
        : requested;
    let spawned = 0;
    for (let i = 0; i < Math.min(scaled, FEEDBACK_POOL_CONFIG.maxParticles); i++) {
        const p = feedbackPoolFindParticle();
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.0 + Math.random() * 3.6;
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = 0.8 + Math.random() * 1.1;
        p.maxLife = 50 + Math.random() * 50;
        p.life = p.maxLife;
        p.alpha = 0.85 + Math.random() * 0.15;
        p.gravity = 0.002 + Math.random() * 0.006;
        p.color = color;
        p.spark = true;
        feedbackPool.particlesSpawned += 1;
        spawned++;
    }
    return spawned;
}

function feedbackPoolSpawnRing(x, y, color, scale = 1) {
    if (typeof deviceQualityV45FeedbackCount === 'function' && deviceQualityV45FeedbackCount(1, 'rings') <= 0) return;
    const ring = feedbackPoolFindRing();
    if (!ring) return;

    ring.active = true;
    ring.x = x;
    ring.y = y;
    ring.radius = 5 * scale;
    ring.maxRadius = 28 * scale;
    ring.life = FEEDBACK_POOL_CONFIG.ringLifeMs;
    ring.maxLife = FEEDBACK_POOL_CONFIG.ringLifeMs;
    ring.color = color;
    ring.width = 1.5 + scale;
}

function feedbackPoolKickCamera(amount) {
    try {
        if (!gameState || !gameState.camera) return;
        const camera = gameState.camera;
        if (Number.isFinite(camera.targetX)) camera.targetX += (Math.random() - 0.5) * amount;
        if (Number.isFinite(camera.targetY)) camera.targetY += (Math.random() - 0.5) * amount;
    } catch (_) {}
}

function feedbackPoolFlash(alpha, durationMs) {
    feedbackPool.flashAlpha = Math.max(
        feedbackPool.flashAlpha,
        Math.min(FEEDBACK_POOL_CONFIG.flashMaxAlpha, alpha)
    );
    feedbackPool.flashTimer = Math.max(feedbackPool.flashTimer, durationMs);
    feedbackPool.flashDuration = Math.max(1, durationMs);
}

function feedbackPoolImpact(x, y, color = null, scale = 1) {
    color = color || (typeof themeColorV46 === 'function' ? themeColorV46('particleImpact', '#fde68a') : '#fde68a');
    feedbackPool.impactCount += 1;
    feedbackPoolSpawnParticles(x, y, color, Math.round(7 * scale), scale);
    feedbackPoolSpawnRing(x, y, color, 0.8 * scale);
    feedbackPoolFlash(typeof deviceQualityV45FeedbackFlash === 'function' ? deviceQualityV45FeedbackFlash(0.12 * scale) : 0.12 * scale, FEEDBACK_POOL_CONFIG.impactFlashMs);
    feedbackPoolKickCamera(typeof deviceQualityV45CameraKick === 'function' ? deviceQualityV45CameraKick(FEEDBACK_POOL_CONFIG.cameraKickImpact * scale) : FEEDBACK_POOL_CONFIG.cameraKickImpact * scale);
    feedbackPoolPlaySound('impact', scale);
}

function feedbackPoolClearExplosionResidue(x, y, radius = TILE_SIZE * 1.1) {
    const radiusSq = Math.max(0, radius) ** 2;
    for (const particle of feedbackPool.particles) {
        if (!particle.active) continue;
        const dx = particle.x - x, dy = particle.y - y;
        if (dx * dx + dy * dy <= radiusSq) particle.active = false;
    }
    for (const ring of feedbackPool.rings) {
        if (!ring.active) continue;
        const dx = ring.x - x, dy = ring.y - y;
        if (dx * dx + dy * dy <= radiusSq) ring.active = false;
    }
    // También existen partículas del sistema histórico gameState.particles.
    // Limpiar las que quedaron en el centro del estallido; de lo contrario,
    // esas motas antiguas se siguen dibujando por encima de la llama continua.
    if (typeof gameState !== 'undefined' && Array.isArray(gameState.particles)) {
        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            const particle = gameState.particles[i];
            if (!particle) { gameState.particles.splice(i, 1); continue; }
            const dx = Number(particle.x) - x, dy = Number(particle.y) - y;
            if (Number.isFinite(dx) && Number.isFinite(dy) && dx * dx + dy * dy <= radiusSq) {
                gameState.particles.splice(i, 1);
            }
        }
    }
}

function feedbackPoolExplosion(x, y, color = null, scale = 1) {
    color = color || (typeof themeColorV46 === 'function' ? themeColorV46('particleFire', '#fb923c') : '#fb923c');
    feedbackPool.explosionCount += 1;

    // La llama continua es la única silueta. Los residuos circulares antiguos
    // se limpian desde la autoridad de efectos, para cada bomba detonada.
    // No generar anillos circulares ni partículas radiales alrededor de la bomba.
    feedbackPoolFlash(typeof deviceQualityV45FeedbackFlash === 'function' ? deviceQualityV45FeedbackFlash(0.18 * scale) : 0.18 * scale, FEEDBACK_POOL_CONFIG.explosionFlashMs);
    // El desplazamiento de cámara secundario prolongaba la sacudida. La explosión
    // usa únicamente triggerScreenShake, acotado a 50–100 ms por el sistema de efectos.
    // El sonido lo reproduce bomb-explosion:sound en 35-bomb-events.js.
}

// v6.32.2: efectos visuales específicos al recoger power-ups.
// Reutiliza los pools existentes para evitar crear objetos de partículas por frame.
function feedbackPoolPowerupPickupV6322(item) {
    if (!FEEDBACK_POOL_CONFIG.enabled || !item) return false;

    try {
        if (
            feedbackPool.particles.length !== FEEDBACK_POOL_CONFIG.maxParticles ||
            feedbackPool.rings.length !== FEEDBACK_POOL_CONFIG.maxRings
        ) {
            feedbackPoolPoolInit();
        }

        const type = String(item.type || '').toUpperCase();
        const effects = {
            BOMB_UP:       { primary: '#fbbf24', secondary: '#fff7cc', rings: 2, particles: 12, sparks: 7, scale: 1.00 },
            FIRE_UP:       { primary: '#fb923c', secondary: '#fde68a', rings: 1, particles: 9,  sparks: 13, scale: 1.00 },
            SPEED_UP:      { primary: '#38bdf8', secondary: '#cffafe', rings: 1, particles: 8,  sparks: 10, scale: 0.88 },
            HEALTH_UP:     { primary: '#4ade80', secondary: '#dcfce7', rings: 2, particles: 14, sparks: 2,  scale: 0.92 },
            SHIELD_UP:     { primary: '#60a5fa', secondary: '#dbeafe', rings: 2, particles: 10, sparks: 5,  scale: 1.00 },
            BOMB_KICK:     { primary: '#c084fc', secondary: '#f5d0fe', rings: 1, particles: 10, sparks: 7,  scale: 0.92 },
            KICK:          { primary: '#c084fc', secondary: '#f5d0fe', rings: 1, particles: 10, sparks: 7,  scale: 0.92 },
            GRAB:          { primary: '#a78bfa', secondary: '#ede9fe', rings: 1, particles: 9,  sparks: 7,  scale: 0.90 },
            THROW:         { primary: '#22d3ee', secondary: '#cffafe', rings: 1, particles: 9,  sparks: 10, scale: 0.90 },
            BOMB_FIRE:     { primary: '#f97316', secondary: '#fef08a', rings: 1, particles: 10, sparks: 14, scale: 1.00 },
            BOMB_ICE:      { primary: '#38bdf8', secondary: '#e0f2fe', rings: 2, particles: 10, sparks: 8,  scale: 0.98 },
            BOMB_ELECTRIC: { primary: '#facc15', secondary: '#67e8f9', rings: 2, particles: 8,  sparks: 15, scale: 1.00 },
            BOMB_TOXIC: { primary: '#84cc16', secondary: '#d9f99d', rings: 2, particles: 13, sparks: 5, scale: 1.00 },
            BOMB_GRAVITY: { primary: '#a855f7', secondary: '#f5d0fe', rings: 2, particles: 12, sparks: 8, scale: 1.04 },
            BOMB_FRAGMENT: { primary: '#fb7185', secondary: '#ffe4e6', rings: 1, particles: 15, sparks: 14, scale: 1.02 },
            BOMB_PIERCE: { primary: '#fbbf24', secondary: '#fef3c7', rings: 2, particles: 10, sparks: 12, scale: 1.00 },
            RELIC:         { primary: '#c4b5fd', secondary: '#fde68a', rings: 2, particles: 14, sparks: 8,  scale: 1.08 }
        };
        const effect = effects[type] || {
            primary: '#fbbf24', secondary: '#fff7cc', rings: 1,
            particles: 9, sparks: 5, scale: 0.9
        };

        const tile = Number(typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 48) || 48;
        const px = Number(player?.x);
        const py = Number(player?.y);
        const pw = Number(player?.width) || tile * 0.5;
        const ph = Number(player?.height) || tile * 0.5;
        const x = Number.isFinite(px) ? px + pw / 2 : (Number(item.x || 0) + 0.5) * tile;
        const y = Number.isFinite(py) ? py + ph / 2 : (Number(item.y || 0) + 0.5) * tile;

        // Anillos expansivos alrededor del jugador, con una paleta propia por tipo.
        if (effect.rings >= 1) feedbackPoolSpawnRing(x, y, effect.primary, effect.scale);
        if (effect.rings >= 2) feedbackPoolSpawnRing(x, y, effect.secondary, effect.scale * 0.68);

        feedbackPoolSpawnParticles(x, y, effect.primary, effect.particles, effect.scale);
        if (effect.sparks > 0) {
            feedbackPoolExplosionSparks(x, y, effect.secondary, effect.sparks);
        }

        return true;
    } catch (_) {
        // Un fallo estético nunca debe interrumpir la recogida ni la simulación.
        return false;
    }
}

function feedbackPoolDamage(x, y) {
    feedbackPool.damageCount += 1;
    const dangerColor = typeof themeColorV46 === 'function' ? themeColorV46('particleDanger', '#f87171') : '#f87171';
    const softColor = typeof themeColorV46 === 'function' ? themeColorV46('feedbackRingSoft', '#fecaca') : '#fecaca';
    feedbackPoolSpawnParticles(x, y, dangerColor, 8, 0.9);
    feedbackPoolSpawnRing(x, y, softColor, 0.75);
    feedbackPoolFlash(typeof deviceQualityV45FeedbackFlash === 'function' ? deviceQualityV45FeedbackFlash(0.16) : 0.16, FEEDBACK_POOL_CONFIG.impactFlashMs);
    feedbackPoolKickCamera(typeof deviceQualityV45CameraKick === 'function' ? deviceQualityV45CameraKick(2.2) : 2.2);
    feedbackPoolPlaySound('damage', 0.9);
}

function feedbackPoolGetAudioContext() {
    if (!FEEDBACK_POOL_CONFIG.soundEnabled) return null;
    if (feedbackPool.audioContext) return feedbackPool.audioContext;

    try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        feedbackPool.audioContext = new AudioCtor();
        return feedbackPool.audioContext;
    } catch (_) {
        return null;
    }
}

function feedbackPoolPlaySound(kind, scale = 1) {
    if (!FEEDBACK_POOL_CONFIG.soundEnabled) return;

    const now = performance.now();
    if (now - feedbackPool.lastSoundAt < FEEDBACK_POOL_CONFIG.soundCooldownMs) return;
    if (now - feedbackPool.soundWindowStart >= 1000) {
        feedbackPool.soundWindowStart = now;
        feedbackPool.soundWindowCount = 0;
    }
    const maxSounds = typeof getDeviceQualityV45 === 'function'
        ? Math.min(FEEDBACK_POOL_CONFIG.maxSoundsPerSecond, getDeviceQualityV45().maxSoundsPerSecond)
        : FEEDBACK_POOL_CONFIG.maxSoundsPerSecond;
    if (feedbackPool.soundWindowCount >= maxSounds) return;

    const audio = feedbackPoolGetAudioContext();
    if (!audio) return;

    try {
        if (audio.state === 'suspended') audio.resume().catch(() => {});

        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const t = audio.currentTime;
        const safeScale = feedbackPoolClamp(scale, 0.6, 1.6);

        if (kind === 'explosion') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120 * safeScale, t);
            osc.frequency.exponentialRampToValueAtTime(58, t + 0.14);
        } else if (kind === 'damage') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(180 * safeScale, t);
            osc.frequency.exponentialRampToValueAtTime(90, t + 0.09);
        } else {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280 * safeScale, t);
            osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);
        }

        const sfxVol = window.BOMBER_AUDIO ? (window.BOMBER_AUDIO.getSfxVolume() / 100) : 0.8;
        if (sfxVol <= 0.001) return;

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.05 * sfxVol, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'explosion' ? 0.16 : 0.08));

        osc.connect(gain);
        const sfxNode = window.BOMBER_AUDIO?.getSfxGainNode();
        if (sfxNode) {
            gain.connect(sfxNode);
        } else {
            gain.connect(audio.destination);
        }
        osc.start(t);
        osc.stop(t + (kind === 'explosion' ? 0.17 : 0.09));

        feedbackPool.lastSoundAt = now;
        feedbackPool.soundWindowCount += 1;
        feedbackPool.soundsPlayed += 1;
    } catch (_) {}
}

function updatefeedbackPool(dt) {
    const safeDt = feedbackPoolClamp(Number(dt) || 16.6667, 8, 40);

    for (let i = 0; i < feedbackPool.particles.length; i++) {
        const p = feedbackPool.particles[i];
        if (!p.active) continue;

        const scale = safeDt / 16.6667;
        p.x += p.vx * scale;
        p.y += p.vy * scale;
        p.vy += p.gravity * safeDt;
        p.life -= safeDt;

        if (p.life <= 0) p.active = false;
    }

    for (let i = 0; i < feedbackPool.rings.length; i++) {
        const r = feedbackPool.rings[i];
        if (!r.active) continue;

        r.life -= safeDt;
        const progress = 1 - feedbackPoolClamp(r.life / r.maxLife, 0, 1);
        r.radius = 5 * (r.maxRadius / 28) + (r.maxRadius - 5 * (r.maxRadius / 28)) * progress;
        if (r.life <= 0) r.active = false;
    }

    if (feedbackPool.flashTimer > 0) {
        feedbackPool.flashTimer -= safeDt;
        feedbackPool.flashAlpha *= Math.pow(0.82, safeDt / 16.6667);
        if (feedbackPool.flashTimer <= 0 || feedbackPool.flashAlpha < 0.005) {
            feedbackPool.flashTimer = 0;
            feedbackPool.flashAlpha = 0;
        }
    }
}

function feedbackPoolBeginWorldDraw() {
    const cam = gameState && gameState.camera ? gameState.camera : { x: 0, y: 0 };
    ctx.save();
    ctx.translate(-Math.floor(Number.isFinite(cam.x) ? cam.x : 0), -Math.floor(Number.isFinite(cam.y) ? cam.y : 0));
}

function drawfeedbackPool() {
    const quality = typeof getDeviceQualityV45 === 'function' ? getDeviceQualityV45() : null;
    const particlesActive = feedbackPool.particles.some(p => p.active);
    const ringsActive = feedbackPool.rings.some(r => r.active);

    if (particlesActive || ringsActive) {
        feedbackPoolBeginWorldDraw();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < feedbackPool.rings.length; i++) {
            const r = feedbackPool.rings[i];
            if (!r.active) continue;
            ctx.globalAlpha = feedbackPoolClamp(r.life / r.maxLife, 0, 1) * 0.7;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = 0; i < feedbackPool.particles.length; i++) {
            const p = feedbackPool.particles[i];
            if (!p.active) continue;
            ctx.globalAlpha = feedbackPoolClamp(p.life / p.maxLife, 0, 1) * p.alpha;
            ctx.strokeStyle = p.color;
            ctx.fillStyle = p.color;
            if (p.spark) {
                // Chispa lineal y efímera; no crea una segunda silueta de explosión.
                ctx.lineWidth = Math.max(0.7, p.size * 0.7);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
                ctx.stroke();
            } else {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            }
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    if (feedbackPool.flashAlpha > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = feedbackPool.flashAlpha;
        ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('feedbackFlash', '#fff7ed') : '#fff7ed';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

function feedbackPoolCaptureBombPosition(indexOrBomb) {
    try {
        if (indexOrBomb && typeof indexOrBomb === 'object') {
            const bx = Number(indexOrBomb.x);
            const by = Number(indexOrBomb.y);
            return Number.isFinite(bx) && Number.isFinite(by)
                ? { x: (bx + 0.5) * TILE_SIZE, y: (by + 0.5) * TILE_SIZE }
                : null;
        }

        if (typeof indexOrBomb === 'number' && Array.isArray(gameState.bombs)) {
            const bomb = gameState.bombs[indexOrBomb];
            if (bomb) {
                return {
                    x: (bomb.x + 0.5) * TILE_SIZE,
                    y: (bomb.y + 0.5) * TILE_SIZE
                };
            }
        }
    } catch (_) {}
    return null;
}

function feedbackPoolWrap() {
    if (feedbackPool.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function') return false;

    feedbackPoolPoolInit();

    feedbackPool.originalUpdate = update;
    feedbackPool.originalDraw = draw;

    window.update = function updateV326(dt) {
        const result = feedbackPool.originalUpdate(dt);
        updatefeedbackPool(dt);
        return result;
    };

    window.draw = function drawV326() {
        feedbackPool.originalDraw();
        drawfeedbackPool();
    };

    if (typeof explodeBomb === 'function') {
        feedbackPool.originalExplodeBomb = explodeBomb;
        window.explodeBomb = function explodeBombV326(indexOrBomb, ...rest) {
            const point = feedbackPoolCaptureBombPosition(indexOrBomb);
            const result = feedbackPool.originalExplodeBomb(indexOrBomb, ...rest);
            if (point) feedbackPoolExplosion(point.x, point.y, null, 1);
            return result;
        };
    }

    if (typeof takeDamage === 'function') {
        feedbackPool.originalTakeDamage = takeDamage;
        window.takeDamage = function takeDamageV326(...args) {
            const result = feedbackPool.originalTakeDamage(...args);
            try {
                const px = (player.x || 0) + (player.width || 24) / 2;
                const py = (player.y || 0) + (player.height || 24) / 2;
                feedbackPoolDamage(px, py);
            } catch (_) {}
            return result;
        };
    }

    feedbackPool.installed = true;
    return true;
}

function feedbackPoolBootstrap() {
    if (feedbackPoolWrap()) return;
    setTimeout(feedbackPoolBootstrap, 50);
}

window.FEEDBACK_POOL_CONFIG = FEEDBACK_POOL_CONFIG;
window.feedbackPool = feedbackPool;
window.feedbackPoolImpact = feedbackPoolImpact;
window.feedbackPoolExplosion = feedbackPoolExplosion;
window.feedbackPoolExplosionSparks = feedbackPoolExplosionSparks;
window.feedbackPoolClearExplosionResidue = feedbackPoolClearExplosionResidue;
window.feedbackPoolDamage = feedbackPoolDamage;
window.feedbackPoolPowerupPickupV6322 = feedbackPoolPowerupPickupV6322;
window.resetfeedbackPool = function resetfeedbackPool() {
    for (let i = 0; i < feedbackPool.particles.length; i++) feedbackPool.particles[i].active = false;
    for (let i = 0; i < feedbackPool.rings.length; i++) feedbackPool.rings[i].active = false;
    feedbackPool.flashAlpha = 0;
    feedbackPool.flashTimer = 0;
};

feedbackPoolBootstrap();

;
// === js/25-run-lifecycle.js ===
// Bomberman Roguelike v5.1 — Death & Restart Lifecycle
// Mantiene estadísticas de la run, cierre de muerte y reinicio limpio.

const RUN_LIFECYCLE = {
    elapsedMs: 0,
    lastSummary: null
};

function formatRunTime(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function resetCombatFeedbackForRun() {
    if (typeof combatFeedback === 'undefined') return;
    combatFeedback.hitStop = 0;
    combatFeedback.flash = 0;
    combatFeedback.flashAlpha = 0;
    combatFeedback.playerHit = 0;
    combatFeedback.playerRecoilX = 0;
    combatFeedback.playerRecoilY = 0;
    combatFeedback.death = 0;
    combatFeedback.bombPulse = 0;
    combatFeedback.lastBomb = null;
}

function resetPlayerRuntimeState() {
    player.x = 0;
    player.y = 0;
    player.speed = 3.0;
    player.maxBombs = 1;
    player.bombsPlaced = 0;
    player.bombCooldown = 0;
    player.bombRange = 1;
    player.health = 3;
    player.maxHealth = 5;
    player.hasShield = false;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    player.lastDamageFrame = -1;
    player.dir = 'down';
    player.isMoving = false;
    player.walkCycle = 0;
    player._frameScale = 1;
    player.vx = 0;
    player.vy = 0;
    player.inputDir = 0;
    player.inputAxis = null;
    player.inputBuffer = null;
    player.inputBufferTimer = 0;
    player.hazardSlowTimer = 0;
    player.hazardSlowFactor = 1;
    player.hazardSlowType = '';
    if (typeof resetEntityCapabilitiesV681 === 'function') resetEntityCapabilitiesV681(player);
    if (typeof playerFSMReset === 'function') playerFSMReset('runtime-reset');
}

function resetWorldRuntimeState() {
    gameState.isPlaying = false;
    gameState.paused = false;
    gameState.level = 1;
    gameState.score = 0;
    gameState.coins = 0;
    gameState.gridWidth = 17;
    gameState.gridHeight = 17;
    gameState.grid = [];
    gameState.bombs = [];
    gameState.explosions = [];
    gameState.enemies = [];
    gameState.items = [];
    gameState.particles = [];
    gameState.floaters = [];
    gameState.hazards = [];
    gameState.environmentHazards = [];
    gameState.materialResiduesV60 = [];
    gameState.deathEchoV61 = null;
    gameState.hazardCooldown = 0;
    if (typeof materialResetV60 === 'function') materialResetV60();
    gameState.boss = null;
    gameState.roomTime = 0;
    gameState.difficulty = null;
    gameState.exitPos = null;
    gameState.exitUnlocked = false;
    gameState.lastTime = 0;
    gameState.keys = {};
    gameState.touchControls = { x: 0, y: 0 };
    gameState.lastMoveAxis = 'vertical';
    gameState.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    gameState.shakeTimer = 0;
    gameState.shakeIntensity = 0;
    gameState.animFrame = 0;
    gameState.blastSerial = 0;
    gameState.lastMoveInputAt = 0;
    gameState.blocksBroken = 0;
    gameState.totalKills = 0;
    gameState.coinBonus = 0;
    gameState.killScoreMult = 1;
    gameState.fireScoreMult = 1;
    gameState.hitInvulnerabilityBonus = 0;
    gameState.rerollDiscount = 0;
    gameState.rerolls = 1;
    gameState.relics = [];
    gameState.roomType = ROOM_TYPES.STANDARD;
    gameState.runElapsedMs = 0;
    gameState.biomeV49 = null;
    gameState.runJourneyV50 = typeof createJourneyStateV50 === 'function' ? createJourneyStateV50() : { visitedBiomes: [], discoveredVerbs: [], currentBiomeId: null, currentStage: 1, maxDepth: 0 };
    gameState.runHistoryV51 = null;
    gameState.rafId = 0;

    // v5.8 ECS: el registro es derivado del runtime y se reconstruye limpio.
    if (typeof ecsReset === 'function') ecsReset();

    if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
    if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
    resetCombatFeedbackForRun();

    if (typeof ambient !== 'undefined') {
        clearTimeout(ambient.introTimer);
        ambient.dustTimer = 0;
        ambient.lastFoot = 0;
        ambient.introTimer = 0;
    }
    if (typeof adaptiveUI !== 'undefined') {
        adaptiveUI.lastLayout = '';
        adaptiveUI.lastPlayerState = false;
    }
    resetPlayerRuntimeState();

}

function beginNewRun() {
    // Si una callback de requestAnimationFrame quedó en cola, la invalida.
    if (typeof cancelScheduledGameLoopV632 === 'function') {
        cancelScheduledGameLoopV632(gameState);
    } else {
        if (typeof gameState.rafId === 'number' && gameState.rafId && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(gameState.rafId);
        }
        gameState.rafId = 0;
    }

    resetWorldRuntimeState();

    gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0) + 1;
    localStorage.setItem('bombermanRogueRun', gameState.runNumber);

    RUN_LIFECYCLE.elapsedMs = 0;
    RUN_LIFECYCLE.lastSummary = null;
    gameState.runElapsedMs = 0;
    gameState.biomeV49 = null;
    gameState.runJourneyV50 = typeof createJourneyStateV50 === 'function' ? createJourneyStateV50() : { visitedBiomes: [], discoveredVerbs: [], currentBiomeId: null, currentStage: 1, maxDepth: 0 };
    gameState.rafId = 0;

    return gameState.runNumber;
}

function tickRunClock(dt) {
    if (!gameState.isPlaying || gameState.paused) return;
    const safeDt = Math.max(0, Math.min(Number(dt) || 0, 100));
    RUN_LIFECYCLE.elapsedMs += safeDt;
    gameState.runElapsedMs = RUN_LIFECYCLE.elapsedMs;
}

function getDeathCauseLabel(source) {
    const labels = {
        explosion: 'Explosión',
        trap: 'Trampa',
        'boss-contact': 'Contacto con el jefe',
        enemy: 'Enemigo',
        'enemy-contact': 'Enemigo',
        'unknown': 'Daño recibido'
    };
    return labels[source] || 'Daño recibido';
}

function finishRun(source = 'unknown') {
    if (RUN_LIFECYCLE.lastSummary) return RUN_LIFECYCLE.lastSummary;

    // v6.1: capturamos el build ANTES de cerrar la run. El eco se guarda
    // separado del save de la run para sobrevivir al siguiente intento.
    let deathRelicsSnapshot = null;
    if (String(source || '') !== 'completed' && typeof recordDeathEchoV61 === 'function') {
        deathRelicsSnapshot = Array.isArray(gameState.relics) ? gameState.relics.map(relic => ({ ...relic })) : [];
        recordDeathEchoV61(source);
        if (Array.isArray(gameState.relics)) gameState.relics = [];
        if (window.ROGUELIKE_V327?.appliedBonus) window.ROGUELIKE_V327.appliedBonus = { bombs: 0, range: 0, speed: 0, maxHealth: 0 };
        if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
    }

    gameState.isPlaying = false;
    gameState.paused = false;

    if (typeof cancelScheduledGameLoopV632 === 'function') {
        cancelScheduledGameLoopV632(gameState);
    } else if (typeof gameState.rafId === 'number' && gameState.rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(gameState.rafId);
        gameState.rafId = 0;
    }

    const finalDepth = Number(gameState.level) || 1;
    if (typeof recordRunEventV51 === 'function') recordRunEventV51('run_finished', { cause: String(source || 'unknown'), depth: finalDepth });
    const history = typeof getRunHistorySummaryV51 === 'function' ? getRunHistorySummaryV51() : null;
    const finalScore = Number(gameState.score) || 0;
    const finalCoins = Number(gameState.coins) || 0;
    const finalKills = Number(gameState.totalKills) || 0;
    const finalTime = RUN_LIFECYCLE.elapsedMs;
    const journey = typeof getRunJourneySummaryV50 === 'function' ? getRunJourneySummaryV50() : { maxDepth: finalDepth, visitedBiomes: [], discoveredVerbs: [] };
    const previousBestDepth = Number(localStorage.getItem('bombermanBestDepth') || gameState.bestDepth || 0);
    const previousBestScore = Number(localStorage.getItem('bombermanBestScore') || 0);
    const bestDepth = Math.max(previousBestDepth, finalDepth);
    const bestScore = Math.max(previousBestScore, finalScore);

    gameState.bestDepth = bestDepth;
    localStorage.setItem('bombermanBestDepth', bestDepth);
    localStorage.setItem('bombermanBestScore', bestScore);

    RUN_LIFECYCLE.lastSummary = {
        runNumber: Number(gameState.runNumber) || 1,
        depth: finalDepth,
        completed: String(source || '') === 'completed',
        score: finalScore,
        coins: finalCoins,
        kills: finalKills,
        relics: (deathRelicsSnapshot || gameState.relics).map(relic => ({
            id: relic.id,
            name: relic.name,
            icon: relic.icon,
            rarity: relic.rarity,
            category: relic.category || 'BOMB'
        })),
        elapsedMs: finalTime,
        journey,
        history,
        cause: getDeathCauseLabel(source),
        bestDepth,
        bestScore,
        newBestDepth: finalDepth > previousBestDepth,
        newBestScore: finalScore > previousBestScore
    };

    renderDeathSummary(RUN_LIFECYCLE.lastSummary);
    try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('bomberman_run_finished', { detail: RUN_LIFECYCLE.lastSummary }));
        }
    } catch (_) {}
    return RUN_LIFECYCLE.lastSummary;
}

function renderDeathSummary(summary) {
    const set = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };

    set('go-run', `RUN ${String(summary.runNumber).padStart(2, '0')}`);
    set('go-level', summary.depth);
    set('go-score', summary.score);
    set('go-coins', summary.coins);
    set('go-relics', summary.relics.length);
    set('go-kills', summary.kills);
    set('go-time', formatRunTime(summary.elapsedMs));
    set('go-best', summary.bestDepth);
    set('go-best-score', summary.bestScore);
    set('go-cause', summary.completed ? 'Completaste todas las profundidades' : summary.cause);
    const gameOverTitle = document.querySelector('#game-over-screen .death-title');
    const gameOverKicker = document.querySelector('#game-over-screen .death-kicker');
    const gameOver = document.getElementById('game-over-screen');
    if (gameOverTitle) gameOverTitle.textContent = summary.completed ? '¡VICTORIA!' : 'GAME OVER';
    if (gameOverKicker) gameOverKicker.textContent = summary.completed ? 'RUN COMPLETADA' : 'RUN TERMINADA';
    gameOver?.classList.toggle('run-complete', !!summary.completed);
    const journeyBiomes = document.getElementById('go-biome-list');
    if (journeyBiomes) journeyBiomes.innerHTML = summary.journey.visitedBiomes.length
        ? summary.journey.visitedBiomes.map(item => `<span class="death-biome-chip"><strong>${item.name}</strong><small>${item.verb || ''}</small></span>`).join('')
        : '<span class="death-empty">Sin biomas registrados</span>';
    const journeyVerbs = document.getElementById('go-verb-list');
    if (journeyVerbs) journeyVerbs.innerHTML = summary.journey.discoveredVerbs.length
        ? summary.journey.discoveredVerbs.map(verb => `<span class="death-verb-chip">${verb.toUpperCase()}</span>`).join('')
        : '<span class="death-empty">Sin verbos registrados</span>';

    const record = document.getElementById('go-record');
    if (record) {
        const parts = [];
        if (summary.newBestDepth) parts.push('NUEVA PROFUNDIDAD');
        if (summary.newBestScore) parts.push('NUEVO PUNTAJE');
        record.textContent = summary.completed
            ? `✦ RUN COMPLETADA${parts.length ? ` · ${parts.join(' · ')}` : ''}`
            : (parts.length ? `✦ ${parts.join(' · ')}` : 'RUN FINALIZADA');
        record.classList.toggle('record-new', parts.length > 0 || !!summary.completed);
    }

    const relicList = document.getElementById('go-relic-list');
    if (relicList) {
        if (!summary.relics.length) {
            relicList.innerHTML = '<span class="death-empty">Sin reliquias</span>';
        } else {
            relicList.innerHTML = summary.relics.map(relic => {
                const meta = typeof getRelicCategoryMeta === 'function' ? getRelicCategoryMeta(relic.category) : { color: '#94a3b8', label: relic.category };
                return `<span class="death-relic" style="--relic-category:${meta.color}" title="${relic.name}">${relic.icon} ${relic.name}</span>`;
            }).join('');
        }
    }

    gameOver?.classList.add('death-ready');
}

;
// === js/26-loop-ui.js ===
// Bomberman Roguelike v6.32.0 — ciclo de juego, HUD y flujo de partida.
// Un único coordinador gestiona los requestAnimationFrame del runtime.
function scheduleGameLoopV632() {
    const state = typeof gameState !== 'undefined' ? gameState : null;
    if (!state || !state.isPlaying || typeof requestAnimationFrame !== 'function') return 0;
    if (state.__loopPendingV632 && state.rafId) return state.rafId;

    const generation = Number(state.__loopGenerationV632 || 0);
    state.__loopPendingV632 = true;
    let scheduledId = 0;
    scheduledId = requestAnimationFrame((timestamp) => {
        // Ignora callbacks antiguos si la partida se reinició/cargó durante el intervalo.
        if (Number(state.__loopGenerationV632 || 0) !== generation || state.rafId !== scheduledId) return;
        state.rafId = 0;
        state.__loopPendingV632 = false;
        gameLoop(timestamp);
    });
    state.rafId = scheduledId;
    return scheduledId;
}

function cancelScheduledGameLoopV632(targetState) {
    const state = targetState || (typeof gameState !== 'undefined' ? gameState : null);
    if (!state) return false;
    const frameId = Number(state.rafId || 0);
    if (frameId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
    state.rafId = 0;
    state.__loopPendingV632 = false;
    state.__loopGenerationV632 = Number(state.__loopGenerationV632 || 0) + 1;
    return frameId !== 0;
}

window.scheduleGameLoopV632 = scheduleGameLoopV632;
window.cancelScheduledGameLoopV632 = cancelScheduledGameLoopV632;

function gameLoop(timestamp) {
            if (!gameState.isPlaying) { gameState.rafId = 0; gameState.__loopPendingV632 = false; return; }
            let dt = timestamp - gameState.lastTime;
            gameState.lastTime = timestamp;

            // El timestamp de requestAnimationFrame puede llegar ligeramente antes
            // que un performance.now() usado al iniciar/reanudar la escena.
            // Nunca permitimos que un dt negativo entre en la simulación.
            if (!Number.isFinite(dt) || dt < 0) {
                dt = 16.6667;
            } else if (dt > 100) {
                dt = 16;
            }

            // Adapt visual effects to the device without changing gameplay speed.
            perf.frameCount++;
            if (dt > 26) {
                perf.slowFrames++;
                perf.fastFrames = 0;
            } else if (dt < 18) {
                perf.fastFrames++;
                perf.slowFrames = Math.max(0, perf.slowFrames - 1);
            } else {
                perf.slowFrames = Math.max(0, perf.slowFrames - 1);
                perf.fastFrames = Math.max(0, perf.fastFrames - 1);
            }
            if (perf.slowFrames >= 20) perf.lowQuality = true;
            if (perf.fastFrames >= 120) perf.lowQuality = false;
            update(dt);
            draw();

            if (gameState.isPlaying) {
                scheduleGameLoopV632();
            } else {
                gameState.rafId = 0;
            }
        }

        function showPowerupFeedbackV688(item, applied = true) {
            const node = UI['ui-powerup-toast'];
            if (!node || !item) return;

            const type = String(item.type || '');
            let meta = globalThis.POWERUP_DEFS_V67?.[type] || null;
            if (type === 'RELIC') {
                const relic = typeof RELICS !== 'undefined' ? RELICS.find(r => r.id === item.relicId) : null;
                meta = relic ? { icon: relic.icon || '✦', label: relic.name, desc: relic.desc || 'Reliquia permanente.' } : null;
            }

            const icon = meta?.icon || globalThis.CAPABILITY_POWERUPS_V681?.[type]?.icon || '◆';
            const name = meta?.label || globalThis.CAPABILITY_POWERUPS_V681?.[type]?.label || type;
            const desc = meta?.desc || globalThis.CAPABILITY_POWERUPS_V681?.[type]?.desc || 'Objeto recogido.';

            const iconNode = UI['ui-powerup-toast-icon'];
            const nameNode = UI['ui-powerup-toast-name'];
            const descNode = UI['ui-powerup-toast-desc'];
            if (iconNode) iconNode.textContent = icon;
            if (nameNode) nameNode.textContent = applied ? name : `${name} · NO APLICADO`;
            if (descNode) descNode.textContent = applied ? desc : 'Ya está activo, no se consume.';

            node.dataset.applied = applied ? 'true' : 'false';
            node.dataset.powerup = type.toUpperCase();
            node.classList.remove('hidden');
            gameState.powerupFeedbackV688Until = performance.now() + 2600;
        }

        window.showPowerupFeedbackV688 = showPowerupFeedbackV688;

        function updateUI(force = false) {
            const now = performance.now();
            // DOM writes are expensive on mobile/low-end hardware; HUD does not need 60 updates/sec.
            if (!force && now - perf.lastUi < 100) return;
            perf.lastUi = now;

            const pickupToast = UI['ui-powerup-toast'];
            if (pickupToast && Number(gameState.powerupFeedbackV688Until || 0) > 0 && now >= gameState.powerupFeedbackV688Until) {
                pickupToast.classList.add('hidden');
                gameState.powerupFeedbackV688Until = 0;
            }

            UI['ui-health'].innerText = player.health;
            UI['ui-score'].innerText = gameState.score;
            UI['ui-level'].innerText = gameState.level;
            const bombAvailable = Math.max(0, player.maxBombs - player.bombsPlaced);
            UI['ui-bombs'].innerText = `${bombAvailable}/${player.maxBombs}`;
            const bombStat = document.getElementById('bomb-stat');
            const bombFill = document.getElementById('ui-bombs-fill');
            if (bombStat) bombStat.classList.toggle('bomb-empty', bombAvailable <= 0);
            if (bombFill) bombFill.style.width = `${player.maxBombs > 0 ? (bombAvailable / player.maxBombs) * 100 : 0}%`;
            UI['ui-range'].innerText = player.bombRange;
            UI['ui-speed'].innerText = (player.speed - 2).toFixed(1);
            UI['ui-coins'].innerText = gameState.coins;
            const totalRelics = Array.isArray(gameState.relics) ? gameState.relics.length : 0;
            UI['ui-relics'].innerText = totalRelics;
            if (UI['ui-relic-count-label']) UI['ui-relic-count-label'].textContent = String(totalRelics);
            if (UI['ui-relic-list']) {
                const relics = Array.isArray(gameState.relics) ? gameState.relics : [];
                UI['ui-relic-list'].innerHTML = relics.length
                    ? relics.map(r => `<div class="info-relic-row"><span>${r.icon || '✦'}</span><div><strong>${r.name}</strong><small>${r.desc || ''}</small></div></div>`).join('')
                    : '<div class="info-empty">Sin reliquias activas</div>';
            }
            if (UI['ui-bomb-element']) {
                const elementKey = typeof window.getPlayerBombElementV612 === 'function' ? window.getPlayerBombElementV612() : 'normal';
                const def = window.ELEMENTAL_BOMB_DEFS_V612?.[elementKey] || null;
                UI['ui-bomb-element'].textContent = `${def?.label || 'NORMAL'}`;
                UI['ui-bomb-element'].style.setProperty('--element-color', def?.color || '#94a3b8');
            }
            if (UI['ui-timer']) UI['ui-timer'].innerText = `${Math.max(0, Math.ceil(gameState.roomTime / 1000))}s`;

            if (UI['ui-shield-badge']) UI['ui-shield-badge'].classList.toggle('hidden', !player.hasShield);

            if (UI['room-banner']) {
                UI['room-banner'].textContent = `${gameState.roomType.icon} ${gameState.roomType.name} · ${gameState.roomType.subtitle}`;
                UI['room-banner'].style.setProperty('--room-accent', gameState.roomType.color);
            }
            updateRoguePresentation();
            if (UI['relic-strip']) UI['relic-strip'].innerHTML = gameState.relics.map(r => { const meta = getRelicCategoryMeta(r.category); return `<span class="relic-chip" title="${r.desc}" style="--relic-category:${meta.color}">${r.icon} ${r.name} <small>${meta.label}</small></span>`; }).join('');
        }

        function updateRoguePresentation() {
            const runNode = UI['run-banner'];
            if (!runNode) return;
            const biomeLabel = typeof getBiomeRunLabelV49 === 'function' ? getBiomeRunLabelV49(gameState.level) : null;
            runNode.textContent = biomeLabel
                ? `RUN ${String(gameState.runNumber || 1).padStart(2, '0')} · ${biomeLabel.toUpperCase()} · DEPTH ${String(gameState.level).padStart(2, '0')}`
                : `RUN ${String(gameState.runNumber || 1).padStart(2, '0')} · DEPTH ${String(gameState.level).padStart(2, '0')}`;
        }

        function startGame() {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('level-complete-screen').classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');

            // V3.15: una nueva run pasa por un reinicio centralizado para evitar
            // arrastres de bombas, enemigos, trampas, proyectiles, timers, input o cámara.
            if (typeof clearRunSaveV55 === 'function') clearRunSaveV55();
            beginNewRun();
            initLevel();
            gameState.isPlaying = true;
            gameState.lastTime = performance.now();
            updateRoguePresentation();
            updateUI(true);
            if (window.BOMBER_AUDIO) window.BOMBER_AUDIO.onGameStart();
            scheduleGameLoopV632();
        }

        function startDepthForTestV53(targetDepth) {
            const engine = window.BOMBER_ENGINE || {};
            const state = engine.getState?.() || gameState;
            const currentPlayer = engine.getPlayer?.() || player;
            const maxDepth = typeof getBiomeProgressionSummaryV49 === 'function'
                ? Number(getBiomeProgressionSummaryV49().totalDepths) || 44
                : 44;
            const depth = Math.max(1, Math.min(maxDepth, Math.floor(Number(targetDepth) || 1)));
            document.getElementById('start-screen')?.classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');
            document.getElementById('game-over-screen')?.classList.add('hidden');
            document.getElementById('level-complete-screen')?.classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');
            cancelScheduledGameLoopV632(state);
            state.level = depth;
            state.isPlaying = false;
            state.paused = false;
            currentPlayer.isInvincible = false;
            currentPlayer.invincibleTimer = 0;
            currentPlayer.lastDamageFrame = -1;
            state.lastMoveInputAt = 0;
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            if (typeof combatFeedback !== 'undefined') {
                combatFeedback.hitStop = 0;
                combatFeedback.flash = 0;
                combatFeedback.playerHit = 0;
                combatFeedback.death = 0;
                combatFeedback.playerRecoilX = 0;
                combatFeedback.playerRecoilY = 0;
            }
            initLevel();
            if (typeof playerFSMReset === 'function') playerFSMReset('test-depth');
            state.isPlaying = true;
            state.paused = false;
            state.lastTime = performance.now();
            updateRoguePresentation();
            updateUI(true);
            scheduleGameLoopV632();
            return depth;
        }

        window.startDepthForTestV53 = startDepthForTestV53;
        window.BOMBER_ENGINE = window.BOMBER_ENGINE || {};
        window.BOMBER_ENGINE.startDepthForTest = startDepthForTestV53;
        window.BOMBER_ENGINE.nextDepth = () => { startNextDepth(); return (window.BOMBER_ENGINE.getState?.() || gameState).level; };
        window.BOMBER_ENGINE.getMaxRunDepth = getMaxRunDepthV56;
        window.BOMBER_ENGINE.completeRun = completeRunV56;

        function buildRewardChoices() {
            const choices = [];
            const availableRelics = getAvailableRelics().map(relic => ({
                id: `relic_${relic.id}`, kind: 'RELIC', rarity: relic.rarity,
                name: `${relic.icon} ${relic.name}`, desc: relic.desc, category: relic.category, relic
            }));
            const safeRewards = REWARDS.filter(reward => !['bomb','range','health'].includes(reward.id));
            const pool = [...safeRewards, ...availableRelics];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            return pool.slice(0, Math.min(3, pool.length));
        }

        function applyReward(reward) {
            if (reward.kind === 'RELIC') {
                grantRelic(reward.relic);
            } else {
                reward.action();
                addFloatingText(reward.name, player.x, player.y, RARITY_COLORS[reward.rarity]);
            }
        }

        function getMaxRunDepthV56() {
            const summary = typeof getBiomeProgressionSummaryV49 === 'function'
                ? getBiomeProgressionSummaryV49()
                : null;
            return Math.max(1, Number(summary?.totalDepths) || 44);
        }

        function completeRunV56() {
            const maxDepth = getMaxRunDepthV56();
            gameState.level = maxDepth;
            gameState.isPlaying = false;
            gameState.paused = false;
            cancelScheduledGameLoopV632(gameState);
            if (typeof clearRunSaveV55 === 'function') clearRunSaveV55();
            document.getElementById('level-complete-screen')?.classList.add('hidden');
            const summary = typeof finishRun === 'function' ? finishRun('completed') : null;
            document.getElementById('game-over-screen')?.classList.remove('hidden');
            updateRoguePresentation();
            updateUI(true);
            return summary;
        }

        function advanceAfterRewardV56() {
            if (gameState.level >= getMaxRunDepthV56()) {
                completeRunV56();
                return false;
            }
            startNextDepth();
            return true;
        }

        function startNextDepth() {
            if (gameState.level >= getMaxRunDepthV56()) {
                completeRunV56();
                return;
            }
            gameState.level++;
            document.getElementById('level-complete-screen').classList.add('hidden');
            player.isInvincible = false;
            player.invincibleTimer = 0;
            player.lastDamageFrame = -1;
            gameState.lastMoveInputAt = 0;
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            combatFeedback.hitStop = 0;
            combatFeedback.flash = 0;
            combatFeedback.playerHit = 0;
            combatFeedback.death = 0;
            combatFeedback.playerRecoilX = 0;
            combatFeedback.playerRecoilY = 0;
            initLevel();
            if (typeof playerFSMReset === 'function') playerFSMReset('depth-start');
            gameState.isPlaying = true;
            gameState.paused = false;
            gameState.lastTime = performance.now();
            scheduleGameLoopV632();
            if (typeof saveRunV55 === 'function') saveRunV55('level-start');
        }

        function completeLevel() {
            gameState.isPlaying = false;
            const screen = document.getElementById('level-complete-screen');
            const options = document.getElementById('upgrade-options');
            const rewardTitle = document.getElementById('reward-title');
            const rewardMeta = document.getElementById('reward-meta');
            const footer = document.getElementById('reward-footer');
            options.innerHTML = '';
            footer.innerHTML = '';

            const roomReward = Math.round(ROOM_TYPES[gameState.roomType.id].rewardCoins * (1 + gameState.coinBonus));
            gameState.coins += roomReward;
            gameState.score += Math.round(250 * (1 + (gameState.level * 0.08)));

            if (rewardTitle) rewardTitle.textContent = `PROFUNDIDAD ${String(gameState.level).padStart(2, '0')} SUPERADA`;
            if (rewardMeta) rewardMeta.textContent = `+${roomReward} monedas · elegí 1 mejora para la próxima sala`;

            const choices = buildRewardChoices();
            choices.forEach(reward => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'upgrade-card reward-card';
                card.style.setProperty('--rarity', RARITY_COLORS[reward.rarity]);
                card.innerHTML = `
                    <div class="reward-rarity">${reward.rarity}</div>
                    ${reward.category ? `<div class="relic-category-badge" style="--relic-category:${getRelicCategoryColor(reward.category)}">${getRelicCategoryLabel(reward.category)}</div>` : ''}
                    <div class="reward-name">${reward.name}</div>
                    <div class="reward-desc">${reward.desc}</div>
                `;
                card.addEventListener('click', () => {
                    applyReward(reward);
                    advanceAfterRewardV56();
                }, { once: true });
                options.appendChild(card);
            });

            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => {
                gameState.coins += 15;
                advanceAfterRewardV56();
            }, { once: true });
            footer.appendChild(skip);

            if (gameState.rerolls > 0) {
                const rerollCost = Math.max(5, 15 - gameState.rerollDiscount);
                const reroll = document.createElement('button');
                reroll.className = 'reward-secondary';
                reroll.textContent = `REROLL · ${rerollCost}¢`;
                reroll.disabled = gameState.coins < rerollCost;
                reroll.addEventListener('click', () => {
                    if (gameState.coins < rerollCost || gameState.rerolls <= 0) return;
                    gameState.coins -= rerollCost;
                    gameState.rerolls--;
                    completeLevelRewardsRefresh(options, footer);
                });
                footer.appendChild(reroll);
            }

            updateUI();
            screen.classList.remove('hidden');
        }

        function completeLevelRewardsRefresh(options, footer) {
            options.innerHTML = '';
            footer.innerHTML = '';
            const choices = buildRewardChoices();
            choices.forEach(reward => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'upgrade-card reward-card';
                card.style.setProperty('--rarity', RARITY_COLORS[reward.rarity]);
                card.innerHTML = `<div class="reward-rarity">${reward.rarity}</div>${reward.category ? `<div class="relic-category-badge" style="--relic-category:${getRelicCategoryColor(reward.category)}">${getRelicCategoryLabel(reward.category)}</div>` : ''}<div class="reward-name">${reward.name}</div><div class="reward-desc">${reward.desc}</div>`;
                card.addEventListener('click', () => { applyReward(reward); advanceAfterRewardV56(); }, { once: true });
                options.appendChild(card);
            });
            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => { gameState.coins += 15; advanceAfterRewardV56(); }, { once: true });
            footer.appendChild(skip);
            updateUI();
        }

        function gameOver(source = 'unknown') {
            finishRun(source);
            if (window.BOMBER_AUDIO) window.BOMBER_AUDIO.onGameOver();
            document.getElementById('game-over-screen')?.classList.remove('hidden');
        }

        document.getElementById('btn-start').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-restart').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-resume')?.addEventListener('click', togglePause);

        // Initial setup
        gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0);
        initLevel();
        updateRoguePresentation();
        updateUI();
        draw();

;
// === js/27-boss-system.js ===
/*
 * BOMBERMAN ROGUELIKE v6.29.0
 * Boss Bomb System
 *
 * Boss attacks are deliberately reduced to the game's core fantasy:
 * - throw bombs to random valid cells;
 * - ground slam to create a wide bomb-style explosion.
 *
 * No boss projectiles, no charge attack, no enemy summoning.
 */

const BOSS_V41_CONFIG = Object.freeze({
    enabled: true,
    phaseThresholds: Object.freeze({ phase2: 0.66, phase3: 0.33 }),
    telegraphMs: 650,
    bossBombCap: 4,
    bombFuseMs: 2100,
    bombMoveMs: 420,
    bombArcPx: 22,
    bombThrowCount: Object.freeze({ 1: 1, 2: 2, 3: 2 }),
    bombIntervalMs: Object.freeze({ phase1: 2900, phase2: 2450, phase3: 2050 }),
    bombRange: Object.freeze({ phase1: 2, phase2: 3, phase3: 4 }),
    bombMinFromPlayer: 0,
    bombMinFromBoss: 2,
    slamIntervalMs: Object.freeze({ phase1: 5400, phase2: 4700, phase3: 4000 }),
    slamRange: Object.freeze({ phase1: 5, phase2: 6, phase3: 7 }),
    phaseSpeedMultiplier: Object.freeze({ 1: 1.00, 2: 1.08, 3: 1.16 })
});

const BossV41 = {
    state: null,
    originalUpdate: null,
    originalDraw: null,
    originalInitLevel: null,
    originalStartGame: null,
    installed: false,
    updateWrapped: false,
    drawWrapped: false,
    initWrapped: false,
    startWrapped: false
};

function bossV41HealthRatio(boss) {
    if (!boss || boss.defeated) return 0;
    // hp/maxHp are the combat authority in 10-world.js; health/maxHealth are
    // mirrored compatibility fields and may be stale in old save snapshots.
    const hp = Number.isFinite(boss.hp) ? boss.hp : boss.health;
    const max = Number.isFinite(boss.maxHp) ? boss.maxHp : boss.maxHealth;
    if (!Number.isFinite(hp) || !Number.isFinite(max) || max <= 0) return 1;
    return Math.max(0, Math.min(1, hp / max));
}

function bossV41GetPhase(boss) {
    const ratio = bossV41HealthRatio(boss);
    if (ratio <= BOSS_V41_CONFIG.phaseThresholds.phase3) return 3;
    if (ratio <= BOSS_V41_CONFIG.phaseThresholds.phase2) return 2;
    return 1;
}

function bossV41EnsureState() {
    if (!BossV41.state) BossV41.state = bossV41CreateState();
    return BossV41.state;
}

function bossV41CreateState() {
    return {
        lastBossRef: null,
        phase: 1,
        pattern: 'bomb-throw',
        patternTimer: 0,
        bombTimer: 0,
        slamTimer: 0,
        telegraphTimer: 0,
        pendingAttack: null,
        telegraphKind: null,
        telegraphCells: [],
        pendingBombTargets: [],
        patternCount: 0,
        phaseTransitions: 0,
        bombShotsFired: 0,
        slamCount: 0,
        lastBombTarget: null,
        active: false,
        lastAttack: 'bomb-throw'
    };
}

function bossV41Reset() {
    BossV41.state = bossV41CreateState();
    try {
    } catch (_) {}
}

function bossV41IsActive() {
    try {
        return !!(gameState && gameState.isPlaying && gameState.boss && !gameState.boss.defeated);
    } catch (_) {
        return false;
    }
}

function bossV41EnsureHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('boss-hud');
    if (hud) return hud;
    const host = document.getElementById('game-container') || document.getElementById('game-stage');
    if (!host) return null;

    hud = document.createElement('div');
    hud.id = 'boss-hud';
    hud.className = 'boss-hud hidden';
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Estado del jefe');
    hud.setAttribute('aria-live', 'polite');
    hud.innerHTML = `
        <div class="boss-hud-top">
            <span id="boss-name">GUARDIÁN DEL BIOMA</span>
            <span id="boss-phase">FASE I</span>
        </div>
        <div class="boss-bar-track">
            <div id="boss-bar" class="boss-bar" role="progressbar" aria-label="Vida del jefe" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"></div>
        </div>
        <div class="boss-hud-top" style="margin:5px 0 0;font-size:6px;opacity:.85">
            <span>EXPLOSIVOS ACTIVOS</span>
            <span id="ui-boss-bombs" class="v4-boss-bomb-badge">BOMBAS <span>0</span></span>
        </div>`;
    host.appendChild(hud);
    return hud;
}

function bossV41SetHUD(boss, phase) {
    if (typeof document === 'undefined') return;
    const active = bossV41IsActive();
    const hudEl = bossV41EnsureHUD();
    const phaseEl = document.getElementById('boss-phase');
    const nameEl = document.getElementById('boss-name');
    const barEl = document.getElementById('boss-bar');
    const badge = document.getElementById('ui-boss-bombs');
    const ratio = bossV41HealthRatio(boss);
    const percent = Math.round(ratio * 100);

    if (phaseEl) phaseEl.textContent = active ? `FASE ${['', 'I', 'II', 'III'][phase] || phase}` : 'JEFE';
    if (nameEl && boss) nameEl.textContent = String(boss.name || 'GUARDIÁN DEL BIOMA').toLocaleUpperCase('es');
    if (barEl) {
        barEl.style.width = `${percent}%`;
        barEl.setAttribute('aria-valuenow', String(percent));
    }
    if (hudEl) hudEl.classList.toggle('hidden', !active);
    if (badge) {
        badge.classList.toggle('hidden', !active);
        const value = badge.querySelector('span');
        if (value) value.textContent = String(bossV4BombCount());
    }
}

function bossV4BombCount() {
    try {
        return Array.isArray(gameState.bombs) ? gameState.bombs.filter(b => b && b.owner === 'boss').length : 0;
    } catch (_) { return 0; }
}

function bossV41IsBombTargetValid(x, y, bossCell, playerCell, excluded = []) {
    if (x <= 0 || y <= 0 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
    if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) return false;
    if (Array.isArray(gameState.bombs) && gameState.bombs.some(b => b && b.x === x && b.y === y)) return false;
    if (excluded.some(cell => cell.x === x && cell.y === y)) return false;
    if (Math.abs(x - bossCell.x) + Math.abs(y - bossCell.y) < BOSS_V41_CONFIG.bombMinFromBoss) return false;
    if (Math.abs(x - playerCell.x) + Math.abs(y - playerCell.y) < BOSS_V41_CONFIG.bombMinFromPlayer) return false;
    return true;
}

function bossV41FindBombTargets(count = 1, excluded = []) {
    const boss = gameState.boss;
    if (!boss || !player || !gameState.grid) return [];
    const tile = Number(TILE_SIZE || 48);
    const bossCell = { x: Math.floor(boss.x / tile), y: Math.floor(boss.y / tile) };
    const playerCell = { x: Math.floor((player.x + player.width / 2) / tile), y: Math.floor((player.y + player.height / 2) / tile) };
    const selected = [];
    const excludedAll = [...excluded];

    // The warning marks exact cells close to the player's current position.
    // A player can escape during the 650 ms telegraph and the bomb's travel/fuse.
    for (let radius = 0; radius <= 4 && selected.length < count; radius++) {
        const ring = [];
        for (let y = playerCell.y - radius; y <= playerCell.y + radius; y++) {
            for (let x = playerCell.x - radius; x <= playerCell.x + radius; x++) {
                if (Math.abs(x - playerCell.x) + Math.abs(y - playerCell.y) !== radius) continue;
                if (bossV41IsBombTargetValid(x, y, bossCell, playerCell, excludedAll)) ring.push({ x, y });
            }
        }
        // Randomness only varies equivalent cells in the same ring; it never hides the target.
        for (let i = ring.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ring[i], ring[j]] = [ring[j], ring[i]];
        }
        for (const target of ring) {
            selected.push(target);
            excludedAll.push(target);
            if (selected.length >= count) break;
        }
    }

    // Fallback for crowded maps: find valid cells globally, closest to the player first.
    if (selected.length < count) {
        const fallback = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (bossV41IsBombTargetValid(x, y, bossCell, playerCell, excludedAll)) fallback.push({ x, y });
            }
        }
        fallback.sort((a, b) => {
            const da = Math.abs(a.x - playerCell.x) + Math.abs(a.y - playerCell.y);
            const db = Math.abs(b.x - playerCell.x) + Math.abs(b.y - playerCell.y);
            return da - db || Math.random() - 0.5;
        });
        for (const target of fallback) {
            selected.push(target);
            excludedAll.push(target);
            if (selected.length >= count) break;
        }
    }
    return selected;
}

function bossV41FindBombTarget(excluded = []) {
    return bossV41FindBombTargets(1, excluded)[0] || null;
}

function bossV41SpawnBomb(targetOverride = null) {
    const state = bossV41EnsureState();
    if (!bossV41IsActive()) return false;
    if (bossV4BombCount() >= BOSS_V41_CONFIG.bossBombCap) return false;
    const target = targetOverride || bossV41FindBombTarget();
    if (!target || !bossV41IsBombTargetValid(target.x, target.y, { x: Math.floor(gameState.boss.x / TILE_SIZE), y: Math.floor(gameState.boss.y / TILE_SIZE) }, { x: Math.floor((player.x + player.width / 2) / TILE_SIZE), y: Math.floor((player.y + player.height / 2) / TILE_SIZE) }, [])) return false;
    const boss = gameState.boss;
    const range = BOSS_V41_CONFIG.bombRange[`phase${state.phase}`] || 2;
    const bomb = {
        id: `boss-bomb-${gameState.animFrame}-${Math.random().toString(36).slice(2, 6)}`,
        owner: 'boss',
        bombType: 'boss-throw',
        x: target.x,
        y: target.y,
        range,
        timer: BOSS_V41_CONFIG.bombFuseMs,
        fuseTotal: BOSS_V41_CONFIG.bombFuseMs,
        warnBucket: Math.ceil(BOSS_V41_CONFIG.bombFuseMs / 300),
        scalePulse: 1,
        playerPassThrough: true,
        justArmed: false,
        placedAtFrame: gameState.animFrame,
        placementReason: 'boss-throw',
        countsTowardPlayerCapacity: false,
        state: BOMB_V4_STATES.MOVING,
        motionState: BOMB_V4_STATES.MOVING,
        worldX: boss.x,
        worldY: boss.y,
        motionProgress: 0,
        motionTimer: BOSS_V41_CONFIG.bombMoveMs,
        motionDuration: BOSS_V41_CONFIG.bombMoveMs,
        motionStartX: boss.x,
        motionStartY: boss.y,
        motionTargetX: (target.x + 0.5) * TILE_SIZE,
        motionTargetY: (target.y + 0.5) * TILE_SIZE,
        motionArc: BOSS_V41_CONFIG.bombArcPx,
        motionRotation: 0,
        motionRotationSpeed: 0.22,
        bobPhase: 0,
        canCarry: false,
        carriedBy: null
    };
    if (typeof ensureBombV4State === 'function') ensureBombV4State(bomb);
    gameState.bombs.push(bomb);
    state.bombShotsFired += 1;
    state.lastBombTarget = { ...target };
    return true;
}

function bossV41FireBombVolley(targets = null) {
    const state = bossV41EnsureState();
    const count = Number(BOSS_V41_CONFIG.bombThrowCount[state.phase] || 1);
    const planned = Array.isArray(targets) ? targets : bossV41FindBombTargets(count);
    let spawned = 0;
    for (let i = 0; i < Math.min(count, planned.length); i++) {
        if (bossV41SpawnBomb(planned[i])) spawned++;
    }
    // If some marked cells became blocked during the warning, replace only those
    // with a valid target instead of cancelling the whole attack.
    while (spawned < count && bossV4BombCount() < BOSS_V41_CONFIG.bossBombCap) {
        const fallback = bossV41FindBombTarget(planned);
        if (!fallback || !bossV41SpawnBomb(fallback)) break;
        planned.push(fallback);
        spawned++;
    }
    state.lastAttack = 'bomb-throw';
    state.pattern = 'bomb-throw';
    return spawned;
}

function bossV41StartTelegraph(attack) {
    const state = bossV41EnsureState();
    state.pendingAttack = attack;
    state.telegraphKind = attack;
    if (attack === 'bomb-throw') {
        const count = Math.min(BOSS_V41_CONFIG.bombThrowCount[state.phase] || 1, BOSS_V41_CONFIG.bossBombCap - bossV4BombCount());
        state.pendingBombTargets = bossV41FindBombTargets(Math.max(0, count));
        if (!state.pendingBombTargets.length) {
            state.pendingAttack = null;
            state.telegraphKind = null;
            state.telegraphTimer = 0;
            state.telegraphCells = [];
            state.bombTimer = 300;
            state.patternTimer = 180;
            return false;
        }
        state.telegraphCells = state.pendingBombTargets.map(cell => ({ ...cell, kind: 'bomb' }));
    } else {
        state.pendingBombTargets = [];
        const slamBomb = bossV41BuildSlamBomb();
        const cells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(slamBomb) : null;
        state.telegraphCells = Array.isArray(cells) && cells.length
            ? cells.map(cell => ({ x: cell.x, y: cell.y, kind: 'slam' }))
            : [{ x: slamBomb.x, y: slamBomb.y, kind: 'slam' }];
    }
    state.telegraphTimer = BOSS_V41_CONFIG.telegraphMs;
    state.patternTimer = BOSS_V41_CONFIG.telegraphMs + 80;
    return true;
}

function bossV41BuildSlamBomb() {
    const boss = gameState.boss;
    const centerX = Math.max(1, Math.min(gameState.gridWidth - 2, Math.floor(boss.x / TILE_SIZE)));
    const centerY = Math.max(1, Math.min(gameState.gridHeight - 2, Math.floor(boss.y / TILE_SIZE)));
    return {
        id: `boss-slam-${gameState.animFrame}`,
        owner: 'boss',
        bombType: 'boss-slam',
        x: centerX,
        y: centerY,
        range: BOSS_V41_CONFIG.slamRange[`phase${BossV41.state?.phase || 1}`] || 5,
        timer: 0,
        fuseTotal: 0,
        playerPassThrough: false,
        countsTowardPlayerCapacity: false,
        state: BOMB_V4_STATES.ARMED,
        motionState: 'idle',
        worldX: (centerX + 0.5) * TILE_SIZE,
        worldY: (centerY + 0.5) * TILE_SIZE,
        motionProgress: 1,
        motionTimer: 0,
        motionDuration: 0,
    };
}

function bossV41GroundSlam() {
    if (!bossV41IsActive() || typeof explodeBomb !== 'function') return 0;
    const boss = gameState.boss;
    const state = bossV41EnsureState();
    const slamBomb = bossV41BuildSlamBomb();
    gameState.bombs.push(slamBomb);
    const index = gameState.bombs.length - 1;
    const range = slamBomb.range;
    explodeBomb(index);
    state.slamCount += 1;
    state.lastAttack = 'ground-slam';
    state.pattern = 'ground-slam';
    addFloatingText('¡APLASTAMIENTO!', boss.x, boss.y - boss.height * 0.58, '#facc15');
    triggerScreenShake(10, 360);
    if (typeof sfx === 'function') sfx('boss');
    return range;
}

function bossV41ApplyPhase(boss, phase) {
    const state = bossV41EnsureState();
    if (state.lastBossRef !== boss) {
        state.lastBossRef = boss;
        state.phase = phase;
        state.patternTimer = 0;
        state.bombTimer = 0;
        state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`] * 0.65;
        state.telegraphTimer = 0;
        state.telegraphKind = null;
        state.telegraphCells = [];
        state.pendingBombTargets = [];
        state.pendingAttack = null;
        state.patternCount = 0;
        state.bombShotsFired = 0;
        state.slamCount = 0;
        state.lastBombTarget = null;
        state.active = true;
    }
    if (state.phase !== phase) {
        const previousPhase = state.phase;
        state.phase = phase;
        state.phaseTransitions += 1;
        state.patternTimer = 850; // Brief, readable breath at each phase transition.
        state.bombTimer = 1050;
        state.pendingAttack = null;
        state.telegraphKind = null;
        state.telegraphTimer = 0;
        state.telegraphCells = [];
        state.pendingBombTargets = [];
        state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`] * 0.65;
        addFloatingText(phase === 2 ? 'FASE II' : 'FASE III', boss.x, boss.y - boss.height * 0.7, phase === 2 ? '#facc15' : '#fb7185');
        if (typeof addParticles === 'function') addParticles(boss.x, boss.y, 'particleBoss', phase === 3 ? 24 : 16);
        if (typeof triggerScreenShake === 'function') triggerScreenShake(phase === 3 ? 7 : 4, phase === 3 ? 260 : 170);
        if (typeof sfx === 'function') sfx('bossRoar');
        state.lastPhaseFeedback = { from: previousPhase, to: phase };
    }
    boss.phase = phase;
    boss.bossPhase = phase;
    boss.phaseSpeedMultiplier = BOSS_V41_CONFIG.phaseSpeedMultiplier[phase];
    boss.bossAttack = state.pattern;
}

function bossV41UpdateMovement(boss, phase, dt, freeze) {
    if (!boss || boss.defeated || !player || freeze) return;
    const tile = Number(TILE_SIZE || 48);
    const motionDt = typeof getCombatMotionDt === 'function' ? getCombatMotionDt(dt) : dt;
    const scale = Math.min(Math.max(0, motionDt / 16.6667), 2);
    boss.moveTimer = Math.max(0, (Number(boss.moveTimer) || 0) - dt);

    const colliderSize = Math.min(tile * 0.84, Math.min(Number(boss.width) || tile, Number(boss.height) || tile) * 0.72);
    const canOccupy = (cx, cy) => {
        if (typeof rectCollidesSolid !== 'function') return true;
        return !rectCollidesSolid(cx - colliderSize / 2, cy - colliderSize / 2, colliderSize, colliderSize);
    };

    if (boss.moveTimer <= 0) {
        const dx = player.x + player.width / 2 - boss.x;
        const dy = player.y + player.height / 2 - boss.y;
        const sx = Math.sign(dx);
        const sy = Math.sign(dy);
        const directions = Math.abs(dx) >= Math.abs(dy)
            ? [{ x: sx, y: 0 }, { x: 0, y: sy }, { x: -sx, y: 0 }, { x: 0, y: -sy }]
            : [{ x: 0, y: sy }, { x: sx, y: 0 }, { x: 0, y: -sy }, { x: -sx, y: 0 }];
        const speed = Math.max(0.55, (Number(boss.baseSpeed) || Number(boss.speed) || 0.8) * (boss.phaseSpeedMultiplier || 1));
        boss.vx = 0;
        boss.vy = 0;
        for (const dir of directions) {
            if (!dir.x && !dir.y) continue;
            const nx = boss.x + dir.x * speed * 8;
            const ny = boss.y + dir.y * speed * 8;
            if (canOccupy(nx, ny)) {
                boss.vx = dir.x;
                boss.vy = dir.y;
                break;
            }
        }
        boss.moveTimer = 640 - phase * 70;
        if (!boss.vx && !boss.vy) boss.moveTimer = 180;
    }

    if (boss.vx || boss.vy) {
        const speed = Math.max(0.55, (Number(boss.baseSpeed) || Number(boss.speed) || 0.8) * (boss.phaseSpeedMultiplier || 1));
        const nx = boss.x + boss.vx * speed * scale;
        const ny = boss.y + boss.vy * speed * scale;
        if (canOccupy(nx, ny)) {
            boss.x = nx;
            boss.y = ny;
        } else {
            boss.vx = 0;
            boss.vy = 0;
            boss.moveTimer = 0;
        }
    }

    const bossHitbox = {
        left: boss.x - boss.width * 0.38,
        right: boss.x + boss.width * 0.38,
        top: boss.y - boss.height * 0.38,
        bottom: boss.y + boss.height * 0.38
    };
    const playerHitbox = {
        left: player.x + 5,
        right: player.x + player.width - 5,
        top: player.y + 5,
        bottom: player.y + player.height - 5
    };
    if (typeof checkOverlap === 'function' && checkOverlap(bossHitbox, playerHitbox) && typeof takeDamage === 'function') {
        takeDamage('boss-contact', boss.x, boss.y);
    }
}

function updateBossV41(dt) {
    if (!BOSS_V41_CONFIG.enabled) return;
    const state = bossV41EnsureState();
    if (!bossV41IsActive()) {
        state.active = false;
        state.telegraphTimer = 0;
        state.pendingAttack = null;
        state.telegraphCells = [];
        state.pendingBombTargets = [];
        bossV41SetHUD(typeof gameState !== 'undefined' ? (gameState.boss || null) : null, 0);
        return;
    }

    const boss = gameState.boss;
    const elapsed = Math.max(0, Number(dt) || 0);
    // These timers used to live in the legacy updateBoss(), which now delegates
    // to this module. Without decrementing them here the boss stayed invulnerable.
    boss.invuln = Math.max(0, (Number(boss.invuln) || 0) - elapsed);
    boss.flash = Math.max(0, (Number(boss.flash) || 0) - elapsed);

    const phase = bossV41GetPhase(boss);
    bossV41ApplyPhase(boss, phase);
    bossV41SetHUD(boss, phase);

    state.bombTimer -= elapsed;
    state.slamTimer -= elapsed;
    state.patternTimer = Math.max(0, state.patternTimer - elapsed);
    let attackReleasedThisFrame = false;

    if (state.telegraphTimer > 0) {
        state.telegraphTimer = Math.max(0, state.telegraphTimer - elapsed);
        if (state.telegraphTimer === 0 && state.pendingAttack) {
            const attack = state.pendingAttack;
            state.pendingAttack = null;
            state.patternCount += 1;
            attackReleasedThisFrame = true;
            if (attack === 'ground-slam') {
                bossV41GroundSlam();
                state.slamTimer = BOSS_V41_CONFIG.slamIntervalMs[`phase${phase}`];
            } else {
                bossV41FireBombVolley(state.pendingBombTargets);
                state.bombTimer = BOSS_V41_CONFIG.bombIntervalMs[`phase${phase}`];
                state.bombShotsFired += 1;
            }
            state.pendingBombTargets = [];
            state.telegraphCells = [];
            state.telegraphKind = null;
            state.patternTimer = 260;
        }
    } else if (state.patternTimer <= 0) {
        let attack = null;
        if (state.slamTimer <= 0) attack = 'ground-slam';
        else if (state.bombTimer <= 0 && bossV4BombCount() < BOSS_V41_CONFIG.bossBombCap) attack = 'bomb-throw';
        if (attack) {
            if (!bossV41StartTelegraph(attack)) state.patternTimer = 180;
        } else {
            if (state.bombTimer <= 0) state.bombTimer = 180;
            state.patternTimer = 120;
        }
    }

    // A warning stays attached to its actual targets: the boss does not drift
    // during the tell, so a slam's marked blast cells match its release point.
    bossV41UpdateMovement(boss, phase, elapsed, state.telegraphTimer > 0 || attackReleasedThisFrame);
}

function bossV41DrawTelegraphWorld() {
    if (!bossV41IsActive()) return;
    const state = bossV41EnsureState();
    if (state.telegraphTimer <= 0 || typeof ctx === 'undefined' || !ctx) return;
    const cam = gameState.camera || { x: 0, y: 0 };
    const t = Math.max(0, Math.min(1, state.telegraphTimer / BOSS_V41_CONFIG.telegraphMs));
    const pulse = 0.18 + (1 - t) * 0.20;
    ctx.save();
    ctx.translate(-Math.floor(cam.x || 0), -Math.floor(cam.y || 0));

    if (Array.isArray(state.telegraphCells) && state.telegraphCells.length) {
        for (const cell of state.telegraphCells) {
            const px = cell.x * TILE_SIZE;
            const py = cell.y * TILE_SIZE;
            const isSlam = cell.kind === 'slam' || state.telegraphKind === 'ground-slam';
            ctx.globalAlpha = pulse + (isSlam ? 0.10 : 0.04);
            ctx.fillStyle = isSlam ? '#facc15' : '#fb7185';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.globalAlpha = 0.75 + (1 - t) * 0.25;
            ctx.strokeStyle = isSlam ? '#fde68a' : '#fecdd3';
            ctx.lineWidth = 3;
            ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            ctx.beginPath();
            ctx.moveTo(px + TILE_SIZE * 0.28, py + TILE_SIZE * 0.28);
            ctx.lineTo(px + TILE_SIZE * 0.72, py + TILE_SIZE * 0.72);
            ctx.moveTo(px + TILE_SIZE * 0.72, py + TILE_SIZE * 0.28);
            ctx.lineTo(px + TILE_SIZE * 0.28, py + TILE_SIZE * 0.72);
            ctx.stroke();
        }
    } else {
        // Fallback signal while map data is unavailable: never hide the warning.
        const boss = gameState.boss;
        ctx.globalAlpha = pulse + 0.15;
        ctx.strokeStyle = state.telegraphKind === 'ground-slam' ? '#facc15' : '#fb7185';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, TILE_SIZE * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();
}

function bossV41FindSpawnCellV626() {
    if (!gameState?.grid || !player) return null;
    const width = Math.max(3, Number(gameState.gridWidth) || gameState.grid[0]?.length || 15);
    const height = Math.max(3, Number(gameState.gridHeight) || gameState.grid.length || 15);
    const px = Math.floor((Number(player.x) + Number(player.width || 0) / 2) / Number(TILE_SIZE || 48));
    const py = Math.floor((Number(player.y) + Number(player.height || 0) / 2) / Number(TILE_SIZE || 48));
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const candidates = [];
    for (let radius = 0; radius <= Math.max(width, height); radius++) {
        for (let y = Math.max(1, cy - radius); y <= Math.min(height - 2, cy + radius); y++) {
            for (let x = Math.max(1, cx - radius); x <= Math.min(width - 2, cx + radius); x++) {
                if (Math.abs(x - cx) !== radius && Math.abs(y - cy) !== radius) continue;
                if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) continue;
                if (Math.abs(x - px) + Math.abs(y - py) < 6) continue;
                candidates.push({ x, y });
            }
        }
        if (candidates.length) break;
    }
    return candidates[0] || null;
}

function bossV41BuildEntityV626() {
    if (!gameState || gameState.roomType?.id !== 'BOSS' || !gameState.grid) return null;
    const spawn = bossV41FindSpawnCellV626();
    if (!spawn) return null;
    const tile = Number(TILE_SIZE || 48);
    const level = Math.max(1, Number(gameState.level) || 1);
    const meta = typeof getBiomeMetadataV49 === 'function' ? getBiomeMetadataV49(level) : null;
    const maxHp = Math.max(20, Math.round(18 + level * 0.9));
    const speed = Math.max(0.72, 0.72 + Math.min(0.45, level * 0.008));
    return {
        id: `boss-${level}-${gameState.gridRevision || 0}`,
        name: 'Guardián del bioma',
        x: spawn.x * tile + tile / 2,
        y: spawn.y * tile + tile / 2,
        width: tile * 1.35,
        height: tile * 1.35,
        vx: 0,
        vy: 0,
        baseSpeed: speed,
        speed,
        moveTimer: 420,
        hp: maxHp,
        maxHp,
        health: maxHp,
        maxHealth: maxHp,
        phase: 1,
        bossPhase: 1,
        phaseSpeedMultiplier: 1,
        invuln: 0,
        flash: 0,
        defeated: false,
        contactDamage: 1,
        biomeIdV626: meta?.id || gameState.biomeV49?.id || 'unknown',
        stageV626: Number(meta?.stage) || Number(gameState.biomeV49?.stage) || 4,
        spawnedByV626: 'biome-exam'
    };
}

function spawnBossV626() {
    if (!gameState || gameState.roomType?.id !== 'BOSS') return false;
    if (gameState.boss && !gameState.boss.defeated) return true;
    const boss = bossV41BuildEntityV626();
    if (!boss) return false;
    gameState.boss = boss;
    bossV41Reset();
    bossV41EnsureState().active = true;
    return true;
}

function bossV41WrapFunctions() {
    if (BossV41.installed) return true;
    if (typeof update !== 'function' || typeof draw !== 'function' || typeof initLevel !== 'function') return false;

    BossV41.originalUpdate = update;
    BossV41.originalDraw = draw;
    BossV41.originalInitLevel = initLevel;

    window.update = function updateV41(dt) {
        BossV41.originalUpdate(dt);
        // The legacy loop returns early while paused, but this wrapper used to
        // keep ticking the boss timers anyway. Pause must freeze the whole fight.
        if (typeof gameState === 'undefined' || !gameState.isPlaying || gameState.paused) return;
        updateBossV41(dt);
    };

    window.draw = function drawV41() {
        BossV41.originalDraw();
        bossV41DrawTelegraphWorld();
    };

    window.initLevel = function initLevelV41(...args) {
        const result = BossV41.originalInitLevel(...args);
        bossV41Reset();
        return result;
    };

    if (typeof startGame === 'function') {
        BossV41.originalStartGame = startGame;
        window.startGame = function startGameV41(...args) {
            bossV41Reset();
            return BossV41.originalStartGame(...args);
        };
        BossV41.startWrapped = true;
    }

    BossV41.installed = true;
    BossV41.updateWrapped = true;
    BossV41.drawWrapped = true;
    BossV41.initWrapped = true;
    bossV41EnsureState();
    return true;
}

function bossV41Bootstrap() {
    if (bossV41WrapFunctions()) return;
    setTimeout(bossV41Bootstrap, 50);
}

// Compatibilidad de diagnóstico v3.x/v4.0: mismos puntos de acceso, nueva implementación.
window.BOSS_V41_CONFIG = BOSS_V41_CONFIG;
window.BOSS_V325_CONFIG = BOSS_V41_CONFIG;
window.BossV41 = BossV41;
window.BossV325 = BossV41;
window.updateBossV41 = updateBossV41;
window.bossV41UpdateMovement = bossV41UpdateMovement;
window.updateBossV325 = updateBossV41;
window.resetBossV41 = bossV41Reset;
window.resetBossV325 = bossV41Reset;
window.bossV41GetPhase = bossV41GetPhase;
window.bossV325GetPhase = bossV41GetPhase;
window.bossV41SpawnBomb = bossV41SpawnBomb;
window.bossV4SpawnBomb = bossV41SpawnBomb;
window.bossV4BombVolley = bossV41FireBombVolley;
window.bossV4BombCount = bossV4BombCount;
window.bossV41GroundSlam = bossV41GroundSlam;
window.spawnBossV626 = spawnBossV626;
window.bossV41BuildEntityV626 = bossV41BuildEntityV626;
window.BOSS_V4_CONFIG = BOSS_V41_CONFIG;

bossV41Bootstrap();

;
// === js/28-roguelike-update.js ===
/*
 * BOMBERMAN ROGUELIKE — actualización de interfaz v6.30.1
 * Construcción y sinergias: estado real, progreso y previsualización
 *
 * Adds a lightweight meta layer over the existing run:
 * - Better in-run coin economy with clear/resource sinks.
 * - Relic offers with rarity, duplicate protection and reroll.
 * - Tag-based synergies with derived bonuses.
 * - Next-room route choices: standard, treasure, elite, shrine.
 * - Safe wrappers around the existing run lifecycle; no replacement game loop.
 */

const ROGUELIKE_V327_CONFIG = Object.freeze({
    enabled: true,
    rerollCost: 4,
    relicOfferCount: 3,
    roomOfferCount: 3,
    maxRelics: 12,
    minBombFuseMs: 700,
    roomClearBaseCoins: 6,
    blockCoinBase: 0,
    enemyCoinBase: 0,
    treasureStartCoins: 8,
    eliteExtraEnemies: 1,
    eliteRelicQualityBoost: 1,
    shrineHeal: 1,
    version: '3.27.0'
});


const ROGUELIKE_ROOM_PLANS_V327 = Object.freeze([
    {
        id: 'standard',
        name: 'ESTÁNDAR',
        icon: '◆',
        desc: 'Equilibrio entre combate y recursos.',
        startCoins: 0,
        clearBonus: 0,
        risk: 'normal',
        relicQualityBoost: 0
    },
    {
        id: 'treasure',
        name: 'TESORO',
        icon: '✦',
        desc: `+${ROGUELIKE_V327_CONFIG.treasureStartCoins} monedas al entrar.`,
        startCoins: ROGUELIKE_V327_CONFIG.treasureStartCoins,
        clearBonus: 2,
        risk: 'bajo',
        relicQualityBoost: 0
    },
    {
        id: 'elite',
        name: 'ÉLITE',
        icon: '☠',
        desc: `+${ROGUELIKE_V327_CONFIG.eliteExtraEnemies} enemigo y mejor oferta de reliquias.`,
        startCoins: 0,
        clearBonus: 8,
        risk: 'alto',
        relicQualityBoost: ROGUELIKE_V327_CONFIG.eliteRelicQualityBoost
    },
    {
        id: 'shrine',
        name: 'SANTUARIO',
        icon: '✚',
        desc: `+${ROGUELIKE_V327_CONFIG.shrineHeal} vida al entrar si falta vida.`,
        startCoins: 0,
        clearBonus: 1,
        risk: 'bajo',
        relicQualityBoost: 1
    }
,
    {
        id: 'boss',
        name: 'JEFE',
        icon: '☠',
        desc: 'Sala de examen del bioma.',
        startCoins: 0,
        clearBonus: 0,
        risk: 'alto',
        relicQualityBoost: 1
    }
]);

const ROGUELIKE_SYNERGIES_V327 = Object.freeze([
    {
        id: 'double_burn',
        name: 'DOBLE COMBUSTIÓN',
        req: { combustion: 2 },
        desc: '+1 al límite máximo de alcance. El alcance actual no cambia hasta que consigas otra mejora de alcance de bomba.'
    },
    {
        id: 'chain_crew',
        name: 'CUADRILLA DE DEMOLICIÓN',
        req: { demolition: 2 },
        desc: '+1 al límite máximo de bombas. La capacidad actual no aumenta hasta que consigas otra mejora de capacidad de bombas.'
    },
    {
        id: 'merchant_route',
        name: 'RUTA DE COMERCIANTES',
        req: { economy: 2 },
        desc: '+25 % de monedas obtenidas mediante la economía de esta run.'
    },
    {
        id: 'overclock',
        name: 'SOBRECARGA',
        req: { mobility: 2 },
        desc: '+0,2 a la velocidad de movimiento actual.'
    },
    {
        id: 'fortress',
        name: 'FORTALEZA',
        req: { survival: 2 },
        desc: '+1 a la vida máxima. No recupera vida actual al activarse.'
    },
    {
        id: 'volatile_chain',
        name: 'CADENA VOLÁTIL',
        req: { risk: 1, demolition: 1 },
        desc: '+1 al límite máximo de alcance. Se acumula con Doble combustión; el alcance actual no cambia hasta conseguir otra mejora de alcance de bomba.'
    }
]);

const ROGUELIKE_SYNERGY_TAG_META_V327 = Object.freeze({
    combustion: { label: 'Combustión' },
    demolition: { label: 'Demolición' },
    economy: { label: 'Economía' },
    mobility: { label: 'Movilidad' },
    survival: { label: 'Supervivencia' },
    risk: { label: 'Riesgo' }
});

const ROGUELIKE_V327 = {
    installed: false,
    original: {
        updateUI: null,
        startGame: null,
        initLevel: null,
        completeLevel: null,
        explodeBomb: null,
        placeBomb: null,
        gameOver: null
    },
    runActive: false,
    currentRoomPlan: 'standard',
    pendingRoomPlan: 'standard',
    relicOffers: [],
    roomOffers: [],
    selectedRelic: null,
    rerollsUsed: 0,
    coinStats: {
        blocks: 0,
        enemies: 0,
        roomClear: 0,
        rerolls: 0
    },
    appliedBonus: {
        bombs: 0,
        range: 0,
        speed: 0,
        maxHealth: 0
    },
    lastRoomOfferKey: '',
    lastRelicOfferKey: ''
};

function rogueV327Num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function rogueV327Clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rogueV327Random() {
    return Math.random();
}

function rogueV327GetRelic(id) {
    const canonical = Array.isArray(RELICS) ? RELICS : [];
    return canonical.find(relic => relic.id === id && relic.roguelikeOnly) || null;
}

function rogueV327GetPlan(id) {
    return ROGUELIKE_ROOM_PLANS_V327.find(plan => plan.id === id) || ROGUELIKE_ROOM_PLANS_V327[0];
}

function rogueV327ResetRelicRuntime() {
    ROGUELIKE_V327.relicOffers = [];
    ROGUELIKE_V327.roomOffers = [];
    ROGUELIKE_V327.selectedRelic = null;
    ROGUELIKE_V327.rerollsUsed = 0;
    ROGUELIKE_V327.appliedBonus = { bombs: 0, range: 0, speed: 0, maxHealth: 0 };
}

function rogueV327EnsureEconomyState() {
    if (!gameState) return;
    const current = rogueV327Num(gameState.coins, NaN);
    if (!Number.isFinite(current)) gameState.coins = 0;
    if (!gameState.roguelikeV327) {
        gameState.roguelikeV327 = {
            version: ROGUELIKE_V327_CONFIG.version,
            currentRoomPlan: 'standard',
            pendingRoomPlan: 'standard',
                    synergies: [],
            totalCoinsEarned: 0,
            totalCoinsSpent: 0
        };
    }
}

function rogueV327RefreshGameStateMirror() {
    rogueV327EnsureEconomyState();
    if (!gameState || !gameState.roguelikeV327) return;
    gameState.roguelikeV327.currentRoomPlan = ROGUELIKE_V327.currentRoomPlan;
    gameState.roguelikeV327.pendingRoomPlan = ROGUELIKE_V327.pendingRoomPlan;
    gameState.roguelikeV327.synergies = rogueV327GetActiveSynergies().map(s => s.id);
}

function rogueV327GetCoins() {
    try {
        if (gameState && Number.isFinite(Number(gameState.coins))) return Math.max(0, Math.floor(Number(gameState.coins)));
    } catch (_) {}
    return 0;
}

function rogueV327SetCoins(value) {
    if (!gameState) return;
    gameState.coins = Math.max(0, Math.floor(rogueV327Num(value)));
    try {
        if (typeof updateUI === 'function') updateUI();
    } catch (_) {}
}

function rogueV327AddCoins(amount, source = 'other') {
    const base = Math.max(0, rogueV327Num(amount));
    if (base <= 0) return 0;

    const multiplier = 1 + rogueV327GetRelicBonuses().coinMultiplier;
    const finalAmount = Math.max(0, Math.round(base * multiplier));
    rogueV327SetCoins(rogueV327GetCoins() + finalAmount);

    if (gameState && gameState.roguelikeV327) {
        gameState.roguelikeV327.totalCoinsEarned += finalAmount;
    }

    if (source === 'block') ROGUELIKE_V327.coinStats.blocks += finalAmount;
    if (source === 'enemy') ROGUELIKE_V327.coinStats.enemies += finalAmount;
    if (source === 'room-clear') ROGUELIKE_V327.coinStats.roomClear += finalAmount;
    return finalAmount;
}

function rogueV327SpendCoins(amount, source = 'other') {
    const cost = Math.max(0, Math.floor(rogueV327Num(amount)));
    if (cost <= 0) return true;
    if (rogueV327GetCoins() < cost) return false;

    rogueV327SetCoins(rogueV327GetCoins() - cost);
    ROGUELIKE_V327.coinStats.rerolls += source === 'reroll' ? 1 : 0;
    if (gameState && gameState.roguelikeV327) gameState.roguelikeV327.totalCoinsSpent += cost;
    return true;
}

function rogueV327GetRelicBonuses() {
    const result = {
        bombs: 0,
        range: 0,
        speed: 0,
        maxHealth: 0,
        coinBlock: ROGUELIKE_V327_CONFIG.blockCoinBase,
        coinEnemy: ROGUELIKE_V327_CONFIG.enemyCoinBase,
        coinClear: 0,
        coinMultiplier: 0,
        fuseMs: 0,
        roomHeal: 0
    };

    for (const relicState of (Array.isArray(gameState?.relics) ? gameState.relics : [])) {
        const id = relicState?.id;
        const relic = rogueV327GetRelic(id);
        if (!relic) continue;
        const b = relic.bonuses || {};
        for (const key of Object.keys(result)) result[key] += rogueV327Num(b[key]);
    }

    const counts = rogueV327GetTagCounts();
    for (const synergy of ROGUELIKE_SYNERGIES_V327) {
        if (!rogueV327ReqMet(counts, synergy.req)) continue;
        if (synergy.id === 'double_burn') result.range += 1;
        if (synergy.id === 'chain_crew') result.bombs += 1;
        if (synergy.id === 'merchant_route') result.coinMultiplier += 0.25;
        if (synergy.id === 'overclock') result.speed += 0.2;
        if (synergy.id === 'fortress') result.maxHealth += 1;
        if (synergy.id === 'volatile_chain') result.range += 1;
    }

    return result;
}

function rogueV327GetTagCounts() {
    const counts = {};
    for (const relicState of (Array.isArray(gameState?.relics) ? gameState.relics : [])) {
        const id = relicState?.id;
        const relic = rogueV327GetRelic(id);
        if (!relic) continue;
        for (const tag of relic.tags || []) counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
}

function rogueV327ReqMet(counts, req) {
    return Object.entries(req).every(([tag, needed]) => (counts[tag] || 0) >= needed);
}

function rogueV327GetActiveSynergies() {
    const counts = rogueV327GetTagCounts();
    return ROGUELIKE_SYNERGIES_V327.filter(synergy => rogueV327ReqMet(counts, synergy.req));
}

function rogueV327ApplyDerivedBonuses() {
    if (!player) return;
    const target = rogueV327GetRelicBonuses();
    const delta = { speed: target.speed - ROGUELIKE_V327.appliedBonus.speed };
    if ('speed' in player) {
        const cap = typeof getPlayerCapacityCapsV67 === 'function' ? getPlayerCapacityCapsV67() : { speed: 7 };
        const minSpeed = Number(PLAYER_LIMITS_V67?.base?.speed) || 3;
        player.speed = rogueV327Clamp(rogueV327Num(player.speed, minSpeed) + delta.speed, minSpeed, Number(cap.speed) || 7);
    }
    if (typeof clampPlayerCapacitiesV67 === 'function') clampPlayerCapacitiesV67();
    ROGUELIKE_V327.appliedBonus = target;
}

function rogueV327AcquireRelic(id) {
    const relic = rogueV327GetRelic(id);
    if (!relic) return false;
    const ownedStrategyCount = Array.isArray(gameState?.relics)
        ? gameState.relics.filter(item => item?.roguelikeOnly).length
        : 0;
    if (Array.isArray(gameState?.relics) && gameState.relics.some(item => item?.id === id)) return false;
    if (ownedStrategyCount >= ROGUELIKE_V327_CONFIG.maxRelics) return false;
    if (typeof grantRelic !== 'function' || !grantRelic(relic)) return false;

    ROGUELIKE_V327.selectedRelic = id;
    rogueV327ApplyDerivedBonuses();
    rogueV327RefreshGameStateMirror();
    try {
        const rarity = String(relic.rarity || '').toLowerCase();
        const textColor = rarity === 'rare' ? '#fca5a5' : rarity === 'uncommon' ? '#93c5fd' : '#fde68a';
        if (typeof addFloatingText === 'function' && player) addFloatingText(`+ ${relic.name}`, player.x, player.y, textColor);
    } catch (_) {}
    return true;
}

function rogueV327RollRelicOffers(count = ROGUELIKE_V327_CONFIG.relicOfferCount, qualityBoost = 0) {
    const owned = new Set(Array.isArray(gameState?.relics) ? gameState.relics.map(r => r.id) : []);
    const candidates = (Array.isArray(RELICS) ? RELICS : []).filter(relic => relic.roguelikeOnly && !owned.has(relic.id));
    if (!candidates.length) return [];

    const weighted = [];
    for (const relic of candidates) {
        const rarity = String(relic.rarity || '').toLowerCase();
        let weight = rarity === 'common' ? 8 : rarity === 'uncommon' ? 4 : 1;
        if (qualityBoost > 0 && rarity !== 'common') weight += qualityBoost * (rarity === 'rare' ? 5 : 2);
        const tagCounts = rogueV327GetTagCounts();
        for (const tag of relic.tags || []) {
            if (tagCounts[tag] > 0) weight += 2 * Math.min(3, tagCounts[tag]);
        }
        weighted.push({ relic, weight });
    }

    const result = [];
    const pool = weighted.slice();
    const target = Math.min(count, pool.length);
    while (result.length < target && pool.length) {
        const total = pool.reduce((sum, item) => sum + item.weight, 0);
        let cursor = rogueV327Random() * total;
        let selectedIndex = 0;
        for (let i = 0; i < pool.length; i++) {
            cursor -= pool[i].weight;
            if (cursor <= 0) {
                selectedIndex = i;
                break;
            }
        }
        result.push(pool[selectedIndex].relic);
        pool.splice(selectedIndex, 1);
    }

    ROGUELIKE_V327.relicOffers = result.map(relic => relic.id);
    ROGUELIKE_V327.lastRelicOfferKey = result.map(relic => relic.id).join('|');
    return result;
}

function rogueV327RollRoomOffers(count = ROGUELIKE_V327_CONFIG.roomOfferCount) {
    const pool = ROGUELIKE_ROOM_PLANS_V327.filter(plan => plan.id !== 'boss');
    const result = [];
    const target = Math.min(count, pool.length);

    while (result.length < target && pool.length) {
        const index = Math.floor(rogueV327Random() * pool.length);
        result.push(pool.splice(index, 1)[0]);
    }

    // Evitamos una pantalla donde no exista la opción estándar.
    if (result.length && !result.some(plan => plan.id === 'standard')) {
        const standard = rogueV327GetPlan('standard');
        result[result.length - 1] = standard;
    }

    ROGUELIKE_V327.roomOffers = result;
    ROGUELIKE_V327.pendingRoomPlan = result[0]?.id || 'standard';
    ROGUELIKE_V327.lastRoomOfferKey = result.map(plan => plan.id).join('|');
    rogueV327RefreshGameStateMirror();
    return result;
}

function rogueV327ChooseRoomPlan(id) {
    const plan = rogueV327GetPlan(id);
    if (ROGUELIKE_V327.roomOffers.length && !ROGUELIKE_V327.roomOffers.some(item => item.id === plan.id)) return false;
    ROGUELIKE_V327.pendingRoomPlan = plan.id;
    rogueV327RefreshGameStateMirror();
    rogueV327RenderStrategyPanel();
    return true;
}

function rogueV327IsBossExamV626() {
    try {
        const meta = typeof getBiomeMetadataV49 === 'function' ? getBiomeMetadataV49(gameState.level) : null;
        return Boolean(meta && Number(meta.stage) === 4 && meta.bossEnabled !== false && String(meta.examRoomType || 'BOSS').toUpperCase() === 'BOSS');
    } catch (_) {
        return false;
    }
}

function rogueV327ResolveRoomTypeKeyV626() {
    if (rogueV327IsBossExamV626()) return 'BOSS';
    const planId = ROGUELIKE_V327.pendingRoomPlan || ROGUELIKE_V327.currentRoomPlan || 'standard';
    const map = { standard: 'STANDARD', treasure: 'TREASURE', elite: 'ELITE', shrine: 'SHRINE' };
    return map[planId] || 'STANDARD';
}

function rogueV327ApplyRoomPlan() {
    rogueV327EnsureEconomyState();

    if (rogueV327IsBossExamV626()) {
        ROGUELIKE_V327.currentRoomPlan = 'boss';
        ROGUELIKE_V327.pendingRoomPlan = 'standard';
        if (gameState && gameState.roguelikeV327) gameState.roguelikeV327.currentRoomPlan = 'boss';
        const bossPlan = rogueV327GetPlan('boss');
        rogueV327RefreshGameStateMirror();
        rogueV327UpdateRoomBanner(bossPlan);
        return;
    }

    const plan = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan);
    ROGUELIKE_V327.currentRoomPlan = plan.id;
    ROGUELIKE_V327.pendingRoomPlan = 'standard';
    if (gameState && gameState.roguelikeV327) gameState.roguelikeV327.currentRoomPlan = plan.id;

    if (plan.startCoins > 0) rogueV327AddCoins(plan.startCoins, 'room-start');

    const extraHeal = plan.id === 'shrine' ? ROGUELIKE_V327_CONFIG.shrineHeal : 0;
    const relicHeal = rogueV327GetRelicBonuses().roomHeal;
    const heal = extraHeal + relicHeal;
    if (heal > 0) rogueV327HealPlayer(heal);

    if (plan.id === 'elite') rogueV327SpawnExtraEnemy();

    rogueV327RefreshGameStateMirror();
    rogueV327UpdateRoomBanner(plan);
}

function rogueV327HealPlayer(amount) {
    if (!player || amount <= 0) return;
    const cap = 'maxHealth' in player ? player.maxHealth : ('maxHp' in player ? player.maxHp : undefined);
    if ('health' in player) player.health = cap ? Math.min(cap, rogueV327Num(player.health) + amount) : rogueV327Num(player.health) + amount;
    if ('hp' in player && !('health' in player)) player.hp = cap ? Math.min(cap, rogueV327Num(player.hp) + amount) : rogueV327Num(player.hp) + amount;
    try {
        if (typeof updateUI === 'function') updateUI();
    } catch (_) {}
}

function rogueV327SpawnExtraEnemy() {
    try {
        if (!gameState || gameState.roomType?.id === 'BOSS' || !Array.isArray(gameState.enemies) || !Array.isArray(gameState.grid)) return;
        const spawnCap = typeof getDifficultyEnemySpawnCapV619 === 'function'
            ? getDifficultyEnemySpawnCapV619(gameState.level)
            : Math.min(12, 2 + Math.max(1, Math.floor(Number(gameState.level) || 1)));
        if (gameState.enemies.length >= spawnCap) return;

        const width = gameState.gridWidth || gameState.grid[0]?.length || 15;
        const height = gameState.gridHeight || gameState.grid.length || 15;
        let spot = null;

        for (let attempts = 0; attempts < 80 && !spot; attempts++) {
            const gx = 1 + Math.floor(rogueV327Random() * Math.max(1, width - 2));
            const gy = 1 + Math.floor(rogueV327Random() * Math.max(1, height - 2));
            const tile = gameState.grid[gy] && gameState.grid[gy][gx];
            if (tile !== 0 && tile !== 'EMPTY') continue;
            if (player) {
                const px = Math.floor((rogueV327Num(player.x) + rogueV327Num(player.width, 24) / 2) / rogueV327Num(window.TILE_SIZE, 48));
                const py = Math.floor((rogueV327Num(player.y) + rogueV327Num(player.height, 24) / 2) / rogueV327Num(window.TILE_SIZE, 48));
                if (Math.abs(gx - px) + Math.abs(gy - py) < 5) continue;
            }
            spot = { gx, gy };
        }

        if (!spot) return;
        const tileSize = rogueV327Num(window.TILE_SIZE, 48);
        const spec = typeof resolveEnemySpawnSpecV626 === 'function'
            ? resolveEnemySpawnSpecV626({ index: gameState.enemies.length, count: gameState.enemies.length + 1 })
            : null;
        const extra = typeof makeEnemyEntityV626 === 'function'
            ? makeEnemyEntityV626({ x:spot.gx, y:spot.gy }, spec, { source: 'roguelike-extra', elite: true, changeTimer: 20 })
            : null;
        if (!extra) return;
        extra.x = spot.gx * tileSize + tileSize / 2;
        extra.y = spot.gy * tileSize + tileSize / 2;
        extra.vx = rogueV327Num(extra.vx, 1);
        extra.vy = 0;
        extra.changeTimer = 20;
        gameState.enemies.push(extra);
    } catch (_) {}
}

function rogueV327RewardRoomClear() {
    const current = rogueV327GetPlan(ROGUELIKE_V327.currentRoomPlan);
    const bonuses = rogueV327GetRelicBonuses();
    const amount = ROGUELIKE_V327_CONFIG.roomClearBaseCoins + current.clearBonus + bonuses.coinClear;
    const gained = rogueV327AddCoins(amount, 'room-clear');
    return gained;
}

function rogueV327HandleExplosionEconomy(beforeState) {
    try {
        if (!gameState) return;

        const afterBlocks = Number.isFinite(Number(gameState.blocksBroken)) ? Number(gameState.blocksBroken) : null;
        const blockDelta = afterBlocks !== null && beforeState.blocksBroken !== null
            ? Math.max(0, afterBlocks - beforeState.blocksBroken)
            : 0;
        const enemyDelta = beforeState.enemyCount - (Array.isArray(gameState.enemies) ? gameState.enemies.length : beforeState.enemyCount);

        const coinsAfterOriginal = rogueV327GetCoins();
        const existingCoinGain = Math.max(0, coinsAfterOriginal - beforeState.coins);
        const bonuses = rogueV327GetRelicBonuses();

        // No duplicamos la economía base de la versión anterior.
        // Solo añadimos el bonus propio de v3.27 y el porcentaje derivado de reliquias.
        const relicBonusCoins = Math.round(existingCoinGain * bonuses.coinMultiplier);
        const salvageCoins = Math.max(0, Math.floor(blockDelta * bonuses.coinBlock));
        const bountyCoins = Math.max(0, Math.floor(enemyDelta * bonuses.coinEnemy));
        const extra = relicBonusCoins + salvageCoins + bountyCoins;

        if (extra > 0) {
            rogueV327SetCoins(coinsAfterOriginal + extra);
            if (gameState.roguelikeV327) gameState.roguelikeV327.totalCoinsEarned += extra;
            ROGUELIKE_V327.coinStats.blocks += salvageCoins;
            ROGUELIKE_V327.coinStats.enemies += bountyCoins;
            if (typeof addFloatingText === 'function' && player) {
                addFloatingText(`+${extra}¢`, player.x, player.y, '#fbbf24');
            }
        }
    } catch (_) {}
}

function rogueV327EnhanceRewardScreen() {
    if (!document) return;
    const screen = document.getElementById('level-complete-screen');
    const legacyOptions = document.getElementById('upgrade-options');
    if (!screen || !legacyOptions) return;

    let panel = document.getElementById('rogue-v327-strategy');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'rogue-v327-strategy';
        panel.className = 'rogue-v327-strategy';
        screen.insertBefore(panel, legacyOptions);
    }

    if (!ROGUELIKE_V327.roomOffers.length) rogueV327RollRoomOffers();
    const relicQuality = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).relicQualityBoost;
    if (!ROGUELIKE_V327.relicOffers.length) rogueV327RollRelicOffers(ROGUELIKE_V327_CONFIG.relicOfferCount, relicQuality);
    rogueV327RenderStrategyPanel();

    const previousHandlers = new WeakMap();
    Array.from(legacyOptions.children).forEach(card => {
        if (!card || previousHandlers.has(card)) return;
        const oldHandler = card.onclick;
        if (typeof oldHandler !== 'function') return;
        previousHandlers.set(card, oldHandler);
        card.onclick = event => {
            rogueV327CommitRewardChoice();
            return oldHandler.call(card, event);
        };
    });
}

function rogueV327CommitRewardChoice() {
    if (ROGUELIKE_V327.selectedRelic) rogueV327AcquireRelic(ROGUELIKE_V327.selectedRelic);
    else if (ROGUELIKE_V327.relicOffers[0]) {
        rogueV327AcquireRelic(ROGUELIKE_V327.relicOffers[0]);
    }

    ROGUELIKE_V327.currentRoomPlan = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).id;
    rogueV327RefreshGameStateMirror();
}

function rogueV327GetSynergyProgressText(synergy, counts) {
    return Object.entries(synergy.req).map(([tag, needed]) => {
        const label = ROGUELIKE_SYNERGY_TAG_META_V327[tag]?.label || tag;
        const have = Math.min(Math.max(0, Number(counts[tag]) || 0), needed);
        return `${label} ${have}/${needed}`;
    }).join(' · ');
}

function rogueV327GetPreviewTagCounts(relicId) {
    const counts = { ...rogueV327GetTagCounts() };
    const relic = relicId ? rogueV327GetRelic(relicId) : null;
    if (!relic) return counts;

    const alreadyOwned = Array.isArray(gameState?.relics)
        && gameState.relics.some(item => item?.id === relic.id);
    if (!alreadyOwned) {
        for (const tag of relic.tags || []) counts[tag] = (counts[tag] || 0) + 1;
    }
    return counts;
}

function rogueV327EscapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function rogueV327RenderStrategyPanel() {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById('rogue-v327-strategy');
    if (!panel) return;

    const previousScrollTop = Number(panel.scrollTop) || 0;
    const coins = rogueV327GetCoins();
    const pending = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan);
    const currentCounts = rogueV327GetTagCounts();
    const activeSynergies = rogueV327GetActiveSynergies();
    const activeIds = new Set(activeSynergies.map(synergy => synergy.id));
    const pendingSynergies = ROGUELIKE_SYNERGIES_V327.filter(synergy => !activeIds.has(synergy.id));
    const selectedRelic = ROGUELIKE_V327.selectedRelic
        ? rogueV327GetRelic(ROGUELIKE_V327.selectedRelic)
        : null;
    const previewCounts = selectedRelic ? rogueV327GetPreviewTagCounts(selectedRelic.id) : null;
    const previewActive = previewCounts
        ? ROGUELIKE_SYNERGIES_V327.filter(synergy => rogueV327ReqMet(previewCounts, synergy.req))
        : [];
    const previewActiveIds = new Set(previewActive.map(synergy => synergy.id));
    const newlyActivated = previewActive.filter(synergy => !activeIds.has(synergy.id));
    const selectedTags = new Set(selectedRelic?.tags || []);
    const affectedSynergies = selectedRelic
        ? ROGUELIKE_SYNERGIES_V327.filter(synergy => Object.keys(synergy.req).some(tag => selectedTags.has(tag)))
        : [];

    const synergyCard = (synergy, isActive, counts, statusText) => `
        <article class="rogue-v327-synergy-card ${isActive ? 'is-active' : 'is-pending'}">
            <div class="rogue-v327-synergy-card-head">
                <strong class="rogue-v327-synergy-name">${rogueV327EscapeHtml(synergy.name)}</strong>
                <span class="rogue-v327-synergy-status">${rogueV327EscapeHtml(statusText)}</span>
            </div>
            <p class="rogue-v327-synergy-effect">${rogueV327EscapeHtml(synergy.desc)}</p>
            <div class="rogue-v327-synergy-reqs">${rogueV327EscapeHtml(rogueV327GetSynergyProgressText(synergy, counts))}</div>
        </article>`;

    panel.innerHTML = `
        <div class="rogue-v327-head">
            <div>
                <div class="rogue-v327-kicker">DECISIONES DE RUN</div>
                <div class="rogue-v327-sub">Ruta, reliquia y progreso de construcción</div>
            </div>
            <div class="rogue-v327-wallet">¢ ${coins}</div>
        </div>
        <div class="rogue-v327-section-title">RUTA SIGUIENTE</div>
        <div class="rogue-v327-room-grid">
            ${ROGUELIKE_V327.roomOffers.map(plan => `
                <button type="button" class="rogue-v327-room-card ${plan.id === pending.id ? 'is-selected' : ''}" data-room-v327="${rogueV327EscapeHtml(plan.id)}">
                    <span class="rogue-v327-card-icon">${rogueV327EscapeHtml(plan.icon)}</span>
                    <span class="rogue-v327-card-title">${rogueV327EscapeHtml(plan.name)}</span>
                    <span class="rogue-v327-card-desc">${rogueV327EscapeHtml(plan.desc)}</span>
                    <span class="rogue-v327-risk risk-${rogueV327EscapeHtml(plan.risk)}">Riesgo ${rogueV327EscapeHtml(plan.risk)}</span>
                </button>
            `).join('')}
        </div>
        <div class="rogue-v327-section-row">
            <div class="rogue-v327-section-title">RELIQUIA · ELEGÍ 1</div>
            <button type="button" id="rogue-v327-reroll" class="rogue-v327-reroll" ${ROGUELIKE_V327.rerollsUsed > 0 || coins < ROGUELIKE_V327_CONFIG.rerollCost ? 'disabled' : ''}>
                ${ROGUELIKE_V327.rerollsUsed > 0 ? 'CAMBIO USADO' : `CAMBIAR · ${ROGUELIKE_V327_CONFIG.rerollCost}¢`}
            </button>
        </div>
        <div class="rogue-v327-relic-grid">
            ${ROGUELIKE_V327.relicOffers.map(id => {
                const relic = rogueV327GetRelic(id);
                if (!relic) return '';
                const selected = ROGUELIKE_V327.selectedRelic === relic.id;
                return `
                    <button type="button" class="rogue-v327-relic-card rarity-${rogueV327EscapeHtml(String(relic.rarity).toLowerCase())} ${selected ? 'is-selected' : ''}" data-relic-v327="${rogueV327EscapeHtml(relic.id)}" aria-pressed="${selected ? 'true' : 'false'}">
                        <span class="rogue-v327-card-icon">${rogueV327EscapeHtml(relic.icon)}</span>
                        <span class="rogue-v327-card-title">${rogueV327EscapeHtml(relic.name)}</span>
                        <span class="rogue-v327-rarity">${rogueV327EscapeHtml(relic.rarity)}</span>
                        <span class="rogue-v327-card-desc">${rogueV327EscapeHtml(relic.desc)}</span>
                        <span class="rogue-v327-select-hint">${selected ? 'SELECCIONADA · VISTA PREVIA' : 'VER SINERGIAS'}</span>
                    </button>
                `;
            }).join('')}
        </div>

        ${selectedRelic ? `
            <section class="rogue-v327-preview" aria-live="polite">
                <div class="rogue-v327-section-title">PREVISUALIZACIÓN · ${rogueV327EscapeHtml(selectedRelic.name)}</div>
                <p class="rogue-v327-help">Todavía no se adquirió. Esto muestra cómo cambiaría tu construcción si confirmás esta reliquia.</p>
                ${newlyActivated.length
                    ? `<div class="rogue-v327-preview-gains"><strong>Activaría ${newlyActivated.length === 1 ? 'una sinergia nueva' : `${newlyActivated.length} sinergias nuevas`}:</strong>${newlyActivated.map(synergy => `<div class="rogue-v327-preview-gain"><strong>${rogueV327EscapeHtml(synergy.name)}</strong><span>${rogueV327EscapeHtml(synergy.desc)}</span></div>`).join('')}</div>`
                    : '<div class="rogue-v327-empty-box">Esta reliquia no activaría una sinergia nueva todavía.</div>'}
                ${affectedSynergies.length
                    ? `<div class="rogue-v327-preview-progress"><strong>Progreso con esta reliquia</strong>${affectedSynergies.map(synergy => {
                        const isActiveNow = activeIds.has(synergy.id);
                        const isActiveAfter = previewActiveIds.has(synergy.id);
                        const before = rogueV327GetSynergyProgressText(synergy, currentCounts);
                        const after = rogueV327GetSynergyProgressText(synergy, previewCounts);
                        const line = isActiveNow ? `Ya activa · ${after}` : isActiveAfter ? `Se activaría · ${after}` : `${before} → ${after}`;
                        return `<div class="rogue-v327-preview-progress-line"><span>${rogueV327EscapeHtml(synergy.name)}</span><small>${rogueV327EscapeHtml(line)}</small></div>`;
                    }).join('')}</div>`
                    : '<div class="rogue-v327-help">Esta reliquia no participa en las seis sinergias disponibles.</div>'}
            </section>
        ` : '<div class="rogue-v327-note">Seleccioná una reliquia para previsualizar el progreso de las sinergias antes de confirmar.</div>'}

        <section class="rogue-v327-build-section" aria-label="Construcción actual">
            <div class="rogue-v327-section-title">CONSTRUCCIÓN ACTUAL</div>
            <p class="rogue-v327-help">Etiquetas de las reliquias que llevás. Los contadores muestran el progreso hacia las combinaciones.</p>
            <div class="rogue-v327-tag-grid">
                ${Object.entries(ROGUELIKE_SYNERGY_TAG_META_V327).map(([tag, meta]) => {
                    const count = Number(currentCounts[tag]) || 0;
                    return `<span class="rogue-v327-tag-chip ${count ? 'has-count' : 'no-count'}"><span>${rogueV327EscapeHtml(meta.label)}</span><strong>×${count}</strong></span>`;
                }).join('')}
            </div>
        </section>

        <section class="rogue-v327-build-section" aria-label="Sinergias activas">
            <div class="rogue-v327-section-title">SINERGIAS ACTIVAS <span class="rogue-v327-count">${activeSynergies.length}</span></div>
            <p class="rogue-v327-help">Bonificaciones que ya están activadas por tus reliquias.</p>
            ${activeSynergies.length
                ? `<div class="rogue-v327-synergy-grid">${activeSynergies.map(synergy => synergyCard(synergy, true, currentCounts, 'ACTIVA')).join('')}</div>`
                : '<div class="rogue-v327-empty-box">Todavía no hay sinergias activas. Revisá el progreso de abajo para ver qué reliquias combinar.</div>'}
        </section>

        <section class="rogue-v327-build-section" aria-label="Sinergias en progreso">
            <div class="rogue-v327-section-title">PRÓXIMAS SINERGIAS</div>
            <div class="rogue-v327-synergy-grid">
                ${pendingSynergies.map(synergy => {
                    const hasProgress = Object.keys(synergy.req).some(tag => (Number(currentCounts[tag]) || 0) > 0);
                    return synergyCard(synergy, false, currentCounts, hasProgress ? 'EN PROGRESO' : 'SIN INICIAR');
                }).join('')}
            </div>
        </section>



        <div class="rogue-v327-note">La ruta se aplica al entrar a la próxima sala. Cambiar la oferta consume monedas; la previsualización no consume ni adquiere reliquias.</div>
    `;
    panel.scrollTop = previousScrollTop;

    panel.querySelectorAll('[data-room-v327]').forEach(button => {
        button.addEventListener('click', () => rogueV327ChooseRoomPlan(button.dataset.roomV327));
    });
    panel.querySelectorAll('[data-relic-v327]').forEach(button => {
        button.addEventListener('click', () => {
            ROGUELIKE_V327.selectedRelic = button.dataset.relicV327;
            rogueV327RenderStrategyPanel();
        });
    });

    const reroll = document.getElementById('rogue-v327-reroll');
    if (reroll) reroll.addEventListener('click', rogueV327RerollRelics);
}

function rogueV327RerollRelics() {
    if (ROGUELIKE_V327.rerollsUsed > 0) return;
    if (!rogueV327SpendCoins(ROGUELIKE_V327_CONFIG.rerollCost, 'reroll')) return;

    ROGUELIKE_V327.rerollsUsed = 1;
    ROGUELIKE_V327.selectedRelic = null;
    const qualityBoost = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).relicQualityBoost;
    rogueV327RollRelicOffers(ROGUELIKE_V327_CONFIG.relicOfferCount, qualityBoost);
    rogueV327RenderStrategyPanel();
}

function rogueV327UpdateRoomBanner(plan = rogueV327GetPlan(ROGUELIKE_V327.currentRoomPlan)) {
    try {
        const el = document.getElementById('room-banner');
        if (!el) return;
        el.textContent = `◆ ${plan.name} · ${plan.desc}`;
    } catch (_) {}
}

function rogueV327UpdateRelicHUD() {
    try {
        const el = document.getElementById('ui-relics');
        if (!el) return;
        const count = gameState && Array.isArray(gameState.relics) ? gameState.relics.length : 0;
        el.textContent = String(count);
    } catch (_) {}
}

function rogueV327RenderDeathRelics() {
    try {
        const list = document.getElementById('go-relic-list');
        const count = document.getElementById('go-relics');
        if (!list) return;
        const relics = (Array.isArray(gameState?.relics) ? gameState.relics : []).map(item => rogueV327GetRelic(item.id) || item).filter(Boolean);
        if (count) count.textContent = String(relics.length);
        list.innerHTML = relics.length
            ? relics.map(relic => `<div class="death-relic-item"><span>${relic.icon}</span><strong>${relic.name}</strong><small>${relic.desc}</small></div>`).join('')
            : '<div class="death-relic-item"><small>No conseguiste reliquias v3.27 en esta run.</small></div>';
    } catch (_) {}
}

function rogueV327Install() {
    if (ROGUELIKE_V327.installed) return true;
    if (typeof gameState === 'undefined' || typeof player === 'undefined') return false;
    if (typeof updateUI !== 'function' || typeof startGame !== 'function' || typeof initLevel !== 'function') return false;

    rogueV327EnsureEconomyState();

    ROGUELIKE_V327.original.updateUI = updateUI;
    ROGUELIKE_V327.original.startGame = startGame;
    ROGUELIKE_V327.original.initLevel = initLevel;
    ROGUELIKE_V327.original.completeLevel = typeof completeLevel === 'function' ? completeLevel : null;
    ROGUELIKE_V327.original.explodeBomb = typeof explodeBomb === 'function' ? explodeBomb : null;
    ROGUELIKE_V327.original.placeBomb = typeof placeBomb === 'function' ? placeBomb : null;
    ROGUELIKE_V327.original.gameOver = typeof gameOver === 'function' ? gameOver : null;

    window.updateUI = function updateUIV327(...args) {
        const result = ROGUELIKE_V327.original.updateUI(...args);
        rogueV327UpdateRelicHUD();
        return result;
    };

    window.startGame = function startGameV327(...args) {
        rogueV327ResetRelicRuntime();
        ROGUELIKE_V327.runActive = true;
        ROGUELIKE_V327.currentRoomPlan = 'standard';
        ROGUELIKE_V327.pendingRoomPlan = 'standard';
        ROGUELIKE_V327.roomOffers = [];
        ROGUELIKE_V327.coinStats = { blocks: 0, enemies: 0, roomClear: 0, rerolls: 0 };

        const result = ROGUELIKE_V327.original.startGame(...args);
        rogueV327EnsureEconomyState();
        gameState.roguelikeV327.currentRoomPlan = 'standard';
        gameState.roguelikeV327.pendingRoomPlan = 'standard';
        rogueV327ApplyDerivedBonuses();
        rogueV327RefreshGameStateMirror();
        return result;
    };

    window.initLevel = function initLevelV327(...args) {
        gameState.__roomTypeOverrideV626 = rogueV327ResolveRoomTypeKeyV626();
        const result = ROGUELIKE_V327.original.initLevel(...args);
        rogueV327EnsureEconomyState();
        rogueV327ApplyDerivedBonuses();
        rogueV327ApplyRoomPlan();
        return result;
    };

    if (ROGUELIKE_V327.original.completeLevel) {
        window.completeLevel = function completeLevelV327(...args) {
            if (!ROGUELIKE_V327.runActive) ROGUELIKE_V327.runActive = true;
            rogueV327RewardRoomClear();
            ROGUELIKE_V327.rerollsUsed = 0;
            ROGUELIKE_V327.selectedRelic = null;
            rogueV327RollRoomOffers();
            const qualityBoost = rogueV327GetPlan(ROGUELIKE_V327.pendingRoomPlan).relicQualityBoost;
            rogueV327RollRelicOffers(ROGUELIKE_V327_CONFIG.relicOfferCount, qualityBoost);

            const result = ROGUELIKE_V327.original.completeLevel(...args);
            rogueV327EnhanceRewardScreen();
            rogueV327RefreshGameStateMirror();
            rogueV327UpdateRelicHUD();
            return result;
        };
    }

    if (ROGUELIKE_V327.original.explodeBomb) {
        window.explodeBomb = function explodeBombV327(...args) {
            const beforeState = {
                blocksBroken: Number.isFinite(Number(gameState && gameState.blocksBroken)) ? Number(gameState.blocksBroken) : null,
                enemyCount: Array.isArray(gameState && gameState.enemies) ? gameState.enemies.length : 0,
                coins: rogueV327GetCoins()
            };
            const result = ROGUELIKE_V327.original.explodeBomb(...args);
            rogueV327HandleExplosionEconomy(beforeState);
            return result;
        };
    }

    if (ROGUELIKE_V327.original.placeBomb) {
        window.placeBomb = function placeBombV327(...args) {
            const before = Array.isArray(gameState && gameState.bombs) ? gameState.bombs.length : 0;
            const result = ROGUELIKE_V327.original.placeBomb(...args);
            const afterBombs = Array.isArray(gameState && gameState.bombs) ? gameState.bombs : [];
            const fuseReduction = Math.max(0, -rogueV327GetRelicBonuses().fuseMs);
            if (fuseReduction > 0 && afterBombs.length > before) {
                for (let i = before; i < afterBombs.length; i++) {
                    afterBombs[i].timer = Math.max(
                        ROGUELIKE_V327_CONFIG.minBombFuseMs,
                        rogueV327Num(afterBombs[i].timer, 2000) - fuseReduction
                    );
                }
            }
            return result;
        };
    }

    if (ROGUELIKE_V327.original.gameOver) {
        window.gameOver = function gameOverV327(...args) {
            const result = ROGUELIKE_V327.original.gameOver(...args);
            rogueV327RenderDeathRelics();
            ROGUELIKE_V327.runActive = false;
            return result;
        };
    }

    rogueV327UpdateRoomBanner();
    ROGUELIKE_V327.installed = true;
    rogueV327UpdateRelicHUD();
    return true;
}

function rogueV327Bootstrap() {
    if (typeof document !== 'undefined') rogueV327InstallStyles();
    if (rogueV327Install()) return;
    setTimeout(rogueV327Bootstrap, 50);
}

function rogueV327InstallStyles() {
    if (document.getElementById('rogue-v327-styles')) return;
    const style = document.createElement('style');
    style.id = 'rogue-v327-styles';
    style.textContent = `
        #level-complete-screen { gap: 7px; }
        .rogue-v327-strategy { width: min(100%, 540px); max-height: 420px; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; text-align: left; scrollbar-width: thin; }
        .rogue-v327-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 8px; border:1px solid rgba(255,255,255,.10); background:rgba(15,23,42,.62); border-radius:8px; }
        .rogue-v327-kicker { font: 9px 'Press Start 2P', cursive; color:#c4b5fd; letter-spacing:.04em; }
        .rogue-v327-sub { margin-top:4px; font: 9px Inter, sans-serif; color:#94a3b8; }
        .rogue-v327-wallet { min-width:64px; padding:7px 9px; border-radius:7px; background:rgba(245,158,11,.13); border:1px solid rgba(245,158,11,.28); color:#fde68a; font:11px 'Press Start 2P', cursive; text-align:center; }
        .rogue-v327-section-title { font: 8px 'Press Start 2P', cursive; color:#cbd5e1; margin:7px 0 5px; }
        .rogue-v327-room-grid, .rogue-v327-relic-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:5px; }
        .rogue-v327-relic-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .rogue-v327-room-card, .rogue-v327-relic-card { min-width:0; padding:6px; border:1px solid rgba(255,255,255,.10); border-radius:8px; background:rgba(30,41,59,.82); color:#fff; text-align:left; cursor:pointer; display:flex; flex-direction:column; gap:3px; }
        .rogue-v327-room-card:hover, .rogue-v327-relic-card:hover { border-color:rgba(148,163,184,.45); }
        .rogue-v327-room-card.is-selected, .rogue-v327-relic-card.is-selected { border-color:#facc15; box-shadow:0 0 0 1px rgba(250,204,21,.25) inset; background:rgba(120,53,15,.18); }
        .rogue-v327-card-icon { font-size:15px; line-height:1; }
        .rogue-v327-card-title { font: 8px 'Press Start 2P', cursive; line-height:1.3; color:#f8fafc; }
        .rogue-v327-card-desc { font: 9px Inter, sans-serif; color:#cbd5e1; line-height:1.25; }
        .rogue-v327-risk { font: 8px 'Press Start 2P', cursive; text-transform:uppercase; color:#94a3b8; }
        .risk-bajo { color:#86efac; }
        .risk-normal { color:#cbd5e1; }
        .risk-alto { color:#fca5a5; }
        .rogue-v327-section-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:3px; }
        .rogue-v327-reroll { border:1px solid rgba(59,130,246,.38); background:rgba(30,64,175,.25); color:#bfdbfe; border-radius:6px; padding:5px 7px; font:8px 'Press Start 2P', cursive; cursor:pointer; }
        .rogue-v327-reroll:disabled { opacity:.42; cursor:default; }
        .rogue-v327-rarity { font: 8px 'Press Start 2P', cursive; text-transform:uppercase; color:#94a3b8; }
        .rarity-uncommon .rogue-v327-rarity { color:#93c5fd; }
        .rarity-rare .rogue-v327-rarity { color:#fca5a5; }
        .rogue-v327-build-section { margin-top:7px; padding:7px; border:1px solid rgba(148,163,184,.16); border-radius:8px; background:rgba(15,23,42,.45); }
        .rogue-v327-build-section > .rogue-v327-section-title { margin:0 0 4px; }
        .rogue-v327-help { margin:0 0 6px; color:#94a3b8; font:9px Inter, sans-serif; line-height:1.35; }
        .rogue-v327-tag-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; }
        .rogue-v327-tag-chip { min-width:0; display:flex; align-items:center; justify-content:space-between; gap:5px; padding:5px 6px; border-radius:6px; background:rgba(30,41,59,.74); border:1px solid rgba(148,163,184,.13); color:#cbd5e1; font:9px Inter,sans-serif; }
        .rogue-v327-tag-chip strong { color:#f8fafc; font:9px Inter,sans-serif; }
        .rogue-v327-tag-chip.no-count { color:#64748b; background:rgba(15,23,42,.45); }
        .rogue-v327-tag-chip.no-count strong { color:#64748b; }
        .rogue-v327-synergy-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
        .rogue-v327-synergy-card { min-width:0; padding:7px; border:1px solid rgba(148,163,184,.18); border-radius:7px; background:rgba(30,41,59,.55); }
        .rogue-v327-synergy-card.is-active { border-color:rgba(74,222,128,.42); background:rgba(20,83,45,.19); }
        .rogue-v327-synergy-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:5px; }
        .rogue-v327-synergy-name { color:#e2e8f0; font:8px 'Press Start 2P',cursive; line-height:1.5; }
        .rogue-v327-synergy-status { flex-shrink:0; padding:2px 4px; border-radius:4px; background:rgba(148,163,184,.12); color:#94a3b8; font:7px Inter,sans-serif; }
        .is-active .rogue-v327-synergy-status { background:rgba(34,197,94,.13); color:#86efac; }
        .rogue-v327-synergy-effect { margin:5px 0; color:#cbd5e1; font:9px Inter,sans-serif; line-height:1.35; }
        .rogue-v327-synergy-reqs { color:#94a3b8; font:8px Inter,sans-serif; line-height:1.35; }
        .rogue-v327-count { display:inline-flex; align-items:center; justify-content:center; min-width:15px; padding:2px 4px; border-radius:9px; background:rgba(34,197,94,.14); color:#86efac; font:8px Inter,sans-serif; }
        .rogue-v327-empty-box { padding:7px; border-radius:6px; background:rgba(15,23,42,.55); color:#94a3b8; font:9px Inter,sans-serif; line-height:1.4; }
        .rogue-v327-preview { margin-top:7px; padding:8px; border:1px solid rgba(250,204,21,.28); border-radius:8px; background:rgba(120,53,15,.12); }
        .rogue-v327-preview > .rogue-v327-section-title { margin:0 0 5px; color:#fde68a; }
        .rogue-v327-preview-gains { display:flex; flex-direction:column; gap:4px; margin-bottom:6px; color:#fde68a; font:9px Inter,sans-serif; }
        .rogue-v327-preview-gain { display:flex; flex-direction:column; gap:2px; padding:5px 6px; border-radius:5px; background:rgba(15,23,42,.45); }
        .rogue-v327-preview-gain span { color:#cbd5e1; line-height:1.35; }
        .rogue-v327-preview-progress { display:flex; flex-direction:column; gap:4px; margin-top:6px; color:#cbd5e1; font:9px Inter,sans-serif; }
        .rogue-v327-preview-progress-line { display:flex; flex-direction:column; gap:2px; padding-top:4px; border-top:1px solid rgba(255,255,255,.06); }
        .rogue-v327-preview-progress-line small { color:#94a3b8; font-size:8px; line-height:1.35; }
        .rogue-v327-select-hint { margin-top:2px; color:#93c5fd; font:7px Inter,sans-serif; line-height:1.3; }
        .rogue-v327-empty { color:#94a3b8; font:9px Inter, sans-serif; }
        .rogue-v327-note { display:block; margin-top:6px; color:#64748b; font:8px Inter, sans-serif; line-height:1.35; }
        .death-relic-item { display:grid; grid-template-columns:auto 1fr; column-gap:7px; row-gap:1px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.06); }
        .death-relic-item span { grid-row:span 2; }
        .death-relic-item strong { font-size:9px; }
        .death-relic-item small { color:#94a3b8; font-size:8px; }
        @media (max-width: 520px) {
            .rogue-v327-room-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
            .rogue-v327-relic-grid { grid-template-columns: 1fr; }
            .rogue-v327-strategy { max-height: 360px; overflow-y: auto; }
            .rogue-v327-synergy-grid { grid-template-columns: 1fr; }
            .rogue-v327-tag-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
        }
    `;
    document.head.appendChild(style);
}

window.ROGUELIKE_V327_CONFIG = ROGUELIKE_V327_CONFIG;
window.ROGUELIKE_ROOM_PLANS_V327 = ROGUELIKE_ROOM_PLANS_V327;
window.ROGUELIKE_SYNERGIES_V327 = ROGUELIKE_SYNERGIES_V327;
window.ROGUELIKE_V327 = ROGUELIKE_V327;
window.rogueV327GetRelicBonuses = rogueV327GetRelicBonuses;
window.rogueV327GetActiveSynergies = rogueV327GetActiveSynergies;
window.rogueV327RollRelicOffers = rogueV327RollRelicOffers;
window.rogueV327AcquireRelic = rogueV327AcquireRelic;
window.rogueV327ChooseRoomPlan = rogueV327ChooseRoomPlan;
window.rogueV327RollRoomOffers = rogueV327RollRoomOffers;
window.rogueV327AddCoins = rogueV327AddCoins;
window.rogueV327SpendCoins = rogueV327SpendCoins;

rogueV327Bootstrap();

window.rogueV327ResolveRoomTypeKeyV626 = rogueV327ResolveRoomTypeKeyV626;
window.rogueV327IsBossExamV626 = rogueV327IsBossExamV626;

;
// === js/29-biome-progression.js ===
// Bomberman Roguelike v6.12.25 — Biome Progression + in-party biome override
(function initBiomeProgressionV49(global) {
    'use strict';

    const ROOMS_PER_BIOME = 4;
    const BIOME_PROGRESSION = Object.freeze([
        Object.freeze({ id:'winter', name:'Invierno', themeId:'winter', rooms:ROOMS_PER_BIOME, accent:'#7dd3fc', verbSentence:'Aprendés a comprometerte antes de moverte.' }),
        Object.freeze({ id:'autumn', name:'Otoño', themeId:'autumn', rooms:ROOMS_PER_BIOME, accent:'#f59e0b' }),
        Object.freeze({ id:'spring', name:'Primavera', themeId:'spring', rooms:ROOMS_PER_BIOME, accent:'#86efac' }),
        Object.freeze({ id:'summer', name:'Verano', themeId:'summer', rooms:ROOMS_PER_BIOME, accent:'#fbbf24' }),
        Object.freeze({ id:'underground', name:'Bajo tierra', themeId:'underground', rooms:ROOMS_PER_BIOME, accent:'#c4b5fd' }),
        Object.freeze({ id:'clouds', name:'Nubes', themeId:'clouds', rooms:ROOMS_PER_BIOME, accent:'#dbeafe' }),
        Object.freeze({ id:'mountains', name:'Montañas', themeId:'mountains', rooms:ROOMS_PER_BIOME, accent:'#cbd5e1' }),
        Object.freeze({ id:'beach', name:'Playa', themeId:'beach', rooms:ROOMS_PER_BIOME, accent:'#67e8f9' }),
        Object.freeze({ id:'space', name:'Espacio', themeId:'space', rooms:ROOMS_PER_BIOME, accent:'#a5b4fc' }),
        Object.freeze({ id:'sky', name:'Cielo', themeId:'sky', rooms:ROOMS_PER_BIOME, accent:'#f0abfc' }),
        Object.freeze({ id:'inferno', name:'Infierno', themeId:'inferno', rooms:ROOMS_PER_BIOME, accent:'#ff7043' })
    ]);
    const TOTAL_BIOME_DEPTHS = BIOME_PROGRESSION.reduce((sum, biome) => sum + biome.rooms, 0);
    const STAGE_ROLE_IDS_V56 = Object.freeze({1:'introduction',2:'consolidation',3:'combination',4:'exam'});
    const BIOME_STAGE_PROFILES_V51 = Object.freeze({
        winter:{1:{role:'introduction',lesson:'Explora la sala y establece una ruta segura.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.03}},2:{role:'consolidation',lesson:'Consolida una ruta y administra tus recursos.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.01}},3:{role:'combination',lesson:'Combina bombas, movimiento y recursos disponibles.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.01}},4:{role:'exam',lesson:'Demuestra dominio del gameplay base bajo presión.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.03}}},
        space:{1:{role:'introduction',lesson:'Explora la sala y establece una ruta segura.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.03}},2:{role:'consolidation',lesson:'Consolida una ruta y administra tus recursos.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.01}},3:{role:'combination',lesson:'Combina bombas, movimiento y recursos disponibles.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.015}},4:{role:'exam',lesson:'Demuestra dominio del gameplay base bajo presión.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.035}}},
        inferno:{1:{role:'introduction',lesson:'Explora la sala y establece una ruta segura.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.01}},2:{role:'consolidation',lesson:'Consolida una ruta y administra tus recursos.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.01}},3:{role:'combination',lesson:'Combina bombas, movimiento y recursos disponibles.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.025}},4:{role:'exam',lesson:'Demuestra dominio del gameplay base bajo presión.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.05}}}
    });

    const runtime = {installed:false, originalInitLevel:null, lastBiomeId:null, transitionTimer:0, transitionNode:null};

    function clampDepth(depth){return Math.min(Math.max(1,Math.floor(Number(depth)||1)),TOTAL_BIOME_DEPTHS);}
    function getBiomeForDepthV49(depth){
        let remaining=clampDepth(depth);
        for(const biome of BIOME_PROGRESSION){if(remaining<=biome.rooms)return biome;remaining-=biome.rooms;}
        return BIOME_PROGRESSION[BIOME_PROGRESSION.length-1];
    }
    function getBiomeStageV49(depth){
        let remaining=clampDepth(depth);
        for(const biome of BIOME_PROGRESSION){if(remaining<=biome.rooms)return remaining;remaining-=biome.rooms;}
        return ROOMS_PER_BIOME;
    }
    function getBiomeStageConfigV51(biomeOrId,stage){
        const id=typeof biomeOrId==='string'?biomeOrId:biomeOrId?.id;
        const safeStage=Math.max(1,Math.min(ROOMS_PER_BIOME,Number(stage)||1));
        return BIOME_STAGE_PROFILES_V51[id]?.[safeStage]||{role:STAGE_ROLE_IDS_V56[safeStage]||'introduction',lesson:'',mechanics:{},hazards:{},generation:{}};
    }
    function buildMetadataV49(biome,depth){
        const index=BIOME_PROGRESSION.findIndex(item=>item.id===biome.id);
        const stage=getBiomeStageV49(depth);
        const startDepth=index*ROOMS_PER_BIOME+1;
        return Object.freeze({id:biome.id,themeId:biome.themeId,nombre:biome.name,stage,rooms:ROOMS_PER_BIOME,startDepth,endDepth:startDepth+ROOMS_PER_BIOME-1,accent:biome.accent,bossEnabled:biome.bossEnabled!==false,examRoomType:biome.examRoomType||'BOSS',verbSentence:biome.verbSentence||'',stageConfig:getBiomeStageConfigV51(biome.id,stage)});
    }
    function getBiomeMetadataV49(depth){
        const overrideId=typeof gameState!=='undefined'?gameState.biomeOverrideV49:null;
        if(overrideId){
            const selected=BIOME_PROGRESSION.find(item=>item.id===overrideId);
            if(selected)return buildMetadataV49(selected,depth);
        }
        return buildMetadataV49(getBiomeForDepthV49(depth),depth);
    }
    function getBiomeMetadataForIdV49(id,depth){
        const biome=BIOME_PROGRESSION.find(item=>item.id===id);
        return biome?buildMetadataV49(biome,depth):null;
    }
    function getBiomeRunLabelV49(depth){const meta=getBiomeMetadataV49(depth);return `${meta.nombre} ${meta.stage}`;}

    function createTransitionNode(){
        if(!global.document?.body)return null;
        let node=global.document.getElementById('biome-transition');
        if(node)return node;
        node=global.document.createElement('div');node.id='biome-transition';node.className='biome-transition hidden';node.setAttribute('aria-live','polite');
        node.innerHTML='<div class="biome-transition-kicker">TRANSICIÓN DE BIOMA</div><div class="biome-transition-name"></div><div class="biome-transition-range"></div>';
        global.document.body.appendChild(node);runtime.transitionNode=node;return node;
    }
    function showBiomeTransition(meta){
        if(!runtime.lastBiomeId||runtime.lastBiomeId===meta.id)return;
        const node=createTransitionNode();if(!node)return;
        node.style.setProperty('--biome-accent',meta.accent);
        const name=node.querySelector('.biome-transition-name');const range=node.querySelector('.biome-transition-range');
        if(name)name.textContent=meta.nombre.toUpperCase();
        if(range)range.textContent=`ETAPA ${meta.stage} · PROFUNDIDADES ${meta.startDepth}–${meta.endDepth}`;
        node.classList.remove('hidden');node.classList.remove('is-visible');void node.offsetWidth;node.classList.add('is-visible');
        clearTimeout(runtime.transitionTimer);
        runtime.transitionTimer=setTimeout(()=>{node.classList.remove('is-visible');setTimeout(()=>node.classList.add('hidden'),320);},1100);
    }
    function syncBiomeUi(meta){
        const banner=global.document?.getElementById?.('run-banner');
        if(banner)banner.textContent=`PARTIDA ${String(gameState.runNumber||1).padStart(2,'0')} · ${meta.nombre.toUpperCase()} ${meta.stage} · DEPTH ${String(gameState.level).padStart(2,'0')}`;
        const select=global.document?.getElementById?.('biome-switch-select');if(select&&select.value!==meta.id)select.value=meta.id;
        const status=global.document?.getElementById?.('biome-switch-status');if(status)status.textContent=gameState?.biomeOverrideV49?'MANUAL':'AUTOMÁTICO';
    }
    function applyBiomeForDepthV49(depth,showTransition=true){
        const meta=getBiomeMetadataV49(depth);
        if(typeof global.setActiveThemeV46==='function')global.setActiveThemeV46(meta.themeId,false);
        if(typeof gameState!=='undefined')gameState.biomeV49={id:meta.id,themeId:meta.themeId,name:meta.nombre,stage:meta.stage,startDepth:meta.startDepth,endDepth:meta.endDepth,bossEnabled:meta.bossEnabled,examRoomType:meta.examRoomType,verbSentence:meta.verbSentence||'',stageConfig:getBiomeStageConfigV51(meta.id,meta.stage)};
        syncBiomeUi(meta);
        if(typeof global.registerBiomeVisitV50==='function')global.registerBiomeVisitV50(meta);
        if(typeof global.touchRunDepthV50==='function')global.touchRunDepthV50(Number(depth)||1);
        if(showTransition)showBiomeTransition(meta);
        runtime.lastBiomeId=meta.id;
        return meta;
    }
    function setBiomeOverrideV49(id,showTransition=true){
        // Permite elegir el bioma también entre salas o antes de reanudar la partida.
        if(typeof gameState==='undefined')return false;
        const meta=getBiomeMetadataForIdV49(id,gameState.level);
        if(!meta)return false;
        gameState.biomeOverrideV49=meta.id;
        applyBiomeForDepthV49(gameState.level,showTransition);
        return true;
    }
    function clearBiomeOverrideV49(showTransition=false){
        if(typeof gameState==='undefined')return false;
        gameState.biomeOverrideV49=null;
        applyBiomeForDepthV49(gameState.level,showTransition);
        return true;
    }
    function install(){
        if(runtime.installed)return true;
        if(typeof global.initLevel!=='function')return false;
        runtime.originalInitLevel=global.initLevel;
        global.initLevel=function initLevelV49(...args){const result=runtime.originalInitLevel(...args);const meta=applyBiomeForDepthV49(gameState.level,false);return result;};
        runtime.installed=true;
        applyBiomeForDepthV49(Number(gameState?.level)||1,false);
        return true;
    }
    function bootstrap(){if(install())return;setTimeout(bootstrap,40);}

    global.BIOME_PROGRESSION_V49=BIOME_PROGRESSION;
    global.getBiomeForDepthV49=getBiomeForDepthV49;
    global.getBiomeStageV49=getBiomeStageV49;
    global.getBiomeMetadataV49=getBiomeMetadataV49;
    global.getBiomeMetadataForIdV49=getBiomeMetadataForIdV49;
    global.getBiomeRunLabelV49=getBiomeRunLabelV49;
    global.getBiomeStageConfigV51=getBiomeStageConfigV51;
    global.setBiomeOverrideV49=setBiomeOverrideV49;
    global.clearBiomeOverrideV49=clearBiomeOverrideV49;
    global.BOMBER_ENGINE=global.BOMBER_ENGINE||{};
    global.BOMBER_ENGINE.getBiomeProgression=()=>BIOME_PROGRESSION.map(b=>({...b}));
    global.BOMBER_ENGINE.getBiomeForDepth=getBiomeForDepthV49;
    global.BOMBER_ENGINE.getBiomeMetadata=getBiomeMetadataV49;
    global.BOMBER_ENGINE.getBiomeStageConfig=getBiomeStageConfigV51;
    global.BOMBER_ENGINE.setBiomeOverride=setBiomeOverrideV49;
    global.BOMBER_ENGINE.clearBiomeOverride=clearBiomeOverrideV49;
    if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})(window);

;
// === js/30-biome-journey.js ===
// Bomberman Roguelike v5.0 — Biome Journey
// Capa narrativa/data-driven sobre la progresión existente.
// No crea mecánicas, hazards ni lógica de combate.
(function initBiomeJourneyV50(global) {
    'use strict';

    const BIOME_JOURNEY = Object.freeze({
        winter: Object.freeze({
            verb: 'deslizar', verbSentence: 'Aprendés a comprometerte antes de moverte.', lesson: 'Aprendé a comprometerte antes de moverte.', rhythm: 'anticipacion', bossLesson: 'Controlar el deslizamiento bajo presión.', transitionIn: 'El hielo cubre el suelo.'
        }),
        autumn: Object.freeze({
            verb: 'leer', lesson: 'Leer el viento antes de comprometer una jugada.', rhythm: 'lectura', bossLesson: 'Anticipar el viento y reposicionarse.', transitionIn: 'El hielo se derrite y el viento levanta hojas.'
        }),
        spring: Object.freeze({
            verb: 'adaptar', lesson: 'Cambiar de ruta cuando el terreno se transforma.', rhythm: 'mutacion', bossLesson: 'Adaptarse a pasillos que cambian.', transitionIn: 'El suelo vuelve a crecer.'
        }),
        summer: Object.freeze({
            verb: 'administrar', lesson: 'Administrar velocidad, espacio y recursos.', rhythm: 'presion', bossLesson: 'Mantener recursos mientras aumenta la presión.', transitionIn: 'La humedad desaparece y llega el calor.'
        }),
        underground: Object.freeze({
            verb: 'escuchar', lesson: 'Esperar información antes de romper.', rhythm: 'tension', bossLesson: 'Leer el peligro con poca visibilidad.', transitionIn: 'El camino desciende bajo tierra.'
        }),
        clouds: Object.freeze({
            verb: 'flotar', lesson: 'Soltar el movimiento antes de llegar al destino.', rhythm: 'desfase', bossLesson: 'Corregir la inercia aérea.', transitionIn: 'El suelo desaparece bajo las nubes.'
        }),
        mountains: Object.freeze({
            verb: 'posicionar', lesson: 'Elegir una línea segura antes de exponerse.', rhythm: 'precision', bossLesson: 'Mantener posición con el terreno inestable.', transitionIn: 'La ruta se estrecha y gana altura.'
        }),
        beach: Object.freeze({
            verb: 'esperar', lesson: 'Esperar la ventana correcta antes de avanzar.', rhythm: 'ventanas', bossLesson: 'Cruzar cuando la marea abre espacio.', transitionIn: 'La piedra termina y aparece la costa.'
        }),
        space: Object.freeze({
            verb: 'soltar', lesson: 'Soltar la dirección antes de alcanzar el objetivo.', rhythm: 'desfase', bossLesson: 'Convertir la inercia en ventaja.', transitionIn: 'La gravedad comienza a desaparecer.'
        }),
        sky: Object.freeze({
            verb: 'anticipar', lesson: 'Leer corrientes antes de cruzar un vacío.', rhythm: 'anticipacion', bossLesson: 'Combinar viento y movimiento en el aire.', transitionIn: 'La mazmorra se abre hacia el cielo.'
        }),
        inferno: Object.freeze({
            verb: 'correr', lesson: 'Moverse antes de que el terreno cierre la oportunidad.', rhythm: 'reloj', bossLesson: 'Tomar decisiones rápidas cuando el espacio se consume.', transitionIn: 'El aire se calienta y el suelo comienza a arder.'
        })
    });

    const STAGE_ROLES = Object.freeze({
        1: Object.freeze({ id: 'introduction', label: 'INTRODUCCIÓN' }),
        2: Object.freeze({ id: 'reinforcement', label: 'REFUERZO' }),
        3: Object.freeze({ id: 'combination', label: 'COMBINACIÓN' }),
        4: Object.freeze({ id: 'exam', label: 'EXAMEN' })
    });

    function getJourneyDataV50(metaOrId) {
        const id = typeof metaOrId === 'string' ? metaOrId : metaOrId?.id;
        const data = BIOME_JOURNEY[id];
        return data ? Object.freeze({ ...data, stageRole: STAGE_ROLES[Number(metaOrId?.stage) || 1] || STAGE_ROLES[1] }) : null;
    }

    function createJourneyStateV50() {
        return {
            visitedBiomes: [],
            discoveredVerbs: [],
            currentBiomeId: null,
            currentStage: 1,
            maxDepth: 0
        };
    }

    function ensureJourneyStateV50() {
        if (typeof gameState === 'undefined') return null;
        if (!gameState.runJourneyV50) gameState.runJourneyV50 = createJourneyStateV50();
        return gameState.runJourneyV50;
    }

    function registerBiomeVisitV50(meta) {
        const state = ensureJourneyStateV50();
        if (!state || !meta?.id) return null;
        const data = getJourneyDataV50(meta);
        if (!data) return null;

        state.currentBiomeId = meta.id;
        state.currentStage = Number(meta.stage) || 1;
        state.maxDepth = Math.max(Number(state.maxDepth) || 0, Number(gameState.level) || Number(meta.startDepth) || 0);

        if (!state.visitedBiomes.some(item => item.id === meta.id)) {
            state.visitedBiomes.push({ id: meta.id, name: meta.nombre, startDepth: meta.startDepth, endDepth: meta.endDepth });
        }
        if (!state.discoveredVerbs.includes(data.verb)) state.discoveredVerbs.push(data.verb);
        return data;
    }

    function touchRunDepthV50(depth) {
        const state = ensureJourneyStateV50();
        if (!state) return;
        state.maxDepth = Math.max(Number(state.maxDepth) || 0, Number(depth) || 0);
    }

    function getRunJourneySummaryV50() {
        const state = ensureJourneyStateV50() || createJourneyStateV50();
        const details = state.visitedBiomes.map(item => {
            const data = BIOME_JOURNEY[item.id];
            return { ...item, verb: data?.verb || null, lesson: data?.lesson || null };
        });
        return Object.freeze({
            maxDepth: Number(state.maxDepth) || 0,
            visitedBiomes: details,
            discoveredVerbs: [...state.discoveredVerbs]
        });
    }

    function getBiomeStageRoleV50(stage) {
        return STAGE_ROLES[Math.max(1, Math.min(4, Number(stage) || 1))];
    }

    global.BIOME_JOURNEY_V50 = BIOME_JOURNEY;
    global.BIOME_STAGE_ROLES_V50 = STAGE_ROLES;
    global.getJourneyDataV50 = getJourneyDataV50;
    global.createJourneyStateV50 = createJourneyStateV50;
    global.registerBiomeVisitV50 = registerBiomeVisitV50;
    global.touchRunDepthV50 = touchRunDepthV50;
    global.getRunJourneySummaryV50 = getRunJourneySummaryV50;
    global.getBiomeStageRoleV50 = getBiomeStageRoleV50;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBiomeJourney = () => BIOME_JOURNEY;
    global.BOMBER_ENGINE.getBiomeStageRoles = () => STAGE_ROLES;
    global.BOMBER_ENGINE.getRunJourney = getRunJourneySummaryV50;
})(window);

;
// === js/31-run-history.js ===
// Bomberman Roguelike v5.1 — Run History
// Captura primero; interpreta después. Solo memoria de la run actual.
(function initRunHistoryV51(global) {
    'use strict';

    const MAX_EVENTS = 240;
    const COUNTER_KEYS = Object.freeze([
        'roomsStarted', 'roomsCompleted', 'bombsPlaced', 'explosions',
        'damageTaken', 'hazardInteractions', 'enemiesKilled', 'blocksBroken', 'deaths'
    ]);

    function createRunHistoryV51(runNumber = 0) {
        const counters = {};
        for (const key of COUNTER_KEYS) counters[key] = 0;
        return {
            version: 1,
            runNumber: Number(runNumber) || 0,
            startedAt: Date.now(),
            lastEventAt: 0,
            counters,
            events: []
        };
    }

    function ensureRunHistoryV51() {
        if (typeof gameState === 'undefined') return null;
        if (!gameState.runHistoryV51) gameState.runHistoryV51 = createRunHistoryV51(gameState.runNumber);
        return gameState.runHistoryV51;
    }

    function resetRunHistoryV51() {
        if (typeof gameState === 'undefined') return null;
        gameState.runHistoryV51 = createRunHistoryV51(gameState.runNumber);
        return gameState.runHistoryV51;
    }

    function incrementCounter(history, kind, data) {
        const map = {
            room_started: 'roomsStarted',
            room_completed: 'roomsCompleted',
            bomb_placed: 'bombsPlaced',
            explosion: 'explosions',
            damage_taken: 'damageTaken',
            hazard_interaction: 'hazardInteractions',
            enemy_killed: 'enemiesKilled',
            block_broken: 'blocksBroken',
            run_finished: 'deaths'
        };
        const counter = map[kind];
        if (counter) history.counters[counter] += Math.max(1, Number(data?.count) || 1);
        if (kind === 'run_finished' && data?.count == null) history.counters.deaths = Math.max(1, history.counters.deaths);
    }

    function recordRunEventV51(kind, data = {}) {
        const history = ensureRunHistoryV51();
        if (!history || !kind) return false;
        const event = Object.freeze({
            t: Math.max(0, Number(typeof gameState !== 'undefined' ? gameState.runElapsedMs : 0) || 0),
            kind: String(kind),
            level: Number(typeof gameState !== 'undefined' ? gameState.level : 0) || 0,
            biome: typeof gameState !== 'undefined' ? gameState.biomeV49?.id || null : null,
            stage: typeof gameState !== 'undefined' ? Number(gameState.biomeV49?.stage) || null : null,
            data: { ...data }
        });
        incrementCounter(history, event.kind, event.data);
        history.events.push(event);
        if (history.events.length > MAX_EVENTS) history.events.splice(0, history.events.length - MAX_EVENTS);
        history.lastEventAt = Date.now();
        return true;
    }

    function getRunHistorySummaryV51() {
        const history = ensureRunHistoryV51();
        if (!history) return null;
        return Object.freeze({
            version: history.version,
            runNumber: history.runNumber,
            counters: Object.freeze({ ...history.counters }),
            events: history.events.map(event => ({ ...event, data: { ...event.data } }))
        });
    }

    function wrapRuntime() {
        if (wrapRuntime.installed) return true;
        if (typeof global.startGame !== 'function' || typeof global.initLevel !== 'function') return false;

        wrapRuntime.originalStartGame = global.startGame;
        wrapRuntime.originalInitLevel = global.initLevel;
        wrapRuntime.originalPlaceBomb = typeof global.placeBomb === 'function' ? global.placeBomb : null;
        wrapRuntime.originalExplodeBomb = typeof global.explodeBomb === 'function' ? global.explodeBomb : null;
        wrapRuntime.originalTakeDamage = typeof global.takeDamage === 'function' ? global.takeDamage : null;
        wrapRuntime.originalCompleteLevel = typeof global.completeLevel === 'function' ? global.completeLevel : null;

        global.startGame = function startGameV51(...args) {
            const result = wrapRuntime.originalStartGame(...args);
            resetRunHistoryV51();
            recordRunEventV51('run_started');
            recordRunEventV51('room_started', {
                biome: gameState.biomeV49?.id || null,
                stage: Number(gameState.biomeV49?.stage) || null,
                roomType: gameState.roomType?.id || null,
                enemyTarget: Array.isArray(gameState.enemies) ? gameState.enemies.length : 0
            });
            return result;
        };

        global.initLevel = function initLevelV51(...args) {
            const result = wrapRuntime.originalInitLevel(...args);
            if (typeof gameState !== 'undefined' && gameState.runNumber) {
                recordRunEventV51('room_started', {
                    biome: gameState.biomeV49?.id || null,
                    stage: Number(gameState.biomeV49?.stage) || null,
                    roomType: gameState.roomType?.id || null,
                    enemyTarget: Array.isArray(gameState.enemies) ? gameState.enemies.length : 0
                });
            }
            return result;
        };

        if (wrapRuntime.originalPlaceBomb) {
            global.placeBomb = function placeBombV51(...args) {
                const result = wrapRuntime.originalPlaceBomb(...args);
                if (result) recordRunEventV51('bomb_placed', { reason: args[0] || 'manual' });
                return result;
            };
        }

        if (wrapRuntime.originalExplodeBomb) {
            global.explodeBomb = function explodeBombV51(...args) {
                const beforeBombs = Array.isArray(gameState?.bombs) ? gameState.bombs.length : 0;
                const beforeBlocks = Number(gameState?.blocksBroken) || 0;
                const beforeKills = Number(gameState?.totalKills) || 0;
                const result = wrapRuntime.originalExplodeBomb(...args);
                const afterBombs = Array.isArray(gameState?.bombs) ? gameState.bombs.length : 0;
                const detonated = Math.max(0, beforeBombs - afterBombs);
                const blocksBroken = Math.max(0, (Number(gameState?.blocksBroken) || 0) - beforeBlocks);
                const enemiesKilled = Math.max(0, (Number(gameState?.totalKills) || 0) - beforeKills);
                if (detonated || Array.isArray(gameState?.explosions) && gameState.explosions.length) recordRunEventV51('explosion', { count: Math.max(1, detonated) });
                if (blocksBroken) recordRunEventV51('block_broken', { count: blocksBroken });
                if (enemiesKilled) recordRunEventV51('enemy_killed', { count: enemiesKilled });
                return result;
            };
        }

        if (wrapRuntime.originalTakeDamage) {
            global.takeDamage = function takeDamageV51(...args) {
                const result = wrapRuntime.originalTakeDamage(...args);
                if (result) recordRunEventV51('damage_taken', { source: String(args[0] || 'unknown') });
                return result;
            };
        }

        if (wrapRuntime.originalCompleteLevel) {
            global.completeLevel = function completeLevelV51(...args) {
                recordRunEventV51('room_completed', { roomType: gameState.roomType?.id || null });
                return wrapRuntime.originalCompleteLevel(...args);
            };
        }

        wrapRuntime.installed = true;
        return true;
    }

    global.createRunHistoryV51 = createRunHistoryV51;
    global.resetRunHistoryV51 = resetRunHistoryV51;
    global.recordRunEventV51 = recordRunEventV51;
    global.getRunHistorySummaryV51 = getRunHistorySummaryV51;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getRunHistory = getRunHistorySummaryV51;

    function bootstrap() {
        if (wrapRuntime()) return;
        setTimeout(bootstrap, 50);
    }
    bootstrap();
})(window);

;
// === js/32-run-save.js ===
// Bomberman Roguelike v6.12.6 — Run Save
// Persistencia de una run en localStorage. Schema versionado. Sin dependencia de módulos de presentación.
(function initRunSaveV55(global) {
    'use strict';

    const STORAGE_KEY = 'bombermanRoguelikeRunSaveV55';
    const SCHEMA_VERSION = 3;
    const AUTOSAVE_MS = 8000;
    let autosaveTimer = 0;

    function getState() { return global.BOMBER_ENGINE?.getState?.() || null; }
    function getPlayer() { return global.BOMBER_ENGINE?.getPlayer?.() || null; }

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
    }

    function restoreCanonicalRelics(ids) {
        if (!Array.isArray(ids) || typeof RELICS === 'undefined') return [];
        return ids.map(item => RELICS.find(relic => relic.id === item?.id)).filter(Boolean);
    }

    function deriveLegacyRelicModsV55(ids) {
        const mods = {
            bombFuseMultiplier: 1,
            turnAssistBonus: 0,
            turnSnapBonus: 0,
            inputBufferBonus: 0,
            unstablePowder: false,
            economyBonus: 0
        };
        if (!Array.isArray(ids)) return mods;
        for (const item of ids) {
            const id = String(item?.id || '');
            if (id === 'short_fuse') mods.bombFuseMultiplier *= 0.72;
            if (id === 'unstable_powder') mods.unstablePowder = true;
            if (id === 'magnetic_boots') {
                mods.turnAssistBonus += 4;
                mods.turnSnapBonus += 1.25;
                mods.inputBufferBonus += 75;
            }
            if (id === 'salvage_core') mods.economyBonus += 0.20;
        }
        return mods;
    }

    function mergeLegacyRoguelikeRelics(save) {
        const legacyIds = Array.isArray(save?.run?.roguelikeV327Relics) ? save.run.roguelikeV327Relics : [];
        if (!legacyIds.length || !Array.isArray(save?.run?.relics) || typeof RELICS === 'undefined') return;
        const known = new Set(save.run.relics.map(item => String(item?.id || '')));
        const aliases = { ember_core: 'ember_core_rogue' };
        for (const rawId of legacyIds) {
            const sourceId = String(rawId || '');
            const id = aliases[sourceId] || sourceId;
            if (!id || known.has(id)) continue;
            const relic = RELICS.find(candidate => candidate.id === id);
            if (!relic) continue;
            save.run.relics.push({ id: relic.id, icon: relic.icon, name: relic.name, rarity: relic.rarity, desc: relic.desc, category: relic.category || 'BOMB' });
            known.add(relic.id);
        }
        delete save.run.roguelikeV327Relics;
    }

    function migrateSaveSchemaV55(save) {
        if (!save || typeof save !== 'object') return null;
        if (save.schemaVersion === SCHEMA_VERSION) return save;
        if (![1, 2].includes(Number(save.schemaVersion))) return null;
        if (!save.run || !save.world?.grid?.length) return null;

        const migrated = clone(save);
        if (!migrated) return null;
        migrated.schemaVersion = SCHEMA_VERSION;
        migrated.migratedFromSchemaVersion = Number(save.schemaVersion) || 1;
        mergeLegacyRoguelikeRelics(migrated);
        migrated.run.relicMods = migrated.run.relicMods || deriveLegacyRelicModsV55(migrated.run.relics);

        migrated.player = migrated.player || {};
        migrated.player.bombElementV612 = migrated.player.bombElementV612 || 'normal';
        migrated.player.capabilityProfileV681 = migrated.player.capabilityProfileV681 || { permanent: [], byGroup: {} };

        if (Array.isArray(migrated.world.bombs)) {
            for (const bomb of migrated.world.bombs) {
                if (!bomb || typeof bomb !== 'object') continue;
                // Schema 1 no guardaba referencias de portador. Un estado CARRIED
                // sin referencia no puede reconstruirse de forma segura; se normaliza
                // a ARMADA en la casilla guardada de la bomba o del jugador.
                if (bomb.state === global.BOMB_V4_STATES?.CARRIED && !bomb.carriedByRefV6124) {
                    const px = Number(migrated.player.x);
                    const py = Number(migrated.player.y);
                    const tw = 48;
                    const gx = Number.isFinite(Number(bomb.x)) && Number(bomb.x) >= 0 ? Number(bomb.x) : Math.floor((px + Number(migrated.player.width || tw) / 2) / tw);
                    const gy = Number.isFinite(Number(bomb.y)) && Number(bomb.y) >= 0 ? Number(bomb.y) : Math.floor((py + Number(migrated.player.height || tw) / 2) / tw);
                    bomb.x = gx;
                    bomb.y = gy;
                    bomb.worldX = (gx + 0.5) * tw;
                    bomb.worldY = (gy + 0.5) * tw;
                    bomb.timer = Math.max(0, Number(bomb.carriedTimer) || Number(bomb.timer) || 0);
                    bomb.carriedTimer = 0;
                    bomb.carriedBy = null;
                    bomb.state = global.BOMB_V4_STATES?.ARMED || 'armed';
                    bomb.motionState = 'idle';
                }
            }
        }
        return migrated;
    }

    function serializeEntityRef(entity, player, state) {
        if (!entity) return null;
        if (entity === player) return { kind: 'player' };
        if (state?.boss && entity === state.boss) return { kind: 'boss' };
        const enemies = Array.isArray(state?.enemies) ? state.enemies : [];
        const enemyIndex = enemies.indexOf(entity);
        if (enemyIndex >= 0) return { kind: 'enemy', index: enemyIndex };
        return null;
    }

    function serializeBombs(bombs, player, state) {
        if (!Array.isArray(bombs)) return [];
        return bombs.map(bomb => {
            if (!bomb || typeof bomb !== 'object') return null;
            const copy = { ...bomb };
            copy.carriedByRefV6124 = serializeEntityRef(bomb.carriedBy, player, state);
            copy.interactionActorRefV6124 = serializeEntityRef(bomb.interactionActorV682, player, state);
            delete copy.carriedBy;
            delete copy.interactionActorV682;
            return clone(copy);
        }).filter(Boolean);
    }

    function restoreEntityRef(ref, player, state) {
        if (!ref || typeof ref !== 'object') return null;
        if (ref.kind === 'player') return player || null;
        if (ref.kind === 'boss') return state?.boss || null;
        if (ref.kind === 'enemy') return Array.isArray(state?.enemies) ? (state.enemies[Number(ref.index)] || null) : null;
        return null;
    }

    function restoreBombLinks(state, player) {
        const bombs = Array.isArray(state?.bombs) ? state.bombs : [];
        let carried = null;
        for (const bomb of bombs) {
            if (!bomb || typeof bomb !== 'object') continue;
            bomb.carriedBy = restoreEntityRef(bomb.carriedByRefV6124, player, state);
            bomb.interactionActorV682 = restoreEntityRef(bomb.interactionActorRefV6124, player, state);
            delete bomb.carriedByRefV6124;
            delete bomb.interactionActorRefV6124;
            if (bomb.state === global.BOMB_V4_STATES?.CARRIED && bomb.carriedBy === player && !carried) carried = bomb;
        }
        player.carriedBombV682 = carried;
        return carried;
    }

    function syncPlayerBombCountFromState(state, player) {
        if (!player || !Array.isArray(state?.bombs)) return;
        player.bombsPlaced = state.bombs.filter(bomb =>
            bomb && bomb.owner === 'player' && bomb.countsTowardPlayerCapacity !== false && bomb.state !== global.BOMB_V4_STATES?.EXPLODING
        ).length;
    }

    function serializePlayer(player) {
        if (!player) return null;
        const capabilityProfile = player.capabilityProfileV681 && typeof player.capabilityProfileV681 === 'object'
            ? {
                permanent: Array.isArray(player.capabilityProfileV681.permanent) ? player.capabilityProfileV681.permanent.slice() : [],
                byGroup: { ...(player.capabilityProfileV681.byGroup || {}) }
            }
            : null;
        return clone({
            x: player.x, y: player.y, width: player.width, height: player.height,
            speed: player.speed, maxBombs: player.maxBombs, bombsPlaced: player.bombsPlaced,
            bombCooldown: player.bombCooldown, bombRange: player.bombRange,
            health: player.health, maxHealth: player.maxHealth, hasShield: player.hasShield,
            isInvincible: player.isInvincible, invincibleTimer: player.invincibleTimer,
            lastDamageFrame: player.lastDamageFrame, dir: player.dir, isMoving: player.isMoving,
            walkCycle: player.walkCycle, _frameScale: player._frameScale,
            vx: player.vx, vy: player.vy, inputDir: player.inputDir,
            inputAxis: player.inputAxis, inputBuffer: player.inputBuffer,
            inputBufferTimer: player.inputBufferTimer, hazardSlowTimer: player.hazardSlowTimer,
            hazardSlowFactor: player.hazardSlowFactor, hazardSlowType: player.hazardSlowType,
            bombElementV612: player.bombElementV612 || 'normal',
            capabilityProfileV681: capabilityProfile
        });
    }

    function createSnapshot(reason = 'manual') {
        const state = getState();
        const player = getPlayer();
        if (!state || !player || !state.runNumber || Number(state.level) < 1) return null;
        return {
            schemaVersion: SCHEMA_VERSION,
            savedAt: Date.now(),
            reason: String(reason || 'manual'),
            themeId: global.BOMBER_ENGINE?.getThemeId?.() || state.biomeV49?.themeId || 'classic',
            run: {
                runNumber: Number(state.runNumber) || 1,
                level: Number(state.level) || 1,
                score: Number(state.score) || 0,
                coins: Number(state.coins) || 0,
                bestDepth: Number(state.bestDepth) || 0,
                coinBonus: Number(state.coinBonus) || 0,
                killScoreMult: Number(state.killScoreMult) || 1,
                fireScoreMult: Number(state.fireScoreMult) || 1,
                hitInvulnerabilityBonus: Number(state.hitInvulnerabilityBonus) || 0,
                rerollDiscount: Number(state.rerollDiscount) || 0,
                rerolls: Number(state.rerolls) || 0,
                relics: clone((state.relics || []).map(r => ({ id:r.id, icon:r.icon, name:r.name, rarity:r.rarity, desc:r.desc, category:r.category || 'BOMB' }))),
                relicMods: clone(state.relicMods),
                runElapsedMs: Number(state.runElapsedMs) || 0,
                roomTime: Number(state.roomTime) || 0,
                lastMoveAxis: state.lastMoveAxis || 'vertical',
                lastMoveInputAt: Number(state.lastMoveInputAt) || 0,
                blocksBroken: Number(state.blocksBroken) || 0,
                totalKills: Number(state.totalKills) || 0,
            },
            player: serializePlayer(player),
            biome: clone(state.biomeV49),
            journey: clone(state.runJourneyV50),
            history: clone(state.runHistoryV51),
            world: {
                gridWidth: Number(state.gridWidth) || 0,
                gridHeight: Number(state.gridHeight) || 0,
                grid: clone(state.grid),
                gridRevision: Number(state.gridRevision) || 0,
                roomTypeId: state.roomType?.id || 'STANDARD',
                exitPos: clone(state.exitPos),
                exitUnlocked: !!state.exitUnlocked,
                bombs: serializeBombs(state.bombs || [], player, state),
                explosions: [],
                enemies: clone(state.enemies || []),
                items: clone(state.items || []),
                hazards: clone(state.hazards || []),
                environmentHazards: clone(state.environmentHazards || []),
                materialResiduesV60: clone(state.materialResiduesV60 || []),
                biomeLiquidTilesV630: clone(state.biomeLiquidTilesV630 || []),
                hazardCooldown: Number(state.hazardCooldown) || 0,
                boss: clone(state.boss),
                blastSerial: Number(state.blastSerial) || 0,
                difficulty: clone(state.difficulty)
            }
        };
    }

    function saveRunV55(reason = 'manual') {
        const snapshot = createSnapshot(reason);
        if (!snapshot) return false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            return true;
        } catch (_) {
            return false;
        }
    }

    function readSaveV55() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const save = migrateSaveSchemaV55(parsed);
            if (!save || !save.run || !save.world?.grid?.length) return null;
            if (parsed.schemaVersion !== save.schemaVersion) {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (_) {}
            }
            return save;
        } catch (_) { return null; }
    }

    function clearRunSaveV55() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        updateResumeButton();
    }

    function restoreRunV55() {
        const save = readSaveV55();
        const state = getState();
        const player = getPlayer();
        if (!save || !state || !player) return false;

        try {
            if (global.BOMBER_ENGINE?.getThemeId && typeof global.setActiveThemeV46 === 'function') {
                global.setActiveThemeV46(save.themeId || save.biome?.themeId || 'classic', false);
            }

            state.isPlaying = false;
            state.paused = false;
            if (typeof global.cancelScheduledGameLoopV632 === 'function') {
                global.cancelScheduledGameLoopV632(state);
            } else {
                if (state.rafId && global.cancelAnimationFrame) global.cancelAnimationFrame(state.rafId);
                state.rafId = 0;
            }

            Object.assign(state, {
                runNumber: save.run.runNumber,
                level: save.run.level,
                score: save.run.score,
                coins: save.run.coins,
                bestDepth: save.run.bestDepth,
                coinBonus: save.run.coinBonus,
                killScoreMult: save.run.killScoreMult,
                fireScoreMult: save.run.fireScoreMult,
                hitInvulnerabilityBonus: save.run.hitInvulnerabilityBonus,
                rerollDiscount: save.run.rerollDiscount,
                rerolls: save.run.rerolls,
                relics: restoreCanonicalRelics(save.run.relics),
                relicMods: clone(save.run.relicMods) || clone(state.relicMods),
                runElapsedMs: save.run.runElapsedMs,
                roomTime: save.run.roomTime,
                lastMoveAxis: save.run.lastMoveAxis,
                lastMoveInputAt: save.run.lastMoveInputAt,
                blocksBroken: save.run.blocksBroken,
                totalKills: save.run.totalKills,
                biomeV49: clone(save.biome),
                runJourneyV50: clone(save.journey) || { visitedBiomes:[], discoveredVerbs:[], currentBiomeId:null, currentStage:1, maxDepth:0 },
                runHistoryV51: clone(save.history),
                gridWidth: save.world.gridWidth,
                gridHeight: save.world.gridHeight,
                grid: clone(save.world.grid),
                gridRevision: save.world.gridRevision,
                bombs: clone(save.world.bombs) || [],
                explosions: [],
                enemies: clone(save.world.enemies) || [],
                items: clone(save.world.items) || [],
                hazards: clone(save.world.hazards) || [],
                environmentHazards: clone(save.world.environmentHazards) || [],
                materialResiduesV60: clone(save.world.materialResiduesV60) || [],
                biomeLiquidTilesV630: clone(save.world.biomeLiquidTilesV630) || [],
                hazardCooldown: save.world.hazardCooldown,
                boss: clone(save.world.boss),
                blastSerial: save.world.blastSerial,
                difficulty: clone(save.world.difficulty),
                exitPos: clone(save.world.exitPos),
                exitUnlocked: !!save.world.exitUnlocked,
                roomType: typeof ROOM_TYPES !== 'undefined' ? (ROOM_TYPES[save.world.roomTypeId] || ROOM_TYPES.STANDARD) : state.roomType
            });


            Object.assign(player, clone(save.player) || {});
            if (!player.bombElementV612) player.bombElementV612 = 'normal';
            if (player.capabilityProfileV681 && typeof player.capabilityProfileV681 === 'object') {
                player.capabilityProfileV681.permanent = Array.isArray(player.capabilityProfileV681.permanent) ? player.capabilityProfileV681.permanent : [];
                player.capabilityProfileV681.byGroup = player.capabilityProfileV681.byGroup && typeof player.capabilityProfileV681.byGroup === 'object' ? player.capabilityProfileV681.byGroup : {};
            }
            restoreBombLinks(state, player);
            syncPlayerBombCountFromState(state, player);
            if (typeof clampPlayerCapacitiesV67 === 'function') clampPlayerCapacitiesV67();
            if (typeof playerFSMReset === 'function') playerFSMReset('save-restore');
            state.keys = {};
            state.touchControls = { x:0, y:0 };
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            if (typeof updateRoguePresentation === 'function') updateRoguePresentation();
            if (typeof updateUI === 'function') updateUI(true);
            if (typeof draw === 'function') draw();

            document.getElementById('start-screen')?.classList.add('hidden');
            document.getElementById('game-over-screen')?.classList.add('hidden');
            document.getElementById('level-complete-screen')?.classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');

            state.isPlaying = true;
            state.paused = false;
            state.lastTime = performance.now();
            if (typeof global.scheduleGameLoopV632 !== 'function') {
                throw new Error('El coordinador del ciclo de juego no está disponible.');
            }
            global.scheduleGameLoopV632();
            updateResumeButton();
            return true;
        } catch (_) {
            return false;
        }
    }

    function updateResumeButton() {
        const node = global.document?.getElementById?.('btn-resume-run');
        if (!node) return false;
        const save = readSaveV55();
        if (!save) {
            node.classList.add('hidden');
            return false;
        }
        const level = Number(save.run?.level) || 1;
        const biome = save.biome?.name ? `${save.biome.name} ${save.biome.stage || ''}`.trim() : `PROFUNDIDAD ${level}`;
        node.textContent = `CONTINUAR · ${biome.toUpperCase()}`;
        node.classList.remove('hidden');
        return true;
    }

    function install() {
        const resume = global.document?.getElementById?.('btn-resume-run');
        if (!resume) return false;
        if (!resume.dataset.bound) {
            resume.dataset.bound = '1';
            resume.addEventListener('click', () => {
                if (!restoreRunV55()) updateResumeButton();
            });
        }
        updateResumeButton();
        if (!autosaveTimer) autosaveTimer = global.setInterval(() => {
            const state = getState();
            if (state?.isPlaying && !state.paused) saveRunV55('autosave');
        }, AUTOSAVE_MS);
        return true;
    }

    global.saveRunV55 = saveRunV55;
    global.readRunSaveV55 = readSaveV55;
    global.clearRunSaveV55 = clearRunSaveV55;
    global.restoreRunV55 = restoreRunV55;
    global.migrateRunSaveV55 = migrateSaveSchemaV55;
    global.updateResumeButtonV55 = updateResumeButton;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.saveRun = saveRunV55;
    global.BOMBER_ENGINE.loadRun = restoreRunV55;
    global.BOMBER_ENGINE.hasRunSave = () => !!readSaveV55();
    global.BOMBER_ENGINE.clearRunSave = clearRunSaveV55;

    global.addEventListener('pagehide', () => {
        const state = getState();
        if (state?.isPlaying) saveRunV55('pagehide');
    });
    global.addEventListener('beforeunload', () => {
        const state = getState();
        if (state?.isPlaying) saveRunV55('beforeunload');
    });

    function bootstrap() {
        if (install()) return;
        global.setTimeout(bootstrap, 50);
    }
    bootstrap();
})(window);

;
// === js/33-ecs.js ===
// Bomberman Roguelike v5.8 — ECS ultra simple
//
// Objetivo de esta versión:
// - Entity = solo un ID + metadata mínima.
// - Componentes = datos independientes.
// - Systems = funciones pequeñas que sincronizan/validan esos datos.
//
// IMPORTANTE:
// v5.8 NO migra todavía el gameplay a ECS. El ECS funciona como una capa
// estructurada y auditable sobre los objetos existentes para evitar una
// migración grande y riesgosa. La fuente de verdad del gameplay sigue siendo
// el runtime actual; los componentes contienen copias de datos normalizadas.

(function installSimpleECS(global) {
    'use strict';

    const VERSION = '5.8.0';

    const COMPONENTS = Object.freeze({
        POSITION: 'Position',
        HEALTH: 'Health',
        EXPLOSIVE: 'Explosive'
    });

    const ENTITY_KINDS = Object.freeze({
        PLAYER: 'player',
        ENEMY: 'enemy',
        BOMB: 'bomb',
        BOSS: 'boss'
    });

    function finite(value, fallback = 0) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    function positive(value, fallback = 0) {
        return Math.max(0, finite(value, fallback));
    }

    class SimpleECS {
        constructor() {
            this.nextEntityId = 1;
            this.entities = new Set();
            this.meta = new Map();
            this.components = new Map([
                [COMPONENTS.POSITION, new Map()],
                [COMPONENTS.HEALTH, new Map()],
                [COMPONENTS.EXPLOSIVE, new Map()]
            ]);
            this.refToEntity = new WeakMap();
        }

        createEntity(kind = 'generic', ref = null) {
            if (ref && typeof ref === 'object') {
                const existing = this.refToEntity.get(ref);
                if (existing && this.entities.has(existing)) return existing;
            }

            const id = this.nextEntityId++;
            this.entities.add(id);
            this.meta.set(id, {
                kind: String(kind || 'generic'),
                ref: ref && typeof ref === 'object' ? ref : null
            });

            if (ref && typeof ref === 'object') {
                this.refToEntity.set(ref, id);
            }

            return id;
        }

        destroyEntity(entityId) {
            if (!this.entities.has(entityId)) return false;

            for (const store of this.components.values()) {
                store.delete(entityId);
            }

            this.meta.delete(entityId);
            this.entities.delete(entityId);
            return true;
        }

        add(entityId, componentName, data = {}) {
            this._assertComponent(componentName);
            if (!this.entities.has(entityId)) return false;
            this.components.get(componentName).set(entityId, { ...data });
            return true;
        }

        set(entityId, componentName, data = {}) {
            return this.add(entityId, componentName, data);
        }

        get(entityId, componentName) {
            this._assertComponent(componentName);
            return this.components.get(componentName).get(entityId) || null;
        }

        has(entityId, componentName) {
            this._assertComponent(componentName);
            return this.components.get(componentName).has(entityId);
        }

        remove(entityId, componentName) {
            this._assertComponent(componentName);
            return this.components.get(componentName).delete(entityId);
        }

        getMeta(entityId) {
            const meta = this.meta.get(entityId);
            return meta ? { ...meta, ref: meta.ref || null } : null;
        }

        getEntityForObject(objectRef) {
            if (!objectRef || typeof objectRef !== 'object') return null;
            const entityId = this.refToEntity.get(objectRef);
            return entityId && this.entities.has(entityId) ? entityId : null;
        }

        query(...requiredComponents) {
            requiredComponents.forEach(name => this._assertComponent(name));
            if (!requiredComponents.length) return Array.from(this.entities);

            return Array.from(this.entities).filter(entityId =>
                requiredComponents.every(name => this.components.get(name).has(entityId))
            );
        }

        getEntitiesByKind(kind) {
            const expected = String(kind || 'generic');
            return Array.from(this.meta.entries())
                .filter(([, meta]) => meta.kind === expected)
                .map(([entityId]) => entityId);
        }

        count() {
            return this.entities.size;
        }

        reset() {
            this.nextEntityId = 1;
            this.entities.clear();
            this.meta.clear();
            for (const store of this.components.values()) store.clear();
            this.refToEntity = new WeakMap();
        }

        validate() {
            const errors = [];

            for (const [componentName, store] of this.components.entries()) {
                for (const entityId of store.keys()) {
                    if (!this.entities.has(entityId)) {
                        errors.push(`${componentName} apunta a entidad inexistente: ${entityId}`);
                    }
                }
            }

            for (const entityId of this.entities) {
                if (!this.meta.has(entityId)) {
                    errors.push(`Entidad ${entityId} no tiene metadata`);
                }

                const position = this.get(entityId, COMPONENTS.POSITION);
                if (position) {
                    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
                        errors.push(`Position inválida en entidad ${entityId}`);
                    }
                }

                const health = this.get(entityId, COMPONENTS.HEALTH);
                if (health) {
                    if (!Number.isFinite(health.current) || !Number.isFinite(health.max)) {
                        errors.push(`Health inválida en entidad ${entityId}`);
                    }
                    if (health.max < 0 || health.current < 0 || health.current > health.max) {
                        errors.push(`Health fuera de rango en entidad ${entityId}`);
                    }
                }

                const explosive = this.get(entityId, COMPONENTS.EXPLOSIVE);
                if (explosive) {
                    if (!Number.isFinite(explosive.range) || explosive.range < 0) {
                        errors.push(`Explosive.range inválido en entidad ${entityId}`);
                    }
                    if (!Number.isFinite(explosive.remainingMs) || explosive.remainingMs < 0) {
                        errors.push(`Explosive.remainingMs inválido en entidad ${entityId}`);
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                entities: this.count(),
                positions: this.components.get(COMPONENTS.POSITION).size,
                health: this.components.get(COMPONENTS.HEALTH).size,
                explosives: this.components.get(COMPONENTS.EXPLOSIVE).size
            };
        }

        _assertComponent(componentName) {
            if (!this.components.has(componentName)) {
                throw new Error(`Componente ECS desconocido: ${componentName}`);
            }
        }
    }

    const world = new SimpleECS();

    function ensureEntity(kind, ref) {
        return world.createEntity(kind, ref);
    }

    function setPosition(entityId, objectRef, mode = 'object') {
        const tileSize = finite(global.TILE_SIZE, 48);
        let x = finite(objectRef?.x);
        let y = finite(objectRef?.y);

        // Las bombas mantienen coordenadas de grilla como x/y. El ECS usa
        // posición de mundo para no mezclar semánticas entre entidades.
        if (mode === 'bomb') {
            x = Number.isFinite(Number(objectRef?.worldX))
                ? Number(objectRef.worldX)
                : (finite(objectRef?.x) + 0.5) * tileSize;
            y = Number.isFinite(Number(objectRef?.worldY))
                ? Number(objectRef.worldY)
                : (finite(objectRef?.y) + 0.5) * tileSize;
        }

        world.set(entityId, COMPONENTS.POSITION, {
            x,
            y,
            width: positive(objectRef?.width),
            height: positive(objectRef?.height)
        });
    }

    function setHealth(entityId, current, max) {
        const safeMax = positive(max, 0);
        const safeCurrent = Math.min(positive(current, 0), safeMax || positive(current, 0));
        world.set(entityId, COMPONENTS.HEALTH, {
            current: safeCurrent,
            max: safeMax || safeCurrent
        });
    }

    function setExplosive(entityId, bomb) {
        world.set(entityId, COMPONENTS.EXPLOSIVE, {
            range: positive(bomb?.range, 0),
            fuseMs: positive(bomb?.fuseTotal, bomb?.timer || 0),
            remainingMs: positive(bomb?.timer, 0),
            owner: String(bomb?.owner || 'unknown'),
            damage: positive(bomb?.damage, 1)
        });
    }

    function syncPlayer() {
        const player = global.BOMBER_ENGINE?.getPlayer?.() || global.player;
        if (!player) return null;

        const entityId = ensureEntity(ENTITY_KINDS.PLAYER, player);
        setPosition(entityId, player);
        setHealth(entityId, player.health, player.maxHealth);
        return entityId;
    }

    function syncEnemies() {
        const state = global.BOMBER_ENGINE?.getState?.() || global.gameState;
        const enemies = Array.isArray(state?.enemies) ? state.enemies : [];
        const seen = new Set(enemies);

        for (const entityId of world.getEntitiesByKind(ENTITY_KINDS.ENEMY)) {
            const meta = world.getMeta(entityId);
            if (!meta?.ref || !seen.has(meta.ref)) world.destroyEntity(entityId);
        }

        for (const enemy of enemies) {
            if (!enemy) continue;
            const entityId = ensureEntity(ENTITY_KINDS.ENEMY, enemy);
            setPosition(entityId, enemy);

            // Enemigos actuales no tienen HP separado en el gameplay; para que
            // el componente siga siendo uniforme, su vida efectiva es 1/1.
            setHealth(entityId, 1, 1);
        }
    }

    function syncBombs() {
        const state = global.BOMBER_ENGINE?.getState?.() || global.gameState;
        const bombs = Array.isArray(state?.bombs) ? state.bombs : [];
        const seen = new Set(bombs);

        for (const entityId of world.getEntitiesByKind(ENTITY_KINDS.BOMB)) {
            const meta = world.getMeta(entityId);
            if (!meta?.ref || !seen.has(meta.ref)) world.destroyEntity(entityId);
        }

        for (const bomb of bombs) {
            if (!bomb) continue;
            const entityId = ensureEntity(ENTITY_KINDS.BOMB, bomb);
            setPosition(entityId, bomb, 'bomb');
            setExplosive(entityId, bomb);
        }
    }

    function syncBoss() {
        const state = global.BOMBER_ENGINE?.getState?.() || global.gameState;
        const boss = state?.boss;

        for (const entityId of world.getEntitiesByKind(ENTITY_KINDS.BOSS)) {
            const meta = world.getMeta(entityId);
            if (!boss || meta?.ref !== boss) world.destroyEntity(entityId);
        }

        if (!boss) return;

        const entityId = ensureEntity(ENTITY_KINDS.BOSS, boss);
        setPosition(entityId, boss);
        setHealth(entityId, boss.hp, boss.maxHp);
    }

    // System principal de v5.8: sincronización, no gameplay.
    function ecsUpdate() {
        syncPlayer();
        syncEnemies();
        syncBombs();
        syncBoss();
    }

    function ecsReset() {
        world.reset();
    }

    function ecsGetSnapshot() {
        const snapshot = {};
        for (const entityId of world.entities) {
            const meta = world.getMeta(entityId);
            snapshot[entityId] = {
                meta: meta ? { kind: meta.kind } : null,
                position: world.get(entityId, COMPONENTS.POSITION),
                health: world.get(entityId, COMPONENTS.HEALTH),
                explosive: world.get(entityId, COMPONENTS.EXPLOSIVE)
            };
        }
        return snapshot;
    }

    global.ECS_COMPONENTS_V58 = COMPONENTS;
    global.ECS_ENTITY_KINDS_V58 = ENTITY_KINDS;
    global.SimpleECS = SimpleECS;
    global.gameECS = world;
    global.ecsUpdate = ecsUpdate;
    global.ecsReset = ecsReset;
    global.ecsValidate = () => world.validate();
    global.ecsGetSnapshot = ecsGetSnapshot;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getECS = () => world;
    global.BOMBER_ENGINE.validateECS = () => world.validate();
    global.BOMBER_ENGINE.getECSSnapshot = () => ecsGetSnapshot();
    global.BOMBER_ENGINE.getECSEntityForObject = objectRef => world.getEntityForObject(objectRef);
})(window);

;
// === js/34-event-bus.js ===
// Bomberman Roguelike v5.9 — Event Bus
// Event-driven infrastructure, deliberately small and auditable.
//
// PRINCIPLES:
// - Publisher does not know who listens.
// - Listeners are registered with stable keys.
// - The same key cannot create a second listener for the same event.
// - emit() is synchronous so gameplay order remains deterministic.
// - No DOM CustomEvent dependency: this is an internal game bus.

(function installGameEventBus(global) {
    'use strict';

    const VERSION = '6.0.0';

    const EVENTS = Object.freeze({
        BOMBA_EXPLOTO: 'BOMBA_EXPLOTO'
    });

    class GameEventBus {
        constructor() {
            this.__v59EventBus = true;
            this.listeners = new Map();
            this.stats = new Map();
            this.duplicateAttempts = [];
            this.eventSerial = 0;
        }

        on(eventName, handler, options = {}) {
            const event = String(eventName || '');
            const key = String(options.key || '');

            if (!event) throw new Error('EventBus: eventName requerido');
            if (typeof handler !== 'function') throw new TypeError(`EventBus: handler inválido para ${event}`);
            if (!key) throw new Error(`EventBus: listener key requerido para ${event}`);

            let bucket = this.listeners.get(event);
            if (!bucket) {
                bucket = new Map();
                this.listeners.set(event, bucket);
            }

            if (bucket.has(key)) {
                this.duplicateAttempts.push({
                    event,
                    key,
                    time: Number(global.performance?.now?.() || Date.now())
                });
                return bucket.get(key).unsubscribe;
            }

            const entry = {
                key,
                handler,
                unsubscribe: () => this.off(event, key)
            };

            bucket.set(key, entry);
            return entry.unsubscribe;
        }

        off(eventName, key) {
            const event = String(eventName || '');
            const listenerKey = String(key || '');
            const bucket = this.listeners.get(event);
            if (!bucket) return false;

            const removed = bucket.delete(listenerKey);
            if (!bucket.size) this.listeners.delete(event);
            return removed;
        }

        emit(eventName, payload = {}) {
            const event = String(eventName || '');
            const bucket = this.listeners.get(event);
            const listeners = bucket ? Array.from(bucket.values()) : [];
            const eventId = ++this.eventSerial;
            const stamp = Number(global.performance?.now?.() || Date.now());

            const stat = this.stats.get(event) || {
                emitted: 0,
                listenerCalls: 0,
                listenerErrors: 0
            };
            stat.emitted++;
            this.stats.set(event, stat);

            const meta = Object.freeze({
                event,
                eventId,
                time: stamp
            });

            const errors = [];
            for (const entry of listeners) {
                try {
                    entry.handler(payload, meta);
                    stat.listenerCalls++;
                } catch (error) {
                    stat.listenerErrors++;
                    errors.push({ key: entry.key, error });
                    // Un listener defect should be visible, but one bad listener
                    // must not stop the rest of the event fan-out.
                    if (global.console?.error) {
                        global.console.error(`[EventBus ${event}] listener ${entry.key} falló`, error);
                    }
                }
            }

            return Object.freeze({
                event,
                eventId,
                listenerCount: listeners.length,
                errors
            });
        }

        listenerCount(eventName) {
            const bucket = this.listeners.get(String(eventName || ''));
            return bucket ? bucket.size : 0;
        }

        getListenerKeys(eventName) {
            const bucket = this.listeners.get(String(eventName || ''));
            return bucket ? Array.from(bucket.keys()) : [];
        }

        audit() {
            const listeners = {};
            for (const [event, bucket] of this.listeners.entries()) {
                listeners[event] = Array.from(bucket.keys());
            }

            const stats = {};
            for (const [event, value] of this.stats.entries()) {
                stats[event] = { ...value };
            }

            const duplicateKeys = this.duplicateAttempts.map(item => `${item.event}:${item.key}`);

            const errors = [];
            for (const [event, keys] of Object.entries(listeners)) {
                const unique = new Set(keys);
                if (unique.size !== keys.length) {
                    errors.push(`Listener duplicado en ${event}`);
                }
            }

            if (this.duplicateAttempts.length) {
                errors.push(`Intentos de registro duplicado: ${this.duplicateAttempts.length}`);
            }

            return {
                valid: errors.length === 0,
                version: VERSION,
                listeners,
                stats,
                duplicateAttempts: this.duplicateAttempts.map(item => ({ ...item })),
                duplicateKeys,
                errors
            };
        }

        resetStats() {
            this.stats.clear();
            this.duplicateAttempts.length = 0;
            this.eventSerial = 0;
        }
    }

    // Preserve an existing bus if the script is evaluated more than once.
    const existingBus = global.gameEventBus;
    const bus = existingBus && existingBus.__v59EventBus === true
        ? existingBus
        : new GameEventBus();

    global.GameEventBus = GameEventBus;
    global.GAME_EVENTS_V59 = EVENTS;
    global.GAME_EVENTS_V60 = EVENTS;
    global.gameEventBus = bus;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEventBus = () => bus;
    global.BOMBER_ENGINE.auditEventListeners = () => bus.audit();
    global.BOMBER_ENGINE.emitGameEvent = (eventName, payload) => bus.emit(eventName, payload);
})(window);

;
// === js/35-bomb-events.js ===
// Bomberman Roguelike v6.30.10 — Bomb explosion event listeners
//
// These listeners intentionally know nothing about explodeBomb().
// The bomb system only publishes BOMBA_EXPLOTO.

(function installBombExplosionListeners(global) {
    'use strict';

    const bus = global.gameEventBus;
    const EVENT = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;

    if (!bus || !EVENT) {
        throw new Error('v5.9: Event Bus no disponible para BOMBA_EXPLOTO');
    }

    // Contrato completo del evento. El listener elemental se registra desde
    // 38-bomb-effects.js; no debe contarse como duplicado ni omitirse del audit.
    const LISTENER_KEYS = Object.freeze({
        SOUND: 'bomb-explosion:sound',
        BLOCKS: 'bomb-explosion:destroy-blocks',
        EFFECTS: 'bomb-explosion:effects'
    });

    const BASE_LISTENER_KEYS = Object.freeze([LISTENER_KEYS.SOUND, LISTENER_KEYS.BLOCKS]);

    function handleBombExplosionSound(payload) {
        if (!payload?.bomb) return;
        sfx('boom');
    }

    function handleBombExplosionBlockDestruction(payload) {
        const cells = Array.isArray(payload?.cells) ? payload.cells : [];

        for (const cell of cells) {
            if (!cell?.block) continue;

            const tx = Number(cell.x);
            const ty = Number(cell.y);
            const row = gameState.grid?.[ty];
            if (!row || tx < 0 || tx >= gameState.gridWidth) continue;

            // Listener idempotency: the event payload describes one blast,
            // but the grid is checked before mutating it. A duplicate event
            // cannot grant block rewards twice for the same cell.
            if (row[tx] !== TYPES.BLOCK) continue;

            row[tx] = TYPES.EMPTY;
            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            gameState.score += 10;
            gameState.blocksBroken++;

            const coins = Math.max(
                1,
                Math.round(
                    (1 + Math.random() * 2) *
                    (1 + gameState.coinBonus) *
                    gameState.roomType.coinMult
                )
            );
            gameState.coins += coins;
            addFloatingText(
                `+10  +${coins}¢`,
                (tx + 0.5) * TILE_SIZE,
                (ty + 0.5) * TILE_SIZE,
                '#fbbf24'
            );
            addParticles(
                (tx + 0.5) * TILE_SIZE,
                (ty + 0.5) * TILE_SIZE,
                'particleBlock',
                12
            );

            if (gameState.exitPos && gameState.exitPos.x === tx && gameState.exitPos.y === ty) {
                // La salida se revela bloqueada al destruir su cobertura.
                // Solo se abre cuando no quedan enemigos.
                gameState.grid[ty][tx] = TYPES.EXIT_LOCKED;
                gameState.exitUnlocked = false;
                if (typeof tryUnlockExitCurrentRoom === 'function' && tryUnlockExitCurrentRoom()) {
                    addFloatingText(
                        '🚪 SALIDA DESBLOQUEADA',
                        (tx + 0.5) * TILE_SIZE,
                        (ty + 0.5) * TILE_SIZE,
                        '#facc15'
                    );
                }
            } else if (Math.random() < gameState.roomType.dropChance) {
                const pool = typeof getPowerupDropPoolV67 === 'function' ? getPowerupDropPoolV67() : [POWERUPS.SPEED_UP, POWERUPS.HEALTH_UP, POWERUPS.SHIELD_UP];
                gameState.items.push({ x: tx, y: ty, type: pool[Math.floor(Math.random() * pool.length)] });
            }

            if (
                getAvailableRelics().length &&
                Math.random() < (gameState.roomType.id === 'TREASURE' ? 0.10 : 0.035)
            ) {
                const relicPool = getAvailableRelics();
                const relic = relicPool[Math.floor(Math.random() * relicPool.length)];
                gameState.items.push({
                    x: tx,
                    y: ty,
                    type: 'RELIC',
                    relicId: relic.id
                });
            }
        }
    }

    function install() {
        // Idempotencia a nivel de módulo: reinicializar el instalador no vuelve
        // a registrar listeners ni genera falsos positivos en la auditoría.
        if (global.__BOMB_EXPLOSION_LISTENERS_V59__) {
            return global.__BOMB_EXPLOSION_LISTENERS_V59__.subscriptions;
        }

        const soundOff = bus.on(EVENT, handleBombExplosionSound, { key: LISTENER_KEYS.SOUND });
        const blocksOff = bus.on(EVENT, handleBombExplosionBlockDestruction, { key: LISTENER_KEYS.BLOCKS });
        const subscriptions = Object.freeze({ soundOff, blocksOff });

        global.__BOMB_EXPLOSION_LISTENERS_V59__ = Object.freeze({ subscriptions });
        return subscriptions;
    }

    const subscriptions = install();

    function audit() {
        const base = bus.audit();
        const actual = bus.getListenerKeys(EVENT).slice().sort();
        const expected = Object.values(LISTENER_KEYS).slice().sort();
        const actualSet = new Set(actual);
        const errors = base.errors.slice();
        const missing = expected.filter(key => !actualSet.has(key));
        const unexpected = actual.filter(key => !expected.includes(key));

        if (missing.length) errors.push(`BOMBA_EXPLOTO sin listeners requeridos: ${missing.join(', ')}`);
        if (unexpected.length) errors.push(`BOMBA_EXPLOTO con listeners no registrados en el contrato: ${unexpected.join(', ')}`);
        if (actual.length !== actualSet.size) errors.push('BOMBA_EXPLOTO contiene claves de listener repetidas');

        return {
            ...base,
            event: EVENT,
            baseListenerKeys: BASE_LISTENER_KEYS.slice().sort(),
            expectedListenerKeys: expected,
            actualListenerKeys: actual,
            missingListenerKeys: missing,
            unexpectedListenerKeys: unexpected,
            valid: errors.length === 0,
            errors
        };
    }

    global.BOMB_EXPLOSION_EVENT_LISTENER_KEYS_V59 = LISTENER_KEYS;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.installBombExplosionListeners = install;
    global.BOMBER_ENGINE.getBombExplosionListenerKeys = () => Array.from(Object.values(LISTENER_KEYS));
    global.BOMBER_ENGINE.getBombExplosionSubscriptions = () => subscriptions;
    global.BOMBER_ENGINE.auditBombExplosionListeners = audit;
})(window);

;
// === js/36-material-field.js ===
// Bomberman Roguelike v6.0 — Persistent Material Field
// Noita-inspired direction, but intentionally discrete and small:
// persistent tile residues + deterministic pair reactions + bounded spreading.
//
// Material field infrastructure. Producers are intentionally absent while the field is disabled.

(function installMaterialFieldV60(global) {
    'use strict';

    const VERSION = '6.7.0';
    const MATERIAL_FIELD_ENABLED_V60 = false; // true = reactiva todo el campo de materiales.

    const MAX_RESIDUES = 360;
    const MAX_SPREADS_PER_FRAME = 14;

    const MATERIALS = Object.freeze({
        FIRE: 'fire',
        WATER: 'water',
        OIL: 'oil',
        ACID: 'acid',
        ELECTRIC: 'electric',
        STEAM: 'steam',
        BURNING_OIL: 'burning_oil',
        ELECTRIC_WATER: 'electric_water',
        ICE: 'ice',
        SLICK_ICE: 'slick_ice',
        PACKED_ICE: 'packed_ice',
        FROZEN_OIL: 'frozen_oil'
    });

    const MATERIAL_DEFS = Object.freeze({
        [MATERIALS.FIRE]: Object.freeze({
            label: 'Fuego',
            color: '#fb6b22',
            core: '#ffe58a',
            lifeMs: 1900,
            persistent: true,
            flammable: false,
            damage: true
        }),
        [MATERIALS.WATER]: Object.freeze({
            label: 'Agua',
            color: '#38bdf8',
            core: '#bdefff',
            lifeMs: 5200,
            persistent: true,
            spreads: true,
            spreadMs: 340,
            damage: false
        }),
        [MATERIALS.OIL]: Object.freeze({
            label: 'Aceite',
            color: '#8b5a2b',
            core: '#d6a15d',
            lifeMs: 7200,
            persistent: true,
            spreads: true,
            spreadMs: 420,
            flammable: true,
            damage: false
        }),
        [MATERIALS.ACID]: Object.freeze({
            label: 'Ácido',
            color: '#a3e635',
            core: '#ecfccb',
            lifeMs: 6800,
            persistent: true,
            spreads: true,
            spreadMs: 520,
            corrosive: true,
            damage: true
        }),
        [MATERIALS.ELECTRIC]: Object.freeze({
            label: 'Electricidad',
            color: '#60a5fa',
            core: '#ffffff',
            lifeMs: 180,
            persistent: false,
            damage: false
        }),
        [MATERIALS.STEAM]: Object.freeze({
            label: 'Vapor',
            color: '#e2e8f0',
            core: '#ffffff',
            lifeMs: 650,
            persistent: false,
            damage: false
        }),
        [MATERIALS.BURNING_OIL]: Object.freeze({
            label: 'Aceite ardiendo',
            color: '#f97316',
            core: '#fef08a',
            lifeMs: 3300,
            persistent: true,
            spreads: true,
            spreadMs: 240,
            damage: true,
            flammable: false
        }),
        [MATERIALS.ELECTRIC_WATER]: Object.freeze({
            label: 'Agua electrificada',
            color: '#60a5fa',
            core: '#ede9fe',
            lifeMs: 850,
            persistent: false,
            damage: true
        })
,
        [MATERIALS.ICE]: Object.freeze({
            label: 'Hielo',
            color: '#dff6ff',
            core: '#ffffff',
            lifeMs: 4000,
            persistent: true,
            damage: false
        }),
        [MATERIALS.SLICK_ICE]: Object.freeze({
            label: 'Hielo pulido',
            color: '#a5e4ff',
            core: '#effcff',
            lifeMs: 12000,
            persistent: true,
            damage: false
        }),
        [MATERIALS.PACKED_ICE]: Object.freeze({
            label: 'Hielo compacto',
            color: '#7dd3fc',
            core: '#e0f2fe',
            lifeMs: 3000,
            persistent: true,
            blocks: true,
            damage: false
        }),
        [MATERIALS.FROZEN_OIL]: Object.freeze({
            label: 'Aceite congelado',
            color: '#8b5a2b',
            core: '#d6a15d',
            lifeMs: 8000,
            persistent: true,
            flammable: false,
            damage: false
        })
    });

    // Commutative reaction table. The first key is normalized so FIRE+WATER
    // and WATER+FIRE always produce the same result.
    const REACTIONS = new Map([
        ['fire|water', Object.freeze({ result: MATERIALS.STEAM, lifeMs: 650, amount: 70, message: 'VAPOR' })],
        ['fire|oil', Object.freeze({ result: MATERIALS.BURNING_OIL, lifeMs: 3300, amount: 100, message: 'ACEITE EN LLAMAS' })],
        ['electric|water', Object.freeze({ result: MATERIALS.ELECTRIC_WATER, lifeMs: 850, amount: 90, message: 'AGUA ELECTRIFICADA' })],
        ['acid|water', Object.freeze({ result: MATERIALS.WATER, lifeMs: 3000, amount: 45, message: 'ÁCIDO DILUIDO' })],
        ['fire|ice', Object.freeze({ result: MATERIALS.WATER, lifeMs: 3000, amount: 70, message: 'SE DERRITE' })],
        ['ice|water', Object.freeze({ result: MATERIALS.SLICK_ICE, lifeMs: 12000, amount: 90, message: 'HIELO PULIDO' })],
        ['ice|electric', Object.freeze({ result: MATERIALS.WATER, lifeMs: 2000, amount: 60, message: 'SE ROMPE' })],
        ['ice|oil', Object.freeze({ result: MATERIALS.FROZEN_OIL, lifeMs: 8000, amount: 100, message: 'ACEITE CONGELADO' })],
        ['fire|frozen_oil', Object.freeze({ result: MATERIALS.BURNING_OIL, lifeMs: 3300, amount: 100, message: 'SE ENCIENDE TARDE' })],
        ['frozen_oil|water', Object.freeze({ result: MATERIALS.OIL, lifeMs: 7200, amount: 60, message: 'SE DESCONGELA' })],
        ['ice|acid', Object.freeze({ result: MATERIALS.WATER, lifeMs: 2500, amount: 45, message: 'ÁCIDO DILUIDO' })],
        ['ice|ice', Object.freeze({ result: MATERIALS.PACKED_ICE, lifeMs: 3000, amount: 100, message: 'HIELO COMPACTO' })]
    ]);

    function getState() {
        return global.BOMBER_ENGINE?.getState?.() || global.gameState || null;
    }

    function ensureStore() {
        const state = getState();
        if (!state) return null;
        if (!Array.isArray(state.materialResiduesV60)) state.materialResiduesV60 = [];
        return state.materialResiduesV60;
    }

    function tileKey(x, y) {
        return `${Math.trunc(x)},${Math.trunc(y)}`;
    }

    function isInsideGrid(x, y) {
        const state = getState();
        return !!state && x >= 0 && y >= 0 && x < Number(state.gridWidth) && y < Number(state.gridHeight);
    }

    function canOccupyTile(x, y, materialType = null) {
        const state = getState();
        if (!isInsideGrid(x, y)) return false;
        const type = state.grid?.[y]?.[x];
        const wall = Number(global.BOMBER_ENGINE?.getWorldTypes?.()?.WALL ?? 1);
        const locked = Number(global.BOMBER_ENGINE?.getWorldTypes?.()?.EXIT_LOCKED ?? 3);
        const block = Number(global.BOMBER_ENGINE?.getWorldTypes?.()?.BLOCK ?? 2);
        if (type === wall || type === locked) return false;
        if (type === block && materialType !== MATERIALS.ACID) return false;
        if (materialType !== MATERIALS.ACID && isMaterialBlockingTile(x, y)) return false;
        return true;
    }

    function normalizeAmount(amount) {
        return Math.max(1, Math.min(100, Number(amount) || 1));
    }

    function definition(type) {
        return MATERIAL_DEFS[type] || null;
    }

    function findResidue(store, x, y) {
        const key = tileKey(x, y);
        for (let i = 0; i < store.length; i++) {
            if (store[i]?.key === key) return { residue: store[i], index: i };
        }
        return null;
    }

    function reactionKey(a, b) {
        const pair = [String(a), String(b)].sort();
        return `${pair[0]}|${pair[1]}`;
    }

    function showReactionMessage(reaction, x, y) {
        if (!reaction?.message || typeof global.addFloatingText !== 'function') return;
        global.addFloatingText(
            reaction.message,
            (x + 0.5) * Number(global.TILE_SIZE || 48),
            (y + 0.25) * Number(global.TILE_SIZE || 48),
            '#f8fafc'
        );
    }

    function writeResidue(store, residue, type, amount, lifeMs, source = 'system') {
        const def = definition(type);
        if (!def) return residue;
        residue.type = type;
        residue.amount = normalizeAmount(amount);
        residue.lifeMs = Math.max(1, Number(lifeMs) || def.lifeMs);
        residue.spreadTimerMs = Math.min(residue.spreadTimerMs || 0, def.spreadMs || 0);
        residue.source = source;
        return residue;
    }

    function deposit(type, x, y, amount = 100, options = {}) {
        const def = definition(type);
        const store = ensureStore();
        const tx = Math.trunc(Number(x));
        const ty = Math.trunc(Number(y));
        if (!def || !store || !isInsideGrid(tx, ty) || !canOccupyTile(tx, ty, type)) return false;

        const existingInfo = findResidue(store, tx, ty);
        if (!existingInfo) {
            if (store.length >= MAX_RESIDUES) return false;
            const residue = {
                key: tileKey(tx, ty),
                x: tx,
                y: ty,
                type,
                amount: normalizeAmount(amount),
                lifeMs: Math.max(1, Number(options.lifeMs) || def.lifeMs),
                spreadTimerMs: Number(options.spreadTimerMs) || 0,
                source: String(options.source || 'system'),
                reactionCount: 0,
                layers: 1,
                contactCooldownMs: 0
            };
            store.push(residue);
            return true;
        }

        const existing = existingInfo.residue;
        if (existing.type === type) {
            existing.amount = Math.min(100, existing.amount + normalizeAmount(amount) * 0.55);
            existing.lifeMs = Math.max(existing.lifeMs, Number(options.lifeMs) || def.lifeMs);
            existing.layers = Math.min(9, Number(existing.layers || 1) + 1);
            if (type === MATERIALS.ICE && existing.layers >= 3) {
                const selfReaction = REACTIONS.get('ice|ice');
                if (selfReaction) {
                    writeResidue(store, existing, selfReaction.result, selfReaction.amount, selfReaction.lifeMs, 'reaction');
                    existing.reactionCount = (existing.reactionCount || 0) + 1;
                    showReactionMessage(selfReaction, tx, ty);
                }
            }
            return true;
        }

                const directReaction = REACTIONS.get(reactionKey(existing.type, type));
        if (directReaction) {
            const resultDef = definition(directReaction.result);
            writeResidue(store, existing, directReaction.result, directReaction.amount, directReaction.lifeMs, 'reaction');
            existing.reactionCount = (existing.reactionCount || 0) + 1;
            if (resultDef?.spreads) existing.spreadTimerMs = resultDef.spreadMs;
            showReactionMessage(directReaction, tx, ty);
            if (typeof global.addParticles === 'function') {
                const particleType = directReaction.result === MATERIALS.STEAM ? 'particleImpact' : 'particleDanger';
                global.addParticles((tx + 0.5) * Number(global.TILE_SIZE || 48), (ty + 0.5) * Number(global.TILE_SIZE || 48), particleType, 8);
            }
            return true;
        }

        // Unknown pairs do not overwrite each other. This prevents the system
        // from inventing chemistry and makes future reactions explicit.
        return false;
    }

    function getResidueAtTile(x, y){
        const store = ensureStore();
        const found = store ? findResidue(store, Math.trunc(x), Math.trunc(y)) : null;
        return found?.residue || null;
    }

    function entityCell(entity){
        const size = Number(global.TILE_SIZE || 48);
        if (!entity || !Number.isFinite(Number(entity.x)) || !Number.isFinite(Number(entity.y))) return null;
        return {
            x: Math.floor((Number(entity.x) + Number(entity.width || 0) / 2) / size),
            y: Math.floor((Number(entity.y) + Number(entity.height || 0) / 2) / size)
        };
    }

    function getMaterialMovementModifiersV67(entity){
        if (!MATERIAL_FIELD_ENABLED_V60) return Object.freeze({ acceleration:1, braking:1, turnCarry:1, speedMultiplier:1, inputBufferMultiplier:1 });
        const cell = entityCell(entity);
        const residue = cell ? getResidueAtTile(cell.x, cell.y) : null;
        const result = { acceleration:1, braking:1, turnCarry:1, speedMultiplier:1, inputBufferMultiplier:1 };
        if (!residue) return Object.freeze(result);
        const table = {
            [MATERIALS.ICE]: { braking:.55, acceleration:.92, turnCarry:1.05, speedMultiplier:1 },
            [MATERIALS.SLICK_ICE]: { braking:.28, acceleration:.85, turnCarry:1.15, speedMultiplier:1 },
            [MATERIALS.WATER]: { braking:.80, acceleration:.95, turnCarry:1.02, speedMultiplier:.98 },
            [MATERIALS.FROZEN_OIL]: { braking:.40, acceleration:.90, turnCarry:1.10, speedMultiplier:1 },
            [MATERIALS.BURNING_OIL]: { speedMultiplier:.85 },
            [MATERIALS.ELECTRIC_WATER]: { speedMultiplier:.85 }
        };
        return Object.freeze({ ...result, ...(table[residue.type] || {}) });
    }


    function isMaterialBlockingTile(x,y){ if (!MATERIAL_FIELD_ENABLED_V60) return false; const residue=getResidueAtTile(x,y); return !!residue && !!definition(residue.type)?.blocks; }

    function removeAt(x, y) {
        const store = ensureStore();
        if (!store) return false;
        const found = findResidue(store, x, y);
        if (!found) return false;
        store.splice(found.index, 1);
        return true;
    }

    function neighbors4(x, y) {
        return [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 }
        ];
    }

    function spreadResidue(store, residue) {
        const def = definition(residue.type);
        if (!def?.spreads || residue.amount < 10) return 0;
        const neighbors = neighbors4(residue.x, residue.y);
        // Deterministic neighbor order: avoids random simulation differences.
        for (const target of neighbors) {
            if (!canOccupyTile(target.x, target.y, residue.type)) continue;
            const found = findResidue(store, target.x, target.y);
            if (found && found.residue.type === residue.type) continue;
            if (found && !REACTIONS.has(reactionKey(found.residue.type, residue.type))) continue;
            const transfer = Math.max(8, Math.round(residue.amount * 0.28));
            const deposited = deposit(residue.type, target.x, target.y, transfer, { source: 'spread' });
            if (deposited) {
                residue.amount = Math.max(1, residue.amount - transfer * 0.5);
                return 1;
            }
        }
        return 0;
    }

    function playerCell() {
        const state = getState();
        const player = global.BOMBER_ENGINE?.getPlayer?.() || global.player;
        const size = Number(global.TILE_SIZE || 48);
        if (!state || !player) return null;
        return {
            x: Math.floor((Number(player.x) + Number(player.width || 0) / 2) / size),
            y: Math.floor((Number(player.y) + Number(player.height || 0) / 2) / size)
        };
    }

    function damagePlayerFromResidue(residue, dt) {
        const player = global.BOMBER_ENGINE?.getPlayer?.() || global.player;
        if (!player || !residue || !definition(residue.type)?.damage) return;
        residue.contactCooldownMs = Math.max(0, Number(residue.contactCooldownMs) - dt);
        if (residue.contactCooldownMs > 0) return;
        const cell = playerCell();
        if (!cell || cell.x !== residue.x || cell.y !== residue.y) return;

        residue.contactCooldownMs = residue.type === MATERIALS.ELECTRIC_WATER ? 850 : 900;
        if (typeof global.takeDamage === 'function') global.takeDamage('material', (residue.x + 0.5) * Number(global.TILE_SIZE || 48), (residue.y + 0.5) * Number(global.TILE_SIZE || 48));
    }



    function update(dt = 16.6667) {
        if (!MATERIAL_FIELD_ENABLED_V60) return;
        const state = getState();
        const store = ensureStore();
        if (!state || !store || !state.isPlaying || state.paused) return;

        const safeDt = Math.max(0, Math.min(100, Number(dt) || 16.6667));
        let spreads = 0;
        for (let i = store.length - 1; i >= 0; i--) {
            const residue = store[i];
            const def = definition(residue?.type);
            if (!residue || !def) {
                store.splice(i, 1);
                continue;
            }

            residue.lifeMs -= safeDt;
            residue.spreadTimerMs = Math.max(0, Number(residue.spreadTimerMs) - safeDt);
            if (residue.lifeMs <= 0 || residue.amount <= 0) {
                store.splice(i, 1);
                continue;
            }

            damagePlayerFromResidue(residue, safeDt);

            if (def.corrosive && residue.type === MATERIALS.ACID) {
                const type = state.grid?.[residue.y]?.[residue.x];
                if (type === global.TYPES?.BLOCK && residue.lifeMs % 360 < safeDt) {
                    state.grid[residue.y][residue.x] = global.TYPES.EMPTY;
                    state.gridRevision = (state.gridRevision || 0) + 1;
                    if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
                }
            }

            if (def.spreads && residue.spreadTimerMs <= 0 && spreads < MAX_SPREADS_PER_FRAME) {
                residue.spreadTimerMs = def.spreadMs;
                spreads += spreadResidue(store, residue);
            }
        }
    }

    function reset() {
        const store = ensureStore();
        if (store) store.length = 0;
    }

    function validate() {
        const state = getState();
        const store = ensureStore() || [];
        const errors = [];
        const keys = new Set();
        for (const residue of store) {
            if (!residue || !definition(residue.type)) errors.push('Residuo con tipo inválido');
            if (!Number.isInteger(residue?.x) || !Number.isInteger(residue?.y)) errors.push('Residuo con coordenada inválida');
            if (keys.has(residue?.key)) errors.push(`Residuo duplicado: ${residue.key}`);
            keys.add(residue?.key);
            if (Number(residue?.amount) <= 0) errors.push(`Residuo con amount <= 0: ${residue?.key}`);
            if (Number(residue?.lifeMs) <= 0) errors.push(`Residuo con lifeMs <= 0: ${residue?.key}`);
        }
        if (store.length > MAX_RESIDUES) errors.push(`Límite de residuos superado: ${store.length}/${MAX_RESIDUES}`);
        return {
            valid: errors.length === 0,
            version: VERSION,
            count: store.length,
            max: MAX_RESIDUES,
            grid: state ? `${state.gridWidth}x${state.gridHeight}` : 'N/D',
            types: Object.fromEntries(Object.values(MATERIALS).map(type => [type, store.filter(r => r.type === type).length])),
            errors
        };
    }

    function snapshot() {
        const store = ensureStore() || [];
        return store.map(residue => ({
            x: residue.x,
            y: residue.y,
            type: residue.type,
            amount: residue.amount,
            lifeMs: residue.lifeMs,
            spreadTimerMs: residue.spreadTimerMs,
            source: residue.source,
            layers: Number(residue.layers || 1)
        }));
    }

    function draw(targetCtx) {
        if (!MATERIAL_FIELD_ENABLED_V60) return;
        const state = getState();
        const store = ensureStore();
        const ctx = targetCtx;
        if (!state || !store || !store.length || !ctx) return;
        const size = Number(global.BOMBER_ENGINE?.getTileSize?.() || 48);

        ctx.save();
        for (const residue of store) {
            const def = definition(residue.type);
            if (!def) continue;
            const x = residue.x * size;
            const y = residue.y * size;
            const alpha = Math.max(0.10, Math.min(0.78, 0.12 + residue.amount / 150));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = def.color;
            ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
            ctx.globalAlpha = Math.min(0.9, alpha + 0.12);
            ctx.fillStyle = def.core;
            const pulse = 2 + Math.sin((Number(state.animFrame) || 0) * 0.11 + residue.x * 0.7 + residue.y * 0.5) * 1.4;
            ctx.fillRect(x + size * 0.5 - pulse, y + size * 0.5 - pulse, pulse * 2, pulse * 2);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // Sin listener de BOMBA_EXPLOTO: el campo queda como infraestructura desacoplada.
    // Para reactivar producción externa de materiales, registrar aquí un consumidor explícito.



    global.MATERIAL_FIELD_ENABLED_V60 = MATERIAL_FIELD_ENABLED_V60;
    global.MATERIALS_V60 = MATERIALS;
    global.MATERIAL_DEFS_V60 = MATERIAL_DEFS;
    global.MATERIAL_REACTIONS_V60 = REACTIONS;
    global.materialDepositV60 = deposit;
    global.materialRemoveAtV60 = removeAt;
    global.materialUpdateV60 = update;
    global.materialResetV60 = reset;
    global.materialValidateV60 = validate;
    global.materialSnapshotV60 = snapshot;
    global.getResidueAtTileV67 = getResidueAtTile;
    global.getMaterialMovementModifiersV67 = getMaterialMovementModifiersV67;
    global.isMaterialBlockingTileV67 = isMaterialBlockingTile;
    global.drawMaterialResiduesV60 = draw;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getMaterials = () => ({
        types: MATERIALS,
        definitions: MATERIAL_DEFS,
        reactions: REACTIONS,
        snapshot
    });
    global.BOMBER_ENGINE.validateMaterials = validate;
    global.BOMBER_ENGINE.spawnMaterial = deposit;
    global.BOMBER_ENGINE.resetMaterials = reset;
    global.BOMBER_ENGINE.auditMaterialEventListener = () => ({
        enabled: MATERIAL_FIELD_ENABLED_V60,
        valid: !MATERIAL_FIELD_ENABLED_V60,
        event: null,
        key: null,
        listenerCount: 0
    });
})(window);

;
// === js/37-death-echo.js ===
// Bomberman Roguelike v6.31.20 — Death Echo: bomba visible y transporte prolongado
// Echo representa al personaje que murió: conserva su build y utiliza los mismos
// verbos de interacción, pero con una IA autónoma y movimiento estrictamente tile-to-tile.
(function installDeathEchoV620(global) {
    'use strict';

    const VERSION = '6.31.20';
    const COMPATIBLE_VERSIONS = new Set([
        '6.3.0','6.3.1','6.5.1','6.7.0','6.7.1','6.7.1.1','6.11.0','6.12.12','6.12.13','6.12.17','6.12.18','6.28.0','6.31.18','6.31.19','6.31.20'
    ]);
    if (global.__DEATH_ECHO_V618_INSTALLED__) return;
    global.__DEATH_ECHO_V618_INSTALLED__ = true;

    const STORAGE_KEY = 'bombermanDeathEchoesV63';
    const MAX_ECHOES = 44;
    const GHOST_OWNER = 'death_echo';

    const ECHO_AI = Object.freeze({
        // Encuentro sencillo: visión más corta, decisiones pausadas y pocos ataques.
        visionRange: 4,
        thinkMs: 680,
        patrolThinkMs: 1120,
        directionCommitMs: 650,
        reactionMs: 1250,
        wallPauseMs: 900,
        blockedRetryMs: 300,
        bombCooldownMs: 3600,
        carryTimeoutMs: 10000,
        minimumCarryMs: 4200,
        carryReplanMs: 850,
        dangerFuseMs: 950,
        escapeThinkMs: 180,
        bombSpatialRange: 2,
        patrolSideChance: 0.20,
        attackChance: 0.48,
        minimumFuseMs: 2600,
        maxBombRange: 2
    });

    const state = {
        checkedLevel: null,
        active: null,
        originalInitLevel: null,
        wrappedInitLevel: false
    };

    function num(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clone(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function cellKey(x, y) {
        return `${x},${y}`;
    }

    function inside(x, y) {
        return !!gameState && x >= 0 && y >= 0 && x < gameState.gridWidth && y < gameState.gridHeight;
    }

    function tileFromEntity(entity) {
        if (!entity) return { x: 1, y: 1 };
        if (typeof global.gridEntityTileV628 === 'function') return global.gridEntityTileV628(entity);
        // Compatibilidad defensiva si el helper central no está disponible.
        if (entity.__gridAnchor === 'center') {
            return {
                x: Math.max(0, Math.min(gameState.gridWidth - 1, Math.round((num(entity.x) - TILE_SIZE / 2) / TILE_SIZE))),
                y: Math.max(0, Math.min(gameState.gridHeight - 1, Math.round((num(entity.y) - TILE_SIZE / 2) / TILE_SIZE)))
            };
        }
        return {
            x: Math.floor((num(entity.x) + num(entity.width) / 2) / TILE_SIZE),
            y: Math.floor((num(entity.y) + num(entity.height) / 2) / TILE_SIZE)
        };
    }

    function isCenteredOnTile(ghost) {
        if (!ghost || ghost._tileMoveActive) return false;
        if (typeof global.gridEntityCenteredV628 === 'function') return global.gridEntityCenteredV628(ghost, 1.25);
        const tile = tileFromEntity(ghost);
        return Math.abs(num(ghost.x) - (tile.x + 0.5) * TILE_SIZE) <= 1.25 &&
            Math.abs(num(ghost.y) - (tile.y + 0.5) * TILE_SIZE) <= 1.25;
    }

    function snapEchoToGrid(ghost) {
        if (!ghost || ghost._tileMoveActive) return false;
        const tile = tileFromEntity(ghost);
        if (typeof global.gridSnapEntityCenteredV628 === 'function') {
            return global.gridSnapEntityCenteredV628(ghost, tile.x, tile.y);
        }
        ghost.x = (tile.x + 0.5) * TILE_SIZE;
        ghost.y = (tile.y + 0.5) * TILE_SIZE;
        ghost.__gridAnchor = 'center';
        ghost._tileMoveTargetGX = tile.x;
        ghost._tileMoveTargetGY = tile.y;
        ghost._tileMoveTargetX = ghost.x;
        ghost._tileMoveTargetY = ghost.y;
        return true;
    }

    function playerTile() {
        return {
            x: Math.floor((num(player?.x) + num(player?.width) / 2) / TILE_SIZE),
            y: Math.floor((num(player?.y) + num(player?.height) / 2) / TILE_SIZE)
        };
    }

    function passableTile(x, y, entity = null) {
        if (!inside(x, y)) return false;
        const type = gameState.grid?.[y]?.[x];
        if (!(type === TYPES.EMPTY || type === TYPES.EXIT_OPEN || type === TYPES.EXIT_LOCKED)) return false;
        const bomb = bombAt(x, y);
        if (bomb && bomb.carriedBy !== entity) return false;
        return true;
    }

    function bombAt(x, y) {
        return (gameState.bombs || []).find(b => {
            if (!b) return false;
            if (b.state === BOMB_V4_STATES?.CARRIED || b.carriedBy) return false;
            return Number(b.x) === x && Number(b.y) === y;
        }) || null;
    }

    function visibleToPlayer(ghost) {
        if (!ghost || typeof player === 'undefined' || !player) return false;
        const a = tileFromEntity(ghost);
        const b = playerTile();
        const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (distance > ECHO_AI.visionRange) return false;
        if (distance <= 1) return true;

        // Echo ve al jugador como los demás enemigos: solo hay visión en línea recta.
        if (a.x !== b.x && a.y !== b.y) return false;
        const dx = Math.sign(b.x - a.x);
        const dy = Math.sign(b.y - a.y);
        let x = a.x + dx;
        let y = a.y + dy;
        while (x !== b.x || y !== b.y) {
            if (!inside(x, y)) return false;
            const tile = gameState.grid?.[y]?.[x];
            if (tile === TYPES.WALL || tile === TYPES.BLOCK) return false;
            if (bombAt(x, y)) return false;
            x += dx;
            y += dy;
        }
        return true;
    }

    function snapshotRelics() {
        const result = [];
        const seen = new Set();
        const relics = Array.isArray(gameState?.relics) ? gameState.relics : [];
        for (const relic of relics) {
            const id = String(relic?.id || '');
            if (!id || seen.has(id)) continue;
            seen.add(id);
            result.push({ id, name:String(relic?.name || ''), icon:String(relic?.icon || '◆'), category:String(relic?.category || 'BOMB') });
        }
        return result;
    }

    function snapshotBuild() {
        const mods = gameState?.relicMods || {};
        const capabilities = typeof global.getActiveCapabilityPowerupsV681 === 'function'
            ? global.getActiveCapabilityPowerupsV681(player)
            : [];
        const activeCaps = Array.isArray(capabilities)
            ? capabilities.map(String).filter(id => ['KICK','GRAB','THROW'].includes(id))
            : [];

        return {
            speed: clamp(num(player?.speed, 3), 1, 8),
            maxBombs: clamp(Math.floor(num(player?.maxBombs, 1)), 1, 10),
            bombRange: clamp(Math.floor(num(player?.bombRange, 1)), 1, 16),
            bombElementV612: ['normal','fire','ice','electric'].includes(String(player?.bombElementV612)) ? String(player.bombElementV612) : 'normal',
            dir: ['up','down','left','right'].includes(player?.dir) ? player.dir : 'down',
            capabilities: activeCaps,
            relicMods: clone({
                bombFuseMultiplier: num(mods.bombFuseMultiplier, 1),
                turnAssistBonus: num(mods.turnAssistBonus, 0),
                turnSnapBonus: num(mods.turnSnapBonus, 0),
                inputBufferBonus: num(mods.inputBufferBonus, 0),
                unstablePowder: !!mods.unstablePowder,
                economyBonus: num(mods.economyBonus, 0)
            })
        };
    }

    function createDeathEchoSnapshot(source = 'unknown') {
        if (typeof gameState === 'undefined' || !player) return null;
        const level = Math.floor(num(gameState.level, 0));
        if (level < 1 || level > MAX_ECHOES) return null;
        const tile = playerTile();
        return {
            version: VERSION,
            echoId: `echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: Date.now(),
            sourceRun: Math.floor(num(gameState.runNumber, 0)),
            level,
            cause: String(source || 'unknown'),
            position: { x: tile.x, y: tile.y },
            build: snapshotBuild(),
            relics: snapshotRelics()
        };
    }

    function readStore() {
        try {
            const raw = global.localStorage?.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function writeStore(store) {
        try {
            global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
            return true;
        } catch (_) {
            return false;
        }
    }

    function saveEcho(echo) {
        if (!echo) return false;
        const store = readStore();
        store[String(Math.floor(num(echo.level, 0)))] = clone(echo);
        return writeStore(store);
    }

    function clearEcho(level) {
        const store = readStore();
        delete store[String(Math.floor(num(level, 0)))];
        writeStore(store);
    }

    function getEcho(level) {
        const echo = readStore()[String(Math.floor(num(level, 0)))];
        return echo && COMPATIBLE_VERSIONS.has(String(echo.version)) ? echo : null;
    }

    function recordDeathEchoV61(source = 'unknown') {
        const echo = createDeathEchoSnapshot(source);
        return echo && saveEcho(echo) ? echo : null;
    }

    function chooseSpawnTile(savedPosition, playerPos) {
        const preferred = { x: 1, y: Math.max(1, gameState.gridHeight - 2) };
        const candidates = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (!passableTile(x, y)) continue;
                const playerDistance = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
                if (playerDistance < 4) continue;
                const savedDistance = Math.abs(x - savedPosition.x) + Math.abs(y - savedPosition.y);
                const cornerDistance = Math.abs(x - preferred.x) + Math.abs(y - preferred.y);
                candidates.push({ x, y, score: savedDistance * 2 + cornerDistance - playerDistance * 0.2 });
            }
        }
        candidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
        return candidates[0] || preferred;
    }

    function hasAbility(ghost, capability) {
        return Array.isArray(ghost?.inheritedCapabilities) && ghost.inheritedCapabilities.includes(String(capability).toUpperCase());
    }

    function getDirections() {
        return [
            { x: 0, y: -1, dir: 'up' },
            { x: 1, y: 0, dir: 'right' },
            { x: 0, y: 1, dir: 'down' },
            { x: -1, y: 0, dir: 'left' }
        ];
    }

    function opposite(dir) {
        return ({ up:'down', down:'up', left:'right', right:'left' })[dir] || null;
    }

    function facingVector(dir) {
        return getDirections().find(item => item.dir === dir) || { x:0, y:1, dir:'down' };
    }

    function echoRoll(ghost, salt = 0) {
        const seed = Math.abs(Math.floor(num(ghost?.aiSeed, 0))) +
            Math.abs(Math.floor(num(ghost?.thinkCount, 0))) * 17 +
            Math.abs(Math.floor(num(ghost?.patrolTurnCount, 0))) * 31 +
            Math.abs(Math.floor(num(salt, 0))) * 97;
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
    }

    function adjacentOptions(ghost) {
        const tile = tileFromEntity(ghost);
        return getDirections().filter(dir => passableTile(tile.x + dir.x, tile.y + dir.y, ghost));
    }

    function choosePatrolDirection(ghost) {
        const current = ghost.dir || 'down';
        const options = adjacentOptions(ghost);
        if (!options.length) return null;

        const forward = options.find(item => item.dir === current);
        const reverse = options.find(item => item.dir === opposite(current));
        const sides = options.filter(item => item.dir !== current && item.dir !== opposite(current));

        // En corredores sigue recto. En cruces decide ocasionalmente un giro,
        // pero no cambia de dirección cada tile. Esto evita el movimiento mecánico.
        if (forward && sides.length === 0) return forward;
        if (forward && echoRoll(ghost, 3) >= ECHO_AI.patrolSideChance) return forward;
        if (sides.length) {
            const index = Math.floor(echoRoll(ghost, 5) * sides.length) % sides.length;
            return sides[index];
        }
        return reverse || forward || options[0];
    }

    function chooseChaseDirection(ghost, target) {
        const tile = tileFromEntity(ghost);
        const options = adjacentOptions(ghost);
        if (!options.length) return null;

        const reverseDir = opposite(ghost.dir);
        const scored = options.map((dir, index) => {
            const nx = tile.x + dir.x;
            const ny = tile.y + dir.y;
            const distance = Math.abs(nx - target.x) + Math.abs(ny - target.y);
            const sameColumn = nx === target.x;
            const sameRow = ny === target.y;
            const keepsHeading = dir.dir === ghost.dir;
            const reverses = dir.dir === reverseDir && options.length > 1;

            let score = distance * 2.2;
            if (keepsHeading) score -= 0.65;
            if (sameColumn || sameRow) score -= 0.8;
            if (reverses) score += 1.8;
            score += echoRoll(ghost, 11 + index) * 0.22;

            return { ...dir, score };
        });

        scored.sort((a, b) => a.score - b.score);
        return scored[0] || null;
    }

    function dangerCells() {
        const danger = new Set();
        for (const bomb of (gameState.bombs || [])) {
            if (!bomb || bomb.state === BOMB_V4_STATES?.CARRIED || bomb.carriedBy) continue;
            const timer = num(bomb.timer, num(bomb.fuseTotal, 0));
            // Una bomba con mecha larga no convierte toda su línea de explosión
            // en peligro instantáneo. El Echo puede manipularla y huir cuando
            // queda poco tiempo; las bombas en movimiento siguen siendo amenaza.
            const isOwnEchoBomb = bomb.owner === GHOST_OWNER && bomb.echoId === state.active?.echoId;
            const imminent = isOwnEchoBomb || bomb.pendingDetonation === true ||
                bomb.state === BOMB_V4_STATES?.MOVING || timer <= ECHO_AI.dangerFuseMs;
            if (!imminent) continue;
            danger.add(cellKey(Number(bomb.x), Number(bomb.y)));
            if (typeof calculateBombBlastCells === 'function') {
                for (const cell of calculateBombBlastCells(bomb)) danger.add(cellKey(Number(cell.x), Number(cell.y)));
            }
        }
        for (const exp of (gameState.explosions || [])) {
            if (exp) danger.add(cellKey(Number(exp.x), Number(exp.y)));
        }
        return danger;
    }

    function chooseEscapeDirection(ghost) {
        if (!isCenteredOnTile(ghost)) return null;
        const current = tileFromEntity(ghost);
        const danger = dangerCells();
        const options = adjacentOptions(ghost);
        if (!options.length) return null;
        const forwardDir = ghost.dir;
        const reverseDir = opposite(ghost.dir);
        const scored = options.map((dir, index) => {
            const x = current.x + dir.x;
            const y = current.y + dir.y;
            const key = cellKey(x, y);
            const dangerPenalty = danger.has(key) ? 10000 : 0;
            const localDanger = [
                cellKey(x + 1, y), cellKey(x - 1, y),
                cellKey(x, y + 1), cellKey(x, y - 1)
            ].reduce((sum, k) => sum + (danger.has(k) ? 1 : 0), 0);
            let score = dangerPenalty + localDanger * 4;
            if (dir.dir === forwardDir) score -= 0.75;
            if (dir.dir === reverseDir && options.length > 1) score += 0.35;
            score += echoRoll(ghost, 23 + index) * 0.15;
            return { ...dir, score };
        });
        scored.sort((a, b) => a.score - b.score);
        return scored[0] || null;
    }

    function chooseInteractionBomb(ghost) {
        if (!hasAbility(ghost, 'GRAB')) return null;
        if (typeof global.getAdjacentGrabBombAnyDirectionV687 !== 'function') return null;
        const bomb = global.getAdjacentGrabBombAnyDirectionV687(ghost) || null;
        if (!bomb) return null;

        // No recoge bombas por rozarlas: sólo aprovecha una oportunidad actual.
        const tile = tileFromEntity(ghost);
        const target = playerTile();
        const aligned = tile.x === target.x || tile.y === target.y;
        const front = facingVector(ghost.dir);
        const frontBomb = Number(bomb.x) === tile.x + front.x && Number(bomb.y) === tile.y + front.y;
        // Una bomba adyacente puede tapar la línea de visión al jugador. Eso
        // no debe impedir que el Echo identifique y manipule esa misma bomba.
        if (aligned || frontBomb) return bomb;
        if (!visibleToPlayer(ghost)) return null;
        return echoRoll(ghost, 29) > 0.45 ? bomb : null;
    }

    function isOtherEntityAtTile(x, y, ghost) {
        const p = playerTile();
        if (p.x === x && p.y === y) return true;
        const candidates = [...(gameState.enemies || []), gameState.boss].filter(Boolean);
        for (const entity of candidates) {
            if (!entity || entity === ghost || entity.defeated) continue;
            const tile = tileFromEntity(entity);
            if (tile.x === x && tile.y === y) return true;
        }
        return false;
    }

    function collectReachableTiles(ghost) {
        const start = tileFromEntity(ghost);
        const reachable = new Map();
        const queue = [{ x:start.x, y:start.y, distance:0, firstDirection:null }];
        reachable.set(cellKey(start.x, start.y), queue[0]);
        for (let i = 0; i < queue.length; i++) {
            const node = queue[i];
            for (const direction of getDirections()) {
                const x = node.x + direction.x;
                const y = node.y + direction.y;
                const key = cellKey(x, y);
                if (reachable.has(key) || !passableTile(x, y, ghost)) continue;
                if (isOtherEntityAtTile(x, y, ghost)) continue;
                const next = {
                    x, y,
                    distance: node.distance + 1,
                    firstDirection: node.firstDirection || direction
                };
                reachable.set(key, next);
                queue.push(next);
            }
        }
        return reachable;
    }

    function axisDirectionBetween(from, to) {
        if (from.x === to.x && from.y !== to.y) return { x:0, y:Math.sign(to.y - from.y), dir:to.y < from.y ? 'up' : 'down' };
        if (from.y === to.y && from.x !== to.x) return { x:Math.sign(to.x - from.x), y:0, dir:to.x < from.x ? 'left' : 'right' };
        return null;
    }

    function clearAxisToPlayer(from, maxDistance = ECHO_AI.visionRange) {
        const target = playerTile();
        const direction = axisDirectionBetween(from, target);
        if (!direction) return false;
        const distance = Math.abs(target.x - from.x) + Math.abs(target.y - from.y);
        if (distance < 1 || distance > maxDistance) return false;
        let x = from.x + direction.x;
        let y = from.y + direction.y;
        while (x !== target.x || y !== target.y) {
            if (!inside(x, y)) return false;
            const type = gameState.grid?.[y]?.[x];
            if (type === TYPES.WALL || type === TYPES.BLOCK || bombAt(x, y)) return false;
            x += direction.x;
            y += direction.y;
        }
        return true;
    }

    function isValidBombDropTile(x, y, ghost) {
        if (!passableTile(x, y, ghost)) return false;
        if (isOtherEntityAtTile(x, y, ghost)) return false;
        return true;
    }

    // El plan sólo contiene el objetivo de la acción actual. No se guardan rutas,
    // movimientos anteriores ni patrones del jugador entre decisiones o partidas.
    function chooseBombCarryPlan(ghost) {
        const reachable = collectReachableTiles(ghost);
        const target = playerTile();
        const canThrow = hasAbility(ghost, 'THROW');
        const canKick = hasAbility(ghost, 'KICK');
        const candidates = [];

        for (const node of reachable.values()) {
            if (node.distance < 1 || !isValidBombDropTile(node.x, node.y, ghost)) continue;
            const distanceToPlayer = Math.abs(target.x - node.x) + Math.abs(target.y - node.y);
            if (distanceToPlayer < 2 || distanceToPlayer > ECHO_AI.visionRange) continue;
            const directionToPlayer = axisDirectionBetween({ x:node.x, y:node.y }, target);
            if (!directionToPlayer || !clearAxisToPlayer({ x:node.x, y:node.y }, ECHO_AI.visionRange)) continue;

            let kickPlan = null;
            if (canKick) {
                const approach = { x:node.x - directionToPlayer.x, y:node.y - directionToPlayer.y };
                if (isValidBombDropTile(approach.x, approach.y, ghost) && reachable.has(cellKey(approach.x, approach.y))) {
                    kickPlan = { approachTile:approach, direction:directionToPlayer };
                }
            }
            const canThrowFromHere = canThrow && distanceToPlayer <= 3;
            const preferredDistance = canThrowFromHere ? 2 : (kickPlan ? 3 : 2.5);
            const score = node.distance * 0.85 + Math.abs(distanceToPlayer - preferredDistance) * 1.8;
            candidates.push({
                targetTile:{ x:node.x, y:node.y },
                kickPlan,
                score
            });
        }

        candidates.sort((a, b) => a.score - b.score);
        if (candidates.length) return candidates[0];

        // En habitaciones cerradas también puede transportar y soltar una bomba;
        // no queda bloqueado esperando una alineación perfecta.
        const fallback = [...reachable.values()]
            .filter(node => node.distance >= 1 && isValidBombDropTile(node.x, node.y, ghost))
            .sort((a, b) => {
                const da = Math.abs(target.x - a.x) + Math.abs(target.y - a.y);
                const db = Math.abs(target.x - b.x) + Math.abs(target.y - b.y);
                return Math.abs(da - 2.5) + a.distance * 0.35 - (Math.abs(db - 2.5) + b.distance * 0.35);
            });
        if (!fallback.length) return null;
        return { targetTile:{ x:fallback[0].x, y:fallback[0].y }, kickPlan:null, score:Infinity };
    }

    function chooseRouteDirection(ghost, targetTile) {
        if (!targetTile) return null;
        const current = tileFromEntity(ghost);
        if (current.x === targetTile.x && current.y === targetTile.y) return null;
        const reachable = collectReachableTiles(ghost);
        return reachable.get(cellKey(targetTile.x, targetTile.y))?.firstDirection || null;
    }

    function updateInteraction(ghost) {
        const carried = typeof global.getCarriedBombForEntityV682 === 'function'
            ? global.getCarriedBombForEntityV682(ghost)
            : null;

        if (carried) {
            const tile = tileFromEntity(ghost);
            const destination = ghost.carryPlan?.targetTile || null;
            const reachedDestination = destination && tile.x === destination.x && tile.y === destination.y;
            const timedOut = ghost.carryTimer <= 0;
            if (ghost.interactionTimer > 0) return true;
            if (!reachedDestination && !timedOut) return true;

            // No suelta la bomba en cuanto llega al primer destino. La transporta
            // durante varios segundos y reevalúa otra posición mientras todavía
            // tenga tiempo; esto usa sólo el tablero actual, sin memoria del jugador.
            if (reachedDestination && !timedOut && num(ghost.carryElapsedMs, 0) < ECHO_AI.minimumCarryMs) {
                if (ghost.carryReplanTimerMs <= 0) {
                    const nextPlan = chooseBombCarryPlan(ghost);
                    if (nextPlan) {
                        ghost.carryPlan = nextPlan;
                    } else {
                        // Sin una colocación táctica válida, continúa moviéndose
                        // con la bomba y volverá a evaluarlo al vencer el tiempo.
                        ghost.carryPlan = null;
                        ghost.aiTargetTile = null;
                    }
                    ghost.carryReplanTimerMs = ECHO_AI.carryReplanMs;
                }
                return true;
            }

            const target = playerTile();
            const aligned = tile.x === target.x || tile.y === target.y;
            if (reachedDestination && hasAbility(ghost, 'THROW') && visibleToPlayer(ghost) && aligned && typeof global.throwCarriedBombV683 === 'function') {
                ghost.dir = tile.x === target.x
                    ? (target.y < tile.y ? 'up' : 'down')
                    : (target.x < tile.x ? 'left' : 'right');
                ghost.lastDirection = ghost.dir;
                if (global.throwCarriedBombV683(ghost)) {
                    ghost.carryTimer = 0;
                    ghost.carryPlan = null;
                    ghost.mode = 'ESCAPE';
                    ghost.interactionTimer = 650;
                    ghost.aiTargetTile = null;
                    return true;
                }
            }

            // Si llegó al sector elegido, conserva una posible maniobra de patada.
            // Si se agotó el tiempo, deja la bomba donde está y abandona la maniobra.
            const kickPlan = reachedDestination && !timedOut && hasAbility(ghost, 'KICK')
                ? ghost.carryPlan?.kickPlan
                : null;
            if (typeof global.releaseCarriedBombV682 === 'function' && global.releaseCarriedBombV682(ghost, 'drop')) {
                ghost.carryTimer = 0;
                ghost.carryPlan = null;
                ghost.aiTargetTile = null;
                if (kickPlan) {
                    ghost.kickPlan = {
                        bombRef:carried,
                        approachTile:{ x:kickPlan.approachTile.x, y:kickPlan.approachTile.y },
                        direction:{ x:kickPlan.direction.x, y:kickPlan.direction.y, dir:kickPlan.direction.dir }
                    };
                    ghost.mode = 'KICK_ALIGN';
                    ghost.interactionTimer = 0;
                } else {
                    ghost.mode = 'PATROL';
                    ghost.interactionTimer = 240;
                }
                return true;
            }
            return true;
        }

        if (ghost.interactionTimer > 0) return false;
        const bomb = chooseInteractionBomb(ghost);
        if (!bomb || typeof global.grabBombV682 !== 'function') return false;
        if (!global.grabBombV682(ghost, bomb)) return false;
        ghost.carryPlan = chooseBombCarryPlan(ghost);
        ghost.carryTimer = ECHO_AI.carryTimeoutMs;
        ghost.carryElapsedMs = 0;
        ghost.carryReplanTimerMs = 0;
        ghost.mode = 'CARRY';
        ghost.interactionTimer = 180;
        return true;
    }

    function tryKickAdjacentBomb(ghost) {
        if (!hasAbility(ghost, 'KICK')) return false;
        if (typeof global.startBombKickV682 !== 'function') return false;
        const tile = tileFromEntity(ghost);
        const dir = facingVector(ghost.dir);
        const bomb = (gameState.bombs || []).find(b => b && b.state === BOMB_V4_STATES.ARMED && !b.carriedBy && Number(b.x) === tile.x + dir.x && Number(b.y) === tile.y + dir.y);
        if (!bomb) return false;
        return !!global.startBombKickV682(bomb, ghost, { x:dir.x, y:dir.y });
    }

    function chooseAttack(ghost) {
        if (ghost._tileMoveActive || !isCenteredOnTile(ghost) || !visibleToPlayer(ghost)) return null;
        const a = tileFromEntity(ghost);
        const b = playerTile();
        if (a.x !== b.x && a.y !== b.y) return null;
        const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        // El rango de la bomba debe determinar la oportunidad. La condición anterior
        // exigía SIEMPRE 2 casillas y anulaba todos los ataques con alcance 1.
        const effectiveRange = Math.max(1, Math.min(ECHO_AI.bombSpatialRange, Math.floor(num(ghost.bombRange, 1))));
        if (distance < 1 || distance > effectiveRange) return null;
        if (!passableTile(a.x, a.y, ghost) || bombAt(a.x, a.y)) return null;
        if (typeof calculateBombBlastCells !== 'function') return null;
        const cells = calculateBombBlastCells({ x:a.x, y:a.y, range:ghost.bombRange });
        if (!cells.some(c => Number(c.x) === b.x && Number(c.y) === b.y)) return null;
        return { x:a.x, y:a.y };
    }

    function ghostBombCount(ghost) {
        return (gameState.bombs || []).filter(b => b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId).length;
    }

    function createGhostBomb(ghost) {
        if (!ghost || ghost._tileMoveActive || !snapEchoToGrid(ghost) || !isCenteredOnTile(ghost)) return false;
        if (ghost.bombCooldown > 0 || ghostBombCount(ghost) >= ghost.maxBombs) return false;
        const tile = tileFromEntity(ghost);
        if (bombAt(tile.x, tile.y)) return false;
        const baseFuse = gameState.roomType?.id === 'CURSED' ? BOMB_HANDLING.cursedFuse : BOMB_HANDLING.normalFuse;
        const fuseTotal = Math.max(ECHO_AI.minimumFuseMs, Math.round(baseFuse * Math.max(1.2, num(ghost.relicMods?.bombFuseMultiplier, 1))));
        const worldX = (tile.x + 0.5) * TILE_SIZE;
        const worldY = (tile.y + 0.5) * TILE_SIZE;
        const bomb = {
            id:`echo-bomb-${ghost.echoId}-${gameState.animFrame}-${Math.random().toString(36).slice(2,6)}`,
            owner:GHOST_OWNER,
            echoId:ghost.echoId,
            x:tile.x,
            y:tile.y,
            range:Math.min(ECHO_AI.maxBombRange, Math.max(1, Math.floor(num(ghost.bombRange, 1)))),
            timer:fuseTotal,
            fuseTotal,
            warnBucket:Math.ceil(fuseTotal / 300),
            scalePulse:1,
            playerPassThrough:false,
            justArmed:false,
            placedAtFrame:gameState.animFrame,
            placementReason:'death-echo-placed',
            state:BOMB_V4_STATES.ARMED,
            motionState:'idle',
            worldX,
            worldY,
            motionProgress:1,
            motionTimer:0,
            motionDuration:0,
            motionStartX:worldX,
            motionStartY:worldY,
            motionTargetX:worldX,
            motionTargetY:worldY,
            motionArc:0,
            motionRotation:0,
            motionRotationSpeed:0,
            bobPhase:0,
            motionQueue:[],
            preserveTimerOnArm:false,
            countsTowardPlayerCapacity:false,
            canKick:false,
            canPush:false,
            canCarry:false,
            carriedBy:null,
            elementV612:ghost.bombElementV612,
            effectIds:Array.isArray(global.ELEMENTAL_BOMB_DEFS_V612?.[ghost.bombElementV612]?.effectIds) ? [...global.ELEMENTAL_BOMB_DEFS_V612[ghost.bombElementV612].effectIds] : []
        };
        gameState.bombs.push(bomb);
        ghost.bombCooldown = ECHO_AI.bombCooldownMs;
        ghost.mode = 'ESCAPE';
        ghost.escapeTimer = 0;
        ghost.aiTargetTile = null;
        ghost.thinkTimer = 0;
        ghost.attackFlash = 180;
        if (typeof addParticles === 'function') addParticles(worldX, worldY, 'particleDanger', 8);
        if (typeof sfx === 'function') sfx('bomb');
        return true;
    }

    function updatePlannedKick(ghost, dt) {
        const plan = ghost?.kickPlan;
        if (!plan || ghost.mode !== 'KICK_ALIGN') return false;
        const bomb = plan.bombRef;
        if (!bomb || !(gameState.bombs || []).includes(bomb) || bomb.state !== BOMB_V4_STATES.ARMED || bomb.carriedBy) {
            ghost.kickPlan = null;
            ghost.mode = 'PATROL';
            return true;
        }
        // La preparación para patear se cancela si ya no hay una mecha segura.
        // El flujo general de peligro decide la huida en este mismo frame.
        if (bomb.pendingDetonation === true || num(bomb.timer, num(bomb.fuseTotal, 0)) <= ECHO_AI.dangerFuseMs) {
            ghost.kickPlan = null;
            ghost.mode = 'ESCAPE';
            ghost.aiTargetTile = null;
            ghost.thinkTimer = 0;
            return false;
        }

        const tile = tileFromEntity(ghost);
        const approach = plan.approachTile;
        if (tile.x === approach.x && tile.y === approach.y) {
            ghost.dir = plan.direction.dir;
            ghost.lastDirection = ghost.dir;
            const kicked = typeof global.startBombKickV682 === 'function' &&
                global.startBombKickV682(bomb, ghost, { x:plan.direction.x, y:plan.direction.y });
            ghost.kickPlan = null;
            ghost.aiTargetTile = null;
            ghost.mode = kicked ? 'ESCAPE' : 'PATROL';
            ghost.thinkTimer = kicked ? 360 : 0;
            ghost.directionCommitMs = 260;
            return true;
        }

        const direction = chooseRouteDirection(ghost, approach);
        if (!direction) {
            ghost.kickPlan = null;
            ghost.mode = 'PATROL';
            ghost.aiTargetTile = null;
            return true;
        }
        updateEchoMovement(ghost, direction, dt);
        return true;
    }

    function beginTileMove(ghost, direction) {
        if (!direction || ghost._tileMoveActive) return false;
        if (!snapEchoToGrid(ghost) || !isCenteredOnTile(ghost)) return false;
        const tile = tileFromEntity(ghost);
        const gx = tile.x + direction.x;
        const gy = tile.y + direction.y;
        if (!passableTile(gx, gy, ghost)) return false;
        if (!gridBeginTileMove(ghost, gx, gy, { kind:'enemy', allowCurrentBombTile:false })) return false;
        ghost.dir = direction.dir;
        ghost.lastDirection = direction.dir;
        ghost.moving = true;
        ghost.isMoving = true;
        ghost.blockedDirection = null;
        ghost.wallPauseMs = 0;
        ghost.blockedRetryMs = 0;
        return true;
    }

    function moveTileByTile(ghost, direction, dt) {
        if (ghost._tileMoveActive) {
            const result = gridAdvanceTileMove(ghost, ghost.speed, dt, { kind:'enemy', allowCurrentBombTile:false });
            ghost.moving = !result.arrived;
            ghost.isMoving = ghost.moving;
            if (result.arrived) {
                const gx = Number(ghost._tileMoveTargetGX);
                const gy = Number(ghost._tileMoveTargetGY);
                if (Number.isInteger(gx) && Number.isInteger(gy) && typeof global.gridSnapEntityCenteredV628 === 'function') {
                    global.gridSnapEntityCenteredV628(ghost, gx, gy);
                }
                ghost.moving = false;
                ghost.isMoving = false;
                ghost.moveDistance += TILE_SIZE;
            }
            return true;
        }

        ghost.wallPauseMs = Math.max(0, num(ghost.wallPauseMs, 0) - num(dt, 16));
        ghost.blockedRetryMs = Math.max(0, num(ghost.blockedRetryMs, 0) - num(dt, 16));
        if (ghost.wallPauseMs > 0 || ghost.blockedRetryMs > 0) {
            ghost.moving = false;
            ghost.isMoving = false;
            return false;
        }

        if (beginTileMove(ghost, direction)) return true;

        // La entidad acaba de chocar con pared/bloque/bomba: no gira enseguida.
        // Espera 2 segundos y recién después decide el siguiente corredor.
        ghost.wallPauseMs = ECHO_AI.wallPauseMs;
        ghost.blockedRetryMs = 0;
        ghost.blockedDirection = direction.dir;
        ghost.moving = false;
        ghost.isMoving = false;
        ghost.wallHits = num(ghost.wallHits, 0) + 1;
        return false;
    }

    function chooseAfterWall(ghost) {
        const tile = tileFromEntity(ghost);
        const options = adjacentOptions(ghost);
        if (!options.length) return null;
        const blocked = ghost.blockedDirection;
        const sides = options.filter(dir => dir.dir !== blocked && dir.dir !== opposite(blocked));
        if (sides.length) return sides[Math.floor((num(ghost.wallHits, 0) + num(ghost.aiSeed, 0)) % sides.length)];
        return options.find(dir => dir.dir === opposite(blocked)) || options[0];
    }

    function updateEchoMovement(ghost, desiredDirection, dt) {
        if (ghost._tileMoveActive) return moveTileByTile(ghost, desiredDirection, dt);

        ghost.wallPauseMs = Math.max(0, num(ghost.wallPauseMs, 0) - num(dt, 16));
        ghost.blockedRetryMs = Math.max(0, num(ghost.blockedRetryMs, 0) - num(dt, 16));

        if (ghost.wallPauseMs > 0) {
            if (ghost.blockedDirection && ghost.blockedRetryMs <= 0) {
                const blocked = facingVector(ghost.blockedDirection);
                if (passableTile(tileFromEntity(ghost).x + blocked.x, tileFromEntity(ghost).y + blocked.y, ghost)) {
                    ghost.wallPauseMs = 0;
                    ghost.blockedRetryMs = 0;
                    ghost.blockedDirection = null;
                    if (beginTileMove(ghost, blocked)) return true;
                } else {
                    ghost.blockedRetryMs = ECHO_AI.blockedRetryMs;
                }
            }
            ghost.moving = false;
            ghost.isMoving = false;
            return false;
        }

        if (ghost.blockedDirection) {
            const afterWall = chooseAfterWall(ghost);
            if (afterWall && beginTileMove(ghost, afterWall)) {
                ghost.blockedDirection = null;
                ghost.wallPauseMs = 0;
                ghost.blockedRetryMs = 0;
                return true;
            }
            // Sigue encerrado: no se congela indefinidamente. Revisa de nuevo
            // cada pocos milisegundos hasta que aparezca una casilla libre.
            ghost.blockedRetryMs = ECHO_AI.blockedRetryMs;
            ghost.moving = false;
            ghost.isMoving = false;
            return false;
        }

        return moveTileByTile(ghost, desiredDirection, dt);
    }

    function syncDeathEchoV61() {
        if (typeof gameState === 'undefined') return null;
        const level = Math.floor(num(gameState.level, 0));
        if (level < 1 || level > MAX_ECHOES) return null;
        if (state.checkedLevel === level && state.active && !state.active.defeated) return state.active;
        if (state.checkedLevel === level && !state.active) return null;

        state.checkedLevel = level;
        state.active = null;
        gameState.deathEchoV61 = null;
        const saved = getEcho(level);
        if (!saved) return null;

        const spawn = chooseSpawnTile(saved.position || {x:1,y:1}, playerTile());
        const build = saved.build || {};
        const inheritedCapabilities = new Set(
            (Array.isArray(build.capabilities) ? build.capabilities : [])
                .map(String).map(id => id.toUpperCase())
                .filter(id => ['KICK','GRAB','THROW'].includes(id))
        );
        // GRAB forma parte del bucle táctico central de Death Echo, aunque el
        // jugador no haya conseguido GRAB en esa partida. THROW sí se hereda.
        inheritedCapabilities.add('GRAB');

        const ghost = {
            ...clone(saved),
            archetype:'echo',
            x:spawn.x * TILE_SIZE + TILE_SIZE / 2,
            y:spawn.y * TILE_SIZE + TILE_SIZE / 2,
            width:TILE_SIZE * 0.68,
            height:TILE_SIZE * 0.68,
            // El Echo conserva la identidad de su build, pero combate despacio y con una sola bomba corta.
            speed:clamp(Math.min(num(build.speed, 2) * 0.42, 1.35), 0.75, 1.35),
            sourceSpeed:clamp(Math.min(num(build.speed, 2) * 0.42, 1.35), 0.75, 1.35),
            maxBombs:1,
            bombRange:clamp(Math.floor(num(build.bombRange, 1)), 1, ECHO_AI.maxBombRange),
            bombElementV612:['normal','fire','ice','electric'].includes(String(build.bombElementV612)) ? String(build.bombElementV612) : 'normal',
            dir:['up','down','left','right'].includes(build.dir) ? build.dir : 'down',
            lastDirection:['up','down','left','right'].includes(build.dir) ? build.dir : 'down',
            inheritedCapabilities:[...inheritedCapabilities],
            capabilityProfileV681:{
                permanent:Array.isArray(build.capabilities) ? build.capabilities.map(id => String(id).toLowerCase()).filter(id => ['kick','grab','throw'].includes(id)) : [],
                byGroup:Object.create(null)
            },
            relicMods:clone(build.relicMods || {}),
            maxHealth:1,
            health:1,
            hasShield:false,
            hitFlash:0,
            attackFlash:0,
            lastHitBlastId:-1,
            defeated:false,
            visualTime:0,
            moveDistance:0,
            moving:false,
            isMoving:false,
            mode:'PATROL',
            aiTargetTile:null,
            wallPauseMs:0,
            blockedRetryMs:0,
            blockedDirection:null,
            wallHits:0,
            bombCooldown:ECHO_AI.bombCooldownMs,
            interactionTimer:0,
            carryTimer:0,
            carryElapsedMs:0,
            carryReplanTimerMs:0,
            reactionTimer:ECHO_AI.reactionMs,
            directionCommitMs:ECHO_AI.directionCommitMs,
            wasVisible:false,
            thinkTimer:ECHO_AI.thinkMs,
            thinkCount:0,
            patrolTurnCount:0,
            aiSeed:Math.floor(num(saved.createdAt, Date.now()) % 97),
            escapeTimer:0,
            _tileMoveActive:false,
            _tileMoveTargetX:spawn.x * TILE_SIZE + TILE_SIZE / 2,
            _tileMoveTargetY:spawn.y * TILE_SIZE + TILE_SIZE / 2,
            _tileMoveTargetGX:spawn.x,
            _tileMoveTargetGY:spawn.y,
            __gridAnchor:'center'
        };

        if (typeof global.gridSnapEntityCenteredV628 === 'function') {
            global.gridSnapEntityCenteredV628(ghost, spawn.x, spawn.y);
        } else {
            ghost.x = (spawn.x + 0.5) * TILE_SIZE;
            ghost.y = (spawn.y + 0.5) * TILE_SIZE;
        }
        state.active = ghost;
        gameState.deathEchoV61 = ghost;
        return ghost;
    }

    function releaseCarriedBombOnDeath(ghost) {
        if (typeof global.getCarriedBombForEntityV682 !== 'function' || typeof global.releaseCarriedBombV682 !== 'function') return;
        const carried = global.getCarriedBombForEntityV682(ghost);
        if (carried) global.releaseCarriedBombV682(ghost, 'death');
    }

    function recoverEchoItems(ghost) {
        const relics = Array.isArray(ghost.relics) ? ghost.relics : [];
        const recovered = [];
        for (const saved of relics) {
            let restored = false;
            if (typeof RELICS !== 'undefined' && typeof grantRelic === 'function') {
                const relic = RELICS.find(candidate => candidate.id === saved.id);
                if (relic && grantRelic(relic)) {
                    recovered.push(relic);
                    restored = true;
                }
            }
        }
        if (typeof addFloatingText === 'function') addFloatingText(recovered.length ? `ECO RECUPERADO ×${recovered.length}` : 'ECO DISIPADO', ghost.x, ghost.y, recovered.length ? '#c4b5fd' : '#94a3b8');
        if (typeof addParticles === 'function') addParticles(ghost.x, ghost.y, recovered.length ? 'particleImpact' : 'particleDanger', 18);
        clearEcho(ghost.level);
        state.active = null;
        gameState.deathEchoV61 = null;
        state.checkedLevel = Number(gameState.level);
        return recovered;
    }

    function damageDeathEchoV61(explosion) {
        const ghost = state.active;
        if (!ghost || ghost.defeated || !explosion || ghost.lastHitBlastId === explosion.blastId) return false;
        const left = ghost.x - ghost.width * 0.32;
        const right = ghost.x + ghost.width * 0.32;
        const top = ghost.y - ghost.height * 0.38;
        const bottom = ghost.y + ghost.height * 0.38;
        const cellLeft = Number(explosion.x) * TILE_SIZE + 5;
        const cellRight = (Number(explosion.x) + 1) * TILE_SIZE - 5;
        const cellTop = Number(explosion.y) * TILE_SIZE + 5;
        const cellBottom = (Number(explosion.y) + 1) * TILE_SIZE - 5;
        if (!(right > cellLeft && left < cellRight && bottom > cellTop && top < cellBottom)) return false;

        ghost.lastHitBlastId = explosion.blastId;
        releaseCarriedBombOnDeath(ghost);
        ghost.health = 0;
        ghost.maxHealth = 1;
        ghost.hasShield = false;
        ghost.defeated = true;
        ghost.hitFlash = 180;
        if (typeof addParticles === 'function') addParticles(ghost.x, ghost.y, 'particleDanger', 16);
        recoverEchoItems(ghost);
        return true;
    }

    function updateDeathEchoV61(dt) {
        if (typeof gameState === 'undefined' || !gameState.isPlaying || gameState.paused) return;
        const ghost = syncDeathEchoV61();
        if (!ghost || ghost.defeated) return;

        const delta = num(dt, 16);
        ghost.visualTime += Math.max(0, delta);
        ghost.bombCooldown = Math.max(0, num(ghost.bombCooldown, 0) - delta);
        ghost.interactionTimer = Math.max(0, num(ghost.interactionTimer, 0) - delta);
        ghost.carryTimer = Math.max(0, num(ghost.carryTimer, 0) - delta);
        ghost.carryReplanTimerMs = Math.max(0, num(ghost.carryReplanTimerMs, 0) - delta);
        const carriedAtFrameStart = typeof global.getCarriedBombForEntityV682 === 'function'
            ? global.getCarriedBombForEntityV682(ghost)
            : null;
        ghost.carryElapsedMs = carriedAtFrameStart
            ? num(ghost.carryElapsedMs, 0) + Math.max(0, delta)
            : 0;
        ghost.thinkTimer = Math.max(0, num(ghost.thinkTimer, 0) - delta);
        ghost.reactionTimer = Math.max(0, num(ghost.reactionTimer, 0) - delta);
        ghost.attackFlash = Math.max(0, num(ghost.attackFlash, 0) - delta);
        ghost.hitFlash = Math.max(0, num(ghost.hitFlash, 0) - delta);
        ghost.directionCommitMs = Math.max(0, num(ghost.directionCommitMs, 0) - delta);

        const visible = visibleToPlayer(ghost);
        if (visible && !ghost.wasVisible) ghost.reactionTimer = ECHO_AI.reactionMs;
        ghost.wasVisible = visible;

        // v6.28: una transición reservada se completa antes de evaluar otra
        // casilla. No se replantea una ruta ni se planta una bomba desde media celda.
        if (ghost._tileMoveActive) {
            moveTileByTile(ghost, null, delta);
            if (ghost._tileMoveActive) return;
        }
        snapEchoToGrid(ghost);

        // Una patada planificada se resuelve antes del detector general de peligro:
        // la casilla de preparación queda alineada con la bomba por diseño y debe
        // ejecutar la patada en cuanto llega, en vez de entrar en un bucle de huida.
        if (ghost.mode === 'KICK_ALIGN' && ghost.kickPlan) {
            if (updatePlannedKick(ghost, delta)) return;
        }

        // Interactúa con una bomba cercana antes de decidir huir de su radio potencial.
        // Sólo inicia la maniobra si la mecha aún da margen; si no, prima escapar.
        const currentlyCarryingBomb = typeof global.getCarriedBombForEntityV682 === 'function' && !!global.getCarriedBombForEntityV682(ghost);
        if (!currentlyCarryingBomb && ghost.mode !== 'CARRY' && !ghost._tileMoveActive && isCenteredOnTile(ghost) && ghost.interactionTimer <= 0) {
            const tile = tileFromEntity(ghost);
            const facing = facingVector(ghost.dir);
            const frontBomb = (gameState.bombs || []).find(b => b && b.state === BOMB_V4_STATES.ARMED && !b.carriedBy &&
                Number(b.x) === tile.x + facing.x && Number(b.y) === tile.y + facing.y);
            const frontFuse = frontBomb ? num(frontBomb.timer, num(frontBomb.fuseTotal, 0)) : 0;

            const candidate = hasAbility(ghost, 'GRAB') ? chooseInteractionBomb(ghost) : null;
            const candidateFuse = candidate ? num(candidate.timer, num(candidate.fuseTotal, 0)) : 0;
            const safeGrab = !!candidate && candidateFuse > ECHO_AI.dangerFuseMs;
            // Si la bomba es del jugador, suele convenir robarla. Si no está delante,
            // agarrarla permite trasladarla; si está delante y no es del jugador,
            // alterna entre agarrar y patear para no repetir siempre la misma acción.
            const preferGrab = safeGrab && (
                candidate !== frontBomb ||
                (candidate.owner === 'player' && echoRoll(ghost, 47) < 0.58) ||
                echoRoll(ghost, 48) < 0.25
            );
            if (preferGrab && updateInteraction(ghost)) return;

            // La patada se intenta después de la decisión de agarre; si está bloqueada,
            // el intento de agarre inferior sirve como alternativa real de reposición.
            if (frontBomb && frontFuse > ECHO_AI.dangerFuseMs && tryKickAdjacentBomb(ghost)) {
                ghost.mode = 'ESCAPE';
                ghost.thinkTimer = 360;
                ghost.directionCommitMs = 300;
                return;
            }
            if (safeGrab && updateInteraction(ghost)) return;
        }

        // 1. Primero resuelve peligro real. No intenta atacar mientras está en peligro.
        const danger = dangerCells();
        const current = tileFromEntity(ghost);
        if (danger.has(cellKey(current.x, current.y))) {
            ghost.mode = 'ESCAPE';
            const escape = chooseEscapeDirection(ghost);
            if (escape) {
                ghost.aiTargetTile = { x:current.x + escape.x, y:current.y + escape.y, dir:escape.dir };
                updateEchoMovement(ghost, escape, delta);
            }
            return;
        }

        // 2. Una bomba propia activa mantiene la prioridad de escapar.
        const ownBombs = (gameState.bombs || []).filter(b =>
            b && b.owner === GHOST_OWNER && b.echoId === ghost.echoId &&
            !b.carriedBy && b.state !== BOMB_V4_STATES.EXPLODING
        );
        if (ghost.mode === 'ESCAPE' && ownBombs.length) {
            if (ghost.thinkTimer <= 0 || !ghost.aiTargetTile) {
                ghost.thinkTimer = ECHO_AI.escapeThinkMs;
                const escape = chooseEscapeDirection(ghost);
                ghost.aiTargetTile = escape ? { x:current.x + escape.x, y:current.y + escape.y, dir:escape.dir } : null;
            }
            if (ghost.aiTargetTile) {
                const dir = facingVector(ghost.aiTargetTile.dir);
                updateEchoMovement(ghost, dir, delta);
            }
            return;
        }
        if (ghost.mode === 'ESCAPE' && !ownBombs.length) {
            ghost.mode = visible ? 'CHASE' : 'PATROL';
            ghost.aiTargetTile = null;
        }

        // 3. Interacción física. El jugador muerto conserva sus verbos, no una
        // IA nueva para cada capacidad.
        if (ghost.mode === 'CARRY') {
            const handled = updateInteraction(ghost);
            const carried = typeof global.getCarriedBombForEntityV682 === 'function'
                ? global.getCarriedBombForEntityV682(ghost)
                : null;
            if (carried) {
                const target = ghost.carryPlan?.targetTile || null;
                let direction = target ? chooseRouteDirection(ghost, target) : null;
                if (!direction && !target) {
                    direction = visible ? chooseChaseDirection(ghost, playerTile()) : choosePatrolDirection(ghost);
                }
                if (!direction && target) {
                    const here = tileFromEntity(ghost);
                    if (here.x !== target.x || here.y !== target.y) direction = choosePatrolDirection(ghost);
                }
                if (direction) updateEchoMovement(ghost, direction, delta);
                return;
            }
            if (handled) return;
        }

        // 4. Si hay una bomba delante y tenía KICK, puede usarla como lo haría
        // un jugador al encontrarse un obstáculo interactivo.
        if (ghost.directionCommitMs <= 0 && tryKickAdjacentBomb(ghost)) {
            ghost.mode = 'ESCAPE';
            ghost.thinkTimer = 360;
            ghost.directionCommitMs = 300;
            return;
        }

        // 5. Decisión ofensiva sólo tras una reacción humana mínima.
        if (!ghost._tileMoveActive && isCenteredOnTile(ghost) && visible && ghost.reactionTimer <= 0 && ghost.bombCooldown <= 0 && ghost.thinkTimer <= 0) {
            const attack = chooseAttack(ghost);
            if (attack && echoRoll(ghost, 41) <= ECHO_AI.attackChance && createGhostBomb(ghost)) {
                return;
            }
        }

        // 6. Elegir sólo un tile por decisión. Una vez iniciada la transición,
        // la completa antes de volver a pensar.
        if (!ghost._tileMoveActive && (ghost.thinkTimer <= 0 || !ghost.aiTargetTile || ghost.directionCommitMs <= 0)) {
            ghost.thinkCount += 1;
            const target = playerTile();
            const direction = visible
                ? chooseChaseDirection(ghost, target)
                : choosePatrolDirection(ghost);
            ghost.mode = visible ? 'CHASE' : 'PATROL';
            ghost.aiTargetTile = direction
                ? { x:current.x + direction.x, y:current.y + direction.y, dir:direction.dir }
                : null;
            ghost.thinkTimer = visible ? ECHO_AI.thinkMs : ECHO_AI.patrolThinkMs;
            ghost.directionCommitMs = ECHO_AI.directionCommitMs;
            if (!visible && direction && direction.dir !== ghost.dir) ghost.patrolTurnCount += 1;
        }

        if (ghost.aiTargetTile) {
            const direction = facingVector(ghost.aiTargetTile.dir);
            const moved = updateEchoMovement(ghost, direction, delta);
            if (moved && !ghost._tileMoveActive &&
                tileFromEntity(ghost).x === ghost.aiTargetTile.x &&
                tileFromEntity(ghost).y === ghost.aiTargetTile.y) {
                ghost.aiTargetTile = null;
            }
        }

        // Death Echo no causa daño por contacto. Sólo sus bombas y explosiones
        // pueden amenazar al jugador; el eco sigue recibiendo daño normalmente.
    }

    function installInitWrapper() {
        if (state.wrappedInitLevel || typeof global.initLevel !== 'function') return state.wrappedInitLevel;
        state.originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV618(...args) {
            const result = state.originalInitLevel(...args);
            state.checkedLevel = null;
            state.active = null;
            gameState.deathEchoV61 = null;
            syncDeathEchoV61();
            return result;
        };
        state.wrappedInitLevel = true;
        return true;
    }

    function getActiveDeathEchoV61(depth = null) {
        const target = depth == null ? Number(gameState?.level) : Number(depth);
        if (!state.active || state.active.defeated) return null;
        if (Number.isFinite(target) && Number(state.active.level) !== target) return null;
        return state.active;
    }

    function auditDeathEchoV61() {
        const stored = readStore();
        const errors = [];
        const levels = Object.keys(stored).filter(key => /^\d+$/.test(key));
        for (const level of levels) {
            const echo = stored[level];
            if (!echo || !COMPATIBLE_VERSIONS.has(String(echo.version))) errors.push(`Eco inválido en profundidad ${level}`);
            if (!echo?.build || !Number.isFinite(Number(echo.build.bombRange))) errors.push(`Build inválida en profundidad ${level}`);
        }
        return { valid:errors.length === 0, version:VERSION, storedLevels:levels.map(Number).sort((a,b)=>a-b), activeLevel:state.active ? Number(state.active.level) : null, errors };
    }

    installInitWrapper();

    global.recordDeathEchoV61 = recordDeathEchoV61;
    global.syncDeathEchoV61 = syncDeathEchoV61;
    global.updateDeathEchoV61 = updateDeathEchoV61;
    global.damageDeathEchoV61 = damageDeathEchoV61;
    global.auditDeathEchoV61 = auditDeathEchoV61;
    global.clearDeathEchoV61 = clearEcho;
    global.getDeathEchoV61 = getEcho;
    global.getActiveDeathEchoV61 = getActiveDeathEchoV61;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.recordDeathEcho = recordDeathEchoV61;
    global.BOMBER_ENGINE.getDeathEcho = getActiveDeathEchoV61;
    global.BOMBER_ENGINE.getActiveDeathEcho = getActiveDeathEchoV61;
    global.BOMBER_ENGINE.getPersistedDeathEcho = getEcho;
    global.BOMBER_ENGINE.auditDeathEcho = auditDeathEchoV61;
    global.BOMBER_ENGINE.canDeathEchoTracePlayer = visibleToPlayer;
})(window);

;
// === js/38-bomb-effects.js ===
// Bomberman Roguelike v6.30.10 — Independent bomb effects / one field authority
// Base simple y extensible para rastros/efectos de bombas.
//
// PRINCIPIOS
// - La bomba colocada declara exactamente su elemento y sus effectIds.
// - Cada efecto de campo funciona de forma independiente; no requiere que otra
//   bomba elemental alcance la misma casilla.
// - Dos efectos diferentes pueden coexistir en una casilla sin consumirse ni
//   crear un tercer efecto implícito.
// - Una bomba del mismo elemento que vuelva a alcanzar una casilla refresca el
//   campo existente; no multiplica el daño por acumulación artificial.
// - Solo el sistema base de detonación resuelve daño/hitboxes inmediatos.

(function installBombEffectSystemV64(global) {
    'use strict';

    const VERSION = '6.30.10';
    const EVENT = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
    const LISTENER_KEY = 'bomb-explosion:effects';
    const MAX_FIELDS = 420;
    const MAX_ENTITY_STATUSES = 128;

    const EFFECTS = Object.freeze({
        HEAT: 'heat',
        COLD: 'cold',
        FROST: 'frost',
        SHOCK: 'shock',
        STEAM: 'steam',
        PLASMA: 'plasma',
        ARC: 'arc',
        TOXIN: 'toxin',
        GRAVITY: 'gravity'
    });

    const EFFECT_DEFS = Object.freeze({
        [EFFECTS.HEAT]: Object.freeze({
            id: EFFECTS.HEAT,
            label: 'Calor',
            color: '#ffb347',
            core: '#fff7ed',
            defaultDurationMs: 3000,
            // El rastro de fuego quema a enemigos que permanecen en la zona.
            // Tres pulsos a lo largo del campo evitan daño explosivo por frame.
            tickMs: 750,
            damage: 0,
            enemyDamage: 1,
            sourceKinds: Object.freeze(['bomb']),
            warmingPerSecond: 2400,
            movementMultiplier: 1.05,
            tags: Object.freeze(['bomb', 'fire', 'damage', 'winter', 'support'])
        }),
        [EFFECTS.COLD]: Object.freeze({
            id: EFFECTS.COLD,
            label: 'Frío',
            color: '#93c5fd',
            core: '#eff6ff',
            defaultDurationMs: 25000,
            tickMs: 250,
            damage: 0,
            sourceKinds: Object.freeze(['hazard']),
            persistent: true,
            maxExposureMs: 25000,
            fatalDamage: 999,
            movementSlowAtMs: 10000,
            inputBufferHalfAtMs: 15000,
            extraSlipAtMs: 20000,
            tags: Object.freeze(['hazard', 'winter', 'damage', 'status'])
        }),
        [EFFECTS.FROST]: Object.freeze({ id:EFFECTS.FROST, label:'Escarcha', color:'#7dd3fc', core:'#e0f2fe', defaultDurationMs:2800, tickMs:250, damage:0, movementMultiplier:0.62, enemyMovementMultiplier:0.62, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','ice','slow']) }),
        [EFFECTS.SHOCK]: Object.freeze({ id:EFFECTS.SHOCK, label:'Descarga', color:'#facc15', core:'#fef9c3', defaultDurationMs:1800, tickMs:600, damage:1, movementMultiplier:0.86, enemyMovementMultiplier:0.86, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','electric','damage']) }),
        [EFFECTS.STEAM]: Object.freeze({ id:EFFECTS.STEAM, label:'Vapor', color:'#e2e8f0', core:'#ffffff', defaultDurationMs:2200, tickMs:300, damage:0, movementMultiplier:0.58, enemyMovementMultiplier:0.58, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','steam','slow']), materialType: global.MATERIALS_V60?.STEAM || 'steam' }),
        [EFFECTS.PLASMA]: Object.freeze({ id:EFFECTS.PLASMA, label:'Plasma', color:'#c084fc', core:'#f5d0fe', defaultDurationMs:1500, tickMs:300, damage:1, movementMultiplier:0.92, enemyMovementMultiplier:0.92, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','plasma','damage']) }),
        [EFFECTS.ARC]: Object.freeze({ id:EFFECTS.ARC, label:'Rayo extendido', color:'#fde047', core:'#ffffff', defaultDurationMs:900, tickMs:250, damage:1, movementMultiplier:0.90, enemyMovementMultiplier:0.90, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','electric','extended','damage']) }),
        [EFFECTS.TOXIN]: Object.freeze({ id:EFFECTS.TOXIN, label:'Toxina', color:'#84cc16', core:'#d9f99d', defaultDurationMs:3600, tickMs:850, damage:0, enemyDamage:1, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','toxic','damage','area']) }),
        [EFFECTS.GRAVITY]: Object.freeze({ id:EFFECTS.GRAVITY, label:'Gravedad', color:'#c084fc', core:'#f5d0fe', defaultDurationMs:1250, tickMs:350, damage:0, movementMultiplier:1, enemyMovementMultiplier:0.82, sourceKinds:Object.freeze(['bomb']), tags:Object.freeze(['bomb','gravity','pull','control']) })
    });

    const runtime = {
        fields: null,
        listenerInstalled: false,
        duplicateInstallAttempts: 0,
        lastEventId: 0
    };

    function getState() {
        return global.BOMBER_ENGINE?.getState?.() || global.gameState || null;
    }

    function getPlayer() {
        return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null;
    }

    function ensureFields(state = getState()) {
        if (!state) return null;
        if (!Array.isArray(state.bombEffectFieldsV64)) state.bombEffectFieldsV64 = [];
        runtime.fields = state.bombEffectFieldsV64;
        return runtime.fields;
    }

    function tileKey(x, y) {
        return `${Math.trunc(x)},${Math.trunc(y)}`;
    }

    function finite(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function triggerBombFeedbackV61210(bomb, chainIndex = 1) {
        if (!bomb) return false;
        const originX = (finite(bomb.x) + 0.5) * TILE_SIZE;
        const originY = (finite(bomb.y) + 0.5) * TILE_SIZE;
        // Limpiar residuos circulares históricos en el origen de cada detonación,
        // incluidas las bombas que explotan por cadena.
        if (typeof global.feedbackPoolClearExplosionResidue === 'function') {
            global.feedbackPoolClearExplosionResidue(originX, originY, TILE_SIZE * 1.1);
        }
        const range = Math.max(1, finite(bomb.range, 1));
        const chain = clamp(finite(chainIndex, 1), 1, 8);
        const intensity = clamp(3.4 + range * 0.22 + chain * 0.28, 3.5, 7);
        // La vibración es breve y limitada; no se acumula como un temblor largo.
        const duration = clamp(50 + range * 1.5 + chain * 4, 50, 100);
        if (typeof global.triggerScreenShake === 'function') global.triggerScreenShake(intensity, duration);

        // Un solo emisor de chispas por evento. El color identifica al elemento;
        // el pool limita la cantidad y cada partícula vive entre 50 y 100 ms.
        const effectIds = resolveBombEffectIds(bomb);
        const element = String(effectIds[0] || bomb.elementV612 || 'fire').toLowerCase();
        const sparkColors = {
            heat: '#ffd08a', fire: '#ffd08a', frost: '#b9efff', ice: '#b9efff', cold: '#dbeafe',
            shock: '#fef08a', electric: '#fef08a', arc: '#fef08a', steam: '#f1f5f9', plasma: '#f0abfc',
            toxin: '#d9f99d', toxic: '#d9f99d', gravity: '#f5d0fe', fragment: '#fda4af', pierce: '#fde68a'
        };
        const sparkColor = sparkColors[element] || '#fff1a8';
        if (typeof global.feedbackPoolExplosionSparks === 'function') {
            global.feedbackPoolExplosionSparks(originX, originY, sparkColor, clamp(7 + chain, 7, 12));
        }
        return true;
    }

    function definition(id) {
        return EFFECT_DEFS[id] || null;
    }

    function normalizeEffectIds(ids) {
        if (!Array.isArray(ids)) return [];
        return [...new Set(ids.map(id => String(id)).filter(id => !!definition(id)))];
    }

    function stageBombEffectConfig() {
        const state = getState();
        return state?.biomeV49?.stageConfig?.bombEffects || {};
    }

    function themeBombEffectConfig() {
        const theme = typeof global.getThemeV46 === 'function' ? global.getThemeV46() : null;
        return theme?.bombEffects || {};
    }

    function getBombEffectIdsV64(bomb = {}) {
        // La bomba colocada es la fuente de verdad. Un array vacío es deliberado
        // (bomba normal) y no debe convertirse en todos los efectos del tema/etapa.
        if (Array.isArray(bomb.effectIds)) return normalizeEffectIds(bomb.effectIds);

        // Compatibilidad con bombas antiguas que solo guarden elementV612.
        const element = String(bomb.elementV612 || 'normal').toLowerCase();
        if (typeof global.getBombElementDefV612 === 'function') {
            const def = global.getBombElementDefV612(bomb);
            if (def && Array.isArray(def.effectIds)) return normalizeEffectIds(def.effectIds);
        }
        const elementalMap = {
            normal: [],
            fire: [EFFECTS.HEAT],
            ice: [EFFECTS.FROST],
            electric: [EFFECTS.SHOCK],
            toxic: [EFFECTS.TOXIN],
            gravity: [EFFECTS.GRAVITY],
            fragment: [],
            pierce: []
        };
        return normalizeEffectIds(elementalMap[element] || []);
    }


    function getEffectConfigV64(id) {
        const def = definition(id);
        if (!def) return null;
        const theme = themeBombEffectConfig();
        const stage = stageBombEffectConfig();
        const themeEntry = Array.isArray(theme) ? {} : (theme?.[id] || {});
        const stageEntry = Array.isArray(stage) ? {} : (stage?.[id] || {});
        return Object.freeze({
            ...def,
            ...themeEntry,
            ...stageEntry,
            durationMs: Math.max(80, finite(stageEntry.durationMs, finite(themeEntry.durationMs, def.defaultDurationMs))),
            tickMs: Math.max(100, finite(stageEntry.tickMs, finite(themeEntry.tickMs, def.tickMs))),
            damage: Math.max(0, finite(stageEntry.damage, finite(themeEntry.damage, def.damage)))
        });
    }

    function getEffectStatusV64(entity, effectId) {
        const statuses = entity?.__bombEffectStatusesV64;
        return statuses && typeof statuses === 'object' ? (statuses[effectId] || null) : null;
    }

    function getBombEffectConfigSafe(id){ return getEffectConfigV64(id) || {}; }

    function getBombEffectMovementModifiersV64(entity) {
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        const heat = getEffectStatusV64(entity, EFFECTS.HEAT);
        let speedMultiplier = 1;
        let inputBufferMultiplier = 1;
        let brakingMultiplier = 1;
        let turnCarryMultiplier = 1;

        if (heat) speedMultiplier *= getEffectConfigV64(EFFECTS.HEAT)?.movementMultiplier || 1;
        const frost = getEffectStatusV64(entity, EFFECTS.FROST);
        const shock = getEffectStatusV64(entity, EFFECTS.SHOCK);
        const steam = getEffectStatusV64(entity, EFFECTS.STEAM);
        if (frost) speedMultiplier *= getBombEffectConfigSafe(EFFECTS.FROST)?.movementMultiplier || 0.62;
        if (shock) speedMultiplier *= getBombEffectConfigSafe(EFFECTS.SHOCK)?.movementMultiplier || 0.86;
        if (steam) speedMultiplier *= getBombEffectConfigSafe(EFFECTS.STEAM)?.movementMultiplier || 0.58;
        if (cold) {
            const exposure = finite(cold.exposureMs, 0);
            if (exposure >= EFFECT_DEFS[EFFECTS.COLD].movementSlowAtMs) speedMultiplier *= 0.90;
            if (exposure >= EFFECT_DEFS[EFFECTS.COLD].inputBufferHalfAtMs) inputBufferMultiplier *= 0.50;
            if (exposure >= EFFECT_DEFS[EFFECTS.COLD].extraSlipAtMs) {
                brakingMultiplier *= 0.84;
                turnCarryMultiplier *= 1.04;
            }
        }
        return Object.freeze({ speedMultiplier, inputBufferMultiplier, brakingMultiplier, turnCarryMultiplier });
    }

    // Multiplicador separado para IA enemiga: el calor no acelera enemigos,
    // los efectos elementales de control (escarcha, vapor y descarga) ralentizan mientras el estado viva.
    function getBombEffectEnemyMovementMultiplierV6306(entity) {
        const statuses = entity?.__bombEffectStatusesV64;
        if (!statuses || typeof statuses !== 'object') return 1;
        let multiplier = 1;
        for (const [effectId, status] of Object.entries(statuses)) {
            if (!status || status.sourceBombId == null) continue;
            const config = getEffectConfigV64(effectId);
            const effectMultiplier = Number(config?.enemyMovementMultiplier);
            if (!Number.isFinite(effectMultiplier) || effectMultiplier <= 0 || effectMultiplier >= 1) continue;
            multiplier *= clamp(effectMultiplier, 0.3, 1);
        }
        return clamp(multiplier, 0.28, 1);
    }

    function getBombEffectVisualStateV64(entity) {
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        const heat = getEffectStatusV64(entity, EFFECTS.HEAT);
        const maxExposure = EFFECT_DEFS[EFFECTS.COLD].maxExposureMs;
        const exposureMs = cold ? clamp(finite(cold.exposureMs, 0), 0, maxExposure) : 0;
        return Object.freeze({
            coldExposureMs: exposureMs,
            coldSeverity: maxExposure > 0 ? exposureMs / maxExposure : 0,
            heatActive: !!heat
        });
    }

    function ensureEntityStatuses(entity) {
        if (!entity || typeof entity !== 'object') return null;
        if (!entity.__bombEffectStatusesV64 || typeof entity.__bombEffectStatusesV64 !== 'object') {
            Object.defineProperty(entity, '__bombEffectStatusesV64', {
                value: Object.create(null),
                enumerable: false,
                configurable: true,
                writable: true
            });
        }
        return entity.__bombEffectStatusesV64;
    }

    function entityCenter(entity) {
        if (!entity) return null;
        const width = finite(entity.width, TILE_SIZE);
        const height = finite(entity.height, TILE_SIZE);
        return {
            x: finite(entity.x) + width / 2,
            y: finite(entity.y) + height / 2
        };
    }

    // La posición del jugador es la esquina superior izquierda; enemigos,
    // jefes y Echo usan coordenadas de centro (igual que sus renderizadores).
    // No aplicar la misma conversión a ambos tipos: desplaza los campos una casilla.
    function entityCell(entity, kind = null) {
        if (!entity) return null;
        const inferredKind = kind || (entity === getPlayer() ? 'player' : 'entity');
        const width = finite(entity.width, TILE_SIZE);
        const height = finite(entity.height, TILE_SIZE);
        const isTopLeftPosition = inferredKind === 'player';
        const centerX = finite(entity.x) + (isTopLeftPosition ? width / 2 : 0);
        const centerY = finite(entity.y) + (isTopLeftPosition ? height / 2 : 0);
        return {
            x: Math.floor(centerX / TILE_SIZE),
            y: Math.floor(centerY / TILE_SIZE)
        };
    }

    function collectEntities() {
        const state = getState();
        const targets = [];
        const p = getPlayer();
        if (p) targets.push({ kind: 'player', entity: p });

        for (const enemy of Array.isArray(state?.enemies) ? state.enemies : []) {
            if (enemy && !enemy.defeated) targets.push({ kind: 'enemy', entity: enemy });
        }

        if (state?.boss && !state.boss.defeated) targets.push({ kind: 'boss', entity: state.boss });

        const echo = typeof global.getActiveDeathEchoV61 === 'function'
            ? global.getActiveDeathEchoV61(state?.level)
            : (state?.deathEchoV61 || null);
        if (echo && !echo.defeated) targets.push({ kind: 'death_echo', entity: echo });

        return targets;
    }

    function findField(fields, effectId, x, y) {
        const key = tileKey(x, y);
        return fields.find(field => field?.key === key && field.effectId === effectId) || null;
    }

    function depositFieldInternal(effectId, x, y, options = {}) {
        const fields = ensureFields();
        const config = getEffectConfigV64(effectId);
        const tx = Math.trunc(Number(x));
        const ty = Math.trunc(Number(y));
        if (!fields || !config || !Number.isInteger(tx) || !Number.isInteger(ty)) return false;

        const durationMs = Math.max(80, finite(options.durationMs, config.durationMs));
        const intensity = clamp(finite(options.intensity, 1), 0.1, 2);
        const existing = findField(fields, effectId, tx, ty);

        // Mismo efecto en la misma casilla: refrescar duración. No acumular
        // intensidad ni reemplazar el efecto por una combinación implícita.
        if (existing) {
            existing.remainingMs = Math.max(existing.remainingMs, durationMs);
            existing.visualAgeMs = 0;
            existing.visualTotalMs = Math.max(existing.visualTotalMs, durationMs);
            existing.intensity = Math.max(existing.intensity, intensity);
            existing.source = String(options.source || existing.source || 'system');
            existing.owner = String(options.owner || existing.owner || 'system');
            if (options.sourceBombId != null) existing.sourceBombId = String(options.sourceBombId);
            if (Number.isFinite(Number(options.originX))) existing.originX = Math.trunc(Number(options.originX));
            if (Number.isFinite(Number(options.originY))) existing.originY = Math.trunc(Number(options.originY));
            existing.lastEventId = runtime.lastEventId;
            existing.createdEventId = runtime.lastEventId;
            return true;
        }

        if (fields.length >= MAX_FIELDS) return false;
        fields.push({
            key: tileKey(tx, ty),
            x: tx,
            y: ty,
            effectId,
            intensity,
            remainingMs: durationMs,
            visualAgeMs: 0,
            visualTotalMs: durationMs,
            tickAccumulatorMs: 0,
            source: String(options.source || 'system'),
            owner: String(options.owner || 'system'),
            sourceBombId: options.sourceBombId == null ? null : String(options.sourceBombId),
            originX: Number.isFinite(Number(options.originX)) ? Math.trunc(Number(options.originX)) : null,
            originY: Number.isFinite(Number(options.originY)) ? Math.trunc(Number(options.originY)) : null,
            createdEventId: runtime.lastEventId
        });
        return true;
    }


    function depositField(effectId, x, y, options = {}) {
        return depositFieldInternal(effectId, x, y, options);
    }

    function isFiniteNumber(value) {
        return Number.isFinite(Number(value));
    }

    function applyEntityStatus(target, effectId, options = {}) {
        const entity = target?.entity || target;
        const kind = target?.kind || 'generic';
        const config = getEffectConfigV64(effectId);
        if (!entity || !config) return false;

        const statuses = ensureEntityStatuses(entity);
        if (!statuses) return false;
        const defaultDuration = config.persistent ? Infinity : config.durationMs;
        const speciesDurationMultiplier = kind === 'enemy' && typeof global.getEnemyBiomeSpeciesEffectDurationMultiplierV615 === 'function'
            ? Math.max(0.1, Number(global.getEnemyBiomeSpeciesEffectDurationMultiplierV615(entity, effectId)) || 1)
            : 1;
        const durationMs = config.persistent ? Infinity : Math.max(80, finite(options.durationMs, defaultDuration) * speciesDurationMultiplier);
        const intensity = clamp(finite(options.intensity, 1), 0.1, 2);
        const existing = statuses[effectId];

        if (existing) {
            existing.remainingMs = config.persistent ? Infinity : Math.max(existing.remainingMs, durationMs);
            existing.intensity = clamp(Math.max(existing.intensity, intensity), 0.1, 2);
            if (effectId === EFFECTS.COLD && Number.isFinite(Number(options.exposureBoostMs))) {
                existing.exposureMs = clamp(
                    finite(existing.exposureMs, 0) + Math.max(0, finite(options.exposureBoostMs, 0)),
                    0,
                    config.maxExposureMs
                );
            }
            existing.lastSource = String(options.source || existing.lastSource || 'system');
            if (effectId === EFFECTS.GRAVITY) {
                const incomingBombId = options.sourceBombId == null ? null : String(options.sourceBombId);
                if (incomingBombId != null && existing.sourceBombId !== incomingBombId) existing.gravityPulls = 0;
                if (Number.isFinite(Number(options.originX))) existing.originX = Math.trunc(Number(options.originX));
                if (Number.isFinite(Number(options.originY))) existing.originY = Math.trunc(Number(options.originY));
                if (incomingBombId != null) existing.sourceBombId = incomingBombId;
            }
            return true;
        }

        if (Object.keys(statuses).length >= MAX_ENTITY_STATUSES) return false;

        statuses[effectId] = {
            effectId,
            remainingMs: durationMs,
            intensity,
            tickAccumulatorMs: 0,
            source: String(options.source || 'system'),
            sourceBombId: options.sourceBombId == null ? null : String(options.sourceBombId),
            kind,
            originX: Number.isFinite(Number(options.originX)) ? Math.trunc(Number(options.originX)) : null,
            originY: Number.isFinite(Number(options.originY)) ? Math.trunc(Number(options.originY)) : null,
            gravityPulls: 0,
            exposureMs: effectId === EFFECTS.COLD
                ? clamp(Math.max(0, finite(options.exposureBoostMs, 0)), 0, config.maxExposureMs)
                : 0,
            fatalTriggered: false
        };
        return true;
    }

    function warmEntityV64(target, dt, intensity = 1) {
        const entity = target?.entity || target;
        const cold = getEffectStatusV64(entity, EFFECTS.COLD);
        if (!cold) return false;
        const config = getEffectConfigV64(EFFECTS.HEAT);
        cold.exposureMs = Math.max(0, finite(cold.exposureMs, 0) - (config?.warmingPerSecond || 2400) * Math.max(0, Number(dt) || 0) / 1000 * Math.max(0.1, intensity));
        if (cold.exposureMs <= 25) delete entity.__bombEffectStatusesV64[EFFECTS.COLD];
        return true;
    }

    function damageEnemy(target, amount, source) {
        const state = getState();
        const enemy = target?.entity || target;
        if (!enemy || !Array.isArray(state?.enemies)) return false;
        enemy.__effectHealthV64 = Number.isFinite(Number(enemy.__effectHealthV64))
            ? Number(enemy.__effectHealthV64)
            : 3;
        enemy.__effectHealthV64 -= Math.max(1, Number(amount) || 1);
        if (enemy.__effectHealthV64 > 0) {
            enemy.effectHitFlashV64 = 120;
            if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, 'particleDanger', 4);
            return true;
        }

        const index = state.enemies.indexOf(enemy);
        if (index < 0) return false;
        // Todos los caminos de muerte deben notificar las habilidades de especie.
        // El combate por bomba ya lo hace desde 20-combat.js; este camino cubre
        // muertes causadas por residuos/estados elementales (calor, descarga, etc.).
        if (typeof global.enemyOnDefeatedV630 === 'function') {
            global.enemyOnDefeatedV630(enemy, {
                cause: 'effect',
                source: String(source || 'effect'),
                effectId: String(source || '').replace(/^effect:/, '')
            });
        }
        if (typeof global.triggerEnemyDefeatFeedback === 'function') global.triggerEnemyDefeatFeedback(enemy);
        state.enemies.splice(index, 1);

        // Las muertes por daño persistente usan las mismas recompensas y hooks
        // de progreso que una muerte por explosión directa.
        const scoreMultiplier = finite(state.killScoreMult, 1) * finite(state.fireScoreMult, 1);
        const killScore = Math.round(100 * scoreMultiplier * (enemy.elite ? 1.25 : 1));
        const roomCoinMultiplier = finite(state.roomType?.coinMult, 1);
        const coinBonus = finite(state.coinBonus, 0);
        const killCoins = Math.max(2, Math.round((2 + Math.random() * 3) * (1 + coinBonus) * roomCoinMultiplier));
        state.score = finite(state.score, 0) + killScore;
        state.coins = finite(state.coins, 0) + killCoins;
        state.totalKills = (Number(state.totalKills) || 0) + 1;
        if (typeof global.gameplayPowerupOnEnemyDefeatedV676 === 'function') global.gameplayPowerupOnEnemyDefeatedV676(enemy);
        if (typeof global.addFloatingText === 'function') global.addFloatingText(`+${killScore}  +${killCoins}¢`, enemy.x, enemy.y, enemy.elite ? '#fb7185' : '#84cc16');
        if (typeof global.tryUnlockExitCurrentRoom === 'function') global.tryUnlockExitCurrentRoom();
        return true;
    }

    function forcePlayerColdDeathV64(source = 'effect:cold') {
        const p = getPlayer();
        const state = getState();
        if (!p || !state || !state.isPlaying) return false;
        if (typeof global.isGodModeActiveV616 === 'function' && global.isGodModeActiveV616()) return false;
        if (typeof global.playerFSMDeath === 'function') global.playerFSMDeath(source);
        if (typeof global.gameOver === 'function') {
            global.gameOver(source);
            return true;
        }
        p.health = 0;
        return true;
    }

    function damageTarget(target, amount, source) {
        const entity = target?.entity || target;
        const kind = target?.kind || 'generic';
        if (!entity || amount <= 0) return false;
        const cell = entityCell(entity, kind);
        const sx = cell ? (cell.x + 0.5) * TILE_SIZE : finite(entity.x);
        const sy = cell ? (cell.y + 0.5) * TILE_SIZE : finite(entity.y);

        if (kind === 'player' && typeof global.takeDamage === 'function') {
            return !!global.takeDamage(source, sx, sy);
        }
        if (kind === 'enemy') return damageEnemy(target, amount, source);
        if (kind === 'boss' && typeof global.damageBoss === 'function') {
            const beforeHp = finite(entity.hp, finite(entity.health, 1));
            const applied = !!global.damageBoss(amount);
            const afterHp = finite(entity.hp, finite(entity.health, 0));
            if (applied && beforeHp > 0 && afterHp <= 0 && typeof global.triggerHitStop === 'function') global.triggerHitStop(50);
            return applied;
        }
        if (kind === 'death_echo' && typeof global.damageDeathEchoByEffectV63 === 'function') {
            return !!global.damageDeathEchoByEffectV63(amount, source);
        }
        if (Number.isFinite(Number(entity.health))) {
            entity.health = Math.max(0, Number(entity.health) - amount);
            return true;
        }
        return false;
    }

    function pullEnemyTowardGravityOriginV6330(target, status) {
        const enemy = target?.entity || target;
        const state = getState();
        if (target?.kind !== 'enemy' || !enemy || !state || !Array.isArray(state.grid)) return false;
        if (Number(status.gravityPulls) >= 2) return false;
        const originX = Number(status.originX), originY = Number(status.originY);
        if (!Number.isInteger(originX) || !Number.isInteger(originY)) return false;
        const current = entityCell(enemy, 'enemy');
        if (!current || (current.x === originX && current.y === originY)) return false;

        const dx = originX - current.x, dy = originY - current.y;
        const preferred = Math.abs(dx) >= Math.abs(dy)
            ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }]
            : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }];
        const isOccupiedByEnemy = (x, y) => (Array.isArray(state.enemies) ? state.enemies : []).some(other => {
            if (!other || other === enemy) return false;
            const cell = entityCell(other, 'enemy');
            return !!cell && cell.x === x && cell.y === y;
        });
        const gridHeight = Math.trunc(finite(state.gridHeight, state.grid.length));
        const gridWidth = Math.trunc(finite(state.gridWidth, state.grid[0]?.length || 0));
        const isBlocked = (x, y) => {
            if (y < 0 || y >= gridHeight || x < 0 || x >= gridWidth) return true;
            const tile = state.grid[y]?.[x];
            const types = global.BOMBER_ENGINE?.getWorldTypes?.() || (typeof TYPES !== 'undefined' ? TYPES : {});
            return tile === types.WALL || tile === types.BLOCK || isOccupiedByEnemy(x, y);
        };

        for (const step of preferred) {
            if (!step.x && !step.y) continue;
            const nx = current.x + step.x, ny = current.y + step.y;
            if (isBlocked(nx, ny)) continue;
            enemy.x = finite(enemy.x) + step.x * TILE_SIZE;
            enemy.y = finite(enemy.y) + step.y * TILE_SIZE;
            status.gravityPulls = Math.max(0, Number(status.gravityPulls) || 0) + 1;
            if (typeof global.addParticles === 'function') global.addParticles(finite(enemy.x) + finite(enemy.width, TILE_SIZE) / 2, finite(enemy.y) + finite(enemy.height, TILE_SIZE) / 2, 'particleEnergy', 3);
            return true;
        }
        return false;
    }

    function tickEntityStatus(target, status, dt) {
        const config = getEffectConfigV64(status.effectId);
        if (!config) return;

        if (!config.persistent) {
            status.remainingMs -= dt;
            if (status.remainingMs <= 0) return;
        }

        status.tickAccumulatorMs += dt;
        while (status.tickAccumulatorMs >= config.tickMs) {
            status.tickAccumulatorMs -= config.tickMs;

            if (status.effectId === EFFECTS.COLD) {
                status.exposureMs = clamp(
                    finite(status.exposureMs, 0) + config.tickMs * Math.max(0.1, status.intensity),
                    0,
                    config.maxExposureMs
                );
                if (status.exposureMs >= config.maxExposureMs && !status.fatalTriggered) {
                    status.fatalTriggered = true;
                    if (target?.kind === 'player') {
                        forcePlayerColdDeathV64('effect:cold');
                    } else {
                        damageTarget(target, config.fatalDamage, 'effect:cold');
                    }
                }
                continue;
            }

            if (status.effectId === EFFECTS.GRAVITY) {
                pullEnemyTowardGravityOriginV6330(target, status);
                continue;
            }

            const isHostile = target?.kind === 'enemy' || target?.kind === 'boss' || target?.kind === 'death_echo';
            const configuredDamage = isHostile && Number.isFinite(Number(config.enemyDamage))
                ? Math.max(0, Number(config.enemyDamage))
                : Math.max(0, Number(config.damage) || 0);
            if (configuredDamage > 0) {
                damageTarget(target, Math.max(1, Math.round(configuredDamage * status.intensity)), `effect:${status.effectId}`);
            }
        }
    }

    function isBombEffectFieldV61232(field) {
        return !!field && field.sourceBombId != null;
    }

    function isBombEffectTargetV61232(target) {
        const kind = target?.kind;
        return kind === 'enemy' || kind === 'boss' || kind === 'death_echo';
    }

    function syncFieldToEntities(field, dt) {
        const targets = collectEntities();
        for (const target of targets) {
            // Los efectos producidos por una bomba son ofensivos: solo afectan
            // a entidades hostiles. El jugador nunca recibe SLOW/DAMAGE/STATUS
            // de una explosión elemental.
            if (isBombEffectFieldV61232(field) && !isBombEffectTargetV61232(target)) continue;

            const cell = entityCell(target.entity, target.kind);
            if (!cell || cell.x !== field.x || cell.y !== field.y) continue;
            const config = getEffectConfigV64(field.effectId);
            if (!config) continue;

            if (field.effectId === EFFECTS.HEAT) {
                applyEntityStatus(target, field.effectId, {
                    durationMs: Math.min(field.remainingMs, config.durationMs),
                    intensity: field.intensity,
                    source: field.source,
                    sourceBombId: field.sourceBombId
                });
                warmEntityV64(target, dt, field.intensity);
                continue;
            }

            if (field.effectId === EFFECTS.GRAVITY && target?.kind !== 'enemy') continue;
            const statusDurationMs = field.effectId === EFFECTS.TOXIN
                ? Math.min(config.durationMs, Math.max(250, config.tickMs + 100))
                : config.durationMs;
            applyEntityStatus(target, field.effectId, {
                durationMs: statusDurationMs,
                intensity: field.intensity,
                source: field.source,
                sourceBombId: field.sourceBombId,
                originX: field.originX,
                originY: field.originY
            });
        }
    }

    function updateEntityStatuses(dt) {
        for (const target of collectEntities()) {
            const statuses = ensureEntityStatuses(target.entity);
            if (!statuses) continue;
            for (const [effectId, status] of Object.entries(statuses)) {
                if (!status) {
                    delete statuses[effectId];
                    continue;
                }
                // Limpieza defensiva: si un estado de bomba quedó guardado en
                // el jugador, se elimina y no vuelve a aplicar ningún efecto.
                if (target?.kind === 'player' && status.sourceBombId != null) {
                    delete statuses[effectId];
                    continue;
                }
                tickEntityStatus(target, status, dt);
                if (!getEffectConfigV64(effectId)?.persistent && status.remainingMs <= 0) delete statuses[effectId];
            }
        }
    }

    function update(dt = 16.6667) {
        const state = getState();
        const fields = ensureFields(state);
        if (!state || !fields) return;
        if (!state.isPlaying) {
            if (typeof global.resetBombBlastVisualsV6308 === 'function') global.resetBombBlastVisualsV6308();
            return;
        }
        if (state.paused) return;
        const safeDt = clamp(Number(dt) || 16.6667, 0, 100);
        if (typeof global.updateBombBlastVisualsV6308 === 'function') global.updateBombBlastVisualsV6308(safeDt);

        for (let i = fields.length - 1; i >= 0; i--) {
            const field = fields[i];
            if (!field || !definition(field.effectId)) {
                fields.splice(i, 1);
                continue;
            }
            field.remainingMs -= safeDt;
            field.visualAgeMs = Math.max(0, finite(field.visualAgeMs, 0) + safeDt);
            field.visualTotalMs = Math.max(finite(field.visualTotalMs, 0), field.visualAgeMs + Math.max(0, field.remainingMs));
            if (field.remainingMs <= 0) {
                fields.splice(i, 1);
                continue;
            }
            syncFieldToEntities(field, safeDt);
        }

        updateEntityStatuses(safeDt);
    }

    function resolveBombEffectIds(bomb) {
        return getBombEffectIdsV64(bomb || {});
    }


    function handleBombExplosion(payload) {
        const cells = Array.isArray(payload?.cells) ? payload.cells : [];
        if (!cells.length) return;
        runtime.lastEventId = Number(payload?.eventId || payload?.blastId || runtime.lastEventId + 1);
        const bomb = payload?.bomb || {};

        // Las hitboxes inmediatas siguen siendo responsabilidad de 20-combat.js.
        // Esta ruta registra solamente la animación y los campos persistentes.
        if (typeof global.registerBombBlastVisualV6308 === 'function') {
            global.registerBombBlastVisualV6308(payload);
        }
        triggerBombFeedbackV61210(bomb, payload?.chainIndex || 1);

        const effectIds = resolveBombEffectIds(bomb);
        if (!effectIds.length) return;
        const sourceBombId = bomb.id == null
            ? String(payload?.blastId ?? runtime.lastEventId)
            : String(bomb.id);

        // Deduplicar coordenadas dentro de este evento. Cada effectId deposita
        // su propio campo; no se combinan, consumen ni transforman por tocarse.
        const uniqueCells = new Map();
        for (const cell of cells) {
            const x = Math.trunc(Number(cell?.x));
            const y = Math.trunc(Number(cell?.y));
            if (Number.isInteger(x) && Number.isInteger(y)) uniqueCells.set(tileKey(x, y), { x, y });
        }

        const originX = Math.trunc(finite(bomb.x, 0));
        const originY = Math.trunc(finite(bomb.y, 0));
        const state = getState();
        for (const effectId of effectIds) {
            const config = getEffectConfigV64(effectId);
            if (!config) continue;

            let effectCells = [...uniqueCells.values()];
            if (effectId === EFFECTS.GRAVITY && state && Array.isArray(state.grid)) {
                // La atracción necesita afectar enemigos cercanos aunque no estén
                // sobre la cruz que normalmente los elimina al instante.
                const blastRange = Math.max(1, finite(bomb.range, 1));
                const radius = clamp(Math.ceil(blastRange / 2) + 1, 2, 4);
                const width = Math.max(0, Math.trunc(finite(state.gridWidth, state.grid[0]?.length || 0)));
                const height = Math.max(0, Math.trunc(finite(state.gridHeight, state.grid.length || 0)));
                effectCells = [];
                for (let y = originY - radius; y <= originY + radius; y++) {
                    for (let x = originX - radius; x <= originX + radius; x++) {
                        if (Math.abs(x - originX) + Math.abs(y - originY) > radius) continue;
                        if (x < 0 || y < 0 || x >= width || y >= height) continue;
                        const tile = state.grid[y]?.[x];
                        const types = global.BOMBER_ENGINE?.getWorldTypes?.() || (typeof TYPES !== 'undefined' ? TYPES : {});
                        if (tile === types.WALL || tile === types.BLOCK) continue;
                        effectCells.push({ x, y });
                    }
                }
            }

            for (const cell of effectCells) {
                depositField(effectId, cell.x, cell.y, {
                    durationMs: config.durationMs,
                    intensity: 1,
                    source: 'bomb',
                    owner: bomb.owner || 'player',
                    sourceBombId,
                    originX,
                    originY
                });
            }
        }
    }


    function applyEffectToAllEntitiesV64(effectId, options = {}) {
        const config = getEffectConfigV64(effectId);
        if (!config) return 0;
        let applied = 0;
        const bombOrigin = options.sourceBombId != null || String(options.source || '').includes('bomb');
        for (const target of collectEntities()) {
            if (bombOrigin && !isBombEffectTargetV61232(target)) continue;
            if (applyEntityStatus(target, effectId, options)) applied++;
        }
        return applied;
    }

    function installListener() {
        if (!global.gameEventBus || !EVENT) return false;
        if (global.__BOMB_EFFECTS_V64_INSTALLED__) {
            runtime.duplicateInstallAttempts++;
            return true;
        }
        global.gameEventBus.on(EVENT, handleBombExplosion, { key: LISTENER_KEY });
        global.__BOMB_EFFECTS_V64_INSTALLED__ = true;
        runtime.listenerInstalled = true;
        return true;
    }

    function reset() {
        const fields = ensureFields();
        if (fields) fields.length = 0;
        if (typeof global.resetBombBlastVisualsV6308 === 'function') global.resetBombBlastVisualsV6308();
        for (const target of collectEntities()) {
            if (target.entity?.__bombEffectStatusesV64) target.entity.__bombEffectStatusesV64 = Object.create(null);
        }
    }

    function snapshot() {
        const fields = ensureFields() || [];
        return fields.map(field => ({
            key: field.key,
            x: field.x,
            y: field.y,
            effectId: field.effectId,
            intensity: field.intensity,
            remainingMs: field.remainingMs,
            source: field.source,
            owner: field.owner,
            sourceBombId: field.sourceBombId
        }));
    }

    function validate() {
        const state = getState();
        const fields = ensureFields(state) || [];
        const errors = [];
        const keys = new Set();
        for (const field of fields) {
            const key = `${field?.key}|${field?.effectId}`;
            if (!definition(field?.effectId)) errors.push(`Efecto inválido: ${field?.effectId}`);
            if (!Number.isInteger(field?.x) || !Number.isInteger(field?.y)) errors.push('Campo con coordenada inválida');
            if (keys.has(key)) errors.push(`Campo duplicado: ${key}`);
            keys.add(key);
            if (Number(field?.remainingMs) <= 0) errors.push(`Campo expirado: ${key}`);
        }
        if (fields.length > MAX_FIELDS) errors.push(`Límite de campos superado: ${fields.length}/${MAX_FIELDS}`);

        const listenerCount = global.gameEventBus?.listenerCount?.(EVENT) || 0;
        return {
            valid: errors.length === 0,
            version: VERSION,
            count: fields.length,
            max: MAX_FIELDS,
            listenerInstalled: global.gameEventBus ? listenerCount >= 1 : false,
            listenerCount,
            duplicateInstallAttempts: runtime.duplicateInstallAttempts,
            effects: Object.values(EFFECTS),
            errors
        };
    }

    function draw(targetCtx) {
        // Compatibilidad sin dibujo duplicado: el único renderer de residuos es 07-render.js.
        // No se dibujan rectángulos/contornos por tile desde este registro de lógica.
        return 0;
    }

    installListener();

    global.BOMB_EFFECTS_V64 = EFFECTS;
    global.BOMB_EFFECT_DEFS_V64 = EFFECT_DEFS;
    global.getBombEffectIdsV64 = getBombEffectIdsV64;
    global.getBombEffectConfigV64 = getEffectConfigV64;
    global.getBombEffectStatusV64 = getEffectStatusV64;
    global.getBombEffectMovementModifiersV64 = getBombEffectMovementModifiersV64;
    global.getBombEffectEnemyMovementMultiplierV6306 = getBombEffectEnemyMovementMultiplierV6306;
    global.getBombEffectVisualStateV64 = getBombEffectVisualStateV64;
    global.forcePlayerColdDeathV64 = forcePlayerColdDeathV64;
    global.applyBombEffectToAllEntitiesV64 = applyEffectToAllEntitiesV64;
    global.depositBombEffectFieldV64 = depositField;
    global.bombEffectUpdateV64 = update;
    global.bombEffectResetV64 = reset;
    global.bombEffectSnapshotV64 = snapshot;
    global.bombEffectValidateV64 = validate;
    global.drawBombEffectsV64 = draw;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBombEffects = () => ({ effects: EFFECTS, definitions: EFFECT_DEFS, snapshot });
    global.BOMBER_ENGINE.getBombEffectStatus = getEffectStatusV64;
    global.BOMBER_ENGINE.getBombEffectMovementModifiers = getBombEffectMovementModifiersV64;
    global.BOMBER_ENGINE.validateBombEffects = validate;
    global.BOMBER_ENGINE.resetBombEffects = reset;
    global.BOMBER_ENGINE.getBombEffectSnapshot = snapshot;
    global.BOMBER_ENGINE.getBombEffectListenerAudit = () => ({
        event: EVENT,
        key: LISTENER_KEY,
        listenerCount: global.gameEventBus?.listenerCount?.(EVENT) || 0,
        installed: !!global.__BOMB_EFFECTS_V64_INSTALLED__,
        duplicateInstallAttempts: runtime.duplicateInstallAttempts
    });
})(window);

;
// === js/39-elemental-bombs.js ===
// Bomberman Roguelike v6.30.9 — Identidad elemental de cada bomba
// Arsenal elemental: FIRE / ICE / ELECTRIC / TOXIC / GRAVITY / FRAGMENT / PIERCE. La bomba conserva su elemento
// al ser colocada, agarrada, lanzada o encadenada.
(function installElementalBombsV612(global) {
    'use strict';

    const ELEMENTS = Object.freeze({ NORMAL:'normal', FIRE:'fire', ICE:'ice', ELECTRIC:'electric', TOXIC:'toxic', GRAVITY:'gravity', FRAGMENT:'fragment', PIERCE:'pierce' });
    const POWERUPS = Object.freeze({
        FIRE:'BOMB_FIRE', ICE:'BOMB_ICE', ELECTRIC:'BOMB_ELECTRIC',
        TOXIC:'BOMB_TOXIC', GRAVITY:'BOMB_GRAVITY', FRAGMENT:'BOMB_FRAGMENT', PIERCE:'BOMB_PIERCE'
    });
    const DEFINITIONS = Object.freeze({
        [ELEMENTS.NORMAL]: Object.freeze({ id:'normal', label:'NORMAL', color:'#94a3b8', effectIds:[] }),
        [ELEMENTS.FIRE]: Object.freeze({ id:'fire', label:'FUEGO', color:'#fb923c', effectIds:['heat'] }),
        [ELEMENTS.ICE]: Object.freeze({ id:'ice', label:'HIELO', color:'#7dd3fc', effectIds:['frost'] }),
        [ELEMENTS.ELECTRIC]: Object.freeze({ id:'electric', label:'ELÉCTRICA', color:'#facc15', effectIds:['shock'] }),
        [ELEMENTS.TOXIC]: Object.freeze({ id:'toxic', label:'TÓXICA', color:'#84cc16', effectIds:['toxin'] }),
        [ELEMENTS.GRAVITY]: Object.freeze({ id:'gravity', label:'GRAVITATORIA', color:'#c084fc', effectIds:['gravity'] }),
        [ELEMENTS.FRAGMENT]: Object.freeze({ id:'fragment', label:'FRAGMENTACIÓN', color:'#fb7185', effectIds:[] }),
        [ELEMENTS.PIERCE]: Object.freeze({ id:'pierce', label:'PERFORANTE', color:'#fbbf24', effectIds:[] })
    });
    const POWERUP_DEFS = Object.freeze({
        [POWERUPS.FIRE]: Object.freeze({ id:POWERUPS.FIRE, name:'BOMBA FUEGO', icon:'🔥', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Cambia el elemento de las próximas bombas a FUEGO.', implemented:true }),
        [POWERUPS.ICE]: Object.freeze({ id:POWERUPS.ICE, name:'BOMBA HIELO', icon:'❄️', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Cambia el elemento de las próximas bombas a HIELO. Deja una zona que ralentiza.', implemented:true }),
        [POWERUPS.ELECTRIC]: Object.freeze({ id:POWERUPS.ELECTRIC, name:'BOMBA ELÉCTRICA', icon:'⚡', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Cambia el elemento de las próximas bombas a ELÉCTRICA. Deja una zona dañina.', implemented:true }),
        [POWERUPS.TOXIC]: Object.freeze({ id:POWERUPS.TOXIC, name:'BOMBA TÓXICA', icon:'☣', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Deja una nube venenosa que daña a enemigos durante varios segundos.', implemented:true }),
        [POWERUPS.GRAVITY]: Object.freeze({ id:POWERUPS.GRAVITY, name:'BOMBA GRAVITATORIA', icon:'🌀', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Atrae enemigos cercanos hacia el origen incluso fuera de la línea de explosión.', implemented:true }),
        [POWERUPS.FRAGMENT]: Object.freeze({ id:POWERUPS.FRAGMENT, name:'BOMBA DE FRAGMENTACIÓN', icon:'💥', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Extiende la explosión en cuatro brazos diagonales, bloqueados por obstáculos y esquinas cerradas.', implemented:true }),
        [POWERUPS.PIERCE]: Object.freeze({ id:POWERUPS.PIERCE, name:'BOMBA PERFORANTE', icon:'➤', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Atraviesa hasta dos bloques destructibles por dirección, pero nunca muros sólidos.', implemented:true })
    });

    function getPlayer(){ return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }
    function getState(){ return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }
    function normalize(value){ const key=String(value||'').toLowerCase(); return Object.prototype.hasOwnProperty.call(DEFINITIONS,key) ? key : ELEMENTS.NORMAL; }
    function getPlayerBombElementV612(){ return normalize(getPlayer()?.bombElementV612); }
    function setPlayerBombElementV612(element){
        const p=getPlayer(); const key=normalize(element); if(!p) return false;
        p.bombElementV612=key;
        const def=DEFINITIONS[key];
        if(typeof global.addFloatingText==='function' && key!==ELEMENTS.NORMAL) global.addFloatingText(def.label,(p.x+p.width/2),(p.y+0.2),def.color);
        if(typeof global.updateUI==='function') global.updateUI(true);
        return true;
    }
    function applyElementalPowerupV612(type){
        const map={
            [POWERUPS.FIRE]:ELEMENTS.FIRE, [POWERUPS.ICE]:ELEMENTS.ICE, [POWERUPS.ELECTRIC]:ELEMENTS.ELECTRIC,
            [POWERUPS.TOXIC]:ELEMENTS.TOXIC, [POWERUPS.GRAVITY]:ELEMENTS.GRAVITY,
            [POWERUPS.FRAGMENT]:ELEMENTS.FRAGMENT, [POWERUPS.PIERCE]:ELEMENTS.PIERCE
        };
        return Object.prototype.hasOwnProperty.call(map,type) ? setPlayerBombElementV612(map[type]) : false;
    }
    function getBombElementV612(bomb){ return normalize(bomb?.elementV612); }
    function getBombElementDefV612(bombOrElement){
        const key=typeof bombOrElement==='object' ? getBombElementV612(bombOrElement) : normalize(bombOrElement);
        return DEFINITIONS[key] || DEFINITIONS.normal;
    }
    function applyElementToBombV612(bomb){
        if(!bomb) return false;
        bomb.elementV612=getPlayerBombElementV612();
        const def=getBombElementDefV612(bomb);
        bomb.effectIds=def.effectIds.slice();
        return true;
    }
    function getPowerupDefinitionV612(type){ return POWERUP_DEFS[String(type||'')] || null; }
    function getPowerupIdsV612(){ return Object.freeze(Object.keys(POWERUP_DEFS)); }

    // Autoridad: este módulo asigna un único elemento a cada bomba colocada.
    // 38-bomb-effects.js recibe la detonación y deposita el efecto correspondiente.
    // Cada elemento conserva su identidad al detonar y al dejar un campo.

    function update(dt){ if(typeof global.bombEffectUpdateV64==='function') global.bombEffectUpdateV64(dt); }
    function draw(ctx){ if(typeof global.drawBombEffectsV64==='function') global.drawBombEffectsV64(ctx); }
    function validate(){
        const p=getPlayer(); const state=getState();
        return {
            valid:!!p && !!state && !!DEFINITIONS[getPlayerBombElementV612()],
            playerElement:getPlayerBombElementV612(),
            elements:Object.keys(DEFINITIONS),
            powerups:Object.keys(POWERUP_DEFS)
        };
    }

    // Este módulo NO escucha BOMBA_EXPLOTO. La única autoridad de campos es
    // 38-bomb-effects.js; la explosión inmediata sigue bajo 20-combat.js.

    global.ELEMENTAL_BOMBS_V612=ELEMENTS;
    global.ELEMENTAL_BOMB_POWERUPS_V612=POWERUPS;
    global.ELEMENTAL_BOMB_DEFS_V612=DEFINITIONS;
    global.ELEMENTAL_BOMB_POWERUP_DEFS_V612=POWERUP_DEFS;
    global.getPlayerBombElementV612=getPlayerBombElementV612;
    global.setPlayerBombElementV612=setPlayerBombElementV612;
    global.applyElementalPowerupV612=applyElementalPowerupV612;
    global.getBombElementV612=getBombElementV612;
    global.getBombElementDefV612=getBombElementDefV612;
    global.applyElementToBombV612=applyElementToBombV612;
    global.getPowerupDefinitionV612=getPowerupDefinitionV612;
    global.getPowerupIdsV612=getPowerupIdsV612;
    global.updateElementalBombsV612=update;
    global.drawElementalBombFieldsV612=draw;
    global.auditElementalBombsV612=validate;
})(window);

;
// === js/40-biome-switch.js ===
// Bomberman Roguelike v6.32.1 — Cambio de bioma durante la partida
(function initBiomeSwitchV61225(global){
    'use strict';
    const runtime={ready:false};

    function getSelect(){return global.document?.getElementById?.('biome-switch-select')||null;}
    function sync(){
        const select=getSelect();
        if(!select)return;
        // El selector debe seguir disponible durante recompensas, pausa y transiciones.
        select.disabled=false;
        if(typeof gameState==='undefined')return;
        const current=gameState.biomeOverrideV49||gameState.biomeV49?.id||(typeof getBiomeForDepthV49==='function'?getBiomeForDepthV49(gameState.level)?.id:'winter');
        if(current&&select.value!==current)select.value=current;
        const status=global.document.getElementById('biome-switch-status');
        if(status)status.textContent=gameState.biomeOverrideV49?'MANUAL':'AUTOMÁTICO';
    }
    function change(id){
        if(typeof gameState==='undefined')return;
        if(typeof global.setBiomeOverrideV49==='function'){
            if(global.setBiomeOverrideV49(id,true)){
                sync();
            }
            return;
        }
        if(typeof global.BOMBER_ENGINE?.setBiomeOverride==='function'){
            if(global.BOMBER_ENGINE.setBiomeOverride(id,true))sync();
        }
    }
    function init(){
        const select=getSelect();
        if(!select)return;
        if(runtime.ready)return;
        runtime.ready=true;
        select.addEventListener('change',()=>change(select.value));
        sync();
        global.setInterval(sync,250);
    }
    if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);

;
// === js/41-partida-language.js ===
// Bomberman Roguelike v6.12.25 — Terminología visible: RUN -> PARTIDA
(function initPartidaLanguageV61225(global){
    'use strict';
    const REPLACEMENTS=[
        [/\bRUN-BASED ROGUELIKE\b/gi,'ROGUELIKE POR PARTIDAS'],
        [/\bROGUELIKE \/\/ RUN-BASED\b/gi,'ROGUELIKE // PARTIDAS'],
        [/\bDEEPER EVERY RUN\b/gi,'MÁS PROFUNDA CADA PARTIDA'],
        [/\bRECOMPENSA DE RUN\b/gi,'RECOMPENSA DE PARTIDA'],
        [/\bRUN TERMINADA\b/gi,'PARTIDA TERMINADA'],
        [/\bRUN FINALIZADA\b/gi,'PARTIDA FINALIZADA'],
        [/\bRUN PAUSADA\b/gi,'PARTIDA PAUSADA'],
        [/\bNUEVA RUN\b/gi,'NUEVA PARTIDA'],
        [/\bCONTINUAR RUN\b/gi,'CONTINUAR PARTIDA'],
        [/\bINICIAR RUN\b/gi,'INICIAR PARTIDA'],
        [/\bESTADO DE LA RUN\b/gi,'ESTADO DE LA PARTIDA'],
        [/\bRUNS\b/g,'PARTIDAS'],
        [/\brun\b/g,'partida'],
        [/\bRUN\b/g,'PARTIDA']
    ];
    const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
    function transformText(text){let out=text;for(const [pattern,replacement] of REPLACEMENTS)out=out.replace(pattern,replacement);return out;}
    function walk(root){
        const walker=global.document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        const nodes=[];let node;while((node=walker.nextNode()))nodes.push(node);
        for(const textNode of nodes){if(SKIP.has(textNode.parentElement?.tagName))continue;const next=transformText(textNode.nodeValue);if(next!==textNode.nodeValue)textNode.nodeValue=next;}
        root.querySelectorAll?.('[title],[aria-label]').forEach(el=>{if(el.hasAttribute('title'))el.setAttribute('title',transformText(el.getAttribute('title')));if(el.hasAttribute('aria-label'))el.setAttribute('aria-label',transformText(el.getAttribute('aria-label')));});
    }
    function init(){
        if(!global.document?.body)return;
        walk(global.document.body);
        const observer=new MutationObserver(mutations=>{for(const mutation of mutations){for(const added of mutation.addedNodes){if(added.nodeType===Node.TEXT_NODE){const next=transformText(added.nodeValue);if(next!==added.nodeValue)added.nodeValue=next;}else if(added.nodeType===Node.ELEMENT_NODE&&!SKIP.has(added.tagName)){walk(added);}}}});
        observer.observe(global.document.body,{subtree:true,childList:true});
        global.PARTIDA_LANGUAGE_V61225=true;
    }
    if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);

;
// === js/42-biome-liquids.js ===
// Bomberman Roguelike v6.12.31 — Biome liquid terrain + bomb/player interactions.
// The liquid layer remains separate from TYPES/collision and uses the real bomb lifecycle.
(function installBiomeLiquidsV631(global) {
    'use strict';

    const LIQUIDS = Object.freeze({
        autumn: Object.freeze({
            id: 'mud', label: 'BARRO', color: '#8a5a3b', edge: '#5f3b27', hi: '#b77b55', shimmer: false,
            playerSpeed: 0.62, bombMotionMultiplier: 1.50, sinkBombAfterMs: 4000, playerDamageIntervalMs: 0,
            bombFuseRate: 0, bombMessage: 'LA BOMBA SE HUNDE EN EL BARRO'
        }),
        spring: Object.freeze({
            id: 'pond', label: 'AGUA', color: '#3ca7b8', edge: '#1f6d7a', hi: '#8fe4ed', shimmer: true,
            playerSpeed: 0.72, bombMotionMultiplier: 1.65, sinkBombAfterMs: 3000, playerDamageIntervalMs: 0,
            bombFuseRate: 0, bombMessage: 'LA BOMBA SE HUNDE'
        }),
        mountains: Object.freeze({
            id: 'glacial-water', label: 'AGUA GLACIAL', color: '#6cb8d9', edge: '#326f99', hi: '#dff7ff', shimmer: true,
            playerSpeed: 0.55, bombMotionMultiplier: 1.80, sinkBombAfterMs: 0, playerDamageIntervalMs: 0,
            bombFuseRate: 0.45, bombMessage: 'LA MECHA SE CONGELA'
        }),
        beach: Object.freeze({
            id: 'sea', label: 'AGUA DE MAR', color: '#2d9ec7', edge: '#145a75', hi: '#b9f1ff', shimmer: true,
            playerSpeed: 0.80, bombMotionMultiplier: 1.35, sinkBombAfterMs: 3000, playerDamageIntervalMs: 0,
            bombFuseRate: 0, bombMessage: 'LA BOMBA ES ARRASTRADA POR EL MAR'
        }),
        underground: Object.freeze({
            id: 'toxic', label: 'LÍQUIDO TÓXICO', color: '#5da83f', edge: '#274f1d', hi: '#c5f07d', shimmer: true,
            playerSpeed: 0.76, bombMotionMultiplier: 1.40, sinkBombAfterMs: 2500, playerDamageIntervalMs: 900,
            bombFuseRate: 0, bombMessage: 'EL LÍQUIDO CORROE LA BOMBA'
        }),
        inferno: Object.freeze({
            id: 'lava', label: 'LAVA', color: '#dd5b2a', edge: '#6f2415', hi: '#ffd166', shimmer: true,
            playerSpeed: 0.78, bombMotionMultiplier: 1.10, sinkBombAfterMs: 0, playerDamageIntervalMs: 650,
            bombFuseRate: 1, instantBombDetonation: true, bombMessage: '¡LA LAVA DETONA LA BOMBA!'
        })
    });

    const runtime = {
        lastBiomeId: null,
        lastLevel: null,
        installed: false
    };

    function getBiomeId() {
        if (typeof gameState === 'undefined') return 'classic';
        return String(gameState.biomeOverrideV49 || gameState.biomeV49?.id || 'classic');
    }

    function getConfig() {
        return LIQUIDS[getBiomeId()] || null;
    }

    function hashString(text) {
        let h = 2166136261 >>> 0;
        const input = String(text ?? '');
        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function createRng(seed) {
        let state = hashString(seed) || 0x9e3779b9;
        return function next() {
            state = (state + 0x6D2B79F5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function key(x, y) { return `${x},${y}`; }

    function isCandidate(x, y, blocked) {
        if (x <= 0 || y <= 0 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
        if (gameState.grid?.[y]?.[x] !== TYPES.EMPTY) return false;
        if (blocked.has(key(x, y))) return false;
        if (Math.abs(x - 1) <= 2 && Math.abs(y - 1) <= 2) return false;
        if (gameState.exitPos && x === gameState.exitPos.x && y === gameState.exitPos.y) return false;
        return true;
    }

    function collectCandidates(blocked) {
        const cells = [];
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            for (let x = 1; x < gameState.gridWidth - 1; x++) {
                if (isCandidate(x, y, blocked)) cells.push({ x, y });
            }
        }
        return cells;
    }

    function growPatch(start, targetSize, blocked, rng) {
        const patch = [{ x: start.x, y: start.y }];
        const patchKeys = new Set([key(start.x, start.y)]);
        const frontier = [start];
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

        while (patch.length < targetSize && frontier.length) {
            const frontierIndex = Math.floor(rng() * frontier.length);
            const origin = frontier[frontierIndex];
            const ordered = dirs.slice().sort(() => rng() - 0.5);
            let added = false;
            for (const [dx, dy] of ordered) {
                const nx = origin.x + dx;
                const ny = origin.y + dy;
                const k = key(nx, ny);
                if (patchKeys.has(k)) continue;
                if (!isCandidate(nx, ny, blocked)) continue;
                const cell = { x: nx, y: ny };
                patch.push(cell);
                patchKeys.add(k);
                frontier.push(cell);
                added = true;
                break;
            }
            if (!added) frontier.splice(frontierIndex, 1);
        }

        if (patch.length < 3) return null;
        patch.forEach(cell => blocked.add(key(cell.x, cell.y)));
        return patch;
    }

    function generatePatchesV631() {
        if (typeof gameState === 'undefined' || !getConfig()) return [];

        const blocked = new Set();
        const rng = createRng(`liquid|${gameState.proceduralMapSeed || gameState.runNumber || 1}|${gameState.level}|${getBiomeId()}`);
        const cells = collectCandidates(blocked);
        if (cells.length < 3) return [];

        const area = gameState.gridWidth * gameState.gridHeight;
        const patchCount = Math.max(1, Math.min(4, Math.floor(area / 170) + 1));
        const patches = [];
        const maxAttempts = Math.max(20, cells.length * 2);

        for (let attempt = 0; attempt < maxAttempts && patches.length < patchCount * 3; attempt++) {
            const pool = collectCandidates(blocked);
            if (!pool.length) break;
            const start = pool[Math.floor(rng() * pool.length)];
            const targetSize = 3 + Math.floor(rng() * 5); // 3–7 tiles, siempre conectados cardinalmente.
            const patch = growPatch(start, targetSize, blocked, rng);
            if (patch) patches.push(...patch);
        }

        return patches;
    }

    function rebuildBiomeLiquidsV631(force = false) {
        if (typeof gameState === 'undefined') return false;
        const biomeId = getBiomeId();
        const level = Number(gameState.level) || 1;
        if (!force && runtime.lastBiomeId === biomeId && runtime.lastLevel === level && Array.isArray(gameState.biomeLiquidTilesV630)) {
            return true;
        }

        gameState.biomeLiquidTilesV630 = generatePatchesV631();
        runtime.lastBiomeId = biomeId;
        runtime.lastLevel = level;
        if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
        return true;
    }

    function hasLiquidTileV631(x, y) {
        const list = Array.isArray(gameState?.biomeLiquidTilesV630) ? gameState.biomeLiquidTilesV630 : [];
        return list.some(cell => cell.x === x && cell.y === y);
    }

    function getLiquidKindV631() {
        return getConfig();
    }

    function getLiquidBombEffectV631(x, y) {
        const liquid = getConfig();
        if (!liquid || !hasLiquidTileV631(Number(x), Number(y))) return null;
        return {
            liquidId: liquid.id,
            playerSpeed: liquid.playerSpeed,
            bombMotionMultiplier: liquid.bombMotionMultiplier,
            sinkBombAfterMs: liquid.sinkBombAfterMs,
            bombFuseRate: liquid.bombFuseRate,
            instantBombDetonation: !!liquid.instantBombDetonation,
            message: liquid.bombMessage || liquid.label
        };
    }

    function getBiomeLiquidPlayerEffectV631(entity) {
        const target = entity || global.player;
        if (!target || typeof gameState === 'undefined') return null;
        const size = Number(global.TILE_SIZE || 48);
        const gx = Math.floor((Number(target.x) + Number(target.width || 0) / 2) / size);
        const gy = Math.floor((Number(target.y) + Number(target.height || 0) / 2) / size);
        if (!hasLiquidTileV631(gx, gy)) return null;
        const liquid = getConfig();
        if (!liquid) return null;
        return {
            liquidId: liquid.id,
            playerSpeed: liquid.playerSpeed,
            damageIntervalMs: liquid.playerDamageIntervalMs,
            damageSource: liquid.id === 'lava' ? 'lava' : 'liquid'
        };
    }

    function getBombLiquidMotionMultiplierV631(x, y) {
        const effect = getLiquidBombEffectV631(x, y);
        return effect ? Math.max(1, Number(effect.bombMotionMultiplier) || 1) : 1;
    }

    function isBombSubmergedV631(bomb) {
        return !!bomb?.biomeLiquidState?.submerged;
    }

    function showLiquidBombMessageV631(bomb, effect) {
        if (!bomb || !effect || bomb.biomeLiquidState?.messageShown) return;
        bomb.biomeLiquidState.messageShown = true;
        if (typeof global.addFloatingText === 'function') {
            global.addFloatingText(effect.message, (Number(bomb.x) + 0.5) * Number(global.TILE_SIZE || 48), (Number(bomb.y) + 0.2) * Number(global.TILE_SIZE || 48), '#dff7ff');
        }
    }

    function processBombLiquidV631(bomb, dt) {
        if (!bomb || typeof gameState === 'undefined') return { consumed: false, pausedFuse: false, instant: false };
        const state = String(bomb.state || '').toLowerCase();
        if (state === 'carried') return { consumed: false, pausedFuse: true, instant: false };

        const effect = getLiquidBombEffectV631(bomb.x, bomb.y);
        if (!effect) {
            if (bomb.biomeLiquidState && !bomb.biomeLiquidState.submerged) bomb.biomeLiquidState = null;
            return { consumed: false, pausedFuse: false, instant: false };
        }

        if (!bomb.biomeLiquidState || bomb.biomeLiquidState.liquidId !== effect.liquidId) {
            bomb.biomeLiquidState = {
                liquidId: effect.liquidId,
                elapsedMs: 0,
                submerged: false,
                messageShown: false
            };
        }

        const liquidState = bomb.biomeLiquidState;
        liquidState.elapsedMs += Math.max(0, Number(dt) || 0);

        if (effect.instantBombDetonation) {
            liquidState.submerged = false;
            showLiquidBombMessageV631(bomb, effect);
            return { consumed: false, pausedFuse: false, instant: true };
        }

        if (effect.sinkBombAfterMs > 0) {
            liquidState.submerged = true;
            showLiquidBombMessageV631(bomb, effect);
            bomb.pendingDetonation = false;
            bomb.timer = Math.max(Number(bomb.timer) || 0, Number(bomb.fuseTotal) || 0);
            if (liquidState.elapsedMs >= effect.sinkBombAfterMs) {
                return { consumed: true, pausedFuse: true, instant: false };
            }
            return { consumed: false, pausedFuse: true, instant: false };
        }

        liquidState.submerged = false;
        return {
            consumed: false,
            pausedFuse: Number(effect.bombFuseRate) === 0,
            fuseRate: Number(effect.bombFuseRate) || 0,
            instant: false
        };
    }

    function updateBiomeLiquidPlayerEffectsV631(dt) {
        if (typeof gameState === 'undefined' || !gameState.isPlaying || typeof player === 'undefined') return;
        const effect = getBiomeLiquidPlayerEffectV631(player);
        if (!effect || effect.damageIntervalMs <= 0) {
            player._biomeLiquidDamageTimerV631 = 0;
            player._biomeLiquidDamageLiquidV631 = null;
            return;
        }

        if (player._biomeLiquidDamageLiquidV631 !== effect.liquidId) {
            player._biomeLiquidDamageLiquidV631 = effect.liquidId;
            player._biomeLiquidDamageTimerV631 = effect.damageIntervalMs;
        }

        player._biomeLiquidDamageTimerV631 = Math.max(0, Number(player._biomeLiquidDamageTimerV631) - Math.max(0, Number(dt) || 0));
        if (player._biomeLiquidDamageTimerV631 > 0) return;

        player._biomeLiquidDamageTimerV631 += effect.damageIntervalMs;
        if (typeof global.takeDamage === 'function') {
            global.takeDamage(effect.damageSource, player.x, player.y);
        } else if (typeof takeDamage === 'function') {
            takeDamage(effect.damageSource, player.x, player.y);
        }
    }


    function install() {
        if (runtime.installed) return true;
        if (typeof global.initLevel !== 'function') return false;
        const originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV631(...args) {
            const result = originalInitLevel(...args);
            rebuildBiomeLiquidsV631(true);
            return result;
        };
        runtime.installed = true;
        rebuildBiomeLiquidsV631(true);
        global.setInterval(() => {
            if (typeof gameState === 'undefined' || !gameState.isPlaying) return;
            rebuildBiomeLiquidsV631(false);
        }, 250);
        return true;
    }

    function bootstrap() {
        if (install()) return;
        global.setTimeout(bootstrap, 40);
    }

    global.hasLiquidTileV630 = hasLiquidTileV631;
    global.getLiquidKindV630 = getLiquidKindV631;
    global.rebuildBiomeLiquidsV630 = rebuildBiomeLiquidsV631;
    global.getBiomeLiquidPlayerEffectV631 = getBiomeLiquidPlayerEffectV631;
    global.getLiquidBombEffectV631 = getLiquidBombEffectV631;
    global.getBombLiquidMotionMultiplierV631 = getBombLiquidMotionMultiplierV631;
    global.processBombLiquidV631 = processBombLiquidV631;
    global.isBombSubmergedV631 = isBombSubmergedV631;
    global.updateBiomeLiquidPlayerEffectsV631 = updateBiomeLiquidPlayerEffectsV631;
    global.BIOME_LIQUIDS_V630 = LIQUIDS;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBiomeLiquidKinds = () => ({ ...LIQUIDS });

    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    else bootstrap();
})(window);

;
// === js/43-biome-enemy-species.js ===
// BOMBERMAN ROGUELIKE v6.26.0 — Catálogo unificado de especies por bioma.
// Una especie es: identidad + bioma + arquetipo base + regla ambiental pequeña.
// No crea un renderer ni una IA paralela.
(function installBiomeEnemySpeciesV626(global) {
    'use strict';

    const RULES = Object.freeze({
        ice_resistance: Object.freeze({ id: 'ice_resistance', label: 'Resistencia al hielo', frostDurationMultiplier: 0.45 }),
        leaf_camouflage: Object.freeze({ id: 'leaf_camouflage', label: 'Camuflaje leve en hojas', coveredVisionTiles: -2 }),
        vegetation_regen: Object.freeze({ id: 'vegetation_regen', label: 'Regeneración leve en vegetación', regenPerSecond: 0.55, regenMax: 3 }),
        heat_resistance: Object.freeze({ id: 'heat_resistance', label: 'Resistencia al calor', heatDurationMultiplier: 0.45 }),
        dark_vision: Object.freeze({ id: 'dark_vision', label: 'Visión en oscuridad', visionBonusTiles: 2 }),
        floatation: Object.freeze({ id: 'floatation', label: 'Flotación', speedMultiplier: 1.04 }),
        stability: Object.freeze({ id: 'stability', label: 'Estabilidad / resistencia a empujones', pushMultiplier: 0.35 }),
        terrain_mobility: Object.freeze({ id: 'terrain_mobility', label: 'Movimiento mejor en agua/arena', waterSpeedMultiplier: 1.18 }),
        environment_immunity: Object.freeze({ id: 'environment_immunity', label: 'Ignora penalización ambiental', ignoreEnvironmentalMovement: true }),
        high_altitude_speed: Object.freeze({ id: 'high_altitude_speed', label: '+Velocidad en alturas', speedMultiplier: 1.08, highAltitudeTopRatio: 0.34 }),
        lava_immunity: Object.freeze({ id: 'lava_immunity', label: 'Sin penalización por lava', lavaSpeedMultiplier: 1 })
    });

    const TYPE_KEYS = Object.freeze(['RASTRERO', 'VOLADOR', 'ESPECIAL']);
    const BIOME_IDS = Object.freeze([
        'winter', 'autumn', 'spring', 'summer', 'underground',
        'clouds', 'mountains', 'beach', 'space', 'sky', 'inferno'
    ]);

    // 11 biomas × 3 especies = 33 especies reales.
    // preferredAi es una preferencia de identidad; el arquetipo sigue siendo
    // el contrato físico/base que consume el resto del gameplay.
    const SPECIES_SEED = Object.freeze({
        winter: {
            RASTRERO: { id: 'winter_ice_wolf', name: 'Lobo de hielo', ruleId: 'ice_resistance', preferredAi: 'chaser', abilityId: 'ice_trail' },
            VOLADOR: { id: 'winter_arctic_owl', name: 'Búho ártico', ruleId: 'ice_resistance', preferredAi: 'flyer' },
            ESPECIAL: { id: 'winter_snow_bear', name: 'Oso de nieve', ruleId: 'ice_resistance', preferredAi: 'aggressive' }
        },
        autumn: {
            RASTRERO: { id: 'autumn_boar', name: 'Jabalí', ruleId: 'leaf_camouflage', preferredAi: 'patroller', abilityId: 'boar_charge' },
            VOLADOR: { id: 'autumn_crow', name: 'Cuervo', ruleId: 'leaf_camouflage', preferredAi: 'flyer' },
            ESPECIAL: { id: 'autumn_scarecrow', name: 'Espantapájaros', ruleId: 'leaf_camouflage', preferredAi: 'aggressive' }
        },
        spring: {
            RASTRERO: { id: 'spring_frog', name: 'Rana', ruleId: 'vegetation_regen', preferredAi: 'evasive', abilityId: 'frog_leap' },
            VOLADOR: { id: 'spring_bee', name: 'Abeja', ruleId: 'vegetation_regen', preferredAi: 'flyer' },
            ESPECIAL: { id: 'spring_carnivorous_plant', name: 'Planta carnívora', ruleId: 'vegetation_regen', preferredAi: 'aggressive' }
        },
        summer: {
            RASTRERO: { id: 'summer_lizard', name: 'Lagarto', ruleId: 'heat_resistance', preferredAi: 'chaser', abilityId: 'lizard_camouflage' },
            VOLADOR: { id: 'summer_seagull', name: 'Gaviota', ruleId: 'heat_resistance', preferredAi: 'flyer' },
            ESPECIAL: { id: 'summer_giant_beetle', name: 'Escarabajo gigante', ruleId: 'heat_resistance', preferredAi: 'aggressive' }
        },
        underground: {
            RASTRERO: { id: 'underground_mole', name: 'Topo', ruleId: 'dark_vision', preferredAi: 'patroller', abilityId: 'mole_burrow' },
            VOLADOR: { id: 'underground_bat', name: 'Murciélago', ruleId: 'dark_vision', preferredAi: 'flyer' },
            ESPECIAL: { id: 'underground_cave_worm', name: 'Gusano cavernario', ruleId: 'dark_vision', preferredAi: 'aggressive' }
        },
        clouds: {
            RASTRERO: { id: 'clouds_cloud_creature', name: 'Criatura de nube', ruleId: 'floatation', preferredAi: 'evasive', abilityId: 'cloud_ethereal' },
            VOLADOR: { id: 'clouds_celestial_bird', name: 'Ave celestial', ruleId: 'floatation', preferredAi: 'flyer' },
            ESPECIAL: { id: 'clouds_storm_elemental', name: 'Elemental de tormenta', ruleId: 'floatation', preferredAi: 'aggressive' }
        },
        mountains: {
            RASTRERO: { id: 'mountains_mountain_goat', name: 'Cabra montés', ruleId: 'stability', preferredAi: 'chaser', abilityId: 'goat_stomp' },
            VOLADOR: { id: 'mountains_eagle', name: 'Águila', ruleId: 'stability', preferredAi: 'flyer' },
            ESPECIAL: { id: 'mountains_stone_golem', name: 'Golem de piedra', ruleId: 'stability', preferredAi: 'aggressive' }
        },
        beach: {
            RASTRERO: { id: 'beach_crab', name: 'Cangrejo', ruleId: 'terrain_mobility', preferredAi: 'patroller', abilityId: 'crab_shell' },
            VOLADOR: { id: 'beach_coastal_gull', name: 'Gaviota costera', ruleId: 'terrain_mobility', preferredAi: 'flyer' },
            ESPECIAL: { id: 'beach_octopus', name: 'Pulpo', ruleId: 'terrain_mobility', preferredAi: 'aggressive' }
        },
        space: {
            RASTRERO: { id: 'space_alien_insect', name: 'Insecto alienígena', ruleId: 'environment_immunity', preferredAi: 'evasive', abilityId: 'alien_acid' },
            VOLADOR: { id: 'space_organic_drone', name: 'Dron orgánico', ruleId: 'environment_immunity', preferredAi: 'flyer' },
            ESPECIAL: { id: 'space_alien_creature', name: 'Criatura extraterrestre', ruleId: 'environment_immunity', preferredAi: 'aggressive' }
        },
        sky: {
            RASTRERO: { id: 'sky_celestial_being', name: 'Querubín', ruleId: 'high_altitude_speed', preferredAi: 'chaser', abilityId: 'cherub_aura' },
            VOLADOR: { id: 'sky_luminous_bird', name: 'Ave luminosa', ruleId: 'high_altitude_speed', preferredAi: 'flyer' },
            ESPECIAL: { id: 'sky_guardian', name: 'Guardián celeste', ruleId: 'high_altitude_speed', preferredAi: 'aggressive' }
        },
        inferno: {
            RASTRERO: { id: 'inferno_hellhound', name: 'Sabueso infernal', ruleId: 'lava_immunity', preferredAi: 'chaser', abilityId: 'hellhound_ember' },
            VOLADOR: { id: 'inferno_flying_demon', name: 'Demonio alado', ruleId: 'lava_immunity', preferredAi: 'flyer' },
            ESPECIAL: { id: 'inferno_imp', name: 'Diablillo', ruleId: 'lava_immunity', preferredAi: 'aggressive' }
        }
    });

    function stateObject() {
        return (typeof gameState !== 'undefined' && gameState)
            ? gameState
            : (global.BOMBER_ENGINE?.getState?.() || {});
    }

    function currentBiomeId(enemy = null) {
        const state = stateObject();
        const persisted = enemy?.biomeSpawnIdV626 || enemy?.biomeSpawnIdV625;
        if (persisted && SPECIES_SEED[persisted]) return String(persisted);
        const direct = state.biomeOverrideV49 || state.biomeV49?.id;
        if (direct && SPECIES_SEED[direct]) return String(direct);
        if (typeof global.getBiomeForDepthV49 === 'function') {
            const meta = global.getBiomeForDepthV49(state.level || 1);
            if (meta?.id && SPECIES_SEED[meta.id]) return String(meta.id);
        }
        return 'winter';
    }

    function getTypeKey(enemyOrType) {
        const type = enemyOrType?.type || enemyOrType;
        const map = (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES) ? ENEMY_TYPES : null;
        if (map && type === map.VOLADOR) return 'VOLADOR';
        if (map && type === map.ESPECIAL) return 'ESPECIAL';
        if (type?.canFly) return 'VOLADOR';
        if (type?.name === 'Especial') return 'ESPECIAL';
        return 'RASTRERO';
    }

    function mergeVisualProfile(biomeId, typeKey, seed) {
        const skin = global.ENEMY_SKIN_PROFILES_V614?.[biomeId]?.[typeKey]
            || global.ENEMY_SKIN_PROFILES_V614?.classic?.[typeKey]
            || {};
        return {
            ...seed,
            biomeId,
            typeKey,
            rule: RULES[seed.ruleId] || null,
            body: skin.body,
            shade: skin.shade,
            accent: skin.accent,
            motif: skin.motif
        };
    }

    function getProfile(enemyOrType) {
        const enemy = enemyOrType?.type ? enemyOrType : null;
        const biomeId = currentBiomeId(enemy);
        const typeKey = enemy?.speciesIdV626
            ? (SPECIES_SEED[biomeId] && Object.values(SPECIES_SEED[biomeId]).some(item => item.id === enemy.speciesIdV626)
                ? TYPE_KEYS.find(key => SPECIES_SEED[biomeId][key].id === enemy.speciesIdV626) || getTypeKey(enemyOrType)
                : getTypeKey(enemyOrType))
            : getTypeKey(enemyOrType);
        const seed = SPECIES_SEED[biomeId]?.[typeKey] || SPECIES_SEED.winter.RASTRERO;
        return Object.freeze(mergeVisualProfile(biomeId, typeKey, seed));
    }

    function getSpeciesDefinitionV626(biomeId, typeKey) {
        const id = SPECIES_SEED[biomeId]?.[typeKey] ? biomeId : 'winter';
        const key = SPECIES_SEED[id]?.[typeKey] ? typeKey : 'RASTRERO';
        return Object.freeze(mergeVisualProfile(id, key, SPECIES_SEED[id][key]));
    }

    function ruleId(enemyOrType) { return String(getProfile(enemyOrType).ruleId || 'none'); }
    function rule(enemyOrType) { return RULES[ruleId(enemyOrType)] || null; }

    function isLeafCover(enemy) {
        if (!enemy || currentBiomeId(enemy) !== 'autumn') return false;
        const cell = typeof global.gridCurrentTile === 'function' ? global.gridCurrentTile(enemy, 'enemy') : null;
        const state = stateObject();
        if (!cell || !state.grid) return false;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dx, dy]) => state.grid[cell.y + dy]?.[cell.x + dx] === global.TYPES?.BLOCK);
    }

    function isHighAltitude(enemy) {
        if (!enemy || currentBiomeId(enemy) !== 'sky') return false;
        const state = stateObject();
        const h = Math.max(1, Number(state.gridHeight) || 1);
        const cy = (Number(enemy.y) + Number(enemy.height || 0) / 2) / Number(typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 48);
        return cy <= Math.max(1, h * 0.34);
    }

    function getMovementMultiplier(enemy) {
        const r = rule(enemy);
        if (!r) return 1;
        if (r.id === 'floatation') return r.speedMultiplier;
        if (r.id === 'high_altitude_speed' && isHighAltitude(enemy)) return r.speedMultiplier;
        if (r.id === 'terrain_mobility') {
            const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function'
                ? global.getBiomeLiquidPlayerEffectV631(enemy)
                : null;
            if (liquid?.liquidId === 'sea') return r.waterSpeedMultiplier;
        }
        return 1;
    }

    function getEnvironmentalMovementMultiplier(enemy) {
        const r = rule(enemy);
        if (r?.ignoreEnvironmentalMovement) return 1;
        let multiplier = 1;
        const material = typeof global.getMaterialMovementModifiersV67 === 'function'
            ? global.getMaterialMovementModifiersV67(enemy)
            : null;
        if (material) multiplier *= Math.max(0.35, Number(material.speedMultiplier) || 1);
        const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function'
            ? global.getBiomeLiquidPlayerEffectV631(enemy)
            : null;
        if (liquid?.playerSpeed) {
            multiplier *= Math.max(0.35, Number(liquid.playerSpeed) || 1);
            if (r?.id === 'lava_immunity' && liquid.liquidId === 'lava') {
                multiplier /= Math.max(0.35, Number(liquid.playerSpeed) || 1);
                multiplier *= r.lavaSpeedMultiplier;
            }
        }
        return multiplier;
    }

    function getVisionRangeTiles(enemy) {
        const r = rule(enemy);
        if (r?.id === 'leaf_camouflage' && isLeafCover(enemy)) return Math.max(1, 9 + r.coveredVisionTiles);
        if (r?.id === 'dark_vision') return 9 + r.visionBonusTiles;
        return 9;
    }

    function getEffectDurationMultiplier(enemy, effectId) {
        const r = rule(enemy);
        if (r?.id === 'ice_resistance' && String(effectId) === 'frost') return r.frostDurationMultiplier;
        if (r?.id === 'heat_resistance' && String(effectId) === 'heat') return r.heatDurationMultiplier;
        return 1;
    }

    function isInVegetation(enemy) {
        if (!enemy || currentBiomeId(enemy) !== 'spring') return false;
        const cell = typeof global.gridCurrentTile === 'function' ? global.gridCurrentTile(enemy, 'enemy') : null;
        const state = stateObject();
        if (!cell || !state.grid) return false;
        const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
        return dirs.some(([dx, dy]) => state.grid[cell.y + dy]?.[cell.x + dx] === global.TYPES?.BLOCK);
    }

    function updateVegetationRegen(enemy, dt) {
        const r = rule(enemy);
        if (r?.id !== 'vegetation_regen' || !isInVegetation(enemy)) return;
        if (!Number.isFinite(Number(enemy.__effectHealthV64))) return;
        enemy.__speciesRegenAccumulatorV626 = Math.max(0, Number(enemy.__speciesRegenAccumulatorV626) || 0)
            + Math.max(0, Number(dt) || 0) / 1000 * r.regenPerSecond;
        if (enemy.__speciesRegenAccumulatorV626 < 1) return;
        enemy.__effectHealthV64 = Math.min(
            r.regenMax,
            Number(enemy.__effectHealthV64) + enemy.__speciesRegenAccumulatorV626
        );
        enemy.__speciesRegenAccumulatorV626 = 0;
    }

    function getPushMultiplier(enemy) {
        return rule(enemy)?.id === 'stability' ? RULES.stability.pushMultiplier : 1;
    }

    function getSpeciesTableV626() {
        const result = {};
        for (const biomeId of BIOME_IDS) {
            result[biomeId] = {};
            for (const typeKey of TYPE_KEYS) {
                result[biomeId][typeKey] = Object.freeze({
                    ...getSpeciesDefinitionV626(biomeId, typeKey)
                });
            }
        }
        return Object.freeze(result);
    }

    global.BIOME_ENEMY_SPECIES_RULES_V615 = RULES;
    global.BIOME_ENEMY_SPECIES_CATALOG_V626 = getSpeciesTableV626();
    global.getEnemyBiomeSpeciesProfileV615 = getProfile;
    global.getEnemyBiomeSpeciesProfileV626 = getProfile;
    global.getEnemyBiomeSpeciesDefinitionV626 = getSpeciesDefinitionV626;
    global.getEnemyBiomeSpeciesRuleV615 = rule;
    global.getEnemyBiomeSpeciesRuleIdV615 = ruleId;
    global.getEnemyBiomeSpeciesMovementMultiplierV615 = getMovementMultiplier;
    global.getEnemyBiomeSpeciesEnvironmentMovementMultiplierV615 = getEnvironmentalMovementMultiplier;
    global.getEnemyBiomeSpeciesVisionRangeV615 = getVisionRangeTiles;
    global.getEnemyBiomeSpeciesEffectDurationMultiplierV615 = getEffectDurationMultiplier;
    global.getEnemyBiomeSpeciesPushMultiplierV615 = getPushMultiplier;
    global.updateEnemyBiomeSpeciesV615 = updateVegetationRegen;
    global.isEnemyBiomeSpeciesLeafCoverV615 = isLeafCover;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEnemySpecies = getProfile;
    global.BOMBER_ENGINE.getEnemySpeciesRules = () => ({ ...RULES });
    global.BOMBER_ENGINE.getEnemySpeciesTable = getSpeciesTableV626;
})(window);

;
// === js/45-biome-living.js ===
// Bomberman Roguelike v6.20.0 — Biomas vivos.
// Una capa común: cada bioma modifica una regla sistémica sin crear una IA paralela.
(function installLivingBiomesV620(global) {
    'use strict';

    const RULES = Object.freeze({
        winter: Object.freeze({ id:'winter', label:'Frío e hielo', playerSpeed:0.90, bombFuseRate:0.78, bombMotion:0.90 }),
        autumn: Object.freeze({ id:'autumn', label:'Hojas y ocultamiento', leafCover:true }),
        spring: Object.freeze({ id:'spring', label:'Vegetación regenerativa', vegetationRegen:0.35 }),
        summer: Object.freeze({ id:'summer', label:'Calor', playerSpeed:0.96, bombFuseRate:1.10 }),
        underground: Object.freeze({ id:'underground', label:'Oscuridad', darkVision:false, playerVisionRadius:5 }),
        clouds: Object.freeze({ id:'clouds', label:'Viento y flotación', windStrength:0.34, bombWind:0.45 }),
        mountains: Object.freeze({ id:'mountains', label:'Empuje y estabilidad', windStrength:0.22, pushResistance:0.40 }),
        beach: Object.freeze({ id:'beach', label:'Agua y arena', sandSpeed:0.92, waterSpeed:0.88, bombWaterSlow:1.28 }),
        space: Object.freeze({ id:'space', label:'Ausencia de penalización terrestre', ignoreTerrainPenalty:true }),
        sky: Object.freeze({ id:'sky', label:'Altura y velocidad', altitudeSpeed:1.10, altitudeRatio:0.34 }),
        inferno: Object.freeze({ id:'inferno', label:'Lava y calor', playerSpeed:0.90, bombFuseRate:1.15, lavaDetonation:true })
    });

    function biomeId() {
        return String(global.gameState?.biomeOverrideV49 || global.gameState?.biomeV49?.id || global.getThemeV46?.()?.id || 'classic');
    }
    function rule() { return RULES[biomeId()] || null; }

    function tileOf(entity) {
        if (!entity) return null;
        if (typeof global.gridCurrentTile === 'function') return global.gridCurrentTile(entity, 'environment');
        const size = Number(global.TILE_SIZE || 48);
        return { x:Math.floor((Number(entity.x) + Number(entity.width || 0) / 2) / size), y:Math.floor((Number(entity.y) + Number(entity.height || 0) / 2) / size) };
    }

    function hasLiquid(entity, id = null) {
        const t = tileOf(entity);
        if (!t || typeof global.hasLiquidTileV631 !== 'function') return false;
        if (!global.hasLiquidTileV631(t.x, t.y)) return false;
        const cfg = typeof global.getLiquidKindV631 === 'function' ? global.getLiquidKindV631() : null;
        return !id || cfg?.id === id;
    }

    function isFoliage(entity) {
        if (biomeId() !== 'autumn' || !global.gameState?.grid) return false;
        const t = tileOf(entity);
        if (!t) return false;
        const g = global.gameState.grid;
        return [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => g[t.y+dy]?.[t.x+dx] === global.TYPES?.BLOCK);
    }

    function isHighAltitude(entity) {
        if (biomeId() !== 'sky') return false;
        const h = Math.max(1, Number(global.gameState?.gridHeight) || 1);
        const t = tileOf(entity);
        return !!t && t.y <= Math.max(1, h * RULES.sky.altitudeRatio);
    }

    function getPlayerMovementMultiplier(player) {
        const r = rule();
        if (!r) return 1;
        if (r.id === 'winter' || r.id === 'summer' || r.id === 'inferno') return r.playerSpeed;
        if (r.id === 'beach') return hasLiquid(player, 'sea') ? 1.12 : r.sandSpeed;
        if (r.id === 'space') return 1;
        if (r.id === 'sky' && isHighAltitude(player)) return r.altitudeSpeed;
        return 1;
    }

    function getEnemyMovementMultiplier(enemy) {
        const r = rule();
        if (!r) return 1;
        if (r.id === 'winter') return 0.96;
        if (r.id === 'summer' || r.id === 'inferno') return 1.02;
        if (r.id === 'clouds') return 1.03;
        if (r.id === 'beach') return hasLiquid(enemy, 'sea') ? 1.08 : 1;
        if (r.id === 'sky' && isHighAltitude(enemy)) return r.altitudeSpeed;
        return 1;
    }

    function getEnemyVisionRange(enemy) {
        const r = rule();
        if (!r || r.id !== 'underground') return null;
        if (typeof global.getEnemyBiomeSpeciesVisionRangeV615 === 'function') {
            const species = global.getEnemyBiomeSpeciesVisionRangeV615(enemy);
            return species;
        }
        return r.playerVisionRadius;
    }

    function getBombModifiers(bomb) {
        const r = rule();
        if (!r) return { fuseRate:1, motionMultiplier:1, instant:false };
        let fuseRate = r.bombFuseRate || 1;
        let motionMultiplier = r.bombMotion || 1;
        if (r.id === 'beach' && hasLiquid(bomb, 'sea')) motionMultiplier *= r.bombWaterSlow;
        if (r.id === 'clouds') motionMultiplier *= 1 / Math.max(0.4, 1 + r.bombWind * 0.15);
        return { fuseRate, motionMultiplier, instant:!!r.lavaDetonation && hasLiquid(bomb, 'lava') };
    }

    function getEnvironmentMovementMultiplier(entity) {
        const r = rule();
        if (!r) return 1;
        if (r.id === 'space') {
            let compensation = 1;
            const material = typeof global.getMaterialMovementModifiersV67 === 'function' ? global.getMaterialMovementModifiersV67(entity) : null;
            if (material?.speedMultiplier) compensation /= Math.max(0.35, Number(material.speedMultiplier) || 1);
            const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function' ? global.getBiomeLiquidPlayerEffectV631(entity) : null;
            if (liquid?.playerSpeed) compensation /= Math.max(0.35, Number(liquid.playerSpeed) || 1);
            return Math.min(2.2, compensation);
        }
        return 1;
    }

    function applyWind(entity, dt, strength = 1) {
        const r = rule();
        if (!r || !r.windStrength || !entity || entity._tileMoveActive) return;
        const frame = Math.max(0, Number(dt) || 0) / 16.6667;
        const phase = Math.sin((Number(global.gameState?.animFrame) || 0) * 0.035 + (Number(entity.x) || 0) * 0.012);
        const dir = phase >= 0 ? 1 : -1;
        entity.__biomeWindPushV620 = dir * r.windStrength * strength * frame;
    }

    function update(dt) {
        const state = global.gameState;
        if (!state?.isPlaying || state.paused) return;
        const r = rule();
        if (!r) return;
        if (r.id === 'spring') {
            for (const enemy of state.enemies || []) {
                if (!isFoliage(enemy)) continue;
                const maxHp = Math.max(1, Number(enemy.__effectHealthV64) || 3);
                enemy.__effectHealthV64 = Math.min(maxHp, maxHp + r.vegetationRegen * Math.max(0, Number(dt) || 0) / 1000);
            }
        }
        if (r.id === 'clouds' || r.id === 'mountains') {
            applyWind(global.player, dt, 1);
            for (const enemy of state.enemies || []) applyWind(enemy, dt, 0.65);
            for (const bomb of state.bombs || []) applyWind(bomb, dt, r.id === 'clouds' ? 1.25 : 0.7);
        }
    }

    function drawOverlay(ctx, width, height) {
        const r = rule();
        if (!r || !ctx) return;
        ctx.save();
        if (r.id === 'underground') {
            const grd = ctx.createRadialGradient(width/2, height/2, Math.min(width,height)*0.16, width/2, height/2, Math.max(width,height)*0.72);
            grd.addColorStop(0, 'rgba(0,0,0,0)');
            grd.addColorStop(1, 'rgba(0,0,0,0.48)');
            ctx.fillStyle = grd; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'winter') {
            ctx.fillStyle = 'rgba(220,245,255,0.045)'; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'summer' || r.id === 'inferno') {
            ctx.fillStyle = r.id === 'inferno' ? 'rgba(255,70,20,0.045)' : 'rgba(255,190,80,0.035)'; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'clouds' || r.id === 'mountains') {
            ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
            const offset = (Number(global.gameState?.animFrame) || 0) % 24;
            for (let y = 20 - offset; y < height; y += 34) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y-7); ctx.stroke(); }
        } else if (r.id === 'autumn') {
            ctx.fillStyle = 'rgba(190,120,45,0.025)'; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'sky') {
            ctx.fillStyle = 'rgba(190,220,255,0.025)'; ctx.fillRect(0,0,width,height);
        }
        ctx.restore();
    }

    global.getLivingBiomeRuleV620 = rule;
    global.getLivingBiomePlayerMovementMultiplierV620 = getPlayerMovementMultiplier;
    global.getLivingBiomeEnemyMovementMultiplierV620 = getEnemyMovementMultiplier;
    global.getLivingBiomeEnemyVisionRangeV620 = getEnemyVisionRange;
    global.getLivingBiomeBombModifiersV620 = getBombModifiers;
    global.getLivingBiomeEnvironmentMovementMultiplierV620 = getEnvironmentMovementMultiplier;
    global.updateLivingBiomeV620 = update;
    global.drawLivingBiomeOverlayV620 = drawOverlay;
    global.isLivingBiomeFoliageV620 = isFoliage;
    global.BIOME_LIVING_RULES_V620 = RULES;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getLivingBiomeRule = rule;
})(window);

;
// === js/44-god-mode.js ===
// Bomberman Roguelike v6.30.3 — God Mode de desarrollo con inmunidad central.
(function installGodModeV6303(global){
    'use strict';

    const state = { enabled: false };

    function getPlayer(){ return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }
    function getGameState(){ return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }

    function syncRuntimeFlags(enabled){
        const active = !!enabled;
        const p = getPlayer();
        const gs = getGameState();
        if (gs) gs.godModeEnabled = active;
        if (p) {
            p.godModeEnabled = active;
            // God Mode usa la bandera visual ya existente sin borrar invulnerabilidad temporal.
            p.isInvincible = active || Number(p.invincibleTimer || 0) > 0;
        }
        const indicator = global.document?.getElementById('god-mode-indicator');
        if (indicator) {
            indicator.classList.toggle('hidden', !active);
            indicator.setAttribute('aria-hidden', active ? 'false' : 'true');
        }
    }

    function isGodModeActiveV616(){
        syncRuntimeFlags(state.enabled);
        return state.enabled;
    }

    function renderGodModeButton(){
        const button = global.document?.getElementById('btn-god-mode');
        const status = global.document?.getElementById('god-mode-status');
        if (button) {
            button.setAttribute('aria-pressed', state.enabled ? 'true' : 'false');
            button.textContent = state.enabled ? 'DESACTIVAR GOD MODE' : 'ACTIVAR GOD MODE';
            button.classList.toggle('is-active', state.enabled);
        }
        if (status) {
            status.textContent = state.enabled ? 'ON' : 'OFF';
            status.classList.toggle('is-active', state.enabled);
        }
        syncRuntimeFlags(state.enabled);
    }

    function setGodModeV616(enabled){
        state.enabled = !!enabled;
        renderGodModeButton();
        if (typeof global.sfx === 'function') global.sfx('click');
        if (typeof global.pushInformationFeedV61221 === 'function') {
            global.pushInformationFeedV61221(
                state.enabled ? 'GOD MODE ACTIVADO · DAÑO ANULADO' : 'GOD MODE DESACTIVADO',
                state.enabled ? '#86efac' : '#facc15'
            );
        }
        return state.enabled;
    }

    function toggleGodModeV616(){ return setGodModeV616(!state.enabled); }

    global.isGodModeActiveV616 = isGodModeActiveV616;
    global.setGodModeV616 = setGodModeV616;
    global.toggleGodModeV616 = toggleGodModeV616;

    const boot = () => {
        const button = global.document?.getElementById('btn-god-mode');
        if (button && !button.dataset.godModeBound) {
            button.addEventListener('click', toggleGodModeV616);
            button.dataset.godModeBound = 'true';
        }
        renderGodModeButton();
    };

    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
})(window);

;
// === js/45-enemy-spawn.js ===
// BOMBERMAN ROGUELIKE v6.26.0 — Autoridad unificada de spawn de enemigos.
// Contexto único: bioma + etapa + sala + especie + arquetipo + IA.
(function installEnemySpawnAuthorityV626(global) {
    'use strict';

    const ROLE = Object.freeze({ GROUND: 'ground', FLYING: 'flying', SPECIAL: 'special' });
    const TYPE_BY_ROLE = Object.freeze({ ground: 'RASTRERO', flying: 'VOLADOR', special: 'ESPECIAL' });

    const STAGE_WEIGHTS = Object.freeze({
        1: Object.freeze({ ground: 1, flying: 0, special: 0 }),
        2: Object.freeze({ ground: 0.70, flying: 0.30, special: 0 }),
        3: Object.freeze({ ground: 0.48, flying: 0.27, special: 0.25 }),
        4: Object.freeze({ ground: 0.38, flying: 0.27, special: 0.35 })
    });

    const ROLE_BY_TYPE = Object.freeze({ RASTRERO: ROLE.GROUND, VOLADOR: ROLE.FLYING, ESPECIAL: ROLE.SPECIAL });
    const BIOMES = Object.freeze(['winter','autumn','spring','summer','underground','clouds','mountains','beach','space','sky','inferno']);

    function stateObject() {
        return (typeof gameState !== 'undefined' && gameState)
            ? gameState
            : (global.BOMBER_ENGINE?.getState?.() || {});
    }

    function safeNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function tileSizeV626() {
        return typeof TILE_SIZE !== 'undefined' ? Number(TILE_SIZE) || 48 : 48;
    }

    function currentBiomeId() {
        const state = stateObject();
        const override = state.biomeOverrideV49;
        if (BIOMES.includes(override)) return String(override);
        if (typeof global.getBiomeForDepthV49 === 'function') {
            const meta = global.getBiomeForDepthV49(state.level || 1);
            if (BIOMES.includes(meta?.id)) return String(meta.id);
        }
        const snapshot = state.biomeV49?.id;
        if (BIOMES.includes(snapshot)) return String(snapshot);
        return 'winter';
    }

    function currentStage() {
        const state = stateObject();
        if (typeof global.getBiomeStageV49 === 'function') {
            return Math.max(1, Math.min(4, Math.floor(safeNumber(global.getBiomeStageV49(state.level || 1), 1))));
        }
        const explicit = safeNumber(state.biomeV49?.stage, 0);
        if (explicit >= 1) return Math.max(1, Math.min(4, Math.floor(explicit)));
        return Math.max(1, Math.min(4, Math.ceil(Math.max(1, safeNumber(state.level, 1)) / 4)));
    }

    function stateLevel() {
        return safeNumber(stateObject().level, 1);
    }

    function roomId() {
        return String(stateObject().roomType?.id || 'STANDARD').toUpperCase();
    }

    function isBossRoomV626() {
        return roomId() === 'BOSS';
    }

    function getStageWeights(stage) {
        return STAGE_WEIGHTS[stage] || STAGE_WEIGHTS[4];
    }

    function applyRoomPressure(weights) {
        const out = { ...weights };
        const id = roomId();
        if (id === 'ELITE' || id === 'CURSED') {
            out.special *= 1.25;
            out.flying *= 1.10;
        } else if (id === 'TREASURE' || id === 'SHRINE') {
            out.special *= 0.80;
            out.flying *= 0.95;
        }
        return out;
    }

    function normalizeWeights(raw) {
        const entries = Object.entries(raw).filter(([, value]) => safeNumber(value) > 0);
        const total = entries.reduce((sum, [, value]) => sum + safeNumber(value), 0);
        if (!total) return [];
        return entries.map(([role, weight]) => ({ role, weight: safeNumber(weight) / total }));
    }

    function chooseWeightedRole(weights, roll = Math.random()) {
        let cursor = Math.max(0, Math.min(0.999999, safeNumber(roll, Math.random())));
        for (const item of weights) {
            cursor -= item.weight;
            if (cursor < 0) return item.role;
        }
        return weights.length ? weights[weights.length - 1].role : ROLE.GROUND;
    }

    function resolveRoleForIndex(index, count, stage) {
        const weights = normalizeWeights(applyRoomPressure(getStageWeights(stage)));
        const unlocked = new Set(weights.map(item => item.role));
        if (count >= 2 && index === 1 && unlocked.has(ROLE.FLYING)) return ROLE.FLYING;
        if (count >= 3 && index === 2 && unlocked.has(ROLE.SPECIAL)) return ROLE.SPECIAL;
        return chooseWeightedRole(weights, Math.random());
    }

    function getSpeciesCatalog() {
        return global.BIOME_ENEMY_SPECIES_CATALOG_V626 || {};
    }

    function getSpeciesForRole(biomeId, role, roll = Math.random()) {
        const typeKey = TYPE_BY_ROLE[role] || TYPE_BY_ROLE.ground;
        const species = getSpeciesCatalog()?.[biomeId]?.[typeKey];
        return species || null;
    }

    function getBehaviorFromSpecies(species, type, level, roll) {
        const requested = species?.preferredAi;
        const table = global.ENEMY_BEHAVIORS_V324 || {};
        if (requested) {
            const behavior = Object.values(table).find(profile => profile?.id === requested);
            if (behavior) return behavior;
        }
        return typeof global.pickEnemyBehaviorV324 === 'function'
            ? global.pickEnemyBehaviorV324(type, level, 0, roll)
            : null;
    }

    function resolveEnemySpawnSpecV626(options = {}) {
        const biomeId = BIOMES.includes(options.biomeId) ? options.biomeId : currentBiomeId();
        const stage = Math.max(1, Math.min(4, Math.floor(safeNumber(options.stage, currentStage()))));
        const count = Math.max(1, Math.floor(safeNumber(options.count, 1)));
        const index = Math.max(0, Math.floor(safeNumber(options.index, 0)));
        const forcedRole = options.forceRole && ROLE_BY_TYPE[options.forceRole] ? ROLE_BY_TYPE[options.forceRole] : options.forceRole;
        const role = Object.values(ROLE).includes(forcedRole) ? forcedRole : resolveRoleForIndex(index, count, stage);
        const typeKey = TYPE_BY_ROLE[role] || 'RASTRERO';
        const species = getSpeciesForRole(biomeId, role, options.roll);
        if (!species) return null;
        const typeMap = (typeof ENEMY_TYPES !== 'undefined' && ENEMY_TYPES) ? ENEMY_TYPES : {};
        const type = typeMap[typeKey] || typeMap.RASTRERO;
        const behavior = getBehaviorFromSpecies(species, type, stateLevel(), safeNumber(options.behaviorRoll, Math.random()));
        return Object.freeze({
            biomeId,
            stage,
            role,
            archetype: typeKey,
            typeKey,
            type,
            speciesId: species?.id || `${biomeId}_${typeKey.toLowerCase()}`,
            speciesName: species?.name || type?.name || typeKey,
            speciesRuleId: species?.ruleId || 'none',
            abilityId: species?.abilityId || null,
            preferredAi: species?.preferredAi || behavior?.id || null,
            behaviorId: behavior?.id || null,
            behaviorLabel: behavior?.label || null
        });
    }

    function buildEnemySpawnPlanV626(count = 1, options = {}) {
        if (isBossRoomV626()) return [];
        const safeCount = Math.max(0, Math.floor(safeNumber(count, 0)));
        const result = [];
        for (let i = 0; i < safeCount; i++) {
            result.push(resolveEnemySpawnSpecV626({ ...options, count: safeCount, index: i }));
        }
        return result;
    }

    function getEnemySpawnCapV626() {
        const configured = typeof global.getDifficultyEnemySpawnCapV619 === 'function'
            ? global.getDifficultyEnemySpawnCapV619(stateLevel())
            : Math.min(12, 2 + Math.max(1, Math.floor(stateLevel())));
        return Math.max(1, Math.floor(safeNumber(configured, 3)));
    }

    function canSpawnEnemyV626(requested = 1) {
        const current = Array.isArray(stateObject().enemies) ? stateObject().enemies.length : 0;
        return Math.max(0, Math.min(Math.floor(safeNumber(requested, 0)), getEnemySpawnCapV626() - current));
    }

    function makeEnemyEntityV626(position, spec, options = {}) {
        const state = stateObject();
        if (isBossRoomV626() || !spec?.type || !state) return null;
        const diff = state.difficulty || (typeof global.getDifficultyV323 === 'function' ? global.getDifficultyV323(state.level) : null);
        const roomMult = safeNumber(state.roomType?.enemySpeedMult, 1);
        const difficultyMult = safeNumber(diff?.enemySpeedMult, 1);
        const type = spec.type;
        const baseSpeed = typeof global.getEnemyBaseSpeedV610 === 'function'
            ? global.getEnemyBaseSpeedV610(type)
            : safeNumber(type.speed, 1) * roomMult * difficultyMult;
        const behaviorTable = global.ENEMY_BEHAVIORS_V324 || {};
        const behavior = spec.behaviorId ? Object.values(behaviorTable).find(profile => profile?.id === spec.behaviorId) : null;
        const movementMultiplier = behavior?.speedMultiplier || 1;
        const speed = baseSpeed * movementMultiplier;
        const initialDirection = ['up','down','left','right'].includes(options.direction) ? options.direction : 'down';
        const vx = initialDirection === 'left' ? -speed : initialDirection === 'right' ? speed : 0;
        const vy = initialDirection === 'up' ? -speed : initialDirection === 'down' ? speed : 0;
        const speciesProfile = typeof global.getEnemyBiomeSpeciesProfileV626 === 'function'
            ? global.getEnemyBiomeSpeciesProfileV626({ type, biomeSpawnIdV626: spec.biomeId, speciesIdV626: spec.speciesId })
            : null;
        const eliteDefault = state.roomType?.id === 'ELITE'
            || state.roomType?.id === 'CURSED'
            || (safeNumber(diff?.eliteBonus) > 0 && Math.random() < safeNumber(diff?.eliteBonus));
        return {
            x: safeNumber(position?.x) * tileSizeV626() + tileSizeV626() / 2,
            y: safeNumber(position?.y) * tileSizeV626() + tileSizeV626() / 2,
            width: tileSizeV626() * 0.75,
            height: tileSizeV626() * 0.75,
            type,
            vx: options.randomizeVelocity === false ? vx : speed * (Math.random() < 0.5 ? 1 : -1),
            vy: 0,
            baseSpeed: baseSpeed,
            speed,
            changeTimer: options.changeTimer ?? Math.random() * 100,
            elite: options.elite ?? eliteDefault,
            lastDirection: initialDirection,
            __gridAnchor: 'center',
            desiredDirection: initialDirection,
            aiBehavior: spec.behaviorId || null,
            biomeSpawnIdV626: spec.biomeId,
            biomeStageV626: spec.stage,
            spawnRoleV626: spec.role,
            archetypeV626: spec.archetype || spec.typeKey,
            speciesIdV626: spec.speciesId,
            speciesNameV626: speciesProfile?.name || spec.speciesName || type.name,
            speciesRuleIdV626: speciesProfile?.ruleId || spec.speciesRuleId || 'none',
            abilityIdV630: spec.abilityId || speciesProfile?.abilityId || null,
            preferredAiV626: spec.preferredAi || spec.behaviorId || null,
            spawnedByV626: String(options.source || 'room')
        };
    }

    global.ENEMY_SPAWN_CATALOG_V626 = getSpeciesCatalog();
    global.ENEMY_SPAWN_ROLES_V626 = ROLE;
    global.resolveEnemySpawnSpecV626 = resolveEnemySpawnSpecV626;
    global.buildEnemySpawnPlanV626 = buildEnemySpawnPlanV626;
    global.getEnemySpawnCapV626 = getEnemySpawnCapV626;
    global.canSpawnEnemyV626 = canSpawnEnemyV626;
    global.makeEnemyEntityV626 = makeEnemyEntityV626;
    global.isBossRoomV626 = isBossRoomV626;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEnemySpawnCatalog = () => getSpeciesCatalog();
    global.BOMBER_ENGINE.getEnemySpawnPlan = (count = 1) => buildEnemySpawnPlanV626(count);
})(window);

;
// === js/46-rastreros.js ===
// BOMBERMAN ROGUELIKE v6.30.0 — Habilidades únicas de los once RASTRERO.
// Este módulo amplía las autoridades existentes de IA, movimiento, combate y Canvas.
// No crea una IA paralela ni utiliza gameState.grid para almacenar efectos temporales.
(function installRastreroAbilitiesV630(global) {
    'use strict';

    // Los efectos de suelo son overlays temporales: no sustituyen gameState.grid.
    // Se expone el tipo para que otros sistemas puedan identificar la casilla.
    const TILE_TYPES = Object.freeze({
        ...(global.TILE_TYPES && typeof global.TILE_TYPES === 'object' ? global.TILE_TYPES : {}),
        ICE_TRAIL: 'ICE_TRAIL'
    });
    global.TILE_TYPES = TILE_TYPES;

    const ICE_TRAIL_DURATION_MS = 2500;
    const FRICTION_ICE = 0.88;
    const ICE_MOMENTUM_STOP_THRESHOLD = 0.12;
    const ICE_COUNTER_STRENGTH = 0.55;

    const SPECIES_ABILITIES = Object.freeze({
        winter_ice_wolf: 'ice_trail',
        autumn_boar: 'boar_charge',
        spring_frog: 'frog_leap',
        summer_lizard: 'lizard_camouflage',
        underground_mole: 'mole_burrow',
        clouds_cloud_creature: 'cloud_ethereal',
        mountains_mountain_goat: 'goat_stomp',
        beach_crab: 'crab_shell',
        space_alien_insect: 'alien_acid',
        sky_celestial_being: 'cherub_aura',
        inferno_hellhound: 'hellhound_ember'
    });

    const DIRS = Object.freeze([
        Object.freeze({ x: 0, y: -1, name: 'up', axis: 'y', dir: -1 }),
        Object.freeze({ x: 0, y: 1, name: 'down', axis: 'y', dir: 1 }),
        Object.freeze({ x: -1, y: 0, name: 'left', axis: 'x', dir: -1 }),
        Object.freeze({ x: 1, y: 0, name: 'right', axis: 'x', dir: 1 })
    ]);

    const runtime = {
        clock: 0,
        frameScale: 1,
        roomKey: '',
        ice: new Map(),
        acid: new Map(),
        fire: new Map(),
        blastMeta: new Map(),
        pulseSerial: 0
    };

    function getState() {
        return global.BOMBER_ENGINE?.getState?.()
            || global.gameState
            || (typeof gameState !== 'undefined' ? gameState : null);
    }

    function getPlayer() {
        return global.BOMBER_ENGINE?.getPlayer?.()
            || global.player
            || (typeof player !== 'undefined' ? player : null);
    }

    function getTileSize() {
        return Number(global.BOMBER_ENGINE?.getTileSize?.() || global.TILE_SIZE || (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 48)) || 48;
    }

    function getTypes() {
        return global.BOMBER_ENGINE?.getWorldTypes?.()
            || global.TYPES
            || (typeof TYPES !== 'undefined' ? TYPES : {});
    }

    function getAbilityId(enemy) {
        if (!enemy) return null;
        return enemy.abilityIdV630 || SPECIES_ABILITIES[enemy.speciesIdV626] || null;
    }

    function isRastrero(enemy) {
        return !!getAbilityId(enemy);
    }

    function tileOf(entity, kind = null) {
        if (!entity) return { x: -1, y: -1 };
        const s = getState();
        const tile = getTileSize();
        const resolvedKind = kind || (entity.__gridAnchor === 'center' ? 'enemy' : 'player');
        if (typeof global.gridCurrentTile === 'function') {
            try { return global.gridCurrentTile(entity, resolvedKind); } catch (_) {}
        }
        if (resolvedKind === 'player') {
            return { x: Math.floor((entity.x + entity.width / 2) / tile), y: Math.floor((entity.y + entity.height / 2) / tile) };
        }
        return { x: Math.floor(entity.x / tile), y: Math.floor(entity.y / tile) };
    }

    function tileKey(x, y) { return `${Math.floor(x)},${Math.floor(y)}`; }
    function isInside(x, y) {
        const s = getState();
        return !!s && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < s.gridWidth && y < s.gridHeight;
    }

    function roomKeyForState() {
        const s = getState();
        if (!s) return 'no-state';
        const biome = s.biomeOverrideV49 || s.biomeV49?.id || global.getBiomeForDepthV49?.(s.level || 1)?.id || 'unknown';
        return `${s.level || 1}:${s.roomType?.id || 'unknown'}:${biome}:${s.gridWidth || 0}x${s.gridHeight || 0}`;
    }

    function ensureRoomState() {
        const key = roomKeyForState();
        if (runtime.roomKey === key) return;
        runtime.roomKey = key;
        runtime.ice.clear();
        runtime.acid.clear();
        runtime.fire.clear();
        runtime.blastMeta.clear();
        const p = getPlayer();
        if (p) {
            p.__rastreroSlowTimerV630 = 0;
            p.__rastreroAcidLastTileV630 = null;
            p.__rastreroIceMomentumV630 = null;
            p.__rastreroIceCoastingV630 = false;
            p.__rastreroIceSurfaceActiveV630 = false;
        }
    }

    function addTimedTile(map, x, y, durationMs, kind) {
        const s = getState();
        if (!s || !isInside(x, y)) return;
        const key = tileKey(x, y);
        map.set(key, {
            x, y,
            kind,
            createdAt: runtime.clock,
            durationMs,
            expiresAt: runtime.clock + durationMs
        });
    }

    function effectAt(map, x, y) {
        const effect = map.get(tileKey(x, y));
        return effect && effect.expiresAt > runtime.clock ? effect : null;
    }

    function cleanupEffects() {
        for (const map of [runtime.ice, runtime.acid, runtime.fire]) {
            for (const [key, effect] of map) {
                if (!effect || effect.expiresAt <= runtime.clock) map.delete(key);
            }
        }
        for (const [id, meta] of runtime.blastMeta) {
            if (runtime.clock - meta.createdAt > 8000) runtime.blastMeta.delete(id);
        }
    }

    function resetTransientStateV630() {
        runtime.roomKey = '';
        runtime.clock = 0;
        runtime.pulseSerial = 0;
        runtime.ice.clear();
        runtime.acid.clear();
        runtime.fire.clear();
        runtime.blastMeta.clear();
        const p = getPlayer();
        if (p) {
            p.__rastreroSlowTimerV630 = 0;
            p.__rastreroAcidLastTileV630 = null;
            p.__rastreroIceMomentumV630 = null;
            p.__rastreroIceCoastingV630 = false;
            p.__rastreroIceSurfaceActiveV630 = false;
        }
    }

    function installLevelResetHook() {
        const baseInitLevel = global.initLevel;
        if (typeof baseInitLevel !== 'function' || baseInitLevel.__rastreroV630ResetWrapped) return;
        const wrappedInitLevel = function initLevelWithRastreroResetV630(...args) {
            // Los efectos del nivel anterior nunca se arrastran a otro mapa/run,
            // incluso si la nueva sala reutiliza profundidad y dimensiones.
            resetTransientStateV630();
            const result = baseInitLevel.apply(this, args);
            runtime.roomKey = '';
            return result;
        };
        wrappedInitLevel.__rastreroV630ResetWrapped = true;
        global.initLevel = wrappedInitLevel;
    }

    function ensureEnemyState(enemy) {
        if (!enemy || !isRastrero(enemy)) return null;
        if (!enemy.__rastreroV630) {
            enemy.__rastreroV630 = {
                lastTile: null,
                lastBlastId: null,
                shellIntact: getAbilityId(enemy) === 'crab_shell',
                chargeState: 'idle',
                chargeCooldownMs: 1400 + Math.random() * 1000,
                chargeTelegraphMs: 0,
                chargeTravelTiles: 0,
                chargeDirection: null,
                chargeRecoverMs: 0,
                chargeStepOrigin: null,
                frogJumpCooldownMs: 2100 + Math.random() * 1200,
                frogJumpMs: 0,
                frogJumpDurationMs: 280,
                frogJumpFrom: null,
                frogJumpTo: null,
                moleBuriedMs: 0,
                moleSavedBlastId: null,
                goatCooldownMs: 2000 + Math.random() * 1100,
                goatTelegraphMs: 0,
                goatEffectMs: 0,
                cherubCooldownMs: 4350,
                cherubTelegraphMs: 0,
                cherubPulseMs: 0,
                hellhoundBoostMs: 0
            };
        }
        const a = enemy.__rastreroV630;
        if (!a.lastTile) a.lastTile = tileOf(enemy, 'enemy');
        return a;
    }

    function isEnemyBuried(enemy) {
        return Number(enemy?.__rastreroV630?.moleBuriedMs || 0) > 0;
    }

    function isTileSolid(x, y) {
        if (!isInside(x, y)) return true;
        const s = getState();
        const types = getTypes();
        const value = s.grid?.[y]?.[x];
        return value === types.WALL || value === types.BLOCK;
    }

    function bombAt(x, y, ignoredBomb = null) {
        const s = getState();
        return s?.bombs?.find(b => b && b !== ignoredBomb && b.x === x && b.y === y && b.state !== 'moving' && b.state !== 'carried') || null;
    }

    function explosionAt(x, y) {
        const s = getState();
        return !!s?.explosions?.some(exp => exp && exp.x === x && exp.y === y);
    }

    function entityAt(x, y, ignoredEntity = null) {
        const s = getState();
        const p = getPlayer();
        if (p && p !== ignoredEntity) {
            const pt = tileOf(p, 'player');
            if (pt.x === x && pt.y === y) return true;
        }
        for (const enemy of s?.enemies || []) {
            if (!enemy || enemy === ignoredEntity || isEnemyBuried(enemy)) continue;
            const et = tileOf(enemy, 'enemy');
            if (et.x === x && et.y === y) return true;
        }
        return false;
    }

    function isSafeTile(x, y, ignoredEntity = null, ignoredBomb = null) {
        const s = getState();
        if (!s || !isInside(x, y) || isTileSolid(x, y)) return false;
        const types = getTypes();
        const tileValue = s.grid?.[y]?.[x];
        if (tileValue === types.EXIT_LOCKED) return false;
        if (bombAt(x, y, ignoredBomb) || explosionAt(x, y) || entityAt(x, y, ignoredEntity)) return false;
        return true;
    }

    function isCenteredOnTile(entity) {
        if (!entity || entity._tileMoveActive) return false;
        if (typeof global.gridIsNearTileCenter === 'function') return global.gridIsNearTileCenter(entity, 1.5);
        const t = tileOf(entity, 'enemy');
        const size = getTileSize();
        return Math.abs(entity.x - (t.x + 0.5) * size) < 1.5 && Math.abs(entity.y - (t.y + 0.5) * size) < 1.5;
    }

    function tileDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function lineClear(a, b) {
        if (a.x !== b.x && a.y !== b.y) return false;
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        let x = a.x + dx, y = a.y + dy;
        while (x !== b.x || y !== b.y) {
            if (isTileSolid(x, y)) return false;
            x += dx; y += dy;
        }
        return true;
    }

    function tileHasCover(enemy) {
        const tile = tileOf(enemy, 'enemy');
        return DIRS.some(dir => isTileSolid(tile.x + dir.x, tile.y + dir.y));
    }

    function isLizardCamouflaged(enemy) {
        if (getAbilityId(enemy) !== 'lizard_camouflage' || !tileHasCover(enemy)) return false;
        const eTile = tileOf(enemy, 'enemy');
        const pTile = tileOf(getPlayer(), 'player');
        if (tileDistance(eTile, pTile) <= 2) return false;
        const sharesOpenCorridor = (eTile.x === pTile.x || eTile.y === pTile.y) && lineClear(eTile, pTile);
        return !sharesOpenCorridor;
    }

    function getPlayerSpeedFactor(entity) {
        const p = entity || getPlayer();
        if (!p) return 1;
        let factor = Number(p.__rastreroSlowTimerV630 || 0) > 0 ? 0.50 : 1;
        // Al soltar controles sobre hielo, la fuerza de inercia cae con FRICTION_ICE.
        // El límite inferior solo se aplica al tramo entre centros; nunca permite
        // atravesar paredes ni deja al jugador detenido en mitad de una casilla.
        if (p.__rastreroIceCoastingV630 && p.__rastreroIceSurfaceActiveV630) {
            const momentum = p.__rastreroIceMomentumV630;
            const strength = Math.max(0, Math.min(1, Number(momentum?.strength) || 0));
            factor *= Math.max(0.35, strength);
        }
        return Math.max(0.35, factor);
    }

    function applyPlayerSlow(durationMs = 800) {
        const p = getPlayer();
        if (!p) return;
        p.__rastreroSlowTimerV630 = Math.max(Number(p.__rastreroSlowTimerV630 || 0), durationMs);
    }

    function directionByName(name) {
        return DIRS.find(dir => dir.name === String(name || '').toLowerCase()) || null;
    }

    function directionFromInput(input) {
        if (!input?.axis || !Number(input.dir)) return null;
        return { axis: input.axis, dir: Number(input.dir) < 0 ? -1 : 1 };
    }

    function isIceTrailAt(x, y) {
        return !!effectAt(runtime.ice, x, y);
    }

    function isPlayerOnIceSurface(p) {
        if (!p) return false;
        const current = tileOf(p, 'player');
        if (isIceTrailAt(current.x, current.y)) return true;
        // Mantener la física durante el paso ya comprometido que sale de hielo,
        // pero no extenderla a la siguiente casilla una vez completado el paso.
        if (p._tileMoveActive && p.__rastreroIceSurfaceActiveV630) return true;
        if (p._tileMoveActive && Number.isInteger(p._tileMoveTargetGX) && Number.isInteger(p._tileMoveTargetGY)) {
            return isIceTrailAt(p._tileMoveTargetGX, p._tileMoveTargetGY);
        }
        return false;
    }

    function clearPlayerIceState(p, keepSurface = false) {
        if (!p) return;
        p.__rastreroIceMomentumV630 = null;
        p.__rastreroIceCoastingV630 = false;
        if (!keepSurface) p.__rastreroIceSurfaceActiveV630 = false;
    }

    function startPlayerIceMomentum(p, direction, strength = 1) {
        if (!p || !direction) return null;
        const momentum = {
            axis: direction.axis,
            dir: direction.dir < 0 ? -1 : 1,
            strength: Math.max(0, Math.min(1, Number(strength) || 0))
        };
        p.__rastreroIceMomentumV630 = momentum;
        return momentum;
    }

    function getFrameScale() {
        const value = Number(runtime.frameScale);
        return Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
    }

    function installPlayerIceInertia() {
        const baseInput = global.getCardinalInput;
        if (typeof baseInput !== 'function' || baseInput.__rastreroV630InertiaWrapped) return;
        const wrapped = function getCardinalInputWithIceInertiaV630() {
            const input = baseInput();
            const p = getPlayer();
            if (!p) return input;

            const wasSurfaceActive = !!p.__rastreroIceSurfaceActiveV630;
            const onIce = isPlayerOnIceSurface(p);
            if (!onIce) {
                if (!p._tileMoveActive) clearPlayerIceState(p);
                return input;
            }
            p.__rastreroIceSurfaceActiveV630 = true;

            const requested = directionFromInput(input);
            let momentum = p.__rastreroIceMomentumV630;
            const frameScale = getFrameScale();

            if (requested) {
                if (!momentum || Number(momentum.strength) <= 0) {
                    momentum = startPlayerIceMomentum(p, requested, 1);
                } else {
                    const sameDirection = momentum.axis === requested.axis && momentum.dir === requested.dir;
                    if (sameDirection) {
                        momentum.strength = Math.min(1, Math.max(0, Number(momentum.strength) || 0) + 0.16 * frameScale);
                    } else {
                        // El nuevo input sí puede girar o invertir la marcha. La fuerza
                        // de control reduce el impulso previo en vez de bloquear el eje.
                        const redirectedStrength = Math.max(0.30, Math.min(0.72,
                            Math.max(0, Number(momentum.strength) || 0) * ICE_COUNTER_STRENGTH));
                        momentum = startPlayerIceMomentum(p, requested, redirectedStrength);
                    }
                }
                p.__rastreroIceCoastingV630 = false;
                return input;
            }

            // Sin input, el impulso conserva la última dirección y pierde un 12 %
            // por frame (ajustado por dt). Al caer bajo el umbral, no se inicia otro
            // tile; el tramo ya iniciado siempre termina en un centro de casilla.
            if (!momentum) {
                // Solo la primera entrada a hielo infiere la dirección anterior. Si la
                // inercia ya se agotó, el estado de fuerza 0 evita reiniciar el impulso.
                const previousDirection = directionByName(p.dir || p.lastDirection);
                if (onIce && !wasSurfaceActive && previousDirection) {
                    momentum = startPlayerIceMomentum(p, previousDirection, 1);
                } else {
                    p.__rastreroIceCoastingV630 = true;
                    return { axis: null, dir: 0 };
                }
            }

            momentum.strength = Math.max(0, Math.min(1, Number(momentum.strength) || 0))
                * Math.pow(FRICTION_ICE, frameScale);
            p.__rastreroIceCoastingV630 = true;
            if (momentum.strength <= ICE_MOMENTUM_STOP_THRESHOLD) {
                momentum.strength = 0;
                return { axis: null, dir: 0 };
            }
            return { axis: momentum.axis, dir: momentum.dir };
        };
        wrapped.__rastreroV630InertiaWrapped = true;
        global.getCardinalInput = wrapped;
    }

    function onPlayerTileArrivedV630(p) {
        if (!p) return;
        const tile = tileOf(p, 'player');
        if (isIceTrailAt(tile.x, tile.y)) {
            p.__rastreroIceSurfaceActiveV630 = true;
            if (!p.__rastreroIceMomentumV630) {
                const direction = directionByName(p.dir || p.lastDirection);
                if (direction) startPlayerIceMomentum(p, direction, 1);
            }
            return;
        }
        clearPlayerIceState(p);
    }

    function onPlayerIceMoveBlockedV630(p) {
        if (!p) return;
        const tile = tileOf(p, 'player');
        // Si una pared o bomba corta el deslizamiento, se cancela el impulso para
        // no insistir en una casilla bloqueada cada frame. El control activo puede
        // iniciar un nuevo movimiento de manera normal.
        const stillOnIce = isIceTrailAt(tile.x, tile.y);
        clearPlayerIceState(p, stillOnIce);
        if (stillOnIce) {
            p.__rastreroIceSurfaceActiveV630 = true;
            p.__rastreroIceMomentumV630 = { axis: 'x', dir: 1, strength: 0 };
            p.__rastreroIceCoastingV630 = true;
        }
    }

    function startBoarCharge(enemy, a, direction, playerDistance) {
        a.chargeState = 'telegraph';
        a.chargeDirection = { x: direction.x, y: direction.y, name: direction.name };
        a.chargeTelegraphMs = 650;
        a.chargeTravelTiles = 0;
        a.chargeCooldownMs = Math.max(a.chargeCooldownMs, 4000);
        enemy.__rastreroBoarTelegraphV630 = true;
        if (typeof global.addFloatingText === 'function') {
            global.addFloatingText('¡CARGA!', enemy.x, enemy.y - enemy.height * 0.65, '#fb923c');
        }
    }

    function findBoarChargeDirection(enemy) {
        const p = getPlayer();
        if (!p) return null;
        const et = tileOf(enemy, 'enemy');
        const pt = tileOf(p, 'player');
        const distance = tileDistance(et, pt);
        if (distance < 2 || distance > 6) return null;
        if (et.x === pt.x && et.y !== pt.y && lineClear(et, pt)) {
            return { x: 0, y: Math.sign(pt.y - et.y), name: pt.y < et.y ? 'up' : 'down' };
        }
        if (et.y === pt.y && et.x !== pt.x && lineClear(et, pt)) {
            return { x: Math.sign(pt.x - et.x), y: 0, name: pt.x < et.x ? 'left' : 'right' };
        }
        return null;
    }

    function finishBoarCharge(enemy, a, recoverMs = 450) {
        a.chargeState = 'recover';
        a.chargeRecoverMs = recoverMs;
        a.chargeTelegraphMs = 0;
        a.chargeTravelTiles = 0;
        enemy.__rastreroBoarTelegraphV630 = false;
        enemy.vx = 0;
        enemy.vy = 0;
        if (enemy._tileMoveActive && a.chargeStepOrigin && typeof global.gridSnapEntityToTile === 'function') {
            global.gridSnapEntityToTile(enemy, a.chargeStepOrigin.x, a.chargeStepOrigin.y, 'enemy');
        }
        a.chargeStepOrigin = null;
        if (typeof global.gridResetTileMove === 'function') global.gridResetTileMove(enemy, true);
    }

    function canPlacePushedBombAt(x, y, bomb, boar) {
        if (!isInside(x, y) || isTileSolid(x, y) || bombAt(x, y, bomb) || explosionAt(x, y)) return false;
        return !entityAt(x, y, boar);
    }

    function pushPlayerBombTwoTiles(bomb, dir, boar) {
        const s = getState();
        const states = global.BOMB_V4_STATES || {};
        if (!bomb || bomb.owner !== 'player' || bomb.state !== states.ARMED || bomb.carriedBy) return false;
        if (typeof global.startBombV4Motion !== 'function') return false;
        const x1 = bomb.x + dir.x, y1 = bomb.y + dir.y;
        const x2 = bomb.x + dir.x * 2, y2 = bomb.y + dir.y * 2;
        if (!canPlacePushedBombAt(x1, y1, bomb, boar) || !canPlacePushedBombAt(x2, y2, bomb, boar)) return false;
        const tile = getTileSize();
        const oldQueue = Array.isArray(bomb.motionQueue) ? bomb.motionQueue.slice() : [];
        bomb.motionQueue = [{ x: x2, y: y2, durationMs: 190, arc: 1 }];
        const started = global.startBombV4Motion(bomb, (x1 + 0.5) * tile, (y1 + 0.5) * tile, 190, 1);
        if (!started) {
            bomb.motionQueue = oldQueue;
            return false;
        }
        bomb.interactionMotionV682 = 'boar-shove';
        bomb.interactionActorV682 = boar;
        bomb.playerPassThrough = true;
        if (typeof global.addParticles === 'function') global.addParticles((x1 + 0.5) * tile, (y1 + 0.5) * tile, '#fb923c', 5);
        return true;
    }

    function runBoarCharge(enemy, a, dt) {
        const s = getState();
        if (a.chargeState === 'telegraph' || a.chargeState === 'recover') {
            enemy.vx = 0;
            enemy.vy = 0;
            return true;
        }
        if (a.chargeState !== 'charging' || !s) return false;
        const dir = a.chargeDirection;
        if (!dir || typeof global.gridBeginTileMove !== 'function' || typeof global.gridAdvanceTileMove !== 'function') {
            finishBoarCharge(enemy, a);
            return true;
        }
        const tileNow = tileOf(enemy, 'enemy');
        if (!enemy._tileMoveActive) {
            const nx = tileNow.x + dir.x, ny = tileNow.y + dir.y;
            const bomb = bombAt(nx, ny);
            if (bomb) {
                pushPlayerBombTwoTiles(bomb, dir, enemy);
                finishBoarCharge(enemy, a, 600);
                return true;
            }
            if (isTileSolid(nx, ny) || !isInside(nx, ny)) {
                finishBoarCharge(enemy, a, 600);
                return true;
            }
            const started = global.gridBeginTileMove(enemy, nx, ny, {
                kind: 'enemy', canFly: false, ignoreBombs: false, allowCurrentBombTile: false
            });
            if (!started) {
                const blockerBomb = bombAt(nx, ny);
                if (blockerBomb) pushPlayerBombTwoTiles(blockerBomb, dir, enemy);
                finishBoarCharge(enemy, a, 600);
                return true;
            }
            a.chargeStepOrigin = { x: tileNow.x, y: tileNow.y };
            enemy.lastDirection = dir.name;
            enemy.vx = dir.x;
            enemy.vy = dir.y;
        }
        const baseSpeed = typeof global.getEnemyMovementSpeedV610 === 'function'
            ? global.getEnemyMovementSpeedV610(enemy)
            : Math.max(1, Number(enemy.baseSpeed || enemy.speed || 1));
        const result = global.gridAdvanceTileMove(enemy, Math.max(2, baseSpeed * 2.65), dt, {
            kind: 'enemy', canFly: false, ignoreBombs: false, allowCurrentBombTile: false
        });
        if (result.arrived) {
            a.chargeStepOrigin = null;
            a.chargeTravelTiles += 1;
            if (a.chargeTravelTiles >= 3) finishBoarCharge(enemy, a, 500);
        } else if (result.blocked) {
            finishBoarCharge(enemy, a, 600);
        }
        return true;
    }

    function tryStartFrogLeap(enemy, a) {
        if (a.frogJumpMs > 0 || a.frogJumpCooldownMs > 0 || !isCenteredOnTile(enemy)) return false;
        const tile = tileOf(enemy, 'enemy');
        const preferred = directionByName(enemy.ai?.direction || enemy.lastDirection);
        const ordered = preferred ? [preferred, ...DIRS.filter(dir => dir.name !== preferred.name)] : DIRS;
        const size = getTileSize();
        for (const dir of ordered) {
            const bx = tile.x + dir.x, by = tile.y + dir.y;
            const lx = tile.x + dir.x * 2, ly = tile.y + dir.y * 2;
            const types = getTypes();
            if (!isInside(bx, by) || getState().grid?.[by]?.[bx] !== types.BLOCK) continue;
            if (!isSafeTile(lx, ly, enemy)) continue;
            a.frogJumpFrom = { x: (tile.x + 0.5) * size, y: (tile.y + 0.5) * size };
            a.frogJumpTo = { x: (lx + 0.5) * size, y: (ly + 0.5) * size };
            a.frogJumpMs = a.frogJumpDurationMs;
            a.frogJumpCooldownMs = 4500;
            if (typeof global.gridResetTileMove === 'function') global.gridResetTileMove(enemy, true);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.__rastreroFrogJumpStartedV630 = runtime.clock;
            return true;
        }
        return false;
    }

    function advanceFrogLeap(enemy, a, dt) {
        if (!a.frogJumpFrom || !a.frogJumpTo || a.frogJumpMs <= 0) return false;
        a.frogJumpMs = Math.max(0, a.frogJumpMs - Math.max(0, Number(dt) || 0));
        const progress = 1 - a.frogJumpMs / Math.max(1, a.frogJumpDurationMs);
        enemy.x = a.frogJumpFrom.x + (a.frogJumpTo.x - a.frogJumpFrom.x) * progress;
        enemy.y = a.frogJumpFrom.y + (a.frogJumpTo.y - a.frogJumpFrom.y) * progress;
        enemy.vx = 0;
        enemy.vy = 0;
        if (a.frogJumpMs <= 0) {
            enemy.x = a.frogJumpTo.x;
            enemy.y = a.frogJumpTo.y;
            a.frogJumpFrom = null;
            a.frogJumpTo = null;
            enemy.__rastreroLastTileV630 = tileOf(enemy, 'enemy');
            if (typeof global.gridResetTileMove === 'function') global.gridResetTileMove(enemy, true);
        }
        return true;
    }

    function playerIsCorneredNear(enemy) {
        const p = getPlayer();
        if (!p) return false;
        const pt = tileOf(p, 'player');
        const et = tileOf(enemy, 'enemy');
        if (tileDistance(pt, et) > 2) return false;
        let blocked = 0;
        for (const dir of DIRS) {
            const x = pt.x + dir.x, y = pt.y + dir.y;
            if (!isInside(x, y) || isTileSolid(x, y) || bombAt(x, y)) blocked++;
        }
        return blocked >= 3;
    }

    function startGoatStomp(enemy, a) {
        if (a.goatCooldownMs > 0 || a.goatTelegraphMs > 0 || a.goatEffectMs > 0) return false;
        a.goatTelegraphMs = 600;
        a.goatCooldownMs = 7000;
        enemy.__rastreroGoatTelegraphV630 = true;
        return true;
    }

    function performGoatStomp(enemy, a) {
        a.goatEffectMs = 240;
        enemy.__rastreroGoatTelegraphV630 = false;
        const pt = tileOf(getPlayer(), 'player');
        const et = tileOf(enemy, 'enemy');
        if (Math.abs(pt.x - et.x) <= 1 && Math.abs(pt.y - et.y) <= 1) applyPlayerSlow(800);
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#c4b5a5', 9);
        if (typeof global.triggerScreenShake === 'function') global.triggerScreenShake(3, 130);
    }

    function triggerGoatStompOnHit(enemy, a) {
        // El impacto puede activarlo, pero siempre conserva el aviso previo.
        if (a.goatCooldownMs > 0 || a.goatTelegraphMs > 0) return;
        startGoatStomp(enemy, a);
    }

    function updateEnemyAbilityTimers(enemy, a, dt) {
        const delta = Math.max(0, Number(dt) || 0);
        if (a.chargeCooldownMs > 0) a.chargeCooldownMs = Math.max(0, a.chargeCooldownMs - delta);
        if (a.chargeRecoverMs > 0) {
            a.chargeRecoverMs = Math.max(0, a.chargeRecoverMs - delta);
            if (a.chargeRecoverMs <= 0 && a.chargeState === 'recover') a.chargeState = 'idle';
        }
        if (a.chargeState === 'telegraph') {
            a.chargeTelegraphMs = Math.max(0, a.chargeTelegraphMs - delta);
            if (a.chargeTelegraphMs <= 0) a.chargeState = 'charging';
        }
        if (a.frogJumpCooldownMs > 0) a.frogJumpCooldownMs = Math.max(0, a.frogJumpCooldownMs - delta);
        if (a.goatCooldownMs > 0) a.goatCooldownMs = Math.max(0, a.goatCooldownMs - delta);
        if (a.goatEffectMs > 0) a.goatEffectMs = Math.max(0, a.goatEffectMs - delta);
        if (a.goatTelegraphMs > 0) {
            a.goatTelegraphMs = Math.max(0, a.goatTelegraphMs - delta);
            if (a.goatTelegraphMs <= 0) performGoatStomp(enemy, a);
        }
        if (a.cherubPulseMs > 0) a.cherubPulseMs = Math.max(0, a.cherubPulseMs - delta);
        if (a.cherubTelegraphMs > 0) {
            a.cherubTelegraphMs = Math.max(0, a.cherubTelegraphMs - delta);
            if (a.cherubTelegraphMs <= 0) fireCherubPulse(enemy, a);
        } else {
            a.cherubCooldownMs = Math.max(0, a.cherubCooldownMs - delta);
            if (a.cherubCooldownMs <= 0) {
                a.cherubCooldownMs = 4350;
                a.cherubTelegraphMs = 650;
            }
        }
        if (a.hellhoundBoostMs > 0) a.hellhoundBoostMs = Math.max(0, a.hellhoundBoostMs - delta);

        if (a.moleBuriedMs > 0) {
            a.moleBuriedMs = Math.max(0, a.moleBuriedMs - delta);
            if (a.moleBuriedMs <= 0) emergeMole(enemy, a);
        }

        if (getAbilityId(enemy) === 'boar_charge' && a.chargeState === 'idle' && a.chargeCooldownMs <= 0 && isCenteredOnTile(enemy)) {
            const direction = findBoarChargeDirection(enemy);
            if (direction) startBoarCharge(enemy, a, direction, 0);
        }
        if (getAbilityId(enemy) === 'frog_leap') tryStartFrogLeap(enemy, a);
        if (getAbilityId(enemy) === 'goat_stomp' && a.goatCooldownMs <= 0 && a.goatTelegraphMs <= 0 && playerIsCorneredNear(enemy)) {
            startGoatStomp(enemy, a);
        }
    }

    function fireCherubPulse(enemy, a) {
        const s = getState();
        if (!s) return;
        a.cherubPulseMs = 300;
        runtime.pulseSerial++;
        const et = tileOf(enemy, 'enemy');
        const tile = getTileSize();
        let affected = 0;
        for (const bomb of s.bombs || []) {
            if (!bomb || bomb.owner !== 'player' || bomb.state === 'moving' || bomb.state === 'carried') continue;
            if (tileDistance(et, { x: bomb.x, y: bomb.y }) > 2) continue;
            const oldTimer = Number(bomb.timer);
            if (!Number.isFinite(oldTimer) || oldTimer <= 800) continue;
            bomb.timer = Math.max(800, oldTimer - 500);
            bomb.warnBucket = Math.ceil(bomb.timer / 300);
            bomb.__cherubLastPulseV630 = runtime.pulseSerial;
            affected++;
        }
        if (affected && typeof global.addFloatingText === 'function') {
            global.addFloatingText('AURA: MECHA ACELERADA', enemy.x, enemy.y - tile * 0.6, '#e9d5ff');
        }
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#c4b5fd', 5);
    }

    function emergeMole(enemy, a) {
        const tile = tileOf(enemy, 'enemy');
        const candidates = DIRS
            .map(dir => ({ x: tile.x + dir.x, y: tile.y + dir.y }))
            .filter(pos => isSafeTile(pos.x, pos.y, enemy));
        if (!candidates.length) {
            a.moleBuriedMs = 250;
            return false;
        }
        candidates.sort((one, two) => {
            const pTile = tileOf(getPlayer(), 'player');
            return tileDistance(two, pTile) - tileDistance(one, pTile);
        });
        const dest = candidates[0];
        if (typeof global.gridSnapEntityToTile === 'function') global.gridSnapEntityToTile(enemy, dest.x, dest.y, 'enemy');
        else {
            const size = getTileSize();
            enemy.x = (dest.x + 0.5) * size;
            enemy.y = (dest.y + 0.5) * size;
        }
        a.moleBuriedMs = 0;
        a.moleSavedBlastId = null;
        enemy.__rastreroLastTileV630 = dest;
        enemy._tileMoveActive = false;
        enemy.vx = 0;
        enemy.vy = 0;
        if (enemy.ai) {
            enemy.ai.wallPauseMs = 0;
            enemy.ai.wallPauseExpired = false;
            enemy.ai.stuckTimer = 0;
        }
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#b58a57', 6);
        return true;
    }

    function updateEnemyAIAbilities(dt) {
        const s = getState();
        if (!s || !s.isPlaying || s.paused) return;
        ensureRoomState();
        for (const enemy of s.enemies || []) {
            if (!enemy || !isRastrero(enemy)) continue;
            const a = ensureEnemyState(enemy);
            updateEnemyAbilityTimers(enemy, a, dt);
        }
    }

    function postEnemyAIMovement() {
        const s = getState();
        if (!s) return;
        for (const enemy of s.enemies || []) {
            if (!enemy || !isRastrero(enemy) || isEnemyBuried(enemy)) continue;
            const a = ensureEnemyState(enemy);
            // Los efectos se registran solo en centros de tile, nunca a mitad
            // de una interpolación entre casillas.
            if (enemy._tileMoveActive || !isCenteredOnTile(enemy)) continue;
            const current = tileOf(enemy, 'enemy');
            const previous = a.lastTile || current;
            if (previous.x !== current.x || previous.y !== current.y) {
                if (getAbilityId(enemy) === 'ice_trail') {
                    addTimedTile(runtime.ice, previous.x, previous.y, ICE_TRAIL_DURATION_MS, TILE_TYPES.ICE_TRAIL);
                }
                if (getAbilityId(enemy) === 'hellhound_ember' && effectAt(runtime.fire, current.x, current.y)) {
                    a.hellhoundBoostMs = 3000;
                    if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#fb923c', 4);
                }
                a.lastTile = current;
            } else {
                a.lastTile = current;
            }
        }
    }

    function installAIHooks() {
        const baseUpdateAI = global.updateEnemyAI;
        if (typeof baseUpdateAI === 'function' && !baseUpdateAI.__rastreroV630Wrapped) {
            const wrappedUpdateAI = function updateEnemyAIWithRastrerosV630(dt) {
                const s = getState();
                if (!s || !s.isPlaying || s.paused) return baseUpdateAI(dt);
                ensureRoomState();
                for (const enemy of s.enemies || []) {
                    if (enemy && isRastrero(enemy)) ensureEnemyState(enemy);
                }
                updateEnemyAIAbilities(dt);
                const result = baseUpdateAI(dt);
                postEnemyAIMovement();
                return result;
            };
            wrappedUpdateAI.__rastreroV630Wrapped = true;
            global.updateEnemyAI = wrappedUpdateAI;
        }

        const baseMoveEnemy = global.moveEnemyV312;
        if (typeof baseMoveEnemy === 'function' && !baseMoveEnemy.__rastreroV630Wrapped) {
            const wrappedMoveEnemy = function moveEnemyWithRastreroAbilitiesV630(enemy, dt) {
                const ability = getAbilityId(enemy);
                if (!ability) return baseMoveEnemy(enemy, dt);
                const a = ensureEnemyState(enemy);
                if (a.moleBuriedMs > 0) {
                    enemy.vx = 0;
                    enemy.vy = 0;
                    return;
                }
                if (ability === 'boar_charge' && a.chargeState !== 'idle') {
                    return runBoarCharge(enemy, a, dt);
                }
                if (ability === 'frog_leap' && a.frogJumpMs > 0) {
                    return advanceFrogLeap(enemy, a, dt);
                }
                return baseMoveEnemy(enemy, dt);
            };
            wrappedMoveEnemy.__rastreroV630Wrapped = true;
            global.moveEnemyV312 = wrappedMoveEnemy;
        }

        const baseMoveSpeed = global.getEnemyMovementSpeedV610;
        if (typeof baseMoveSpeed === 'function' && !baseMoveSpeed.__rastreroV630Wrapped) {
            const wrappedMoveSpeed = function getEnemyMovementSpeedWithRastrerosV630(enemy) {
                let speed = baseMoveSpeed(enemy);
                const ability = getAbilityId(enemy);
                const a = enemy?.__rastreroV630;
                if (ability === 'crab_shell') {
                    const targetGX = Number.isFinite(enemy._tileMoveTargetGX) ? enemy._tileMoveTargetGX : null;
                    const targetGY = Number.isFinite(enemy._tileMoveTargetGY) ? enemy._tileMoveTargetGY : null;
                    const tile = tileOf(enemy, 'enemy');
                    const horizontal = targetGX !== null ? targetGX !== tile.x : ['left', 'right'].includes(String(enemy.ai?.direction || enemy.lastDirection));
                    if (horizontal) speed *= 1.4;
                }
                if (ability === 'hellhound_ember' && Number(a?.hellhoundBoostMs || 0) > 0) speed *= 1.3;
                return speed;
            };
            wrappedMoveSpeed.__rastreroV630Wrapped = true;
            global.getEnemyMovementSpeedV610 = wrappedMoveSpeed;
        }

    }

    function enemyIgnoresBombs(enemy) {
        return getAbilityId(enemy) === 'cloud_ethereal';
    }

    function handleEnemyBlast(enemy, explosion) {
        if (!enemy || !explosion) return false;
        const ability = getAbilityId(enemy);
        if (!ability) return false;
        const a = ensureEnemyState(enemy);
        const blastId = Number(explosion.blastId);
        if (isEnemyBuried(enemy)) return true;

        if (ability === 'crab_shell') {
            if (Number.isFinite(blastId) && a.lastBlastId === blastId) return true;
            if (a.shellIntact) {
                a.shellIntact = false;
                a.lastBlastId = Number.isFinite(blastId) ? blastId : `frame-${getState()?.animFrame || 0}`;
                if (typeof global.addFloatingText === 'function') global.addFloatingText('¡CAPARAZÓN ROTO!', enemy.x, enemy.y - enemy.height * 0.6, '#fdba74');
                if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#f5d0a0', 10);
                return true;
            }
            return Number.isFinite(blastId) && a.lastBlastId === blastId;
        }

        if (ability === 'mole_burrow') {
            const meta = runtime.blastMeta.get(blastId);
            const enemyTile = tileOf(enemy, 'enemy');
            if (!meta || meta.owner !== 'player' || !Number.isFinite(blastId)) return false;
            if (a.moleSavedBlastId === blastId) return true;
            if (enemyTile.x !== explosion.x || enemyTile.y !== explosion.y) return false;
            const dx = enemyTile.x - meta.x, dy = enemyTile.y - meta.y;
            if (dx !== 0 && dy !== 0) return false;
            const edgeDistance = Math.abs(dx) + Math.abs(dy);
            if (edgeDistance === 0) return false;
            const direction = dx === 0 ? (dy < 0 ? 'up' : 'down') : (dx < 0 ? 'left' : 'right');
            const effectiveReach = Number(meta.directionReach?.[direction] || 0);
            if (effectiveReach <= 0 || edgeDistance < effectiveReach) return false;
            a.moleBuriedMs = 1500;
            a.moleSavedBlastId = blastId;
            enemy._tileMoveActive = false;
            enemy.vx = 0;
            enemy.vy = 0;
            if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#b58a57', 7);
            if (typeof global.addFloatingText === 'function') global.addFloatingText('¡SE ENTERRÓ!', enemy.x, enemy.y - enemy.height * 0.55, '#d6b48c');
            return true;
        }

        if (ability === 'goat_stomp') triggerGoatStompOnHit(enemy, a);
        return false;
    }

    function onEnemyDefeated(enemy, deathContext = null) {
        // La habilidad se activa por la muerte, no por el tipo de daño.
        // Se conserva la excepción histórica para una explosión directa del jefe.
        if (getAbilityId(enemy) !== 'alien_acid') return false;
        if (deathContext?.owner === 'boss') return false;
        const tile = tileOf(enemy, 'enemy');
        addTimedTile(runtime.acid, tile.x, tile.y, 4000, 'acid');
        if (typeof global.addFloatingText === 'function') global.addFloatingText('ÁCIDO', (tile.x + 0.5) * getTileSize(), (tile.y + 0.35) * getTileSize(), '#86efac');
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#84cc16', 10);
        return true;
    }

    function registerBlastMeta() {
        const bus = global.gameEventBus;
        const eventName = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
        if (!bus || !eventName || typeof bus.on !== 'function' || global.__RASTRERO_BLAST_LISTENER_V630__) return;
        bus.on(eventName, payload => {
            const bomb = payload?.bomb;
            const blastId = Number(payload?.blastId);
            if (!bomb || !Number.isFinite(blastId)) return;
            const bx = Number(bomb.x), by = Number(bomb.y);
            const directionReach = { up: 0, down: 0, left: 0, right: 0 };
            for (const cell of payload.cells || []) {
                const dx = Number(cell.x) - bx, dy = Number(cell.y) - by;
                if (dx === 0 && dy < 0) directionReach.up = Math.max(directionReach.up, -dy);
                else if (dx === 0 && dy > 0) directionReach.down = Math.max(directionReach.down, dy);
                else if (dy === 0 && dx < 0) directionReach.left = Math.max(directionReach.left, -dx);
                else if (dy === 0 && dx > 0) directionReach.right = Math.max(directionReach.right, dx);
            }
            runtime.blastMeta.set(blastId, {
                x: bx, y: by,
                range: Math.max(1, Number(bomb.range) || 1),
                directionReach,
                owner: String(bomb.owner || 'player'),
                createdAt: runtime.clock
            });
        }, { key: 'rastrero-abilities-v630:blast-meta' });
        global.__RASTRERO_BLAST_LISTENER_V630__ = true;
    }

    function updatePlayerAcidContact() {
        const s = getState();
        const p = getPlayer();
        if (!s || !p || !s.isPlaying || s.paused) return;
        const tile = tileOf(p, 'player');
        const key = tileKey(tile.x, tile.y);
        if (!effectAt(runtime.acid, tile.x, tile.y)) {
            p.__rastreroAcidLastTileV630 = null;
            return;
        }
        if (p.__rastreroAcidLastTileV630 === key) return;
        p.__rastreroAcidLastTileV630 = key;
        if (typeof global.takeDamage === 'function') global.takeDamage('acid', (tile.x + 0.5) * getTileSize(), (tile.y + 0.5) * getTileSize());
        else applyPlayerSlow(700);
    }

    function installUpdateHook() {
        const baseUpdate = global.update;
        if (typeof baseUpdate !== 'function' || baseUpdate.__rastreroV630Wrapped) return;
        const wrappedUpdate = function updateWithRastreroAbilitiesV630(dt) {
            const s = getState();
            const active = !!s?.isPlaying && !s?.paused;
            const delta = Math.max(0, Number(dt) || 0);
            runtime.frameScale = Math.max(0, Math.min(2, delta / 16.6667));
            if (active) {
                ensureRoomState();
                runtime.clock += delta;
                if (getPlayer()) getPlayer().__rastreroSlowTimerV630 = Math.max(0, Number(getPlayer().__rastreroSlowTimerV630 || 0) - delta);
                cleanupEffects();
            }
            const result = baseUpdate(dt);
            if (active && s?.isPlaying && !s?.paused) {
                cleanupEffects();
                updatePlayerAcidContact();
            }
            return result;
        };
        wrappedUpdate.__rastreroV630Wrapped = true;
        global.update = wrappedUpdate;
    }

    // Internal read-only bridge for the separate visual module. Gameplay state remains owned here.
    global.__RASTRERO_RENDER_BRIDGE_V630__ = Object.freeze({
        getRenderState: () => ({ clock: runtime.clock, ice: runtime.ice, acid: runtime.acid, fire: runtime.fire }),
        getAbilityId,
        ensureEnemyState,
        isEnemyBuried,
        isLizardCamouflaged,
        getTileSize
    });

    // Public hooks consumed by the existing simulation and renderer.
    global.enemyIgnoresBombsV630 = enemyIgnoresBombs;
    global.isEnemyBuriedV630 = isEnemyBuried;
    global.enemyBlastInteractionV630 = handleEnemyBlast;
    global.enemyOnDefeatedV630 = onEnemyDefeated;
    global.getRastreroPlayerSpeedFactorV630 = getPlayerSpeedFactor;
    global.RASTRERO_ABILITIES_V630 = Object.freeze({
        version: '6.30.0',
        species: Object.freeze({ ...SPECIES_ABILITIES }),
        getAbilityId,
        tileTypes: Object.freeze({ ICE_TRAIL: TILE_TYPES.ICE_TRAIL }),
        iceTrailLifetimeMs: ICE_TRAIL_DURATION_MS,
        frictionIce: FRICTION_ICE,
        inspectRuntime: () => ({
            roomKey: runtime.roomKey,
            iceTiles: runtime.ice.size,
            acidTiles: runtime.acid.size,
            fireTiles: runtime.fire.size,
            blastMetadata: runtime.blastMeta.size
        })
    });

    global.rastreroPlayerTileArrivedV630 = onPlayerTileArrivedV630;
    global.rastreroPlayerIceMoveBlockedV630 = onPlayerIceMoveBlockedV630;
    installPlayerIceInertia();
    installAIHooks();
    registerBlastMeta();
    installLevelResetHook();
    installUpdateHook();
})(window);

;
// === js/46-rastreros-render.js ===
// BOMBERMAN ROGUELIKE v6.31.7 — Renderizado separado de habilidades Rastrero.
(function installRastreroRenderV6317(global) {
    'use strict';
    const bridge = global.__RASTRERO_RENDER_BRIDGE_V630__;
    if (!bridge) {
        console.error('[Rastrero Render] No se encontró el puente del módulo principal.');
        return;
    }
    const getAbilityId = bridge.getAbilityId;
    const ensureEnemyState = bridge.ensureEnemyState;
    const isEnemyBuried = bridge.isEnemyBuried;
    const isLizardCamouflaged = bridge.isLizardCamouflaged;
    const getTileSize = bridge.getTileSize;

    function drawRastreroAbilityEffectsV630(targetCtx) {
        const renderState = bridge.getRenderState();
        const context = targetCtx || global.ctx || (typeof ctx !== 'undefined' ? ctx : null);
        if (!context) return;
        const size = getTileSize();
        context.save();
        for (const effect of renderState.ice.values()) {
            const remaining = Math.max(0, effect.expiresAt - renderState.clock);
            const alpha = Math.min(0.48, 0.12 + 0.36 * remaining / Math.max(1, effect.durationMs));
            context.globalAlpha = alpha;
            context.fillStyle = '#8be9ff';
            context.fillRect(effect.x * size + size * 0.09, effect.y * size + size * 0.09, size * 0.82, size * 0.82);
            context.strokeStyle = '#dffaff';
            context.lineWidth = Math.max(1, size * 0.035);
            context.beginPath();
            context.moveTo(effect.x * size + size * 0.2, effect.y * size + size * 0.68);
            context.lineTo(effect.x * size + size * 0.42, effect.y * size + size * 0.44);
            context.lineTo(effect.x * size + size * 0.63, effect.y * size + size * 0.55);
            context.lineTo(effect.x * size + size * 0.8, effect.y * size + size * 0.28);
            context.stroke();
        }
        for (const effect of renderState.acid.values()) {
            const remaining = Math.max(0, effect.expiresAt - renderState.clock);
            const alpha = Math.min(0.8, 0.32 + 0.45 * remaining / Math.max(1, effect.durationMs));
            context.globalAlpha = alpha;
            context.fillStyle = '#65a30d';
            context.beginPath();
            context.ellipse((effect.x + 0.5) * size, (effect.y + 0.56) * size, size * 0.36, size * 0.24, 0, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = '#bef264';
            context.lineWidth = Math.max(1, size * 0.035);
            context.stroke();
            context.fillStyle = '#d9f99d';
            context.beginPath();
            context.arc((effect.x + 0.36) * size, (effect.y + 0.45) * size, size * 0.045, 0, Math.PI * 2);
            context.arc((effect.x + 0.62) * size, (effect.y + 0.62) * size, size * 0.035, 0, Math.PI * 2);
            context.fill();
        }
        for (const effect of renderState.fire.values()) {
            const remaining = Math.max(0, effect.expiresAt - renderState.clock);
            context.globalAlpha = Math.min(0.58, 0.12 + 0.45 * remaining / Math.max(1, effect.durationMs));
            context.fillStyle = '#f97316';
            context.beginPath();
            context.ellipse((effect.x + 0.5) * size, (effect.y + 0.58) * size, size * 0.29, size * 0.15, 0, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#fef3c7';
            context.fillRect((effect.x + 0.45) * size, (effect.y + 0.43) * size, size * 0.1, size * 0.13);
        }
        context.restore();
    }

    function drawEnemyAbilityMarker(enemy, a, ability) {
        const context = global.ctx || (typeof ctx !== 'undefined' ? ctx : null);
        if (!context || !a) return;
        const size = getTileSize();
        context.save();
        if (ability === 'crab_shell') {
            if (a.shellIntact) {
                context.strokeStyle = '#fed7aa';
                context.lineWidth = 3;
                context.beginPath();
                context.arc(enemy.x, enemy.y, enemy.width * 0.52, 0, Math.PI * 2);
                context.stroke();
            } else {
                context.strokeStyle = '#fef3c7';
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(enemy.x - 5, enemy.y - 5);
                context.lineTo(enemy.x + 2, enemy.y + 1);
                context.lineTo(enemy.x - 1, enemy.y + 8);
                context.stroke();
            }
        } else if (ability === 'boar_charge' && (a.chargeState === 'telegraph' || a.chargeState === 'charging')) {
            const dir = a.chargeDirection;
            if (dir) {
                context.strokeStyle = a.chargeState === 'telegraph' ? '#fdba74' : '#ef4444';
                context.lineWidth = a.chargeState === 'telegraph' ? 3 : 4;
                context.setLineDash(a.chargeState === 'telegraph' ? [5, 4] : []);
                context.beginPath();
                context.moveTo(enemy.x + dir.x * enemy.width * 0.4, enemy.y + dir.y * enemy.height * 0.4);
                context.lineTo(enemy.x + dir.x * size * 1.4, enemy.y + dir.y * size * 1.4);
                context.stroke();
                context.setLineDash([]);
            }
        } else if (ability === 'goat_stomp' && (a.goatTelegraphMs > 0 || a.goatEffectMs > 0)) {
            context.strokeStyle = a.goatEffectMs > 0 ? 'rgba(226,232,240,.85)' : 'rgba(203,213,225,.62)';
            context.lineWidth = 3;
            context.beginPath();
            context.arc(enemy.x, enemy.y, size * (a.goatEffectMs > 0 ? 1.45 : 1.1), 0, Math.PI * 2);
            context.stroke();
        } else if (ability === 'cherub_aura' && (a.cherubTelegraphMs > 0 || a.cherubPulseMs > 0)) {
            context.strokeStyle = a.cherubPulseMs > 0 ? '#f5d0fe' : 'rgba(216,180,254,.7)';
            context.lineWidth = 2.5;
            context.beginPath();
            context.arc(enemy.x, enemy.y, size * (a.cherubPulseMs > 0 ? 1.65 : 1.25), 0, Math.PI * 2);
            context.stroke();
        } else if (ability === 'hellhound_ember' && a.hellhoundBoostMs > 0) {
            context.fillStyle = '#fb923c';
            context.globalAlpha = 0.82;
            context.beginPath();
            context.moveTo(enemy.x - size * 0.22, enemy.y + size * 0.28);
            context.lineTo(enemy.x - size * 0.1, enemy.y + size * 0.02);
            context.lineTo(enemy.x + size * 0.01, enemy.y + size * 0.22);
            context.lineTo(enemy.x + size * 0.17, enemy.y - size * 0.05);
            context.lineTo(enemy.x + size * 0.24, enemy.y + size * 0.28);
            context.closePath();
            context.fill();
        }
        context.restore();
    }

    function drawEnemyWithRastreroAbilities(enemy, drawBase) {
        if (typeof drawBase !== 'function') return;
        const ability = getAbilityId(enemy);
        if (!ability) {
            drawBase(enemy);
            return;
        }
        const a = ensureEnemyState(enemy);
        const context = global.ctx || (typeof ctx !== 'undefined' ? ctx : null);
        if (a.moleBuriedMs > 0) {
            if (context) {
                context.save();
                context.fillStyle = '#8b6b45';
                context.globalAlpha = 0.85;
                context.beginPath();
                context.ellipse(enemy.x, enemy.y + enemy.height * 0.22, enemy.width * 0.48, enemy.height * 0.22, 0, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = '#d6b48c';
                context.lineWidth = 2;
                context.stroke();
                context.restore();
            }
            return;
        }
        if (!context) {
            drawBase(enemy);
            return;
        }
        context.save();
        try {
            if (isLizardCamouflaged(enemy)) context.globalAlpha *= 0.45;
            if (ability === 'frog_leap' && a.frogJumpMs > 0) {
                const progress = 1 - a.frogJumpMs / Math.max(1, a.frogJumpDurationMs);
                context.translate(0, -Math.sin(progress * Math.PI) * getTileSize() * 0.38);
            }
            drawBase(enemy);
        } finally {
            context.restore();
        }
        drawEnemyAbilityMarker(enemy, a, ability);
    }

    global.drawRastreroAbilityEffectsV630 = drawRastreroAbilityEffectsV630;
    global.drawRastreroEnemySpriteV630 = drawEnemyWithRastreroAbilities;
})(window);

;
// === js/47-ui-visibility.js ===
// v6.31.2 — Visibilidad del sidebar y de los controles táctiles.
(() => {
    'use strict';

    function initUIVisibilityV6312() {
        const mainMenu = document.getElementById('main-menu');
        const layout = document.getElementById('game-layout');
        const panel = document.getElementById('game-info-panel');
        const toggle = document.getElementById('btn-toggle-game-info');
        const mobileControls = document.getElementById('mobile-controls');
        const startScreen = document.getElementById('start-screen');
        const blockingScreens = [
            document.getElementById('game-over-screen'),
            document.getElementById('level-complete-screen'),
            document.getElementById('pause-screen')
        ].filter(Boolean);

        if (!mainMenu || !layout || !panel || !toggle || !mobileControls || !startScreen) return;

        // Cerrado por defecto para dejar el máximo espacio visible al tablero.
        layout.classList.add('info-panel-collapsed');

        function syncSidebar() {
            const expanded = !layout.classList.contains('info-panel-collapsed');
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.setAttribute('aria-label', expanded
                ? 'Ocultar información de la partida'
                : 'Mostrar información de la partida');
            toggle.textContent = expanded ? 'INFO ×' : 'INFO +';
            panel.setAttribute('aria-hidden', String(!expanded));
        }

        function syncGameplayControls() {
            const activeRun = mainMenu.classList.contains('run-active');
            const startHidden = startScreen.classList.contains('hidden');
            const overlayVisible = blockingScreens.some(screen => !screen.classList.contains('hidden'));
            const active = activeRun && startHidden && !overlayVisible;
            document.body.classList.toggle('gameplay-active', active);
            mobileControls.setAttribute('aria-hidden', String(!active));
        }

        toggle.addEventListener('click', () => {
            layout.classList.toggle('info-panel-collapsed');
            syncSidebar();
        });

        // La app usa clases .run-active y .hidden para dirigir sus pantallas.
        const observer = new MutationObserver(() => syncGameplayControls());
        [mainMenu, startScreen, ...blockingScreens].forEach(element => {
            observer.observe(element, { attributes: true, attributeFilter: ['class'] });
        });

        syncSidebar();
        syncGameplayControls();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUIVisibilityV6312, { once: true });
    } else {
        initUIVisibilityV6312();
    }
})();

;
// === js/48-runtime-integrity.js ===
/* BOMBERMAN ROGUELIKE v6.32.2 — diagnóstico del arranque y errores no controlados. */
(function installRuntimeIntegrityV632(global) {
    'use strict';

    const BUILD = '6.32.2';
    let reportNode = null;
    let reported = false;

    function safeMessage(value) {
        if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
        if (typeof value === 'string') return value;
        try { return JSON.stringify(value); } catch (_) { return String(value); }
    }

    function showDiagnostic(kind, details) {
        const message = `[Bomberman Roguelike ${BUILD}] ${kind}\n${details}`;
        try { global.console.error(message); } catch (_) {}
        if (reported || !global.document?.body) return;
        reported = true;

        const panel = global.document.createElement('section');
        panel.id = 'runtime-integrity-alert-v632';
        panel.setAttribute('role', 'alert');
        panel.setAttribute('aria-live', 'assertive');
        Object.assign(panel.style, {
            position: 'fixed', inset: '12px 12px auto 12px', zIndex: '2147483647',
            maxHeight: 'min(70vh, 620px)', overflow: 'auto', padding: '16px',
            color: '#fff', background: '#24151a', border: '2px solid #ef4444',
            borderRadius: '8px', boxShadow: '0 12px 36px rgba(0,0,0,.55)',
            font: '12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace',
            textAlign: 'left', whiteSpace: 'normal'
        });

        const heading = global.document.createElement('strong');
        heading.textContent = `DIAGNÓSTICO DEL JUEGO · v${BUILD}`;
        Object.assign(heading.style, { display: 'block', marginBottom: '8px', fontSize: '14px' });

        const body = global.document.createElement('pre');
        body.textContent = `${kind}\n\n${details}`;
        Object.assign(body.style, { margin: '0 0 12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });

        const close = global.document.createElement('button');
        close.type = 'button';
        close.textContent = 'CERRAR DIAGNÓSTICO';
        Object.assign(close.style, {
            padding: '8px 12px', color: '#fff', background: '#3f2028',
            border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', font: 'inherit'
        });
        close.addEventListener('click', () => panel.remove(), { once: true });

        panel.append(heading, body, close);
        global.document.body.appendChild(panel);
        reportNode = panel;
    }

    function verifyStartup() {
        const problems = [];
        const canvas = global.document?.getElementById('gameCanvas');

        if (!canvas) {
            problems.push('No se encontró el elemento canvas#gameCanvas en index.html.');
        } else {
            if (!(canvas instanceof global.HTMLCanvasElement)) {
                problems.push('#gameCanvas existe, pero no es un elemento <canvas>.');
            } else {
                try {
                    if (!canvas.getContext('2d')) problems.push('El navegador no pudo crear el contexto 2D de #gameCanvas.');
                } catch (error) {
                    problems.push(`No se pudo inicializar el contexto 2D: ${safeMessage(error)}`);
                }
                const rect = canvas.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    problems.push(`#gameCanvas no tiene área visible (ancho ${Math.round(rect.width)}, alto ${Math.round(rect.height)}). Revisar CSS/layout.`);
                }
            }
        }

        const requiredGlobals = [
            ['gameState', () => typeof gameState !== 'undefined'],
            ['player', () => typeof player !== 'undefined'],
            ['startGame', () => typeof startGame === 'function'],
            ['initLevel', () => typeof initLevel === 'function'],
            ['update', () => typeof update === 'function'],
            ['draw', () => typeof draw === 'function'],
            ['gameLoop', () => typeof gameLoop === 'function']
        ];
        for (const [name, check] of requiredGlobals) {
            let exists = false;
            try { exists = check(); } catch (_) { exists = false; }
            if (!exists) problems.push(`Falta el componente esencial «${name}». Puede haber fallado la carga de un módulo previo.`);
        }

        if (problems.length) showDiagnostic('ARRANQUE INCOMPLETO', problems.map((item, index) => `${index + 1}. ${item}`).join('\n'));
    }

    global.BOMBERMAN_BUILD = BUILD;
    global.BOMBERMAN_RUNTIME_INTEGRITY_V632 = Object.freeze({
        version: BUILD,
        check: verifyStartup,
        getDiagnostic: () => reportNode?.textContent || null
    });

    global.addEventListener('error', (event) => {
        const msg = String(event?.message || safeMessage(event?.error) || '');
        // Las advertencias benignas de ciclo de ResizeObserver no representan fallos de simulación
        if (
            msg.includes('ResizeObserver loop completed with undelivered notifications') ||
            msg.includes('ResizeObserver loop limit exceeded')
        ) {
            return;
        }
        // Los errores de recursos externos no deben interrumpir el juego por sí solos.
        if (event?.error || event?.message) {
            const location = event.filename ? `\nArchivo: ${event.filename}${event.lineno ? `:${event.lineno}` : ''}` : '';
            showDiagnostic('ERROR DE JAVASCRIPT', `${msg || 'Error sin mensaje'}${location}`);
        }
    });

    global.addEventListener('unhandledrejection', (event) => {
        showDiagnostic('PROMESA RECHAZADA SIN MANEJADOR', safeMessage(event?.reason ?? 'Motivo no disponible'));
    });

    if (global.document?.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', verifyStartup, { once: true });
    } else {
        verifyStartup();
    }
})(window);

  } catch (err) {
    console.error("Bomberman engine initialization error:", err);
  }
}
