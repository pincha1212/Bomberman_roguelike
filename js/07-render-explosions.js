// Bomberman Roguelike v6.31.21 — Renderizador de explosiones elementales continuas
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

// La paleta antigua de residuos de suelo fue retirada: solo se dibuja el efecto de explosión animado.

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

// Suelo helado persistente de BOMB_ICE.
// Se limita a los campos frost: no modifica ni vuelve a dibujar fuego/electricidad.
// La película azul se extiende sobre casillas vecinas con un pequeño solape para
// ocultar las juntas del suelo y leerse como una sola capa de hielo.
function drawElementalResiduesV6308(targetCtx, effectFields) {
    const target = targetCtx || (typeof ctx !== 'undefined' ? ctx : null);
    if (!target || typeof target.save !== 'function' || typeof TILE_SIZE === 'undefined') return 0;

    const state = window.BOMBER_ENGINE?.getState?.() || window.gameState || null;
    const source = Array.isArray(effectFields) ? effectFields : state?.bombEffectFieldsV64;
    if (!Array.isArray(source) || source.length === 0) return 0;

    const cells = new Map();
    for (const field of source) {
        if (!field || String(field.effectId || '').toLowerCase() !== 'frost') continue;
        const x = Math.trunc(Number(field.x)), y = Math.trunc(Number(field.y));
        const remaining = Math.max(0, Number(field.remainingMs) || 0);
        if (!Number.isInteger(x) || !Number.isInteger(y) || remaining <= 0) continue;
        const tile = state?.grid?.[y]?.[x];
        if (typeof TYPES !== 'undefined' && (tile === TYPES.WALL || tile === TYPES.BLOCK)) continue;
        const key = `${x},${y}`;
        const previous = cells.get(key);
        if (!previous || remaining > previous.remainingMs) {
            const total = Math.max(remaining, Number(field.visualTotalMs) || 2800);
            const life = Math.max(0, Math.min(1, remaining / total));
            const fade = life < 0.24 ? life / 0.24 : 1;
            cells.set(key, { x, y, remainingMs: remaining, alpha: fade * (0.94 + 0.06 * life) });
        }
    }
    if (!cells.size) return 0;

    const keyOf = (x, y) => `${x},${y}`;
    const unvisited = new Set(cells.keys());
    const components = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (unvisited.size) {
        const first = unvisited.values().next().value;
        unvisited.delete(first);
        const queue = [cells.get(first)], component = [];
        while (queue.length) {
            const cell = queue.pop();
            component.push(cell);
            for (const [dx, dy] of dirs) {
                const nextKey = keyOf(cell.x + dx, cell.y + dy);
                if (!unvisited.has(nextKey)) continue;
                unvisited.delete(nextKey);
                queue.push(cells.get(nextKey));
            }
        }
        components.push(component);
    }

    const visible = cell => typeof isWorldTileVisibleV329 !== 'function' || isWorldTileVisibleV329(cell.x, cell.y, 1);
    const hash = (x, y, salt = 0) => {
        const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
        return n - Math.floor(n);
    };
    const size = Number(TILE_SIZE) || 48;
    const frame = Number(state?.animFrame) || 0;
    let rendered = 0;

    target.save();
    target.globalCompositeOperation = 'source-over';
    target.lineCap = 'round';
    target.lineJoin = 'round';

    for (const component of components) {
        const shown = component.filter(visible);
        if (!shown.length) continue;
        const minX = Math.min(...shown.map(c => c.x)) * size;
        const minY = Math.min(...shown.map(c => c.y)) * size;
        const maxX = Math.max(...shown.map(c => c.x + 1)) * size;
        const maxY = Math.max(...shown.map(c => c.y + 1)) * size;
        const gradient = target.createLinearGradient(minX, minY, maxX, maxY);
        gradient.addColorStop(0, 'rgba(187,244,255,0.48)');
        gradient.addColorStop(0.46, 'rgba(66,190,235,0.31)');
        gradient.addColorStop(1, 'rgba(35,116,190,0.42)');

        // Película base con solape solamente donde existe una casilla vecina.
        for (const cell of shown) {
            const x = cell.x * size, y = cell.y * size;
            const hasW = cells.has(keyOf(cell.x - 1, cell.y));
            const hasE = cells.has(keyOf(cell.x + 1, cell.y));
            const hasN = cells.has(keyOf(cell.x, cell.y - 1));
            const hasS = cells.has(keyOf(cell.x, cell.y + 1));
            const bleed = Math.max(1.25, size * 0.035);
            target.globalAlpha = cell.alpha;
            target.fillStyle = gradient;
            target.fillRect(x - (hasW ? bleed : 0), y - (hasN ? bleed : 0), size + (hasW ? bleed : 0) + (hasE ? bleed : 0), size + (hasN ? bleed : 0) + (hasS ? bleed : 0));

            // Reflejos suaves y diagonales de hielo; no se dibuja un contorno por tile.
            const r = hash(cell.x, cell.y, 1);
            target.globalAlpha = cell.alpha * (0.14 + 0.08 * Math.sin(frame * 0.08 + r * 6.28));
            target.fillStyle = r > 0.5 ? 'rgba(238,253,255,0.9)' : 'rgba(7,91,151,0.6)';
            target.beginPath();
            if (r > 0.5) {
                target.moveTo(x + size * 0.10, y + size * (0.20 + r * 0.15));
                target.lineTo(x + size * (0.48 + r * 0.18), y + size * 0.07);
                target.lineTo(x + size * 0.38, y + size * 0.42);
            } else {
                target.moveTo(x + size * 0.55, y + size * 0.62);
                target.lineTo(x + size * 0.94, y + size * (0.48 + r * 0.12));
                target.lineTo(x + size * 0.72, y + size * 0.90);
            }
            target.closePath();
            target.fill();

            // Fisuras cristalinas discretas, solo en algunas casillas para evitar ruido.
            if (hash(cell.x, cell.y, 2) > 0.69) {
                const ox = x + size * (0.20 + hash(cell.x, cell.y, 3) * 0.35);
                const oy = y + size * (0.18 + hash(cell.x, cell.y, 4) * 0.36);
                const bend = (hash(cell.x, cell.y, 5) - 0.5) * size * 0.22;
                target.globalAlpha = cell.alpha * 0.48;
                target.strokeStyle = 'rgba(235,251,255,0.95)';
                target.lineWidth = Math.max(0.65, size * 0.014);
                target.beginPath();
                target.moveTo(ox, oy);
                target.lineTo(ox + size * 0.15, oy + bend);
                target.lineTo(ox + size * 0.25, oy + bend - size * 0.07);
                target.moveTo(ox + size * 0.15, oy + bend);
                target.lineTo(ox + size * 0.19, oy + bend + size * 0.11);
                target.stroke();
            }

            // Destello tipo escarcha que respira lentamente mientras el campo existe.
            if (hash(cell.x, cell.y, 6) > 0.62) {
                const cx = x + size * (0.22 + hash(cell.x, cell.y, 7) * 0.56);
                const cy = y + size * (0.22 + hash(cell.x, cell.y, 8) * 0.56);
                const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12 + cell.x * 2.1 + cell.y * 1.7);
                const arm = size * (0.035 + pulse * 0.025);
                target.globalAlpha = cell.alpha * (0.25 + pulse * 0.38);
                target.strokeStyle = '#effcff';
                target.lineWidth = Math.max(0.7, size * 0.016);
                target.beginPath();
                target.moveTo(cx - arm, cy); target.lineTo(cx + arm, cy);
                target.moveTo(cx, cy - arm); target.lineTo(cx, cy + arm);
                target.moveTo(cx - arm * 0.58, cy - arm * 0.58); target.lineTo(cx + arm * 0.58, cy + arm * 0.58);
                target.stroke();
            }
            rendered++;
        }
    }

    target.restore();
    return rendered;
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
            const fadeOuter = age < 270 ? 1 : Math.max(0, 1 - (age - 270) / 80);
            const expansionLicks = age >= 80 && age < 250;
            ctx.globalAlpha = visibility * fadeOuter;
            drawLayer(component, paths, neighbors, group.palette, 'outer', size * 0.82, size * 0.14, scale, expansionLicks, true);
            ctx.globalAlpha = visibility * fadeMiddle;
            drawLayer(component, paths, neighbors, group.palette, 'middle', size * 0.57, size * 0.115, scale, expansionLicks, false);
            ctx.globalAlpha = visibility * fadeCore;
            drawLayer(component, paths, neighbors, group.palette, 'core', size * 0.285, size * 0.075, scale, expansionLicks, false);
        }
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    return visibleCellCount;
}

