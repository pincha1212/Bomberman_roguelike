// Bomberman Roguelike v3.13 — Spatial room design and procedural layout accents

const roomDesignV313 = {
    rooms: [],
    riskCells: new Set(),
    combatCells: new Set(),
    treasureCells: new Set(),
    secretCells: new Set(),
    secretInterior: new Set(),
    exitGate: null,
    secretRoom: null,
    version: 1
};

function roomKeyV313(x, y) {
    return `${x},${y}`;
}

function clampRoomPointV313(x, y) {
    return {
        x: Math.max(1, Math.min(gameState.gridWidth - 2, Math.round(x))),
        y: Math.max(1, Math.min(gameState.gridHeight - 2, Math.round(y)))
    };
}

function carveCellV313(x, y) {
    if (x <= 0 || y <= 0 || x >= gameState.gridWidth - 1 || y >= gameState.gridHeight - 1) return false;
    gameState.grid[y][x] = TYPES.EMPTY;
    return true;
}

function carveRectV313(cx, cy, width, height, role, color, label, icon) {
    const x0 = Math.max(1, Math.floor(cx - width / 2));
    const y0 = Math.max(1, Math.floor(cy - height / 2));
    const x1 = Math.min(gameState.gridWidth - 2, x0 + width - 1);
    const y1 = Math.min(gameState.gridHeight - 2, y0 + height - 1);
    const room = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, role, color, label, icon };

    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            carveCellV313(x, y);
            const key = roomKeyV313(x, y);
            if (role === 'risk') roomDesignV313.riskCells.add(key);
            if (role === 'combat' || role === 'elite') roomDesignV313.combatCells.add(key);
            if (role === 'treasure') roomDesignV313.treasureCells.add(key);
        }
    }

    roomDesignV313.rooms.push(room);
    return room;
}

function carveCorridorV313(a, b, width = 1) {
    const from = clampRoomPointV313(a.x, a.y);
    const to = clampRoomPointV313(b.x, b.y);
    const horizontalFirst = (from.x + from.y + to.x + to.y + gameState.level) % 2 === 0;
    const points = horizontalFirst
        ? [{ x: from.x, y: from.y }, { x: to.x, y: from.y }, { x: to.x, y: to.y }]
        : [{ x: from.x, y: from.y }, { x: from.x, y: to.y }, { x: to.x, y: to.y }];

    for (let p = 0; p < points.length - 1; p++) {
        const s = points[p];
        const e = points[p + 1];
        const dx = Math.sign(e.x - s.x);
        const dy = Math.sign(e.y - s.y);
        let x = s.x, y = s.y;
        const guard = gameState.gridWidth * gameState.gridHeight + 20;
        let steps = 0;
        while ((x !== e.x || y !== e.y) && steps++ < guard) {
            for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
                for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) {
                    carveCellV313(x + ox, y + oy);
                }
            }
            if (x !== e.x) x += dx;
            else if (y !== e.y) y += dy;
        }
        for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
            for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) carveCellV313(e.x + ox, e.y + oy);
        }
    }
}

function addRiskCorridorV313(points, width = 1) {
    for (let i = 0; i < points.length - 1; i++) {
        carveCorridorV313(points[i], points[i + 1], width);
        const a = points[i], b = points[i + 1];
        let x = a.x, y = a.y;
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        const guard = gameState.gridWidth * gameState.gridHeight + 20;
        let steps = 0;
        while ((x !== b.x || y !== b.y) && steps++ < guard) {
            roomDesignV313.riskCells.add(roomKeyV313(x, y));
            if (x !== b.x) x += dx;
            else if (y !== b.y) y += dy;
        }
        roomDesignV313.riskCells.add(roomKeyV313(b.x, b.y));
    }
}

function findEmptyRoomCellV313(set, fallback) {
    const values = Array.from(set);
    for (let i = values.length - 1; i >= 0; i--) {
        const [x, y] = values[i].split(',').map(Number);
        if (gameState.grid[y]?.[x] === TYPES.EMPTY) return { x, y };
    }
    return fallback;
}

