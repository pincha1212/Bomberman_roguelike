// Bomberman Roguelike v4.6 — Canvas rendering and theme-backed sprite drawing
// V3.17: cache de terreno estático para evitar reconstruir la cuadrícula completa
// en cada frame. El mapa se regenera solo cuando cambia la referencia/revisión.
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
            if (tile === TYPES.WALL) drawSteelWall(px, py, cacheCtx);
            else if (tile === TYPES.BLOCK) drawBrickBlock(px, py, cacheCtx);
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
            if (typeof drawRoomDesignLayerV313 === 'function') drawRoomDesignLayerV313();

            // V3.3: las trampas aparecen visualmente solo después de activarse.
            drawHazards();

            // Draw Items / Powerups
            for(let i=0;i<gameState.items.length;i++){
                const it=gameState.items[i];
                if(it && isWorldTileVisibleV329(it.x, it.y, 1)){ renderStatsV329.items++; drawPowerupSprite(it); }
            }

            // Draw Bombs
            for(let i=0;i<gameState.bombs.length;i++){
                const b=gameState.bombs[i];
                if(!b) continue;
                const bombPos = typeof getBombV4WorldPosition === 'function' ? getBombV4WorldPosition(b) : {x:(b.x + .5) * TILE_SIZE, y:(b.y + .5) * TILE_SIZE};
                if(!isWorldRectVisibleV329(bombPos.x - TILE_SIZE * .55, bombPos.y - TILE_SIZE * .55, TILE_SIZE * 1.1, TILE_SIZE * 1.1, TILE_SIZE)) continue;
                renderStatsV329.bombs++;
                renderBombRangePreview(b);
                drawBombSprite(bombPos.x, bombPos.y, b);
            }
            drawBombChainLinks();

            // Draw Explosions
            for(let i=0;i<gameState.explosions.length;i++){
                const exp=gameState.explosions[i];
                if(exp && isWorldTileVisibleV329(exp.x, exp.y, 1)){ renderStatsV329.explosions++; drawExplosionSprite(exp.x * TILE_SIZE, exp.y * TILE_SIZE); }
            }

            // Draw Enemies
            for(let i=0;i<gameState.enemies.length;i++){
                const e=gameState.enemies[i];
                if(e && isWorldRectVisibleV329(e.x-e.width/2, e.y-e.height/2, e.width, e.height, TILE_SIZE)){ renderStatsV329.enemies++; drawEnemySprite(e); }
            }
            if (typeof drawEnemyAISignals === 'function') drawEnemyAISignals();

            // Draw Boss
            drawBoss();

            // Draw Player Bomberman
            if (!player.isInvincible || Math.floor(gameState.animFrame / 4) % 2 === 0) {
                drawBombermanSprite(player.x, player.y);
            }

            // Draw Particles: el presupuesto visual es menor que el de simulación.
            const particleLimit = Math.min(gameState.particles.length, largeSupport.renderParticleBudget || gameState.particles.length);
            for(let i=Math.max(0, gameState.particles.length-particleLimit); i<gameState.particles.length; i++){
                const p=gameState.particles[i];
                if(!p || !isWorldRectVisibleV329(p.x, p.y, p.size || 1, p.size || 1, TILE_SIZE)) continue;
                renderStatsV329.particles++;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            // Draw Floater Texts
            if (gameState.floaters.length) ctx.font = '10px "Press Start 2P"';
            for(let i=Math.max(0, gameState.floaters.length-24); i<gameState.floaters.length; i++){
                const f=gameState.floaters[i];
                if(!f || !isWorldRectVisibleV329(f.x, f.y-16, 80, 20, TILE_SIZE)) continue;
                renderStatsV329.floaters++;
                ctx.fillStyle = f.color;
                ctx.globalAlpha = Math.max(0, f.opacity);
                ctx.fillText(f.text, f.x, f.y);
                ctx.globalAlpha = 1.0;
            }

            ctx.restore();

            drawAmbientDust();
            drawLighting();
            renderCombatFeedback();
        }

        function drawSteelWall(x, y, targetCtx = ctx) {
            // Pilar 3D Reforzado
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('wallBase') : '#475569'; // Top Base
            targetCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('wallHighlight') : '#94a3b8'; // Top Highlight
            targetCtx.fillRect(x, y, TILE_SIZE, 3);
            targetCtx.fillRect(x, y, 3, TILE_SIZE);
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('wallShadow') : '#334155'; // Sombra inferior/derecha
            targetCtx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
            targetCtx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
            
            // Bisel interior
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('wallInset') : '#1e293b';
            targetCtx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('wallDeep') : '#0f172a';
            targetCtx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
            
            // Remaches
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('wallAccent') : '#38bdf8';
            targetCtx.fillRect(x + 10, y + 10, 2, 2);
            targetCtx.fillRect(x + TILE_SIZE - 12, y + TILE_SIZE - 12, 2, 2);
        }

        function drawBrickBlock(x, y, targetCtx = ctx) {
            // Cajas de madera (Crates) destructibles
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('blockBase') : '#b45309'; // Marrón base
            targetCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            
            // Bordes de madera
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('blockHighlight') : '#f59e0b'; // Borde claro
            targetCtx.fillRect(x, y, TILE_SIZE, 3);
            targetCtx.fillRect(x, y, 3, TILE_SIZE);
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('blockShadow') : '#78350f'; // Borde oscuro
            targetCtx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
            targetCtx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);

            // Patrón de cruz
            targetCtx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('blockPattern') : '#92400e';
            targetCtx.lineWidth = 4;
            targetCtx.beginPath();
            targetCtx.moveTo(x + 6, y + 6);
            targetCtx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
            targetCtx.moveTo(x + TILE_SIZE - 6, y + 6);
            targetCtx.lineTo(x + 6, y + TILE_SIZE - 6);
            targetCtx.stroke();
            
            // Refuerzo central
            targetCtx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('blockCore') : '#451a03';
            targetCtx.fillRect(x + TILE_SIZE/2 - 4, y + TILE_SIZE/2 - 4, 8, 8);
        }

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

        function drawBombermanSprite(x, y) {
            ctx.save();
            let bounce = Math.sin(player.walkCycle * 4) * (player.isMoving ? 3 : 1);
            const recoil = getPlayerRenderRecoil();
            let px = x + recoil.x, py = y + bounce + recoil.y;

            // Sombra
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombShadow') : 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(px + player.width/2, y + player.height, player.width/2.2, 5, 0, 0, Math.PI*2);
            ctx.fill();

            // Burbuja de Escudo
            if (player.hasShield) {
                ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerShield') : 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(px + player.width/2, py + player.height/2, player.width*0.8, 0, Math.PI*2);
                ctx.stroke();
            }

            // Traje (Azul)
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerSuit') : '#2563eb';
            ctx.fillRect(px + 6, py + 12, player.width - 12, player.height - 16);
            
            // Cinturón
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
            ctx.fillRect(px + 6, py + 22, player.width - 12, 4);
            // Hebilla
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerBuckle') : '#facc15';
            if (player.dir === 'down') {
                ctx.fillRect(px + player.width/2 - 4, py + 21, 8, 6);
            } else if (player.dir === 'left') {
                ctx.fillRect(px + 4, py + 21, 4, 6);
            } else if (player.dir === 'right') {
                ctx.fillRect(px + player.width - 8, py + 21, 4, 6);
            }

            // Casco (Blanco)
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerHelmet') : '#f8fafc';
            ctx.beginPath();
            ctx.arc(px + player.width/2, py + 10, 14, 0, Math.PI*2);
            ctx.fill();

            // Rostro Direccional
            if (player.dir === 'down') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + player.width/2 - 9, py + 4, 18, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + player.width/2 - 5, py + 7, 3, 6);
                ctx.fillRect(px + player.width/2 + 2, py + 7, 3, 6);
            } else if (player.dir === 'left') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + player.width/2 - 12, py + 4, 14, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + player.width/2 - 7, py + 7, 3, 6);
            } else if (player.dir === 'right') {
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerFace') : '#ffedd5';
                ctx.fillRect(px + player.width/2 - 2, py + 4, 14, 11);
                ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerDark') : '#0f172a';
                ctx.fillRect(px + player.width/2 + 4, py + 7, 3, 6);
            }

            // Antena
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerMetal') : '#94a3b8'; 
            ctx.fillRect(px + player.width/2 - 2, py - 6, 4, 4);
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerAccent') : '#ec4899'; 
            ctx.beginPath();
            ctx.arc(px + player.width/2, py - 8, 5, 0, Math.PI*2);
            ctx.fill();

            // Guantes
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerAccent') : '#ec4899';
            if (player.dir !== 'right') { 
                ctx.beginPath(); ctx.arc(px + 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }
            if (player.dir !== 'left') { 
                ctx.beginPath(); ctx.arc(px + player.width - 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }

            // Pies (Zapatos Rojos) animando
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('playerBoot') : '#dc2626';
            let leftFootY = py + player.height - 4 + (player.isMoving && Math.floor(player.walkCycle*4)%2===0 ? -4 : 0);
            let rightFootY = py + player.height - 4 + (player.isMoving && Math.floor(player.walkCycle*4)%2===1 ? -4 : 0);
            
            if (player.dir === 'right') {
                ctx.beginPath(); ctx.ellipse(px + player.width/2 - 2, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + player.width/2 + 6, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else if (player.dir === 'left') {
                ctx.beginPath(); ctx.ellipse(px + player.width/2 - 6, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + player.width/2 + 2, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.ellipse(px + 8, leftFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + player.width - 8, rightFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
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
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('enemyShadow') : 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.height/2, e.width/2, 4, 0, 0, Math.PI*2);
            ctx.fill();

            // Cuerpo
            const enemyThemeKey = e?.type?.name === 'Rastrero' ? 'enemyRastrero' : e?.type?.name === 'Volador' ? 'enemyVolador' : e?.type?.name === 'Especial' ? 'enemyEspecial' : null;
            ctx.fillStyle = enemyThemeKey && typeof themeColorV46 === 'function' ? themeColorV46(enemyThemeKey, e.type.color) : e.type.color;
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

            ctx.restore();
        }

        function drawBombSprite(cx, cy, b) {
            if (typeof ensureBombV4State === 'function') ensureBombV4State(b);
            const moving = b?.motionState === 'moving' || b?.state === 'moving';
            const pulse = Math.sin(gameState.animFrame * 0.2 + (b?.bobPhase || 0)) * 0.08;
            let scale = 1.0 + pulse + (moving ? 0.04 * Math.sin((b.motionProgress || 0) * Math.PI * 2) : 0);
            ctx.save();
            ctx.translate(cx, cy);
            if (moving) ctx.rotate((b.motionRotation || 0) * 0.35);
            ctx.scale(scale, scale);

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

            // Sombra bomba
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('bombShadow') : 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(0, TILE_SIZE*0.3, TILE_SIZE*0.3, 4, 0, 0, Math.PI*2); ctx.fill();

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

        function drawExplosionSprite(x, y) {
            let size = TILE_SIZE;
            let pulse = Math.sin(gameState.animFrame * 0.5) * 4;
            
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('fireOuter') : 'rgba(220, 38, 38, 0.8)'; // Fuego exterior
            ctx.fillRect(x + 2 - pulse/2, y + 2 - pulse/2, size - 4 + pulse, size - 4 + pulse);
            
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('fireMiddle') : '#f97316'; // Fuego medio
            ctx.fillRect(x + 6 - pulse/2, y + 6 - pulse/2, size - 12 + pulse, size - 12 + pulse);
            
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('fireCore') : '#fef08a'; // Núcleo
            ctx.fillRect(x + 12 - pulse/2, y + 12 - pulse/2, size - 24 + pulse, size - 24 + pulse);
        }

        function drawPowerupSprite(item) {
            const x = item.x * TILE_SIZE;
            const y = item.y * TILE_SIZE;
            const type = item.type;
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
            ctx.fillStyle = typeof themeColorV46 === 'function' ? themeColorV46('powerupBase') : '#0284c7';
            ctx.fillRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);
            ctx.strokeStyle = typeof themeColorV46 === 'function' ? themeColorV46('powerupAccent') : '#38bdf8';
            ctx.strokeRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);

            ctx.font = '14px "Press Start 2P"';
            let icon = '💣';
            if (type === POWERUPS.FIRE_UP) icon = '🔥';
            if (type === POWERUPS.SPEED_UP) icon = '👟';
            if (type === POWERUPS.HEALTH_UP) icon = '❤️';
            if (type === POWERUPS.SHIELD_UP) icon = '🛡️';
            ctx.fillText(icon, x + 10, y + 30 + floaty);
        }


