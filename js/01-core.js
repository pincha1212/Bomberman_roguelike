// Bomberman Roguelike v4.6 — Core, configuration, state, audio, performance and adaptive interface
// V2.0 IMMERSIVE SYSTEMS
let audioCtx = null;

const ambient = { dustTimer: 0, lastFoot: 0, introTimer: 0 };
function initAudio(){
    if(audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { audioCtx = null; }
}
function sfx(type){
    if(!audioCtx) return;
    const now=audioCtx.currentTime, o=audioCtx.createOscillator(), g=audioCtx.createGain();
    const presets={bomb:[70,.08,'square'],boom:[55,.28,'sawtooth'],pickup:[520,.10,'sine'],hurt:[110,.18,'square'],exit:[330,.35,'triangle'],click:[220,.05,'square'],trap:[90,.22,'sawtooth'],alarm:[180,.16,'square'],boss:[62,.5,'sawtooth'],bossHit:[240,.10,'square'],bossRoar:[48,.65,'sawtooth'],bossCharge:[120,.22,'square'],bossWave:[75,.38,'triangle'],damageHit:[135,.12,'square'],enemyKill:[420,.08,'square'],death:[65,.58,'sawtooth'],bombReady:[150,.07,'square']};
    const audioKey = typeof themeAudioV46 === 'function' ? themeAudioV46(type, type) : type;
    const [freq,dur,wave]=presets[audioKey]||presets.click;
    o.type=wave; o.frequency.setValueAtTime(freq,now); o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.55),now+dur);
    g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(.06,now+.008); g.gain.exponentialRampToValueAtTime(.0001,now+dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now+dur+.02);
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
    const scheduleAdaptiveResize = () => { markAdaptiveViewportDirty(); };
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
