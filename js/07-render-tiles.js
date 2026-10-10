// Bomberman Roguelike v6.31.5 — Renderizador: tiles, paredes y bloques
// Extracción mecánica desde js/07-render.js. Cuerpos conservados sin cambios.

// Bomberman Roguelike v6.30.7 — Canvas renderer con fusión cromática elemental
// V6.25.0: Canvas conserva skins/especies de enemigos por bioma. Cache procedural preservado.
// V3.17: cache de terreno estático para evitar reconstruir la cuadrícula completa
// en cada frame. El mapa se regenera solo cuando cambia la referencia/revisión.

// V6.21: infraestructura común para tiles procedurales en Canvas 2D.
// El caché por tile complementa al caché de terreno existente; no crea un segundo renderer.

// V6.22/V6.23/V6.24: paredes y objetos procedurales; una sola ruta visual Canvas 2D.
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
const BIOME_BLOCK_SPECS_V623 = Object.freeze({
    classic: Object.freeze({ family: 'crate', base: '#8f4f2b', light: '#d38a4b', shadow: '#5a2e1b', deep: '#2f180d', accent: '#f0b35c', secondary: '#6f3a24', detail: 'wood' }),
    winter: Object.freeze({ family: 'ice', base: '#d9f4ff', light: '#ffffff', shadow: '#7fb2c5', deep: '#5a91a8', accent: '#8ee8ff', secondary: '#b7e9fa', detail: 'crack' }),
    autumn: Object.freeze({ family: 'leafcrate', base: '#7b421f', light: '#c7792d', shadow: '#4a2413', deep: '#26130a', accent: '#e8752f', secondary: '#a52e26', detail: 'leaves' }),
    spring: Object.freeze({ family: 'shrub', base: '#3f6d38', light: '#78a85f', shadow: '#274124', deep: '#192719', accent: '#f48fb1', secondary: '#fff4f8', detail: 'flowers' }),
    summer: Object.freeze({ family: 'cactus', base: '#2d7f4f', light: '#73bf77', shadow: '#1b4e2f', deep: '#12351f', accent: '#8fd17b', secondary: '#b89a68', detail: 'rocks' }),
    underground: Object.freeze({ family: 'ore', base: '#4b4650', light: '#7f7784', shadow: '#2b2730', deep: '#17151a', accent: '#d7aa43', secondary: '#a98b62', detail: 'gold' }),
    clouds: Object.freeze({ family: 'cloud', base: '#eef6ff', light: '#ffffff', shadow: '#9fb3c7', deep: '#d0deea', accent: '#ffffff', secondary: '#c4d7e8', detail: 'soft' }),
    mountains: Object.freeze({ family: 'stones', base: '#8f979f', light: '#c7cdd2', shadow: '#5b6269', deep: '#353a3f', accent: '#e3e8eb', secondary: '#737b83', detail: 'pile' }),
    beach: Object.freeze({ family: 'barrelcrate', base: '#8a5a34', light: '#d39a5f', shadow: '#4f2d19', deep: '#2a180e', accent: '#c97a48', secondary: '#e2c07c', detail: 'coastal' }),
    space: Object.freeze({ family: 'tech', base: '#d98a26', light: '#ffd36a', shadow: '#8a4c12', deep: '#3e240c', accent: '#56d9ff', secondary: '#6e7f8d', detail: 'core' }),
    sky: Object.freeze({ family: 'altar', base: '#d8d4ca', light: '#ffffff', shadow: '#9c978d', deep: '#625e57', accent: '#eee6d1', secondary: '#b8b2a7', detail: 'sacred' }),
    inferno: Object.freeze({ family: 'emberrock', base: '#37211d', light: '#704137', shadow: '#1d100e', deep: '#0e0706', accent: '#ff8a24', secondary: '#c33d1c', detail: 'embers' })
});

function getBiomeBlockSpecV623() {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    return BIOME_BLOCK_SPECS_V623[themeId] || BIOME_BLOCK_SPECS_V623.classic;
}

