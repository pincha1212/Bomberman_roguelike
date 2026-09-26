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


// v3.22: procedural room topology layer.
const ROOM_LAYOUTS_V322 = Object.freeze([
    'corridors',
    'intersection',
    'small-chambers',
    'large-chamber',
    'open-zone',
    'dead-end'
]);

function roomNeighborCountV322(x, y) {
    let count = 0;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dy] of dirs) {
        if (gameState.grid[y + dy]?.[x + dx] === TYPES.EMPTY) count++;
    }
    return count;
}

function collectRoomTopologyV322(start, goal) {
    const w = gameState.gridWidth;
    const h = gameState.gridHeight;
    const queue = [{x:start.x, y:start.y}];
    const seen = new Set([roomKeyV313(start.x, start.y)]);
    const prev = new Map();
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    let head = 0;
    let junctions = 0;
    let deadEnds = 0;

    while (head < queue.length) {
        const p = queue[head++];
        let degree = 0;
        for (const [dx, dy] of dirs) {
            const nx = p.x + dx, ny = p.y + dy;
            if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) continue;
            if (gameState.grid[ny]?.[nx] !== TYPES.EMPTY) continue;
            degree++;
            const key = roomKeyV313(nx, ny);
            if (!seen.has(key)) {
                seen.add(key);
                prev.set(key, roomKeyV313(p.x, p.y));
                queue.push({x:nx, y:ny});
            }
        }
        if (degree >= 3) junctions++;
        if (degree === 1 && !(p.x === start.x && p.y === start.y)) deadEnds++;
    }

    const goalKey = roomKeyV313(goal.x, goal.y);
    const route = [];
    if (seen.has(goalKey)) {
        let cur = goalKey;
        route.push(cur);
        while (cur !== roomKeyV313(start.x, start.y)) {
            cur = prev.get(cur);
            if (!cur) { route.length = 0; break; }
            route.push(cur);
        }
        route.reverse();
    }

    return {
        reachable: seen.size,
        routeLength: route.length,
        junctions,
        deadEnds,
        route
    };
}

function carveGuaranteedRouteV322(start, goal) {
    const from = clampRoomPointV313(start.x, start.y);
    const to = clampRoomPointV313(goal.x, goal.y);
    let x = from.x;
    let y = from.y;
    carveCellV313(x, y);
    const horizontalFirst = (gameState.level + from.x + to.y) % 2 === 0;
    const segments = horizontalFirst
        ? [{x:to.x, y:from.y}, {x:to.x, y:to.y}]
        : [{x:from.x, y:to.y}, {x:to.x, y:to.y}];

    for (const segment of segments) {
        while (x !== segment.x || y !== segment.y) {
            if (x !== segment.x) x += Math.sign(segment.x - x);
            else if (y !== segment.y) y += Math.sign(segment.y - y);
            carveCellV313(x, y);
        }
    }
    return {x, y};
}

function chooseRoomLayoutV322() {
    const forced = typeof window !== 'undefined' ? window.FORCE_ROOM_LAYOUT_V322 : null;
    if (forced && ROOM_LAYOUTS_V322.includes(forced)) return forced;
    const index = Math.floor(Math.random() * ROOM_LAYOUTS_V322.length);
    return ROOM_LAYOUTS_V322[index];
}

function buildCorridorLayoutV322() {
    const w = gameState.gridWidth, h = gameState.gridHeight;
    const start = {x:2,y:2}, goal = {x:w-3,y:h-3};
    const a = {x:Math.max(4,Math.floor(w*0.32)), y:2};
    const b = {x:Math.max(4,Math.floor(w*0.52)), y:Math.floor(h*0.68)};
    const c = {x:w-3, y:Math.max(4,Math.floor(h*0.40))};
    const d = {x:Math.floor(w*0.34), y:h-3};
    carveRectV313(start.x,start.y,3,3,'start','#38bdf8','ENTRADA','E');
    const r1 = carveRectV313(a.x,a.y,4,3,'combat','#60a5fa','COMBATE','C');
    const r2 = carveRectV313(b.x,b.y,4,4,'risk','#f59e0b','RIESGO','!');
    const r3 = carveRectV313(c.x,c.y,4,4,'treasure','#fbbf24','TESORO','$');
    const r4 = carveRectV313(d.x,d.y,4,3,'combat','#60a5fa','COMBATE','C');
    carveCorridorV313(start,a,1);
    carveCorridorV313({x:r1.x+r1.w-1,y:a.y},b,1);
    carveCorridorV313(b,c,1);
    carveCorridorV313(b,d,1);
    carveCorridorV313(d,goal,1);
    carveCorridorV313(c,goal,1);
    carveCorridorV313({x:Math.floor(w*0.52),y:2},{x:Math.floor(w*0.78),y:Math.floor(h*0.22)},1);
    carveCorridorV313({x:Math.floor(w*0.78),y:Math.floor(h*0.22)},c,1);
    roomDesignV313.exitGate = goal;
    return {start, goal, rooms:[r1,r2,r3,r4]};
}

