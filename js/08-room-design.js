// Bomberman Roguelike v3.22 — Spatial room design and procedural room topologies

const roomDesignV313 = {
    rooms: [],
    riskCells: new Set(),
    combatCells: new Set(),
    treasureCells: new Set(),
    secretCells: new Set(),
    secretInterior: new Set(),
    exitGate: null,
    secretRoom: null,
    version: '4.5.2',
    layoutVariant: 'corridors',
    layoutMetrics: null
};






















// v3.22: procedural room topology layer.
const ROOM_LAYOUTS_V322 = Object.freeze([
    'corridors',
    'intersection',
    'small-chambers',
    'large-chamber',
    'open-zone',
    'dead-end'
]);
























// v4.4.0 — Dungeon generator: pre-established Bomberman-like hard-wall glyphs
// + high-variance destructible blocks. The glyph is structural, not a HUD label.
const BOMBERMAN_DUNGEON_V44 = Object.freeze({
    version: '4.5.2',
    digitWidth: 7,
    digitHeight: 9,
    maxNormalEnemies: 12,
    blockDensityMin: 0.58,
    blockDensityMax: 0.82,
    // 7×9 pixel-style wall glyphs. 1-cell wall thickness keeps navigation readable.
    glyphs: Object.freeze({
        0: Object.freeze(['0111110','1100011','1100011','1100011','1100011','1100011','1100011','1100011','0111110']),
        1: Object.freeze(['0011000','0111000','0011000','0011000','0011000','0011000','0011000','0011000','1111111']),
        2: Object.freeze(['0111110','1100011','0000011','0000110','0011000','0110000','1100000','1100011','1111111']),
        3: Object.freeze(['0111110','1100011','0000011','0001110','0000011','0000011','1100011','1100011','0111110']),
        4: Object.freeze(['0001110','0011110','0110110','1100110','1100110','1111111','0000110','0000110','0001111']),
        5: Object.freeze(['1111111','1100000','1100000','1111110','0000011','0000011','0000011','1100011','0111110']),
        6: Object.freeze(['0011110','0110000','1100000','1100000','1111110','1100011','1100011','1100011','0111110']),
        7: Object.freeze(['1111111','0000011','0000110','0000110','0001100','0001100','0011000','0011000','0011000']),
        8: Object.freeze(['0111110','1100011','1100011','0111110','1100011','1100011','1100011','1100011','0111110']),
        9: Object.freeze(['0111110','1100011','1100011','1100011','0111111','0000011','0000011','0000110','0111100'])
    })
});



function getDungeonEnemyCountV44(level = 1) {
    const depth = Math.max(1, Math.floor(Number(level) || 1));
    // Level 1 = 4, level 2 = 5, ... capped to protect small/older devices.
    return Math.min(BOMBERMAN_DUNGEON_V44.maxNormalEnemies, 3 + depth);
}






























function drawRoomDesignLayerV313() {
    const design = gameState.roomDesign;
    if (!design?.rooms?.length) return;

    for (const room of design.rooms) {
        if (room.role === 'goal') continue;
        const isSecret = room.role === 'secret';
        if (isSecret && design.secretRoom && gameState.grid[design.secretRoom.entrance.y]?.[design.secretRoom.entrance.x] !== TYPES.EMPTY) continue;

        ctx.save();
        ctx.globalAlpha = 0.055;
        ctx.fillStyle = room.color || '#ffffff';
        ctx.fillRect(room.x * TILE_SIZE, room.y * TILE_SIZE, room.w * TILE_SIZE, room.h * TILE_SIZE);
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = room.color || '#ffffff';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'center';
        const label = room.icon || '';
        if (label) ctx.fillText(label, (room.x + room.w / 2) * TILE_SIZE, (room.y + room.h / 2) * TILE_SIZE + 3);
        ctx.restore();
    }

    // Riesgo distribuido en pasillos: apenas visible, nunca como una marca que revele una trampa concreta.
    if (design.riskCells.size) {
        ctx.save();
        ctx.globalAlpha = 0.035;
        ctx.fillStyle = '#f97316';
        for (const key of design.riskCells) {
            const [x, y] = key.split(',').map(Number);
            ctx.fillRect(x * TILE_SIZE + 3, y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        }
        ctx.restore();
    }

    if (design.secretRoom && gameState.grid[design.secretRoom.entrance.y]?.[design.secretRoom.entrance.x] === TYPES.EMPTY) {
        const r = design.secretRoom;
        ctx.save();
        ctx.strokeStyle = 'rgba(167,139,250,.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x * TILE_SIZE + 4, r.y * TILE_SIZE + 4, r.w * TILE_SIZE - 8, r.h * TILE_SIZE - 8);
        ctx.fillStyle = 'rgba(167,139,250,.75)';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('?', (r.x + r.w / 2) * TILE_SIZE, (r.y + r.h / 2) * TILE_SIZE + 3);
        ctx.restore();
    }
}

// v4.4.0 — Exit gate is unlocked only after every normal-room enemy is dead.
function tryUnlockExitV44() {
    const dungeon = gameState?.dungeonV44;
    if (!dungeon?.fixedEnemyCount || gameState.roomType?.id === 'BOSS') return false;
    if (dungeon.exitUnlocked) return true;
    if (Array.isArray(gameState.enemies) && gameState.enemies.length > 0) return false;
    if (!gameState.exitPos) return false;

    const { x, y } = gameState.exitPos;
    if (!gameState.grid[y]) return false;
    gameState.grid[y][x] = TYPES.EXIT_OPEN;
    dungeon.exitUnlocked = true;
    gameState.gridRevision = (gameState.gridRevision || 0) + 1;
    if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
    if (typeof sfx === 'function') sfx('exit');
    if (typeof addFloatingText === 'function') addFloatingText('🚪 SALIDA DESBLOQUEADA', (x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE, '#facc15');
    return true;
}
