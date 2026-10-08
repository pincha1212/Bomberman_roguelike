// Bomberman Roguelike v4.6 — Canvas rendering and theme-backed sprite drawing
// V6.22: 11 paredes de bioma procedurales integradas al caché V6.21
// V3.17: cache de terreno estático para evitar reconstruir la cuadrícula completa
// en cada frame. El mapa se regenera solo cuando cambia la referencia/revisión.

// V6.21: infraestructura común para tiles procedurales en Canvas 2D.
// El caché por tile complementa al caché de terreno existente; no crea un segundo renderer.

// V6.22: paredes procedurales por bioma. Solo visual; reutiliza el caché V6.21.
const BIOME_WALL_SPECS_V622 = Object.freeze({
    classic: Object.freeze({ family: 'structured', base: '#475569', light: '#94a3b8', shadow: '#334155', deep: '#0f172a', accent: '#38bdf8', inset: '#1e293b' }),
    winter: Object.freeze({ family: 'rock', base: '#526f7e', light: '#d9f4ff', shadow: '#314956', deep: '#1b2c35', accent: '#8ee8ff', secondary: '#6ea7bb', detail: 'ice' }),
    autumn: Object.freeze({ family: 'organic', base: '#3f2418', light: '#8e5a32', shadow: '#24140d', deep: '#170c08', accent: '#d28a2e', secondary: '#63351f', detail: 'roots' }),
    spring: Object.freeze({ family: 'organic', base: '#687164', light: '#b5c4ab', shadow: '#404a3e', deep: '#252d23', accent: '#4f8f4f', secondary: '#7da263', detail: 'vine' }),
    summer: Object.freeze({ family: 'structured', base: '#a84f32', light: '#e28a5f', shadow: '#70321f', deep: '#4b2116', accent: '#c97a55', secondary: '#8f422a', detail: 'brick' }),
    underground: Object.freeze({ family: 'rock', base: '#292a32', light: '#666674', shadow: '#17181f', deep: '#0b0b10', accent: '#a56cff', secondary: '#573987', detail: 'crystal' }),
    clouds: Object.freeze({ family: 'cloud', base: '#66788c', light: '#aabbd0', shadow: '#415064', deep: '#2d3745', accent: '#ffe34f', secondary: '#8296ad', detail: 'lightning' }),
    mountains: Object.freeze({ family: 'rock', base: '#4d535b', light: '#929aa4', shadow: '#2e3339', deep: '#171b20', accent: '#c1cad2', secondary: '#646c76', detail: 'facets' }),
    beach: Object.freeze({ family: 'organic', base: '#98755a', light: '#dbc39d', shadow: '#684d3b', deep: '#433125', accent: '#d76b49', secondary: '#b79a6f', detail: 'coral' }),
    space: Object.freeze({ family: 'structured', base: '#384652', light: '#7e95a7', shadow: '#202932', deep: '#10161b', accent: '#53b8d9', secondary: '#566673', detail: 'panel' }),
    sky: Object.freeze({ family: 'column', base: '#d8d5ce', light: '#fffdf6', shadow: '#aaa69d', deep: '#78736b', accent: '#cabca3', secondary: '#ece7db', detail: 'marble' }),
    inferno: Object.freeze({ family: 'rock', base: '#34201c', light: '#704337', shadow: '#1d100e', deep: '#100807', accent: '#ff7a21', secondary: '#8d2f1e', detail: 'magma' })
});

function getBiomeWallSpecV622() {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    return BIOME_WALL_SPECS_V622[themeId] || BIOME_WALL_SPECS_V622.classic;
}

function drawWallFaceV622(targetCtx, x, y, size, spec) {
    const edge = Math.max(2, Math.floor(size * 0.06));
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x, y, size, size);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x + edge, y + edge, size - edge * 2, size - edge * 2);
    targetCtx.fillStyle = spec.light;
    targetCtx.globalAlpha = 0.36;
    targetCtx.fillRect(x + edge, y + edge, size - edge * 2, Math.max(2, edge));
    targetCtx.fillRect(x + edge, y + edge, Math.max(2, edge), size - edge * 2);
    targetCtx.globalAlpha = 1;
    targetCtx.fillStyle = spec.deep;
    targetCtx.globalAlpha = 0.30;
    targetCtx.fillRect(x + size * 0.16, y + size * 0.16, size * 0.68, size * 0.68);
    targetCtx.globalAlpha = 1;
}

function drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    const n = Math.abs(Number(seed) || 0) + 1;
    const inset = size * 0.11;
    const colors = [spec.base, spec.secondary || spec.shadow, spec.light];
    for (let i = 0; i < 5; i++) {
        const px = x + inset + ((n * (i + 7) * 23) % 67) / 67 * (size - inset * 2);
        const py = y + inset + ((n * (i + 3) * 29) % 71) / 71 * (size - inset * 2);
        const w = size * (0.18 + ((n + i) % 4) * 0.035);
        const h = size * (0.14 + ((n + i * 2) % 3) * 0.04);
        drawTilePolygonV621(targetCtx, [
            [px, py + h * 0.35], [px + w * 0.35, py], [px + w, py + h * 0.24],
            [px + w * 0.78, py + h], [px + w * 0.22, py + h * 0.82]
        ], colors[i % colors.length]);
    }
    drawTileCrackV621(targetCtx, x, y, size, spec.accent, n, 2);
    drawTileNoiseV621(targetCtx, x + inset, y + inset, size - inset * 2, spec.accent, n + 5, 8, 0.11);

    if (spec.detail === 'crystal') {
        const crystal = spec.accent;
        drawTilePolygonV621(targetCtx, [[x + size*.16, y + size*.75], [x + size*.25, y + size*.48], [x + size*.31, y + size*.76]], crystal);
        drawTilePolygonV621(targetCtx, [[x + size*.68, y + size*.72], [x + size*.76, y + size*.34], [x + size*.84, y + size*.72]], spec.secondary);
    } else if (spec.detail === 'magma') {
        targetCtx.save();
        targetCtx.strokeStyle = spec.accent;
        targetCtx.lineWidth = Math.max(2, size * 0.04);
        targetCtx.globalAlpha = 0.9;
        targetCtx.beginPath();
        targetCtx.moveTo(x + size*.22, y + size*.10);
        targetCtx.lineTo(x + size*.34, y + size*.35);
        targetCtx.lineTo(x + size*.27, y + size*.57);
        targetCtx.lineTo(x + size*.45, y + size*.83);
        targetCtx.moveTo(x + size*.72, y + size*.16);
        targetCtx.lineTo(x + size*.62, y + size*.45);
        targetCtx.lineTo(x + size*.76, y + size*.70);
        targetCtx.stroke();
        targetCtx.restore();
    } else if (spec.detail === 'ice') {
        drawTilePolygonV621(targetCtx, [[x+size*.18,y+size*.15],[x+size*.32,y+size*.08],[x+size*.28,y+size*.28]], spec.light);
        drawTilePolygonV621(targetCtx, [[x+size*.69,y+size*.78],[x+size*.82,y+size*.63],[x+size*.84,y+size*.88]], spec.accent);
    }
}

function drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    if (spec.detail === 'roots') {
        const trunkW = size * 0.22;
        targetCtx.fillStyle = spec.base;
        targetCtx.fillRect(x + size*.14, y + size*.08, trunkW, size*.78);
        targetCtx.fillRect(x + size*.52, y + size*.04, trunkW, size*.82);
        targetCtx.fillStyle = spec.light;
        targetCtx.fillRect(x + size*.17, y + size*.12, Math.max(2, size*.045), size*.62);
        targetCtx.fillRect(x + size*.55, y + size*.08, Math.max(2, size*.045), size*.66);
        targetCtx.fillStyle = spec.shadow;
        targetCtx.beginPath();
        targetCtx.moveTo(x+size*.12,y+size*.88); targetCtx.lineTo(x+size*.29,y+size*.70); targetCtx.lineTo(x+size*.38,y+size*.88); targetCtx.closePath(); targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(x+size*.43,y+size*.88); targetCtx.lineTo(x+size*.61,y+size*.70); targetCtx.lineTo(x+size*.86,y+size*.89); targetCtx.closePath(); targetCtx.fill();
        drawTileNoiseV621(targetCtx, x+size*.1, y+size*.08, size*.8, spec.accent, seed, 10, .14);
    } else if (spec.detail === 'vine') {
        for (let i = 0; i < 4; i++) {
            targetCtx.save();
            targetCtx.strokeStyle = i % 2 ? spec.accent : spec.secondary;
            targetCtx.lineWidth = Math.max(2, size*.035);
            targetCtx.beginPath();
            targetCtx.moveTo(x + size*(0.12 + i*.23), y + size*.08);
            targetCtx.quadraticCurveTo(x + size*(0.02 + i*.25), y + size*.42, x + size*(0.16 + i*.19), y + size*.90);
            targetCtx.stroke();
            targetCtx.restore();
        }
        drawTileNoiseV621(targetCtx, x+size*.08, y+size*.08, size*.84, spec.accent, seed+9, 14, .12);
    } else if (spec.detail === 'coral') {
        targetCtx.fillStyle = spec.accent;
        targetCtx.fillRect(x+size*.16, y+size*.72, size*.16, size*.14);
        targetCtx.fillRect(x+size*.36, y+size*.63, size*.10, size*.23);
        targetCtx.fillRect(x+size*.72, y+size*.70, size*.13, size*.15);
        targetCtx.fillStyle = spec.secondary;
        for (let i=0;i<4;i++) targetCtx.fillRect(x+size*(.22+i*.16), y+size*(.20+(i%2)*.08), size*.05, size*.05);
    }
}

function drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    const edge = Math.max(2, size*.045);
    targetCtx.strokeStyle = spec.shadow;
    targetCtx.lineWidth = Math.max(2, size*.035);
    targetCtx.beginPath();
    targetCtx.moveTo(x+size*.05, y+size*.33); targetCtx.lineTo(x+size*.95, y+size*.33);
    targetCtx.moveTo(x+size*.05, y+size*.67); targetCtx.lineTo(x+size*.95, y+size*.67);
    targetCtx.stroke();

    if (spec.detail === 'brick') {
        targetCtx.beginPath();
        targetCtx.moveTo(x+size*.50,y+edge); targetCtx.lineTo(x+size*.50,y+size*.33);
        targetCtx.moveTo(x+size*.26,y+size*.33); targetCtx.lineTo(x+size*.26,y+size*.67);
        targetCtx.moveTo(x+size*.74,y+size*.33); targetCtx.lineTo(x+size*.74,y+size*.67);
        targetCtx.moveTo(x+size*.50,y+size*.67); targetCtx.lineTo(x+size*.50,y+size-edge);
        targetCtx.stroke();
    } else {
        targetCtx.fillStyle = spec.accent;
        const rivet = Math.max(2, size*.045);
        [[.13,.13],[.87,.13],[.13,.87],[.87,.87]].forEach(([rx,ry]) => targetCtx.fillRect(x+size*rx-rivet/2,y+size*ry-rivet/2,rivet,rivet));
        targetCtx.fillStyle = spec.secondary || spec.light;
        targetCtx.globalAlpha = .35;
        targetCtx.fillRect(x+size*.20,y+size*.18,size*.60,Math.max(2,size*.035));
        targetCtx.globalAlpha = 1;
    }
}

