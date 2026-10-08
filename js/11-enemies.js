// Bomberman Roguelike v6.25.0 — Enemy spawning delegated to biome authority
        function spawnEnemies() {
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
            const spawnPlan = typeof buildEnemySpawnPlanV625 === 'function'
                ? buildEnemySpawnPlanV625(spawnTotal)
                : [];
            for (let i = 0; i < spawnTotal; i++) {
                const {x, y} = candidates[i];
                const spec = spawnPlan[i] || (typeof resolveEnemySpawnSpecV625 === 'function' ? resolveEnemySpawnSpecV625({ index: i, count: spawnTotal }) : null);
                const entity = typeof makeEnemyEntityV625 === 'function'
                    ? makeEnemyEntityV625({ x, y }, spec, { source: 'initial' })
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