function buildIntersectionLayoutV322() {
    const w = gameState.gridWidth, h = gameState.gridHeight;
    const start = {x:2,y:2}, goal = {x:w-3,y:h-3};
    const center = {x:Math.floor(w/2), y:Math.floor(h/2)};
    const north = {x:center.x,y:2}, west = {x:2,y:center.y}, east = {x:w-3,y:center.y}, south = {x:center.x,y:h-3};
    carveRectV313(start.x,start.y,3,3,'start','#38bdf8','ENTRADA','E');
    const cr = carveRectV313(center.x,center.y,7,7,'combat','#60a5fa','INTERSECCIÓN','+');
    const rooms = [
        carveRectV313(north.x,north.y,4,4,'combat','#60a5fa','NORTE','N'),
        carveRectV313(west.x,west.y,4,4,'risk','#f59e0b','OESTE','W'),
        carveRectV313(east.x,east.y,4,4,'treasure','#fbbf24','ESTE','T'),
        carveRectV313(south.x,south.y,4,4,'combat','#60a5fa','SUR','S'),
        cr
    ];
    carveCorridorV313(start, west,1);
    carveCorridorV313(west, center,1);
    carveCorridorV313(center, north,1);
    carveCorridorV313(center, east,1);
    carveCorridorV313(center, south,1);
    carveCorridorV313(south, goal,1);
    carveCorridorV313(east, goal,1);
    roomDesignV313.exitGate = goal;
    return {start,goal,rooms};
}

function buildSmallChambersLayoutV322() {
    const w=gameState.gridWidth,h=gameState.gridHeight;
    const start={x:2,y:2}, goal={x:w-3,y:h-3};
    const points=[
        {x:3,y:3,role:'start',label:'ENTRADA',icon:'E'},
        {x:6,y:4,role:'combat',label:'CÁMARA 1',icon:'1'},
        {x:10,y:4,role:'risk',label:'CÁMARA 2',icon:'2'},
        {x:13,y:7,role:'treasure',label:'CÁMARA 3',icon:'3'},
        {x:9,y:10,role:'combat',label:'CÁMARA 4',icon:'4'},
        {x:5,y:12,role:'risk',label:'CÁMARA 5',icon:'5'},
        {x:w-3,y:h-3,role:'goal',label:'SALIDA',icon:'G'}
    ];
    const rooms=[];
    for (const p of points) rooms.push(carveRectV313(p.x,p.y,p.role==='start'||p.role==='goal'?4:5,p.role==='start'||p.role==='goal'?4:4,p.role,p.role==='risk'?'#f59e0b':p.role==='treasure'?'#fbbf24':p.role==='combat'?'#60a5fa':'#facc15',p.label,p.icon));
    for(let i=0;i<points.length-1;i++) carveCorridorV313(points[i],points[i+1],1);
    // One alternate connection creates loops without making the map open everywhere.
    carveCorridorV313(points[1],points[4],1);
    carveCorridorV313(points[2],points[5],1);
    roomDesignV313.exitGate=goal;
    return {start,goal,rooms};
}

function buildLargeChamberLayoutV322() {
    const w=gameState.gridWidth,h=gameState.gridHeight;
    const start={x:2,y:2}, goal={x:w-3,y:h-3};
    const center={x:Math.floor(w/2),y:Math.floor(h/2)};
    const rooms=[];
    carveRectV313(start.x,start.y,4,4,'start','#38bdf8','ENTRADA','E');
    rooms.push(carveRectV313(center.x,center.y,9,7,'combat','#60a5fa','CÁMARA GRANDE','A'));
    rooms.push(carveRectV313(Math.floor(w*0.78),Math.floor(h*0.25),5,4,'treasure','#fbbf24','TESORO','$'));
    rooms.push(carveRectV313(Math.floor(w*0.25),Math.floor(h*0.72),5,4,'risk','#f59e0b','RIESGO','!'));
    carveCorridorV313(start,{x:center.x-4,y:center.y},1);
    carveCorridorV313({x:center.x+4,y:center.y},goal,1);
    carveCorridorV313({x:center.x+3,y:center.y-2},{x:Math.floor(w*0.78),y:Math.floor(h*0.25)},1);
    carveCorridorV313({x:center.x-3,y:center.y+2},{x:Math.floor(w*0.25),y:Math.floor(h*0.72)},1);
    // Side access around the main chamber.
    carveCorridorV313({x:center.x,y:center.y-3},{x:center.x,y:2},1);
    carveCorridorV313({x:center.x,y:center.y+3},{x:center.x,y:h-3},1);
    roomDesignV313.exitGate=goal;
    return {start,goal,rooms};
}

