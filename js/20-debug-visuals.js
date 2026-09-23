// Bomberman Roguelike v3.16.2 — Debug world visualizers
(() => {
    'use strict';
    if (!window.DEBUG_MODE?.enabled) return;

    const D = window.DEBUG_MODE;

    function screenPoint(x, y) {
        return { x: x - gameState.camera.x, y: y - gameState.camera.y };
    }

    function drawRect(rect, stroke, fill = null, lineWidth = 1) {
        if (!rect) return;
        ctx.save();
        if (fill) { ctx.fillStyle = fill; ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top); }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
        ctx.restore();
    }

    function drawDebugGrid() {
        ctx.save();
        ctx.strokeStyle = 'rgba(56,189,248,.20)';
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

    function drawDebugCollision() {
        if (typeof gridGetEntityRect === 'function') {
            drawRect(screenRect({
                left: player.x + 5,
                right: player.x + player.width - 5,
                top: player.y + 5,
                bottom: player.y + player.height - 5
            }), 'rgba(34,211,238,.95)');
        }
        for (const e of gameState.enemies) {
            const rect = typeof gridGetEntityRect === 'function'
                ? gridGetEntityRect(e, e.x, e.y, 'enemy')
                : {left:e.x-e.width*.47,right:e.x+e.width*.47,top:e.y-e.height*.47,bottom:e.y+e.height*.47};
            drawRect(screenRect(rect), 'rgba(248,113,113,.95)');
        }
    }

    function screenRect(rect) {
        return { left: rect.left - gameState.camera.x, right: rect.right - gameState.camera.x, top: rect.top - gameState.camera.y, bottom: rect.bottom - gameState.camera.y };
    }

    function drawDebugHitboxes() {
        const playerRect = { left: player.x, right: player.x + player.width, top: player.y, bottom: player.y + player.height };
        drawRect(screenRect(playerRect), 'rgba(255,255,255,.82)', null, 1.5);
        for (const e of gameState.enemies) {
            const rect = {left:e.x-e.width/2,right:e.x+e.width/2,top:e.y-e.height/2,bottom:e.y+e.height/2};
            drawRect(screenRect(rect), 'rgba(250,204,21,.82)');
        }
    }

    function drawDebugBombs() {
        for (const bomb of gameState.bombs) {
            const cells = typeof calculateBombBlastCells === 'function' ? calculateBombBlastCells(bomb) : [];
            ctx.save();
            ctx.strokeStyle = 'rgba(251,191,36,.8)';
            ctx.fillStyle = 'rgba(251,191,36,.08)';
            for (const cell of cells) {
                const p = screenPoint(cell.x * TILE_SIZE, cell.y * TILE_SIZE);
                ctx.fillRect(p.x + 3, p.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
                ctx.strokeRect(p.x + 3, p.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            }
            const pc = screenPoint((bomb.x + .5) * TILE_SIZE, (bomb.y + .5) * TILE_SIZE);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '8px Consolas,monospace';
            ctx.fillText(`${Math.ceil(Math.max(0,bomb.timer))}ms`, pc.x - 18, pc.y - 20);
            ctx.restore();
        }
    }

    function drawDebugExplosions() {
        for (const exp of gameState.explosions) {
            const p = screenPoint(exp.x * TILE_SIZE, exp.y * TILE_SIZE);
            ctx.save();
            ctx.strokeStyle = 'rgba(251,113,133,.95)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x + 2, p.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = '#fecdd3';
            ctx.font = '8px Consolas,monospace';
            ctx.fillText(`${Math.ceil(exp.timer)}ms`, p.x + 4, p.y + 11);
            ctx.restore();
        }
    }

    function drawArrow(x1,y1,x2,y2,color,label) {
        const ang=Math.atan2(y2-y1,x2-x1), head=6;
        ctx.save();
        ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-Math.cos(ang-.55)*head,y2-Math.sin(ang-.55)*head); ctx.lineTo(x2-Math.cos(ang+.55)*head,y2-Math.sin(ang+.55)*head); ctx.closePath(); ctx.fill();
        if(label){ctx.font='8px Consolas,monospace';ctx.fillText(label,x1+4,y1-5);}
        ctx.restore();
    }

    function drawDebugAI() {
        const p = screenPoint(player.x + player.width/2, player.y + player.height/2);
        ctx.save();
        ctx.strokeStyle='rgba(56,189,248,.25)';
        ctx.setLineDash([4,4]);
        for(const e of gameState.enemies){
            if(!e.ai) continue;
            const ex=e.x-gameState.camera.x, ey=e.y-gameState.camera.y;
            const dirMap={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
            const d=dirMap[e.ai.direction]||[0,0];
            drawArrow(ex,ey,ex+d[0]*24,ey+d[1]*24,'#22c55e',e.ai.behavior||'patrol');
            ctx.fillStyle=e.ai.seesPlayer?'#ef4444':'#facc15';
            ctx.font='8px Consolas,monospace';
            ctx.fillText(`${e.ai.direction||'?'} / ${e.ai.desiredDirection||'?'}`,ex+7,ey+11);
            if(e.ai.seesPlayer){
                drawArrow(ex,ey,p.x,p.y,'rgba(239,68,68,.45)','LOS');
            }
        }
        ctx.restore();
    }

    function drawDebugCamera() {
        ctx.save();
        ctx.strokeStyle='rgba(96,165,250,.8)';
        ctx.lineWidth=2;
        ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);
        if(typeof getCameraBounds==='function'){
            const b=getCameraBounds();
            ctx.fillStyle='rgba(148,163,184,.9)';
            ctx.font='9px Consolas,monospace';
            ctx.fillText(`CAM ${gameState.camera.x.toFixed(0)},${gameState.camera.y.toFixed(0)} / MAX ${b.maxX.toFixed(0)},${b.maxY.toFixed(0)}`,8,canvas.height-10);
        }
        ctx.restore();
    }

    function drawDebugReachableArea(nav) {
        const cells = nav?.player?.cells || [];
        if (!cells.length) return;
        ctx.save();
        ctx.fillStyle = 'rgba(34,211,238,.055)';
        ctx.strokeStyle = 'rgba(34,211,238,.18)';
        ctx.lineWidth = 1;
        for (const pair of cells) {
            const x = pair[0];
            const y = pair[1];
            const p = screenPoint(x * TILE_SIZE, y * TILE_SIZE);
            ctx.fillRect(p.x + 2, p.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeRect(p.x + 3, p.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        }
        ctx.restore();
    }

    function routeColor(index) {
        const palette = ['#22c55e', '#f59e0b', '#a78bfa', '#fb7185', '#38bdf8', '#f97316', '#e879f9', '#84cc16'];
        return palette[index % palette.length];
    }

    function drawDebugNavigationPaths() {
        const nav = typeof debugNavigationSnapshot === 'function' ? debugNavigationSnapshot() : null;
        if (!nav) return;

        drawDebugReachableArea(nav);

        const playerCenter = screenPoint(
            (nav.player.tile.x + 0.5) * TILE_SIZE,
            (nav.player.tile.y + 0.5) * TILE_SIZE
        );
        ctx.save();
        ctx.strokeStyle = 'rgba(34,211,238,.95)';
        ctx.fillStyle = 'rgba(34,211,238,.95)';
        ctx.lineWidth = 3;
        for (const dir of (nav.player.options || [])) {
            const d = { UP:[0,-1], RIGHT:[1,0], DOWN:[0,1], LEFT:[-1,0] }[dir];
            if (!d) continue;
            drawArrow(playerCenter.x, playerCenter.y, playerCenter.x + d[0] * 24, playerCenter.y + d[1] * 24, '#22d3ee', `P:${dir}`);
        }
        ctx.restore();

        for (const enemy of (nav.enemies || [])) {
            const path = enemy.route || [];
            const color = routeColor(enemy.index);
            if (!path.length) {
                const p = screenPoint((enemy.tile.x + 0.5) * TILE_SIZE, (enemy.tile.y + 0.5) * TILE_SIZE);
                ctx.save();
                ctx.strokeStyle = 'rgba(248,113,113,.8)';
                ctx.setLineDash([5, 4]);
                ctx.strokeRect(p.x + 7, p.y + 7, TILE_SIZE - 14, TILE_SIZE - 14);
                ctx.font = '8px Consolas,monospace';
                ctx.fillStyle = '#fca5a5';
                ctx.fillText(`E${enemy.index} SIN RUTA`, p.x + 3, p.y - 4);
                ctx.restore();
                continue;
            }

            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            path.forEach((cell, i) => {
                const p = screenPoint((cell.x + 0.5) * TILE_SIZE, (cell.y + 0.5) * TILE_SIZE);
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
            const last = path[Math.min(path.length - 1, 5)];
            const prev = path[Math.max(0, Math.min(path.length - 2, 4))];
            const p1 = screenPoint((prev.x + 0.5) * TILE_SIZE, (prev.y + 0.5) * TILE_SIZE);
            const p2 = screenPoint((last.x + 0.5) * TILE_SIZE, (last.y + 0.5) * TILE_SIZE);
            drawArrow(p1.x, p1.y, p2.x, p2.y, color, `E${enemy.index} ${enemy.routeLength}`);
            ctx.restore();
        }
    }

    function drawDebugSpawns() {
        ctx.save();
        for(const e of gameState.enemies){
            const p=screenPoint(e.x,e.y);
            ctx.strokeStyle='rgba(168,85,247,.82)';
            ctx.strokeRect(p.x-12,p.y-12,24,24);
        }
        ctx.restore();
    }

    window.drawDebugWorldOverlay = function(){
        if(!D.visible) return;
        if(D.selectedVisuals.grid) drawDebugGrid();
        if(D.selectedVisuals.collision) drawDebugCollision();
        if(D.selectedVisuals.hitboxes) drawDebugHitboxes();
        if(D.selectedVisuals.bombs) drawDebugBombs();
        if(D.selectedVisuals.explosions) drawDebugExplosions();
        if(D.selectedVisuals.ai) drawDebugAI();
        if(D.selectedVisuals.camera) drawDebugCamera();
        if(D.selectedVisuals.spawns) drawDebugSpawns();
        if(D.selectedVisuals.paths) drawDebugNavigationPaths();
    };
})();
