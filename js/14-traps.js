// Bomberman Roguelike v3.12.3 — Trap & Hazard system
// Trampas de un solo uso, telegraphing justo, efectos claros y reacción a bombas.

const TRAP_TYPES = Object.freeze({
    SPIKE: 'spike',
    FIRE: 'fire',
    ICE: 'ice',
    SLOW: 'slow',
    DELAYED: 'delayed-explosion'
});

const TRAP_DEFS = Object.freeze({
    [TRAP_TYPES.SPIKE]: {
        icon: '✦', name: 'PINCHOS', color: '#f8fafc', telegraph: '#cbd5e1',
        effectText: '¡PINCHOS!', damage: 1
    },
    [TRAP_TYPES.FIRE]: {
        icon: '♨', name: 'FUEGO', color: '#fb7185', telegraph: '#f97316',
        effectText: '¡FUEGO!', damage: 1, activeMs: 850
    },
    [TRAP_TYPES.ICE]: {
        icon: '❄', name: 'HIELO', color: '#67e8f9', telegraph: '#38bdf8',
        effectText: '¡HIELO!', slowFactor: 0.55, slowMs: 1200
    },
    [TRAP_TYPES.SLOW]: {
        icon: '≈', name: 'RALENTIZACIÓN', color: '#c084fc', telegraph: '#a78bfa',
        effectText: '¡RALENTIZADO!', slowFactor: 0.45, slowMs: 1500
    },
    [TRAP_TYPES.DELAYED]: {
        icon: '!', name: 'EXPLOSIÓN', color: '#facc15', telegraph: '#fb923c',
        effectText: '¡TRAMPA ARMADA!', delayMs: 720, range: 1
    }
});

const TRAP_SYSTEM = {
    telegraphDistance: 2.8,
    telegraphPulseMs: 520,
    delayedFlashMs: 720,
    defaultSlowFactor: 0.5,
    maxVisibleActive: 16
};

function trapDefinition(type) {
    return TRAP_DEFS[type] || TRAP_DEFS[TRAP_TYPES.SPIKE];
}

function trapCenter(h) {
    return {
        x: (h.x + 0.5) * TILE_SIZE,
        y: (h.y + 0.5) * TILE_SIZE
    };
}

function trapDistanceToPlayer(h) {
    const c = trapCenter(h);
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    return Math.hypot(px - c.x, py - c.y) / TILE_SIZE;
}

function chooseTrapType() {
    const cursed = gameState.roomType?.id === 'CURSED';
    const r = Math.random();
    if (cursed) {
        if (r < 0.24) return TRAP_TYPES.DELAYED;
        if (r < 0.46) return TRAP_TYPES.FIRE;
        if (r < 0.66) return TRAP_TYPES.SPIKE;
        if (r < 0.84) return TRAP_TYPES.SLOW;
        return TRAP_TYPES.ICE;
    }
    if (r < 0.28) return TRAP_TYPES.SPIKE;
    if (r < 0.50) return TRAP_TYPES.FIRE;
    if (r < 0.68) return TRAP_TYPES.ICE;
    if (r < 0.86) return TRAP_TYPES.SLOW;
    return TRAP_TYPES.DELAYED;
}