function drawBiomeBlockFrameV623(targetCtx, x, y, size, spec) {
    const inset = Math.max(3, Math.floor(size * 0.08));
    drawTileShadowV621(targetCtx, x, y, size, spec.shadow);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x + 1, y + 1, size - 2, size - 3);
    drawTileBorderV621(targetCtx, x, y, size, {
        highlight: spec.light,
        shadow: spec.shadow
    });
    targetCtx.fillStyle = spec.deep;
    targetCtx.globalAlpha = 0.20;
    targetCtx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    targetCtx.globalAlpha = 1;
    drawTileHighlightV621(targetCtx, x, y, size, spec.light, 0.24);
}

function drawIceBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const inset = size * 0.16;
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x + inset, y + inset, size - inset * 2, size * 0.62);
    drawTilePolygonV621(targetCtx, [[x+size*.14,y+size*.18],[x+size*.30,y+size*.10],[x+size*.44,y+size*.18],[x+size*.56,y+size*.11],[x+size*.78,y+size*.18],[x+size*.70,y+size*.30],[x+size*.28,y+size*.28]], spec.light);
    drawTileCrackV621(targetCtx, x, y, size, spec.accent, seed + 3, 3);
    drawTileCrackV621(targetCtx, x + size*.18, y + size*.20, size*.64, '#5fa8c5', seed + 11, 2);
}

function drawLeafCrateV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x+size*.13, y+size*.18, size*.74, size*.62);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.17, y+size*.27, size*.66, Math.max(2,size*.045));
    targetCtx.fillRect(x+size*.17, y+size*.55, size*.66, Math.max(2,size*.045));
    drawTilePolygonV621(targetCtx, [[x+size*.08,y+size*.28],[x+size*.22,y+size*.12],[x+size*.31,y+size*.26],[x+size*.19,y+size*.37]], spec.accent);
    drawTilePolygonV621(targetCtx, [[x+size*.69,y+size*.18],[x+size*.82,y+size*.06],[x+size*.92,y+size*.22],[x+size*.79,y+size*.30]], spec.secondary);
    drawTilePolygonV621(targetCtx, [[x+size*.43,y+size*.10],[x+size*.55,y+size*.04],[x+size*.61,y+size*.21],[x+size*.49,y+size*.27]], spec.accent);
    drawTileNoiseV621(targetCtx, x+size*.10, y+size*.10, size*.80, spec.light, seed + 4, 7, 0.12);
}

function drawFlowerShrubV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.base;
    [[.28,.58,.23],[.50,.47,.29],[.72,.58,.23],[.39,.70,.22],[.61,.70,.22]].forEach(([cx,cy,r]) => {
        targetCtx.beginPath();
        targetCtx.arc(x+size*cx, y+size*cy, size*r, 0, Math.PI*2);
        targetCtx.fill();
    });
    const flowers = [
        [.27,.39,spec.accent],[.48,.31,spec.secondary],[.69,.42,'#ef5350'],[.42,.56,'#ffffff'],[.62,.57,spec.accent]
    ];
    flowers.forEach(([fx,fy,color], i) => {
        targetCtx.fillStyle = color;
        for(let p=0;p<4;p++){
            const a=(Math.PI/2)*p;
            targetCtx.beginPath();
            targetCtx.arc(x+size*fx+Math.cos(a)*size*.055, y+size*fy+Math.sin(a)*size*.055, Math.max(2,size*.035), 0, Math.PI*2);
            targetCtx.fill();
        }
        targetCtx.fillStyle = '#ffd54f';
        targetCtx.fillRect(x+size*fx-1, y+size*fy-1, 2, 2);
    });
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.26, size*.76, spec.light, seed+2, 9, .10);
}

function drawCactusV623(targetCtx, x, y, size, spec) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x+size*.18, y+size*.78, size*.64, size*.10);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.26, y+size*.81, size*.15, size*.07);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.42, y+size*.22, size*.17, size*.58);
    targetCtx.fillRect(x+size*.28, y+size*.42, size*.15, size*.25);
    targetCtx.fillRect(x+size*.63, y+size*.34, size*.15, size*.28);
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.45, y+size*.26, Math.max(2,size*.045), size*.48);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.53, y+size*.22, Math.max(2,size*.04), size*.58);
    targetCtx.fillStyle = spec.secondary;
    [[.25,.78,.10],[.55,.82,.13],[.77,.78,.09]].forEach(([cx,cy,r])=>{
        targetCtx.beginPath(); targetCtx.arc(x+size*cx,y+size*cy,size*r,0,Math.PI*2); targetCtx.fill();
    });
}

function drawOreBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const pts = [[.14,.69],[.22,.32],[.48,.18],[.76,.30],[.86,.65],[.62,.84],[.36,.82]];
    drawTilePolygonV621(targetCtx, pts.map(([px,py])=>[x+size*px,y+size*py]), spec.base, spec.shadow, Math.max(1,size*.025));
    drawTilePolygonV621(targetCtx, [[x+size*.23,y+size*.58],[x+size*.39,y+size*.27],[x+size*.54,y+size*.42],[x+size*.46,y+size*.70]], spec.light);
    targetCtx.strokeStyle = spec.accent;
    targetCtx.lineWidth = Math.max(2,size*.035);
    targetCtx.beginPath();
    targetCtx.moveTo(x+size*.30,y+size*.62); targetCtx.lineTo(x+size*.49,y+size*.52); targetCtx.lineTo(x+size*.66,y+size*.62);
    targetCtx.moveTo(x+size*.56,y+size*.38); targetCtx.lineTo(x+size*.72,y+size*.31);
    targetCtx.stroke();
    targetCtx.fillStyle = spec.accent;
    [[.35,.48],[.63,.55],[.73,.36]].forEach(([px,py])=>{
        targetCtx.fillRect(x+size*px, y+size*py, Math.max(2,size*.05), Math.max(2,size*.05));
    });
    drawTileNoiseV621(targetCtx, x+size*.15, y+size*.20, size*.70, spec.secondary, seed+5, 8, .14);
}

function drawCloudBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const puffs = [[.25,.60,.22],[.43,.46,.28],[.66,.56,.27],[.81,.66,.18],[.53,.68,.29]];
    puffs.forEach(([cx,cy,r],i)=>{
        targetCtx.fillStyle = i===1 || i===4 ? spec.light : spec.base;
        targetCtx.beginPath();
        targetCtx.arc(x+size*cx,y+size*cy,size*r,0,Math.PI*2);
        targetCtx.fill();
    });
    targetCtx.fillStyle = spec.shadow;
    targetCtx.globalAlpha = .20;
    targetCtx.fillRect(x+size*.19,y+size*.66,size*.60,size*.10);
    targetCtx.globalAlpha = 1;
    drawTileNoiseV621(targetCtx, x+size*.18, y+size*.30, size*.62, spec.light, seed+3, 8, .16);
}

function drawStonePileV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    const stones = [
        [[.14,.74],[.25,.38],[.43,.46],[.39,.76]],
        [[.35,.78],[.46,.28],[.62,.34],[.68,.74]],
        [[.58,.75],[.69,.42],[.86,.49],[.82,.79]]
    ];
    stones.forEach((shape,i)=>{
        drawTilePolygonV621(targetCtx, shape.map(([px,py])=>[x+size*px,y+size*py]), i===1 ? spec.light : spec.base, spec.shadow, Math.max(1,size*.025));
    });
    drawTileHighlightV621(targetCtx, x, y, size, spec.accent, .18);
    drawTileNoiseV621(targetCtx, x+size*.13, y+size*.24, size*.74, spec.accent, seed+6, 7, .10);
}

function drawBeachBarrelCrateV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.50,y+size*.30,size*.32,size*.48);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.54,y+size*.26,size*.28,size*.48);
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.58,y+size*.30,Math.max(2,size*.05),size*.40);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.14,y+size*.32,size*.30,size*.34);
    targetCtx.fillStyle = spec.secondary;
    targetCtx.fillRect(x+size*.17,y+size*.35,size*.24,size*.28);
    targetCtx.fillStyle = spec.accent;
    targetCtx.fillRect(x+size*.19,y+size*.45,size*.20,Math.max(2,size*.04));
    targetCtx.fillRect(x+size*.14,y+size*.70,size*.32,Math.max(2,size*.05));
    drawTilePolygonV621(targetCtx, [[x+size*.70,y+size*.18],[x+size*.76,y+size*.11],[x+size*.82,y+size*.18],[x+size*.76,y+size*.23]], spec.secondary);
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.24, size*.72, spec.light, seed+4, 7, .10);
}

function drawTechBlockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.deep;
    targetCtx.fillRect(x+size*.14,y+size*.16,size*.72,size*.68);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.18,y+size*.20,size*.64,size*.60);
    targetCtx.fillStyle = spec.secondary;
    [[.20,.23],[.76,.23],[.20,.72],[.76,.72]].forEach(([px,py])=>targetCtx.fillRect(x+size*px,y+size*py,size*.08,size*.08));
    targetCtx.fillStyle = '#123b52';
    targetCtx.fillRect(x+size*.38,y+size*.36,size*.24,size*.24);
    targetCtx.fillStyle = spec.accent;
    targetCtx.beginPath(); targetCtx.arc(x+size*.50,y+size*.48,size*.095,0,Math.PI*2); targetCtx.fill();
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.22,y+size*.26,size*.14,Math.max(2,size*.04));
    drawTileNoiseV621(targetCtx, x+size*.16, y+size*.20, size*.68, spec.secondary, seed+7, 6, .08);
}

function drawAltarV623(targetCtx, x, y, size, spec) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    targetCtx.fillStyle = spec.shadow;
    targetCtx.fillRect(x+size*.14,y+size*.72,size*.72,size*.12);
    targetCtx.fillStyle = spec.base;
    targetCtx.fillRect(x+size*.21,y+size*.58,size*.58,size*.16);
    targetCtx.fillRect(x+size*.28,y+size*.36,size*.44,size*.24);
    targetCtx.fillStyle = spec.light;
    targetCtx.fillRect(x+size*.31,y+size*.39,size*.12,size*.16);
    targetCtx.fillRect(x+size*.28,y+size*.58,size*.08,size*.11);
    targetCtx.fillStyle = spec.accent;
    targetCtx.globalAlpha=.40;
    targetCtx.fillRect(x+size*.36,y+size*.15,size*.28,size*.12);
    targetCtx.globalAlpha=1;
    drawTileCrackV621(targetCtx, x+size*.20, y+size*.34, size*.56, spec.secondary, 9, 2);
}

function drawEmberRockV623(targetCtx, x, y, size, spec, seed = 0) {
    drawBiomeBlockFrameV623(targetCtx, x, y, size, spec);
    drawTilePolygonV621(targetCtx, [[x+size*.12,y+size*.76],[x+size*.20,y+size*.40],[x+size*.40,y+size*.22],[x+size*.58,y+size*.36],[x+size*.54,y+size*.66],[x+size*.76,y+size*.42],[x+size*.89,y+size*.74],[x+size*.72,y+size*.86],[x+size*.40,y+size*.82]], spec.base);
    targetCtx.strokeStyle = spec.secondary;
    targetCtx.lineWidth = Math.max(2,size*.035);
    targetCtx.beginPath();
    targetCtx.moveTo(x+size*.25,y+size*.62); targetCtx.lineTo(x+size*.36,y+size*.46); targetCtx.lineTo(x+size*.50,y+size*.52);
    targetCtx.moveTo(x+size*.63,y+size*.65); targetCtx.lineTo(x+size*.72,y+size*.48);
    targetCtx.stroke();
    targetCtx.fillStyle = spec.accent;
    [[.31,.56,.045],[.58,.42,.038],[.71,.60,.032]].forEach(([px,py,r])=>{
        targetCtx.beginPath(); targetCtx.arc(x+size*px,y+size*py,size*r,0,Math.PI*2); targetCtx.fill();
    });
    targetCtx.fillStyle = spec.secondary;
    drawTilePolygonV621(targetCtx, [[x+size*.35,y+size*.36],[x+size*.42,y+size*.20],[x+size*.47,y+size*.38]], spec.secondary);
    drawTileNoiseV621(targetCtx, x+size*.12, y+size*.20, size*.76, spec.secondary, seed+8, 8, .12);
}

