// Bomberman Roguelike v3.6 — Bombs, explosions, damage, enemies update and gameplay simulation
        function explodeBomb(bombIndex) {
            const first = gameState.bombs[bombIndex];
            if (!first) return;

            // La cola evita recursión y hace que toda la cadena pase por la misma
            // lógica de explosión: bloques, botín, salida, puntuación y feedback.
            gameState.bombs.splice(bombIndex, 1);
            player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);

            const queue = [{ bomb: first, parent: null }];
            let detonatedCount = 0;

            while (queue.length) {
                const entry = queue.shift();
                const bomb = entry?.bomb;
                if (!bomb) continue;

                detonatedCount++;
                triggerScreenShake(detonatedCount === 1 ? 7 : 5, detonatedCount === 1 ? 300 : 220);
                sfx('boom');
                if (typeof feedbackExplosion === 'function') feedbackExplosion(bomb.x, bomb.y);
                addParticles((bomb.x + 0.5) * TILE_SIZE, (bomb.y + 0.5) * TILE_SIZE, '#f97316', detonatedCount === 1 ? 15 : 12);
                if (gameState.relics.some(r => r.id === 'ember_core')) gameState.score += 25;

                const blastId = ++gameState.blastSerial;
                const cells = calculateBombBlastCells(bomb);
                const blastKeys = new Set(cells.map(c => `${c.x},${c.y}`));
                // V3.12.3: algunas trampas reaccionan al paso de una explosión.
                if (typeof reactHazardsToBlast === 'function') reactHazardsToBlast(cells, bomb);

                for (const cell of cells) {
                    if (!cell.block) continue;
                    const tx = cell.x, ty = cell.y;
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
                }

                // Una bomba alcanzada por la llama queda marcada para la siguiente
                // iteración. No hay recursión ni detonación doble de la misma bomba.
                for (let i = gameState.bombs.length - 1; i >= 0; i--) {
                    const other = gameState.bombs[i];
                    if (!other || !blastKeys.has(`${other.x},${other.y}`)) continue;
                    gameState.bombs.splice(i, 1);
                    player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);
                    registerBombChainLink(bomb, other, detonatedCount + 1, detonatedCount + 1);
                    queue.push({ bomb: other, parent: bomb });
                }

                for (const cell of cells) {
                    gameState.explosions.push({
                        x: cell.x,
                        y: cell.y,
                        timer: 450,
                        blastId,
                        owner: bomb.owner || 'player'
                    });
                }
            }

            if (detonatedCount > 1) {
                addFloatingText(`CADENA ×${detonatedCount}`, (first.x + 0.5) * TILE_SIZE, (first.y - 0.15) * TILE_SIZE, '#fbbf24');
                addParticles((first.x + 0.5) * TILE_SIZE, (first.y + 0.5) * TILE_SIZE, '#fde68a', 8 + detonatedCount * 2);
            }
            updateUI(true);
        }

        function update(dt) {
            clampLargeEntities();
            if (!gameState.isPlaying || gameState.paused) return;
            gameState.animFrame++;
            updateCombatFeedback(dt);
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

            // V3.7: la cámara acompaña al personaje al recorrer sectores del mapa.
            // V3.12.4: la cámara no puede detener el game loop si el módulo no está disponible.
            if (typeof updateCamera === 'function') updateCamera(dt);

            updateAdaptiveInterface();

            // V3.10: manejo completo de bombas aislado.
            updateBombHandling(dt);

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
                if (explosionOverlapsRect(pHurtbox, exp, 5)) {
                    const damageSource = exp.owner === 'trap' ? 'trap' : 'explosion';
                    takeDamage(damageSource, (exp.x + .5) * TILE_SIZE, (exp.y + .5) * TILE_SIZE);
                }

                if (gameState.boss && !gameState.boss.defeated) {
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
                        triggerEnemyDefeatFeedback(e);
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

            // V3.11: IA de enemigos aislada y con pathfinding dosificado.
            updateEnemyAI(dt);

            // Contacto jugador-enemigo: separado del movimiento para que la IA
            // no pueda romper accidentalmente el sistema de daño.
            for (let j = gameState.enemies.length - 1; j >= 0; j--) {
                const e = gameState.enemies[j];
                if (!e) continue;
                const eHitbox = {
                    left: e.x - e.width * 0.3,
                    right: e.x + e.width * 0.3,
                    top: e.y - e.height * 0.3,
                    bottom: e.y + e.height * 0.3
                };
                if (checkOverlap(pHurtbox, eHitbox)) takeDamage('enemy', e.x, e.y);
            }

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

        function takeDamage(source='unknown', sourceX=player.x, sourceY=player.y) {
            if (!canApplyPlayerDamage()) return false;

            sfx('hurt');
            if (player.hasShield) {
                player.hasShield = false;
                player.isInvincible = true;
                player.invincibleTimer = 1000;
                addFloatingText('ESCUDO ROTO!', player.x, player.y, '#38bdf8');
                addParticles(player.x, player.y, '#38bdf8', 16);
                triggerPlayerDamageFeedback(source, sourceX, sourceY, false, true);
                triggerScreenShake(5, 200);
                updateUI(true);
                return true;
            }

            player.health--;
            player.isInvincible = true;
            player.invincibleTimer = 1500;
            const lethal = player.health <= 0;
            addParticles(player.x, player.y, '#ef4444', lethal ? 26 : 15);
            triggerPlayerDamageFeedback(source, sourceX, sourceY, lethal, false);
            triggerScreenShake(lethal ? 14 : 10, lethal ? 520 : 400);
            if (lethal) sfx('death');
            updateUI(true);
            if (lethal) gameOver();
            return true;
        }