function generateHazards() {
    const candidates = [];
    for (let y = 1; y < gameState.gridHeight - 1; y++) {
        for (let x = 1; x < gameState.gridWidth - 1; x++) {
            if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
            if ((x <= 3 && y <= 3) || (gameState.exitPos && gameState.exitPos.x === x && gameState.exitPos.y === y)) continue;
            if (gameState.roomDesign?.secretInterior?.has(`${x},${y}`)) continue;
            candidates.push({ x, y });
        }
    }

    const riskCandidates = candidates.filter(c => gameState.roomDesign?.riskCells?.has(`${c.x},${c.y}`));
    const normalCandidates = candidates.filter(c => !gameState.roomDesign?.riskCells?.has(`${c.x},${c.y}`));
    for (let i = riskCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [riskCandidates[i], riskCandidates[j]] = [riskCandidates[j], riskCandidates[i]];
    }
    for (let i = normalCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [normalCandidates[i], normalCandidates[j]] = [normalCandidates[j], normalCandidates[i]];
    }
    candidates.splice(0, candidates.length, ...riskCandidates, ...normalCandidates);

    const count = Math.min(
        candidates.length,
        Math.max(2, 2 + Math.floor(gameState.level / 2) + (gameState.roomType.id === 'CURSED' ? 2 : 0))
    );

    player.hazardSlowTimer = 0;
    player.hazardSlowFactor = 1;
    player.hazardSlowType = '';

    gameState.hazards = candidates.slice(0, count).map((h, index) => ({
        ...h,
        id: `hazard-${gameState.animFrame}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        type: chooseTrapType(),
        triggered: false,
        visible: false,
        telegraphTimer: 0,
        flashTimer: 0,
        effectTimer: 0,
        delayTimer: 0,
        effectConsumed: false,
        detonated: false,
        phase: Math.random() * Math.PI * 2
    }));
}

function getHazardSpeedFactor() {
    const timer = player.hazardSlowTimer || 0;
    if (timer <= 0) return 1;
    return Math.max(0.35, Math.min(1, player.hazardSlowFactor || 0.5));
}

function applyHazardSlow(h, def) {
    player.hazardSlowTimer = Math.max(player.hazardSlowTimer || 0, def.slowMs || 1000);
    player.hazardSlowFactor = Math.min(player.hazardSlowFactor || 1, def.slowFactor || TRAP_SYSTEM.defaultSlowFactor);
    player.hazardSlowType = h.type;
}

function clearExpiredHazardSlow(dt) {
    if (!(player.hazardSlowTimer > 0)) return;
    player.hazardSlowTimer = Math.max(0, player.hazardSlowTimer - dt);
    if (player.hazardSlowTimer <= 0) {
        player.hazardSlowFactor = 1;
        player.hazardSlowType = '';
    }
}

function triggerHazard(h, reason = 'player') {
    if (!h || h.triggered || h.effectConsumed) return false;

    const def = trapDefinition(h.type);
    h.triggered = true;
    h.visible = true;
    h.flashTimer = 1200;
    h.telegraphTimer = 0;
    h.effectTimer = def.activeMs || 650;
    h.effectConsumed = true;

    const c = trapCenter(h);
    addParticles(c.x, c.y, def.color, h.type === TRAP_TYPES.DELAYED ? 14 : 18);
    addFloatingText(def.effectText, c.x, c.y - 8, def.color);
    sfx('trap');
    triggerScreenShake(h.type === TRAP_TYPES.DELAYED ? 3 : 4, 120);

    if (h.type === TRAP_TYPES.DELAYED) {
        h.delayTimer = def.delayMs || TRAP_SYSTEM.delayedFlashMs;
        h.detonated = false;
        addFloatingText(reason === 'bomb' ? 'BOMBA · TRAMPA ARMADA' : '¡HUYE!', c.x, c.y + 18, '#facc15');
        return true;
    }

    if (h.type === TRAP_TYPES.ICE || h.type === TRAP_TYPES.SLOW) {
        applyHazardSlow(h, def);
        return true;
    }

    if (def.damage && reason === 'player') {
        takeDamage('trap', c.x, c.y);
    }

    return true;
}

function getTrapBlastCells(h) {
    const def = trapDefinition(h.type);
    const range = def.range || 1;
    const cells = [{ x: h.x, y: h.y }];
    const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];

    for (const dir of dirs) {
        for (let r = 1; r <= range; r++) {
            const x = h.x + dir.dx * r;
            const y = h.y + dir.dy * r;
            if (x < 0 || x >= gameState.gridWidth || y < 0 || y >= gameState.gridHeight) break;
            const tile = gameState.grid[y]?.[x];
            if (tile === TYPES.WALL) break;
            cells.push({ x, y });
            if (tile === TYPES.BLOCK) break;
        }
    }
    return cells;
}

function spawnHazardExplosion(h) {
    if (!h || h.detonated) return false;
    h.detonated = true;

    const cells = getTrapBlastCells(h);
    const blastId = ++gameState.blastSerial;
    for (const cell of cells) {
        gameState.explosions.push({
            x: cell.x,
            y: cell.y,
            timer: 420,
            blastId,
            owner: 'trap'
        });
    }

    const c = trapCenter(h);
    addParticles(c.x, c.y, '#f97316', 20);
    addFloatingText('¡TRAMPA EXPLOTA!', c.x, c.y - 18, '#fb923c');
    sfx('boom');
    triggerScreenShake(7, 240);
    return true;
}

function reactHazardsToBlast(cells, bomb) {
    if (!Array.isArray(cells) || !gameState.hazards?.length) return;
    const keys = new Set(cells.map(c => `${c.x},${c.y}`));

    for (const h of gameState.hazards) {
        if (h.triggered || h.effectConsumed) continue;
        if (!keys.has(`${h.x},${h.y}`)) continue;

        // La explosión de una bomba puede armar únicamente las trampas retardadas.
        // El resto conserva su activación por contacto para evitar efectos redundantes.
        if (h.type === TRAP_TYPES.DELAYED) {
            triggerHazard(h, 'bomb');
        }
    }
}

function updateHazards(dt) {
    clearExpiredHazardSlow(dt);

    if (!Array.isArray(gameState.hazards)) return;

    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;

    for (const h of gameState.hazards) {
        if (!h) continue;

        if (h.flashTimer > 0) h.flashTimer = Math.max(0, h.flashTimer - dt);
        if (h.effectTimer > 0) h.effectTimer = Math.max(0, h.effectTimer - dt);

        if (h.triggered) {
            if (h.type === TRAP_TYPES.DELAYED && !h.detonated) {
                h.delayTimer = Math.max(0, h.delayTimer - dt);
                if (h.delayTimer <= 0) spawnHazardExplosion(h);
            }
            continue;
        }

        // Telegraph: la trampa sigue siendo "oculta", pero el jugador recibe
        // una señal justa cuando entra en su radio de proximidad.
        const distance = trapDistanceToPlayer(h);
        if (distance <= TRAP_SYSTEM.telegraphDistance) {
            h.telegraphTimer = Math.min(TRAP_SYSTEM.telegraphPulseMs, h.telegraphTimer + dt);
        } else {
            h.telegraphTimer = Math.max(0, h.telegraphTimer - dt * 1.5);
        }

        // Activación por contacto. Se usa solapamiento de hurtbox para no activar
        // una trampa desde fuera del centro de su celda.
        const left = h.x * TILE_SIZE + TILE_SIZE * 0.18;
        const right = (h.x + 1) * TILE_SIZE - TILE_SIZE * 0.18;
        const top = h.y * TILE_SIZE + TILE_SIZE * 0.18;
        const bottom = (h.y + 1) * TILE_SIZE - TILE_SIZE * 0.18;
        const playerHurt = {
            left: player.x + player.width * 0.30,
            right: player.x + player.width - player.width * 0.30,
            top: player.y + player.height * 0.30,
            bottom: player.y + player.height - player.height * 0.20
        };

        if (playerHurt.right > left && playerHurt.left < right && playerHurt.bottom > top && playerHurt.top < bottom) {
            triggerHazard(h, 'player');
        }
    }
}

function drawTrapIcon(ctx, h, def, x, y, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = def.color;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x, y);
    ctx.restore();
}

function drawHazards() {
    if (!Array.isArray(gameState.hazards)) return;

    for (const h of gameState.hazards) {
        if (!h) continue;
        const def = trapDefinition(h.type);
        const x = h.x * TILE_SIZE;
        const y = h.y * TILE_SIZE;
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;

        if (!h.triggered) {
            const distance = trapDistanceToPlayer(h);
            if (distance <= TRAP_SYSTEM.telegraphDistance && h.telegraphTimer > 0) {
                const phase = (h.telegraphTimer / TRAP_SYSTEM.telegraphPulseMs) * Math.PI * 2 + h.phase;
                const pulse = 0.22 + (Math.sin(phase) + 1) * 0.10;
                ctx.save();
                ctx.strokeStyle = def.telegraph;
                ctx.globalAlpha = Math.min(0.5, pulse);
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(cx, cy, TILE_SIZE * 0.26 + Math.sin(phase) * 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                drawTrapIcon(ctx, h, def, cx, cy - 1, Math.min(0.5, pulse + 0.08));
                ctx.restore();
            }
            continue;
        }

        const active = h.flashTimer > 0 || h.effectTimer > 0 || (h.type === TRAP_TYPES.DELAYED && !h.detonated);
        const pulse = active ? 0.56 + Math.sin(gameState.animFrame * 0.32 + h.phase) * 0.20 : 0.22;

        ctx.save();
        ctx.fillStyle = `${hexToRgba(def.color, Math.max(0.08, pulse * 0.23))}`;
        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.strokeStyle = def.color;
        ctx.globalAlpha = active ? 0.95 : 0.55;
        ctx.lineWidth = active ? 3 : 2;
        ctx.strokeRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14);

        if (h.type === TRAP_TYPES.SPIKE) {
            ctx.fillStyle = active ? '#f8fafc' : '#cbd5e1';
            for (let i = 0; i < 5; i++) {
                const ox = cx - 12 + i * 6;
                ctx.beginPath();
                ctx.moveTo(ox - 3, cy + 7);
                ctx.lineTo(ox, cy - 8);
                ctx.lineTo(ox + 3, cy + 7);
                ctx.closePath();
                ctx.fill();
            }
        } else if (h.type === TRAP_TYPES.FIRE) {
            ctx.fillStyle = active ? '#fb7185' : '#f97316';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 11);
            ctx.quadraticCurveTo(cx - 10, cy - 3, cx - 5, cy + 8);
            ctx.quadraticCurveTo(cx, cy + 3, cx + 3, cy + 10);
            ctx.quadraticCurveTo(cx + 11, cy, cx, cy - 11);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(cx, cy + 3, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (h.type === TRAP_TYPES.ICE) {
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const ang = Math.PI / 3 * a;
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * 12, cy + Math.sin(ang) * 12);
            }
            ctx.stroke();
        } else if (h.type === TRAP_TYPES.SLOW) {
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx - 5, cy, 6, Math.PI * 0.2, Math.PI * 1.45);
            ctx.arc(cx + 5, cy, 6, Math.PI * 1.2, Math.PI * 2.45);
            ctx.stroke();
        } else if (h.type === TRAP_TYPES.DELAYED) {
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, h.delayTimer / (TRAP_DEFS[TRAP_TYPES.DELAYED].delayMs || 720)));
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', cx, cy + 1);
        }

        if (!active && h.type !== TRAP_TYPES.DELAYED) {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = def.telegraph;
            ctx.strokeRect(x + 10, y + 10, TILE_SIZE - 20, TILE_SIZE - 20);
        }
        ctx.restore();
    }
}

function hexToRgba(hex, alpha) {
    const normalized = (hex || '#ffffff').replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(c => c + c).join('')
        : normalized;
    const n = parseInt(value, 16);
    if (!Number.isFinite(n)) return `rgba(255,255,255,${alpha})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
