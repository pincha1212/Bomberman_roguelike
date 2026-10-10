// Bomberman Roguelike v6.31.5 — Canvas renderer coordinador.
// Tiles y explosiones viven en archivos específicos cargados antes de este.

const renderCacheV317 = {
    canvas: null,
    width: 0,
    height: 0,
    grid: null,
    gridRevision: -1,
    builds: 0,
    lastBuildMs: 0
};

function invalidateRenderCacheV317() {
    renderCacheV317.grid = null;
    renderCacheV317.gridRevision = -1;
    if (typeof invalidateRenderTileCacheV621 === 'function') invalidateRenderTileCacheV621();
}

function buildTerrainCacheV317() {
    const width = Math.max(1, gameState.gridWidth * TILE_SIZE);
    const height = Math.max(1, gameState.gridHeight * TILE_SIZE);
    if (!renderCacheV317.canvas) renderCacheV317.canvas = document.createElement('canvas');
    if (renderCacheV317.width !== width || renderCacheV317.height !== height) {
        renderCacheV317.canvas.width = width;
        renderCacheV317.canvas.height = height;
        renderCacheV317.width = width;
        renderCacheV317.height = height;
    }

    const cacheCtx = renderCacheV317.canvas.getContext('2d', { alpha: false });
    cacheCtx.clearRect(0, 0, width, height);
    const start = performance.now();

    for (let y = 0; y < gameState.gridHeight; y++) {
        const row = gameState.grid[y];
        if (!row) continue;
        for (let x = 0; x < gameState.gridWidth; x++) {
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const isAlt = (x + y) % 2 === 0;

            cacheCtx.fillStyle = isAlt ? (typeof themeColorV46 === 'function' ? themeColorV46('floorA') : '#0f172a') : (typeof themeColorV46 === 'function' ? themeColorV46('floorB') : '#1e293b');
            cacheCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            cacheCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('floorHighlight') : 'rgba(255, 255, 255, 0.03)';
            cacheCtx.fillRect(px, py, TILE_SIZE, 2);
            cacheCtx.fillRect(px, py, 2, TILE_SIZE);
            cacheCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('floorShadow') : 'rgba(0, 0, 0, 0.2)';
            cacheCtx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
            cacheCtx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);

            const tile = row[x];
            if (typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(x, y)) drawBiomeLiquidTileV630(px, py, x, y, cacheCtx);
            if (tile === TYPES.WALL) drawCachedBiomeTileV621(cacheCtx, 'wall', x, y);
            else if (tile === TYPES.BLOCK) drawCachedBiomeTileV621(cacheCtx, 'block', x, y);
        }
    }

    renderCacheV317.grid = gameState.grid;
    renderCacheV317.gridRevision = gameState.gridRevision || 0;
    renderCacheV317.builds++;
    renderCacheV317.lastBuildMs = performance.now() - start;
}

function ensureTerrainCacheV317() {
    const revision = gameState.gridRevision || 0;
    if (
        renderCacheV317.grid !== gameState.grid ||
        renderCacheV317.gridRevision !== revision ||
        renderCacheV317.width !== gameState.gridWidth * TILE_SIZE ||
        renderCacheV317.height !== gameState.gridHeight * TILE_SIZE
    ) {
        buildTerrainCacheV317();
    }
    return renderCacheV317.canvas;
}

window.BOMBER_ENGINE = window.BOMBER_ENGINE || {};
window.BOMBER_ENGINE.getRenderStats = () => ({
    themeId: typeof getThemeV46 === 'function' ? getThemeV46().id : 'legacy',
    themeSprites: typeof themeSpriteV46 === 'function' ? { floor: themeSpriteV46('floor'), wall: themeSpriteV46('wall'), brick: themeSpriteV46('brick'), bomb: themeSpriteV46('bomb'), fire: themeSpriteV46('fire'), player: themeSpriteV46('player'), enemy: themeSpriteV46('enemy'), powerup: themeSpriteV46('powerup'), exit: themeSpriteV46('exit'), boss: themeSpriteV46('boss') } : {},
    terrainCacheBuilds: renderCacheV317.builds,
    terrainCacheLastBuildMs: renderCacheV317.lastBuildMs,
    terrainTileCacheEntries: renderTileCacheV621.size,
    terrainCacheReady: !!renderCacheV317.canvas && renderCacheV317.grid === gameState.grid && renderCacheV317.gridRevision === (gameState.gridRevision || 0),
    visible: { ...renderStatsV329 }
});

const renderViewportV329 = { left: 0, top: 0, right: 0, bottom: 0, frame: -1 };
const renderStatsV329 = { items: 0, bombs: 0, explosions: 0, enemies: 0, particles: 0, floaters: 0 };

