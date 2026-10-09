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

function residuePaletteV6308(effectId) {
    const key = getExplosionEffectKeyV6308(effectId);
    const palettes = {
        fire: { outer:'#271d20', middle:'#71351f', core:'#c65b26', texture:'#f59e0b', kind:'burn' },
        ice: { outer:'#122b40', middle:'#1e5b7a', core:'#60bce8', texture:'#dbeafe', kind:'ice' },
        electric: { outer:'#102944', middle:'#075985', core:'#22d3ee', texture:'#a5f3fc', kind:'electric' },
        arc: { outer:'#102944', middle:'#075985', core:'#22d3ee', texture:'#a5f3fc', kind:'electric' },
        steam: { outer:'#232d3a', middle:'#64748b', core:'#94a3b8', texture:'#e2e8f0', kind:'steam' },
        plasma: { outer:'#251831', middle:'#592a75', core:'#c084fc', texture:'#f0abfc', kind:'plasma' },
        acid: { outer:'#1f2c16', middle:'#3f6212', core:'#84cc16', texture:'#d9f99d', kind:'acid' }
    };
    return palettes[key] || palettes.fire;
}

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
function drawElementalResiduesV6308(targetCtx, effectFields = []) {
    const fields = Array.isArray(effectFields) ? effectFields : [];
    if (!targetCtx || !fields.length) return 0;

    // Cada elemento posee su propio mapa de celdas y, por tanto, sus propios
    // componentes conectados. Nunca se promedian paletas distintas en una celda.
    const mapsByElement = new Map();
    const keyOf = (x, y) => `${x},${y}`;
    for (const field of fields) {
        if (!field || !(Number(field.remainingMs) > 0)) continue;
        if (field.sourceBombId == null && !['bomb', 'combination'].includes(String(field.source || ''))) continue;
        const x = Math.trunc(Number(field.x)), y = Math.trunc(Number(field.y));
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const total = Math.max(1, Number(field.visualTotalMs) || Number(window.getBombEffectConfigV64?.(field.effectId)?.durationMs) || Number(field.remainingMs));
        const age = Math.max(0, Number.isFinite(Number(field.visualAgeMs)) ? Number(field.visualAgeMs) : total - Number(field.remainingMs));
        const reveal = Math.max(0, Math.min(1, (age - 250) / 100));
        if (reveal <= 0) continue;
        const fade = Number(field.remainingMs) < 500 ? Math.max(0, Number(field.remainingMs) / 500) : 1;
        const alpha = reveal * fade * Math.max(0.1, Math.min(1.5, Number(field.intensity) || 1));
        if (alpha <= 0) continue;

        const element = getExplosionEffectKeyV6308(String(field.effectId || 'heat').toLowerCase());
        let elementMap = mapsByElement.get(element);
        if (!elementMap) {
            elementMap = new Map();
            mapsByElement.set(element, elementMap);
        }
        const key = keyOf(x, y);
        let cell = elementMap.get(key);
        if (!cell) {
            cell = { x, y, alpha: 0, element, palette: residuePaletteV6308(element) };
            elementMap.set(key, cell);
        }
        // Múltiples fuentes del mismo elemento no promedian intensidad ni color.
        cell.alpha = Math.max(cell.alpha, alpha);
    }
    if (!mapsByElement.size) return 0;

    const componentsForElement = [...mapsByElement.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([element, cellMap]) => ({ element, cellMap, components: explosionComponentsV6308(cellMap) }));
    const visibleGroups = componentsForElement.filter(group => group.components.length);
    if (!visibleGroups.length) return 0;

    const size = TILE_SIZE;
    const center = cell => ({ x: (cell.x + 0.5) * size, y: (cell.y + 0.5) * size });
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    for (const group of visibleGroups) {
        const palette = residuePaletteV6308(group.element);
        for (const component of group.components) {
            const { paths } = explosionGraphPathsV6308(component);
            const alpha = Math.min(1, component.reduce((sum, cell) => sum + cell.alpha, 0) / component.length);
            if (alpha <= 0) continue;

            // Base oscura integrada en el terreno; sin contornos cuadrados.
            targetCtx.globalAlpha = 0.20 * alpha;
            targetCtx.strokeStyle = '#171923';
            targetCtx.lineWidth = size * 0.52;
            targetCtx.beginPath();
            for (const path of paths) {
                if (!path.points.length) continue;
                let point = center(path.points[0]);
                targetCtx.moveTo(point.x, point.y);
                for (let i = 1; i < path.points.length; i++) {
                    point = center(path.points[i]);
                    targetCtx.lineTo(point.x, point.y);
                }
            }
            targetCtx.stroke();

            // Cada componente conserva una sola paleta elemental. No hay
            // gradientes entre casillas ni promedios de colores incompatibles.
            for (const path of paths) {
                if (path.points.length < 2) continue;
                targetCtx.beginPath();
                let point = center(path.points[0]);
                targetCtx.moveTo(point.x, point.y);
                for (let i = 1; i < path.points.length; i++) {
                    point = center(path.points[i]);
                    targetCtx.lineTo(point.x, point.y);
                }
                targetCtx.globalAlpha = 0.24 * alpha;
                targetCtx.strokeStyle = palette.middle;
                targetCtx.lineWidth = size * 0.24;
                targetCtx.stroke();

                targetCtx.globalAlpha = 0.20 * alpha;
                targetCtx.strokeStyle = palette.core;
                targetCtx.lineWidth = Math.max(1, size * 0.028);
                targetCtx.stroke();
            }

            // Textura propia del elemento, dibujada dentro del mismo grupo.
            for (const cell of component) {
                if (((cell.x * 7 + cell.y * 11) & 1) !== 0) continue;
                const p = center(cell), kind = palette.kind;
                targetCtx.save();
                targetCtx.globalAlpha = 0.26 * alpha;
                targetCtx.strokeStyle = palette.texture;
                targetCtx.lineWidth = Math.max(1, size * 0.035);
                targetCtx.lineCap = 'round';
                targetCtx.lineJoin = 'round';
                targetCtx.beginPath();
                if (kind === 'ice') {
                    targetCtx.moveTo(p.x - size * 0.16, p.y - size * 0.08);
                    targetCtx.lineTo(p.x - size * 0.03, p.y + size * 0.01);
                    targetCtx.lineTo(p.x + size * 0.02, p.y + size * 0.12);
                    targetCtx.moveTo(p.x - size * 0.03, p.y + size * 0.01);
                    targetCtx.lineTo(p.x + size * 0.09, p.y - size * 0.08);
                } else if (kind === 'electric') {
                    targetCtx.moveTo(p.x - size * 0.12, p.y - size * 0.08);
                    targetCtx.lineTo(p.x + size * 0.015, p.y - size * 0.015);
                    targetCtx.lineTo(p.x - size * 0.035, p.y + size * 0.06);
                    targetCtx.lineTo(p.x + size * 0.12, p.y + size * 0.09);
                } else if (kind === 'plasma') {
                    targetCtx.moveTo(p.x - size * 0.13, p.y + size * 0.04);
                    targetCtx.lineTo(p.x - size * 0.025, p.y - size * 0.07);
                    targetCtx.lineTo(p.x + size * 0.04, p.y + size * 0.02);
                    targetCtx.lineTo(p.x + size * 0.14, p.y - size * 0.045);
                } else if (kind === 'burn') {
                    targetCtx.moveTo(p.x - size * 0.14, p.y + size * 0.04);
                    targetCtx.lineTo(p.x - size * 0.035, p.y - size * 0.035);
                    targetCtx.lineTo(p.x + size * 0.04, p.y + size * 0.07);
                    targetCtx.lineTo(p.x + size * 0.14, p.y - size * 0.045);
                } else if (kind === 'acid') {
                    targetCtx.moveTo(p.x - size * 0.12, p.y - size * 0.04);
                    targetCtx.lineTo(p.x - size * 0.02, p.y + size * 0.04);
                    targetCtx.lineTo(p.x + size * 0.1, p.y - size * 0.025);
                } else {
                    targetCtx.moveTo(p.x - size * 0.12, p.y + size * 0.035);
                    targetCtx.quadraticCurveTo(p.x, p.y - size * 0.08, p.x + size * 0.12, p.y - size * 0.015);
                }
                targetCtx.stroke();
                targetCtx.restore();
            }
        }
    }

    targetCtx.restore();
    targetCtx.globalAlpha = 1;
    return visibleGroups.reduce((sum, group) => sum + group.cellMap.size, 0);
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

window.registerBombBlastVisualV6308 = registerBombBlastVisualV6308;
window.updateBombBlastVisualsV6308 = updateBombBlastVisualsV6308;
window.resetBombBlastVisualsV6308 = resetBombBlastVisualsV6308;
window.drawElementalResiduesV6308 = drawElementalResiduesV6308;

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
            if (typeof drawElementalResiduesV6308 === 'function') drawElementalResiduesV6308(ctx, gameState.bombEffectFieldsV64);

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
