// Bomberman Roguelike v6.7.4 — Winter Powerups Registry
// Catálogo central de power-ups de Invierno + hooks de la Ola 1.
// IMPORTANTE: este módulo NO activa Winter en el Test Lab. Solo aporta
// capacidades cuando el jugador recoge explícitamente uno de estos objetos.
(function installWinterPowerupsV674(global) {
    'use strict';

    const VERSION = '6.7.4';
    const IMPLEMENTED_WAVE = new Set([
        'CRAMPONS', 'FUR_COAT', 'THERMAL_CORE', 'ALCHEMIST_GLOVE', 'FROST_FUSE', 'SNOWBALL', 'FROZEN_TROPHY'
    ]);

    const WINTER_POWERUPS = Object.freeze({
        CRAMPONS: 'CRAMPONS', ICE_SKATES: 'ICE_SKATES', MAGNET_BOOTS: 'MAGNET_BOOTS', HEAVY_STEP: 'HEAVY_STEP',
        FUR_COAT: 'FUR_COAT', THERMAL_CORE: 'THERMAL_CORE', FROZEN_HEART: 'FROZEN_HEART', PORTABLE_BRAZIER: 'PORTABLE_BRAZIER',
        ALCHEMIST_GLOVE: 'ALCHEMIST_GLOVE', CATALYST: 'CATALYST', FREEZE_BOMB: 'FREEZE_BOMB', THAW_TOUCH: 'THAW_TOUCH', ACID_FLASK: 'ACID_FLASK',
        FROST_FUSE: 'FROST_FUSE', ICE_BLAST: 'ICE_BLAST', SNOWBALL: 'SNOWBALL', AVALANCHE: 'AVALANCHE', DUD_BOMB: 'DUD_BOMB',
        FROSTBITE_AURA: 'FROSTBITE_AURA', HUNTER_MARK: 'HUNTER_MARK', SNOW_BLIND: 'SNOW_BLIND', FROZEN_TROPHY: 'FROZEN_TROPHY', PREY_SCENT: 'PREY_SCENT',
        SNOW_GLOBE: 'SNOW_GLOBE', WINTER_CROWN: 'WINTER_CROWN', FIRST_SNOW: 'FIRST_SNOW', LONG_WINTER: 'LONG_WINTER', ICE_AGE: 'ICE_AGE'
    });

    const META = Object.freeze({
        CRAMPONS: { id:'CRAMPONS', name:'GRAMPONES', icon:'🥾', rarity:'COMMON', category:'MOVIMIENTO', desc:'Ignoran el resbalón de ice; slick_ice sigue afectando.', implemented:true },
        ICE_SKATES: { id:'ICE_SKATES', name:'PATINES DE HIELO', icon:'⛸', rarity:'RARE', category:'MOVIMIENTO', desc:'+20% velocidad sobre ice/slick_ice; -10% fuera.', implemented:false },
        MAGNET_BOOTS: { id:'MAGNET_BOOTS', name:'BOTAS MAGNÉTICAS', icon:'🧲', rarity:'EPIC', category:'MOVIMIENTO', desc:'Anulan todo resbalón y el impulso del deslizamiento.', implemented:false },
        HEAVY_STEP: { id:'HEAVY_STEP', name:'PISADA PESADA', icon:'🦶', rarity:'CURSED', category:'MOVIMIENTO', desc:'Cada paso deja packed_ice en la celda anterior.', implemented:false },
        FUR_COAT: { id:'FUR_COAT', name:'ABRIGO DE PIEL', icon:'🧥', rarity:'COMMON', category:'TEMPERATURA', desc:'El frío acumulativo tarda 50% más en afectarte.', implemented:true },
        THERMAL_CORE: { id:'THERMAL_CORE', name:'NÚCLEO TÉRMICO', icon:'🔥', rarity:'RARE', category:'TEMPERATURA', desc:'Emitís calor; el hielo cercano se derrite lentamente.', implemented:true },
        FROZEN_HEART: { id:'FROZEN_HEART', name:'CORAZÓN CONGELADO', icon:'❄', rarity:'EPIC', category:'TEMPERATURA', desc:'Inmunidad al frío; las fuentes de calor no te curan.', implemented:false },
        PORTABLE_BRAZIER: { id:'PORTABLE_BRAZIER', name:'BRASERO PORTÁTIL', icon:'🕯', rarity:'RARE', category:'TEMPERATURA', desc:'Permite colocar un brasero temporal.', implemented:false },
        ALCHEMIST_GLOVE: { id:'ALCHEMIST_GLOVE', name:'GUANTE DE ALQUIMISTA', icon:'🧤', rarity:'COMMON', category:'ALQUIMIA', desc:'Revela visualmente materiales cercanos durante 3 s.', implemented:true },
        CATALYST: { id:'CATALYST', name:'CATALIZADOR', icon:'⚗', rarity:'RARE', category:'ALQUIMIA', desc:'Duplica el material residual de tus bombas.', implemented:false },
        FREEZE_BOMB: { id:'FREEZE_BOMB', name:'BOMBA DE CONGELACIÓN', icon:'🧊', rarity:'RARE', category:'ALQUIMIA', desc:'Tus bombas dejan slick_ice.', implemented:false },
        THAW_TOUCH: { id:'THAW_TOUCH', name:'TOQUE DE DESHIELO', icon:'💧', rarity:'COMMON', category:'ALQUIMIA', desc:'packed_ice bajo tus pies se convierte en water.', implemented:false },
        ACID_FLASK: { id:'ACID_FLASK', name:'FRASCO DE ÁCIDO', icon:'🧪', rarity:'CURSED', category:'ALQUIMIA', desc:'Al recibir daño, dejás acid en tu celda.', implemented:false },
        FROST_FUSE: { id:'FROST_FUSE', name:'MECHA ESCARCHADA', icon:'⏱', rarity:'COMMON', category:'BOMBAS', desc:'Tus bombas tardan 30% más en explotar.', implemented:true },
        ICE_BLAST: { id:'ICE_BLAST', name:'ESTALLIDO GÉLIDO', icon:'💥', rarity:'RARE', category:'BOMBAS', desc:'Tus explosiones no destruyen bloques y generan hielo.', implemented:false },
        SNOWBALL: { id:'SNOWBALL', name:'BOLA DE NIEVE', icon:'⚪', rarity:'RARE', category:'BOMBAS', desc:'Al colocar una bomba, se desliza 1 celda en la dirección del input.', implemented:true },
        AVALANCHE: { id:'AVALANCHE', name:'AVALANCHA', icon:'🏔', rarity:'EPIC', category:'BOMBAS', desc:'Cada 3 explosiones, la siguiente duplica su radio.', implemented:false },
        DUD_BOMB: { id:'DUD_BOMB', name:'BOMBA FALLIDA', icon:'💣', rarity:'CURSED', category:'BOMBAS', desc:'20% de bombas no explotan y se convierten en packed_ice.', implemented:false },
        FROSTBITE_AURA: { id:'FROSTBITE_AURA', name:'AURA DE CONGELACIÓN', icon:'🥶', rarity:'RARE', category:'ENEMIGOS', desc:'Enemigos cercanos se mueven 15% más lento.', implemented:false },
        HUNTER_MARK: { id:'HUNTER_MARK', name:'MARCA DEL CAZADOR', icon:'🎯', rarity:'COMMON', category:'ENEMIGOS', desc:'El primer enemigo que te ve queda marcado; al matarlo, +15 monedas.', implemented:false },
        SNOW_BLIND: { id:'SNOW_BLIND', name:'CEGUERA DE NIEVE', icon:'🌫', rarity:'RARE', category:'ENEMIGOS', desc:'Durante la ventisca, los enemigos tardan el doble en verte.', implemented:false },
        FROZEN_TROPHY: { id:'FROZEN_TROPHY', name:'TROFEO CONGELADO', icon:'🏆', rarity:'EPIC', category:'ENEMIGOS', desc:'Los enemigos eliminados dejan ice.', implemented:true },
        PREY_SCENT: { id:'PREY_SCENT', name:'RASTRO DE PRESA', icon:'🩸', rarity:'CURSED', category:'ENEMIGOS', desc:'Enemigos te siguen con más precisión; su target queda visible.', implemented:false },
        SNOW_GLOBE: { id:'SNOW_GLOBE', name:'BOLA DE NIEVE MÁGICA', icon:'🔮', rarity:'EPIC', category:'ESPECÍFICO', desc:'Una vez por run, evita Game Over y revive tras 5 s con 1 vida.', implemented:false },
        WINTER_CROWN: { id:'WINTER_CROWN', name:'CORONA DE INVIERNO', icon:'👑', rarity:'EPIC', category:'ESPECÍFICO', desc:'Inmunidad a ice/slick_ice/water a cambio de -15% velocidad.', implemented:false },
        FIRST_SNOW: { id:'FIRST_SNOW', name:'PRIMERA NIEVE', icon:'🌨', rarity:'RARE', category:'ESPECÍFICO', desc:'La primera explosión de cada sala genera slick_ice.', implemented:false },
        LONG_WINTER: { id:'LONG_WINTER', name:'LARGO INVIERNO', icon:'🕰', rarity:'CURSED', category:'ESPECÍFICO', desc:'Cada 30 s pierde 1 vida máxima y gana +1 rango, hasta 3.', implemented:false },
        ICE_AGE: { id:'ICE_AGE', name:'ERA DE HIELO', icon:'🧊', rarity:'CURSED', category:'ESPECÍFICO', desc:'Las celdas pisadas se convierten en ice durante 2 s.', implemented:false }
    });

    const RARITY_COLORS = Object.freeze({ COMMON:'#94a3b8', RARE:'#60a5fa', EPIC:'#c084fc', CURSED:'#f87171' });

    function state() { return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }
    function player() { return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }

    function ensureState() {
        const s = state();
        if (!s) return null;
        if (!s.winterPowerupsV67 || typeof s.winterPowerupsV67 !== 'object') {
            s.winterPowerupsV67 = { active:Object.create(null), pickups:Object.create(null), coldExposureMultiplier:1, thermalTimer:0, gloveTimer:0, avalancheExplosions:0, snowGlobeUsed:false, longWinterTimer:30000, longWinterStacks:0 };
        }
        return s.winterPowerupsV67;
    }

    function active(id) { return !!ensureState()?.active?.[String(id)]; }

    function apply(id) {
        const meta = META[String(id)];
        const p = player();
        const s = state();
        const ps = ensureState();
        if (!meta || !p || !ps) return false;

        const key = String(id);
        ps.active[key] = true;
        ps.pickups[key] = Number(ps.pickups[key] || 0) + 1;

        // Re-pickup re-arms the finite/passive timers used by the real effect.
        if (key === 'ALCHEMIST_GLOVE') ps.gloveTimer = 3000;
        if (key === 'SNOW_GLOBE') ps.snowGlobeUsed = false;
        if (key === 'AVALANCHE') ps.avalancheExplosions = 0;
        if (key === 'LONG_WINTER') { ps.longWinterTimer = 30000; ps.longWinterStacks = 0; }

        if (typeof global.addFloatingText === 'function') {
            const color = RARITY_COLORS[meta.rarity] || '#cbd5e1';
            global.addFloatingText(meta.implemented ? meta.name : `REGISTRADO · ${meta.name}`, p.x, p.y, color);
        }
        if (s?.testLabV673?.active && !meta.implemented && typeof global.updateUI === 'function') {
            global.updateUI(true);
        }
        return true;
    }

    function getMovementModifiers(entity) {
        const ps = ensureState();
        const result = { acceleration:1, braking:1, turnCarry:1, speedMultiplier:1, inputBufferMultiplier:1 };
        if (!ps || entity !== player()) return result;
        const residue = typeof global.getResidueAtTileV67 === 'function'
            ? global.getResidueAtTileV67(Math.floor((entity.x + entity.width / 2) / TILE_SIZE), Math.floor((entity.y + entity.height / 2) / TILE_SIZE))
            : null;
        const material = residue?.type || null;
        const ice = material === 'ice' || material === 'slick_ice';
        if (active('CRAMPONS') && material === 'ice') {
            result.acceleration = 1;
            result.braking = 1;
            result.turnCarry = 1;
        }
        if (IMPLEMENTED_WAVE.has('MAGNET_BOOTS') && active('MAGNET_BOOTS')) {
            result.acceleration = 1;
            result.braking = 1;
            result.turnCarry = 1;
        }
        if (IMPLEMENTED_WAVE.has('ICE_SKATES') && active('ICE_SKATES')) result.speedMultiplier *= ice ? 1.20 : 0.90;
        
        return result;
    }

    function getColdExposureMultiplierV67() {
        if (active('FUR_COAT')) return 0.5;
        return 1;
    }

    function blocksColdV67() { return IMPLEMENTED_WAVE.has('FROZEN_HEART') && active('FROZEN_HEART'); }
    function blocksHeatHealingV67() { return IMPLEMENTED_WAVE.has('FROZEN_HEART') && active('FROZEN_HEART'); }

    function getBombModifiersV67(bomb = {}) {
        const result = { fuseMultiplier:1, materialOverride:null, residualAmountMultiplier:1, noBlockDamage:false, dudChance:0, rangeMultiplier:1 };
        if (!active('FROST_FUSE')) result.fuseMultiplier = 1;
        else result.fuseMultiplier *= 1.30;
        
        return result;
    }

    function applyBombModifiersV67(bomb) {
        if (!bomb || bomb.owner !== 'player') return bomb;
        const dir = typeof global.getBombKickDirectionV67 === 'function' ? global.getBombKickDirectionV67() : { dx:0, dy:0 };
        const mods = getBombModifiersV67(bomb);
        bomb.winterPowerupModifiersV67 = mods;
        if (mods.materialOverride) bomb.materialOverrideV67 = mods.materialOverride;
        if (mods.noBlockDamage) bomb.noBlockDamageV67 = true;
        if (mods.dudChance > 0) bomb.dudChanceV67 = mods.dudChance;
        if (active('SNOWBALL') && (dir.dx || dir.dy)) {
            const distance = 1;
            const targetX = bomb.x + dir.dx;
            const targetY = bomb.y + dir.dy;
            const row = global.gameState?.grid?.[targetY];
            const finalOpen = row && targetX >= 0 && targetY >= 0 && targetX < global.gameState.gridWidth && targetY < global.gameState.gridHeight && row[targetX] !== global.TYPES.WALL && row[targetX] !== global.TYPES.BLOCK && !(typeof global.getResidueAtTileV67 === 'function' && global.isMaterialBlockingTileV67?.(targetX,targetY));
            if (finalOpen && typeof global.queueBombJumpSequenceV67 === 'function') {
                global.queueBombJumpSequenceV67(bomb, dir.dx, dir.dy, distance, 180, TILE_SIZE * 0.18);
            }
        }
        return bomb;
    }

    function afterPlayerMovementV67(previousX, previousY) {
        const p = player();
        const ps = ensureState();
        if (!p || !ps) return;
        const prevCell = { x: Math.floor((previousX + p.width / 2) / TILE_SIZE), y: Math.floor((previousY + p.height / 2) / TILE_SIZE) };
        const nextCell = { x: Math.floor((p.x + p.width / 2) / TILE_SIZE), y: Math.floor((p.y + p.height / 2) / TILE_SIZE) };
        if (prevCell.x === nextCell.x && prevCell.y === nextCell.y) return;
        if ((IMPLEMENTED_WAVE.has('HEAVY_STEP') && active('HEAVY_STEP')) || (IMPLEMENTED_WAVE.has('ICE_AGE') && active('ICE_AGE'))) {
            const ttl = (IMPLEMENTED_WAVE.has('ICE_AGE') && active('ICE_AGE')) ? 2000 : 3000;
            if (IMPLEMENTED_WAVE.has('HEAVY_STEP') && active('HEAVY_STEP') && typeof global.materialDepositV60 === 'function') {
                global.materialDepositV60('packed_ice', prevCell.x, prevCell.y, 100, { source:'winter-powerup', lifeMs:ttl });
            } else if (IMPLEMENTED_WAVE.has('ICE_AGE') && active('ICE_AGE') && typeof global.materialDepositV60 === 'function') {
                global.materialDepositV60('ice', prevCell.x, prevCell.y, 100, { source:'winter-powerup', lifeMs:ttl });
            }
        }
        if (IMPLEMENTED_WAVE.has('THAW_TOUCH') && active('THAW_TOUCH') && typeof global.getResidueAtTileV67 === 'function' && typeof global.materialDepositV60 === 'function') {
            const residue = global.getResidueAtTileV67(nextCell.x, nextCell.y);
            if (residue?.type === 'packed_ice') global.materialDepositV60('water', nextCell.x, nextCell.y, 70, { source:'winter-powerup', lifeMs:3000 });
        }
    }

    function thermalUpdate(dt) {
        const ps = ensureState();
        const p = player();
        if (!ps || !p) return;
        ps.gloveTimer = Math.max(0, Number(ps.gloveTimer || 0) - dt);
        if (active('THERMAL_CORE')) {
            ps.thermalTimer = Math.max(0, Number(ps.thermalTimer || 0) - dt);
            if (ps.thermalTimer <= 0) {
                ps.thermalTimer = 700;
                const cx = Math.floor((p.x + p.width / 2) / TILE_SIZE);
                const cy = Math.floor((p.y + p.height / 2) / TILE_SIZE);
                const targets = [{x:cx+1,y:cy},{x:cx-1,y:cy},{x:cx,y:cy+1},{x:cx,y:cy-1}];
                for (const cell of targets) {
                    const residue = typeof global.getResidueAtTileV67 === 'function' ? global.getResidueAtTileV67(cell.x,cell.y) : null;
                    if (!residue || !['ice','slick_ice'].includes(residue.type)) continue;
                    if (typeof global.materialRemoveAtV60 === 'function') global.materialRemoveAtV60(cell.x, cell.y);
                    if (typeof global.materialDepositV60 === 'function') global.materialDepositV60('water', cell.x, cell.y, 70, { source:'thermal-core', lifeMs:3000 });
                }
            }
        }
    }

    function onEnemyDefeatedV67(enemy) {
        if (!enemy) return false;
        if (active('FROZEN_TROPHY') && typeof global.materialDepositV60 === 'function') {
            const x = Math.floor(Number(enemy.x) / TILE_SIZE);
            const y = Math.floor(Number(enemy.y) / TILE_SIZE);
            global.materialDepositV60('ice', x, y, 70, { source:'frozen-trophy', lifeMs:4000 });
        }
        return true;
    }

    function onDamageV67() {
        const p = player();
        if (!p) return;
        if (IMPLEMENTED_WAVE.has('ACID_FLASK') && active('ACID_FLASK') && typeof global.materialDepositV60 === 'function') {
            const x = Math.floor((p.x + p.width / 2) / TILE_SIZE);
            const y = Math.floor((p.y + p.height / 2) / TILE_SIZE);
            global.materialDepositV60('acid', x, y, 85, { source:'acid-flask', lifeMs:6800 });
        }
    }

    function getCatalogV67() {
        return Object.freeze(Object.fromEntries(Object.entries(META).map(([id, meta]) => [id, { ...meta, status: meta.implemented ? 'implemented' : 'registered' }] )));
    }

    function resetV67() {
        const s = state();
        if (s) delete s.winterPowerupsV67;
    }

    global.WINTER_POWERUPS_V67 = WINTER_POWERUPS;
    global.WINTER_POWERUP_DEFS_V67 = META;
    global.WINTER_POWERUP_RARITY_COLORS_V67 = RARITY_COLORS;
    global.applyWinterPowerupV67 = apply;
    global.isWinterPowerupActiveV67 = active;
    global.getWinterPowerupMovementModifiersV67 = getMovementModifiers;
    global.getWinterPowerupColdExposureMultiplierV67 = getColdExposureMultiplierV67;
    global.winterPowerupBlocksColdV67 = blocksColdV67;
    global.winterPowerupBlocksHeatHealingV67 = blocksHeatHealingV67;
    global.getWinterPowerupBombModifiersV67 = getBombModifiersV67;
    global.applyWinterPowerupToBombV67 = applyBombModifiersV67;
    global.winterPowerupAfterPlayerMovementV67 = afterPlayerMovementV67;
    global.winterPowerupUpdateV67 = thermalUpdate;
    global.winterPowerupOnEnemyDefeatedV67 = onEnemyDefeatedV67;
    global.winterPowerupOnDamageV67 = onDamageV67;
    global.getWinterPowerupCatalogV67 = getCatalogV67;
    global.resetWinterPowerupsV67 = resetV67;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getWinterPowerups = getCatalogV67;
    global.BOMBER_ENGINE.getWinterPowerupIds = () => Object.keys(META);
    global.BOMBER_ENGINE.getWinterPowerupState = () => ensureState();
    global.BOMBER_ENGINE.resetWinterPowerups = resetV67;
    global.BOMBER_ENGINE.getWinterPowerupWave = () => VERSION;
})(window);