function createSecretRoomV313() {
    const rightSide = gameState.level % 2 === 1;
    const width = 4;
    const height = 4;
    const sx = rightSide ? Math.max(7, gameState.gridWidth - 6) : 3;
    const sy = rightSide ? 2 : Math.max(2, gameState.gridHeight - 6);
    const x0 = Math.min(gameState.gridWidth - width - 1, Math.max(1, sx));
    const y0 = Math.min(gameState.gridHeight - height - 1, Math.max(1, sy));

    // Chamber interior.
    for (let y = y0 + 1; y <= y0 + height - 2; y++) {
        for (let x = x0 + 1; x <= x0 + width - 2; x++) {
            carveCellV313(x, y);
            roomDesignV313.secretInterior.add(roomKeyV313(x, y));
            roomDesignV313.secretCells.add(roomKeyV313(x, y));
        }
    }

    // Destructible shell with one hidden entrance.
    for (let y = y0; y <= y0 + height - 1; y++) {
        for (let x = x0; x <= x0 + width - 1; x++) {
            gameState.grid[y][x] = TYPES.BLOCK;
        }
    }

    const entrance = rightSide
        ? { x: x0, y: y0 + 2 }
        : { x: x0 + width - 1, y: y0 + 1 };
    gameState.grid[entrance.y][entrance.x] = TYPES.BLOCK;
    roomDesignV313.secretCells.add(roomKeyV313(entrance.x, entrance.y));

    // Reach the secret entrance from the designed network, but keep the gate intact.
    const approach = rightSide
        ? { x: entrance.x - 1, y: entrance.y }
        : { x: entrance.x + 1, y: entrance.y };
    carveCorridorV313(approach, entrance, 1);
    gameState.grid[entrance.y][entrance.x] = TYPES.BLOCK;

    roomDesignV313.secretRoom = {
        x: x0, y: y0, w: width, h: height,
        entrance,
        color: '#a78bfa',
        label: 'SECRETA',
        icon: '?'
    };
}

function buildStandardRoomLayoutV313() {
    const w = gameState.gridWidth;
    const h = gameState.gridHeight;
    const start = { x: 2, y: 2 };
    const combat = { x: Math.max(5, Math.floor(w * 0.38)), y: Math.max(4, Math.floor(h * 0.38)) };
    const risk = { x: Math.max(8, Math.floor(w * 0.66)), y: Math.max(6, Math.floor(h * 0.48)) };
    const treasure = { x: Math.max(4, Math.floor(w * 0.32)), y: Math.min(h - 4, Math.floor(h * 0.72)) };
    const goal = { x: w - 3, y: h - 3 };

    carveRectV313(start.x, start.y, 4, 4, 'start', '#38bdf8', 'ENTRADA', 'E');
    const combatRoom = carveRectV313(combat.x, combat.y, 6, 5, gameState.roomType.id === 'ELITE' ? 'elite' : 'combat', gameState.roomType.id === 'ELITE' ? '#fb7185' : '#60a5fa', 'COMBATE', 'C');
    const riskRoom = carveRectV313(risk.x, risk.y, gameState.roomType.id === 'CURSED' ? 4 : 3, gameState.roomType.id === 'CURSED' ? 6 : 5, 'risk', '#f59e0b', 'RIESGO', '!');
    const treasureRoom = carveRectV313(treasure.x, treasure.y, gameState.roomType.id === 'TREASURE' ? 6 : 4, gameState.roomType.id === 'TREASURE' ? 5 : 4, 'treasure', '#fbbf24', 'TESORO', '$');
    const goalRoom = carveRectV313(goal.x, goal.y, 4, 4, 'goal', '#facc15', 'SALIDA', 'G');

    carveCorridorV313(start, { x: combatRoom.x, y: combat.y }, 1);
    carveCorridorV313({ x: combatRoom.x + combatRoom.w - 1, y: combat.y }, risk, 1);
    carveCorridorV313(risk, { x: goalRoom.x, y: goal.y }, 1);
    carveCorridorV313({ x: combatRoom.x, y: combatRoom.y + combatRoom.h - 1 }, treasure, 1);
    carveCorridorV313(treasure, { x: goalRoom.x, y: goalRoom.y + goalRoom.h - 1 }, 1);

    // Loop: two routes between the combat sector and the goal sector.
    const loopA = { x: Math.min(w - 4, combat.x + 1), y: Math.max(2, Math.floor(h * 0.18)) };
    const loopB = { x: Math.min(w - 4, Math.floor(w * 0.70)), y: Math.max(2, Math.floor(h * 0.18)) };
    carveCorridorV313(loopA, loopB, 1);
    carveCorridorV313(loopA, { x: combatRoom.x + 1, y: combatRoom.y }, 1);
    carveCorridorV313(loopB, { x: riskRoom.x + 1, y: riskRoom.y }, 1);

    if (gameState.roomType.id === 'CURSED') {
        addRiskCorridorV313([
            { x: riskRoom.x, y: riskRoom.y },
            { x: Math.min(w - 3, riskRoom.x + 3), y: riskRoom.y + riskRoom.h - 1 }
        ], 1);
        const risk2 = carveRectV313(Math.max(5, Math.floor(w * 0.55)), Math.min(h - 4, Math.floor(h * 0.70)), 3, 3, 'risk', '#f97316', 'RIESGO 2', '!');
        addRiskCorridorV313([{ x: riskRoom.x + 1, y: riskRoom.y + riskRoom.h - 1 }, { x: risk2.x + 1, y: risk2.y }], 1);
    }

    if (gameState.roomType.id === 'SHRINE') {
        const shrineRoom = carveRectV313(Math.max(4, Math.floor(w * 0.22)), Math.max(5, Math.floor(h * 0.46)), 5, 5, 'shrine', '#67e8f9', 'SANTUARIO', '+');
        carveCorridorV313({ x: start.x + 2, y: start.y + 3 }, { x: shrineRoom.x + 1, y: shrineRoom.y }, 1);
    }

    roomDesignV313.exitGate = { x: goal.x, y: goal.y };
}