function drawCloudWallV622(targetCtx, x, y, size, spec, seed = 0) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.secondary;
    [[.24,.55,.23],[.46,.39,.30],[.70,.55,.24]].forEach(([cx,cy,r]) => {
        targetCtx.beginPath();
        targetCtx.arc(x+size*cx,y+size*cy,size*r,0,Math.PI*2);
        targetCtx.fill();
    });
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.12,y+size*.58,size*.76,size*.18);
    targetCtx.fillStyle = spec.accent;
    drawTilePolygonV621(targetCtx, [[x+size*.68,y+size*.12],[x+size*.61,y+size*.42],[x+size*.69,y+size*.42],[x+size*.62,y+size*.78]], spec.accent);
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.18, size*.76, spec.light, seed, 8, .09);
}

function drawSkyWallV622(targetCtx, x, y, size, spec) {
    drawWallFaceV622(targetCtx, x, y, size, spec);
    const cols = [0.18,0.46,0.74];
    cols.forEach((offset, i) => {
        const w = size*.18;
        targetCtx.fillStyle = spec.secondary;
        targetCtx.fillRect(x+size*offset, y+size*.16, w, size*.66);
        targetCtx.fillStyle = spec.light;
        targetCtx.fillRect(x+size*offset, y+size*.20, w*.22, size*.60);
        targetCtx.fillStyle = spec.shadow;
        targetCtx.fillRect(x+size*(offset+w/size-.06), y+size*.20, size*.06, size*.60);
        targetCtx.fillStyle = spec.accent;
        targetCtx.fillRect(x+size*(offset-.04), y+size*.09, w+size*.08, size*.10);
        targetCtx.fillRect(x+size*(offset-.04), y+size*.76, w+size*.08, size*.09);
    });
    drawTileCrackV621(targetCtx, x, y, size, spec.accent, 7, 1);
}

function drawWinterWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawAutumnWallV622(targetCtx, x, y, size, spec, seed) { drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSpringWallV622(targetCtx, x, y, size, spec, seed) { drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSummerWallV622(targetCtx, x, y, size, spec, seed) { drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawUndergroundWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawCloudWallEntryV622(targetCtx, x, y, size, spec, seed) { drawCloudWallV622(targetCtx, x, y, size, spec, seed); }
function drawMountainWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawBeachWallV622(targetCtx, x, y, size, spec, seed) { drawOrganicWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSpaceWallV622(targetCtx, x, y, size, spec, seed) { drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed); }
function drawSkyWallEntryV622(targetCtx, x, y, size, spec, seed) { drawSkyWallV622(targetCtx, x, y, size, spec, seed); }
function drawInfernoWallV622(targetCtx, x, y, size, spec, seed) { drawRockWallFamilyV622(targetCtx, x, y, size, spec, seed); }

function drawBiomeWallV622(targetCtx, x, y, size, seed = 0) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const spec = BIOME_WALL_SPECS_V622[themeId] || BIOME_WALL_SPECS_V622.classic;
    switch (themeId) {
        case 'winter': return drawWinterWallV622(targetCtx, x, y, size, spec, seed);
        case 'autumn': return drawAutumnWallV622(targetCtx, x, y, size, spec, seed);
        case 'spring': return drawSpringWallV622(targetCtx, x, y, size, spec, seed);
        case 'summer': return drawSummerWallV622(targetCtx, x, y, size, spec, seed);
        case 'underground': return drawUndergroundWallV622(targetCtx, x, y, size, spec, seed);
        case 'clouds': return drawCloudWallEntryV622(targetCtx, x, y, size, spec, seed);
        case 'mountains': return drawMountainWallV622(targetCtx, x, y, size, spec, seed);
        case 'beach': return drawBeachWallV622(targetCtx, x, y, size, spec, seed);
        case 'space': return drawSpaceWallV622(targetCtx, x, y, size, spec, seed);
        case 'sky': return drawSkyWallEntryV622(targetCtx, x, y, size, spec, seed);
        case 'inferno': return drawInfernoWallV622(targetCtx, x, y, size, spec, seed);
        default: return drawStructuredWallFamilyV622(targetCtx, x, y, size, spec, seed);
    }
}
const renderTileCacheV621 = new Map();

const BIOME_TILE_PROFILES_V621 = Object.freeze({
    classic: Object.freeze({ wall: 'base', block: 'base' }),
    winter: Object.freeze({ wall: 'base', block: 'base' }),
    autumn: Object.freeze({ wall: 'base', block: 'base' }),
    spring: Object.freeze({ wall: 'base', block: 'base' }),
    summer: Object.freeze({ wall: 'base', block: 'base' }),
    underground: Object.freeze({ wall: 'base', block: 'base' }),
    clouds: Object.freeze({ wall: 'base', block: 'base' }),
    mountains: Object.freeze({ wall: 'base', block: 'base' }),
    beach: Object.freeze({ wall: 'base', block: 'base' }),
    space: Object.freeze({ wall: 'base', block: 'base' }),
    sky: Object.freeze({ wall: 'base', block: 'base' }),
    inferno: Object.freeze({ wall: 'base', block: 'base' })
});

const BIOME_TILE_FALLBACK_PALETTE_V621 = Object.freeze({
    wall: Object.freeze({ base: '#475569', highlight: '#94a3b8', shadow: '#334155', deep: '#0f172a', accent: '#38bdf8' }),
    block: Object.freeze({ base: '#b45309', highlight: '#f59e0b', shadow: '#78350f', deep: '#451a03', accent: '#92400e' })
});

function getBiomeTileProfileV621(type) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const bucket = BIOME_TILE_PROFILES_V621[themeId] || BIOME_TILE_PROFILES_V621.classic;
    return bucket[type] || null;
}

function getBiomeTilePaletteV621(type) {
    const base = BIOME_TILE_FALLBACK_PALETTE_V621[type] || BIOME_TILE_FALLBACK_PALETTE_V621.wall;
    if (typeof themeColorV46 !== 'function') return base;
    if (type === 'wall') {
        return {
            base: themeColorV46('wallBase', base.base),
            highlight: themeColorV46('wallHighlight', base.highlight),
            shadow: themeColorV46('wallShadow', base.shadow),
            inset: themeColorV46('wallInset', '#1e293b'),
            deep: themeColorV46('wallDeep', base.deep),
            accent: themeColorV46('wallAccent', base.accent)
        };
    }
    return {
        base: themeColorV46('blockBase', base.base),
        highlight: themeColorV46('blockHighlight', base.highlight),
        shadow: themeColorV46('blockShadow', base.shadow),
        inset: themeColorV46('blockPattern', base.accent),
        deep: themeColorV46('blockCore', base.deep),
        accent: themeColorV46('blockPattern', base.accent)
    };
}

function drawTileShadowV621(targetCtx, x, y, size, color) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(x, y + Math.max(2, size * 0.08), size, Math.max(2, size * 0.08));
    targetCtx.fillRect(x + size - Math.max(2, size * 0.08), y, Math.max(2, size * 0.08), size);
}

