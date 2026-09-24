// Bomberman Roguelike v3.6 — Core, configuration, state, audio, performance and adaptive interface
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
    const [freq,dur,wave]=presets[type]||presets.click;
    o.type=wave; o.frequency.setValueAtTime(freq,now); o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.55),now+dur);
    g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(.06,now+.008); g.gain.exponentialRampToValueAtTime(.0001,now+dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now+dur+.02);
}
function showRoomIntro(){
    const el=document.getElementById('room-intro'); if(!el) return;
    const r=gameState.roomType;
    el.innerHTML=`<div class="room-number">DEPTH ${String(gameState.level).padStart(2,'0')} · RUN ${String(gameState.runNumber).padStart(2,'0')}</div><div class="room-name" style="color:${r.color}">${r.icon} ${r.name}</div><div class="room-sub">${r.subtitle}</div>`;
    el.classList.remove('hidden');
    clearTimeout(ambient.introTimer); ambient.introTimer=setTimeout(()=>el.classList.add('hidden'),1800);
    sfx('click');
}
function renderImmersion(){
    const danger=UI['danger-indicator'];
    if(!danger) return;
    const nearestBomb=gameState.bombs.some(b=>Math.abs(b.x-Math.floor((player.x+player.width/2)/TILE_SIZE))+Math.abs(b.y-Math.floor((player.y+player.height/2)/TILE_SIZE))<=2 && b.timer<900);
    const pressureDanger = gameState.roomTime < 15000 || gameState.threatLevel >= 2;
    danger.textContent = pressureDanger ? `⚠ PRESIÓN ${gameState.threatLevel}` : 'PELIGRO';
    danger.classList.toggle('hidden', (!nearestBomb && !pressureDanger) || gameState.paused);
    const vignette=UI['immersion-vignette'];
    if(vignette){
        const low=player.health<=1, pulse=low ? (0.28+Math.sin(gameState.animFrame*.08)*.12) : .08;
        vignette.style.background=`radial-gradient(circle at 50% 48%, transparent 25%, rgba(2,6,23,${pulse}) 62%, rgba(2,6,23,${low?.62:.38}) 100%)`;
    }
}
function drawAmbientDust(){
    const count=perf.lowQuality ? 8 : 24;
    for(let i=0;i<count;i++){
        const seed=(i*97)%1000;
        const x=((seed*3.71+gameState.animFrame*.09*(i%3+1))%(canvas.width+80))-40;
        const y=((seed*1.83+gameState.animFrame*.035*(i%2+1))%(canvas.height+80))-40;
        const a=.025+(i%4)*.012;
        ctx.fillStyle=`rgba(226,232,240,${a})`; ctx.fillRect(x,y,1+(i%2),1+(i%2));
    }
}
function drawLighting(){
    // Localized darkness with soft light around the player and bombs.
    ctx.save();
    const grad=ctx.createRadialGradient(player.x+player.width/2-gameState.camera.x,player.y+player.height/2-gameState.camera.y,35,player.x+player.width/2-gameState.camera.x,player.y+player.height/2-gameState.camera.y,240);
    grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(.65,'rgba(0,0,0,.12)'); grad.addColorStop(1,'rgba(0,0,0,.52)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (!perf.lowQuality || gameState.animFrame % 2 === 0) gameState.bombs.forEach(b=>{
        const x=(b.x+.5)*TILE_SIZE-gameState.camera.x, y=(b.y+.5)*TILE_SIZE-gameState.camera.y;
        const radius=75+Math.sin(gameState.animFrame*.3)*8;
        const g=ctx.createRadialGradient(x,y,4,x,y,radius); g.addColorStop(0,'rgba(255,170,50,.20)'); g.addColorStop(1,'rgba(255,80,20,0)');
        ctx.fillStyle=g; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
    });
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
    lastUi: 0
};
// V3.2.2 LARGE SUPPORT LAYER
// Optimiza entidades grandes y evita que los efectos escalen sin control.
const largeSupport = {
    maxBossProjectiles: 34,
    maxEnemies: 22,
    particleBudget: 150,
    shadowEffects: true,
    lastBossDraw: 0
};

function clampLargeEntities(){
    if(gameState.bossProjectiles.length > largeSupport.maxBossProjectiles){
        gameState.bossProjectiles.splice(0, gameState.bossProjectiles.length - largeSupport.maxBossProjectiles);
    }
    if(gameState.enemies.length > largeSupport.maxEnemies){
        gameState.enemies.length = largeSupport.maxEnemies;
    }
    if(gameState.particles.length > largeSupport.particleBudget){
        gameState.particles.splice(0, gameState.particles.length - largeSupport.particleBudget);
    }
}

function drawLargeBossShadow(b){
    if(!largeSupport.shadowEffects || perf.lowQuality) return;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.42)';
    ctx.beginPath();
    ctx.ellipse(b.x,b.y+b.height*.44,b.width*.46,Math.max(7,b.height*.10),0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
}

// V3.2.3 ADAPTIVE INTERFACE LAYER
const adaptiveUI = {
    lastLayout: '',
    lastPlayerState: false
};

