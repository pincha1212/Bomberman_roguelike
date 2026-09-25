// Bomberman Roguelike v4.1 — Bombs, explosions, damage and gameplay simulation
        function explodeBomb(bombIndex) {
            const first = gameState.bombs[bombIndex];
            if (!first) return;

            // La cola evita recursión y hace que toda la cadena pase por la misma
            // lógica de explosión: bloques, botín, salida, puntuación y feedback.
            gameState.bombs.splice(bombIndex, 1);
            if (first.countsTowardPlayerCapacity !== false) player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);

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
                addParticles((bomb.x + 0.5) * TILE_SIZE, (bomb.y + 0.5) * TILE_SIZE, 'particleFire', detonatedCount === 1 ? 15 : 12);
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
                    gameState.gridRevision = (gameState.gridRevision || 0) + 1;
                    if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
                    gameState.score += 10;
                    gameState.blocksBroken++;
                    const coins = Math.max(1, Math.round((1 + Math.random() * 2) * (1 + gameState.coinBonus) * gameState.roomType.coinMult));
                    gameState.coins += coins;
                    addFloatingText(`+10  +${coins}¢`, (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#fbbf24');
                    addParticles((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, 'particleBlock', 12);

                    if (gameState.exitPos && gameState.exitPos.x === tx && gameState.exitPos.y === ty) {
                        // v4.4: destruir el bloque de salida no alcanza para abrirla.
                        // Queda bloqueada hasta eliminar al último enemigo.
                        gameState.grid[ty][tx] = TYPES.EXIT_LOCKED;
                        if (typeof tryUnlockExitV44 === 'function') tryUnlockExitV44();
                        if (gameState.dungeonV44?.exitUnlocked) {
                            gameState.grid[ty][tx] = TYPES.EXIT_OPEN;
                            addFloatingText('🚪 SALIDA DESBLOQUEADA', (tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE, '#facc15');
                        }
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
                    if (other.state === 'moving' || other.motionState === 'moving') continue;
                    gameState.bombs.splice(i, 1);
                    if (other.countsTowardPlayerCapacity !== false) player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);
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
                addParticles((first.x + 0.5) * TILE_SIZE, (first.y + 0.5) * TILE_SIZE, 'particleImpact', 8 + detonatedCount * 2);
            }
            updateUI(true);
        }

        function update(dt) {
            clampLargeEntities();
            if (!gameState.isPlaying || gameState.paused) return;
            if (typeof tickRunClock === 'function') tickRunClock(dt);
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
            if (typeof playerFSMUpdate === 'function') playerFSMUpdate(dt);

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
                if (explosionOverlapsRect(pHurtbox, exp, typeof getPlayerExplosionInset === 'function' ? getPlayerExplosionInset(exp) : 5)) {
                    const damageSource = exp.owner === 'trap' ? 'trap' : 'explosion';
                    takeDamage(damageSource, (exp.x + .5) * TILE_SIZE, (exp.y + .5) * TILE_SIZE);
                }

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
                        triggerEnemyDefeatFeedback(e);
                        gameState.enemies.splice(j, 1);
                        const fireScoreMult = gameState.fireScoreMult || 1;
                        const killScore = Math.round(100 * gameState.killScoreMult * fireScoreMult * (e.elite ? 1.25 : 1));
                        const killCoins = Math.max(2, Math.round((2 + Math.random() * 3) * (1 + gameState.coinBonus) * gameState.roomType.coinMult));
                        gameState.score += killScore;
                        gameState.coins += killCoins;
                        gameState.totalKills++;
                        addFloatingText(`+${killScore}  +${killCoins}¢`, e.x, e.y, e.elite ? '#fb7185' : '#38bdf8');
                        if (typeof tryUnlockExitV44 === 'function') tryUnlockExitV44();
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
                    
                    addParticles((it.x + 0.5) * TILE_SIZE, (it.y + 0.5) * TILE_SIZE, 'particleLoot', 10);
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
            if (!p.isInvincible) return;

            p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
            if (p.invincibleTimer <= 0) {
                p.invincibleTimer = 0;
                p.isInvincible = false;
            }
        }

        function takeDamage(source='unknown', sourceX=null, sourceY=null) {
            const p = window.BOMBER_ENGINE?.getPlayer?.() || player;
            const gs = window.BOMBER_ENGINE?.getState?.() || gameState;
            const sx = sourceX == null ? p.x : sourceX;
            const sy = sourceY == null ? p.y : sourceY;
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
            if (lethal && typeof playerFSMDeath === 'function') playerFSMDeath(source);
            updateUI(true);
            if (lethal) gameOver(source);
            return true;
        }

