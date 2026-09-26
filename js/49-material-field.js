// Bomberman Roguelike v6.0 — Persistent Material Field
// Noita-inspired direction, but intentionally discrete and small:
// persistent tile residues + deterministic pair reactions + bounded spreading.
//
// This module is a consumer of the shared event bus. A bomb does not know
// anything about materials; BOMBA_EXPLOTO creates the biome-appropriate residue here.

(function installMaterialFieldV60(global) {
    'use strict';

    const VERSION = '6.7.0';
    const EVENT = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
    const LISTENER_KEY = 'bomb-explosion:materials';
    const MAX_RESIDUES = 360;
    const MAX_SPREADS_PER_FRAME = 14;

    const MATERIALS = Object.freeze({
        FIRE: 'fire',
        WATER: 'water',
        OIL: 'oil',
        ACID: 'acid',
        ELECTRIC: 'electric',
        STEAM: 'steam',
        BURNING_OIL: 'burning_oil',
        ELECTRIC_WATER: 'electric_water',
        ICE: 'ice',
        SLICK_ICE: 'slick_ice',
        PACKED_ICE: 'packed_ice',
        FROZEN_OIL: 'frozen_oil'
    });

    const MATERIAL_DEFS = Object.freeze({
        [MATERIALS.FIRE]: Object.freeze({
            label: 'Fuego',
            color: '#fb6b22',
            core: '#ffe58a',
            lifeMs: 1900,
            persistent: true,
            flammable: false,
            damage: true
        }),
        [MATERIALS.WATER]: Object.freeze({
            label: 'Agua',
            color: '#38bdf8',
            core: '#bdefff',
            lifeMs: 5200,
            persistent: true,
            spreads: true,
            spreadMs: 340,
            damage: false
        }),
        [MATERIALS.OIL]: Object.freeze({
            label: 'Aceite',
            color: '#8b5a2b',
            core: '#d6a15d',
            lifeMs: 7200,
            persistent: true,
            spreads: true,
            spreadMs: 420,
            flammable: true,
            damage: false
        }),
        [MATERIALS.ACID]: Object.freeze({
            label: 'Ácido',
            color: '#a3e635',
            core: '#ecfccb',
            lifeMs: 6800,
            persistent: true,
            spreads: true,
            spreadMs: 520,
            corrosive: true,
            damage: true
        }),
        [MATERIALS.ELECTRIC]: Object.freeze({
            label: 'Electricidad',
            color: '#60a5fa',
            core: '#ffffff',
            lifeMs: 180,
            persistent: false,
            damage: false
        }),
        [MATERIALS.STEAM]: Object.freeze({
            label: 'Vapor',
            color: '#e2e8f0',
            core: '#ffffff',
            lifeMs: 650,
            persistent: false,
            damage: false
        }),
        [MATERIALS.BURNING_OIL]: Object.freeze({
            label: 'Aceite ardiendo',
            color: '#f97316',
            core: '#fef08a',
            lifeMs: 3300,
            persistent: true,
            spreads: true,
            spreadMs: 240,
            damage: true,
            flammable: false
        }),
        [MATERIALS.ELECTRIC_WATER]: Object.freeze({
            label: 'Agua electrificada',
            color: '#60a5fa',
            core: '#ede9fe',
            lifeMs: 850,
            persistent: false,
            damage: true
        })
,
        [MATERIALS.ICE]: Object.freeze({
            label: 'Hielo',
            color: '#dff6ff',
            core: '#ffffff',
            lifeMs: 4000,
            persistent: true,
            damage: false
        }),
        [MATERIALS.SLICK_ICE]: Object.freeze({
            label: 'Hielo pulido',
            color: '#a5e4ff',
            core: '#effcff',
            lifeMs: 12000,
            persistent: true,
            damage: false
        }),
        [MATERIALS.PACKED_ICE]: Object.freeze({
            label: 'Hielo compacto',
            color: '#7dd3fc',
            core: '#e0f2fe',
            lifeMs: 3000,
            persistent: true,
            blocks: true,
            damage: false
        }),
        [MATERIALS.FROZEN_OIL]: Object.freeze({
            label: 'Aceite congelado',
            color: '#8b5a2b',
            core: '#d6a15d',
            lifeMs: 8000,
            persistent: true,
            flammable: false,
            damage: false
        })
    });

    // Commutative reaction table. The first key is normalized so FIRE+WATER
    // and WATER+FIRE always produce the same result.
    const REACTIONS = new Map([
        ['fire|water', Object.freeze({ result: MATERIALS.STEAM, lifeMs: 650, amount: 70, message: 'VAPOR' })],
        ['fire|oil', Object.freeze({ result: MATERIALS.BURNING_OIL, lifeMs: 3300, amount: 100, message: 'ACEITE EN LLAMAS' })],
        ['electric|water', Object.freeze({ result: MATERIALS.ELECTRIC_WATER, lifeMs: 850, amount: 90, message: 'AGUA ELECTRIFICADA' })],
        ['acid|water', Object.freeze({ result: MATERIALS.WATER, lifeMs: 3000, amount: 45, message: 'ÁCIDO DILUIDO' })],
        ['fire|ice', Object.freeze({ result: MATERIALS.WATER, lifeMs: 3000, amount: 70, message: 'SE DERRITE' })],
        ['ice|water', Object.freeze({ result: MATERIALS.SLICK_ICE, lifeMs: 12000, amount: 90, message: 'HIELO PULIDO' })],
        ['ice|electric', Object.freeze({ result: MATERIALS.WATER, lifeMs: 2000, amount: 60, message: 'SE ROMPE' })],
        ['ice|oil', Object.freeze({ result: MATERIALS.FROZEN_OIL, lifeMs: 8000, amount: 100, message: 'ACEITE CONGELADO' })],
        ['fire|frozen_oil', Object.freeze({ result: MATERIALS.BURNING_OIL, lifeMs: 3300, amount: 100, message: 'SE ENCIENDE TARDE' })],
        ['frozen_oil|water', Object.freeze({ result: MATERIALS.OIL, lifeMs: 7200, amount: 60, message: 'SE DESCONGELA' })],
        ['ice|acid', Object.freeze({ result: MATERIALS.WATER, lifeMs: 2500, amount: 45, message: 'ÁCIDO DILUIDO' })],
        ['ice|ice', Object.freeze({ result: MATERIALS.PACKED_ICE, lifeMs: 3000, amount: 100, message: 'HIELO COMPACTO' })]
    ]);

    function getState() {
        return global.BOMBER_ENGINE?.getState?.() || global.gameState || null;
    }

    function ensureStore() {
        const state = getState();
        if (!state) return null;
        if (!Array.isArray(state.materialResiduesV60)) state.materialResiduesV60 = [];
        return state.materialResiduesV60;
    }

    function tileKey(x, y) {
        return `${Math.trunc(x)},${Math.trunc(y)}`;
    }

    function isInsideGrid(x, y) {
        const state = getState();
        return !!state && x >= 0 && y >= 0 && x < Number(state.gridWidth) && y < Number(state.gridHeight);
    }

    function canOccupyTile(x, y, materialType = null) {
        const state = getState();
        if (!isInsideGrid(x, y)) return false;
        const type = state.grid?.[y]?.[x];
        const wall = Number(global.BOMBER_ENGINE?.getWorldTypes?.()?.WALL ?? 1);
        const locked = Number(global.BOMBER_ENGINE?.getWorldTypes?.()?.EXIT_LOCKED ?? 3);
        const block = Number(global.BOMBER_ENGINE?.getWorldTypes?.()?.BLOCK ?? 2);
        if (type === wall || type === locked) return false;
        if (type === block && materialType !== MATERIALS.ACID) return false;
        if (materialType !== MATERIALS.ACID && isMaterialBlockingTile(x, y)) return false;
        return true;
    }

    function normalizeAmount(amount) {
        return Math.max(1, Math.min(100, Number(amount) || 1));
    }

    function definition(type) {
        return MATERIAL_DEFS[type] || null;
    }

    function findResidue(store, x, y) {
        const key = tileKey(x, y);
        for (let i = 0; i < store.length; i++) {
            if (store[i]?.key === key) return { residue: store[i], index: i };
        }
        return null;
    }

    function reactionKey(a, b) {
        const pair = [String(a), String(b)].sort();
        return `${pair[0]}|${pair[1]}`;
    }

    function showReactionMessage(reaction, x, y) {
        if (!reaction?.message || typeof global.addFloatingText !== 'function') return;
        global.addFloatingText(
            reaction.message,
            (x + 0.5) * Number(global.TILE_SIZE || 48),
            (y + 0.25) * Number(global.TILE_SIZE || 48),
            '#f8fafc'
        );
    }

    function writeResidue(store, residue, type, amount, lifeMs, source = 'system') {
        const def = definition(type);
        if (!def) return residue;
        residue.type = type;
        residue.amount = normalizeAmount(amount);
        residue.lifeMs = Math.max(1, Number(lifeMs) || def.lifeMs);
        residue.spreadTimerMs = Math.min(residue.spreadTimerMs || 0, def.spreadMs || 0);
        residue.source = source;
        return residue;
    }

    function deposit(type, x, y, amount = 100, options = {}) {
        const def = definition(type);
        const store = ensureStore();
        const tx = Math.trunc(Number(x));
        const ty = Math.trunc(Number(y));
        if (!def || !store || !isInsideGrid(tx, ty) || !canOccupyTile(tx, ty, type)) return false;

        const existingInfo = findResidue(store, tx, ty);
        if (!existingInfo) {
            if (store.length >= MAX_RESIDUES) return false;
            const residue = {
                key: tileKey(tx, ty),
                x: tx,
                y: ty,
                type,
                amount: normalizeAmount(amount),
                lifeMs: Math.max(1, Number(options.lifeMs) || def.lifeMs),
                spreadTimerMs: Number(options.spreadTimerMs) || 0,
                source: String(options.source || 'system'),
                reactionCount: 0,
                layers: 1,
                contactCooldownMs: 0
            };
            store.push(residue);
            return true;
        }

        const existing = existingInfo.residue;
        if (existing.type === type) {
            existing.amount = Math.min(100, existing.amount + normalizeAmount(amount) * 0.55);
            existing.lifeMs = Math.max(existing.lifeMs, Number(options.lifeMs) || def.lifeMs);
            existing.layers = Math.min(9, Number(existing.layers || 1) + 1);
            if (type === MATERIALS.ICE && existing.layers >= 3) {
                const selfReaction = REACTIONS.get('ice|ice');
                if (selfReaction) {
                    writeResidue(store, existing, selfReaction.result, selfReaction.amount, selfReaction.lifeMs, 'reaction');
                    existing.reactionCount = (existing.reactionCount || 0) + 1;
                    showReactionMessage(selfReaction, tx, ty);
                }
            }
            return true;
        }

        // Special internal marker for lightning. Actual lightning remains an
        // independent hazard; this material is only an optional reaction input.
        const directReaction = REACTIONS.get(reactionKey(existing.type, type));
        if (directReaction) {
            const resultDef = definition(directReaction.result);
            writeResidue(store, existing, directReaction.result, directReaction.amount, directReaction.lifeMs, 'reaction');
            existing.reactionCount = (existing.reactionCount || 0) + 1;
            if (resultDef?.spreads) existing.spreadTimerMs = resultDef.spreadMs;
            showReactionMessage(directReaction, tx, ty);
            if (typeof global.addParticles === 'function') {
                const particleType = directReaction.result === MATERIALS.STEAM ? 'particleImpact' : 'particleDanger';
                global.addParticles((tx + 0.5) * Number(global.TILE_SIZE || 48), (ty + 0.5) * Number(global.TILE_SIZE || 48), particleType, 8);
            }
            return true;
        }

        // Unknown pairs do not overwrite each other. This prevents the system
        // from inventing chemistry and makes future reactions explicit.
        return false;
    }

    function getResidueAtTile(x, y){
        const store = ensureStore();
        const found = store ? findResidue(store, Math.trunc(x), Math.trunc(y)) : null;
        return found?.residue || null;
    }

    function entityCell(entity){
        const size = Number(global.TILE_SIZE || 48);
        if (!entity || !Number.isFinite(Number(entity.x)) || !Number.isFinite(Number(entity.y))) return null;
        return {
            x: Math.floor((Number(entity.x) + Number(entity.width || 0) / 2) / size),
            y: Math.floor((Number(entity.y) + Number(entity.height || 0) / 2) / size)
        };
    }

    function getMaterialMovementModifiersV67(entity){
        const cell = entityCell(entity);
        const residue = cell ? getResidueAtTile(cell.x, cell.y) : null;
        const result = { acceleration:1, braking:1, turnCarry:1, speedMultiplier:1, inputBufferMultiplier:1 };
        if (!residue) return Object.freeze(result);
        const table = {
            [MATERIALS.ICE]: { braking:.55, acceleration:.92, turnCarry:1.05, speedMultiplier:1 },
            [MATERIALS.SLICK_ICE]: { braking:.28, acceleration:.85, turnCarry:1.15, speedMultiplier:1 },
            [MATERIALS.WATER]: { braking:.80, acceleration:.95, turnCarry:1.02, speedMultiplier:.98 },
            [MATERIALS.FROZEN_OIL]: { braking:.40, acceleration:.90, turnCarry:1.10, speedMultiplier:1 },
            [MATERIALS.BURNING_OIL]: { speedMultiplier:.85 },
            [MATERIALS.ELECTRIC_WATER]: { speedMultiplier:.85 }
        };
        return Object.freeze({ ...result, ...(table[residue.type] || {}) });
    }

    function getBombMaterialModifiersV67(x, y){
        const residue = getResidueAtTile(x, y);
        const result = { fuseMultiplier:1, canPlace:true, kickOnPlace:false };
        if (!residue) return Object.freeze(result);
        if (residue.type === MATERIALS.ICE) result.fuseMultiplier=1.15;
        if (residue.type === MATERIALS.SLICK_ICE) result.kickOnPlace=true;
        if (residue.type === MATERIALS.PACKED_ICE || residue.type === MATERIALS.FROZEN_OIL) result.canPlace=false;
        if (residue.type === MATERIALS.WATER) result.fuseMultiplier=.85;
        if (residue.type === MATERIALS.BURNING_OIL) result.fuseMultiplier=.60;
        return Object.freeze(result);
    }

    function isMaterialBlockingTile(x,y){ const residue=getResidueAtTile(x,y); return !!residue && !!definition(residue.type)?.blocks; }

    function removeAt(x, y) {
        const store = ensureStore();
        if (!store) return false;
        const found = findResidue(store, x, y);
        if (!found) return false;
        store.splice(found.index, 1);
        return true;
    }

    function neighbors4(x, y) {
        return [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 }
        ];
    }

    function spreadResidue(store, residue) {
        const def = definition(residue.type);
        if (!def?.spreads || residue.amount < 10) return 0;
        const neighbors = neighbors4(residue.x, residue.y);
        // Deterministic neighbor order: avoids random simulation differences.
        for (const target of neighbors) {
            if (!canOccupyTile(target.x, target.y, residue.type)) continue;
            const found = findResidue(store, target.x, target.y);
            if (found && found.residue.type === residue.type) continue;
            if (found && !REACTIONS.has(reactionKey(found.residue.type, residue.type))) continue;
            const transfer = Math.max(8, Math.round(residue.amount * 0.28));
            const deposited = deposit(residue.type, target.x, target.y, transfer, { source: 'spread' });
            if (deposited) {
                residue.amount = Math.max(1, residue.amount - transfer * 0.5);
                return 1;
            }
        }
        return 0;
    }

    function playerCell() {
        const state = getState();
        const player = global.BOMBER_ENGINE?.getPlayer?.() || global.player;
        const size = Number(global.TILE_SIZE || 48);
        if (!state || !player) return null;
        return {
            x: Math.floor((Number(player.x) + Number(player.width || 0) / 2) / size),
            y: Math.floor((Number(player.y) + Number(player.height || 0) / 2) / size)
        };
    }

    function damagePlayerFromResidue(residue, dt) {
        const player = global.BOMBER_ENGINE?.getPlayer?.() || global.player;
        if (!player || !residue || !definition(residue.type)?.damage) return;
        residue.contactCooldownMs = Math.max(0, Number(residue.contactCooldownMs) - dt);
        if (residue.contactCooldownMs > 0) return;
        const cell = playerCell();
        if (!cell || cell.x !== residue.x || cell.y !== residue.y) return;

        residue.contactCooldownMs = residue.type === MATERIALS.ELECTRIC_WATER ? 850 : 900;
        if (typeof global.takeDamage === 'function') global.takeDamage('material', (residue.x + 0.5) * Number(global.TILE_SIZE || 48), (residue.y + 0.5) * Number(global.TILE_SIZE || 48));
    }

    function syncEnvironmentSources(state) {
        const hazards = Array.isArray(state?.hazards) ? state.hazards : [];
        for (const hazard of hazards) {
            if (!hazard || hazard.state === 'telegraph') continue;
            if (hazard.kind === 'lava' && Number.isFinite(hazard.x) && Number.isFinite(hazard.y)) {
                deposit(MATERIALS.FIRE, hazard.x, hazard.y, 34, { source: 'lava', lifeMs: 900 });
            }
            if (hazard.kind === 'tide' && hazard.state === 'active' && Number.isFinite(hazard.line) && Number.isFinite(hazard.progress)) {
                const waveCell = Math.floor(hazard.progress);
                if (hazard.axis === 'x') {
                    deposit(MATERIALS.WATER, waveCell, hazard.line, 42, { source: 'tide' });
                } else {
                    deposit(MATERIALS.WATER, hazard.line, waveCell, 42, { source: 'tide' });
                }
            }
            if (hazard.kind === 'lightning' && hazard.state === 'strike' && !hazard.materialMarked) {
                hazard.materialMarked = true;
                // Only fire/electric water becomes a gameplay reaction. Pure
                // electricity is a transient input, not persistent material.
                const existing = findResidue(ensureStore(), hazard.x, hazard.y);
                if (existing?.residue?.type === MATERIALS.WATER) {
                    deposit(MATERIALS.ELECTRIC, hazard.x, hazard.y, 90, { source: 'lightning' });
                }
            }
        }
    }

    function update(dt = 16.6667) {
        const state = getState();
        const store = ensureStore();
        if (!state || !store || !state.isPlaying || state.paused) return;

        const safeDt = Math.max(0, Math.min(100, Number(dt) || 16.6667));
        syncEnvironmentSources(state);

        let spreads = 0;
        for (let i = store.length - 1; i >= 0; i--) {
            const residue = store[i];
            const def = definition(residue?.type);
            if (!residue || !def) {
                store.splice(i, 1);
                continue;
            }

            residue.lifeMs -= safeDt;
            residue.spreadTimerMs = Math.max(0, Number(residue.spreadTimerMs) - safeDt);
            if (residue.lifeMs <= 0 || residue.amount <= 0) {
                store.splice(i, 1);
                continue;
            }

            damagePlayerFromResidue(residue, safeDt);

            if (def.corrosive && residue.type === MATERIALS.ACID) {
                const type = state.grid?.[residue.y]?.[residue.x];
                if (type === global.TYPES?.BLOCK && residue.lifeMs % 360 < safeDt) {
                    state.grid[residue.y][residue.x] = global.TYPES.EMPTY;
                    state.gridRevision = (state.gridRevision || 0) + 1;
                    if (typeof global.invalidateRenderCacheV317 === 'function') global.invalidateRenderCacheV317();
                }
            }

            if (def.spreads && residue.spreadTimerMs <= 0 && spreads < MAX_SPREADS_PER_FRAME) {
                residue.spreadTimerMs = def.spreadMs;
                spreads += spreadResidue(store, residue);
            }
        }
    }

    function reset() {
        const store = ensureStore();
        if (store) store.length = 0;
    }

    function validate() {
        const state = getState();
        const store = ensureStore() || [];
        const errors = [];
        const keys = new Set();
        for (const residue of store) {
            if (!residue || !definition(residue.type)) errors.push('Residuo con tipo inválido');
            if (!Number.isInteger(residue?.x) || !Number.isInteger(residue?.y)) errors.push('Residuo con coordenada inválida');
            if (keys.has(residue?.key)) errors.push(`Residuo duplicado: ${residue.key}`);
            keys.add(residue?.key);
            if (Number(residue?.amount) <= 0) errors.push(`Residuo con amount <= 0: ${residue?.key}`);
            if (Number(residue?.lifeMs) <= 0) errors.push(`Residuo con lifeMs <= 0: ${residue?.key}`);
        }
        if (store.length > MAX_RESIDUES) errors.push(`Límite de residuos superado: ${store.length}/${MAX_RESIDUES}`);
        return {
            valid: errors.length === 0,
            version: VERSION,
            count: store.length,
            max: MAX_RESIDUES,
            grid: state ? `${state.gridWidth}x${state.gridHeight}` : 'N/D',
            types: Object.fromEntries(Object.values(MATERIALS).map(type => [type, store.filter(r => r.type === type).length])),
            errors
        };
    }

    function snapshot() {
        const store = ensureStore() || [];
        return store.map(residue => ({
            x: residue.x,
            y: residue.y,
            type: residue.type,
            amount: residue.amount,
            lifeMs: residue.lifeMs,
            spreadTimerMs: residue.spreadTimerMs,
            source: residue.source,
            layers: Number(residue.layers || 1)
        }));
    }

    function draw(targetCtx) {
        const state = getState();
        const store = ensureStore();
        const ctx = targetCtx;
        if (!state || !store || !store.length || !ctx) return;
        const size = Number(global.BOMBER_ENGINE?.getTileSize?.() || 48);

        ctx.save();
        for (const residue of store) {
            const def = definition(residue.type);
            if (!def) continue;
            const x = residue.x * size;
            const y = residue.y * size;
            const alpha = Math.max(0.10, Math.min(0.78, 0.12 + residue.amount / 150));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = def.color;
            ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
            ctx.globalAlpha = Math.min(0.9, alpha + 0.12);
            ctx.fillStyle = def.core;
            const pulse = 2 + Math.sin((Number(state.animFrame) || 0) * 0.11 + residue.x * 0.7 + residue.y * 0.5) * 1.4;
            ctx.fillRect(x + size * 0.5 - pulse, y + size * 0.5 - pulse, pulse * 2, pulse * 2);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function installListener() {
        if (!global.gameEventBus || !EVENT) return false;
        if (global.__MATERIAL_FIELD_V60__) return true;
        global.gameEventBus.on(EVENT, (payload) => {
            const cells = Array.isArray(payload?.cells) ? payload.cells : [];
            const state = getState();
            if (state?.testLabV673?.active && state?.testLabV673?.materials === false) return;
            const winter = String(state?.biomeV49?.id || '') === 'winter';
            const bomb = payload?.bomb || {};
            const explicitMaterial = bomb.materialOverrideV67 && MATERIALS[bomb.materialOverrideV67.toUpperCase()]
                ? MATERIALS[bomb.materialOverrideV67.toUpperCase()]
                : null;
            const blastMaterial = explicitMaterial || (winter ? MATERIALS.ICE : MATERIALS.FIRE);
            const amountMultiplier = Number(bomb.winterPowerupModifiersV67?.residualAmountMultiplier) || 1;
            for (const cell of cells) {
                if (!cell) continue;
                deposit(blastMaterial, cell.x, cell.y, (cell.block ? 40 : 62) * amountMultiplier, { source: explicitMaterial ? 'bomb-powerup' : (winter ? 'bomb-winter' : 'bomb') });
            }
        }, { key: LISTENER_KEY });
        global.__MATERIAL_FIELD_V60__ = true;
        return true;
    }

    installListener();

    global.MATERIALS_V60 = MATERIALS;
    global.MATERIAL_DEFS_V60 = MATERIAL_DEFS;
    global.MATERIAL_REACTIONS_V60 = REACTIONS;
    global.materialDepositV60 = deposit;
    global.materialRemoveAtV60 = removeAt;
    global.materialUpdateV60 = update;
    global.materialResetV60 = reset;
    global.materialValidateV60 = validate;
    global.materialSnapshotV60 = snapshot;
    global.getResidueAtTileV67 = getResidueAtTile;
    global.getMaterialMovementModifiersV67 = getMaterialMovementModifiersV67;
    global.getBombMaterialModifiersV67 = getBombMaterialModifiersV67;
    global.isMaterialBlockingTileV67 = isMaterialBlockingTile;
    global.drawMaterialResiduesV60 = draw;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getMaterials = () => ({
        types: MATERIALS,
        definitions: MATERIAL_DEFS,
        reactions: REACTIONS,
        snapshot
    });
    global.BOMBER_ENGINE.validateMaterials = validate;
    global.BOMBER_ENGINE.spawnMaterial = deposit;
    global.BOMBER_ENGINE.resetMaterials = reset;
    global.BOMBER_ENGINE.auditMaterialEventListener = () => ({
        valid: !!global.gameEventBus && global.gameEventBus.listenerCount(EVENT) > 0,
        event: EVENT,
        key: LISTENER_KEY,
        listenerCount: global.gameEventBus?.listenerCount?.(EVENT) || 0
    });
})(window);