function updateAdaptiveInterface(){
    const root = document.getElementById('game-container');
    if(!root || !player || !gameState.isPlaying) return;

    const cx = player.x + player.width / 2 - gameState.camera.x;
    const cy = player.y + player.height / 2 - gameState.camera.y;
    const w = canvas.width;
    const h = canvas.height;
    const nx = cx / Math.max(1,w);
    const ny = cy / Math.max(1,h);

    // Elegimos una zona opuesta al jugador. El centro queda siempre libre.
    let layout;
    if(nx < .34 && ny < .40) layout = 'tl';
    else if(nx > .66 && ny < .40) layout = 'tr';
    else if(nx < .34 && ny > .60) layout = 'bl';
    else if(nx > .66 && ny > .60) layout = 'br';
    else if(ny <= .50) layout = 'tc';
    else layout = 'bc';
    const moving = !!player.isMoving;

    if(layout !== adaptiveUI.lastLayout){
        root.classList.remove('ui-safe-left','ui-safe-right','ui-safe-center','ui-safe-top','ui-safe-bottom',
            'ui-player-tl','ui-player-tr','ui-player-bl','ui-player-br','ui-player-tc','ui-player-bc');
        root.classList.add(`ui-player-${layout}`);
        adaptiveUI.lastLayout = layout;
    }

    if(moving !== adaptiveUI.lastPlayerState){
        root.classList.toggle('player-moving', moving);
        adaptiveUI.lastPlayerState = moving;
    }

}

const UI = {};
[
    'ui-health','ui-score','ui-level','ui-bombs','ui-range','ui-speed','ui-coins','ui-relics',
    'ui-timer','ui-threat','ui-shield-badge','boss-hud','boss-bar','boss-phase','room-banner',
    'run-banner','relic-strip','danger-indicator','immersion-vignette'
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
            SHIELD_UP: 'SHIELD_UP'
        };

        const ENEMY_TYPES = {
            RASTRERO: { name: 'Rastrero', color: '#ef4444', speed: 1.4, canFly: false },
            VOLADOR: { name: 'Volador', color: '#3b82f6', speed: 1.1, canFly: true },
            ESPECIAL: { name: 'Especial', color: '#22c55e', speed: 2.2, canFly: false }
        };

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
            { id: 'ember_core', icon: '🔥', name: 'NÚCLEO ÍGNEO', rarity: 'RARE', desc: '+1 rango de bomba. Las explosiones valen +25 puntos extra.',
              apply: () => { player.bombRange += 1; } },
            { id: 'twin_fuse', icon: '💣', name: 'MECHA GEMELA', rarity: 'UNCOMMON', desc: '+1 bomba máxima.',
              apply: () => { player.maxBombs += 1; } },
            { id: 'iron_boots', icon: '👟', name: 'BOTAS DE HIERRO', rarity: 'UNCOMMON', desc: '+0.6 velocidad permanente.',
              apply: () => { player.speed = Math.min(player.speed + 0.6, 6); } },
            { id: 'heart_engine', icon: '♥', name: 'MOTOR VITAL', rarity: 'RARE', desc: '+1 vida máxima y recuperas 1 vida ahora.',
              apply: () => { player.maxHealth += 1; player.health = Math.min(player.health + 1, player.maxHealth); } },
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
            { id: 'bomb', kind: 'UPGRADE', rarity: 'COMMON', name: '+1 BOMBA', desc: 'Aumenta las bombas simultáneas.', action: () => player.maxBombs++ },
            { id: 'range', kind: 'UPGRADE', rarity: 'COMMON', name: '+1 RANGO', desc: 'Las explosiones llegan una casilla más lejos.', action: () => player.bombRange++ },
            { id: 'speed', kind: 'UPGRADE', rarity: 'COMMON', name: 'BOTAS', desc: '+0.4 velocidad.', action: () => { player.speed = Math.min(player.speed + 0.4, 6); } },
            { id: 'health', kind: 'UPGRADE', rarity: 'UNCOMMON', name: 'CORAZÓN', desc: '+1 vida máxima y recupera 1.', action: () => { player.maxHealth++; player.health = Math.min(player.health + 1, player.maxHealth); } },
            { id: 'shield', kind: 'UPGRADE', rarity: 'UNCOMMON', name: 'ESCUDO', desc: 'Protección contra un golpe.', action: () => player.hasShield = true },
            { id: 'coin', kind: 'UPGRADE', rarity: 'COMMON', name: 'BOTÍN', desc: '+35 monedas.', action: () => gameState.coins += 35 },
            { id: 'heal', kind: 'UPGRADE', rarity: 'UNCOMMON', name: 'KIT MÉDICO', desc: 'Recupera 2 vidas sin superar el máximo.', action: () => player.health = Math.min(player.health + 2, player.maxHealth) }
        ];

        const RARITY_COLORS = {
            COMMON: '#94a3b8', UNCOMMON: '#34d399', RARE: '#60a5fa', EPIC: '#c084fc'
        };

        function getRoomForDepth(depth) {
            if (depth === 1) return ROOM_TYPES.STANDARD;
            const roll = Math.random();
            if (depth % 5 === 0) return ROOM_TYPES.BOSS;
            if (depth % 5 === 1 && depth > 1) return ROOM_TYPES.SHRINE;
            if (roll < 0.16) return ROOM_TYPES.ELITE;
            if (roll < 0.34) return ROOM_TYPES.TREASURE;
            if (roll < 0.48) return ROOM_TYPES.CURSED;
            return ROOM_TYPES.STANDARD;
        }

        function getAvailableRelics() {
            return RELICS.filter(r => !gameState.relics.some(owned => owned.id === r.id));
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
            hazardCooldown: 0,
            boss: null,
            bossProjectiles: [],
            roomTime: 0,
            threatLevel: 0,
            nextReinforcement: 20000,
            exitPos: null,
            lastTime: 0,
            keys: {},
            touchControls: { x: 0, y: 0 },
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
            bestDepth: Number(localStorage.getItem('bombermanBestDepth') || 0)
        };

        let player = {
            x: 0, y: 0,
            width: TILE_SIZE * 0.7,
            height: TILE_SIZE * 0.7,
            speed: 3.0,
            maxBombs: 1,
            bombsPlaced: 0,
            bombCooldown: 0,
            bombRange: 1,
            health: 3,
            maxHealth: 5,
            hasShield: false,
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
