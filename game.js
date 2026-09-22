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
    const presets={bomb:[70,.08,'square'],boom:[55,.28,'sawtooth'],pickup:[520,.10,'sine'],hurt:[110,.18,'square'],exit:[330,.35,'triangle'],click:[220,.05,'square'],trap:[90,.22,'sawtooth'],alarm:[180,.16,'square'],boss:[62,.5,'sawtooth'],bossHit:[240,.10,'square'],bossRoar:[48,.65,'sawtooth'],bossCharge:[120,.22,'square'],bossWave:[75,.38,'triangle']};
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

        window.addEventListener('keydown', (e) => {
            gameState.keys[e.code] = true;
            if (['ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code)) gameState.lastMoveAxis = 'vertical';
            if (['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)) gameState.lastMoveAxis = 'horizontal';
            if((e.code === 'Space' || e.code === 'KeyZ') && gameState.isPlaying) {
                placeBomb();
            }
        });
        window.addEventListener('keyup', (e) => gameState.keys[e.code] = false);

        function togglePause() {
            if (!gameState.isPlaying) return;
            gameState.paused = !gameState.paused;
            const screen = document.getElementById('pause-screen');
            if (screen) screen.classList.toggle('hidden', !gameState.paused);
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
        });

        // Virtual Joystick setup
        const setupJoystick = () => {
            const zone = document.getElementById('joystick-zone');
            const knob = document.getElementById('joystick-knob');
            if (!zone || !knob) return;

            const maxRadius = 35;
            let joyActive = false;
            let joyCenterX = 0;
            let joyCenterY = 0;

            const updateJoyPosition = (clientX, clientY) => {
                let dx = clientX - joyCenterX;
                let dy = clientY - joyCenterY;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > maxRadius) {
                    dx = (dx / distance) * maxRadius;
                    dy = (dy / distance) * maxRadius;
                }

                knob.style.transform = `translate(${dx}px, ${dy}px)`;

                let normalizedX = dx / maxRadius;
                let normalizedY = dy / maxRadius;
                
                if (Math.abs(normalizedX) < 0.2) normalizedX = 0;
                if (Math.abs(normalizedY) < 0.2) normalizedY = 0;

                gameState.touchControls.x = normalizedX;
                gameState.touchControls.y = normalizedY;
            };

            const start = (e) => {
                e.preventDefault();
                joyActive = true;
                const rect = zone.getBoundingClientRect();
                joyCenterX = rect.left + rect.width / 2;
                joyCenterY = rect.top + rect.height / 2;
                const touch = e.type === 'touchstart' ? e.touches[0] : e;
                updateJoyPosition(touch.clientX, touch.clientY);
            };

            const move = (e) => {
                if (!joyActive) return;
                e.preventDefault();
                const touch = e.type === 'touchmove' ? e.touches[0] : e;
                updateJoyPosition(touch.clientX, touch.clientY);
            };

            const end = (e) => {
                joyActive = false;
                knob.style.transform = `translate(0px, 0px)`;
                gameState.touchControls.x = 0;
                gameState.touchControls.y = 0;
            };

            zone.addEventListener('touchstart', start, { passive: false });
            zone.addEventListener('touchmove', move, { passive: false });
            zone.addEventListener('touchend', end, { passive: false });
            zone.addEventListener('touchcancel', end, { passive: false });
            
            zone.addEventListener('mousedown', start);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', end);
        };

        setupJoystick();
        
        const setupBombButton = () => {
            const bombBtn = document.getElementById('btn-bomb-mobile');
            if(!bombBtn) return;
            const triggerBomb = (e) => {
                e.preventDefault();
                if(gameState.isPlaying) placeBomb();
            };
            bombBtn.addEventListener('touchstart', triggerBomb, {passive: false});
            bombBtn.addEventListener('mousedown', triggerBomb);
        };
        setupBombButton();

        function initLevel() {
            // Expand map grid size with higher levels
            gameState.roomType = getRoomForDepth(gameState.level);
            gameState.gridWidth = 15 + Math.floor((gameState.level - 1) / 2) * 2;
            gameState.gridHeight = 15 + Math.floor((gameState.level - 1) / 2) * 2;
            gameState.gridWidth = Math.min(gameState.gridWidth, 25);
            gameState.gridHeight = Math.min(gameState.gridHeight, 25);

            gameState.grid = Array(gameState.gridHeight).fill().map(() => Array(gameState.gridWidth).fill(TYPES.EMPTY));
            gameState.bombs = [];
            gameState.explosions = [];
            gameState.enemies = [];
            gameState.items = [];
            gameState.particles = [];
            gameState.floaters = [];
            gameState.hazards = [];
            gameState.boss = null;
            gameState.bossProjectiles = [];
            gameState.roomTime = Math.max(35000, 80000 - gameState.level * 1500);
            gameState.threatLevel = 0;
            gameState.nextReinforcement = gameState.roomTime - 18000;

            // Spawn player top-left corner
            player.x = TILE_SIZE + (TILE_SIZE - player.width)/2;
            player.y = TILE_SIZE + (TILE_SIZE - player.height)/2;

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

            // Destructible soft blocks
            const blockDensity = Math.max(0.25, Math.min(0.72, 0.35 + (gameState.level * 0.03) + gameState.roomType.blockBonus));
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.EMPTY) {
                        // Safe spawn zone around player
                        if ((x <= 2 && y <= 2) || (x === 1 && y === 3) || (x === 3 && y === 1)) {
                            continue;
                        }
                        if (Math.random() < blockDensity) {
                            gameState.grid[y][x] = TYPES.BLOCK;
                        }
                    }
                }
            }

            // Hide exit portal under a random block
            let blocks = [];
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.BLOCK) blocks.push({x, y});
                }
            }
            
            if (blocks.length > 0) {
                let exitBlock = blocks[Math.floor(Math.random() * blocks.length)];
                gameState.exitPos = {x: exitBlock.x, y: exitBlock.y};
            } else {
                gameState.exitPos = {x: gameState.gridWidth - 2, y: gameState.gridHeight - 2};
                gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            }

            if (gameState.roomType.id === 'BOSS') {
                setupBossArena();
            }

            if (gameState.roomType.id === 'SHRINE') {
                player.health = Math.min(player.health + 1, player.maxHealth);
                player.hasShield = true;
                addFloatingText('SANTUARIO: +1 VIDA + ESCUDO', player.x, player.y, '#67e8f9');
            }

            generateHazards();
            spawnEnemies();
            showRoomIntro();
            updateRoguePresentation();
            updateUI();
        }

        function setupBossArena() {
            // El jefe necesita espacio real: despejamos una arena central sin tocar las paredes estructurales.
            const cx = Math.floor(gameState.gridWidth / 2);
            const cy = Math.floor(gameState.gridHeight / 2);
            for (let y = cy - 3; y <= cy + 3; y++) {
                for (let x = cx - 3; x <= cx + 3; x++) {
                    if (x > 0 && x < gameState.gridWidth - 1 && y > 0 && y < gameState.gridHeight - 1) {
                        if (!(x % 2 === 0 && y % 2 === 0)) gameState.grid[y][x] = TYPES.EMPTY;
                    }
                }
            }
            gameState.exitPos = {x: gameState.gridWidth - 2, y: gameState.gridHeight - 2};
            if (gameState.grid[gameState.exitPos.y][gameState.exitPos.x] === TYPES.WALL) gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EMPTY;
            gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_LOCKED;
            gameState.enemies = [];
            const maxHp = 28 + gameState.level * 3;
            gameState.boss = {
                x: cx * TILE_SIZE + TILE_SIZE / 2,
                y: cy * TILE_SIZE + TILE_SIZE / 2,
                width: TILE_SIZE * 2.35,
                height: TILE_SIZE * 2.35,
                hp: maxHp,
                maxHp,
                phase: 1,
                vx: 1.05,
                vy: 0,
                moveTimer: 0,
                attackTimer: 1500,
                summonTimer: 6200,
                waveTimer: 3200,
                chargeTimer: 5200,
                chargeTime: 0,
                charging: false,
                chargeVx: 0,
                chargeVy: 0,
                invuln: 0,
                flash: 0,
                roarTimer: 0,
                defeated: false
            };
            sfx('bossRoar');
            triggerScreenShake(8, 350);
            addFloatingText('☠ COLOSO DE LA PROFUNDIDAD', gameState.boss.x, gameState.boss.y - 72, '#f43f5e');
        }

        function damageBoss(amount = 1) {
            const b = gameState.boss;
            if (!b || b.defeated || b.invuln > 0) return;
            b.hp -= amount;
            b.invuln = 220;
            b.flash = 180;
            gameState.score += 75;
            sfx('bossHit');
            triggerScreenShake(3, 100);
            addFloatingText(`-${amount}`, b.x, b.y - b.height / 2, '#fb7185');
            if (b.hp <= 0) defeatBoss();
        }

        function defeatBoss() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            b.defeated = true;
            b.hp = 0;
            gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            gameState.coins += 30;
            gameState.score += 1500;
            addParticles(b.x, b.y, '#f43f5e', 55);
            addFloatingText('☠ JEFE DERROTADO', b.x, b.y - 50, '#facc15');
            addFloatingText('+30¢  +1500', b.x, b.y + 20, '#fbbf24');
            sfx('boom');
            triggerScreenShake(12, 500);
            updateUI();
        }

        function bossShoot() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            const dx = player.x + player.width / 2 - b.x;
            const dy = player.y + player.height / 2 - b.y;
            const len = Math.hypot(dx, dy) || 1;
            const speed = 2.8 + b.phase * 0.35;
            if(gameState.bossProjectiles.length < largeSupport.maxBossProjectiles) gameState.bossProjectiles.push({x:b.x, y:b.y, vx:dx/len*speed, vy:dy/len*speed, life:4200, radius:9, kind:'orb'});
            if (b.phase >= 2) {
                const spread = 0.16;
                for (const angle of [-spread, spread]) {
                    const c=Math.cos(angle), q=Math.sin(angle);
                    if(gameState.bossProjectiles.length < largeSupport.maxBossProjectiles) gameState.bossProjectiles.push({x:b.x, y:b.y, vx:(dx/len*c-dy/len*q)*speed*.92, vy:(dx/len*q+dy/len*c)*speed*.92, life:3900, radius:7, kind:'orb'});
                }
            }
            sfx('alarm');
        }

        function bossShockwave() {
            const b=gameState.boss;
            if(!b || b.defeated) return;
            const count=b.phase>=3?16:(b.phase>=2?12:10);
            const speed=2.0+b.phase*.35;
            for(let i=0;i<count;i++){
                const a=(Math.PI*2/count)*i;
                if(gameState.bossProjectiles.length < largeSupport.maxBossProjectiles) gameState.bossProjectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:3000,radius:8,kind:'wave'});
            }
            addFloatingText('¡OLA DE CHOQUE!', b.x, b.y-b.height*.55, '#c084fc');
            triggerScreenShake(5,220);
            sfx('bossWave');
        }

        function bossStartCharge() {
            const b=gameState.boss;
            if(!b || b.defeated || b.charging) return;
            const dx=player.x+player.width/2-b.x, dy=player.y+player.height/2-b.y;
            const len=Math.hypot(dx,dy)||1;
            b.charging=true; b.chargeTime=950; b.chargeVx=dx/len*(3.2+b.phase*.55); b.chargeVy=dy/len*(3.2+b.phase*.55);
            sfx('bossCharge'); addFloatingText('¡CARGA!', b.x, b.y-b.height*.55, '#fb7185');
        }

        function bossSummon() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            const candidates=[];
            const bx=Math.floor(b.x/TILE_SIZE), by=Math.floor(b.y/TILE_SIZE);
            for(let y=1;y<gameState.gridHeight-1;y++) for(let x=1;x<gameState.gridWidth-1;x++) {
                if(gameState.grid[y][x]!==TYPES.EMPTY) continue;
                const d=Math.abs(x-bx)+Math.abs(y-by);
                if(d>=4 && d<10 && !gameState.enemies.some(e=>Math.floor(e.x/TILE_SIZE)===x && Math.floor(e.y/TILE_SIZE)===y)) candidates.push({x,y,d});
            }
            candidates.sort((a,z)=>z.d-a.d);
            const count=Math.min(2,candidates.length, Math.max(0,largeSupport.maxEnemies-gameState.enemies.length));
            for(let i=0;i<count;i++) {
                const c=candidates[i], type=i%2===0?ENEMY_TYPES.RASTRERO:ENEMY_TYPES.VOLADOR;
                const sp=type.speed*gameState.roomType.enemySpeedMult*(1+gameState.threatLevel*.04)*1.15;
                gameState.enemies.push({x:c.x*TILE_SIZE+TILE_SIZE/2,y:c.y*TILE_SIZE+TILE_SIZE/2,width:TILE_SIZE*.75,height:TILE_SIZE*.75,type,vx:sp,vy:0,baseSpeed:sp,changeTimer:25,elite:true,reinforcement:true});
            }
            if(count) addFloatingText('¡REFUERZOS DEL JEFE!', b.x, b.y-55, '#c084fc');
        }

        function updateBoss(dt) {
            const b=gameState.boss;
            if(!b || b.defeated) return;
            b.invuln=Math.max(0,b.invuln-dt); b.flash=Math.max(0,b.flash-dt); b.roarTimer=Math.max(0,b.roarTimer-dt);
            b.attackTimer-=dt; b.summonTimer-=dt; b.waveTimer-=dt; b.chargeTimer-=dt; b.moveTimer-=dt;
            const ratio=b.hp/b.maxHp;
            b.phase=ratio<=.33?3:(ratio<=.66?2:1);
            const scale=Math.min(dt/16.6667,2);

            if(b.charging){
                b.chargeTime-=dt;
                const nx=b.x+b.chargeVx*scale, ny=b.y+b.chargeVy*scale;
                if(!rectCollidesSolid(nx-b.width/2,ny-b.height/2,b.width,b.height)) { b.x=nx;b.y=ny; }
                else { b.charging=false;b.chargeTimer=Math.max(1800,4200-b.phase*500);bossShockwave(); }
                if(b.chargeTime<=0){b.charging=false;b.chargeTimer=Math.max(1800,4200-b.phase*500);}
            } else {
                if(b.moveTimer<=0){
                    b.moveTimer=760-Math.min(260,b.phase*80);
                    const dx=player.x+player.width/2-b.x, dy=player.y+player.height/2-b.y;
                    if(Math.abs(dx)>Math.abs(dy)){b.vx=Math.sign(dx)*(0.8+b.phase*.3);b.vy=0;} else {b.vx=0;b.vy=Math.sign(dy)*(0.8+b.phase*.3);}
                }
                const nx=b.x+b.vx*scale, ny=b.y+b.vy*scale;
                if(!rectCollidesSolid(nx-b.width/2,ny-b.height/2,b.width,b.height)){b.x=nx;b.y=ny;} else {b.vx*=-1;b.vy*=-1;}
            }

            if(b.attackTimer<=0){ bossShoot(); b.attackTimer=Math.max(700,1700-b.phase*260); }
            if(b.waveTimer<=0){ bossShockwave(); b.waveTimer=Math.max(2300,4300-b.phase*650); }
            if(b.summonTimer<=0){ bossSummon(); b.summonTimer=Math.max(3000,6500-b.phase*850); }
            if(b.chargeTimer<=0 && b.phase>=2){ bossStartCharge(); }
            if(b.phase===3 && b.roarTimer<=0){ sfx('bossRoar');b.roarTimer=7200;triggerScreenShake(4,180); }

            const hit={left:b.x-b.width*.38,right:b.x+b.width*.38,top:b.y-b.height*.38,bottom:b.y+b.height*.38};
            const ph={left:player.x+5,right:player.x+player.width-5,top:player.y+5,bottom:player.y+player.height-5};
            if(!player.isInvincible && checkOverlap(hit,ph)) takeDamage();
            for(let i=gameState.bossProjectiles.length-1;i>=0;i--){
                const p=gameState.bossProjectiles[i]; p.x+=p.vx*scale;p.y+=p.vy*scale;p.life-=dt;
                const gx=Math.floor(p.x/TILE_SIZE),gy=Math.floor(p.y/TILE_SIZE);
                if(isSolid(gx,gy)){gameState.bossProjectiles.splice(i,1);continue;}
                const pr={left:p.x-p.radius,right:p.x+p.radius,top:p.y-p.radius,bottom:p.y+p.radius};
                if(!player.isInvincible && checkOverlap(ph,pr)){takeDamage();gameState.bossProjectiles.splice(i,1);continue;}
                if(p.life<=0) gameState.bossProjectiles.splice(i,1);
            }
        }

        function drawBoss() {
            const b=gameState.boss; if(!b || b.defeated) return;
            drawLargeBossShadow(b);
            ctx.save();
            const pulse=1+Math.sin(gameState.animFrame*.10)*.035;
            const rage=b.phase===3;
            ctx.translate(b.x,b.y);ctx.scale(pulse,pulse);
            ctx.globalAlpha=b.flash>0 ? .55 : 1;
            const aura=ctx.createRadialGradient(0,0,20,0,0,b.width*.8);
            aura.addColorStop(0,rage?'rgba(244,63,94,.20)':'rgba(168,85,247,.16)');
            aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,b.width*.8,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(0,0,0,.58)';ctx.beginPath();ctx.ellipse(0,b.height*.43,b.width*.48,10,0,0,Math.PI*2);ctx.fill();
            // Massive armored body
            ctx.fillStyle=rage?'#581c1c':'#312e81';
            ctx.strokeStyle=rage?'#fb7185':'#a78bfa';ctx.lineWidth=5;
            ctx.beginPath();ctx.roundRect(-b.width*.43,-b.height*.42,b.width*.86,b.height*.84,18);ctx.fill();ctx.stroke();
            // Shoulder armor
            ctx.fillStyle=rage?'#991b1b':'#4c1d95';
            ctx.beginPath();ctx.arc(-b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.arc(b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.fill();
            // Face plate
            ctx.fillStyle='#111827';ctx.fillRect(-b.width*.25,-b.height*.19,b.width*.50,b.height*.30);
            ctx.fillStyle=rage?'#fda4af':'#e9d5ff';ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;
            ctx.fillRect(-b.width*.16,-b.height*.10,b.width*.10,7);ctx.fillRect(b.width*.06,-b.height*.10,b.width*.10,7);ctx.shadowBlur=0;
            // Crown / horns
            ctx.fillStyle='#facc15';ctx.beginPath();ctx.moveTo(-b.width*.28,-b.height*.38);ctx.lineTo(-b.width*.17,-b.height*.62);ctx.lineTo(-b.width*.04,-b.height*.38);ctx.lineTo(b.width*.08,-b.height*.62);ctx.lineTo(b.width*.25,-b.height*.38);ctx.closePath();ctx.fill();
            // Core
            ctx.fillStyle=rage?'#ef4444':'#c084fc';ctx.shadowBlur=18;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(0,b.height*.15,b.width*.10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            // Phase markers
            ctx.fillStyle='#fef08a';for(let i=0;i<b.phase;i++){ctx.beginPath();ctx.arc(-10+(i-1)*10,b.height*.34,3,0,Math.PI*2);ctx.fill();}
            if(b.charging){ctx.strokeStyle='#fef08a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,b.width*.58,0,Math.PI*2);ctx.stroke();}
            ctx.restore();
            gameState.bossProjectiles.forEach(p=>{
                ctx.fillStyle=p.kind==='wave'?'#f0abfc':'#c084fc';
                if(!perf.lowQuality){ctx.shadowBlur=p.kind==='wave'?16:12;ctx.shadowColor=ctx.fillStyle;} else {ctx.shadowBlur=0;}
                ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            });
        }

        function generateHazards() {
            const candidates = [];
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    if ((x <= 3 && y <= 3) || (gameState.exitPos && gameState.exitPos.x === x && gameState.exitPos.y === y)) continue;
                    candidates.push({x, y});
                }
            }
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            const count = Math.min(candidates.length, Math.max(2, 2 + Math.floor(gameState.level / 2) + (gameState.roomType.id === 'CURSED' ? 2 : 0)));
            gameState.hazards = candidates.slice(0, count).map(h => ({ ...h, triggered: false, visible: false, flashTimer: 0, phase: Math.random() * Math.PI * 2 }));
        }

        function spawnReinforcement(count = 1) {
            const candidates = [];
            const px = Math.floor((player.x + player.width / 2) / TILE_SIZE);
            const py = Math.floor((player.y + player.height / 2) / TILE_SIZE);
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    const distance = Math.abs(x - px) + Math.abs(y - py);
                    if (distance >= 6 && !gameState.enemies.some(e => Math.floor(e.x/TILE_SIZE) === x && Math.floor(e.y/TILE_SIZE) === y)) candidates.push({x,y,distance});
                }
            }
            candidates.sort((a,b) => b.distance - a.distance);
            for (let i = 0; i < Math.min(count, candidates.length); i++) {
                const c = candidates[i];
                const roll = Math.random();
                let type = ENEMY_TYPES.RASTRERO;
                if (gameState.level >= 3 && roll > .68) type = ENEMY_TYPES.ESPECIAL;
                else if (gameState.level >= 2 && roll > .38) type = ENEMY_TYPES.VOLADOR;
                const speed = type.speed * gameState.roomType.enemySpeedMult * (1 + gameState.threatLevel * .04);
                gameState.enemies.push({ x:c.x*TILE_SIZE+TILE_SIZE/2, y:c.y*TILE_SIZE+TILE_SIZE/2, width:TILE_SIZE*.75, height:TILE_SIZE*.75, type, vx:speed*(Math.random()<.5?-1:1), vy:0, baseSpeed:speed, changeTimer:15+Math.random()*35, elite:false, reinforcement:true });
                addFloatingText('REFUERZO', c.x*TILE_SIZE+TILE_SIZE/2, c.y*TILE_SIZE+TILE_SIZE/2, '#fb7185');
            }
            if (count > 0) sfx('alarm');
        }

        function updateRoomThreat(dt) {
            gameState.roomTime -= dt;
            gameState.nextReinforcement -= dt;
            if (gameState.roomType.id === 'BOSS') return;
            if (gameState.nextReinforcement <= 0) {
                gameState.threatLevel++;
                const amount = Math.min(1 + Math.floor(gameState.threatLevel / 2), 3);
                spawnReinforcement(amount);
                gameState.nextReinforcement = Math.max(12000, 24000 - gameState.level * 500);
                triggerScreenShake(3, 140);
            }
        }

        function updateHazards(dt) {
            // V3.3: las trampas son de un solo uso. Permanecen ocultas hasta activarse.
            for (const h of gameState.hazards) {
                if (h.flashTimer > 0) h.flashTimer = Math.max(0, h.flashTimer - dt);
            }

            if (player.isInvincible) return;

            const pcx = player.x + player.width / 2, pcy = player.y + player.height / 2;
            for (const h of gameState.hazards) {
                // Una trampa ya activada nunca vuelve a causar daño.
                if (h.triggered) continue;

                const hx = (h.x + .5) * TILE_SIZE, hy = (h.y + .5) * TILE_SIZE;
                const dx = Math.abs(pcx - hx), dy = Math.abs(pcy - hy);
                if (dx < TILE_SIZE * .32 && dy < TILE_SIZE * .32) {
                    h.triggered = true;
                    h.visible = true;
                    h.flashTimer = 1200;
                    addParticles(hx, hy, '#ef4444', 12);
                    addFloatingText('TRAMPA ACTIVADA', pcx, pcy, '#ef4444');
                    sfx('trap');
                    takeDamage();
                    break;
                }
            }
        }

        function drawHazards() {
            // Solo se muestran después de haber sido activadas.
            for (const h of gameState.hazards) {
                if (!h.visible) continue;
                const x = h.x * TILE_SIZE;
                const y = h.y * TILE_SIZE;
                const cx = x + TILE_SIZE / 2;
                const cy = y + TILE_SIZE / 2;
                const active = h.flashTimer > 0;
                const pulse = active ? (0.5 + Math.sin(gameState.animFrame * 0.35 + h.phase) * 0.5) : 0.18;

                ctx.save();
                ctx.fillStyle = active ? `rgba(239,68,68,${0.16 + pulse * 0.20})` : 'rgba(127,29,29,.12)';
                ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
                ctx.strokeStyle = active ? '#ef4444' : '#7f1d1d';
                ctx.lineWidth = active ? 3 : 2;
                ctx.strokeRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);

                ctx.strokeStyle = active ? '#fca5a5' : '#991b1b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 12, cy - 12);
                ctx.lineTo(cx + 12, cy + 12);
                ctx.moveTo(cx + 12, cy - 12);
                ctx.lineTo(cx - 12, cy + 12);
                ctx.stroke();

                if (active) {
                    ctx.fillStyle = '#fecaca';
                    ctx.font = '9px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.fillText('!', cx, cy + 3);
                }
                ctx.restore();
            }
        }

        function spawnEnemies() {
            const baseCount = Math.min(3 + Math.floor(gameState.level * 1.5), 12);
            const count = Math.max(1, Math.round(baseCount * gameState.roomType.enemyMult));
            const candidates = [];
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.EMPTY && !(x <= 4 && y <= 4)) candidates.push({x, y});
                }
            }
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }

            for (let i = 0; i < Math.min(count, candidates.length); i++) {
                const {x, y} = candidates[i];
                let rand = Math.random();
                let type = ENEMY_TYPES.RASTRERO;
                if (gameState.level >= 2 && rand > 0.6) type = ENEMY_TYPES.VOLADOR;
                if (gameState.level >= 3 && rand > 0.85) type = ENEMY_TYPES.ESPECIAL;
                const speed = type.speed * gameState.roomType.enemySpeedMult;

                gameState.enemies.push({
                    x: x * TILE_SIZE + TILE_SIZE / 2,
                    y: y * TILE_SIZE + TILE_SIZE / 2,
                    width: TILE_SIZE * 0.75,
                    height: TILE_SIZE * 0.75,
                    type: type,
                    vx: speed * (Math.random() < 0.5 ? 1 : -1),
                    vy: 0,
                    baseSpeed: speed,
                    changeTimer: Math.random() * 100,
                    elite: gameState.roomType.id === 'ELITE' || gameState.roomType.id === 'CURSED'
                });
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
        }

        function addParticles(x, y, color, count = 8) {
            const room = Math.max(0, largeSupport.particleBudget - gameState.particles.length);
            count = Math.min(count, room, perf.lowQuality ? 5 : count);
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

        function isSolid(gx, gy, canFly = false) {
            if (gx < 0 || gx >= gameState.gridWidth || gy < 0 || gy >= gameState.gridHeight) return true;
            let tile = gameState.grid[gy][gx];
            if (canFly) return tile === TYPES.WALL;
            return tile === TYPES.WALL || tile === TYPES.BLOCK;
        }

        // V3.2.4 — MOVEMENT UPDATE
        // Movimiento continuo cardinal asistido. La cuadrícula SOLO define las paredes.
        // El personaje usa una hurtbox de movimiento más pequeña que el sprite,
        // con un pequeño "skin" de seguridad para evitar enganches en esquinas.
        // V3.4 — ASSISTED MOTION
        // El jugador sigue moviéndose SOLO en los cuatro ejes cardinales.
        // La asistencia no crea diagonales: ayuda a centrar carriles, memoriza
        // brevemente un giro y suaviza aceleración/frenado/reversa.
        const MOVEMENT_COLLISION_INSET = 5;
        const MOVEMENT_WALL_PADDING = 1.5;
        const MOVEMENT_EPSILON = 0.001;
        const MOTION = {
            maxStep: 2.0,
            acceleration: 0.95,
            braking: 1.35,
            reverseBraking: 1.8,
            turnAssistRadius: 8.5,
            turnSnapRadius: 4.5,
            inputBufferMs: 115,
            stopEpsilon: 0.035,
            axisDeadzone: 0.18
        };

        function getMovementHitbox(x, y, width, height) {
            const inset = MOVEMENT_COLLISION_INSET;
            const pad = MOVEMENT_WALL_PADDING;
            return {
                left: x + inset + pad,
                right: x + width - inset - pad,
                top: y + inset + pad,
                bottom: y + height - inset - pad
            };
        }

        function rectCollidesSolid(x, y, width, height) {
            const box = getMovementHitbox(x, y, width, height);
            if (box.right <= box.left || box.bottom <= box.top) return false;

            const minGX = Math.max(0, Math.floor(box.left / TILE_SIZE));
            const maxGX = Math.min(gameState.gridWidth - 1, Math.floor((box.right - MOVEMENT_EPSILON) / TILE_SIZE));
            const minGY = Math.max(0, Math.floor(box.top / TILE_SIZE));
            const maxGY = Math.min(gameState.gridHeight - 1, Math.floor((box.bottom - MOVEMENT_EPSILON) / TILE_SIZE));

            for (let gy = minGY; gy <= maxGY; gy++) {
                for (let gx = minGX; gx <= maxGX; gx++) {
                    if (!isSolid(gx, gy)) continue;
                    const wallLeft = gx * TILE_SIZE;
                    const wallRight = wallLeft + TILE_SIZE;
                    const wallTop = gy * TILE_SIZE;
                    const wallBottom = wallTop + TILE_SIZE;
                    if (box.right > wallLeft + MOVEMENT_EPSILON &&
                        box.left < wallRight - MOVEMENT_EPSILON &&
                        box.bottom > wallTop + MOVEMENT_EPSILON &&
                        box.top < wallBottom - MOVEMENT_EPSILON) return true;
                }
            }
            return false;
        }

        function moveAxisWithCollision(axis, amount) {
            if (!amount) return false;
            const steps = Math.max(1, Math.ceil(Math.abs(amount) / MOTION.maxStep));
            const step = amount / steps;
            let moved = false;
            for (let i = 0; i < steps; i++) {
                const nextX = axis === 'x' ? player.x + step : player.x;
                const nextY = axis === 'y' ? player.y + step : player.y;
                if (rectCollidesSolid(nextX, nextY, player.width, player.height)) break;
                player.x = nextX;
                player.y = nextY;
                moved = true;
            }
            return moved;
        }

        function getLaneTarget(axis) {
            const center = axis === 'x' ? player.y + player.height / 2 : player.x + player.width / 2;
            const cell = Math.floor(center / TILE_SIZE);
            const laneCenter = cell * TILE_SIZE + TILE_SIZE / 2;
            return axis === 'x' ? laneCenter - player.height / 2 : laneCenter - player.width / 2;
        }

        function alignToLane(axis) {
            const target = getLaneTarget(axis);
            const current = axis === 'x' ? player.y : player.x;
            const delta = target - current;
            const abs = Math.abs(delta);
            if (abs > MOTION.turnAssistRadius) return false;

            // Corrección asistida por etapas: el jugador se detiene en su eje
            // actual y se centra suavemente en el carril. Nunca se aplican X e Y
            // en el mismo paso, por lo que no existe movimiento diagonal.
            if (abs <= MOTION.turnSnapRadius) {
                const candidateX = axis === 'x' ? player.x : target;
                const candidateY = axis === 'x' ? target : player.y;
                if (!rectCollidesSolid(candidateX, candidateY, player.width, player.height)) {
                    if (axis === 'x') player.y = target;
                    else player.x = target;
                    return true;
                }
            }

            const correction = Math.min(1.8, abs);
            const moved = axis === 'x'
                ? moveAxisWithCollision('y', Math.sign(delta) * correction)
                : moveAxisWithCollision('x', Math.sign(delta) * correction);
            return moved && Math.abs(target - (axis === 'x' ? player.y : player.x)) <= MOTION.turnSnapRadius;
        }

        function getCardinalInput() {
            let dx = gameState.touchControls.x;
            let dy = gameState.touchControls.y;

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
            const frameScale = Math.min(dt / 16.6667, 2);
            player._frameScale = frameScale;
            const input = getCardinalInput();

            if (input.axis) {
                player.inputBuffer = input;
                player.inputBufferTimer = MOTION.inputBufferMs;
            } else if (player.inputBufferTimer > 0) {
                player.inputBufferTimer -= dt;
                if (player.inputBufferTimer <= 0) player.inputBuffer = null;
            }

            const desired = input.axis ? input : player.inputBuffer;
            const currentAxis = Math.abs(player.vx) > 0.01 ? 'x' : Math.abs(player.vy) > 0.01 ? 'y' : null;
            let axis = currentAxis;

            if (!desired) {
                if (currentAxis === 'x') player.vx = approach(player.vx, 0, MOTION.braking * frameScale);
                if (currentAxis === 'y') player.vy = approach(player.vy, 0, MOTION.braking * frameScale);
            } else if (!currentAxis) {
                axis = desired.axis;
            } else if (currentAxis !== desired.axis) {
                // Para girar: primero frena y centra el carril; luego cambia de eje.
                const centered = alignToLane(desired.axis);
                const velocity = currentAxis === 'x' ? player.vx : player.vy;
                if (centered || Math.abs(velocity) <= MOTION.stopEpsilon) {
                    if (currentAxis === 'x') player.vx = 0;
                    else player.vy = 0;
                    axis = desired.axis;
                } else {
                    if (currentAxis === 'x') player.vx = approach(player.vx, 0, MOTION.reverseBraking * frameScale);
                    else player.vy = approach(player.vy, 0, MOTION.reverseBraking * frameScale);
                    axis = currentAxis;
                }
            } else {
                axis = desired.axis;
            }

            // Un solo componente de velocidad puede existir en todo momento.
            if (axis === 'x') {
                player.vy = 0;
                const target = desired ? desired.dir * player.speed : 0;
                player.vx = approach(player.vx, target, (desired ? MOTION.acceleration : MOTION.braking) * frameScale);
                if (Math.abs(player.vx) < MOTION.stopEpsilon) player.vx = 0;
                if (player.vx !== 0) player.dir = player.vx < 0 ? 'left' : 'right';
            } else if (axis === 'y') {
                player.vx = 0;
                const target = desired ? desired.dir * player.speed : 0;
                player.vy = approach(player.vy, target, (desired ? MOTION.acceleration : MOTION.braking) * frameScale);
                if (Math.abs(player.vy) < MOTION.stopEpsilon) player.vy = 0;
                if (player.vy !== 0) player.dir = player.vy < 0 ? 'up' : 'down';
            }

            let moved = false;
            if (player.vx) moved = moveAxisWithCollision('x', player.vx * frameScale);
            else if (player.vy) moved = moveAxisWithCollision('y', player.vy * frameScale);

            if (!moved && (player.vx || player.vy)) {
                // Frente bloqueado: corta solo el eje activo. No empuja al jugador
                // contra la pared ni genera desplazamiento diagonal accidental.
                if (player.vx) player.vx = 0;
                if (player.vy) player.vy = 0;
            }
            player.isMoving = moved;
            if (moved) player.walkCycle += dt * 0.015;
        }

        function approach(value, target, amount) {
            if (value < target) return Math.min(value + amount, target);
            if (value > target) return Math.max(value - amount, target);
            return target;
        }

        function placeBomb() {
            if (player.bombsPlaced >= player.maxBombs) return;
            let gx = Math.floor((player.x + player.width/2) / TILE_SIZE);
            let gy = Math.floor((player.y + player.height/2) / TILE_SIZE);

            if (gameState.bombs.some(b => b.x === gx && b.y === gy)) return;

            gameState.bombs.push({
                x: gx, y: gy, range: player.bombRange, timer: gameState.roomType.id === 'CURSED' ? 1600 : 2000, scalePulse: 1.0
            });
            sfx('bomb');
            player.bombsPlaced++;
        }

        function explodeBomb(bombIndex) {
            let bomb = gameState.bombs[bombIndex];
            gameState.bombs.splice(bombIndex, 1);
            player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);

            triggerScreenShake(7, 300);
            sfx('boom');
            addParticles((bomb.x + 0.5) * TILE_SIZE, (bomb.y + 0.5) * TILE_SIZE, '#f97316', 15);
            if (gameState.relics.some(r => r.id === 'ember_core')) gameState.score += 25;

            let cells = [{x: bomb.x, y: bomb.y}];
            const dirs = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];

            for (let dir of dirs) {
                for (let r = 1; r <= bomb.range; r++) {
                    let tx = bomb.x + dir.dx * r;
                    let ty = bomb.y + dir.dy * r;
                    if (tx < 0 || tx >= gameState.gridWidth || ty < 0 || ty >= gameState.gridHeight) break;
                    let type = gameState.grid[ty][tx];
                    if (type === TYPES.WALL) break;
                    
                    cells.push({x: tx, y: ty});
                    
                    if (type === TYPES.BLOCK) {
                        gameState.grid[ty][tx] = TYPES.EMPTY;
                        gameState.score += 10;
                        gameState.blocksBroken++;
                        const coins = Math.max(1, Math.round((1 + Math.random() * 2) * (1 + gameState.coinBonus) * gameState.roomType.coinMult));
                        gameState.coins += coins;
                        addFloatingText(`+10  +${coins}¢`, (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#fbbf24');
                        addParticles((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#b45309', 12);
                        
                        if (gameState.exitPos && gameState.exitPos.x === tx && gameState.exitPos.y === ty) {
                            gameState.grid[ty][tx] = TYPES.EXIT_OPEN;
                            addFloatingText('🚪 SALIDA!', (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#facc15');
                        } else if (Math.random() < gameState.roomType.dropChance) {
                            const ps = Object.keys(POWERUPS);
                            gameState.items.push({ x: tx, y: ty, type: POWERUPS[ps[Math.floor(Math.random() * ps.length)]] });
                        }
                        if (getAvailableRelics().length && Math.random() < (gameState.roomType.id === 'TREASURE' ? 0.10 : 0.035)) {
                            const relicPool = getAvailableRelics();
                            const relic = relicPool[Math.floor(Math.random() * relicPool.length)];
                            gameState.items.push({ x: tx, y: ty, type: 'RELIC', relicId: relic.id });
                        }
                        break;
                    }
                }
            }

            // Reacción en cadena: cualquier bomba alcanzada detona inmediatamente.
            const chainedBombs = gameState.bombs.filter(other => cells.some(c => c.x === other.x && c.y === other.y));
            chainedBombs.forEach(other => {
                const chainIndex = gameState.bombs.indexOf(other);
                if (chainIndex >= 0) explodeBomb(chainIndex);
            });

            cells.forEach(c => {
                gameState.explosions.push({ x: c.x, y: c.y, timer: 450 });
            });
            updateUI();
        }

        function update(dt) {
            clampLargeEntities();
            if (!gameState.isPlaying || gameState.paused) return;
            gameState.animFrame++;
            renderImmersion();
            updateRoomThreat(dt);
            updateHazards(dt);
            updateBoss(dt);

            // Shake countdown
            if (gameState.shakeTimer > 0) {
                gameState.shakeTimer -= dt;
            }

            // V3.4: movimiento asistido cardinal. Nunca se combinan X e Y.
            updatePlayerMovement(dt);

            updateAdaptiveInterface();

            // Update Bombs
            for (let i = gameState.bombs.length - 1; i >= 0; i--) {
                let b = gameState.bombs[i];
                b.timer -= dt;
                if (b.timer <= 0) explodeBomb(i);
            }

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
                let expRect = { 
                    left: exp.x * TILE_SIZE + 4, 
                    right: (exp.x+1) * TILE_SIZE - 4, 
                    top: exp.y * TILE_SIZE + 4, 
                    bottom: (exp.y+1) * TILE_SIZE - 4 
                };
                
                // Usamos el pHurtbox reducido para ver si el fuego te toca
                if (!player.isInvincible && checkOverlap(pHurtbox, expRect)) takeDamage();

                if (gameState.boss && !gameState.boss.defeated) {
                    const b = gameState.boss;
                    const bossRect = { left:b.x-b.width/2, right:b.x+b.width/2, top:b.y-b.height/2, bottom:b.y+b.height/2 };
                    if (checkOverlap(bossRect, expRect)) damageBoss(1);
                }

                for (let j = gameState.enemies.length - 1; j >= 0; j--) {
                    let e = gameState.enemies[j];
                    // El enemigo tiene hitbox completo para que sea fácil matarlo con bombas
                    let eFullRect = { left: e.x - e.width/2, right: e.x + e.width/2, top: e.y - e.height/2, bottom: e.y + e.height/2 };
                    if (checkOverlap(eFullRect, expRect)) {
                        addParticles(e.x, e.y, e.type.color, 15);
                        gameState.enemies.splice(j, 1);
                        const killScore = Math.round(100 * gameState.killScoreMult * (e.elite ? 1.25 : 1));
                        const killCoins = Math.max(2, Math.round((2 + Math.random() * 3) * (1 + gameState.coinBonus) * gameState.roomType.coinMult));
                        gameState.score += killScore;
                        gameState.coins += killCoins;
                        gameState.totalKills++;
                        addFloatingText(`+${killScore}  +${killCoins}¢`, e.x, e.y, e.elite ? '#fb7185' : '#38bdf8');
                    }
                }

                if (exp.timer <= 0) gameState.explosions.splice(i, 1);
            }

            // Update Enemies
            gameState.enemies.forEach(e => {
                e.changeTimer -= dt * 0.1;
                if (e.changeTimer <= 0) {
                    e.changeTimer = 30 + Math.random() * 50;
                    if (Math.random() < 0.5) {
                        e.vx = e.type.speed * gameState.roomType.enemySpeedMult * (1 + gameState.threatLevel * 0.04) * (Math.random() < 0.5 ? 1 : -1);
                        e.vy = 0;
                    } else {
                        e.vx = 0;
                        e.vy = e.type.speed * gameState.roomType.enemySpeedMult * (1 + gameState.threatLevel * 0.04) * (Math.random() < 0.5 ? 1 : -1);
                    }
                }

                const enemyFrameScale = Math.min(dt / 16.6667, 2);
                e.x += e.vx * enemyFrameScale;
                if (isSolid(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE), e.type.canFly)) {
                    e.x -= e.vx * enemyFrameScale; e.vx *= -1;
                }
                e.y += e.vy * enemyFrameScale;
                if (isSolid(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE), e.type.canFly)) {
                    e.y -= e.vy * enemyFrameScale; e.vy *= -1;
                }

                // Hitbox interna del enemigo para dañar al jugador (más pequeña que el visual)
                let eHitbox = { 
                    left: e.x - e.width * 0.3, 
                    right: e.x + e.width * 0.3, 
                    top: e.y - e.height * 0.3, 
                    bottom: e.y + e.height * 0.3 
                };
                
                // Comprobamos la colisión usando las cajas reducidas de ambos
                if (!player.isInvincible && checkOverlap(pHurtbox, eHitbox)) takeDamage();
            });

            // Items pickup
            for (let i = gameState.items.length - 1; i >= 0; i--) {
                let it = gameState.items[i];
                let itRect = { left: it.x * TILE_SIZE, right: (it.x+1)*TILE_SIZE, top: it.y*TILE_SIZE, bottom: (it.y+1)*TILE_SIZE };
                if (checkOverlap(pRect, itRect)) {
                    if (it.type === POWERUPS.BOMB_UP) { player.maxBombs++; addFloatingText('+1 BOMBA!', player.x, player.y, '#facc15'); }
                    if (it.type === POWERUPS.FIRE_UP) { player.bombRange++; addFloatingText('+1 RANGO!', player.x, player.y, '#f97316'); }
                    if (it.type === POWERUPS.SPEED_UP) { player.speed = Math.min(player.speed + 0.4, 5); addFloatingText('+VELOCIDAD!', player.x, player.y, '#10b981'); }
                    if (it.type === POWERUPS.HEALTH_UP) { player.health = Math.min(player.health + 1, player.maxHealth); addFloatingText('+1 VIDA!', player.x, player.y, '#ef4444'); }
                    if (it.type === POWERUPS.SHIELD_UP) { player.hasShield = true; addFloatingText('ESCUDO ACTIVO!', player.x, player.y, '#38bdf8'); }
                    if (it.type === 'RELIC') {
                        const relic = RELICS.find(r => r.id === it.relicId);
                        if (relic) grantRelic(relic);
                    }
                    
                    addParticles((it.x + 0.5) * TILE_SIZE, (it.y + 0.5) * TILE_SIZE, '#ffffff', 10);
                    gameState.items.splice(i, 1);
                    sfx('pickup');
                    updateUI();
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

        function takeDamage() {
            sfx('hurt');
            if (player.hasShield) {
                player.hasShield = false;
                player.isInvincible = true;
                player.invincibleTimer = 1000;
                addFloatingText('ESCUDO ROTO!', player.x, player.y, '#38bdf8');
                triggerScreenShake(5, 200);
                updateUI();
                return;
            }

            player.health--;
            player.isInvincible = true;
            player.invincibleTimer = 1500;
            triggerScreenShake(10, 400);
            addParticles(player.x, player.y, '#ef4444', 15);
            updateUI();
            if (player.health <= 0) gameOver();
        }

        function draw() {
            ctx.fillStyle = '#090d16';
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

            // Draw Dungeon Floor Grid
            for (let y = 0; y < gameState.gridHeight; y++) {
                for (let x = 0; x < gameState.gridWidth; x++) {
                    if (!gameState.grid[y]) continue;
                    let px = x * TILE_SIZE, py = y * TILE_SIZE;
                    let isAlt = (x + y) % 2 === 0;
                    
                    // Suelo cuadriculado detallado
                    ctx.fillStyle = isAlt ? '#0f172a' : '#1e293b';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.fillRect(px, py, TILE_SIZE, 2);
                    ctx.fillRect(px, py, 2, TILE_SIZE);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
                    ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);

                    let tile = gameState.grid[y][x];
                    if (tile === TYPES.WALL) {
                        drawSteelWall(px, py);
                    } else if (tile === TYPES.BLOCK) {
                        drawBrickBlock(px, py);
                    } else if (tile === TYPES.EXIT_OPEN) {
                        drawExitPortal(px, py);
                    }
                }
            }

            // V3.3: las trampas aparecen visualmente solo después de activarse.
            drawHazards();

            // Draw Items / Powerups
            gameState.items.forEach(it => {
                drawPowerupSprite(it.x * TILE_SIZE, it.y * TILE_SIZE, it.type);
            });

            // Draw Bombs
            gameState.bombs.forEach(b => {
                drawBombSprite((b.x + 0.5) * TILE_SIZE, (b.y + 0.5) * TILE_SIZE, b);
            });

            // Draw Explosions
            gameState.explosions.forEach(exp => {
                drawExplosionSprite(exp.x * TILE_SIZE, exp.y * TILE_SIZE);
            });

            // Draw Enemies
            gameState.enemies.forEach(e => {
                drawEnemySprite(e);
            });

            // Draw Boss
            drawBoss();

            // Draw Player Bomberman
            if (!player.isInvincible || Math.floor(gameState.animFrame / 4) % 2 === 0) {
                drawBombermanSprite(player.x, player.y);
            }

            // Draw Particles
            gameState.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });

            // Draw Floater Texts
            gameState.floaters.forEach(f => {
                ctx.font = '10px "Press Start 2P"';
                ctx.fillStyle = f.color;
                ctx.globalAlpha = Math.max(0, f.opacity);
                ctx.fillText(f.text, f.x, f.y);
                ctx.globalAlpha = 1.0;
            });

            ctx.restore();

            drawAmbientDust();
            drawLighting();
        }

        function drawSteelWall(x, y) {
            // Pilar 3D Reforzado
            ctx.fillStyle = '#475569'; // Top Base
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#94a3b8'; // Top Highlight
            ctx.fillRect(x, y, TILE_SIZE, 3);
            ctx.fillRect(x, y, 3, TILE_SIZE);
            ctx.fillStyle = '#334155'; // Sombra inferior/derecha
            ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
            ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
            
            // Bisel interior
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
            
            // Remaches
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 10, y + 10, 2, 2);
            ctx.fillRect(x + TILE_SIZE - 12, y + TILE_SIZE - 12, 2, 2);
        }

        function drawBrickBlock(x, y) {
            // Cajas de madera (Crates) destructibles
            ctx.fillStyle = '#b45309'; // Marrón base
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            
            // Bordes de madera
            ctx.fillStyle = '#f59e0b'; // Borde claro
            ctx.fillRect(x, y, TILE_SIZE, 3);
            ctx.fillRect(x, y, 3, TILE_SIZE);
            ctx.fillStyle = '#78350f'; // Borde oscuro
            ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
            ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);

            // Patrón de cruz
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 6);
            ctx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
            ctx.moveTo(x + TILE_SIZE - 6, y + 6);
            ctx.lineTo(x + 6, y + TILE_SIZE - 6);
            ctx.stroke();
            
            // Refuerzo central
            ctx.fillStyle = '#451a03';
            ctx.fillRect(x + TILE_SIZE/2 - 4, y + TILE_SIZE/2 - 4, 8, 8);
        }

        function drawExitPortal(x, y) {
            let pulse = Math.sin(gameState.animFrame * 0.1) * 3;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE*0.35 + pulse, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText('🚪', x + 10, y + 32);
        }

        function drawBombermanSprite(x, y) {
            ctx.save();
            let bounce = Math.sin(player.walkCycle * 4) * (player.isMoving ? 3 : 1);
            let py = y + bounce;

            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(x + player.width/2, y + player.height, player.width/2.2, 5, 0, 0, Math.PI*2);
            ctx.fill();

            // Burbuja de Escudo
            if (player.hasShield) {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(x + player.width/2, py + player.height/2, player.width*0.8, 0, Math.PI*2);
                ctx.stroke();
            }

            // Traje (Azul)
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(x + 6, py + 12, player.width - 12, player.height - 16);
            
            // Cinturón
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 6, py + 22, player.width - 12, 4);
            // Hebilla
            ctx.fillStyle = '#facc15';
            if (player.dir === 'down') {
                ctx.fillRect(x + player.width/2 - 4, py + 21, 8, 6);
            } else if (player.dir === 'left') {
                ctx.fillRect(x + 4, py + 21, 4, 6);
            } else if (player.dir === 'right') {
                ctx.fillRect(x + player.width - 8, py + 21, 4, 6);
            }

            // Casco (Blanco)
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(x + player.width/2, py + 10, 14, 0, Math.PI*2);
            ctx.fill();

            // Rostro Direccional
            if (player.dir === 'down') {
                ctx.fillStyle = '#ffedd5';
                ctx.fillRect(x + player.width/2 - 9, py + 4, 18, 11);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(x + player.width/2 - 5, py + 7, 3, 6);
                ctx.fillRect(x + player.width/2 + 2, py + 7, 3, 6);
            } else if (player.dir === 'left') {
                ctx.fillStyle = '#ffedd5';
                ctx.fillRect(x + player.width/2 - 12, py + 4, 14, 11);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(x + player.width/2 - 7, py + 7, 3, 6);
            } else if (player.dir === 'right') {
                ctx.fillStyle = '#ffedd5';
                ctx.fillRect(x + player.width/2 - 2, py + 4, 14, 11);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(x + player.width/2 + 4, py + 7, 3, 6);
            }

            // Antena
            ctx.fillStyle = '#94a3b8'; 
            ctx.fillRect(x + player.width/2 - 2, py - 6, 4, 4);
            ctx.fillStyle = '#ec4899'; 
            ctx.beginPath();
            ctx.arc(x + player.width/2, py - 8, 5, 0, Math.PI*2);
            ctx.fill();

            // Guantes
            ctx.fillStyle = '#ec4899';
            if (player.dir !== 'right') { 
                ctx.beginPath(); ctx.arc(x + 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }
            if (player.dir !== 'left') { 
                ctx.beginPath(); ctx.arc(x + player.width - 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }

            // Pies (Zapatos Rojos) animando
            ctx.fillStyle = '#dc2626';
            let leftFootY = py + player.height - 4 + (player.isMoving && Math.floor(player.walkCycle*4)%2===0 ? -4 : 0);
            let rightFootY = py + player.height - 4 + (player.isMoving && Math.floor(player.walkCycle*4)%2===1 ? -4 : 0);
            
            if (player.dir === 'right') {
                ctx.beginPath(); ctx.ellipse(x + player.width/2 - 2, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + player.width/2 + 6, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else if (player.dir === 'left') {
                ctx.beginPath(); ctx.ellipse(x + player.width/2 - 6, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + player.width/2 + 2, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.ellipse(x + 8, leftFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(x + player.width - 8, rightFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
            }

            ctx.restore();
        }

        function drawEnemySprite(e) {
            ctx.save();
            if (e.elite) {
                ctx.strokeStyle = gameState.roomType.color;
                ctx.globalAlpha = 0.45 + Math.sin(gameState.animFrame * 0.15) * 0.1;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y, TILE_SIZE * 0.48, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            let floaty = e.type.canFly ? Math.sin((gameState.animFrame + e.x) * 0.1) * 4 : Math.sin((gameState.animFrame + e.x) * 0.3) * 2;
            
            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.height/2, e.width/2, 4, 0, 0, Math.PI*2);
            ctx.fill();

            // Cuerpo
            ctx.fillStyle = e.type.color;
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

            // Ojos mirando a la dirección de movimiento
            let eyeOffsetX = e.vx > 0 ? 3 : (e.vx < 0 ? -3 : 0);
            
            ctx.fillStyle = '#ffffff'; 
            ctx.beginPath();
            ctx.arc(e.x - 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.arc(e.x + 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = '#000000'; 
            ctx.beginPath();
            ctx.arc(e.x - 3 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.arc(e.x + 5 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.fill();

            // Cejas enojadas para los Rastreros (Rojos)
            if (e.type.name === 'Rastrero') {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(e.x - 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x - 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.moveTo(e.x + 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x + 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawBombSprite(cx, cy, b) {
            let scale = 1.0 + Math.sin(gameState.animFrame * 0.2) * 0.08;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);

            // Sombra bomba
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(0, TILE_SIZE*0.3, TILE_SIZE*0.3, 4, 0, 0, Math.PI*2); ctx.fill();

            // Cuerpo brillante
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, TILE_SIZE*0.35, 0, Math.PI*2);
            ctx.fill();
            
            // Reflejo
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(-6, -6, TILE_SIZE*0.1, 0, Math.PI*2);
            ctx.fill();

            // Tapa y mecha
            ctx.fillStyle = '#64748b';
            ctx.fillRect(-4, -TILE_SIZE*0.38, 8, 6);

            let sparkColor = gameState.animFrame % 4 < 2 ? '#facc15' : '#ef4444';
            ctx.fillStyle = sparkColor;
            ctx.beginPath();
            ctx.arc(0, -TILE_SIZE*0.45, 5, 0, Math.PI*2);
            ctx.fill();

            ctx.restore();
        }

        function drawExplosionSprite(x, y) {
            let size = TILE_SIZE;
            let pulse = Math.sin(gameState.animFrame * 0.5) * 4;
            
            ctx.fillStyle = 'rgba(220, 38, 38, 0.8)'; // Fuego exterior
            ctx.fillRect(x + 2 - pulse/2, y + 2 - pulse/2, size - 4 + pulse, size - 4 + pulse);
            
            ctx.fillStyle = '#f97316'; // Fuego medio
            ctx.fillRect(x + 6 - pulse/2, y + 6 - pulse/2, size - 12 + pulse, size - 12 + pulse);
            
            ctx.fillStyle = '#fef08a'; // Núcleo
            ctx.fillRect(x + 12 - pulse/2, y + 12 - pulse/2, size - 24 + pulse, size - 24 + pulse);
        }

        function drawPowerupSprite(x, y, type) {
            let floaty = Math.sin((gameState.animFrame + x) * 0.1) * 3;
            if (type === 'RELIC') {
                ctx.fillStyle = '#3b1d6b';
                ctx.fillRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                const relic = RELICS.find(r => gameState.items.find(it => it.x * TILE_SIZE === x && it.y * TILE_SIZE === y && it.relicId === r.id)?.id === r.id);
                ctx.font = '14px "Press Start 2P"';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(relic?.icon || '✦', x + 11, y + 31 + floaty);
                return;
            }
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);

            ctx.font = '14px "Press Start 2P"';
            let icon = '💣';
            if (type === POWERUPS.FIRE_UP) icon = '🔥';
            if (type === POWERUPS.SPEED_UP) icon = '👟';
            if (type === POWERUPS.HEALTH_UP) icon = '❤️';
            if (type === POWERUPS.SHIELD_UP) icon = '🛡️';
            ctx.fillText(icon, x + 10, y + 30 + floaty);
        }


        function gameLoop(timestamp) {
            let dt = timestamp - gameState.lastTime;
            gameState.lastTime = timestamp;
            if (dt > 100) dt = 16;

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
                requestAnimationFrame(gameLoop);
            }
        }

        function updateUI(force = false) {
            const now = performance.now();
            // DOM writes are expensive on mobile/low-end hardware; HUD does not need 60 updates/sec.
            if (!force && now - perf.lastUi < 100) return;
            perf.lastUi = now;

            UI['ui-health'].innerText = player.health;
            UI['ui-score'].innerText = gameState.score;
            UI['ui-level'].innerText = gameState.level;
            UI['ui-bombs'].innerText = player.maxBombs;
            UI['ui-range'].innerText = player.bombRange;
            UI['ui-speed'].innerText = (player.speed - 2).toFixed(1);
            UI['ui-coins'].innerText = gameState.coins;
            UI['ui-relics'].innerText = gameState.relics.length;
            if (UI['ui-timer']) UI['ui-timer'].innerText = `${Math.max(0, Math.ceil(gameState.roomTime / 1000))}s`;
            if (UI['ui-threat']) UI['ui-threat'].innerText = gameState.threatLevel;

            if (UI['ui-shield-badge']) UI['ui-shield-badge'].classList.toggle('hidden', !player.hasShield);

            const b = gameState.boss;
            const visible = !!b && !b.defeated;
            if (UI['boss-hud']) UI['boss-hud'].classList.toggle('hidden', !visible);
            if (visible) {
                if (UI['boss-bar']) UI['boss-bar'].style.width = `${Math.max(0, b.hp / b.maxHp * 100)}%`;
                if (UI['boss-phase']) UI['boss-phase'].textContent = `FASE ${b.phase}`;
            }

            if (UI['room-banner']) {
                UI['room-banner'].textContent = `${gameState.roomType.icon} ${gameState.roomType.name} · ${gameState.roomType.subtitle}`;
                UI['room-banner'].style.setProperty('--room-accent', gameState.roomType.color);
            }
            updateRoguePresentation();
            if (UI['relic-strip']) UI['relic-strip'].innerHTML = gameState.relics.map(r => `<span class="relic-chip" title="${r.desc}">${r.icon} ${r.name}</span>`).join('');
        }

        function updateRoguePresentation() {
            const runNode = UI['run-banner'];
            if (runNode) runNode.textContent = `RUN ${String(gameState.runNumber || 1).padStart(2, '0')} · DEPTH ${String(gameState.level).padStart(2, '0')}`;
        }

        function startGame() {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('level-complete-screen').classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');

            gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0) + 1;
            localStorage.setItem('bombermanRogueRun', gameState.runNumber);
            gameState.level = 1;
            gameState.score = 0;
            gameState.coins = 0;
            gameState.relics = [];
            gameState.coinBonus = 0;
            gameState.killScoreMult = 1;
            gameState.rerollDiscount = 0;
            gameState.rerolls = 1;
            gameState.blocksBroken = 0;
            gameState.totalKills = 0;
            gameState.hazards = [];
            gameState.roomTime = 0;
            gameState.threatLevel = 0;
            gameState.nextReinforcement = 20000;
            gameState.paused = false;
            player.health = 3;
            player.maxHealth = 5;
            player.maxBombs = 1;
            player.bombRange = 1;
            player.speed = 3.0;
            player.hasShield = false;

            initLevel();
            gameState.isPlaying = true;
            gameState.lastTime = performance.now();
            updateRoguePresentation();
            requestAnimationFrame(gameLoop);
        }

        function buildRewardChoices() {
            const choices = [];
            const availableRelics = getAvailableRelics().map(relic => ({
                id: `relic_${relic.id}`, kind: 'RELIC', rarity: relic.rarity,
                name: `${relic.icon} ${relic.name}`, desc: relic.desc, relic
            }));
            const pool = [...REWARDS, ...availableRelics];
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

        function startNextDepth() {
            gameState.level++;
            document.getElementById('level-complete-screen').classList.add('hidden');
            initLevel();
            gameState.isPlaying = true;
            gameState.paused = false;
            gameState.lastTime = performance.now();
            requestAnimationFrame(gameLoop);
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
                    <div class="reward-name">${reward.name}</div>
                    <div class="reward-desc">${reward.desc}</div>
                `;
                card.addEventListener('click', () => {
                    applyReward(reward);
                    startNextDepth();
                }, { once: true });
                options.appendChild(card);
            });

            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => {
                gameState.coins += 15;
                startNextDepth();
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
                card.innerHTML = `<div class="reward-rarity">${reward.rarity}</div><div class="reward-name">${reward.name}</div><div class="reward-desc">${reward.desc}</div>`;
                card.addEventListener('click', () => { applyReward(reward); startNextDepth(); }, { once: true });
                options.appendChild(card);
            });
            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => { gameState.coins += 15; startNextDepth(); }, { once: true });
            footer.appendChild(skip);
            updateUI();
        }

        function gameOver() {
            gameState.isPlaying = false;
            gameState.paused = false;
            const finalDepth = gameState.level;
            gameState.bestDepth = Math.max(gameState.bestDepth, finalDepth);
            localStorage.setItem('bombermanBestDepth', gameState.bestDepth);
            const bestScore = Math.max(Number(localStorage.getItem('bombermanBestScore') || 0), gameState.score);
            localStorage.setItem('bombermanBestScore', bestScore);
            document.getElementById('go-level').innerText = finalDepth;
            document.getElementById('go-score').innerText = gameState.score;
            document.getElementById('go-coins').innerText = gameState.coins;
            document.getElementById('go-relics').innerText = gameState.relics.length;
            document.getElementById('go-best').innerText = gameState.bestDepth;
            document.getElementById('game-over-screen').classList.remove('hidden');
        }

        document.getElementById('btn-start').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-restart').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-resume')?.addEventListener('click', togglePause);

        // Initial setup
        gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0) + 1;
        initLevel();
        updateRoguePresentation();
        updateUI();
        draw();
