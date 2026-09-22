// Bomberman Roguelike v3.6 — Bombs, explosions, damage, enemies update and gameplay simulation
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

            // V3.6: la inmunidad tras recibir daño es temporal.
            // El contador se descuenta cada frame y se desactiva al llegar a cero.
            updatePlayerInvulnerability(dt);

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

        function updatePlayerInvulnerability(dt) {
            if (!player.isInvincible) return;

            player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
            if (player.invincibleTimer <= 0) {
                player.invincibleTimer = 0;
                player.isInvincible = false;
            }
        }

        function takeDamage() {
            // El bloqueo de daño se valida también aquí para evitar impactos
            // duplicados si dos fuentes coinciden en el mismo frame.
            if (player.isInvincible) return;
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