function buildOpenZoneLayoutV322() {
    const w=gameState.gridWidth,h=gameState.gridHeight;
    const start={x:2,y:2}, goal={x:w-3,y:h-3};
    const zone={x:Math.floor(w/2),y:Math.floor(h/2)};
    carveRectV313(start.x,start.y,4,4,'start','#38bdf8','ENTRADA','E');
    const openRoom=carveRectV313(zone.x,zone.y,Math.min(10,w-6),Math.min(9,h-6),'combat','#60a5fa','ZONA ABIERTA','O');
    carveCorridorV313(start,{x:openRoom.x,y:zone.y},1);
    carveCorridorV313({x:openRoom.x+openRoom.w-1,y:zone.y},goal,1);
    // Sparse internal pillars: always leave the central cross and perimeter circulation open.
    const pillarCandidates=[
        {x:zone.x-2,y:zone.y-2},{x:zone.x+2,y:zone.y-2},
        {x:zone.x-2,y:zone.y+2},{x:zone.x+2,y:zone.y+2}
    ];
    for(const q of pillarCandidates){
        if(q.x>openRoom.x+1&&q.x<openRoom.x+openRoom.w-2&&q.y>openRoom.y+1&&q.y<openRoom.y+openRoom.h-2) gameState.grid[q.y][q.x]=TYPES.WALL;
    }
    carveRectV313(Math.min(w-4,zone.x+3),Math.max(3,zone.y-3),3,3,'treasure','#fbbf24','PUESTO','$');
    roomDesignV313.exitGate=goal;
    return {start,goal,rooms:[openRoom]};
}

function buildDeadEndLayoutV322() {
    const w=gameState.gridWidth,h=gameState.gridHeight;
    const start={x:2,y:2}, goal={x:w-3,y:h-3};
    const spine={x:Math.floor(w*0.45),y:Math.floor(h*0.50)};
    const north={x:spine.x,y:2}, west={x:2,y:spine.y}, east={x:w-3,y:spine.y}, south={x:spine.x,y:h-3};
    carveRectV313(start.x,start.y,4,4,'start','#38bdf8','ENTRADA','E');
    const rooms=[
        carveRectV313(north.x,north.y,4,4,'risk','#f59e0b','CALLEJÓN N','N'),
        carveRectV313(west.x,west.y,4,4,'combat','#60a5fa','CALLEJÓN O','O'),
        carveRectV313(east.x,east.y,4,4,'treasure','#fbbf24','CALLEJÓN E','E'),
        carveRectV313(south.x,south.y,4,4,'combat','#60a5fa','SALIDA SUR','S')
    ];
    carveCorridorV313(start,spine,1);
    carveCorridorV313(spine,east,1);
    carveCorridorV313(spine,south,1);
    carveCorridorV313(spine,north,1);
    carveCorridorV313(spine,west,1);
    // Keep the final approach to goal distinct from the dead-end branches.
    carveCorridorV313(east,goal,1);
    roomDesignV313.exitGate=goal;
    return {start,goal,rooms};
}

function buildProceduralRoomLayoutV322() {
    const variant = chooseRoomLayoutV322();
    let built;
    switch (variant) {
        case 'intersection': built = buildIntersectionLayoutV322(); break;
        case 'small-chambers': built = buildSmallChambersLayoutV322(); break;
        case 'large-chamber': built = buildLargeChamberLayoutV322(); break;
        case 'open-zone': built = buildOpenZoneLayoutV322(); break;
        case 'dead-end': built = buildDeadEndLayoutV322(); break;
        case 'corridors':
        default: built = buildCorridorLayoutV322(); break;
    }
    const beforeRepair = collectRoomTopologyV322(built.start, built.goal);
    let repairApplied = false;
    if (!beforeRepair.routeLength) {
        carveGuaranteedRouteV322(built.start, built.goal);
        repairApplied = true;
    }
    const topology = collectRoomTopologyV322(built.start, built.goal);
    roomDesignV313.layoutVariant = variant;
    roomDesignV313.layoutMetrics = {
        variant,
        rooms: roomDesignV313.rooms.length,
        reachableTiles: topology.reachable,
        routeLength: Math.max(0, topology.routeLength - 1),
        junctions: topology.junctions,
        deadEnds: topology.deadEnds,
        repairApplied,
        routeValid: topology.routeLength > 0
    };
    return { ...built, variant, topology };
}


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

