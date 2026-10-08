// Bomberman Roguelike v6.20.0 — Biomas vivos.
// Una capa común: cada bioma modifica una regla sistémica sin crear una IA paralela.
(function installLivingBiomesV620(global) {
    'use strict';

    const RULES = Object.freeze({
        winter: Object.freeze({ id:'winter', label:'Frío e hielo', playerSpeed:0.90, bombFuseRate:0.78, bombMotion:0.90 }),
        autumn: Object.freeze({ id:'autumn', label:'Hojas y ocultamiento', leafCover:true }),
        spring: Object.freeze({ id:'spring', label:'Vegetación regenerativa', vegetationRegen:0.35 }),
        summer: Object.freeze({ id:'summer', label:'Calor', playerSpeed:0.96, bombFuseRate:1.10 }),
        underground: Object.freeze({ id:'underground', label:'Oscuridad', darkVision:false, playerVisionRadius:5 }),
        clouds: Object.freeze({ id:'clouds', label:'Viento y flotación', windStrength:0.34, bombWind:0.45 }),
        mountains: Object.freeze({ id:'mountains', label:'Empuje y estabilidad', windStrength:0.22, pushResistance:0.40 }),
        beach: Object.freeze({ id:'beach', label:'Agua y arena', sandSpeed:0.92, waterSpeed:0.88, bombWaterSlow:1.28 }),
        space: Object.freeze({ id:'space', label:'Ausencia de penalización terrestre', ignoreTerrainPenalty:true }),
        sky: Object.freeze({ id:'sky', label:'Altura y velocidad', altitudeSpeed:1.10, altitudeRatio:0.34 }),
        inferno: Object.freeze({ id:'inferno', label:'Lava y calor', playerSpeed:0.90, bombFuseRate:1.15, lavaDetonation:true })
    });

    function biomeId() {
        return String(global.gameState?.biomeOverrideV49 || global.gameState?.biomeV49?.id || global.getThemeV46?.()?.id || 'classic');
    }
    function rule() { return RULES[biomeId()] || null; }

    function tileOf(entity) {
        if (!entity) return null;
        if (typeof global.gridCurrentTile === 'function') return global.gridCurrentTile(entity, 'environment');
        const size = Number(global.TILE_SIZE || 48);
        return { x:Math.floor((Number(entity.x) + Number(entity.width || 0) / 2) / size), y:Math.floor((Number(entity.y) + Number(entity.height || 0) / 2) / size) };
    }

    function hasLiquid(entity, id = null) {
        const t = tileOf(entity);
        if (!t || typeof global.hasLiquidTileV631 !== 'function') return false;
        if (!global.hasLiquidTileV631(t.x, t.y)) return false;
        const cfg = typeof global.getLiquidKindV631 === 'function' ? global.getLiquidKindV631() : null;
        return !id || cfg?.id === id;
    }

    function isFoliage(entity) {
        if (biomeId() !== 'autumn' || !global.gameState?.grid) return false;
        const t = tileOf(entity);
        if (!t) return false;
        const g = global.gameState.grid;
        return [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => g[t.y+dy]?.[t.x+dx] === global.TYPES?.BLOCK);
    }

    function isHighAltitude(entity) {
        if (biomeId() !== 'sky') return false;
        const h = Math.max(1, Number(global.gameState?.gridHeight) || 1);
        const t = tileOf(entity);
        return !!t && t.y <= Math.max(1, h * RULES.sky.altitudeRatio);
    }

    function getPlayerMovementMultiplier(player) {
        const r = rule();
        if (!r) return 1;
        if (r.id === 'winter' || r.id === 'summer' || r.id === 'inferno') return r.playerSpeed;
        if (r.id === 'beach') return hasLiquid(player, 'sea') ? 1.12 : r.sandSpeed;
        if (r.id === 'space') return 1;
        if (r.id === 'sky' && isHighAltitude(player)) return r.altitudeSpeed;
        return 1;
    }

    function getEnemyMovementMultiplier(enemy) {
        const r = rule();
        if (!r) return 1;
        if (r.id === 'winter') return 0.96;
        if (r.id === 'summer' || r.id === 'inferno') return 1.02;
        if (r.id === 'clouds') return 1.03;
        if (r.id === 'beach') return hasLiquid(enemy, 'sea') ? 1.08 : 1;
        if (r.id === 'sky' && isHighAltitude(enemy)) return r.altitudeSpeed;
        return 1;
    }

    function getEnemyVisionRange(enemy) {
        const r = rule();
        if (!r || r.id !== 'underground') return null;
        if (typeof global.getEnemyBiomeSpeciesVisionRangeV615 === 'function') {
            const species = global.getEnemyBiomeSpeciesVisionRangeV615(enemy);
            return species;
        }
        return r.playerVisionRadius;
    }

    function getBombModifiers(bomb) {
        const r = rule();
        if (!r) return { fuseRate:1, motionMultiplier:1, instant:false };
        let fuseRate = r.bombFuseRate || 1;
        let motionMultiplier = r.bombMotion || 1;
        if (r.id === 'beach' && hasLiquid(bomb, 'sea')) motionMultiplier *= r.bombWaterSlow;
        if (r.id === 'clouds') motionMultiplier *= 1 / Math.max(0.4, 1 + r.bombWind * 0.15);
        return { fuseRate, motionMultiplier, instant:!!r.lavaDetonation && hasLiquid(bomb, 'lava') };
    }

    function getEnvironmentMovementMultiplier(entity) {
        const r = rule();
        if (!r) return 1;
        if (r.id === 'space') {
            let compensation = 1;
            const material = typeof global.getMaterialMovementModifiersV67 === 'function' ? global.getMaterialMovementModifiersV67(entity) : null;
            if (material?.speedMultiplier) compensation /= Math.max(0.35, Number(material.speedMultiplier) || 1);
            const liquid = typeof global.getBiomeLiquidPlayerEffectV631 === 'function' ? global.getBiomeLiquidPlayerEffectV631(entity) : null;
            if (liquid?.playerSpeed) compensation /= Math.max(0.35, Number(liquid.playerSpeed) || 1);
            return Math.min(2.2, compensation);
        }
        return 1;
    }

    function applyWind(entity, dt, strength = 1) {
        const r = rule();
        if (!r || !r.windStrength || !entity || entity._tileMoveActive) return;
        const frame = Math.max(0, Number(dt) || 0) / 16.6667;
        const phase = Math.sin((Number(global.gameState?.animFrame) || 0) * 0.035 + (Number(entity.x) || 0) * 0.012);
        const dir = phase >= 0 ? 1 : -1;
        entity.__biomeWindPushV620 = dir * r.windStrength * strength * frame;
    }

    function update(dt) {
        const state = global.gameState;
        if (!state?.isPlaying || state.paused) return;
        const r = rule();
        if (!r) return;
        if (r.id === 'spring') {
            for (const enemy of state.enemies || []) {
                if (!isFoliage(enemy)) continue;
                const maxHp = Math.max(1, Number(enemy.__effectHealthV64) || 3);
                enemy.__effectHealthV64 = Math.min(maxHp, maxHp + r.vegetationRegen * Math.max(0, Number(dt) || 0) / 1000);
            }
        }
        if (r.id === 'clouds' || r.id === 'mountains') {
            applyWind(global.player, dt, 1);
            for (const enemy of state.enemies || []) applyWind(enemy, dt, 0.65);
            for (const bomb of state.bombs || []) applyWind(bomb, dt, r.id === 'clouds' ? 1.25 : 0.7);
        }
    }

    function drawOverlay(ctx, width, height) {
        const r = rule();
        if (!r || !ctx) return;
        ctx.save();
        if (r.id === 'underground') {
            const grd = ctx.createRadialGradient(width/2, height/2, Math.min(width,height)*0.16, width/2, height/2, Math.max(width,height)*0.72);
            grd.addColorStop(0, 'rgba(0,0,0,0)');
            grd.addColorStop(1, 'rgba(0,0,0,0.48)');
            ctx.fillStyle = grd; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'winter') {
            ctx.fillStyle = 'rgba(220,245,255,0.045)'; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'summer' || r.id === 'inferno') {
            ctx.fillStyle = r.id === 'inferno' ? 'rgba(255,70,20,0.045)' : 'rgba(255,190,80,0.035)'; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'clouds' || r.id === 'mountains') {
            ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
            const offset = (Number(global.gameState?.animFrame) || 0) % 24;
            for (let y = 20 - offset; y < height; y += 34) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y-7); ctx.stroke(); }
        } else if (r.id === 'autumn') {
            ctx.fillStyle = 'rgba(190,120,45,0.025)'; ctx.fillRect(0,0,width,height);
        } else if (r.id === 'sky') {
            ctx.fillStyle = 'rgba(190,220,255,0.025)'; ctx.fillRect(0,0,width,height);
        }
        ctx.restore();
    }

    global.getLivingBiomeRuleV620 = rule;
    global.getLivingBiomePlayerMovementMultiplierV620 = getPlayerMovementMultiplier;
    global.getLivingBiomeEnemyMovementMultiplierV620 = getEnemyMovementMultiplier;
    global.getLivingBiomeEnemyVisionRangeV620 = getEnemyVisionRange;
    global.getLivingBiomeBombModifiersV620 = getBombModifiers;
    global.getLivingBiomeEnvironmentMovementMultiplierV620 = getEnvironmentMovementMultiplier;
    global.updateLivingBiomeV620 = update;
    global.drawLivingBiomeOverlayV620 = drawOverlay;
    global.isLivingBiomeFoliageV620 = isFoliage;
    global.BIOME_LIVING_RULES_V620 = RULES;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getLivingBiomeRule = rule;
})(window);
