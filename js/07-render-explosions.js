// Bomberman Roguelike v6.31.14 — Diagnóstico: capa exterior de explosión desactivada
// Extracción mecánica desde js/07-render.js. Cuerpos conservados sin cambios.

let blastVisualSerialV6308 = 0;

function getExplosionEffectKeyV6308(effectId) {
    const key = String(effectId || 'normal').toLowerCase();
    const aliases = {
        normal: 'fire', fire: 'fire', heat: 'fire',
        ice: 'ice', frost: 'ice', cold: 'ice',
        electric: 'electric', shock: 'electric', arc: 'arc',
        steam: 'steam', plasma: 'plasma', acid: 'acid'
    };
    return aliases[key] || key;
}

function mixExplosionColorV6308(a, b, amount) {
    const parse = value => {
        const text = String(value || '').trim();
        const short = text.match(/^#([0-9a-f]{3})$/i);
        const full = text.match(/^#([0-9a-f]{6})$/i);
        let hex = full?.[1] || (short ? short[1].split('').map(ch => ch + ch).join('') : 'f97316');
        return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    };
    const aa = parse(a), bb = parse(b), t = Math.max(0, Math.min(1, Number(amount) || 0));
    return '#' + aa.map((v, i) => Math.max(0, Math.min(255, Math.round(v*(1-t)+bb[i]*t))).toString(16).padStart(2,'0')).join('');
}

function explosionPaletteV6308(effectId) {
    const key = getExplosionEffectKeyV6308(effectId);
    const fire = {
        outer: typeof themeColorV46 === 'function' ? themeColorV46('fireOuter', '#b91c1c') : '#b91c1c',
        middle: typeof themeColorV46 === 'function' ? themeColorV46('fireMiddle', '#f97316') : '#f97316',
        core: typeof themeColorV46 === 'function' ? themeColorV46('fireCore', '#fff1a8') : '#fff1a8'
    };
    const palettes = {
        fire,
        ice: { outer:'#123f70', middle:'#38bdf8', core:'#e0f2fe' },
        electric: { outer:'#1d4ed8', middle:'#22d3ee', core:'#f0fdff' },
        arc: { outer:'#1e40af', middle:'#06b6d4', core:'#ffffff' },
        steam: { outer:'#475569', middle:'#cbd5e1', core:'#ffffff' },
        plasma: { outer:'#6b21a8', middle:'#d946ef', core:'#fae8ff' },
        acid: { outer:'#365314', middle:'#84cc16', core:'#ecfccb' }
    };
    if (palettes[key]) return palettes[key];
    const def = window.BOMB_EFFECT_DEFS_V64?.[String(effectId || '').toLowerCase()];
    if (def?.color) return {
        outer: mixExplosionColorV6308(def.color, '#111827', 0.55),
        middle: String(def.color),
        core: String(def.core || '#fff7ed')
    };
    return fire;
}

// v6.31.14 diagnostic: obsolete brown residue palette removed; no renderer uses it.

function registerBombBlastVisualV6308(payload) {
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState;
    const inputCells = Array.isArray(payload?.cells) ? payload.cells : [];
    if (!state || !inputCells.length) return false;
    if (!Array.isArray(state.bombBlastVisualsV6308)) state.bombBlastVisualsV6308 = [];

    const bomb = payload.bomb || {};
    const incomingId = payload.blastId == null ? null : String(payload.blastId);
    if (incomingId && state.bombBlastVisualsV6308.some(item => item.blastId === incomingId)) return true;

    let element = String(bomb.elementV612 || 'normal').toLowerCase();
    if (element === 'normal' && Array.isArray(bomb.effectIds) && bomb.effectIds.length) {
        const fromEffect = getExplosionEffectKeyV6308(bomb.effectIds[0]);
        if (fromEffect !== 'fire' || String(bomb.effectIds[0]).toLowerCase() === 'heat') element = fromEffect;
        else element = 'normal';
    }
    element = getExplosionEffectKeyV6308(element);

    const uniqueCells = new Map();
    for (const cell of inputCells) {
        const x = Number(cell?.x), y = Number(cell?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const tx = Math.trunc(x), ty = Math.trunc(y);
        uniqueCells.set(`${tx},${ty}`, { x: tx, y: ty, element });
    }
    if (!uniqueCells.size) return false;

    const fallback = uniqueCells.values().next().value;
    const originX = Number.isFinite(Number(bomb.x)) ? Math.trunc(Number(bomb.x)) : fallback.x;
    const originY = Number.isFinite(Number(bomb.y)) ? Math.trunc(Number(bomb.y)) : fallback.y;
    const cells = [...uniqueCells.values()];
    const maxDistance = Math.max(1, ...cells.map(cell => Math.abs(cell.x-originX)+Math.abs(cell.y-originY)));

    state.bombBlastVisualsV6308.push({
        visualId: incomingId || `visual-${++blastVisualSerialV6308}`,
        blastId: incomingId,
        originX, originY,
        element,
        ageMs: 0,
        durationMs: 350,
        expansionMs: 80,
        settleMs: 250,
        maxDistance,
        cells
    });
    if (state.bombBlastVisualsV6308.length > 96) state.bombBlastVisualsV6308.splice(0, state.bombBlastVisualsV6308.length - 96);
    return true;
}

function updateBombBlastVisualsV6308(dt) {
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState;
    if (!state || !Array.isArray(state.bombBlastVisualsV6308)) return;
    if (!state.isPlaying) { state.bombBlastVisualsV6308.length = 0; return; }
    if (state.paused) return;
    const elapsed = Math.max(0, Math.min(1000, Number(dt) || 0));
    for (const visual of state.bombBlastVisualsV6308) visual.ageMs += elapsed;
    for (let i = state.bombBlastVisualsV6308.length - 1; i >= 0; i--) {
        if (!state.bombBlastVisualsV6308[i] || state.bombBlastVisualsV6308[i].ageMs >= 350) state.bombBlastVisualsV6308.splice(i, 1);
    }
}

function resetBombBlastVisualsV6308() {
    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState;
    if (state && Array.isArray(state.bombBlastVisualsV6308)) state.bombBlastVisualsV6308.length = 0;
}

function explosionComponentsV6308(cellMap) {
    const directions = [[1,0],[-1,0],[0,1],[0,-1]];
    const keyOf = (x,y) => `${x},${y}`;
    const unvisited = new Set(cellMap.keys());
    const components = [];
    while (unvisited.size) {
        const seed = unvisited.values().next().value;
        unvisited.delete(seed);
        const queue = [cellMap.get(seed)];
        const component = [];
        while (queue.length) {
            const cell = queue.pop();
            component.push(cell);
            for (const [dx,dy] of directions) {
                const key = keyOf(cell.x+dx, cell.y+dy);
                if (!unvisited.has(key)) continue;
                unvisited.delete(key);
                queue.push(cellMap.get(key));
            }
        }
        if (component.some(cell => isWorldTileVisibleV329(cell.x, cell.y, 1))) components.push(component);
    }
    return components;
}

function explosionGraphPathsV6308(component) {
    const keyOf = cell => `${cell.x},${cell.y}`;
    const edgeKey = (a,b) => [keyOf(a),keyOf(b)].sort().join('|');
    const cells = new Map(component.map(cell => [keyOf(cell),cell]));
    const neighbors = new Map();
    for (const cell of component) {
        const around = [];
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const next = cells.get(`${cell.x+dx},${cell.y+dy}`);
            if (next) around.push(next);
        }
        neighbors.set(keyOf(cell), around);
    }
    const visited = new Set();
    const paths = [];
    function walk(start,next) {
        const points = [start];
        let previous = start, current = next, closed = false;
        for (let guard=0; guard<=component.length+2; guard++) {
            visited.add(edgeKey(previous,current));
            points.push(current);
            const around = neighbors.get(keyOf(current)) || [];
            if (around.length !== 2) break;
            const following = around.find(cell => keyOf(cell) !== keyOf(previous));
            if (!following) break;
            if (visited.has(edgeKey(current,following))) {
                if (keyOf(following) === keyOf(start)) { points.push(start); closed = true; }
                break;
            }
            previous=current; current=following;
        }
        return { points, closed };
    }
    for (const cell of component) {
        const around = neighbors.get(keyOf(cell)) || [];
        if (around.length === 2) continue;
        for (const next of around) if (!visited.has(edgeKey(cell,next))) paths.push(walk(cell,next));
    }
    for (const cell of component) for (const next of neighbors.get(keyOf(cell)) || []) {
        if (!visited.has(edgeKey(cell,next))) paths.push(walk(cell,next));
    }
    return { paths, neighbors };
}

// Residuos discretos de suelo: dibujo tenue, unido y situado antes de las entidades.
// Nunca reutiliza la silueta flameante de la detonación ni dibuja un cuadrado por tile.
// v6.31.12: residuos visuales de suelo desactivados de forma definitiva.
// Esta función se conserva como API compatible porque el coordinador o versiones
// anteriores pueden seguir invocándola. No dibuja marcas, textura ni trazos.
// El haz animado continúa en drawExplosionClustersV6308(), independiente de esto.
function drawElementalResiduesV6308(_targetCtx, _effectFields = []) {
    return 0;
}

function drawExplosionClustersV6308(blastVisuals = []) {
    const visuals = Array.isArray(blastVisuals) ? blastVisuals : [];
    if (!visuals.length) return 0;

    // Un mapa por elemento evita que explosiones de colores distintos se
    // fusionen en una celda o creen gradientes entre paletas incompatibles.
    const mapsByElement = new Map();
    const keyOf = (x, y) => `${x},${y}`;
    for (const visual of visuals) {
        if (!visual || !(Number(visual.ageMs) >= 0) || Number(visual.ageMs) >= 350) continue;
        const age = Math.max(0, Number(visual.ageMs) || 0);
        const expansion = age < 80 ? Math.max(0, Math.min(1, age / 80)) : 1;
        const originX = Math.trunc(Number(visual.originX) || 0);
        const originY = Math.trunc(Number(visual.originY) || 0);
        const sourceCells = Array.isArray(visual.cells) ? visual.cells : [];
        const maxDistance = Math.max(1, Number(visual.maxDistance) || 1);
        const element = getExplosionEffectKeyV6308(String(visual.element || 'fire'));
        let group = mapsByElement.get(element);
        if (!group) {
            group = { element, palette: explosionPaletteV6308(element), cellMap: new Map() };
            mapsByElement.set(element, group);
        }

        for (const raw of sourceCells) {
            const x = Math.trunc(Number(raw?.x)), y = Math.trunc(Number(raw?.y));
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            const distance = Math.abs(x - originX) + Math.abs(y - originY);
            if (age < 80 && distance > maxDistance * expansion + 0.0001) continue;
            const key = keyOf(x, y);
            let cell = group.cellMap.get(key);
            if (!cell) {
                cell = { x, y, alpha: 0, ageMs: Infinity };
                group.cellMap.set(key, cell);
            }
            cell.alpha = Math.max(cell.alpha, age < 80 ? 0.55 + 0.45 * expansion : 1);
            cell.ageMs = Math.min(cell.ageMs, age);
        }
    }
    if (!mapsByElement.size) return 0;

    const groups = [...mapsByElement.values()].sort((a, b) => a.element.localeCompare(b.element));
    const size = TILE_SIZE, frame = Number(gameState.animFrame) || 0;
    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    const keyOfCell = cell => keyOf(cell.x, cell.y);
    let visibleCellCount = 0;

    function softJunction(cell, color, width) {
        const p = center(cell), h = width * 0.49, r = width * 0.16;
        ctx.beginPath();
        ctx.moveTo(p.x - h + r, p.y - h); ctx.lineTo(p.x + h - r, p.y - h);
        ctx.quadraticCurveTo(p.x + h, p.y - h, p.x + h, p.y - h + r); ctx.lineTo(p.x + h, p.y + h - r);
        ctx.quadraticCurveTo(p.x + h, p.y + h, p.x + h - r, p.y + h); ctx.lineTo(p.x - h + r, p.y + h);
        ctx.quadraticCurveTo(p.x - h, p.y + h, p.x - h, p.y + h - r); ctx.lineTo(p.x - h, p.y - h + r);
        ctx.quadraticCurveTo(p.x - h, p.y - h, p.x - h + r, p.y - h); ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
    }

    function taperedTip(cell, neighbor, color, width, extension, seed, scale) {
        const p = center(cell), n = center(neighbor), dx = Math.sign(p.x - n.x), dy = Math.sign(p.y - n.y), px = -dy, py = dx;
        const baseX = p.x - dx * size * 0.10 * scale, baseY = p.y - dy * size * 0.10 * scale, half = width * 0.39;
        const wave = Math.sin(frame * 0.23 + seed) * size * 0.012;
        const tipX = p.x + dx * extension * scale + px * wave, tipY = p.y + dy * extension * scale + py * wave;
        const cx = p.x + dx * extension * scale * 0.52, cy = p.y + dy * extension * scale * 0.52;
        ctx.beginPath();
        ctx.moveTo(baseX + px * half, baseY + py * half);
        ctx.quadraticCurveTo(cx + px * half, cy + py * half, tipX, tipY);
        ctx.quadraticCurveTo(cx - px * half * 0.72, cy - py * half * 0.72, baseX - px * half, baseY - py * half);
        ctx.quadraticCurveTo(baseX - dx * size * 0.02 * scale, baseY - dy * size * 0.02 * scale, baseX + px * half, baseY + py * half);
        ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }

    function drawLayer(component, paths, neighbors, palette, channel, width, extension, scale, licks, outer) {
        const color = palette[channel];
        // Color uniforme dentro de cada grupo elemental: no se crean gradientes
        // desde una celda vecina perteneciente a otro elemento.
        for (const path of paths) {
            for (let i = 1; i < path.points.length; i++) {
                const a = path.points[i - 1], b = path.points[i], pa = center(a), pb = center(b);
                ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
                ctx.strokeStyle = color; ctx.lineWidth = width * scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                if (outer) { ctx.shadowColor = color; ctx.shadowBlur = Math.min(12, size * 0.22); }
                ctx.stroke(); ctx.shadowBlur = 0;
            }
        }
        for (const cell of component) {
            const around = neighbors.get(keyOfCell(cell)) || [];
            let turn = false;
            if (around.length === 2) turn = (around[0].x !== around[1].x && around[0].y !== around[1].y);
            if (around.length >= 3 || turn) softJunction(cell, color, width * scale);
        }
        for (const path of paths) {
            const pts = path.points;
            if (pts.length < 2 || path.closed) continue;
            const first = pts[0], second = pts[1], last = pts[pts.length - 1], before = pts[pts.length - 2];
            if ((neighbors.get(keyOfCell(first)) || []).length === 1) taperedTip(first, second, color, width * scale, extension * scale, first.x * 7 + first.y * 13, 1);
            if ((neighbors.get(keyOfCell(last)) || []).length === 1) taperedTip(last, before, color, width * scale, extension * scale, last.x * 11 + last.y * 5, 1);
            if (!licks) continue;
            for (let i = 1; i < pts.length - 1; i++) {
                const cell = pts[i], around = neighbors.get(keyOfCell(cell)) || [];
                if (around.length !== 2) continue;
                const horizontal = pts[i - 1].y === cell.y && pts[i + 1].y === cell.y;
                const vertical = pts[i - 1].x === cell.x && pts[i + 1].x === cell.x;
                if ((!horizontal && !vertical) || Math.abs(cell.x * 7 + cell.y * 11) % 3 !== 0) continue;
                const p = center(cell), tangent = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }, side = ((cell.x * 5 + cell.y * 3) & 1) ? 1 : -1;
                const nx = -tangent.y * side, ny = tangent.x * side, base = width * scale * 0.37, half = size * 0.065;
                const bx = p.x + nx * base, by = p.y + ny * base, wave = Math.sin(frame * 0.19 + cell.x * 3.1 + cell.y * 8.7) * size * 0.018;
                const tx = bx + nx * (size * 0.17 + wave) + tangent.x * Math.cos(frame * 0.16 + cell.y) * size * 0.04;
                const ty = by + ny * (size * 0.17 + wave) + tangent.y * Math.cos(frame * 0.16 + cell.y) * size * 0.04;
                ctx.beginPath(); ctx.moveTo(bx - tangent.x * half, by - tangent.y * half);
                ctx.quadraticCurveTo(bx + nx * size * 0.07 - tangent.x * half * 0.4, by + ny * size * 0.07 - tangent.y * half * 0.4, tx, ty);
                ctx.quadraticCurveTo(bx + nx * size * 0.12 + tangent.x * half * 0.4, by + ny * size * 0.12 + tangent.y * half * 0.4, bx + tangent.x * half, by + tangent.y * half);
                ctx.closePath(); ctx.fillStyle = color; ctx.fill();
            }
        }
        if (component.length === 1) {
            const cell = component[0];
            softJunction(cell, color, width * scale * 0.86);
            for (let i = 0; i < 4; i++) {
                const neighbor = [
                    { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 },
                    { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y }
                ][i];
                taperedTip(cell, neighbor, color, width * scale * 0.68, extension * scale * 0.72, cell.x * 9 + cell.y * 7 + i, 1);
            }
        }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const group of groups) {
        const { components } = { components: explosionComponentsV6308(group.cellMap) };
        if (!components.length) continue;
        visibleCellCount += components.reduce((sum, component) => sum + component.length, 0);
        for (const component of components) {
            const { paths, neighbors } = explosionGraphPathsV6308(component);
            const age = component.reduce((sum, cell) => sum + (Number.isFinite(cell.ageMs) ? cell.ageMs : 0), 0) / component.length;
            const visibility = component.reduce((sum, cell) => sum + cell.alpha, 0) / component.length;
            const ease = age < 80 ? Math.max(0, Math.min(1, age / 80)) : 1;
            const scale = age < 80 ? 0.70 + 0.30 * ease : age < 250 ? 1 + Math.sin(frame * 0.9 + component[0].x) * 0.012 : 1 - 0.18 * Math.max(0, Math.min(1, (age - 250) / 100));
            const fadeCore = age < 250 ? 1 : Math.max(0, 1 - (age - 250) / 30);
            const fadeMiddle = age < 265 ? 1 : Math.max(0, 1 - (age - 265) / 50);
            const expansionLicks = age >= 80 && age < 250;
            // v6.31.14 DIAGNOSTIC: temporarily disable the dark outer halo.
            // The continuous blast remains visible through its middle and core layers.
            // If the brown cell marks persist, they are produced by another renderer/system.
            // ctx.globalAlpha = visibility * fadeOuter;
            // drawLayer(component, paths, neighbors, group.palette, 'outer', size * 0.82, size * 0.14, scale, expansionLicks, true);
            ctx.globalAlpha = visibility * fadeMiddle;
            drawLayer(component, paths, neighbors, group.palette, 'middle', size * 0.57, size * 0.115, scale, expansionLicks, false);
            ctx.globalAlpha = visibility * fadeCore;
            drawLayer(component, paths, neighbors, group.palette, 'core', size * 0.285, size * 0.075, scale, expansionLicks, false);
        }
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    return visibleCellCount;
}

window.registerBombBlastVisualV6308 = registerBombBlastVisualV6308;
window.updateBombBlastVisualsV6308 = updateBombBlastVisualsV6308;
window.resetBombBlastVisualsV6308 = resetBombBlastVisualsV6308;
window.drawElementalResiduesV6308 = drawElementalResiduesV6308;