function getDungeonDigitV44(level = 1) {
    const n = Math.max(0, Math.floor(Number(level) || 0));
    return n % 10;
}

function getDungeonEnemyCountV44(level = 1) {
    const depth = Math.max(1, Math.floor(Number(level) || 1));
    // Level 1 = 4, level 2 = 5, ... capped to protect small/older devices.
    return Math.min(BOMBERMAN_DUNGEON_V44.maxNormalEnemies, 3 + depth);
}

function v44InBounds(x, y) {
    return x > 0 && y > 0 && x < gameState.gridWidth - 1 && y < gameState.gridHeight - 1;
}

function v44RoomKey(x, y) {
    return `${x},${y}`;
}

function v44IsStartSafeCell(x, y) {
    // Preserve the familiar Bomberman starting pocket at the upper-left.
    return (x <= 2 && y <= 2) || (x === 1 && y === 3) || (x === 3 && y === 1);
}

function v44DigitBounds(level) {
    const w = BOMBERMAN_DUNGEON_V44.digitWidth;
    const h = BOMBERMAN_DUNGEON_V44.digitHeight;
    return {
        x: Math.floor((gameState.gridWidth - w) / 2),
        y: Math.floor((gameState.gridHeight - h) / 2),
        w,
        h
    };
}

function v44InsideDigitBounds(x, y, bounds) {
    return x >= bounds.x && x < bounds.x + bounds.w && y >= bounds.y && y < bounds.y + bounds.h;
}

function v44ApplyDigitHardWalls(level) {
    const digit = getDungeonDigitV44(level);
    const glyph = BOMBERMAN_DUNGEON_V44.glyphs[digit] || BOMBERMAN_DUNGEON_V44.glyphs[1];
    const bounds = v44DigitBounds(level);
    const hard = new Set();

    for (let row = 0; row < glyph.length; row++) {
        for (let col = 0; col < glyph[row].length; col++) {
            if (glyph[row][col] !== '1') continue;
            const x = bounds.x + col;
            const y = bounds.y + row;
            if (!v44InBounds(x, y)) continue;
            gameState.grid[y][x] = TYPES.WALL;
            hard.add(v44RoomKey(x, y));
        }
    }
    return { digit, glyph, bounds, hard };
}

function v44ApplyClassicHardWalls(bounds, hard) {
    for (let y = 1; y < gameState.gridHeight - 1; y++) {
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            // Outside the number, use the classic Bomberman pillar cadence.
            if (v44IsStartSafeCell(x, y)) continue;
            if (x % 2 !== 0 || y % 2 !== 0) continue;
            if (v44InsideDigitBounds(x, y, bounds)) continue;
            gameState.grid[y][x] = TYPES.WALL;
            hard.add(v44RoomKey(x, y));
        }
    }
}

function v44CandidateCells(hard, minDistance = 7) {
    const px = 1;
    const py = 1;
    const result = [];
    for (let y = 1; y < gameState.gridHeight - 1; y++) {
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            const key = v44RoomKey(x, y);
            if (hard.has(key) || v44IsStartSafeCell(x, y)) continue;
            const distance = Math.abs(x - px) + Math.abs(y - py);
            if (distance >= minDistance) result.push({ x, y, distance });
        }
    }
    return result;
}

function v44EnsureEnemySpace(hard, targetCount) {
    const need = Math.max(0, Number(targetCount) || 0) + 8;
    let candidates = v44CandidateCells(hard, 7).filter(c => gameState.grid[c.y]?.[c.x] === TYPES.EMPTY);
    if (candidates.length >= need) return;

    const openKeys = new Set(candidates.map(c => v44RoomKey(c.x, c.y)));
    const blockCandidates = [];
    for (let y = 1; y < gameState.gridHeight - 1; y++) {
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            const key = v44RoomKey(x, y);
            if (hard.has(key) || v44IsStartSafeCell(x, y) || openKeys.has(key)) continue;
            if (gameState.grid[y][x] === TYPES.BLOCK) blockCandidates.push({ x, y });
        }
    }

    for (let i = blockCandidates.length - 1; i > 0 && candidates.length < need; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [blockCandidates[i], blockCandidates[j]] = [blockCandidates[j], blockCandidates[i]];
    }

    for (const cell of blockCandidates) {
        if (candidates.length >= need) break;
        gameState.grid[cell.y][cell.x] = TYPES.EMPTY;
        candidates.push(cell);
    }
}