// v6.32.2 hotfix: los campos SHOCK seguían aplicando daño, pero no se dibujaban
// después de los 350 ms de la explosión inicial. Esta capa es puramente visual:
// usa las mismas casillas lógicas del campo existente y no modifica daño/colisiones.
function drawBombEffectFieldsV6323(fields = []) {
    if (!Array.isArray(fields) || !fields.length || typeof ctx === 'undefined' || typeof TILE_SIZE !== 'number') return 0;

    const size = TILE_SIZE;
    const frame = Number(gameState?.animFrame) || 0;
    const groups = new Map();
    const keyOf = (x, y) => `${x},${y}`;

    for (const field of fields) {
        // Solo campos eléctricos creados por bombas. No dibujar estados de entidades
        // ni campos ambientales y no cambiar el comportamiento de otros elementos.
        if (!field || field.effectId !== 'shock' || field.sourceBombId == null) continue;
        const x = Number(field.x), y = Number(field.y), remaining = Number(field.remainingMs);
        if (!Number.isInteger(x) || !Number.isInteger(y) || !(remaining > 0)) continue;
        if (typeof isWorldTileVisibleV329 === 'function' && !isWorldTileVisibleV329(x, y, 1)) continue;

        const sourceId = String(field.sourceBombId);
        let group = groups.get(sourceId);
        if (!group) {
            group = { cellMap: new Map(), remainingMs: remaining, totalMs: Number(field.visualTotalMs) || remaining };
            groups.set(sourceId, group);
        }
        group.remainingMs = Math.max(group.remainingMs, remaining);
        group.totalMs = Math.max(group.totalMs, Number(field.visualTotalMs) || remaining);
        const key = keyOf(x, y);
        const existing = group.cellMap.get(key);
        const cell = {
            x, y,
            alpha: Math.max(0.2, Math.min(1, remaining / Math.max(1, Number(field.visualTotalMs) || remaining))),
            ageMs: Math.max(0, Number(field.visualAgeMs) || 0)
        };
        if (!existing || cell.alpha > existing.alpha) group.cellMap.set(key, cell);
    }
    if (!groups.size) return 0;

    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    const cellKey = cell => keyOf(cell.x, cell.y);
    let drawnCells = 0;

    function lightningPoints(a, b) {
        const p = center(a), q = center(b);
        const dx = (q.x - p.x) / size, dy = (q.y - p.y) / size;
        const nx = -dy, ny = dx;
        const phase = frame * 0.61 + a.x * 9.17 + a.y * 14.3 + b.x * 5.23 + b.y * 3.97;
        const offsets = [
            Math.sin(phase) * size * 0.13,
            Math.sin(phase * 1.37 + 2.2) * size * 0.18,
            Math.sin(phase * 1.91 + 1.1) * size * 0.10
        ];
        return [p,
            { x: p.x + (q.x - p.x) * 0.28 + nx * offsets[0], y: p.y + (q.y - p.y) * 0.28 + ny * offsets[0] },
            { x: p.x + (q.x - p.x) * 0.56 + nx * offsets[1], y: p.y + (q.y - p.y) * 0.56 + ny * offsets[1] },
            { x: p.x + (q.x - p.x) * 0.79 + nx * offsets[2], y: p.y + (q.y - p.y) * 0.79 + ny * offsets[2] },
            q
        ];
    }

    const layers = [
        { color: '#1d4ed8', width: size * 0.22, opacity: 0.52, glow: size * 0.30 },
        { color: '#22d3ee', width: size * 0.105, opacity: 0.92, glow: size * 0.13 },
        { color: '#f0fdff', width: size * 0.038, opacity: 0.96, glow: size * 0.045 }
    ];

    function strokeBolt(points, alpha) {
        for (const layer of layers) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = Math.max(1, layer.width);
            ctx.globalAlpha = alpha * layer.opacity;
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = Math.min(18, layer.glow);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    // Traza una rama continua por ruta: tres pasadas por ruta, no tres por cada
    // casilla. Evita que el brillo eléctrico degrade el rendimiento en móviles.
    function strokeLightningRoute(path, alpha) {
        if (!path || path.points.length < 2) return;
        for (const layer of layers) {
            ctx.beginPath();
            const start = center(path.points[0]);
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < path.points.length; i++) {
                const points = lightningPoints(path.points[i - 1], path.points[i]);
                for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
            }
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = Math.max(1, layer.width);
            ctx.globalAlpha = alpha * layer.opacity;
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = Math.min(18, layer.glow);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let totalBranchCount = 0;
    for (const group of groups.values()) {
        const components = explosionComponentsV6308(group.cellMap);
        for (const component of components) {
            if (!component.length) continue;
            drawnCells += component.length;
            const { paths, neighbors } = explosionGraphPathsV6308(component);
            const remainingRatio = Math.max(0, Math.min(1, group.remainingMs / Math.max(1, group.totalMs)));
            // El campo permanece legible mientras daña; solo se desvanece al final.
            const fadeOut = Math.min(1, group.remainingMs / 300);
            const pulse = 0.73 + 0.20 * Math.sin(frame * 0.47 + component[0].x * 2.1 + component[0].y * 3.7);
            const alpha = Math.max(0, Math.min(1, (0.70 + remainingRatio * 0.18) * pulse * fadeOut));
            for (const path of paths) strokeLightningRoute(path, alpha);

            // Descargas cortas en una selección limitada de nodos para mantener
            // un coste acotado cuando coinciden varias explosiones.
            for (const cell of component) {
                if (totalBranchCount >= 48) break;
                const around = neighbors.get(cellKey(cell)) || [];
                const seed = Math.abs(cell.x * 13 + cell.y * 7);
                if ((around.length < 2 && seed % 2 !== 0) || seed % 3 !== 0) continue;
                totalBranchCount++;
                const side = seed % 4;
                const dirs = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
                const dir = dirs[side];
                const p = center(cell);
                const phase = frame * 0.7 + cell.x * 4.3 + cell.y * 6.1;
                const end = { x: p.x + dir.x * size * (0.22 + 0.05 * Math.sin(phase)), y: p.y + dir.y * size * (0.22 + 0.05 * Math.sin(phase)) };
                const bend = { x: (p.x + end.x) / 2 + (dir.y ? Math.sin(phase) : 0) * size * 0.10, y: (p.y + end.y) / 2 + (dir.x ? Math.sin(phase) : 0) * size * 0.10 };
                strokeBolt([p, bend, end], alpha * 0.74);
            }
        }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    return drawnCells;
}

// v6.32.5: llamas orgánicas persistentes para los campos HEAT de BOMB_FIRE.
// Es una capa visual sobre las mismas celdas del sistema de efectos: no crea
// campos, no cambia duración/daño y no modifica hitboxes.
function drawPersistentFireFieldsV6324(fields = []) {
    if (!Array.isArray(fields) || !fields.length || typeof ctx === 'undefined' || typeof TILE_SIZE !== 'number') return 0;

    const size = TILE_SIZE;
    const frame = Number(gameState?.animFrame) || 0;
    const groups = new Map();
    const keyOf = (x, y) => `${x},${y}`;

    for (const field of fields) {
        // HEAT de bombas únicamente: no dibujar calor ambiental ni estados aislados.
        if (!field || field.effectId !== 'heat' || field.sourceBombId == null) continue;
        const x = Number(field.x), y = Number(field.y), remaining = Number(field.remainingMs);
        if (!Number.isInteger(x) || !Number.isInteger(y) || !(remaining > 0)) continue;
        if (typeof isWorldTileVisibleV329 === 'function' && !isWorldTileVisibleV329(x, y, 1)) continue;

        const sourceId = String(field.sourceBombId);
        let group = groups.get(sourceId);
        if (!group) {
            group = { cellMap: new Map(), remainingMs: remaining, totalMs: Number(field.visualTotalMs) || remaining };
            groups.set(sourceId, group);
        }
        group.remainingMs = Math.max(group.remainingMs, remaining);
        group.totalMs = Math.max(group.totalMs, Number(field.visualTotalMs) || remaining);
        const key = keyOf(x, y);
        const cell = {
            x, y,
            alpha: Math.max(0.25, Math.min(1, remaining / Math.max(1, Number(field.visualTotalMs) || remaining))),
            ageMs: Math.max(0, Number(field.visualAgeMs) || 0)
        };
        const previous = group.cellMap.get(key);
        if (!previous || cell.alpha > previous.alpha) group.cellMap.set(key, cell);
    }
    if (!groups.size) return 0;

    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    let drawnCells = 0;
    let tongueBudget = 72;

    // El campo se construye con manchas orgánicas y llamas independientes.
    // No se dibujan trazos largos entre centros de casillas: eso parecía un láser.
    function drawFireBed(cell, alpha, phase, orientation = 'horizontal') {
        const p = center(cell);
        const wobble = Math.sin(phase) * size * 0.035;
        const stretch = 1 + Math.sin(phase * 0.63) * 0.045;
        const vertical = orientation === 'vertical';

        ctx.save();
        // La mancha redondeada gira siguiendo el eje de la conexión. En filas
        // horizontales conserva la geometría aprobada; en columnas se rota 90°
        // para que su eje largo acompañe al puente vertical y no lo cruce de lado.
        ctx.translate(p.x, p.y);
        if (vertical) ctx.rotate(Math.PI / 2);
        ctx.translate(0, size * 0.14);
        ctx.rotate(Math.sin(phase * 0.47) * 0.10);
        ctx.scale(stretch, 1);

        // Capa oscura irregular, pegada al suelo y solapada con las celdas vecinas.
        ctx.globalAlpha = alpha * 0.52;
        ctx.fillStyle = '#9a3412';
        ctx.shadowColor = '#c2410c';
        ctx.shadowBlur = Math.min(10, size * 0.19);
        ctx.beginPath();
        ctx.moveTo(-size * 0.49, size * 0.015);
        ctx.bezierCurveTo(-size * 0.57, -size * 0.10, -size * 0.35, -size * 0.26, -size * 0.20, -size * (0.19 + wobble / size));
        ctx.bezierCurveTo(-size * 0.08, -size * 0.31, size * 0.025, -size * 0.20, size * 0.15, -size * 0.22);
        ctx.bezierCurveTo(size * 0.32, -size * 0.31, size * 0.55, -size * 0.13, size * 0.48, size * 0.015);
        ctx.bezierCurveTo(size * 0.39, size * 0.15, size * 0.17, size * 0.19, size * 0.015, size * 0.13);
        ctx.bezierCurveTo(-size * 0.18, size * 0.20, -size * 0.40, size * 0.15, -size * 0.49, size * 0.015);
        ctx.closePath();
        ctx.fill();

        // Centro naranja irregular: evita una línea homogénea a lo largo del alcance.
        ctx.globalAlpha = alpha * (0.33 + 0.06 * Math.sin(phase * 1.17));
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#fb923c';
        ctx.shadowBlur = Math.min(8, size * 0.14);
        ctx.beginPath();
        ctx.moveTo(-size * 0.36, size * 0.025);
        ctx.bezierCurveTo(-size * 0.34, -size * 0.11, -size * 0.12, -size * 0.18, size * 0.015, -size * 0.12);
        ctx.bezierCurveTo(size * 0.15, -size * 0.20, size * 0.39, -size * 0.08, size * 0.36, size * 0.035);
        ctx.bezierCurveTo(size * 0.22, size * 0.12, -size * 0.18, size * 0.13, -size * 0.36, size * 0.025);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // La unión usa la misma silueta orgánica en ambos sentidos. En vertical se
    // rota y se estira solo a lo largo del eje de conexión para cubrir el hueco
    // entre los centros de las casillas; no se construye un tubo vertical aparte.
    function drawFireBridge(cell, neighbor, alpha, phase) {
        const a = center(cell);
        const b = center(neighbor);
        const horizontal = cell.y === neighbor.y;
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        const wobble = Math.sin(phase * 1.37) * size * 0.025;

        ctx.save();
        if (horizontal) {
            // Geometría horizontal original: no alterar el aspecto ya aprobado.
            ctx.translate(midX, midY + size * 0.13);
        } else {
            // Misma lengua rotada 90°. El factor 1.55 da solape con las dos
            // casillas y la centra en el corredor, evitando el hueco vertical.
            ctx.translate(midX, midY);
            ctx.rotate(Math.PI / 2);
            ctx.scale(1.55, 1);
        }

        ctx.globalAlpha = alpha * (0.82 + 0.08 * Math.sin(phase * 1.61));
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = Math.min(8, size * 0.15);
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.moveTo(-size * 0.37, size * 0.015);
        ctx.bezierCurveTo(-size * 0.43, -size * 0.11, -size * 0.28, -size * (0.22 + wobble / size), -size * 0.16, -size * 0.105);
        ctx.bezierCurveTo(-size * 0.075, -size * 0.21, size * 0.015, -size * 0.17, size * 0.075, -size * 0.09);
        ctx.bezierCurveTo(size * 0.20, -size * 0.22, size * 0.39, -size * 0.12, size * 0.36, size * 0.025);
        ctx.bezierCurveTo(size * 0.28, size * 0.16, size * 0.12, size * 0.18, size * 0.015, size * 0.115);
        ctx.bezierCurveTo(-size * 0.12, size * 0.19, -size * 0.31, size * 0.13, -size * 0.37, size * 0.015);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha *= 0.82;
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#fb923c';
        ctx.shadowBlur = Math.min(6, size * 0.11);
        ctx.beginPath();
        ctx.moveTo(-size * 0.26, size * 0.015);
        ctx.bezierCurveTo(-size * 0.28, -size * 0.09, -size * 0.12, -size * (0.15 + wobble / size), -size * 0.035, -size * 0.065);
        ctx.bezierCurveTo(size * 0.07, -size * 0.16, size * 0.23, -size * 0.085, size * 0.25, size * 0.02);
        ctx.bezierCurveTo(size * 0.17, size * 0.105, -size * 0.14, size * 0.12, -size * 0.26, size * 0.015);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawFlameTongue(cell, alpha, phase, lane) {
        const p = center(cell);
        const laneOffset = lane * size * 0.205;
        const oscillation = Math.sin(phase * 1.31 + lane * 2.4);
        const width = size * (0.115 + 0.025 * (0.5 + Math.sin(phase * 0.91 + lane)));
        const height = size * (0.30 + 0.18 * (0.5 + Math.sin(phase * 0.73 + lane * 1.8)));
        const lean = Math.sin(phase * 0.67 + lane * 2.9) * size * 0.10;
        const baseY = p.y + size * (0.20 + 0.015 * oscillation);
        const baseX = p.x + laneOffset;
        const tipX = lean;

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha * (0.76 + 0.16 * Math.sin(phase * 1.7))));
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = Math.min(10, size * 0.19);

        // Silueta exterior roja: base ancha, cuerpo curvado y punta afilada.
        ctx.fillStyle = lane === 1 ? '#c2410c' : '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-width * 0.58, 0);
        ctx.bezierCurveTo(-width * 0.92, -height * 0.12, tipX - width * 0.55, -height * 0.25, tipX - width * 0.21, -height * 0.52);
        ctx.bezierCurveTo(tipX - width * 0.12, -height * 0.66, tipX - width * 0.02, -height * 0.88, tipX + width * 0.10, -height);
        ctx.bezierCurveTo(tipX + width * 0.48, -height * 0.75, tipX + width * 0.31, -height * 0.52, tipX + width * 0.62, -height * 0.32);
        ctx.bezierCurveTo(width * 0.92, -height * 0.15, width * 0.74, -height * 0.035, width * 0.55, 0);
        ctx.quadraticCurveTo(0, size * 0.045, -width * 0.58, 0);
        ctx.closePath();
        ctx.fill();

        // Lengua interior naranja: desplazada respecto de la silueta para dar profundidad.
        ctx.globalAlpha *= 0.91;
        ctx.fillStyle = '#fb923c';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = Math.min(7, size * 0.12);
        ctx.beginPath();
        ctx.moveTo(-width * 0.34, -size * 0.008);
        ctx.bezierCurveTo(-width * 0.45, -height * 0.18, tipX - width * 0.22, -height * 0.30, tipX - width * 0.04, -height * 0.56);
        ctx.bezierCurveTo(tipX + width * 0.02, -height * 0.69, tipX + width * 0.07, -height * 0.78, tipX + width * 0.15, -height * 0.83);
        ctx.bezierCurveTo(tipX + width * 0.38, -height * 0.61, tipX + width * 0.19, -height * 0.43, width * 0.38, -height * 0.27);
        ctx.bezierCurveTo(width * 0.50, -height * 0.13, width * 0.38, -size * 0.015, width * 0.28, 0);
        ctx.quadraticCurveTo(0, size * 0.02, -width * 0.34, -size * 0.008);
        ctx.closePath();
        ctx.fill();

        // Núcleo amarillo pequeño; no cubre toda la llama ni forma un trazo recto.
        ctx.globalAlpha *= 0.84;
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = Math.min(4, size * 0.07);
        ctx.beginPath();
        ctx.moveTo(-width * 0.12, -size * 0.01);
        ctx.bezierCurveTo(-width * 0.20, -height * 0.18, tipX + width * 0.01, -height * 0.34, tipX + width * 0.12, -height * 0.58);
        ctx.bezierCurveTo(tipX + width * 0.23, -height * 0.43, width * 0.20, -height * 0.20, width * 0.15, -size * 0.005);
        ctx.quadraticCurveTo(0, size * 0.008, -width * 0.12, -size * 0.01);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    // El fuego usa composición normal: la adición luminosa excesiva producía aspecto de láser.
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const group of groups.values()) {
        const components = explosionComponentsV6308(group.cellMap);
        for (const component of components) {
            if (!component.length) continue;
            drawnCells += component.length;
            const remainingRatio = Math.max(0, Math.min(1, group.remainingMs / Math.max(1, group.totalMs)));
            const fadeOut = Math.max(0, Math.min(1, group.remainingMs / 360));
            const pulse = 0.86 + 0.10 * Math.sin(frame * 0.39 + component[0].x * 1.7 + component[0].y * 2.9);
            const alpha = Math.max(0, Math.min(1, (0.68 + remainingRatio * 0.16) * pulse * fadeOut));

            // Conectar las casillas adyacentes antes de dibujar las lenguas individuales.
            // Solo se dibujan los vecinos derecha/abajo para evitar uniones duplicadas.
            const componentKeys = new Set(component.map(cell => keyOf(cell.x, cell.y)));
            for (const cell of component) {
                const rightKey = keyOf(cell.x + 1, cell.y);
                const downKey = keyOf(cell.x, cell.y + 1);
                const phase = frame * 0.29 + cell.x * 3.9 + cell.y * 5.3;
                if (componentKeys.has(rightKey)) {
                    drawFireBridge(cell, { x: cell.x + 1, y: cell.y }, alpha, phase);
                }
                if (componentKeys.has(downKey)) {
                    drawFireBridge(cell, { x: cell.x, y: cell.y + 1 }, alpha, phase + 1.1);
                }
            }

            // Primera pasada: masa baja e irregular sobre las casillas afectadas.
            // La orientación sigue a las conexiones locales: las filas mantienen
            // el diseño horizontal; las columnas giran 90°. En codos/uniones se
            // superponen ambas orientaciones con menos opacidad para cerrar el nudo.
            for (const cell of component) {
                const phase = frame * 0.41 + cell.x * 4.7 + cell.y * 7.1;
                const hasLeft = componentKeys.has(keyOf(cell.x - 1, cell.y));
                const hasRight = componentKeys.has(keyOf(cell.x + 1, cell.y));
                const hasUp = componentKeys.has(keyOf(cell.x, cell.y - 1));
                const hasDown = componentKeys.has(keyOf(cell.x, cell.y + 1));
                const horizontal = hasLeft || hasRight;
                const vertical = hasUp || hasDown;
                const bedAlpha = alpha * (0.90 + 0.10 * Math.sin(phase));

                if (vertical && horizontal) {
                    drawFireBed(cell, bedAlpha * 0.68, phase, 'horizontal');
                    drawFireBed(cell, bedAlpha * 0.68, phase + 0.37, 'vertical');
                } else {
                    drawFireBed(cell, bedAlpha, phase, vertical ? 'vertical' : 'horizontal');
                }
            }

            // Segunda pasada: puntas de fuego separadas y curvas, en lugar de un tubo continuo.
            for (const cell of component) {
                if (tongueBudget <= 0) break;
                const seed = Math.abs(cell.x * 13 + cell.y * 7);
                const phase = frame * 0.34 + seed * 0.83;
                // Cada casilla aporta dos o tres lenguas; alternar su número evita un patrón regular.
                const count = seed % 3 === 0 ? 3 : 2;
                const lanes = count === 3 ? [-1, 0, 1] : (seed % 2 === 0 ? [-0.72, 0.55] : [-0.45, 0.78]);
                for (let i = 0; i < lanes.length; i++) {
                    if (tongueBudget <= 0) break;
                    drawFlameTongue(cell, alpha * (0.87 + 0.13 * Math.sin(phase + i)), phase + i * 1.73, lanes[i]);
                    tongueBudget--;
                }
            }
        }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    return drawnCells;
}

window.registerBombBlastVisualV6308 = registerBombBlastVisualV6308;
window.updateBombBlastVisualsV6308 = updateBombBlastVisualsV6308;
window.resetBombBlastVisualsV6308 = resetBombBlastVisualsV6308;
window.drawElementalResiduesV6308 = drawElementalResiduesV6308;
window.drawBombEffectFieldsV6323 = drawBombEffectFieldsV6323;
window.drawPersistentFireFieldsV6324 = drawPersistentFireFieldsV6324;