function drawAutumnBlockV623(targetCtx, x, y, size, spec, seed) { drawLeafCrateV623(targetCtx, x, y, size, spec, seed); }
function drawSpringBlockV623(targetCtx, x, y, size, spec, seed) { drawFlowerShrubV623(targetCtx, x, y, size, spec, seed); }
function drawSummerBlockV623(targetCtx, x, y, size, spec, seed) { drawCactusV623(targetCtx, x, y, size, spec, seed); }
function drawBeachBlockEntryV623(targetCtx, x, y, size, spec, seed) { drawBeachBarrelCrateV623(targetCtx, x, y, size, spec, seed); }

function drawBiomeBlockV623(targetCtx, x, y, size, seed = 0) {
    const themeId = typeof getThemeV46 === 'function' ? (getThemeV46()?.id || 'classic') : 'classic';
    const spec = BIOME_BLOCK_SPECS_V623[themeId] || BIOME_BLOCK_SPECS_V623.classic;
    switch (themeId) {
        case 'winter': return drawIceBlockV623(targetCtx, x, y, size, spec, seed);
        case 'autumn': return drawAutumnBlockV623(targetCtx, x, y, size, spec, seed);
        case 'spring': return drawSpringBlockV623(targetCtx, x, y, size, spec, seed);
        case 'summer': return drawSummerBlockV623(targetCtx, x, y, size, spec, seed);
        case 'underground': return drawOreBlockV623(targetCtx, x, y, size, spec, seed);
        case 'clouds': return drawCloudBlockV623(targetCtx, x, y, size, spec, seed);
        case 'mountains': return drawStonePileV623(targetCtx, x, y, size, spec, seed);
        case 'beach': return drawBeachBlockEntryV623(targetCtx, x, y, size, spec, seed);
        case 'space': return drawTechBlockV623(targetCtx, x, y, size, spec, seed);
        case 'sky': return drawAltarV623(targetCtx, x, y, size, spec, seed);
        case 'inferno': return drawEmberRockV623(targetCtx, x, y, size, spec, seed);
        default: return drawBiomeTileBaseV621(targetCtx, x, y, 'block', size, seed);
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
    // V6.24.1: OffscreenCanvas es una optimizacion, no un requisito del render.
    // Solo se acepta si realmente podemos obtener un contexto 2D. Si falla,
    // se cae al canvas normal sin interrumpir el render del juego.
    if (typeof OffscreenCanvas === 'function') {
        try {
            const offscreen = new OffscreenCanvas(width, height);
            if (offscreen && typeof offscreen.getContext === 'function' && offscreen.getContext('2d')) {
                return offscreen;
            }
        } catch (_) {
            // Fallback inmediato al canvas DOM.
        }
    }
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        try {
            const surface = document.createElement('canvas');
            surface.width = width;
            surface.height = height;
            if (typeof surface.getContext === 'function' && surface.getContext('2d')) return surface;
        } catch (_) {
            // Sin superficie disponible, el llamador usara el fallback visual.
        }
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
    let tileCtx = null;
    try {
        tileCtx = surface.getContext('2d', { alpha: true });
    } catch (_) {
        tileCtx = null;
    }
    if (!tileCtx) return null;

    try {
        if (type === 'wall' && typeof drawBiomeWallV622 === 'function') {
            // V6.22: WALL pasa por el dibujo procedural cacheado.
            drawBiomeWallV622(tileCtx, 0, 0, TILE_SIZE, variant);
        } else if (type === 'block' && typeof drawBiomeBlockV623 === 'function') {
            // V6.23: BLOCK pasa por el dibujo destructible procedural cacheado.
            // La celda sigue siendo TYPES.BLOCK; solo cambia su representacion.
            drawBiomeBlockV623(tileCtx, 0, 0, TILE_SIZE, variant);
        } else {
            drawBiomeTileBaseV621(tileCtx, 0, 0, type, TILE_SIZE, variant);
        }
    } catch (_) {
        // Un fallo visual de un tile no puede abortar la construccion de todo el mapa.
        tileCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
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