function v44PickExitCell() {
    const candidates = [];
    const centerX = (gameState.gridWidth - 1) / 2;
    const centerY = (gameState.gridHeight - 1) / 2;
    for (let y = 1; y < gameState.gridHeight - 1; y++) {
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            if (gameState.grid[y][x] !== TYPES.BLOCK) continue;
            if (v44IsStartSafeCell(x, y)) continue;
            const cornerBias = (x / gameState.gridWidth) * 0.55 + (y / gameState.gridHeight) * 0.45;
            const centerDistance = Math.abs(x - centerX) + Math.abs(y - centerY);
            candidates.push({ x, y, score: cornerBias * 100 + centerDistance + Math.random() * 20 });
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || null;
}


function applyWinterTopologyV62(hardWalls, config = {}) {
    if (gameState.biomeV49?.id !== 'winter') return { applied: false, corridors: 0 };
    const wanted = Math.max(0, Math.min(3, Math.floor(Number(config.longCorridors) || 0)));
    if (!wanted) return { applied: false, corridors: 0 };

    const spacing = Math.max(3, Math.floor(Number(config.corridorSpacing) || 4));
    const rows = [];
    for (let y = 3; y < gameState.gridHeight - 2 && rows.length < wanted; y += spacing) rows.push(y);

    let carved = 0;
    const corridorCells = [];
    for (const y of rows) {
        let length = 0;
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            if (hardWalls.has(v44RoomKey(x, y))) continue;
            if (gameState.grid[y][x] === TYPES.WALL) continue;
            if (gameState.grid[y][x] === TYPES.BLOCK) {
                gameState.grid[y][x] = TYPES.EMPTY;
                carved++;
            }
            corridorCells.push({ x, y });
            length++;
        }
        if (length >= Math.max(5, Math.floor(gameState.gridWidth * 0.55))) {
            corridorCells.push({ x: -1, y });
        }
    }

    // Un carril vertical de conexión evita que el mapa se convierta en varias
    // franjas aisladas y conserva opciones de giro para el deslizamiento.
    const connectorX = Math.min(gameState.gridWidth - 2, Math.max(3, Math.floor(gameState.gridWidth * 0.68)));
    if (wanted >= 2) {
        for (let y = 1; y < gameState.gridHeight - 1; y++) {
            if (hardWalls.has(v44RoomKey(connectorX, y))) continue;
            if (gameState.grid[y][connectorX] === TYPES.WALL) continue;
            if (gameState.grid[y][connectorX] === TYPES.BLOCK) {
                gameState.grid[y][connectorX] = TYPES.EMPTY;
                carved++;
            }
        }
    }

    return { applied: true, corridors: rows.length, carvedBlocks: carved };
}

