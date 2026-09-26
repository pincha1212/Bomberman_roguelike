// Bomberman Roguelike v4.1 — Bombs, explosions, damage and gameplay simulation
        function explodeBomb(bombIndex) {
            const first = gameState.bombs[bombIndex];
            if (!first) return;

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
                triggerScreenShake(detonatedCount === 1 ? 7 : 5, detonatedCount === 1 ? 300 : 220);
                if (typeof feedbackExplosion === 'function') feedbackExplosion(bomb.x, bomb.y);
                addParticles((bomb.x + 0.5) * TILE_SIZE, (bomb.y + 0.5) * TILE_SIZE, 'particleFire', detonatedCount === 1 ? 15 : 12);
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

            // Fuente única de actualización para power-ups universales.
            // Se ejecuta tanto en gameplay normal como en ?test=1.
            if (typeof gameplayPowerupUpdateV676 === 'function') gameplayPowerupUpdateV676(dt);
            if (typeof tickRunClock === 'function') tickRunClock(dt);
            gameState.animFrame++;
            updateCombatFeedback(dt);
            renderImmersion();

            // V3.6: la inmunidad tras recibir daño es temporal.
            // El contador se descuenta cada frame y se desactiva al llegar a cero.
            updatePlayerInvulnerability(dt);

            updateRoomThreat(dt);
            updateHazards(dt);
            if (typeof materialUpdateV60 === 'function') materialUpdateV60(dt);
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
                        if (typeof tryUnlockExitV44 === 'function') tryUnlockExitV44();
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
                if (!e) continue;
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
                    if (typeof applyPowerupV67 === 'function') applyPowerupV67(it.type);
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
            const testLabImmortal = gs?.testLabV673?.active === true && gs?.testLabV673?.immortal === true;
            if (testLabImmortal) p.health = Math.max(1, Number(p.health) || 1);
            const lethal = !testLabImmortal && p.health <= 0;
            addParticles(p.x, p.y, 'particleDanger', lethal ? 26 : 15);
            triggerPlayerDamageFeedback(source, sx, sy, lethal, false);
            triggerScreenShake(lethal ? 14 : 10, lethal ? 520 : 400);
            if (lethal) sfx('death');
            if (lethal && typeof playerFSMDeath === 'function') playerFSMDeath(source);
            updateUI(true);
            if (typeof gameplayPowerupOnDamageV676 === 'function') gameplayPowerupOnDamageV676();
            if (lethal) gameOver(source);
            return true;
        }

