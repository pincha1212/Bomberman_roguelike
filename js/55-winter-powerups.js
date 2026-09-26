// Bomberman Roguelike v6.7.6 — Universal Gameplay Powerups Registry
// Todos los power-ups registrados aquí son independientes del bioma.
// El Test Lab los verifica antes de considerarlos parte estable del gameplay.
(function installGameplayPowerupsV676(global) {
    'use strict';

    const VERSION = '6.7.6';
    const POWERUPS = Object.freeze({
        LONG_FUSE: 'LONG_FUSE',
        BOMB_SLIDE: 'BOMB_SLIDE',
        ALCHEMIST_GLOVE: 'ALCHEMIST_GLOVE',
        CATALYST: 'CATALYST',
        ACID_FLASK: 'ACID_FLASK',
        AVALANCHE: 'AVALANCHE',
        SLOW_AURA: 'SLOW_AURA',
        HUNTER_MARK: 'HUNTER_MARK'
    });

    const META = Object.freeze({
        LONG_FUSE: { id:'LONG_FUSE', name:'MECHA LARGA', icon:'⏱', rarity:'COMMON', category:'BOMBAS', desc:'Tus bombas tardan 30% más en explotar.', implemented:true },
        BOMB_SLIDE: { id:'BOMB_SLIDE', name:'BOMBA DESLIZANTE', icon:'⚪', rarity:'RARE', category:'BOMBAS', desc:'Al colocar una bomba, avanza 1 casilla en la dirección actual.', implemented:true },
        ALCHEMIST_GLOVE: { id:'ALCHEMIST_GLOVE', name:'GUANTE DE ALQUIMISTA', icon:'🧤', rarity:'COMMON', category:'MATERIALES', desc:'Revela materiales cercanos durante 3 segundos.', implemented:true },
        CATALYST: { id:'CATALYST', name:'CATALIZADOR', icon:'⚗', rarity:'RARE', category:'MATERIALES', desc:'Duplica el material residual generado por tus bombas.', implemented:true },
        ACID_FLASK: { id:'ACID_FLASK', name:'FRASCO DE ÁCIDO', icon:'🧪', rarity:'CURSED', category:'MATERIALES', desc:'Al recibir daño, dejás ácido en tu casilla.', implemented:true },
        AVALANCHE: { id:'AVALANCHE', name:'AVALANCHA', icon:'🏔', rarity:'EPIC', category:'BOMBAS', desc:'Cada 3 explosiones tuyas prepara la siguiente bomba con el doble de rango.', implemented:true },
        SLOW_AURA: { id:'SLOW_AURA', name:'AURA DE LENTITUD', icon:'🥶', rarity:'RARE', category:'ENEMIGOS', desc:'Los enemigos a 1 casilla se mueven 15% más lento.', implemented:true },
        HUNTER_MARK: { id:'HUNTER_MARK', name:'MARCA DEL CAZADOR', icon:'🎯', rarity:'COMMON', category:'ENEMIGOS', desc:'El primer enemigo que te detecta queda marcado; al eliminarlo, ganás 15 monedas.', implemented:true }
    });

    const RARITY_COLORS = Object.freeze({ COMMON:'#94a3b8', RARE:'#60a5fa', EPIC:'#c084fc', CURSED:'#f87171' });

    function state() { return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }
    function player() { return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }

    function ensureState() {
        const s = state();
        if (!s) return null;
        if (!s.gameplayPowerupsV676 || typeof s.gameplayPowerupsV676 !== 'object') {
            s.gameplayPowerupsV676 = {
                active:Object.create(null),
                pickups:Object.create(null),
                gloveTimer:0,
                avalancheExplosionCount:0,
                avalancheReady:false,
                hunterMarked:false,
                markedEnemyId:null
            };
        }
        return s.gameplayPowerupsV676;
    }

    function active(id) { return !!ensureState()?.active?.[String(id)]; }

    function apply(id) {
        const meta = META[String(id)];
        const p = player();
        const ps = ensureState();
        if (!meta || !p || !ps) return false;
        const key = String(id);
        ps.active[key] = true;
        ps.pickups[key] = Number(ps.pickups[key] || 0) + 1;
        if (key === 'ALCHEMIST_GLOVE') ps.gloveTimer = 3000;
        if (key === 'AVALANCHE' && !ps.avalancheReady) ps.avalancheExplosionCount = Math.max(0, Number(ps.avalancheExplosionCount) || 0);
        if (key === 'HUNTER_MARK') { ps.hunterMarked = false; ps.markedEnemyId = null; }
        if (typeof global.addFloatingText === 'function') {
            global.addFloatingText(meta.name, p.x, p.y, RARITY_COLORS[meta.rarity] || '#cbd5e1');
        }
        return true;
    }

    function getBombModifiersV676() {
        const result = { fuseMultiplier:1, residualAmountMultiplier:1 };
        if (active('LONG_FUSE')) result.fuseMultiplier = 1.30;
        if (active('CATALYST')) result.residualAmountMultiplier = 2;
        return result;
    }

    function applyBombModifiersV676(bomb) {
        if (!bomb || bomb.owner !== 'player') return bomb;
        const ps = ensureState();
        const mods = getBombModifiersV676();
        bomb.gameplayPowerupModifiersV676 = { ...mods };
        if (active('AVALANCHE') && ps?.avalancheReady) {
            const cap = Number(global.PLAYER_LIMITS_V67?.hard?.bombRange || 12);
            bomb.range = Math.max(1, Math.min(cap, Math.floor(Number(bomb.range || 1) * 2)));
            bomb.avalancheBoostedV676 = true;
            ps.avalancheReady = false;
            ps.avalancheExplosionCount = 0;
        }

        if (active('BOMB_SLIDE')) {
            const dir = typeof global.getBombKickDirectionV67 === 'function' ? global.getBombKickDirectionV67() : {dx:0,dy:0};
            if ((dir.dx || dir.dy) && typeof global.queueBombJumpSequenceV67 === 'function') {
                const s = state();
                const types = typeof global.BOMBER_ENGINE?.getWorldTypes === 'function'
                    ? global.BOMBER_ENGINE.getWorldTypes()
                    : { WALL: 1, BLOCK: 2 };
                const tileSize = Number(global.BOMBER_ENGINE?.getTileSize?.() || global.TILE_SIZE || 48);
                const tx = bomb.x + dir.dx;
                const ty = bomb.y + dir.dy;
                const row = s?.grid?.[ty];
                const open = !!(row && tx >= 0 && ty >= 0 && tx < s.gridWidth && ty < s.gridHeight &&
                    row[tx] !== types.WALL && row[tx] !== types.BLOCK &&
                    !(typeof global.isMaterialBlockingTileV67 === 'function' && global.isMaterialBlockingTileV67(tx,ty)));
                if (open) global.queueBombJumpSequenceV67(bomb, dir.dx, dir.dy, 1, 180, tileSize * .18);
            }
        }
        return bomb;
    }

    function onBombExplodedV676(bomb) {
        const ps = ensureState();
        if (!ps || !active('AVALANCHE') || bomb?.owner !== 'player') return;
        if (bomb.avalancheBoostedV676) return;
        ps.avalancheExplosionCount = Number(ps.avalancheExplosionCount || 0) + 1;
        if (ps.avalancheExplosionCount >= 3) ps.avalancheReady = true;
    }

    function afterPlayerMovementV676() {
        // No modifica el mapa. Los power-ups universales no dependen de un material específico.
    }

    function update(dt = 16.6667) {
        const ps = ensureState();
        if (!ps) return;
        ps.gloveTimer = Math.max(0, Number(ps.gloveTimer || 0) - Math.max(0, Number(dt) || 0));
        const s = state();
        const enemies = Array.isArray(s?.enemies) ? s.enemies : [];
        if (active('HUNTER_MARK') && !ps.hunterMarked) {
            const candidate = enemies.find(enemy => enemy?.ai?.seesPlayer);
            if (candidate) {
                ps.hunterMarked = true;
                ps.markedEnemyId = candidate.__hunterMarkIdV676 || (candidate.__hunterMarkIdV676 = `hunter-${Math.random().toString(36).slice(2,9)}`);
                candidate.hunterMarkedV676 = true;
            }
        }
        if (active('SLOW_AURA')) {
            for (const enemy of enemies) {
                if (!enemy) continue;
                const px = player();
                const distance = px ? Math.abs(Math.floor(enemy.x / Number(global.TILE_SIZE || 48)) - Math.floor((px.x + px.width/2) / Number(global.TILE_SIZE || 48))) + Math.abs(Math.floor(enemy.y / Number(global.TILE_SIZE || 48)) - Math.floor((px.y + px.height/2) / Number(global.TILE_SIZE || 48))) : 999;
                enemy.gameplayPowerupSlowMultiplierV676 = distance <= 1 ? 0.85 : 1;
            }
        } else {
            for (const enemy of enemies) if (enemy) enemy.gameplayPowerupSlowMultiplierV676 = 1;
        }
    }

    function getEnemySpeedMultiplierV676(enemy) {
        return Number(enemy?.gameplayPowerupSlowMultiplierV676) || 1;
    }

    function onEnemyDefeatedV676(enemy) {
        if (!enemy || !active('HUNTER_MARK')) return false;
        if (!enemy.hunterMarkedV676) return false;
        const s = state();
        s.coins = Number(s.coins || 0) + 15;
        enemy.hunterMarkedV676 = false;
        const ps = ensureState();
        if (ps) { ps.hunterMarked = false; ps.markedEnemyId = null; }
        if (typeof global.addFloatingText === 'function') global.addFloatingText('+15¢ MARCA', enemy.x, enemy.y, '#facc15');
        return true;
    }

    function onDamageV676() {
        const p = player();
        if (!p || !active('ACID_FLASK') || typeof global.materialDepositV60 !== 'function') return false;
        const x = Math.floor((p.x + p.width / 2) / Number(global.TILE_SIZE || 48));
        const y = Math.floor((p.y + p.height / 2) / Number(global.TILE_SIZE || 48));
        return !!global.materialDepositV60('acid', x, y, 85, { source:'acid-flask', lifeMs:6800 });
    }

    function getMaterialHighlightStateV676() {
        const ps = ensureState();
        return { active: active('ALCHEMIST_GLOVE'), remainingMs: Number(ps?.gloveTimer || 0) };
    }

    function resetV676() {
        const s = state();
        if (s) delete s.gameplayPowerupsV676;
    }

    function getCatalogV676() {
        return Object.freeze(Object.fromEntries(Object.entries(META).map(([id,meta]) => [id,{...meta,status:'implemented'}])));
    }

    function auditV676() {
        const errors = [];
        const s = state();
        const p = player();
        const ids = Object.keys(META);
        if (new Set(ids).size !== ids.length) errors.push('IDs duplicados');
        for (const id of ids) if (!META[id]?.implemented) errors.push(`${id} no implementado`);
        if (!s) errors.push('Estado ausente');
        if (!p) errors.push('Jugador ausente');
        if (s && p) {
            if (!Number.isFinite(Number(p.maxBombs)) || p.maxBombs < 1) errors.push('maxBombs inválido');
            if (!Number.isFinite(Number(p.bombRange)) || p.bombRange < 1) errors.push('bombRange inválido');
            if (Number(p.bombsPlaced) !== Number((s.bombs || []).filter(Boolean).filter(b => b.countsTowardPlayerCapacity !== false).length)) errors.push('bombsPlaced no coincide con bombas activas');
            const occupied = new Set();
            for (const b of (s.bombs || [])) {
                const key = `${b.x},${b.y}`;
                if (occupied.has(key)) errors.push(`bombas duplicadas en ${key}`);
                occupied.add(key);
                if (b.x < 0 || b.y < 0 || b.x >= s.gridWidth || b.y >= s.gridHeight) errors.push('bomba fuera del grid');
            }
            for (const e of (s.enemies || [])) if (e && (!Number.isFinite(e.x) || !Number.isFinite(e.y))) errors.push('enemigo con coordenadas inválidas');
        }
        return Object.freeze({ version:VERSION, valid:errors.length===0, errors, powerups:ids.length });
    }

    global.GAMEPLAY_POWERUPS_V676 = POWERUPS;
    global.GAMEPLAY_POWERUP_DEFS_V676 = META;
    global.GAMEPLAY_POWERUP_RARITY_COLORS_V676 = RARITY_COLORS;
    global.applyGameplayPowerupV676 = apply;
    global.isGameplayPowerupActiveV676 = active;
    global.getGameplayPowerupIdsV676 = () => Object.keys(META);
    global.getGameplayPowerupCatalogV676 = getCatalogV676;
    global.getGameplayPowerupMovementModifiersV676 = () => ({ acceleration:1, braking:1, turnCarry:1, speedMultiplier:1, inputBufferMultiplier:1 });
    global.getGameplayPowerupBombModifiersV676 = getBombModifiersV676;
    global.applyGameplayPowerupToBombV676 = applyBombModifiersV676;
    global.gameplayPowerupOnBombExplodedV676 = onBombExplodedV676;
    global.gameplayPowerupAfterPlayerMovementV676 = afterPlayerMovementV676;
    global.gameplayPowerupUpdateV676 = update;
    global.getGameplayPowerupEnemySpeedMultiplierV676 = getEnemySpeedMultiplierV676;
    global.gameplayPowerupOnEnemyDefeatedV676 = onEnemyDefeatedV676;
    global.gameplayPowerupOnDamageV676 = onDamageV676;
    global.getGameplayPowerupMaterialHighlightStateV676 = getMaterialHighlightStateV676;
    global.resetGameplayPowerupsV676 = resetV676;
    global.auditGameplayPowerupsV676 = auditV676;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getGameplayPowerups = getCatalogV676;
    global.BOMBER_ENGINE.getGameplayPowerupIds = () => Object.keys(META);
    global.BOMBER_ENGINE.getGameplayPowerupState = () => ensureState();
    global.BOMBER_ENGINE.validateGameplayPowerups = auditV676;
})(window);
