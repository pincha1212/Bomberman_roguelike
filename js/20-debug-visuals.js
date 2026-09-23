// Bomberman Roguelike v3.16.3 — Debug visualizers
// Las capas de navegación se dibujan sobre el mismo canvas del juego.
(() => {
    'use strict';
    if (!window.DEBUG_MODE?.enabled) return;

    const D = window.DEBUG_MODE;
    const DIRS = { UP:[0,-1], RIGHT:[1,0], DOWN:[0,1], LEFT:[-1,0] };

    const toScreen = (x, y) => ({ x: x - gameState.camera.x, y: y - gameState.camera.y });
    const tileCenter = (x, y) => toScreen((x + .5) * TILE_SIZE, (y + .5) * TILE_SIZE);

    function drawRect(rect, stroke, fill = null, lineWidth = 1) {
        if (!rect) return;
        ctx.save();
        if (fill) { ctx.fillStyle = fill; ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top); }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
        ctx.restore();
    }

    function screenRect(rect) {
        return { left: rect.left - gameState.camera.x, right: rect.right - gameState.camera.x, top: rect.top - gameState.camera.y, bottom: rect.bottom - gameState.camera.y };
    }

    function drawGrid() {
        ctx.save();
        ctx.strokeStyle = 'rgba(56,189,248,.17)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= gameState.gridWidth; x++) {
            const sx = x * TILE_SIZE - gameState.camera.x;
            ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, gameState.gridHeight * TILE_SIZE - gameState.camera.y); ctx.stroke();
        }
        for (let y = 0; y <= gameState.gridHeight; y++) {
            const sy = y * TILE_SIZE - gameState.camera.y;
            ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(gameState.gridWidth * TILE_SIZE - gameState.camera.x, sy); ctx.stroke();
        }
        ctx.restore();
    }

    function drawCollision() {
        if (typeof gridGetEntityRect === 'function') {
            drawRect(screenRect(gridGetEntityRect(player, player.x, player.y, 'player')), 'rgba(34,211,238,.95)');
            for (const enemy of gameState.enemies) {
                drawRect(screenRect(gridGetEntityRect(enemy, enemy.x, enemy.y, 'enemy')), 'rgba(248,113,113,.95)');
            }
        }
    }

    function drawHitboxes() {
        drawRect(screenRect({ left: player.x, right: player.x + player.width, top: player.y, bottom: player.y + player.height }), 'rgba(255,255,255,.8)', null, 1.5);
        for (const enemy of gameState.enemies) {
            drawRect(screenRect({ left: enemy.x-enemy.width/2, right: enemy.x+enemy.width/2, top: enemy.y-enemy.height/2, bottom: enemy.y+enemy.height/2 }), 'rgba(250,204,21,.85)');
        }
    }

    function drawBombs() {
        for (const bomb of gameState.bombs) {
            const cells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(bomb) : [];
            ctx.save();
            ctx.fillStyle = 'rgba(251,191,36,.07)';
            ctx.strokeStyle = 'rgba(251,191,36,.85)';
            for (const cell of cells) {
                const p = toScreen(cell.x*TILE_SIZE, cell.y*TILE_SIZE);
                ctx.fillRect(p.x+3,p.y+3,TILE_SIZE-6,TILE_SIZE-6);
                ctx.strokeRect(p.x+3,p.y+3,TILE_SIZE-6,TILE_SIZE-6);
            }
            const c = tileCenter(bomb.x,bomb.y);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '8px Consolas,monospace';
            ctx.fillText(`${Math.ceil(Math.max(0,bomb.timer))}ms`, c.x-18, c.y-20);
            ctx.restore();
        }
    }

    function drawExplosions() {
        ctx.save();
        for (const exp of gameState.explosions) {
            const p = toScreen(exp.x*TILE_SIZE, exp.y*TILE_SIZE);
            ctx.strokeStyle = 'rgba(251,113,133,.95)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x+2,p.y+2,TILE_SIZE-4,TILE_SIZE-4);
            ctx.fillStyle = '#fecdd3';
            ctx.font = '8px Consolas,monospace';
            ctx.fillText(`${Math.ceil(exp.timer)}ms`, p.x+4, p.y+11);
        }
        ctx.restore();
    }

    function arrow(x1,y1,x2,y2,color,label='') {
        const ang = Math.atan2(y2-y1, x2-x1);
        const head = 7;
        ctx.save();
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2,y2);
        ctx.lineTo(x2-Math.cos(ang-.55)*head, y2-Math.sin(ang-.55)*head);
        ctx.lineTo(x2-Math.cos(ang+.55)*head, y2-Math.sin(ang+.55)*head);
        ctx.closePath(); ctx.fill();
        if (label) { ctx.font='8px Consolas,monospace'; ctx.fillText(label,x1+4,y1-5); }
        ctx.restore();
    }

    function drawNavigation() {
        const nav = D.getNavigationSnapshot();
        if (!nav?.available) return;

        const player = nav.player;
        if (player) {
            // Árbol de alcance: representa las celdas a las que el jugador puede llegar.
            ctx.save();
            ctx.strokeStyle = 'rgba(34,211,238,.18)';
            ctx.lineWidth = 1;
            for (const edge of (player.treeEdges || [])) {
                const a = tileCenter(edge[0].x, edge[0].y);
                const b = tileCenter(edge[1].x, edge[1].y);
                ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
            }
            ctx.fillStyle = 'rgba(34,211,238,.045)';
            ctx.strokeStyle = 'rgba(34,211,238,.13)';
            for (const cell of (player.cells || [])) {
                const p = toScreen(cell.x*TILE_SIZE, cell.y*TILE_SIZE);
                ctx.fillRect(p.x+2,p.y+2,TILE_SIZE-4,TILE_SIZE-4);
                ctx.strokeRect(p.x+3,p.y+3,TILE_SIZE-6,TILE_SIZE-6);
            }
            ctx.restore();

            const pc = tileCenter(player.tile.x, player.tile.y);
            for (const dir of (player.options || [])) {
                const d = DIRS[dir];
                if (!d) continue;
                arrow(pc.x,pc.y,pc.x+d[0]*24,pc.y+d[1]*24,'#22d3ee',`P:${dir}`);
            }
            ctx.save();
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 9px Consolas,monospace';
            ctx.fillText(`PLAYER ${player.tile.x},${player.tile.y} · ${player.reachableTiles} celdas`, pc.x+8, pc.y+17);
            ctx.restore();
        }

        for (const enemy of (nav.enemies || [])) {
            const color = ['#22c55e','#f59e0b','#a78bfa','#fb7185','#38bdf8','#f97316','#e879f9','#84cc16'][enemy.index % 8];
            const path = enemy.route || [];
            const start = tileCenter(enemy.tile.x, enemy.tile.y);

            if (!path.length) {
                ctx.save();
                ctx.strokeStyle='rgba(248,113,113,.9)';
                ctx.setLineDash([5,4]);
                ctx.strokeRect(start.x+7,start.y+7,TILE_SIZE-14,TILE_SIZE-14);
                ctx.fillStyle='#fca5a5';
                ctx.font='8px Consolas,monospace';
                ctx.fillText(`E${enemy.index} SIN RUTA`,start.x-4,start.y-7);
                ctx.restore();
            } else {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                ctx.globalAlpha = .88;
                ctx.lineWidth = 3;
                ctx.beginPath();
                path.forEach((cell,i)=>{
                    const p = tileCenter(cell.x,cell.y);
                    if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
                });
                ctx.stroke();
                ctx.restore();

                // Flechas cada 2-3 celdas para que la dirección sea legible sin llenar el mapa.
                for(let i=1;i<path.length;i+=2){
                    const a = tileCenter(path[i-1].x,path[i-1].y);
                    const b = tileCenter(path[i].x,path[i].y);
                    arrow(a.x,a.y,b.x,b.y,color,`E${enemy.index}`);
                }
            }

            const currentDir = DIRS[enemy.currentDirection];
            const desiredDir = DIRS[enemy.desiredDirection];
            if (currentDir) arrow(start.x,start.y,start.x+currentDir[0]*18,start.y+currentDir[1]*18,'#f8fafc','C');
            if (desiredDir) arrow(start.x,start.y,start.x+desiredDir[0]*30,start.y+desiredDir[1]*30,'#f43f5e','D');

            ctx.save();
            ctx.fillStyle = enemy.seesPlayer ? '#f87171' : color;
            ctx.font = '8px Consolas,monospace';
            ctx.fillText(`E${enemy.index} ${enemy.routeLength}c`, start.x+9,start.y+18);
            ctx.restore();
        }
    }

    function drawAI() {
        const nav = D.getNavigationSnapshot();
        if (!nav?.available) return;
        const p = tileCenter(nav.player.tile.x, nav.player.tile.y);
        for (const enemy of (nav.enemies || [])) {
            const e = tileCenter(enemy.tile.x, enemy.tile.y);
            if (enemy.seesPlayer) arrow(e.x,e.y,p.x,p.y,'rgba(239,68,68,.42)','LOS');
        }
    }

    function drawCamera() {
        ctx.save();
        ctx.strokeStyle='rgba(96,165,250,.85)';
        ctx.lineWidth=2;
        ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);
        if(typeof getCameraBounds==='function'){
            const b=getCameraBounds();
            ctx.fillStyle='rgba(148,163,184,.95)';
            ctx.font='9px Consolas,monospace';
            ctx.fillText(`CAM ${gameState.camera.x.toFixed(0)},${gameState.camera.y.toFixed(0)} · MAX ${b.maxX.toFixed(0)},${b.maxY.toFixed(0)}`,8,canvas.height-10);
        }
        ctx.restore();
    }

    function drawSpawns() {
        ctx.save();
        for(const enemy of gameState.enemies){
            const p = toScreen(enemy.x,enemy.y);
            ctx.strokeStyle='rgba(168,85,247,.82)';
            ctx.strokeRect(p.x-12,p.y-12,24,24);
        }
        ctx.restore();
    }

    window.drawDebugWorldOverlay = function(){
        if(!D.visible) return;
        if(D.selectedVisuals.grid) drawGrid();
        if(D.selectedVisuals.collision) drawCollision();
        if(D.selectedVisuals.hitboxes) drawHitboxes();
        if(D.selectedVisuals.bombs) drawBombs();
        if(D.selectedVisuals.explosions) drawExplosions();
        if(D.selectedVisuals.paths) drawNavigation();
        if(D.selectedVisuals.ai) drawAI();
        if(D.selectedVisuals.camera) drawCamera();
        if(D.selectedVisuals.spawns) drawSpawns();
    };
})();