function buildBossRoomLayoutV313() {
    const w = gameState.gridWidth;
    const h = gameState.gridHeight;
    const start = { x: 2, y: 2 };
    const center = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
    const startRoom = carveRectV313(start.x, start.y, 4, 4, 'start', '#38bdf8', 'ENTRADA', 'E');
    const arena = carveRectV313(center.x, center.y, 8, 8, 'combat', '#f43f5e', 'ARENA', 'B');
    const risk = carveRectV313(Math.max(5, Math.floor(w * 0.76)), Math.floor(h * 0.48), 3, 7, 'risk', '#f97316', 'CORREDOR DE RIESGO', '!');
    carveCorridorV313({ x: startRoom.x + startRoom.w - 1, y: start.y + 1 }, { x: arena.x, y: center.y }, 1);
    carveCorridorV313(center, { x: risk.x, y: risk.y + 2 }, 1);
    carveCorridorV313({ x: risk.x, y: risk.y + risk.h - 1 }, { x: w - 3, y: h - 3 }, 1);
    carveCorridorV313({ x: arena.x + arena.w - 1, y: arena.y + arena.h - 2 }, { x: w - 3, y: h - 3 }, 1);
    roomDesignV313.exitGate = { x: w - 3, y: h - 3 };
}

function applyRoomDesignV313() {
    roomDesignV313.rooms = [];
    roomDesignV313.riskCells.clear();
    roomDesignV313.combatCells.clear();
    roomDesignV313.treasureCells.clear();
    roomDesignV313.secretCells.clear();
    roomDesignV313.secretInterior.clear();
    roomDesignV313.exitGate = null;
    roomDesignV313.secretRoom = null;
    gameState.roomDesign = roomDesignV313;

    if (gameState.roomType.id === 'BOSS') buildBossRoomLayoutV313();
    else buildStandardRoomLayoutV313();

    createSecretRoomV313();
}

function chooseRoomDesignItemCellV313(set, used) {
    const candidates = Array.from(set);
    for (let i = candidates.length - 1; i >= 0; i--) {
        const [x, y] = candidates[i].split(',').map(Number);
        if (gameState.grid[y]?.[x] !== TYPES.EMPTY) continue;
        const key = roomKeyV313(x, y);
        if (used.has(key) || roomDesignV313.secretInterior.has(key)) continue;
        used.add(key);
        return { x, y };
    }
    return null;
}

function placeRoomDesignItemsV313() {
    if (!gameState.roomDesign) return;
    const used = new Set(gameState.items.map(it => roomKeyV313(it.x, it.y)));

    if (gameState.roomType.id === 'TREASURE') {
        const treasure = chooseRoomDesignItemCellV313(gameState.roomDesign.treasureCells, used);
        if (treasure) gameState.items.push({ x: treasure.x, y: treasure.y, type: POWERUPS.BOMB_UP });
    }

    const secret = chooseRoomDesignItemCellV313(gameState.roomDesign.secretInterior, used);
    if (secret) gameState.items.push({ x: secret.x, y: secret.y, type: POWERUPS.FIRE_UP });
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
