// Bomberman Roguelike v3.11 — Enemy spawning and enemy setup
        function spawnEnemies() {
            const diff = gameState.difficulty || (typeof getDifficultyV323 === 'function' ? getDifficultyV323(gameState.level) : null);
            const maxEnemies = diff?.maxEnemies || largeSupport.maxEnemies;
            const fixedV44 = gameState.dungeonV44?.fixedEnemyCount && gameState.roomType.id !== 'BOSS';
            const count = fixedV44
                ? Math.min(maxEnemies, getDungeonEnemyCountV44(gameState.level))
                : Math.min(maxEnemies, Math.max(1, Math.round(Math.min(3 + Math.floor(gameState.level * 1.5), 12) * gameState.roomType.enemyMult * (diff?.enemyCountMult || 1))));
            const candidates = [];
            const px = Math.floor((player.x + player.width / 2) / TILE_SIZE);
            const py = Math.floor((player.y + player.height / 2) / TILE_SIZE);
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    if (gameState.roomDesign?.secretInterior?.has(`${x},${y}`)) continue;
                    const distance = Math.abs(x - px) + Math.abs(y - py);
                    if (distance >= 7) candidates.push({x, y, distance});
                }
            }
            // V3.13: priorizamos celdas de arenas de combate, pero mantenemos
            // variación aleatoria dentro de cada grupo.
            const combatCandidates = candidates.filter(c => gameState.roomDesign?.combatCells?.has(`${c.x},${c.y}`));
            const otherCandidates = candidates.filter(c => !gameState.roomDesign?.combatCells?.has(`${c.x},${c.y}`));
            for (let i = combatCandidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [combatCandidates[i], combatCandidates[j]] = [combatCandidates[j], combatCandidates[i]];
            }
            for (let i = otherCandidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherCandidates[i], otherCandidates[j]] = [otherCandidates[j], otherCandidates[i]];
            }
            candidates.splice(0, candidates.length, ...combatCandidates, ...otherCandidates);

            // Si el mapa es muy compacto, bajamos el radio de seguridad solo lo necesario.
            if (candidates.length < count) {
                for (let y = 1; y < gameState.gridHeight - 1; y++) {
                    for (let x = 1; x < gameState.gridWidth - 1; x++) {
                        if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                        if (gameState.roomDesign?.secretInterior?.has(`${x},${y}`)) continue;
                        const distance = Math.abs(x - px) + Math.abs(y - py);
                        if (distance >= 5 && !candidates.some(c => c.x === x && c.y === y)) candidates.push({x, y, distance});
                    }
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
                const behavior = typeof pickEnemyBehaviorV324 === 'function' ? pickEnemyBehaviorV324(type, gameState.level, i, rand) : null;
                const speed = type.speed * gameState.roomType.enemySpeedMult * (diff?.enemySpeedMult || 1);

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
                    elite: gameState.roomType.id === 'ELITE' || gameState.roomType.id === 'CURSED' || (diff?.eliteBonus || 0) > 0 && Math.random() < diff.eliteBonus,
                    lastDirection: 'down',
                    __gridAnchor: 'center',
                    desiredDirection: 'down',
                    aiBehavior: behavior?.id || null
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