function updateRenderViewportV329(){
    renderViewportV329.left = Number(gameState.camera?.x) || 0;
    renderViewportV329.top = Number(gameState.camera?.y) || 0;
    renderViewportV329.right = renderViewportV329.left + canvas.width;
    renderViewportV329.bottom = renderViewportV329.top + canvas.height;
    renderViewportV329.frame = Number(gameState.animFrame || 0);
    renderStatsV329.items = 0;
    renderStatsV329.bombs = 0;
    renderStatsV329.explosions = 0;
    renderStatsV329.enemies = 0;
    renderStatsV329.particles = 0;
    renderStatsV329.floaters = 0;
}

function isWorldRectVisibleV329(x, y, width, height, margin = TILE_SIZE){
    const left = renderViewportV329.frame >= 0 ? renderViewportV329.left : (Number(gameState.camera?.x) || 0);
    const top = renderViewportV329.frame >= 0 ? renderViewportV329.top : (Number(gameState.camera?.y) || 0);
    const right = renderViewportV329.frame >= 0 ? renderViewportV329.right : left + canvas.width;
    const bottom = renderViewportV329.frame >= 0 ? renderViewportV329.bottom : top + canvas.height;
    return x + width >= left - margin && x <= right + margin && y + height >= top - margin && y <= bottom + margin;
}

function isWorldTileVisibleV329(tileX, tileY, margin = 1){
    return isWorldRectVisibleV329(tileX*TILE_SIZE, tileY*TILE_SIZE, TILE_SIZE, TILE_SIZE, margin*TILE_SIZE);
}

// v6.30.9: la animación estética es un estado visual independiente de gameState.explosions,
// que conserva su duración original para daño, hitboxes y combate.


// Helper compartido: el caché del terreno lo invoca desde buildTerrainCacheV317().
        function drawBiomeLiquidTileV630(x, y, gx, gy, targetCtx = ctx) {
            const liquid = typeof getLiquidKindV630 === 'function' ? getLiquidKindV630() : null;
            if (!liquid) return;
            const north = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx, gy - 1);
            const south = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx, gy + 1);
            const west = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx - 1, gy);
            const east = typeof hasLiquidTileV630 === 'function' && hasLiquidTileV630(gx + 1, gy);

            targetCtx.fillStyle = liquid.edge;
            targetCtx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            targetCtx.fillStyle = liquid.color;
            targetCtx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);

            // Bordes redondeados entre celdas para que la mancha se lea como una sola masa.
            const r = Math.max(5, TILE_SIZE * 0.18);
            targetCtx.fillStyle = liquid.color;
            if (north) targetCtx.fillRect(x + r, y, TILE_SIZE - r * 2, r + 2);
            if (south) targetCtx.fillRect(x + r, y + TILE_SIZE - r - 2, TILE_SIZE - r * 2, r + 2);
            if (west) targetCtx.fillRect(x, y + r, r + 2, TILE_SIZE - r * 2);
            if (east) targetCtx.fillRect(x + TILE_SIZE - r - 2, y + r, r + 2, TILE_SIZE - r * 2);

            // Brillo irregular, fijo por coordenada para que no "tiemble" en el cache.
            const mark = Math.abs((gx * 37 + gy * 53 + Number(gameState.level || 1) * 17) % 4);
            targetCtx.fillStyle = liquid.hi;
            targetCtx.globalAlpha = 0.34;
            if (liquid.shimmer) {
                if (mark === 0 || mark === 2) {
                    targetCtx.fillRect(x + TILE_SIZE * 0.18, y + TILE_SIZE * 0.30, TILE_SIZE * 0.28, 2);
                    targetCtx.fillRect(x + TILE_SIZE * 0.54, y + TILE_SIZE * 0.62, TILE_SIZE * 0.22, 2);
                } else {
                    targetCtx.fillRect(x + TILE_SIZE * 0.30, y + TILE_SIZE * 0.50, TILE_SIZE * 0.22, 2);
                }
            } else {
                targetCtx.fillRect(x + TILE_SIZE * 0.22, y + TILE_SIZE * 0.36, TILE_SIZE * 0.20, 2);
            }
            targetCtx.globalAlpha = 1;

            if (liquid.id === 'lava') {
                targetCtx.fillStyle = liquid.hi;
                targetCtx.globalAlpha = 0.32;
                targetCtx.fillRect(x + TILE_SIZE * 0.42, y + TILE_SIZE * 0.18, 3, TILE_SIZE * 0.36);
                targetCtx.globalAlpha = 1;
            } else if (liquid.id === 'toxic') {
                targetCtx.fillStyle = liquid.hi;
                targetCtx.globalAlpha = 0.24;
                targetCtx.beginPath();
                targetCtx.arc(x + TILE_SIZE * 0.70, y + TILE_SIZE * 0.28, Math.max(2, TILE_SIZE * 0.07), 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.globalAlpha = 1;
            } else if (liquid.id === 'mud') {
                targetCtx.fillStyle = liquid.edge;
                targetCtx.globalAlpha = 0.32;
                targetCtx.fillRect(x + TILE_SIZE * 0.60, y + TILE_SIZE * 0.58, TILE_SIZE * 0.16, 2);
                targetCtx.globalAlpha = 1;
            }
        }