function drawTileBorderV621(targetCtx, x, y, size, colors) {
    const edge = Math.max(2, Math.floor(size * 0.05));
    targetCtx.fillStyle = colors.highlight;
    targetCtx.fillRect(x, y, size, edge);
    targetCtx.fillRect(x, y, edge, size);
    targetCtx.fillStyle = colors.shadow;
    targetCtx.fillRect(x, y + size - edge, size, edge);
    targetCtx.fillRect(x + size - edge, y, edge, size);
}

function drawTileHighlightV621(targetCtx, x, y, size, color, alpha = 0.24) {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = color;
    targetCtx.fillRect(x + size * 0.14, y + size * 0.12, size * 0.32, Math.max(2, size * 0.05));
    targetCtx.fillRect(x + size * 0.14, y + size * 0.12, Math.max(2, size * 0.05), size * 0.22);
    targetCtx.restore();
}

function drawTileCrackV621(targetCtx, x, y, size, color, seed = 0, branches = 2) {
    const s = Math.abs(Number(seed) || 0) + 1;
    const startX = x + size * (0.28 + ((s * 17) % 29) / 100);
    const startY = y + size * (0.16 + ((s * 23) % 24) / 100);
    targetCtx.save();
    targetCtx.strokeStyle = color;
    targetCtx.globalAlpha = 0.52;
    targetCtx.lineWidth = Math.max(1, Math.floor(size * 0.035));
    targetCtx.beginPath();
    targetCtx.moveTo(startX, startY);
    let px = startX, py = startY;
    for (let i = 0; i < 3; i++) {
        px += size * (0.08 + ((s * (i + 3) * 11) % 13) / 100);
        py += size * (0.08 + ((s * (i + 5) * 7) % 11) / 100);
        targetCtx.lineTo(px, py);
    }
    targetCtx.stroke();
    for (let i = 0; i < Math.min(3, branches); i++) {
        const bx = startX + size * (0.12 + i * 0.16);
        const by = startY + size * (0.12 + i * 0.18);
        targetCtx.beginPath();
        targetCtx.moveTo(bx, by);
        targetCtx.lineTo(bx + size * 0.10, by - size * 0.08);
        targetCtx.stroke();
    }
    targetCtx.restore();
}

function drawTileNoiseV621(targetCtx, x, y, size, color, seed = 0, density = 10, alpha = 0.14) {
    const s = Math.abs(Number(seed) || 0) + 13;
    const count = Math.max(0, Math.floor(density));
    targetCtx.save();
    targetCtx.fillStyle = color;
    targetCtx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
        const nx = (s * (i + 5) * 37) % 97 / 97;
        const ny = (s * (i + 7) * 53) % 89 / 89;
        const dot = 1 + ((s + i) % 2);
        targetCtx.fillRect(x + nx * size, y + ny * size, dot, dot);
    }
    targetCtx.restore();
}

function drawTilePolygonV621(targetCtx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
    if (!Array.isArray(points) || points.length < 3) return;
    targetCtx.beginPath();
    targetCtx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) targetCtx.lineTo(points[i][0], points[i][1]);
    targetCtx.closePath();
    targetCtx.fillStyle = fillStyle;
    targetCtx.fill();
    if (strokeStyle) {
        targetCtx.strokeStyle = strokeStyle;
        targetCtx.lineWidth = lineWidth;
        targetCtx.stroke();
    }
}

function drawBiomeTileBaseV621(targetCtx, x, y, type, size, seed = 0) {
    const colors = getBiomeTilePaletteV621(type);
    const isWall = type === 'wall';
    const inset = Math.max(4, Math.floor(size * 0.12));
    const inner = size - inset * 2;
    targetCtx.fillStyle = colors.shadow;
    targetCtx.fillRect(x, y, size, size);
    targetCtx.fillStyle = colors.base;
    targetCtx.fillRect(x + 2, y + 2, size - 4, size - 5);
    drawTileBorderV621(targetCtx, x, y, size, colors);
    targetCtx.fillStyle = colors.deep;
    targetCtx.fillRect(x + inset, y + inset, inner, inner);
    drawTileHighlightV621(targetCtx, x, y, size, colors.highlight, 0.28);
    drawTileNoiseV621(targetCtx, x + 3, y + 3, size - 6, colors.accent, seed, isWall ? 8 : 12, 0.16);
    if (isWall) drawTileCrackV621(targetCtx, x, y, size, colors.accent, seed, 2);
    return colors;
}

function createTileSurfaceV621(width, height) {
    if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        const surface = document.createElement('canvas');
        surface.width = width;
        surface.height = height;
        return surface;
    }
    return null;
}

function getBiomeTileKeyV621(themeId, type, variant = 0) {
    return `${themeId || 'classic'}|${type}|${TILE_SIZE}|${variant}`;
}

