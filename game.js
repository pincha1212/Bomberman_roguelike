const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d', { alpha: false });

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
            exitPos: null,
            lastTime: 0,
            keys: {},
            touchControls: { x: 0, y: 0 },
            camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
            shakeTimer: 0,
            shakeIntensity: 0,
            animFrame: 0
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
            walkCycle: 0
        };

        window.addEventListener('keydown', (e) => {
            gameState.keys[e.code] = true;
            if((e.code === 'Space' || e.code === 'KeyZ') && gameState.isPlaying) {
                placeBomb();
            }
        });
        window.addEventListener('keyup', (e) => gameState.keys[e.code] = false);

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
            const blockDensity = Math.min(0.35 + (gameState.level * 0.03), 0.65);
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

            spawnEnemies();
            updateUI();
        }

        function spawnEnemies() {
            const count = Math.min(3 + Math.floor(gameState.level * 1.5), 12);
            for (let i = 0; i < count; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * (gameState.gridWidth - 2)) + 1;
                    y = Math.floor(Math.random() * (gameState.gridHeight - 2)) + 1;
                } while (gameState.grid[y][x] !== TYPES.EMPTY || (x <= 4 && y <= 4));
                
                // Enemy type selection
                let rand = Math.random();
                let type = ENEMY_TYPES.RASTRERO;
                if (gameState.level >= 2 && rand > 0.6) type = ENEMY_TYPES.VOLADOR;
                if (gameState.level >= 3 && rand > 0.85) type = ENEMY_TYPES.ESPECIAL;

                gameState.enemies.push({
                    x: x * TILE_SIZE + TILE_SIZE / 2,
                    y: y * TILE_SIZE + TILE_SIZE / 2,
                    width: TILE_SIZE * 0.75,
                    height: TILE_SIZE * 0.75,
                    type: type,
                    vx: type.speed * (Math.random() < 0.5 ? 1 : -1),
                    vy: 0,
                    changeTimer: Math.random() * 100
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

        function tryMovePlayer(dx, dy) {
            let nextX = player.x + dx;
            let nextY = player.y + dy;
            // Margen aumentado (de 6 a 10) para hacer que el jugador sea ligeramente más "fino" 
            // respecto a las paredes, facilitando enormemente la entrada a los pasillos.
            let margin = 10; 

            let pointsX = [
                {x: nextX + margin, y: player.y + margin},
                {x: nextX + player.width - margin, y: player.y + margin},
                {x: nextX + margin, y: player.y + player.height - margin},
                {x: nextX + player.width - margin, y: player.y + player.height - margin}
            ];

            let canMoveX = true;
            for (let p of pointsX) {
                if (isSolid(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE))) canMoveX = false;
            }

            let pointsY = [
                {x: player.x + margin, y: nextY + margin},
                {x: player.x + player.width - margin, y: nextY + margin},
                {x: player.x + margin, y: nextY + player.height - margin},
                {x: player.x + player.width - margin, y: nextY + player.height - margin}
            ];

            let canMoveY = true;
            for (let p of pointsY) {
                if (isSolid(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE))) canMoveY = false;
            }

            if (canMoveX) player.x = nextX;
            if (canMoveY) player.y = nextY;

            // --- SISTEMA DE DESLIZAMIENTO INTELIGENTE (Corner Cutting Assist) ---
            // Si el jugador se bloquea al intentar girar, verificamos qué esquina exacta está chocando
            // y lo deslizamos automáticamente hacia el lado libre para que doble perfecto.
            let slideSpeed = player.speed * 1.3; // Resbala un poco más rápido de lo que camina

            if (!canMoveX && dx !== 0) {
                // ¿Estamos chocando con la pared de arriba o la de abajo del pasillo?
                let hitTop = isSolid(Math.floor((nextX + (dx > 0 ? player.width - margin : margin)) / TILE_SIZE), Math.floor((player.y + margin) / TILE_SIZE));
                let hitBottom = isSolid(Math.floor((nextX + (dx > 0 ? player.width - margin : margin)) / TILE_SIZE), Math.floor((player.y + player.height - margin) / TILE_SIZE));
                
                if (hitTop && !hitBottom) {
                    player.y += slideSpeed; // Resbala hacia abajo para esquivar la pared superior
                } else if (!hitTop && hitBottom) {
                    player.y -= slideSpeed; // Resbala hacia arriba para esquivar la pared inferior
                } else {
                    // Respaldo: Atracción magnética al centro si está muy cerca (tolerancia ampliada)
                    let cellCenterY = Math.floor((player.y + player.height/2)/TILE_SIZE) * TILE_SIZE + TILE_SIZE/2;
                    let pCenterY = player.y + player.height/2;
                    if (Math.abs(cellCenterY - pCenterY) < 22 && Math.abs(cellCenterY - pCenterY) > 1) {
                        player.y += Math.sign(cellCenterY - pCenterY) * slideSpeed;
                    }
                }
            }
            
            if (!canMoveY && dy !== 0) {
                // ¿Estamos chocando con la pared izquierda o derecha del pasillo?
                let hitLeft = isSolid(Math.floor((player.x + margin) / TILE_SIZE), Math.floor((nextY + (dy > 0 ? player.height - margin : margin)) / TILE_SIZE));
                let hitRight = isSolid(Math.floor((player.x + player.width - margin) / TILE_SIZE), Math.floor((nextY + (dy > 0 ? player.height - margin : margin)) / TILE_SIZE));
                
                if (hitLeft && !hitRight) {
                    player.x += slideSpeed; // Resbala hacia la derecha
                } else if (!hitLeft && hitRight) {
                    player.x -= slideSpeed; // Resbala hacia la izquierda
                } else {
                    // Respaldo: Atracción magnética al centro (tolerancia ampliada)
                    let cellCenterX = Math.floor((player.x + player.width/2)/TILE_SIZE) * TILE_SIZE + TILE_SIZE/2;
                    let pCenterX = player.x + player.width/2;
                    if (Math.abs(cellCenterX - pCenterX) < 22 && Math.abs(cellCenterX - pCenterX) > 1) {
                        player.x += Math.sign(cellCenterX - pCenterX) * slideSpeed;
                    }
                }
            }

            if (canMoveX || canMoveY) player.isMoving = true;
        }

        function placeBomb() {
            if (player.bombsPlaced >= player.maxBombs) return;
            let gx = Math.floor((player.x + player.width/2) / TILE_SIZE);
            let gy = Math.floor((player.y + player.height/2) / TILE_SIZE);

            if (gameState.bombs.some(b => b.x === gx && b.y === gy)) return;

            gameState.bombs.push({
                x: gx, y: gy, range: player.bombRange, timer: 2000, scalePulse: 1.0
            });
            player.bombsPlaced++;
        }

        function explodeBomb(bombIndex) {
            let bomb = gameState.bombs[bombIndex];
            gameState.bombs.splice(bombIndex, 1);
            player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);

            triggerScreenShake(7, 300);
            addParticles((bomb.x + 0.5) * TILE_SIZE, (bomb.y + 0.5) * TILE_SIZE, '#f97316', 15);

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
                        addFloatingText('+10', (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#cbd5e1');
                        addParticles((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#b45309', 12);
                        
                        if (gameState.exitPos && gameState.exitPos.x === tx && gameState.exitPos.y === ty) {
                            gameState.grid[ty][tx] = TYPES.EXIT_OPEN;
                            addFloatingText('🚪 SALIDA!', (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#facc15');
                        } else if (Math.random() < 0.3) {
                            const ps = Object.keys(POWERUPS);
                            gameState.items.push({ x: tx, y: ty, type: POWERUPS[ps[Math.floor(Math.random() * ps.length)]] });
                        }
                        break;
                    }
                }
            }

            cells.forEach(c => {
                gameState.explosions.push({ x: c.x, y: c.y, timer: 450 });
            });
            updateUI();
        }

        function update(dt) {
            if (!gameState.isPlaying) return;
            gameState.animFrame++;

            // Shake countdown
            if (gameState.shakeTimer > 0) {
                gameState.shakeTimer -= dt;
            }

            // Player Touch or Keyboard movement
            let dx = gameState.touchControls.x;
            let dy = gameState.touchControls.y;

            if (dx === 0 && dy === 0) {
                if (gameState.keys['ArrowUp'] || gameState.keys['KeyW']) dy -= 1;
                if (gameState.keys['ArrowDown'] || gameState.keys['KeyS']) dy += 1;
                if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) dx -= 1;
                if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) dx += 1;
            }

            // Restringir a movimiento Ortogonal estricto (Norte, Sur, Este, Oeste)
            if (Math.abs(dx) > Math.abs(dy)) {
                dy = 0;
                dx = Math.sign(dx);
                player.dir = dx > 0 ? 'right' : 'left';
            } else if (Math.abs(dy) > 0) {
                dx = 0;
                dy = Math.sign(dy);
                player.dir = dy > 0 ? 'down' : 'up';
            }

            player.isMoving = false;
            if (dx !== 0 || dy !== 0) {
                tryMovePlayer(dx * player.speed, dy * player.speed);
            }

            if (player.isMoving) {
                player.walkCycle += dt * 0.015;
            }

            if (player.isInvincible) {
                player.invincibleTimer -= dt;
                if (player.invincibleTimer <= 0) player.isInvincible = false;
            }

            // Camera Target Interpolation (Smooth follow)
            let pxCenter = player.x + player.width / 2;
            let pyCenter = player.y + player.height / 2;
            
            gameState.camera.targetX = pxCenter - canvas.width / 2;
            gameState.camera.targetY = pyCenter - canvas.height / 2;

            // Clamp camera boundaries
            const maxCamX = gameState.gridWidth * TILE_SIZE - canvas.width;
            const maxCamY = gameState.gridHeight * TILE_SIZE - canvas.height;
            gameState.camera.targetX = Math.max(0, Math.min(gameState.camera.targetX, maxCamX));
            gameState.camera.targetY = Math.max(0, Math.min(gameState.camera.targetY, maxCamY));

            gameState.camera.x += (gameState.camera.targetX - gameState.camera.x) * 0.12;
            gameState.camera.y += (gameState.camera.targetY - gameState.camera.y) * 0.12;

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

                for (let j = gameState.enemies.length - 1; j >= 0; j--) {
                    let e = gameState.enemies[j];
                    // El enemigo tiene hitbox completo para que sea fácil matarlo con bombas
                    let eFullRect = { left: e.x - e.width/2, right: e.x + e.width/2, top: e.y - e.height/2, bottom: e.y + e.height/2 };
                    if (checkOverlap(eFullRect, expRect)) {
                        addParticles(e.x, e.y, e.type.color, 15);
                        gameState.enemies.splice(j, 1);
                        gameState.score += 100;
                        addFloatingText('+100', e.x, e.y, '#38bdf8');
                    }
                }

                if (exp.timer <= 0) gameState.explosions.splice(i, 1);
            }

            // Update Enemies
            gameState.enemies.forEach(e => {
                e.changeTimer -= dt * 0.1;
                if (e.changeTimer <= 0 || Math.random() < 0.02) {
                    e.changeTimer = 30 + Math.random() * 50;
                    if (Math.random() < 0.5) {
                        e.vx = e.type.speed * (Math.random() < 0.5 ? 1 : -1);
                        e.vy = 0;
                    } else {
                        e.vx = 0;
                        e.vy = e.type.speed * (Math.random() < 0.5 ? 1 : -1);
                    }
                }

                e.x += e.vx;
                if (isSolid(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE), e.type.canFly)) {
                    e.x -= e.vx; e.vx *= -1;
                }
                e.y += e.vy;
                if (isSolid(Math.floor(e.x / TILE_SIZE), Math.floor(e.y / TILE_SIZE), e.type.canFly)) {
                    e.y -= e.vy; e.vy *= -1;
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
                    
                    addParticles((it.x + 0.5) * TILE_SIZE, (it.y + 0.5) * TILE_SIZE, '#ffffff', 10);
                    gameState.items.splice(i, 1);
                    updateUI();
                }
            }

            // Update Particles
            for (let i = gameState.particles.length - 1; i >= 0; i--) {
                let p = gameState.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 1;
                if (p.life <= 0) gameState.particles.splice(i, 1);
            }

            // Update Floaters
            for (let i = gameState.floaters.length - 1; i >= 0; i--) {
                let f = gameState.floaters[i];
                f.y -= 0.8;
                f.opacity -= 0.02;
                f.life -= 1;
                if (f.life <= 0) gameState.floaters.splice(i, 1);
            }

            // Exit Check
            let pgx = Math.floor((player.x + player.width/2) / TILE_SIZE);
            let pgy = Math.floor((player.y + player.height/2) / TILE_SIZE);
            if (gameState.grid[pgy] && gameState.grid[pgy][pgx] === TYPES.EXIT_OPEN) {
                completeLevel();
            }
        }

        function checkOverlap(r1, r2) {
            return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
        }

        function takeDamage() {
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

            // Draw Mini-map in top corner
            drawMiniMap();
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

        function drawMiniMap() {
            const mapSize = 70;
            const padding = 10;
            const x = canvas.width - mapSize - padding;
            const y = padding;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(x, y, mapSize, mapSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeRect(x, y, mapSize, mapSize);

            let cellW = mapSize / gameState.gridWidth;
            let cellH = mapSize / gameState.gridHeight;

            for (let gy = 0; gy < gameState.gridHeight; gy++) {
                for (let gx = 0; gx < gameState.gridWidth; gx++) {
                    let tile = gameState.grid[gy][gx];
                    if (tile === TYPES.WALL) {
                        ctx.fillStyle = '#475569';
                        ctx.fillRect(x + gx * cellW, y + gy * cellH, cellW, cellH);
                    } else if (tile === TYPES.BLOCK) {
                        ctx.fillStyle = '#9a3412';
                        ctx.fillRect(x + gx * cellW, y + gy * cellH, cellW, cellH);
                    } else if (tile === TYPES.EXIT_OPEN) {
                        ctx.fillStyle = '#facc15';
                        ctx.fillRect(x + gx * cellW, y + gy * cellH, cellW, cellH);
                    }
                }
            }

            // Draw player on mini-map
            let pgx = (player.x + player.width/2) / TILE_SIZE;
            let pgy = (player.y + player.height/2) / TILE_SIZE;
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + pgx * cellW - 1.5, y + pgy * cellH - 1.5, 3, 3);
        }

        function gameLoop(timestamp) {
            let dt = timestamp - gameState.lastTime;
            gameState.lastTime = timestamp;
            if (dt > 100) dt = 16;

            update(dt);
            draw();

            if (gameState.isPlaying) {
                requestAnimationFrame(gameLoop);
            }
        }

        function updateUI() {
            document.getElementById('ui-health').innerText = player.health;
            document.getElementById('ui-score').innerText = gameState.score;
            document.getElementById('ui-level').innerText = gameState.level;
            document.getElementById('ui-bombs').innerText = player.maxBombs;
            document.getElementById('ui-range').innerText = player.bombRange;
            document.getElementById('ui-speed').innerText = (player.speed - 2).toFixed(1);
            
            const shieldBadge = document.getElementById('ui-shield-badge');
            if (player.hasShield) {
                shieldBadge.classList.remove('hidden');
            } else {
                shieldBadge.classList.add('hidden');
            }
        }

        function startGame() {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('level-complete-screen').classList.add('hidden');
            
            gameState.level = 1;
            gameState.score = 0;
            player.health = 3;
            player.maxBombs = 1;
            player.bombRange = 1;
            player.speed = 3.0;
            player.hasShield = false;
            
            initLevel();
            gameState.isPlaying = true;
            gameState.lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }

        function completeLevel() {
            gameState.isPlaying = false;
            gameState.level++;
            const screen = document.getElementById('level-complete-screen');
            const options = document.getElementById('upgrade-options');
            options.innerHTML = '';
            
            const upgs = [
                { name: '+1 BOMBA', desc: 'Más bombas simultáneas', action: () => player.maxBombs++ },
                { name: '+1 RANGO', desc: 'Fuego más extendido', action: () => player.bombRange++ },
                { name: 'VELOCIDAD', desc: 'Móvete más rápido', action: () => player.speed = Math.min(player.speed + 0.4, 5) },
                { name: 'ESCUDO', desc: 'Protección contra 1 golpe', action: () => player.hasShield = true }
            ];

            // Pick 3 random options
            upgs.sort(() => Math.random() - 0.5);
            upgs.slice(0, 3).forEach(u => {
                let card = document.createElement('div');
                card.className = 'upgrade-card';
                card.innerHTML = `<div class="font-bold text-xs text-yellow-400 mb-1">${u.name}</div><div class="text-3xs text-slate-300 text-center">${u.desc}</div>`;
                card.onclick = () => {
                    u.action();
                    screen.classList.add('hidden');
                    initLevel();
                    gameState.isPlaying = true;
                    gameState.lastTime = performance.now();
                    requestAnimationFrame(gameLoop);
                };
                options.appendChild(card);
            });
            screen.classList.remove('hidden');
        }

        function gameOver() {
            gameState.isPlaying = false;
            document.getElementById('go-level').innerText = gameState.level;
            document.getElementById('go-score').innerText = gameState.score;
            document.getElementById('game-over-screen').classList.remove('hidden');
        }

        document.getElementById('btn-start').addEventListener('click', startGame);
        document.getElementById('btn-restart').addEventListener('click', startGame);

        // Initial setup
        initLevel();
        draw();

        // Roguelike presentation layer: run identity + depth banner.
        const runBanner = document.getElementById('run-banner');
        let rogueRun = Number(localStorage.getItem('bombermanRogueRun') || 0);
        const originalStartGame = typeof startGame === 'function' ? startGame : null;
        function updateRogueBanner() {
            const depth = (typeof gameState !== 'undefined' && gameState.level) ? gameState.level : 1;
            if (runBanner) runBanner.textContent = `RUN ${String(rogueRun).padStart(2,'0')} · DEPTH ${String(depth).padStart(2,'0')}`;
        }
        if (runBanner) {
            const observer = new MutationObserver(updateRogueBanner);
            const levelNode = document.getElementById('ui-level');
            if (levelNode) observer.observe(levelNode, {childList:true,subtree:true,characterData:true});
            updateRogueBanner();
        }
        document.getElementById('btn-start')?.addEventListener('click', () => {
            rogueRun++;
            localStorage.setItem('bombermanRogueRun', rogueRun);
            updateRogueBanner();
        });
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            rogueRun++;
            localStorage.setItem('bombermanRogueRun', rogueRun);
            updateRogueBanner();
        });