function getRenderProfileV65() {
    return typeof getBomberRenderProfileV65 === 'function'
        ? getBomberRenderProfileV65()
        : { particleBudget: 96, floaterBudget: 24, showAmbientDust: true, showLighting: true, showCombatFeedback: true, showRoomDecor: true, showEnemyAISignals: true, useCanvasFilter: true };
}

function draw() {
            updateRenderViewportV329();
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('background') : '#090d16';
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

            // V3.17: terreno estático pre-renderizado. Solo se reconstruye al cambiar el mapa.
            const terrainCache = ensureTerrainCacheV317();
            ctx.drawImage(terrainCache, 0, 0);

            // Exit portal stays dynamic because it is animated.
            if (gameState.exitPos) {
                const ex = gameState.exitPos.x;
                const ey = gameState.exitPos.y;
                if (gameState.grid[ey]?.[ex] === TYPES.EXIT_OPEN) {
                    drawExitPortal(ex * TILE_SIZE, ey * TILE_SIZE);
                }
            }

            // V3.13: acentos espaciales; las salas se leen en el propio piso, sin minimapa.
            if (getRenderProfileV65().showRoomDecor && typeof drawRoomDesignLayerV313 === 'function') drawRoomDesignLayerV313();

            // v6.0: residuos materiales persistentes; quedan por debajo de items, bombas y personajes.
            if (typeof drawMaterialResiduesV60 === 'function') drawMaterialResiduesV60(ctx);
            // v6.30.9: residuos elementales tenues, unidos y dibujados bajo entidades.
// V3.3: las trampas aparecen visualmente solo después de activarse.
            drawHazards();
            // v6.30.0: campos temporales de habilidades RASTRERO, dibujados en el Canvas único.
            if (typeof drawRastreroAbilityEffectsV630 === 'function') drawRastreroAbilityEffectsV630(ctx);

            // Draw Items / Powerups
            for(let i=0;i<gameState.items.length;i++){
                const it=gameState.items[i];
                if(it && isWorldTileVisibleV329(it.x, it.y, 1)){ renderStatsV329.items++; drawPowerupSprite(it); }
            }

            // Draw Bombs
            for(let i=0;i<gameState.bombs.length;i++){
                const b=gameState.bombs[i];
                if(!b) continue;
                if (b.state === 'carried' || b.motionState === 'carried') continue;
                const bombPos = typeof getBombV4WorldPosition === 'function' ? getBombV4WorldPosition(b) : {x:(b.x + .5) * TILE_SIZE, y:(b.y + .5) * TILE_SIZE};
                if(!isWorldRectVisibleV329(bombPos.x - TILE_SIZE * .55, bombPos.y - TILE_SIZE * .55, TILE_SIZE * 1.1, TILE_SIZE * 1.1, TILE_SIZE)) continue;
                renderStatsV329.bombs++;
                drawBombSprite(bombPos.x, bombPos.y, b);
            }
            drawBombChainLinks();
            // v6.30.9: solo la animación estética de 350 ms.
            // gameState.explosions conserva en exclusiva la hitbox y el daño lógico.
            renderStatsV329.explosions += drawExplosionClustersV6308(gameState.bombBlastVisualsV6308);

            // Draw Enemies
            for(let i=0;i<gameState.enemies.length;i++){
                const e=gameState.enemies[i];
                if(e && isWorldRectVisibleV329(e.x-e.width/2, e.y-e.height/2, e.width, e.height, TILE_SIZE)){ renderStatsV329.enemies++; if (typeof drawRastreroEnemySpriteV630 === 'function') drawRastreroEnemySpriteV630(e, drawEnemySprite); else drawEnemySprite(e); }
            }
            if (getRenderProfileV65().showEnemyAISignals && typeof drawEnemyAISignals === 'function') drawEnemyAISignals();

            // v6.1: eco persistente del intento anterior. Se dibuja antes del boss
            // y del jugador para conservar la jerarquía visual actual.
            if (typeof drawDeathEchoV61 === 'function') drawDeathEchoV61();

            // Draw Boss
            drawBoss();

            // Draw Player Bomberman
            if (!player.isInvincible || Math.floor(gameState.animFrame / 4) % 2 === 0) {
                drawBombermanSprite(player.x, player.y);
                if (typeof drawWinterBodyEffectsV64 === 'function') drawWinterBodyEffectsV64(player);
            }
            // Una bomba agarrada pertenece visualmente al portador, no al suelo.
            const carriedPlayerBomb = typeof globalThis.getCarriedBombForEntityV682 === 'function'
                ? globalThis.getCarriedBombForEntityV682(player)
                : null;
            if (carriedPlayerBomb) {
                const carriedPos = typeof globalThis.getCarriedBombWorldPositionV682 === 'function'
                    ? globalThis.getCarriedBombWorldPositionV682(carriedPlayerBomb)
                    : {
                        x: player.x + player.width / 2,
                        y: player.y + player.height / 2 - TILE_SIZE * 0.38
                    };
                if (carriedPos) drawBombSprite(carriedPos.x, carriedPos.y, carriedPlayerBomb);
            }

            // Draw Particles: el presupuesto visual es menor que el de simulación.
            const profileV65 = getRenderProfileV65();
            const particleLimit = Math.min(gameState.particles.length, Number(profileV65.particleBudget) || 24);
            for(let i=Math.max(0, gameState.particles.length-particleLimit); i<gameState.particles.length; i++){
                const p=gameState.particles[i];
                if(!p || !isWorldRectVisibleV329(p.x, p.y, p.size || 1, p.size || 1, TILE_SIZE)) continue;
                renderStatsV329.particles++;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            // Los mensajes informativos se muestran en el panel DOM externo.
            renderStatsV329.floaters = 0;

            ctx.restore();

            if (getRenderProfileV65().showAmbientDust) drawAmbientDust();
            if (getRenderProfileV65().showLighting) drawLighting();
            if (getRenderProfileV65().showCombatFeedback) renderCombatFeedback();
        }

        function drawDeathEchoV61() {
            const ghost = gameState.deathEchoV61
                || (window.BOMBER_ENGINE?.getDeathEcho ? window.BOMBER_ENGINE.getDeathEcho(gameState.level) : null)
                || (window.BOMBER_ENGINE?.getActiveDeathEcho ? window.BOMBER_ENGINE.getActiveDeathEcho(gameState.level) : null);

            if (!ghost || ghost.defeated) return;
            if (![ghost.x, ghost.y, ghost.width, ghost.height].every(Number.isFinite)) return;

            const visible = typeof isWorldRectVisibleV329 === 'function'
                ? isWorldRectVisibleV329(ghost.x, ghost.y, ghost.width, ghost.height, TILE_SIZE * 1.5)
                : true;
            if (!visible) return;

            // El eco utiliza EXACTAMENTE el mismo diseño geométrico del jugador.
            // La diferencia es monocromática + alpha 0.50. No hay aura, ojos,
            // partículas ni una segunda animación superpuesta.
            drawBombermanSprite(ghost.x - ghost.width / 2, ghost.y - ghost.height / 2, ghost, { ghost: true });

<<<<<<< HEAD
=======
            // Las bombas CARRIED no se dibujan en el suelo. Renderiza la que lleva
            // Death Echo sobre su cuerpo, usando la posición real del portador.
            const carriedEchoBomb = typeof globalThis.getCarriedBombForEntityV682 === 'function'
                ? globalThis.getCarriedBombForEntityV682(ghost)
                : null;
            if (carriedEchoBomb) {
                const carriedPos = typeof globalThis.getCarriedBombWorldPositionV682 === 'function'
                    ? globalThis.getCarriedBombWorldPositionV682(carriedEchoBomb)
                    : { x:ghost.x, y:ghost.y - TILE_SIZE * 0.38 };
                if (carriedPos && Number.isFinite(carriedPos.x) && Number.isFinite(carriedPos.y)) {
                    drawBombSprite(carriedPos.x, carriedPos.y, carriedEchoBomb);
                }
            }
        }

>>>>>>> 57377fa (feat: Implement enemy AI navigation and pathfinding logic in 19-enemy-ai-navigation.js)
        function drawExitPortal(x, y) {
            let pulse = Math.sin(gameState.animFrame * 0.1) * 3;
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('exit') : '#facc15';
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE*0.35 + pulse, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyPupil') : '#000000';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText('🚪', x + 10, y + 32);
        }

        function drawBombermanSprite(x, y, actor = player, options = {}) {
            ctx.save();

            const isGhost = options.ghost === true;
            const actorWidth = Number(actor.width) || Number(player.width) || TILE_SIZE * 0.68;
            const actorHeight = Number(actor.height) || Number(player.height) || TILE_SIZE * 0.68;
            const actorDir = ['up', 'down', 'left', 'right'].includes(actor.dir) ? actor.dir : 'down';
            if (isGhost) {
                // En móvil bajo evitamos ctx.filter, que es costoso en algunos Canvas 2D.
                if (getRenderProfileV65().useCanvasFilter) ctx.filter = 'grayscale(1) contrast(1.18)';
                ctx.globalAlpha = 0.5;
            }
            const walkCycle = Number(actor.walkCycle ?? ((actor.visualTime || 0) * 0.015));
            const fsmState = !isGhost && typeof playerFSMGetState === 'function'
                ? playerFSMGetState()
                : (actor.isMoving ? 'CAMINANDO' : 'QUIETO');
            const walkingAnimation = actor.isMoving || fsmState === 'CAMINANDO';
            const plantingAnimation = !isGhost && fsmState === 'PONIENDO_BOMBA';
            const deadAnimation = !isGhost && fsmState === 'MUERTO';

            // v5.7: el render solo consume la FSM; no cambia gameplay ni estado.
            let bounce = plantingAnimation
                ? Math.sin(gameState.animFrame * 0.24) * 1.5
                : Math.sin(walkCycle * 4) * (walkingAnimation ? 3 : 1);
            if (isGhost && !walkingAnimation) bounce = Math.sin(Number(actor.visualTime || 0) * 0.003) * 0.8;
            const recoil = !isGhost && typeof getPlayerRenderRecoil === 'function' ? getPlayerRenderRecoil() : { x: 0, y: 0 };
            let px = x + recoil.x, py = y + bounce + recoil.y;

            if (deadAnimation) ctx.globalAlpha = 0.65;

            // Sombra
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombShadow') : 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(px + actorWidth/2, y + actorHeight, actorWidth/2.2, 5, 0, 0, Math.PI*2);
            ctx.fill();

            // Burbuja de Escudo
            if (plantingAnimation) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombPlayerRing') : 'rgba(34, 211, 238, 0.78)';
                ctx.lineWidth = 2;
                ctx.globalAlpha = isGhost ? 0.5 : (deadAnimation ? 0.35 : 0.8);
                ctx.beginPath();
                ctx.arc(px + actorWidth / 2, py + actorHeight / 2, actorWidth * (0.58 + Math.sin(gameState.animFrame * 0.35) * 0.05), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = isGhost ? 0.5 : (deadAnimation ? 0.65 : 1);
            }

            if (actor.hasShield) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerShield') : 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(px + actorWidth/2, py + actorHeight/2, actorWidth*0.8, 0, Math.PI*2);
                ctx.stroke();
            }

            // Traje (Azul)
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerSuit') : '#2563eb';
            ctx.fillRect(px + 6, py + 12, actorWidth - 12, actorHeight - 16);
            
            // Cinturón
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
            ctx.fillRect(px + 6, py + 22, actorWidth - 12, 4);
            // Hebilla
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerBuckle') : '#facc15';
            if (actorDir === 'down') {
                ctx.fillRect(px + actorWidth/2 - 4, py + 21, 8, 6);
            } else if (actorDir === 'left') {
                ctx.fillRect(px + 4, py + 21, 4, 6);
            } else if (actorDir === 'right') {
                ctx.fillRect(px + actorWidth - 8, py + 21, 4, 6);
            }

            // Casco (Blanco)
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerHelmet') : '#f8fafc';
            ctx.beginPath();
            ctx.arc(px + actorWidth/2, py + 10, 14, 0, Math.PI*2);
            ctx.fill();

            // Rostro Direccional
            if (actorDir === 'down') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + actorWidth/2 - 9, py + 4, 18, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + actorWidth/2 - 5, py + 7, 3, 6);
                ctx.fillRect(px + actorWidth/2 + 2, py + 7, 3, 6);
            } else if (actorDir === 'left') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + actorWidth/2 - 12, py + 4, 14, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + actorWidth/2 - 7, py + 7, 3, 6);
            } else if (actorDir === 'right') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + actorWidth/2 - 2, py + 4, 14, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + actorWidth/2 + 4, py + 7, 3, 6);
            }

            // Antena
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerMetal') : '#94a3b8'; 
            ctx.fillRect(px + actorWidth/2 - 2, py - 6, 4, 4);
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerAccent') : '#ec4899'; 
            ctx.beginPath();
            ctx.arc(px + actorWidth/2, py - 8, 5, 0, Math.PI*2);
            ctx.fill();

            // Guantes
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerAccent') : '#ec4899';
            if (actorDir !== 'right') { 
                ctx.beginPath(); ctx.arc(px + 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }
            if (actorDir !== 'left') { 
                ctx.beginPath(); ctx.arc(px + actorWidth - 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }

            // Pies (Zapatos Rojos) animando
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerBoot') : '#dc2626';
            let leftFootY = py + actorHeight - 4 + (walkingAnimation && Math.floor(walkCycle*4)%2===0 ? -4 : 0);
            let rightFootY = py + actorHeight - 4 + (walkingAnimation && Math.floor(walkCycle*4)%2===1 ? -4 : 0);
            
            if (actorDir === 'right') {
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 - 2, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 + 6, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else if (actorDir === 'left') {
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 - 6, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + actorWidth/2 + 2, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.ellipse(px + 8, leftFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + actorWidth - 8, rightFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
            }

            ctx.restore();
        }


        function drawEnemySprite(e) {
            ctx.save();
            const inheritedAlpha = ctx.globalAlpha;
            const enemySpecies = typeof getEnemyBiomeSpeciesProfileV615 === 'function' ? getEnemyBiomeSpeciesProfileV615(e) : null;
            const enemySkin = enemySpecies || (typeof getEnemySkinV614 === 'function' ? getEnemySkinV614(e) : null);
            const skinBody = enemySkin?.body || e.type.color;
            const skinShade = enemySkin?.shade || e.type.color;
            const skinAccent = enemySkin?.accent || themeColorV46('enemyEye', '#ffffff');
            const skinMotif = enemySkin?.motif || 'classic';
            if (e.elite) {
                ctx.strokeStyle = gameState.roomType.color;
                ctx.globalAlpha = inheritedAlpha * (0.45 + Math.sin(gameState.animFrame * 0.15) * 0.1);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y, TILE_SIZE * 0.48, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = inheritedAlpha;
            }
            let floaty = e.type.canFly ? Math.sin((gameState.animFrame + e.x) * 0.1) * 4 : Math.sin((gameState.animFrame + e.x) * 0.3) * 2;
            
            // Sombra
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyShadow') : 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.height/2, e.width/2, 4, 0, 0, Math.PI*2);
            ctx.fill();

            // Cuerpo base; la skin solo cambia la representación visual.
            ctx.fillStyle = skinBody;
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

            // Motivo de bioma: accesorio ligero, procedural y barato.
            const motifY = e.y + floaty;
            ctx.fillStyle = skinAccent;
            ctx.strokeStyle = skinShade;
            ctx.lineWidth = 2;
            if (skinMotif === 'snow' || skinMotif === 'ice') {
                ctx.beginPath();
                ctx.moveTo(e.x - 7, motifY - e.height * 0.34); ctx.lineTo(e.x, motifY - e.height * 0.52); ctx.lineTo(e.x + 7, motifY - e.height * 0.34);
                ctx.stroke();
                if (skinMotif === 'ice') { ctx.beginPath(); ctx.moveTo(e.x, motifY - 2); ctx.lineTo(e.x, motifY - 12); ctx.stroke(); }
            } else if (skinMotif === 'leaf') {
                ctx.beginPath(); ctx.ellipse(e.x - 8, motifY - 10, 4, 7, -0.65, 0, Math.PI * 2); ctx.ellipse(e.x + 8, motifY - 10, 4, 7, 0.65, 0, Math.PI * 2); ctx.fill();
            } else if (skinMotif === 'acorn') {
                ctx.beginPath(); ctx.arc(e.x, motifY - 8, 6, Math.PI, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = skinShade; ctx.beginPath(); ctx.moveTo(e.x - 6, motifY - 8); ctx.lineTo(e.x + 6, motifY - 8); ctx.stroke();
                ctx.fillStyle = skinAccent; ctx.fillRect(e.x - 2, motifY - 15, 4, 4);
            } else if (skinMotif === 'flower') {
                for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 8, motifY - 10 + Math.sin(a) * 3, 3, 0, Math.PI * 2); ctx.fill(); }
            } else if (skinMotif === 'vine') {
                ctx.beginPath(); ctx.arc(e.x, motifY - 12, 7, 0, Math.PI * 2); ctx.stroke();
            } else if (skinMotif === 'sun') {
                for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 9, motifY - 10 + Math.sin(a) * 5); ctx.lineTo(e.x + Math.cos(a) * 13, motifY - 10 + Math.sin(a) * 7); ctx.stroke(); }
            } else if (skinMotif === 'crystal' || skinMotif === 'ore') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 15); ctx.lineTo(e.x + 6, motifY - 6); ctx.lineTo(e.x, motifY - 2); ctx.lineTo(e.x - 6, motifY - 6); ctx.closePath(); ctx.fill();
            } else if (skinMotif === 'cloud') {
                ctx.beginPath(); ctx.arc(e.x - 5, motifY - 9, 4, 0, Math.PI * 2); ctx.arc(e.x, motifY - 12, 5, 0, Math.PI * 2); ctx.arc(e.x + 5, motifY - 9, 4, 0, Math.PI * 2); ctx.fill();
            } else if (skinMotif === 'storm') {
                ctx.beginPath(); ctx.moveTo(e.x - 3, motifY - 17); ctx.lineTo(e.x + 3, motifY - 9); ctx.lineTo(e.x - 1, motifY - 8); ctx.lineTo(e.x + 3, motifY - 2); ctx.stroke();
            } else if (skinMotif === 'rock' || skinMotif === 'feather') {
                ctx.beginPath(); ctx.moveTo(e.x - 8, motifY - 7); ctx.lineTo(e.x - 4, motifY - 15); ctx.lineTo(e.x, motifY - 9); ctx.lineTo(e.x + 5, motifY - 16); ctx.lineTo(e.x + 9, motifY - 7); ctx.stroke();
            } else if (skinMotif === 'shell' || skinMotif === 'reef') {
                ctx.beginPath(); ctx.arc(e.x, motifY + 6, 7, Math.PI, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(e.x - 6, motifY + 6); ctx.lineTo(e.x - 2, motifY - 1); ctx.moveTo(e.x, motifY + 6); ctx.lineTo(e.x, motifY - 2); ctx.moveTo(e.x + 6, motifY + 6); ctx.lineTo(e.x + 2, motifY - 1); ctx.stroke();
            } else if (skinMotif === 'fin') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 16); ctx.lineTo(e.x + 6, motifY - 7); ctx.lineTo(e.x - 2, motifY - 8); ctx.closePath(); ctx.fill();
            } else if (skinMotif === 'visor' || skinMotif === 'drone') {
                ctx.fillStyle = skinAccent; ctx.globalAlpha = inheritedAlpha * 0.9; ctx.fillRect(e.x - 8, motifY - 5, 16, 5); ctx.globalAlpha = inheritedAlpha;
                ctx.strokeStyle = skinShade; ctx.beginPath(); ctx.moveTo(e.x, motifY - 12); ctx.lineTo(e.x, motifY - 19); ctx.stroke();
            } else if (skinMotif === 'tech') {
                ctx.strokeStyle = skinAccent; ctx.strokeRect(e.x - 8, motifY - 14, 16, 20);
                ctx.fillStyle = skinAccent; ctx.fillRect(e.x - 3, motifY - 9, 6, 3);
            } else if (skinMotif === 'halo') {
                ctx.beginPath(); ctx.ellipse(e.x, motifY - 11, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
            } else if (skinMotif === 'star') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 17); ctx.lineTo(e.x + 3, motifY - 9); ctx.lineTo(e.x + 11, motifY - 9); ctx.lineTo(e.x + 4, motifY - 4); ctx.lineTo(e.x + 7, motifY + 4); ctx.lineTo(e.x, motifY - 1); ctx.lineTo(e.x - 7, motifY + 4); ctx.lineTo(e.x - 4, motifY - 4); ctx.lineTo(e.x - 11, motifY - 9); ctx.lineTo(e.x - 3, motifY - 9); ctx.closePath(); ctx.stroke();
            } else if (skinMotif === 'horns' || skinMotif === 'demon') {
                ctx.beginPath(); ctx.moveTo(e.x - 10, motifY - 9); ctx.lineTo(e.x - 6, motifY - 18); ctx.lineTo(e.x - 2, motifY - 10); ctx.moveTo(e.x + 10, motifY - 9); ctx.lineTo(e.x + 6, motifY - 18); ctx.lineTo(e.x + 2, motifY - 10); ctx.stroke();
            } else if (skinMotif === 'ember') {
                ctx.beginPath(); ctx.moveTo(e.x, motifY - 17); ctx.quadraticCurveTo(e.x + 8, motifY - 10, e.x, motifY - 4); ctx.quadraticCurveTo(e.x - 7, motifY - 10, e.x, motifY - 17); ctx.fill();
            }

            // Ojos mirando a la dirección de movimiento
            let eyeOffsetX = e.vx > 0 ? 3 : (e.vx < 0 ? -3 : 0);
            
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyEye') : '#ffffff'; 
            ctx.beginPath();
            ctx.arc(e.x - 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.arc(e.x + 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyPupil') : '#000000'; 
            ctx.beginPath();
            ctx.arc(e.x - 3 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.arc(e.x + 5 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.fill();

            // Cejas enojadas para los Rastreros (Rojos)
            if (e.type.name === 'Rastrero') {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyPupil') : '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(e.x - 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x - 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.moveTo(e.x + 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x + 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.stroke();
            }

            if (e.hunterMarkedV676) {
                ctx.strokeStyle = '#facc15';
                ctx.globalAlpha = inheritedAlpha * 0.8;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y + floaty, TILE_SIZE * 0.50, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = inheritedAlpha;
            }

            ctx.restore();
        }

        function drawBombSprite(cx, cy, b) {
            if (typeof ensureBombV4State === 'function') ensureBombV4State(b);
            const moving = b?.motionState === 'moving' || b?.state === 'moving';
            const pulse = Math.sin(gameState.animFrame * 0.2 + (b?.bobPhase || 0)) * 0.08;
            let scale = 1.0 + pulse + (moving ? 0.04 * Math.sin((b.motionProgress || 0) * Math.PI * 2) : 0);
            const submergedLiquid = typeof isBombSubmergedV631 === 'function' && isBombSubmergedV631(b);
            const sinkElapsed = Number(b?.biomeLiquidState?.elapsedMs) || 0;
            const sinkEffect = submergedLiquid && typeof getLiquidBombEffectV631 === 'function' ? getLiquidBombEffectV631(b.x, b.y) : null;
            const sinkProgress = sinkEffect?.sinkBombAfterMs > 0 ? Math.max(0, Math.min(1, sinkElapsed / sinkEffect.sinkBombAfterMs)) : 0;
            ctx.save();
            ctx.translate(cx, cy + (sinkProgress * TILE_SIZE * 0.22));
            if (typeof getBombElementDefV612 === 'function' && b?.elementV612 && b.elementV612 !== 'normal') { const ed=getBombElementDefV612(b); ctx.strokeStyle=ed.color; ctx.lineWidth=3; ctx.globalAlpha=.9; ctx.beginPath(); ctx.arc(0,0,TILE_SIZE*.48,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
            if (moving) ctx.rotate((b.motionRotation || 0) * 0.35);
            else if (Number.isFinite(b.windTilt)) ctx.rotate(Number(b.windTilt));
            ctx.scale(scale * (1 - sinkProgress * 0.20), scale * (1 - sinkProgress * 0.20));
            ctx.globalAlpha *= 1 - sinkProgress * 0.65;

            const bossBomb = (b.owner || 'player') === 'boss';
            // La bomba del jugador usa un aro cian; la bomba del boss usa identidad roja.
            if (!bossBomb) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombPlayerRing') : 'rgba(34,211,238,.78)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE * .42, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (bossBomb) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombBossRing') : 'rgba(248,113,113,.82)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE * .44, 0, Math.PI * 2);
                ctx.stroke();
            }
            renderBombFuseFeedback(0, 0, b);
            if (moving) {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombMovingFill') : 'rgba(255,210,63,.14)';
                ctx.beginPath(); ctx.arc(0, 0, TILE_SIZE * .49, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombMovingStroke') : 'rgba(255,138,0,.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4,4]);
                ctx.beginPath(); ctx.arc(0, 0, TILE_SIZE * .43, -Math.PI*.25, Math.PI*1.2); ctx.stroke();
                ctx.setLineDash([]);
            }

            // La sombra queda en el suelo para que el salto de la bomba sea legible.
            const jumpArc = moving ? Math.sin(Math.PI * (b?.motionProgress || 0)) * Number(b?.motionArc || 0) : 0;
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombShadow') : 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(0, TILE_SIZE*0.3 + jumpArc, TILE_SIZE*0.3, 4, 0, 0, Math.PI*2); ctx.fill();

            // Cuerpo brillante
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombBody') : '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, TILE_SIZE*0.35, 0, Math.PI*2);
            ctx.fill();
            
            // Reflejo
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombReflect', 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(-6, -6, TILE_SIZE*0.1, 0, Math.PI*2);
            ctx.fill();

            // Tapa y mecha
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombCap') : '#64748b';
            ctx.fillRect(-4, -TILE_SIZE*0.38, 8, 6);

            let sparkColor = gameState.animFrame % 4 < 2 ? (typeof themeColorV46 === 'function' ? themeColorV46('bombSparkHot') : '#facc15') : (typeof themeColorV46 === 'function' ? themeColorV46('bombSparkDanger') : '#ef4444');
            ctx.fillStyle = sparkColor;
            ctx.beginPath();
            ctx.arc(0, -TILE_SIZE*0.45, 5 + (b.timer < 650 ? Math.sin(gameState.animFrame*.8)*2 : 0), 0, Math.PI*2);
            ctx.fill();
            if(b.timer < 650){
                ctx.strokeStyle=typeof themeColorV46 === 'function' ? themeColorV46('bombFuse') : '#fee2e2';
                ctx.lineWidth=2;
                ctx.beginPath();
                ctx.moveTo(0,-TILE_SIZE*.47);
                ctx.lineTo(Math.cos(gameState.animFrame)*7,-TILE_SIZE*.58+Math.sin(gameState.animFrame)*5);
                ctx.stroke();
            }

            ctx.restore();
        }


        function drawPowerupSprite(item) {
            const x = item.x * TILE_SIZE;
            const y = item.y * TILE_SIZE;
            const type = item.type;
            const gameplayMeta = globalThis.GAMEPLAY_POWERUP_DEFS_V676?.[type] || globalThis.POWERUP_DEFS_V67?.[type] || globalThis.CAPABILITY_POWERUPS_V681?.[type] || globalThis.ELEMENTAL_BOMB_POWERUP_DEFS_V612?.[type] || null;
            let floaty = Math.sin((gameState.animFrame + x) * 0.1) * 3;
            if (type === 'RELIC') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('relicBase') : '#3b1d6b';
                ctx.fillRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('relicAccent') : '#c084fc';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                const relic = RELICS.find(r => r.id === item.relicId);
                ctx.font = '14px "Press Start 2P"';
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('white') : '#ffffff';
                ctx.fillText(relic?.icon || '✦', x + 11, y + 31 + floaty);
                return;
            }
            const rarityColor = gameplayMeta ? (globalThis.GAMEPLAY_POWERUP_RARITY_COLORS_V676?.[gameplayMeta.rarity] || '#94a3b8') : null;
            ctx.fillStyle = gameplayMeta ? 'rgba(15,23,42,.90)' : (typeof themeColorV46 === 'function' ? themeColorV46('powerupBase') : '#0284c7');
            ctx.fillRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);
            ctx.strokeStyle = rarityColor || (typeof themeColorV46 === 'function' ? themeColorV46('powerupAccent') : '#38bdf8');
            ctx.strokeRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);

            ctx.font = '14px "Press Start 2P"';
            let icon = gameplayMeta?.icon || '💣';
            if (type === POWERUPS.FIRE_UP) icon = '🔥';
            if (type === POWERUPS.SPEED_UP) icon = '👟';
            if (type === POWERUPS.HEALTH_UP) icon = '❤️';
            if (type === POWERUPS.SHIELD_UP) icon = '🛡️';
            ctx.fillText(icon, x + 10, y + 30 + floaty);
            if (gameplayMeta) {
                ctx.font = '7px Inter, sans-serif';
                ctx.fillStyle = rarityColor || '#cbd5e1';
                ctx.textAlign = 'center';
                ctx.fillText(gameplayMeta.rarity, x + TILE_SIZE / 2, y + TILE_SIZE - 7 + floaty);
                ctx.textAlign = 'start';
            }
        }