function getBiomeTileVariantV621(type, gridX = 0, gridY = 0) {
    if (type !== 'block') return 0;
    const levelSeed = Math.max(1, Number(gameState?.level) || 1);
    return Math.abs((gridX * 17 + gridY * 31 + levelSeed * 13) % 7) === 0 ? 1 : 0;
}

function buildBiomeTileCacheV621(type, variant = 0) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const key = getBiomeTileKeyV621(themeId, type, variant);
    const cached = renderTileCacheV621.get(key);
    if (cached) return cached;

    const surface = createTileSurfaceV621(TILE_SIZE, TILE_SIZE);
    if (!surface) return null;
    const tileCtx = surface.getContext('2d', { alpha: true });
    if (!tileCtx) return null;

    const profile = getBiomeTileProfileV621(type);
    if (type === 'wall' && typeof drawBiomeWallV622 === 'function') {
        // V6.22: WALL pasa por el nuevo dibujo procedural, siempre dentro del caché V6.21.
        // drawSteelWall() se conserva por ahora como código legado hasta una limpieza posterior.
        drawBiomeWallV622(tileCtx, 0, 0, TILE_SIZE, variant);
    } else {
        drawBiomeTileBaseV621(tileCtx, 0, 0, type, TILE_SIZE, variant);
    }

    renderTileCacheV621.set(key, surface);
    return surface;
}

function invalidateRenderTileCacheV621() {
    renderTileCacheV621.clear();
}