function buildBombermanDungeonV44() {
    // Self-contained terrain reset: outer shell is always indestructible.
    for (let y = 0; y < gameState.gridHeight; y++) {
        for (let x = 0; x < gameState.gridWidth; x++) {
            if (x === 0 || y === 0 || x === gameState.gridWidth - 1 || y === gameState.gridHeight - 1) {
                gameState.grid[y][x] = TYPES.WALL;
            } else {
                gameState.grid[y][x] = TYPES.EMPTY;
            }
        }
    }

    const digitData = v44ApplyDigitHardWalls(gameState.level);
    v44ApplyClassicHardWalls(digitData.bounds, digitData.hard);

    const levelFactor = Math.min(0.12, Math.max(0, gameState.level - 1) * 0.008);
    const roomBonus = Number(gameState.roomType?.blockBonus || 0);
    const diffBonus = Number(gameState.difficulty?.blockDensityBonus || 0);
    const density = Math.max(
        BOMBERMAN_DUNGEON_V44.blockDensityMin,
        Math.min(BOMBERMAN_DUNGEON_V44.blockDensityMax, 0.60 + levelFactor + roomBonus + diffBonus)
    );

    let destructible = 0;
    const empties = [];
    for (let y = 1; y < gameState.gridHeight - 1; y++) {
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            const key = v44RoomKey(x, y);
            if (digitData.hard.has(key)) continue;
            if (v44IsStartSafeCell(x, y)) {
                gameState.grid[y][x] = TYPES.EMPTY;
                continue;
            }
            if (x % 2 === 0 && y % 2 === 0) continue;
            if (Math.random() < density) {
                gameState.grid[y][x] = TYPES.BLOCK;
                destructible++;
            } else {
                gameState.grid[y][x] = TYPES.EMPTY;
                empties.push({ x, y });
            }
        }
    }

    const winterTopology = applyWinterTopologyV62(digitData.hard, gameState.biomeV49?.stageConfig?.generation?.topology || {});
    if (winterTopology.applied) destructible = Math.max(0, destructible - Number(winterTopology.carvedBlocks || 0));

    const targetEnemies = getDungeonEnemyCountV44(gameState.level);
    v44EnsureEnemySpace(digitData.hard, targetEnemies);

    const exitCell = v44PickExitCell();
    const exit = exitCell || { x: Math.max(1, gameState.gridWidth - 2), y: Math.max(1, gameState.gridHeight - 2) };

    roomDesignV313.rooms = [];
    roomDesignV313.riskCells.clear();
    roomDesignV313.combatCells.clear();
    roomDesignV313.treasureCells.clear();
    roomDesignV313.secretCells.clear();
    roomDesignV313.secretInterior.clear();
    roomDesignV313.secretRoom = null;
    roomDesignV313.exitGate = { x: exit.x, y: exit.y };
    roomDesignV313.layoutVariant = `bomberman-digit-${digitData.digit}`;
    roomDesignV313.layoutMetrics = {
        variant: roomDesignV313.layoutVariant,
        digit: digitData.digit,
        hardWalls: digitData.hard.size,
        destructibleBlocks: destructible,
        emptyCells: v44CandidateCells(digitData.hard, 0).filter(c => gameState.grid[c.y]?.[c.x] === TYPES.EMPTY).length,
        density: Number(density.toFixed(3)),
        winterTopology: winterTopology,
        enemyTarget: targetEnemies,
        routeValid: true,
        repairApplied: false
    };

    // Prefer open cells as enemy spawn/combat candidates.
    for (const cell of v44CandidateCells(digitData.hard, 7)) {
        if (gameState.grid[cell.y]?.[cell.x] === TYPES.EMPTY) {
            roomDesignV313.combatCells.add(v44RoomKey(cell.x, cell.y));
        }
    }

    gameState.dungeonV44 = {
        version: BOMBERMAN_DUNGEON_V44.version,
        digit: digitData.digit,
        digitBounds: digitData.bounds,
        hardWallCells: digitData.hard,
        enemyTarget: targetEnemies,
        exitUnlocked: false,
        fixedEnemyCount: true,
        blockDensity: density
    };
    return gameState.dungeonV44;
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
    roomDesignV313.layoutVariant = 'corridors';
    roomDesignV313.layoutMetrics = null;
    gameState.roomDesign = roomDesignV313;

    if (gameState.roomType.id === 'BOSS') {
        buildBossRoomLayoutV313();
        const start = { x: 2, y: 2 };
        const goal = roomDesignV313.exitGate || { x: gameState.gridWidth - 3, y: gameState.gridHeight - 3 };
        const topology = collectRoomTopologyV322(start, goal);
        if (!topology.routeLength) carveGuaranteedRouteV322(start, goal);
        roomDesignV313.layoutVariant = 'boss';
        roomDesignV313.layoutMetrics = { variant:'boss', rooms:roomDesignV313.rooms.length, ...collectRoomTopologyV322(start, goal), routeValid:true, repairApplied:!topology.routeLength };
        gameState.dungeonV44 = {
            version: BOMBERMAN_DUNGEON_V44.version,
            digit: null,
            digitBounds: null,
            hardWallCells: new Set(),
            enemyTarget: 0,
            exitUnlocked: false,
            fixedEnemyCount: false,
            blockDensity: null
        };
    } else {
        buildBombermanDungeonV44();
    }
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
        if (treasure) gameState.items.push({ x: treasure.x, y: treasure.y, type: POWERUPS.BOMB_KICK });
    }

    const secret = chooseRoomDesignItemCellV313(gameState.roomDesign.secretInterior, used);
    if (secret) gameState.items.push({ x: secret.x, y: secret.y, type: POWERUPS.HEALTH_UP });
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