function drawCachedBiomeTileV621(targetCtx, type, gridX, gridY) {
    const variant = getBiomeTileVariantV621(type, gridX, gridY);
    const surface = buildBiomeTileCacheV621(type, variant);
    if (surface) targetCtx.drawImage(surface, gridX * TILE_SIZE, gridY * TILE_SIZE);
    return !!surface;
}

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
                if (b.state === 'carried' || b.motionState === 'carried') continue;
                const bombPos = typeof getBombV4WorldPosition === 'function' ? getBombV4WorldPosition(b) : {x:(b.x + .5) * TILE_SIZE, y:(b.y + .5) * TILE_SIZE};
                if(!isWorldRectVisibleV329(bombPos.x - TILE_SIZE * .55, bombPos.y - TILE_SIZE * .55, TILE_SIZE * 1.1, TILE_SIZE * 1.1, TILE_SIZE)) continue;
                renderStatsV329.bombs++;
                drawBombSprite(bombPos.x, bombPos.y, b);
            }
            drawBombChainLinks();
            if (typeof drawElementalBombFieldsV612 === 'function') drawElementalBombFieldsV612(ctx);

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
        }

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
            // Los dos objetos destructibles siguen usando TYPES.BLOCK para no crear
            // una segunda capa de colisiones. Visualmente, algunos se presentan como
            // barriles/urnas: misma resistencia y mismo drop, pero silueta distinta.
            const style = typeof themeSpriteV46 === 'function' ? themeSpriteV46('blockStyle', 'wood-crate') : 'wood-crate';
            const barrelStyle = typeof themeSpriteV46 === 'function' ? themeSpriteV46('barrelStyle', 'wood-barrel') : 'wood-barrel';
            const levelSeed = Math.max(1, Number(gameState.level) || 1);
            const barrelVariant = Math.abs((x * 17 + y * 31 + levelSeed * 13) % 7) === 0;
            const base = typeof themeColorV46 === 'function' ? themeColorV46('blockBase') : '#b45309';
            const hi = typeof themeColorV46 === 'function' ? themeColorV46('blockHighlight') : '#f59e0b';
            const shadow = typeof themeColorV46 === 'function' ? themeColorV46('blockShadow') : '#78350f';
            const pattern = typeof themeColorV46 === 'function' ? themeColorV46('blockPattern') : '#92400e';
            const core = typeof themeColorV46 === 'function' ? themeColorV46('blockCore') : '#451a03';

            if (barrelVariant) {
                drawBiomeBarrelV61229(x, y, targetCtx, barrelStyle, { base, hi, shadow, pattern, core });
                return;
            }

            const inset = Math.max(4, TILE_SIZE * 0.12);
            const inner = TILE_SIZE - inset * 2;

            targetCtx.fillStyle = shadow;
            targetCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            targetCtx.fillStyle = base;
            targetCtx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 5);
            targetCtx.fillStyle = hi;
            targetCtx.fillRect(x + 2, y + 2, TILE_SIZE - 4, Math.max(2, TILE_SIZE * 0.08));
            targetCtx.fillRect(x + 2, y + 2, Math.max(2, TILE_SIZE * 0.08), TILE_SIZE - 7);

            if (style === 'ice-crate') {
                // Caja de hielo: panel translúcido + grietas.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.strokeStyle = hi;
                targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.moveTo(x + inset + inner * .18, y + inset + inner * .08);
                targetCtx.lineTo(x + inset + inner * .45, y + inset + inner * .44);
                targetCtx.lineTo(x + inset + inner * .30, y + inset + inner * .86);
                targetCtx.moveTo(x + inset + inner * .70, y + inset + inner * .10);
                targetCtx.lineTo(x + inset + inner * .54, y + inset + inner * .40);
                targetCtx.lineTo(x + inset + inner * .78, y + inset + inner * .82);
                targetCtx.stroke();
                targetCtx.fillStyle = hi;
                targetCtx.fillRect(x + TILE_SIZE/2 - 3, y + TILE_SIZE/2 - 3, 6, 6);
            } else if (style === 'leaf-crate') {
                // Caja de hojas: marco verde y cuatro hojas/placas diagonales.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.fillStyle = pattern;
                targetCtx.beginPath();
                targetCtx.moveTo(x + inset, y + inset + inner * .28);
                targetCtx.lineTo(x + inset + inner * .28, y + inset);
                targetCtx.lineTo(x + inset + inner * .16, y + inset + inner * .18);
                targetCtx.closePath(); targetCtx.fill();
                targetCtx.beginPath();
                targetCtx.moveTo(x + inset + inner, y + inset + inner * .28);
                targetCtx.lineTo(x + inset + inner * .72, y + inset);
                targetCtx.lineTo(x + inset + inner * .84, y + inset + inner * .18);
                targetCtx.closePath(); targetCtx.fill();
                targetCtx.beginPath();
                targetCtx.moveTo(x + inset + inner * .50, y + inset + inner * .50);
                targetCtx.lineTo(x + inset + inner * .23, y + inset + inner * .84);
                targetCtx.lineTo(x + inset + inner * .77, y + inset + inner * .84);
                targetCtx.closePath(); targetCtx.fill();
                targetCtx.fillStyle = core;
                targetCtx.fillRect(x + TILE_SIZE/2 - 3, y + TILE_SIZE/2 - 3, 6, 6);
            } else if (style === 'garden-crate') {
                // Caja de jardín: listones horizontales + brote central.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.fillStyle = pattern;
                for (let i = 1; i < 4; i++) targetCtx.fillRect(x + inset, y + inset + inner * (i/4), inner, 2);
                targetCtx.fillStyle = hi;
                targetCtx.fillRect(x + inset + inner * .46, y + inset + inner * .22, 2, inner * .55);
                targetCtx.beginPath();
                targetCtx.arc(x + inset + inner * .36, y + inset + inner * .28, Math.max(2, inner*.10), 0, Math.PI*2); targetCtx.fill();
                targetCtx.beginPath();
                targetCtx.arc(x + inset + inner * .60, y + inset + inner * .34, Math.max(2, inner*.10), 0, Math.PI*2); targetCtx.fill();
            } else if (style === 'sun-crate') {
                // Caja solar: amarillo intenso, rayos y centro.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.strokeStyle = pattern; targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.moveTo(x + inset + inner*.18, y + inset + inner*.18); targetCtx.lineTo(x + inset + inner*.82, y + inset + inner*.82);
                targetCtx.moveTo(x + inset + inner*.82, y + inset + inner*.18); targetCtx.lineTo(x + inset + inner*.18, y + inset + inner*.82);
                targetCtx.stroke();
                targetCtx.fillStyle = hi;
                targetCtx.beginPath(); targetCtx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, Math.max(3, TILE_SIZE*.16), 0, Math.PI*2); targetCtx.fill();
            } else if (style === 'ore-crate') {
                // Caja de mineral: placas rocosas con gema central.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.fillStyle = pattern;
                const pts = [
                    [x+inset+inner*.10,y+inset+inner*.20],[x+inset+inner*.38,y+inset+inner*.10],[x+inset+inner*.25,y+inset+inner*.42],
                    [x+inset+inner*.72,y+inset+inner*.12],[x+inset+inner*.88,y+inset+inner*.35],[x+inset+inner*.58,y+inset+inner*.30]
                ];
                targetCtx.beginPath(); targetCtx.moveTo(...pts[0]); for(const p of pts.slice(1)) targetCtx.lineTo(...p); targetCtx.closePath(); targetCtx.fill();
                targetCtx.fillStyle = hi; targetCtx.beginPath(); targetCtx.moveTo(x+TILE_SIZE/2,y+inset+4); targetCtx.lineTo(x+TILE_SIZE/2+5,y+TILE_SIZE/2); targetCtx.lineTo(x+TILE_SIZE/2,y+TILE_SIZE/2+6); targetCtx.lineTo(x+TILE_SIZE/2-5,y+TILE_SIZE/2); targetCtx.closePath(); targetCtx.fill();
            } else if (style === 'cloud-crate') {
                // Caja de nube: caja clara con abombamientos suaves en las caras.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.fillStyle = hi;
                for (const p of [[.24,.34,.13],[.48,.28,.16],[.72,.38,.13]]) {
                    targetCtx.beginPath(); targetCtx.arc(x+inset+inner*p[0], y+inset+inner*p[1], inner*p[2], 0, Math.PI*2); targetCtx.fill();
                }
                targetCtx.fillStyle = pattern;
                targetCtx.fillRect(x + inset + inner*.16, y + inset + inner*.62, inner*.68, 2);
            } else if (style === 'rock-crate') {
                // Caja de piedra: panel con quiebres angulares.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.fillStyle = pattern;
                targetCtx.beginPath();
                targetCtx.moveTo(x+inset+inner*.08,y+inset+inner*.20); targetCtx.lineTo(x+inset+inner*.36,y+inset+inner*.08); targetCtx.lineTo(x+inset+inner*.30,y+inset+inner*.40); targetCtx.lineTo(x+inset+inner*.08,y+inset+inner*.54); targetCtx.closePath(); targetCtx.fill();
                targetCtx.beginPath();
                targetCtx.moveTo(x+inset+inner*.58,y+inset+inner*.10); targetCtx.lineTo(x+inset+inner*.90,y+inset+inner*.25); targetCtx.lineTo(x+inset+inner*.78,y+inset+inner*.50); targetCtx.lineTo(x+inset+inner*.52,y+inset+inner*.38); targetCtx.closePath(); targetCtx.fill();
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 2;
                targetCtx.beginPath(); targetCtx.moveTo(x+inset+inner*.40,y+inset+inner*.18); targetCtx.lineTo(x+inset+inner*.52,y+inset+inner*.78); targetCtx.stroke();
            } else if (style === 'sand-crate') {
                // Caja de arena: marco, cuerda cruzada y nudos.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.strokeStyle = pattern; targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.moveTo(x+inset,y+inset); targetCtx.lineTo(x+inset+inner,y+inset+inner);
                targetCtx.moveTo(x+inset+inner,y+inset); targetCtx.lineTo(x+inset,y+inset+inner);
                targetCtx.stroke();
                targetCtx.fillStyle = hi;
                for (const [dx,dy] of [[.10,.10],[.90,.10],[.10,.90],[.90,.90]]) { targetCtx.fillRect(x+inset+inner*dx-2,y+inset+inner*dy-2,4,4); }
            } else if (style === 'tech-crate') {
                // Caja tecnológica: panel, tornillos y bandas de seguridad.
                targetCtx.fillStyle = base;
                targetCtx.fillRect(x + inset, y + inset, inner, inner);
                targetCtx.fillStyle = hi;
                targetCtx.fillRect(x+inset+inner*.12,y+inset+inner*.12,inner*.76,3);
                targetCtx.fillStyle = pattern;
                for (let i=0;i<4;i++) targetCtx.fillRect(x+inset+inner*.18+i*inner*.17,y+inset+inner*.52,inner*.11,3);
                targetCtx.fillStyle = core;
                for (const [dx,dy] of [[.12,.12],[.88,.12],[.12,.88],[.88,.88]]) { targetCtx.beginPath(); targetCtx.arc(x+inset+inner*dx,y+inset+inner*dy,2,0,Math.PI*2); targetCtx.fill(); }
            } else if (style === 'aurora-crate') {
                // Caja aurora: panel oscuro con bandas diagonales brillantes.
                targetCtx.fillStyle = base; targetCtx.fillRect(x+inset,y+inset,inner,inner);
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 3;
                targetCtx.beginPath(); targetCtx.moveTo(x+inset,y+inset+inner*.72); targetCtx.lineTo(x+inset+inner*.34,y+inset+inner*.10); targetCtx.lineTo(x+inset+inner*.68,y+inset+inner*.90); targetCtx.lineTo(x+inset+inner,y+inset+inner*.28); targetCtx.stroke();
                targetCtx.fillStyle = pattern; targetCtx.fillRect(x+inset+inner*.10,y+inset+inner*.44,inner*.80,3);
            } else if (style === 'lava-crate') {
                // Caja de lava: bloque de roca roja con grietas incandescentes.
                targetCtx.fillStyle = base; targetCtx.fillRect(x+inset,y+inset,inner,inner);
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 2.5;
                targetCtx.beginPath();
                targetCtx.moveTo(x+inset+inner*.12,y+inset+inner*.18); targetCtx.lineTo(x+inset+inner*.44,y+inset+inner*.44); targetCtx.lineTo(x+inset+inner*.28,y+inset+inner*.82);
                targetCtx.moveTo(x+inset+inner*.62,y+inset+inner*.16); targetCtx.lineTo(x+inset+inner*.52,y+inset+inner*.58); targetCtx.lineTo(x+inset+inner*.84,y+inset+inner*.82);
                targetCtx.stroke();
                targetCtx.fillStyle = core; targetCtx.fillRect(x+TILE_SIZE/2-4,y+TILE_SIZE/2-4,8,8);
            } else {
                // Caja de madera clásica: listones cruzados.
                targetCtx.strokeStyle = pattern;
                targetCtx.lineWidth = 4;
                targetCtx.beginPath();
                targetCtx.moveTo(x + 6, y + 6);
                targetCtx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
                targetCtx.moveTo(x + TILE_SIZE - 6, y + 6);
                targetCtx.lineTo(x + 6, y + TILE_SIZE - 6);
                targetCtx.stroke();
                targetCtx.fillStyle = core;
                targetCtx.fillRect(x + TILE_SIZE/2 - 4, y + TILE_SIZE/2 - 4, 8, 8);
            }
        }

        function drawBiomeBarrelV61229(x, y, targetCtx, style, colors) {
            const { base, hi, shadow, pattern, core } = colors;
            const pad = Math.max(4, TILE_SIZE * 0.13);
            const left = x + pad;
            const right = x + TILE_SIZE - pad;
            const top = y + pad + 2;
            const bottom = y + TILE_SIZE - pad;
            const width = right - left;
            const centerX = x + TILE_SIZE / 2;

            // Sombra inferior y cuerpo cilíndrico.
            targetCtx.fillStyle = shadow;
            targetCtx.fillRect(left + 1, top + 3, width - 2, bottom - top - 1);
            targetCtx.fillStyle = base;
            targetCtx.beginPath();
            targetCtx.moveTo(left + 3, top);
            targetCtx.quadraticCurveTo(centerX, top - 2, right - 3, top);
            targetCtx.lineTo(right - 3, bottom);
            targetCtx.quadraticCurveTo(centerX, bottom + 2, left + 3, bottom);
            targetCtx.closePath();
            targetCtx.fill();

            // Tapa superior.
            targetCtx.fillStyle = hi;
            targetCtx.beginPath();
            targetCtx.ellipse(centerX, top + 1, width * .43, Math.max(3, TILE_SIZE * .10), 0, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.fillStyle = core;
            targetCtx.beginPath();
            targetCtx.ellipse(centerX, top + 1, width * .22, Math.max(1.5, TILE_SIZE * .045), 0, 0, Math.PI * 2);
            targetCtx.fill();

            // Aros del barril: hacen visible la silueta incluso en temas oscuros.
            targetCtx.fillStyle = pattern;
            targetCtx.fillRect(left + 1, y + TILE_SIZE * .31, width - 2, Math.max(2, TILE_SIZE * .055));
            targetCtx.fillRect(left + 1, y + TILE_SIZE * .67, width - 2, Math.max(2, TILE_SIZE * .055));
            targetCtx.fillStyle = hi;
            targetCtx.fillRect(left + 2, y + TILE_SIZE * .30, width * .16, 2);
            targetCtx.fillRect(left + 2, y + TILE_SIZE * .66, width * .16, 2);

            if (style === 'ice-drum') {
                targetCtx.strokeStyle = '#ffffff';
                targetCtx.lineWidth = 1.5;
                targetCtx.beginPath();
                targetCtx.moveTo(centerX - 4, y + TILE_SIZE * .43);
                targetCtx.lineTo(centerX + 2, y + TILE_SIZE * .54);
                targetCtx.lineTo(centerX - 1, y + TILE_SIZE * .64);
                targetCtx.stroke();
            } else if (style === 'leaf-barrel') {
                targetCtx.fillStyle = hi;
                targetCtx.beginPath();
                targetCtx.ellipse(centerX - 4, y + TILE_SIZE * .53, 4, 2.5, -.45, 0, Math.PI * 2);
                targetCtx.ellipse(centerX + 4, y + TILE_SIZE * .57, 4, 2.5, .45, 0, Math.PI * 2);
                targetCtx.fill();
            } else if (style === 'garden-pot') {
                targetCtx.fillStyle = hi;
                targetCtx.fillRect(centerX - 3, y + TILE_SIZE * .43, 6, TILE_SIZE * .20);
                targetCtx.fillStyle = pattern;
                targetCtx.beginPath();
                targetCtx.arc(centerX - 4, y + TILE_SIZE * .44, 4, Math.PI * .95, Math.PI * 1.85);
                targetCtx.arc(centerX + 4, y + TILE_SIZE * .42, 4, Math.PI * 1.15, Math.PI * .05);
                targetCtx.fill();
            } else if (style === 'sun-drum') {
                targetCtx.fillStyle = hi;
                targetCtx.beginPath();
                targetCtx.arc(centerX, y + TILE_SIZE * .53, 4, 0, Math.PI * 2);
                targetCtx.fill();
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 1.5;
                for (let i = 0; i < 4; i++) {
                    const a = i * Math.PI / 2;
                    targetCtx.beginPath();
                    targetCtx.moveTo(centerX + Math.cos(a) * 6, y + TILE_SIZE * .53 + Math.sin(a) * 6);
                    targetCtx.lineTo(centerX + Math.cos(a) * 9, y + TILE_SIZE * .53 + Math.sin(a) * 9);
                    targetCtx.stroke();
                }
            } else if (style === 'ore-barrel') {
                targetCtx.fillStyle = hi;
                targetCtx.beginPath();
                targetCtx.moveTo(centerX, y + TILE_SIZE * .42);
                targetCtx.lineTo(centerX + 4, y + TILE_SIZE * .53);
                targetCtx.lineTo(centerX, y + TILE_SIZE * .66);
                targetCtx.lineTo(centerX - 4, y + TILE_SIZE * .53);
                targetCtx.closePath(); targetCtx.fill();
            } else if (style === 'cloud-canister') {
                targetCtx.fillStyle = hi;
                for (const [dx,dy,r] of [[-5,.52,3],[0,.47,4],[5,.52,3]]) {
                    targetCtx.beginPath(); targetCtx.arc(centerX + dx, y + TILE_SIZE * dy, r, 0, Math.PI*2); targetCtx.fill();
                }
            } else if (style === 'rock-barrel') {
                targetCtx.fillStyle = pattern;
                targetCtx.beginPath();
                targetCtx.moveTo(centerX - 5, y + TILE_SIZE * .48);
                targetCtx.lineTo(centerX - 1, y + TILE_SIZE * .40);
                targetCtx.lineTo(centerX + 5, y + TILE_SIZE * .49);
                targetCtx.lineTo(centerX + 2, y + TILE_SIZE * .62);
                targetCtx.lineTo(centerX - 4, y + TILE_SIZE * .60);
                targetCtx.closePath(); targetCtx.fill();
            } else if (style === 'sand-barrel') {
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.arc(centerX, y + TILE_SIZE * .54, 5, 0, Math.PI * 2);
                targetCtx.stroke();
            } else if (style === 'tech-drum') {
                targetCtx.fillStyle = hi;
                targetCtx.fillRect(centerX - 5, y + TILE_SIZE * .48, 10, 2);
                targetCtx.fillStyle = pattern;
                targetCtx.fillRect(centerX - 5, y + TILE_SIZE * .57, 3, 3);
                targetCtx.fillRect(centerX + 2, y + TILE_SIZE * .57, 3, 3);
            } else if (style === 'aurora-barrel') {
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.moveTo(left + 5, y + TILE_SIZE * .58);
                targetCtx.quadraticCurveTo(centerX, y + TILE_SIZE * .42, right - 5, y + TILE_SIZE * .58);
                targetCtx.stroke();
            } else if (style === 'lava-drum') {
                targetCtx.strokeStyle = hi; targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.moveTo(centerX - 5, y + TILE_SIZE * .41);
                targetCtx.lineTo(centerX + 2, y + TILE_SIZE * .53);
                targetCtx.lineTo(centerX - 2, y + TILE_SIZE * .66);
                targetCtx.stroke();
                targetCtx.fillStyle = hi;
                targetCtx.fillRect(centerX - 2, y + TILE_SIZE * .51, 4, 4);
            } else {
                // Barril de madera clásico: símbolo en X.
                targetCtx.strokeStyle = hi;
                targetCtx.lineWidth = 2;
                targetCtx.beginPath();
                targetCtx.moveTo(centerX - 5, y + TILE_SIZE * .46);
                targetCtx.lineTo(centerX + 5, y + TILE_SIZE * .61);
                targetCtx.moveTo(centerX + 5, y + TILE_SIZE * .46);
                targetCtx.lineTo(centerX - 5, y + TILE_SIZE * .61);
                targetCtx.stroke();
            }

            // Base elíptica que termina de separar el barril de una caja.
            targetCtx.fillStyle = shadow;
            targetCtx.beginPath();
            targetCtx.ellipse(centerX, bottom, width * .39, Math.max(2, TILE_SIZE * .085), 0, 0, Math.PI);
            targetCtx.fill();
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

            if (e.hunterMarkedV676) {
                ctx.strokeStyle = '#facc15';
                ctx.globalAlpha = 0.8;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y + floaty, TILE_SIZE * 0.50, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
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
