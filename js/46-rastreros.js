// BOMBERMAN ROGUELIKE v6.30.0 — Habilidades únicas de los once RASTRERO.
// Este módulo amplía las autoridades existentes de IA, movimiento, combate y Canvas.
// No crea una IA paralela ni utiliza gameState.grid para almacenar efectos temporales.
(function installRastreroAbilitiesV630(global) {
    'use strict';

    // Los efectos de suelo son overlays temporales: no sustituyen gameState.grid.
    // Se expone el tipo para que otros sistemas puedan identificar la casilla.
    const TILE_TYPES = Object.freeze({
        ...(global.TILE_TYPES && typeof global.TILE_TYPES === 'object' ? global.TILE_TYPES : {}),
        ICE_TRAIL: 'ICE_TRAIL'
    });
    global.TILE_TYPES = TILE_TYPES;

    const ICE_TRAIL_DURATION_MS = 2500;
    const FRICTION_ICE = 0.88;
    const ICE_MOMENTUM_STOP_THRESHOLD = 0.12;
    const ICE_COUNTER_STRENGTH = 0.55;

    const SPECIES_ABILITIES = Object.freeze({
        winter_ice_wolf: 'ice_trail',
        autumn_boar: 'boar_charge',
        spring_frog: 'frog_leap',
        summer_lizard: 'lizard_camouflage',
        underground_mole: 'mole_burrow',
        clouds_cloud_creature: 'cloud_ethereal',
        mountains_mountain_goat: 'goat_stomp',
        beach_crab: 'crab_shell',
        space_alien_insect: 'alien_acid',
        sky_celestial_being: 'cherub_aura',
        inferno_hellhound: 'hellhound_ember'
    });

    const DIRS = Object.freeze([
        Object.freeze({ x: 0, y: -1, name: 'up', axis: 'y', dir: -1 }),
        Object.freeze({ x: 0, y: 1, name: 'down', axis: 'y', dir: 1 }),
        Object.freeze({ x: -1, y: 0, name: 'left', axis: 'x', dir: -1 }),
        Object.freeze({ x: 1, y: 0, name: 'right', axis: 'x', dir: 1 })
    ]);

    const runtime = {
        clock: 0,
        frameScale: 1,
        roomKey: '',
        ice: new Map(),
        acid: new Map(),
        fire: new Map(),
        seenExplosions: new Map(),
        blastMeta: new Map(),
        pulseSerial: 0
    };

    function getState() {
        return global.BOMBER_ENGINE?.getState?.()
            || global.gameState
            || (typeof gameState !== 'undefined' ? gameState : null);
    }

    function getPlayer() {
        return global.BOMBER_ENGINE?.getPlayer?.()
            || global.player
            || (typeof player !== 'undefined' ? player : null);
    }

    function getTileSize() {
        return Number(global.BOMBER_ENGINE?.getTileSize?.() || global.TILE_SIZE || (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 48)) || 48;
    }

    function getTypes() {
        return global.BOMBER_ENGINE?.getWorldTypes?.()
            || global.TYPES
            || (typeof TYPES !== 'undefined' ? TYPES : {});
    }

    function getAbilityId(enemy) {
        if (!enemy) return null;
        return enemy.abilityIdV630 || SPECIES_ABILITIES[enemy.speciesIdV626] || null;
    }

    function isRastrero(enemy) {
        return !!getAbilityId(enemy);
    }

    function tileOf(entity, kind = null) {
        if (!entity) return { x: -1, y: -1 };
        const s = getState();
        const tile = getTileSize();
        const resolvedKind = kind || (entity.__gridAnchor === 'center' ? 'enemy' : 'player');
        if (typeof global.gridCurrentTile === 'function') {
            try { return global.gridCurrentTile(entity, resolvedKind); } catch (_) {}
        }
        if (resolvedKind === 'player') {
            return { x: Math.floor((entity.x + entity.width / 2) / tile), y: Math.floor((entity.y + entity.height / 2) / tile) };
        }
        return { x: Math.floor(entity.x / tile), y: Math.floor(entity.y / tile) };
    }

    function tileKey(x, y) { return `${Math.floor(x)},${Math.floor(y)}`; }
    function isInside(x, y) {
        const s = getState();
        return !!s && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < s.gridWidth && y < s.gridHeight;
    }

    function roomKeyForState() {
        const s = getState();
        if (!s) return 'no-state';
        const biome = s.biomeOverrideV49 || s.biomeV49?.id || global.getBiomeForDepthV49?.(s.level || 1)?.id || 'unknown';
        return `${s.level || 1}:${s.roomType?.id || 'unknown'}:${biome}:${s.gridWidth || 0}x${s.gridHeight || 0}`;
    }

    function ensureRoomState() {
        const key = roomKeyForState();
        if (runtime.roomKey === key) return;
        runtime.roomKey = key;
        runtime.ice.clear();
        runtime.acid.clear();
        runtime.fire.clear();
        runtime.seenExplosions.clear();
        runtime.blastMeta.clear();
        const p = getPlayer();
        if (p) {
            p.__rastreroSlowTimerV630 = 0;
            p.__rastreroAcidLastTileV630 = null;
            p.__rastreroIceMomentumV630 = null;
            p.__rastreroIceCoastingV630 = false;
            p.__rastreroIceSurfaceActiveV630 = false;
        }
    }

    function addTimedTile(map, x, y, durationMs, kind) {
        const s = getState();
        if (!s || !isInside(x, y)) return;
        const key = tileKey(x, y);
        map.set(key, {
            x, y,
            kind,
            createdAt: runtime.clock,
            durationMs,
            expiresAt: runtime.clock + durationMs
        });
    }

    function effectAt(map, x, y) {
        const effect = map.get(tileKey(x, y));
        return effect && effect.expiresAt > runtime.clock ? effect : null;
    }

    function cleanupEffects() {
        for (const map of [runtime.ice, runtime.acid, runtime.fire]) {
            for (const [key, effect] of map) {
                if (!effect || effect.expiresAt <= runtime.clock) map.delete(key);
            }
        }
        for (const [id, meta] of runtime.blastMeta) {
            if (runtime.clock - meta.createdAt > 8000) runtime.blastMeta.delete(id);
        }
    }

    function resetTransientStateV630() {
        runtime.roomKey = '';
        runtime.clock = 0;
        runtime.pulseSerial = 0;
        runtime.ice.clear();
        runtime.acid.clear();
        runtime.fire.clear();
        runtime.seenExplosions.clear();
        runtime.blastMeta.clear();
        const p = getPlayer();
        if (p) {
            p.__rastreroSlowTimerV630 = 0;
            p.__rastreroAcidLastTileV630 = null;
            p.__rastreroIceMomentumV630 = null;
            p.__rastreroIceCoastingV630 = false;
            p.__rastreroIceSurfaceActiveV630 = false;
        }
    }

    function installLevelResetHook() {
        const baseInitLevel = global.initLevel;
        if (typeof baseInitLevel !== 'function' || baseInitLevel.__rastreroV630ResetWrapped) return;
        const wrappedInitLevel = function initLevelWithRastreroResetV630(...args) {
            // Los efectos del nivel anterior nunca se arrastran a otro mapa/run,
            // incluso si la nueva sala reutiliza profundidad y dimensiones.
            resetTransientStateV630();
            const result = baseInitLevel.apply(this, args);
            runtime.roomKey = '';
            return result;
        };
        wrappedInitLevel.__rastreroV630ResetWrapped = true;
        global.initLevel = wrappedInitLevel;
    }

    function ensureEnemyState(enemy) {
        if (!enemy || !isRastrero(enemy)) return null;
        if (!enemy.__rastreroV630) {
            enemy.__rastreroV630 = {
                lastTile: null,
                lastBlastId: null,
                shellIntact: getAbilityId(enemy) === 'crab_shell',
                chargeState: 'idle',
                chargeCooldownMs: 1400 + Math.random() * 1000,
                chargeTelegraphMs: 0,
                chargeTravelTiles: 0,
                chargeDirection: null,
                chargeRecoverMs: 0,
                chargeStepOrigin: null,
                frogJumpCooldownMs: 2100 + Math.random() * 1200,
                frogJumpMs: 0,
                frogJumpDurationMs: 280,
                frogJumpFrom: null,
                frogJumpTo: null,
                moleBuriedMs: 0,
                moleSavedBlastId: null,
                goatCooldownMs: 2000 + Math.random() * 1100,
                goatTelegraphMs: 0,
                goatEffectMs: 0,
                cherubCooldownMs: 4350,
                cherubTelegraphMs: 0,
                cherubPulseMs: 0,
                hellhoundBoostMs: 0
            };
        }
        const a = enemy.__rastreroV630;
        if (!a.lastTile) a.lastTile = tileOf(enemy, 'enemy');
        return a;
    }

    function isEnemyBuried(enemy) {
        return Number(enemy?.__rastreroV630?.moleBuriedMs || 0) > 0;
    }

    function isTileSolid(x, y) {
        if (!isInside(x, y)) return true;
        const s = getState();
        const types = getTypes();
        const value = s.grid?.[y]?.[x];
        return value === types.WALL || value === types.BLOCK;
    }

    function bombAt(x, y, ignoredBomb = null) {
        const s = getState();
        return s?.bombs?.find(b => b && b !== ignoredBomb && b.x === x && b.y === y && b.state !== 'moving' && b.state !== 'carried') || null;
    }

    function explosionAt(x, y) {
        const s = getState();
        return !!s?.explosions?.some(exp => exp && exp.x === x && exp.y === y);
    }

    function entityAt(x, y, ignoredEntity = null) {
        const s = getState();
        const p = getPlayer();
        if (p && p !== ignoredEntity) {
            const pt = tileOf(p, 'player');
            if (pt.x === x && pt.y === y) return true;
        }
        for (const enemy of s?.enemies || []) {
            if (!enemy || enemy === ignoredEntity || isEnemyBuried(enemy)) continue;
            const et = tileOf(enemy, 'enemy');
            if (et.x === x && et.y === y) return true;
        }
        return false;
    }

    function isSafeTile(x, y, ignoredEntity = null, ignoredBomb = null) {
        const s = getState();
        if (!s || !isInside(x, y) || isTileSolid(x, y)) return false;
        const types = getTypes();
        const tileValue = s.grid?.[y]?.[x];
        if (tileValue === types.EXIT_LOCKED) return false;
        if (bombAt(x, y, ignoredBomb) || explosionAt(x, y) || entityAt(x, y, ignoredEntity)) return false;
        return true;
    }

    function isCenteredOnTile(entity) {
        if (!entity || entity._tileMoveActive) return false;
        if (typeof global.gridIsNearTileCenter === 'function') return global.gridIsNearTileCenter(entity, 1.5);
        const t = tileOf(entity, 'enemy');
        const size = getTileSize();
        return Math.abs(entity.x - (t.x + 0.5) * size) < 1.5 && Math.abs(entity.y - (t.y + 0.5) * size) < 1.5;
    }

    function tileDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function lineClear(a, b) {
        if (a.x !== b.x && a.y !== b.y) return false;
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        let x = a.x + dx, y = a.y + dy;
        while (x !== b.x || y !== b.y) {
            if (isTileSolid(x, y)) return false;
            x += dx; y += dy;
        }
        return true;
    }

    function tileHasCover(enemy) {
        const tile = tileOf(enemy, 'enemy');
        return DIRS.some(dir => isTileSolid(tile.x + dir.x, tile.y + dir.y));
    }

    function isLizardCamouflaged(enemy) {
        if (getAbilityId(enemy) !== 'lizard_camouflage' || !tileHasCover(enemy)) return false;
        const eTile = tileOf(enemy, 'enemy');
        const pTile = tileOf(getPlayer(), 'player');
        if (tileDistance(eTile, pTile) <= 2) return false;
        const sharesOpenCorridor = (eTile.x === pTile.x || eTile.y === pTile.y) && lineClear(eTile, pTile);
        return !sharesOpenCorridor;
    }

    function getPlayerSpeedFactor(entity) {
        const p = entity || getPlayer();
        if (!p) return 1;
        let factor = Number(p.__rastreroSlowTimerV630 || 0) > 0 ? 0.50 : 1;
        // Al soltar controles sobre hielo, la fuerza de inercia cae con FRICTION_ICE.
        // El límite inferior solo se aplica al tramo entre centros; nunca permite
        // atravesar paredes ni deja al jugador detenido en mitad de una casilla.
        if (p.__rastreroIceCoastingV630 && p.__rastreroIceSurfaceActiveV630) {
            const momentum = p.__rastreroIceMomentumV630;
            const strength = Math.max(0, Math.min(1, Number(momentum?.strength) || 0));
            factor *= Math.max(0.35, strength);
        }
        return Math.max(0.35, factor);
    }

    function applyPlayerSlow(durationMs = 800) {
        const p = getPlayer();
        if (!p) return;
        p.__rastreroSlowTimerV630 = Math.max(Number(p.__rastreroSlowTimerV630 || 0), durationMs);
    }

    function directionByName(name) {
        return DIRS.find(dir => dir.name === String(name || '').toLowerCase()) || null;
    }

    function directionFromInput(input) {
        if (!input?.axis || !Number(input.dir)) return null;
        return { axis: input.axis, dir: Number(input.dir) < 0 ? -1 : 1 };
    }

    function isIceTrailAt(x, y) {
        return !!effectAt(runtime.ice, x, y);
    }

    function isPlayerOnIceSurface(p) {
        if (!p) return false;
        const current = tileOf(p, 'player');
        if (isIceTrailAt(current.x, current.y)) return true;
        // Mantener la física durante el paso ya comprometido que sale de hielo,
        // pero no extenderla a la siguiente casilla una vez completado el paso.
        if (p._tileMoveActive && p.__rastreroIceSurfaceActiveV630) return true;
        if (p._tileMoveActive && Number.isInteger(p._tileMoveTargetGX) && Number.isInteger(p._tileMoveTargetGY)) {
            return isIceTrailAt(p._tileMoveTargetGX, p._tileMoveTargetGY);
        }
        return false;
    }

    function clearPlayerIceState(p, keepSurface = false) {
        if (!p) return;
        p.__rastreroIceMomentumV630 = null;
        p.__rastreroIceCoastingV630 = false;
        if (!keepSurface) p.__rastreroIceSurfaceActiveV630 = false;
    }

    function startPlayerIceMomentum(p, direction, strength = 1) {
        if (!p || !direction) return null;
        const momentum = {
            axis: direction.axis,
            dir: direction.dir < 0 ? -1 : 1,
            strength: Math.max(0, Math.min(1, Number(strength) || 0))
        };
        p.__rastreroIceMomentumV630 = momentum;
        return momentum;
    }

    function getFrameScale() {
        const value = Number(runtime.frameScale);
        return Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
    }

    function installPlayerIceInertia() {
        const baseInput = global.getCardinalInput;
        if (typeof baseInput !== 'function' || baseInput.__rastreroV630InertiaWrapped) return;
        const wrapped = function getCardinalInputWithIceInertiaV630() {
            const input = baseInput();
            const p = getPlayer();
            if (!p) return input;

            const wasSurfaceActive = !!p.__rastreroIceSurfaceActiveV630;
            const onIce = isPlayerOnIceSurface(p);
            if (!onIce) {
                if (!p._tileMoveActive) clearPlayerIceState(p);
                return input;
            }
            p.__rastreroIceSurfaceActiveV630 = true;

            const requested = directionFromInput(input);
            let momentum = p.__rastreroIceMomentumV630;
            const frameScale = getFrameScale();

            if (requested) {
                if (!momentum || Number(momentum.strength) <= 0) {
                    momentum = startPlayerIceMomentum(p, requested, 1);
                } else {
                    const sameDirection = momentum.axis === requested.axis && momentum.dir === requested.dir;
                    if (sameDirection) {
                        momentum.strength = Math.min(1, Math.max(0, Number(momentum.strength) || 0) + 0.16 * frameScale);
                    } else {
                        // El nuevo input sí puede girar o invertir la marcha. La fuerza
                        // de control reduce el impulso previo en vez de bloquear el eje.
                        const redirectedStrength = Math.max(0.30, Math.min(0.72,
                            Math.max(0, Number(momentum.strength) || 0) * ICE_COUNTER_STRENGTH));
                        momentum = startPlayerIceMomentum(p, requested, redirectedStrength);
                    }
                }
                p.__rastreroIceCoastingV630 = false;
                return input;
            }

            // Sin input, el impulso conserva la última dirección y pierde un 12 %
            // por frame (ajustado por dt). Al caer bajo el umbral, no se inicia otro
            // tile; el tramo ya iniciado siempre termina en un centro de casilla.
            if (!momentum) {
                // Solo la primera entrada a hielo infiere la dirección anterior. Si la
                // inercia ya se agotó, el estado de fuerza 0 evita reiniciar el impulso.
                const previousDirection = directionByName(p.dir || p.lastDirection);
                if (onIce && !wasSurfaceActive && previousDirection) {
                    momentum = startPlayerIceMomentum(p, previousDirection, 1);
                } else {
                    p.__rastreroIceCoastingV630 = true;
                    return { axis: null, dir: 0 };
                }
            }

            momentum.strength = Math.max(0, Math.min(1, Number(momentum.strength) || 0))
                * Math.pow(FRICTION_ICE, frameScale);
            p.__rastreroIceCoastingV630 = true;
            if (momentum.strength <= ICE_MOMENTUM_STOP_THRESHOLD) {
                momentum.strength = 0;
                return { axis: null, dir: 0 };
            }
            return { axis: momentum.axis, dir: momentum.dir };
        };
        wrapped.__rastreroV630InertiaWrapped = true;
        global.getCardinalInput = wrapped;
    }

    function onPlayerTileArrivedV630(p) {
        if (!p) return;
        const tile = tileOf(p, 'player');
        if (isIceTrailAt(tile.x, tile.y)) {
            p.__rastreroIceSurfaceActiveV630 = true;
            if (!p.__rastreroIceMomentumV630) {
                const direction = directionByName(p.dir || p.lastDirection);
                if (direction) startPlayerIceMomentum(p, direction, 1);
            }
            return;
        }
        clearPlayerIceState(p);
    }

    function onPlayerIceMoveBlockedV630(p) {
        if (!p) return;
        const tile = tileOf(p, 'player');
        // Si una pared o bomba corta el deslizamiento, se cancela el impulso para
        // no insistir en una casilla bloqueada cada frame. El control activo puede
        // iniciar un nuevo movimiento de manera normal.
        const stillOnIce = isIceTrailAt(tile.x, tile.y);
        clearPlayerIceState(p, stillOnIce);
        if (stillOnIce) {
            p.__rastreroIceSurfaceActiveV630 = true;
            p.__rastreroIceMomentumV630 = { axis: 'x', dir: 1, strength: 0 };
            p.__rastreroIceCoastingV630 = true;
        }
    }

    function startBoarCharge(enemy, a, direction, playerDistance) {
        a.chargeState = 'telegraph';
        a.chargeDirection = { x: direction.x, y: direction.y, name: direction.name };
        a.chargeTelegraphMs = 650;
        a.chargeTravelTiles = 0;
        a.chargeCooldownMs = Math.max(a.chargeCooldownMs, 4000);
        enemy.__rastreroBoarTelegraphV630 = true;
        if (typeof global.addFloatingText === 'function') {
            global.addFloatingText('¡CARGA!', enemy.x, enemy.y - enemy.height * 0.65, '#fb923c');
        }
    }

    function findBoarChargeDirection(enemy) {
        const p = getPlayer();
        if (!p) return null;
        const et = tileOf(enemy, 'enemy');
        const pt = tileOf(p, 'player');
        const distance = tileDistance(et, pt);
        if (distance < 2 || distance > 6) return null;
        if (et.x === pt.x && et.y !== pt.y && lineClear(et, pt)) {
            return { x: 0, y: Math.sign(pt.y - et.y), name: pt.y < et.y ? 'up' : 'down' };
        }
        if (et.y === pt.y && et.x !== pt.x && lineClear(et, pt)) {
            return { x: Math.sign(pt.x - et.x), y: 0, name: pt.x < et.x ? 'left' : 'right' };
        }
        return null;
    }

    function finishBoarCharge(enemy, a, recoverMs = 450) {
        a.chargeState = 'recover';
        a.chargeRecoverMs = recoverMs;
        a.chargeTelegraphMs = 0;
        a.chargeTravelTiles = 0;
        enemy.__rastreroBoarTelegraphV630 = false;
        enemy.vx = 0;
        enemy.vy = 0;
        if (enemy._tileMoveActive && a.chargeStepOrigin && typeof global.gridSnapEntityToTile === 'function') {
            global.gridSnapEntityToTile(enemy, a.chargeStepOrigin.x, a.chargeStepOrigin.y, 'enemy');
        }
        a.chargeStepOrigin = null;
        if (typeof global.gridResetTileMove === 'function') global.gridResetTileMove(enemy, true);
    }

    function canPlacePushedBombAt(x, y, bomb, boar) {
        if (!isInside(x, y) || isTileSolid(x, y) || bombAt(x, y, bomb) || explosionAt(x, y)) return false;
        return !entityAt(x, y, boar);
    }

    function pushPlayerBombTwoTiles(bomb, dir, boar) {
        const s = getState();
        const states = global.BOMB_V4_STATES || {};
        if (!bomb || bomb.owner !== 'player' || bomb.state !== states.ARMED || bomb.carriedBy) return false;
        if (typeof global.startBombV4Motion !== 'function') return false;
        const x1 = bomb.x + dir.x, y1 = bomb.y + dir.y;
        const x2 = bomb.x + dir.x * 2, y2 = bomb.y + dir.y * 2;
        if (!canPlacePushedBombAt(x1, y1, bomb, boar) || !canPlacePushedBombAt(x2, y2, bomb, boar)) return false;
        const tile = getTileSize();
        const oldQueue = Array.isArray(bomb.motionQueue) ? bomb.motionQueue.slice() : [];
        bomb.motionQueue = [{ x: x2, y: y2, durationMs: 190, arc: 1 }];
        const started = global.startBombV4Motion(bomb, (x1 + 0.5) * tile, (y1 + 0.5) * tile, 190, 1);
        if (!started) {
            bomb.motionQueue = oldQueue;
            return false;
        }
        bomb.interactionMotionV682 = 'boar-shove';
        bomb.interactionActorV682 = boar;
        bomb.playerPassThrough = true;
        if (typeof global.addParticles === 'function') global.addParticles((x1 + 0.5) * tile, (y1 + 0.5) * tile, '#fb923c', 5);
        return true;
    }

    function runBoarCharge(enemy, a, dt) {
        const s = getState();
        if (a.chargeState === 'telegraph' || a.chargeState === 'recover') {
            enemy.vx = 0;
            enemy.vy = 0;
            return true;
        }
        if (a.chargeState !== 'charging' || !s) return false;
        const dir = a.chargeDirection;
        if (!dir || typeof global.gridBeginTileMove !== 'function' || typeof global.gridAdvanceTileMove !== 'function') {
            finishBoarCharge(enemy, a);
            return true;
        }
        const tileNow = tileOf(enemy, 'enemy');
        if (!enemy._tileMoveActive) {
            const nx = tileNow.x + dir.x, ny = tileNow.y + dir.y;
            const bomb = bombAt(nx, ny);
            if (bomb) {
                pushPlayerBombTwoTiles(bomb, dir, enemy);
                finishBoarCharge(enemy, a, 600);
                return true;
            }
            if (isTileSolid(nx, ny) || !isInside(nx, ny)) {
                finishBoarCharge(enemy, a, 600);
                return true;
            }
            const started = global.gridBeginTileMove(enemy, nx, ny, {
                kind: 'enemy', canFly: false, ignoreBombs: false, allowCurrentBombTile: false
            });
            if (!started) {
                const blockerBomb = bombAt(nx, ny);
                if (blockerBomb) pushPlayerBombTwoTiles(blockerBomb, dir, enemy);
                finishBoarCharge(enemy, a, 600);
                return true;
            }
            a.chargeStepOrigin = { x: tileNow.x, y: tileNow.y };
            enemy.lastDirection = dir.name;
            enemy.vx = dir.x;
            enemy.vy = dir.y;
        }
        const baseSpeed = typeof global.getEnemyMovementSpeedV610 === 'function'
            ? global.getEnemyMovementSpeedV610(enemy)
            : Math.max(1, Number(enemy.baseSpeed || enemy.speed || 1));
        const result = global.gridAdvanceTileMove(enemy, Math.max(2, baseSpeed * 2.65), dt, {
            kind: 'enemy', canFly: false, ignoreBombs: false, allowCurrentBombTile: false
        });
        if (result.arrived) {
            a.chargeStepOrigin = null;
            a.chargeTravelTiles += 1;
            if (a.chargeTravelTiles >= 3) finishBoarCharge(enemy, a, 500);
        } else if (result.blocked) {
            finishBoarCharge(enemy, a, 600);
        }
        return true;
    }

    function tryStartFrogLeap(enemy, a) {
        if (a.frogJumpMs > 0 || a.frogJumpCooldownMs > 0 || !isCenteredOnTile(enemy)) return false;
        const tile = tileOf(enemy, 'enemy');
        const preferred = directionByName(enemy.ai?.direction || enemy.lastDirection);
        const ordered = preferred ? [preferred, ...DIRS.filter(dir => dir.name !== preferred.name)] : DIRS;
        const size = getTileSize();
        for (const dir of ordered) {
            const bx = tile.x + dir.x, by = tile.y + dir.y;
            const lx = tile.x + dir.x * 2, ly = tile.y + dir.y * 2;
            const types = getTypes();
            if (!isInside(bx, by) || getState().grid?.[by]?.[bx] !== types.BLOCK) continue;
            if (!isSafeTile(lx, ly, enemy)) continue;
            a.frogJumpFrom = { x: (tile.x + 0.5) * size, y: (tile.y + 0.5) * size };
            a.frogJumpTo = { x: (lx + 0.5) * size, y: (ly + 0.5) * size };
            a.frogJumpMs = a.frogJumpDurationMs;
            a.frogJumpCooldownMs = 4500;
            if (typeof global.gridResetTileMove === 'function') global.gridResetTileMove(enemy, true);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.__rastreroFrogJumpStartedV630 = runtime.clock;
            return true;
        }
        return false;
    }

    function advanceFrogLeap(enemy, a, dt) {
        if (!a.frogJumpFrom || !a.frogJumpTo || a.frogJumpMs <= 0) return false;
        a.frogJumpMs = Math.max(0, a.frogJumpMs - Math.max(0, Number(dt) || 0));
        const progress = 1 - a.frogJumpMs / Math.max(1, a.frogJumpDurationMs);
        enemy.x = a.frogJumpFrom.x + (a.frogJumpTo.x - a.frogJumpFrom.x) * progress;
        enemy.y = a.frogJumpFrom.y + (a.frogJumpTo.y - a.frogJumpFrom.y) * progress;
        enemy.vx = 0;
        enemy.vy = 0;
        if (a.frogJumpMs <= 0) {
            enemy.x = a.frogJumpTo.x;
            enemy.y = a.frogJumpTo.y;
            a.frogJumpFrom = null;
            a.frogJumpTo = null;
            enemy.__rastreroLastTileV630 = tileOf(enemy, 'enemy');
            if (typeof global.gridResetTileMove === 'function') global.gridResetTileMove(enemy, true);
        }
        return true;
    }

    function playerIsCorneredNear(enemy) {
        const p = getPlayer();
        if (!p) return false;
        const pt = tileOf(p, 'player');
        const et = tileOf(enemy, 'enemy');
        if (tileDistance(pt, et) > 2) return false;
        let blocked = 0;
        for (const dir of DIRS) {
            const x = pt.x + dir.x, y = pt.y + dir.y;
            if (!isInside(x, y) || isTileSolid(x, y) || bombAt(x, y)) blocked++;
        }
        return blocked >= 3;
    }

    function startGoatStomp(enemy, a) {
        if (a.goatCooldownMs > 0 || a.goatTelegraphMs > 0 || a.goatEffectMs > 0) return false;
        a.goatTelegraphMs = 600;
        a.goatCooldownMs = 7000;
        enemy.__rastreroGoatTelegraphV630 = true;
        return true;
    }

    function performGoatStomp(enemy, a) {
        a.goatEffectMs = 240;
        enemy.__rastreroGoatTelegraphV630 = false;
        const pt = tileOf(getPlayer(), 'player');
        const et = tileOf(enemy, 'enemy');
        if (Math.abs(pt.x - et.x) <= 1 && Math.abs(pt.y - et.y) <= 1) applyPlayerSlow(800);
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#c4b5a5', 9);
        if (typeof global.triggerScreenShake === 'function') global.triggerScreenShake(3, 130);
    }

    function triggerGoatStompOnHit(enemy, a) {
        // El impacto puede activarlo, pero siempre conserva el aviso previo.
        if (a.goatCooldownMs > 0 || a.goatTelegraphMs > 0) return;
        startGoatStomp(enemy, a);
    }

    function updateEnemyAbilityTimers(enemy, a, dt) {
        const delta = Math.max(0, Number(dt) || 0);
        if (a.chargeCooldownMs > 0) a.chargeCooldownMs = Math.max(0, a.chargeCooldownMs - delta);
        if (a.chargeRecoverMs > 0) {
            a.chargeRecoverMs = Math.max(0, a.chargeRecoverMs - delta);
            if (a.chargeRecoverMs <= 0 && a.chargeState === 'recover') a.chargeState = 'idle';
        }
        if (a.chargeState === 'telegraph') {
            a.chargeTelegraphMs = Math.max(0, a.chargeTelegraphMs - delta);
            if (a.chargeTelegraphMs <= 0) a.chargeState = 'charging';
        }
        if (a.frogJumpCooldownMs > 0) a.frogJumpCooldownMs = Math.max(0, a.frogJumpCooldownMs - delta);
        if (a.goatCooldownMs > 0) a.goatCooldownMs = Math.max(0, a.goatCooldownMs - delta);
        if (a.goatEffectMs > 0) a.goatEffectMs = Math.max(0, a.goatEffectMs - delta);
        if (a.goatTelegraphMs > 0) {
            a.goatTelegraphMs = Math.max(0, a.goatTelegraphMs - delta);
            if (a.goatTelegraphMs <= 0) performGoatStomp(enemy, a);
        }
        if (a.cherubPulseMs > 0) a.cherubPulseMs = Math.max(0, a.cherubPulseMs - delta);
        if (a.cherubTelegraphMs > 0) {
            a.cherubTelegraphMs = Math.max(0, a.cherubTelegraphMs - delta);
            if (a.cherubTelegraphMs <= 0) fireCherubPulse(enemy, a);
        } else {
            a.cherubCooldownMs = Math.max(0, a.cherubCooldownMs - delta);
            if (a.cherubCooldownMs <= 0) {
                a.cherubCooldownMs = 4350;
                a.cherubTelegraphMs = 650;
            }
        }
        if (a.hellhoundBoostMs > 0) a.hellhoundBoostMs = Math.max(0, a.hellhoundBoostMs - delta);

        if (a.moleBuriedMs > 0) {
            a.moleBuriedMs = Math.max(0, a.moleBuriedMs - delta);
            if (a.moleBuriedMs <= 0) emergeMole(enemy, a);
        }

        if (getAbilityId(enemy) === 'boar_charge' && a.chargeState === 'idle' && a.chargeCooldownMs <= 0 && isCenteredOnTile(enemy)) {
            const direction = findBoarChargeDirection(enemy);
            if (direction) startBoarCharge(enemy, a, direction, 0);
        }
        if (getAbilityId(enemy) === 'frog_leap') tryStartFrogLeap(enemy, a);
        if (getAbilityId(enemy) === 'goat_stomp' && a.goatCooldownMs <= 0 && a.goatTelegraphMs <= 0 && playerIsCorneredNear(enemy)) {
            startGoatStomp(enemy, a);
        }
    }

    function fireCherubPulse(enemy, a) {
        const s = getState();
        if (!s) return;
        a.cherubPulseMs = 300;
        runtime.pulseSerial++;
        const et = tileOf(enemy, 'enemy');
        const tile = getTileSize();
        let affected = 0;
        for (const bomb of s.bombs || []) {
            if (!bomb || bomb.owner !== 'player' || bomb.state === 'moving' || bomb.state === 'carried') continue;
            if (tileDistance(et, { x: bomb.x, y: bomb.y }) > 2) continue;
            const oldTimer = Number(bomb.timer);
            if (!Number.isFinite(oldTimer) || oldTimer <= 800) continue;
            bomb.timer = Math.max(800, oldTimer - 500);
            bomb.warnBucket = Math.ceil(bomb.timer / 300);
            bomb.__cherubLastPulseV630 = runtime.pulseSerial;
            affected++;
        }
        if (affected && typeof global.addFloatingText === 'function') {
            global.addFloatingText('AURA: MECHA ACELERADA', enemy.x, enemy.y - tile * 0.6, '#e9d5ff');
        }
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#c4b5fd', 5);
    }

    function emergeMole(enemy, a) {
        const tile = tileOf(enemy, 'enemy');
        const candidates = DIRS
            .map(dir => ({ x: tile.x + dir.x, y: tile.y + dir.y }))
            .filter(pos => isSafeTile(pos.x, pos.y, enemy));
        if (!candidates.length) {
            a.moleBuriedMs = 250;
            return false;
        }
        candidates.sort((one, two) => {
            const pTile = tileOf(getPlayer(), 'player');
            return tileDistance(two, pTile) - tileDistance(one, pTile);
        });
        const dest = candidates[0];
        if (typeof global.gridSnapEntityToTile === 'function') global.gridSnapEntityToTile(enemy, dest.x, dest.y, 'enemy');
        else {
            const size = getTileSize();
            enemy.x = (dest.x + 0.5) * size;
            enemy.y = (dest.y + 0.5) * size;
        }
        a.moleBuriedMs = 0;
        a.moleSavedBlastId = null;
        enemy.__rastreroLastTileV630 = dest;
        enemy._tileMoveActive = false;
        enemy.vx = 0;
        enemy.vy = 0;
        if (enemy.ai) {
            enemy.ai.wallPauseMs = 0;
            enemy.ai.wallPauseExpired = false;
            enemy.ai.stuckTimer = 0;
        }
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#b58a57', 6);
        return true;
    }

    function updateEnemyAIAbilities(dt) {
        const s = getState();
        if (!s || !s.isPlaying || s.paused) return;
        ensureRoomState();
        for (const enemy of s.enemies || []) {
            if (!enemy || !isRastrero(enemy)) continue;
            const a = ensureEnemyState(enemy);
            updateEnemyAbilityTimers(enemy, a, dt);
        }
    }

    function postEnemyAIMovement() {
        const s = getState();
        if (!s) return;
        for (const enemy of s.enemies || []) {
            if (!enemy || !isRastrero(enemy) || isEnemyBuried(enemy)) continue;
            const a = ensureEnemyState(enemy);
            // Los efectos se registran solo en centros de tile, nunca a mitad
            // de una interpolación entre casillas.
            if (enemy._tileMoveActive || !isCenteredOnTile(enemy)) continue;
            const current = tileOf(enemy, 'enemy');
            const previous = a.lastTile || current;
            if (previous.x !== current.x || previous.y !== current.y) {
                if (getAbilityId(enemy) === 'ice_trail') {
                    addTimedTile(runtime.ice, previous.x, previous.y, ICE_TRAIL_DURATION_MS, TILE_TYPES.ICE_TRAIL);
                }
                if (getAbilityId(enemy) === 'hellhound_ember' && effectAt(runtime.fire, current.x, current.y)) {
                    a.hellhoundBoostMs = 3000;
                    if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#fb923c', 4);
                }
                a.lastTile = current;
            } else {
                a.lastTile = current;
            }
        }
    }

    function installAIHooks() {
        const baseUpdateAI = global.updateEnemyAI;
        if (typeof baseUpdateAI === 'function' && !baseUpdateAI.__rastreroV630Wrapped) {
            const wrappedUpdateAI = function updateEnemyAIWithRastrerosV630(dt) {
                const s = getState();
                if (!s || !s.isPlaying || s.paused) return baseUpdateAI(dt);
                ensureRoomState();
                for (const enemy of s.enemies || []) {
                    if (enemy && isRastrero(enemy)) ensureEnemyState(enemy);
                }
                updateEnemyAIAbilities(dt);
                const result = baseUpdateAI(dt);
                postEnemyAIMovement();
                return result;
            };
            wrappedUpdateAI.__rastreroV630Wrapped = true;
            global.updateEnemyAI = wrappedUpdateAI;
        }

        const baseMoveEnemy = global.moveEnemyV312;
        if (typeof baseMoveEnemy === 'function' && !baseMoveEnemy.__rastreroV630Wrapped) {
            const wrappedMoveEnemy = function moveEnemyWithRastreroAbilitiesV630(enemy, dt) {
                const ability = getAbilityId(enemy);
                if (!ability) return baseMoveEnemy(enemy, dt);
                const a = ensureEnemyState(enemy);
                if (a.moleBuriedMs > 0) {
                    enemy.vx = 0;
                    enemy.vy = 0;
                    return;
                }
                if (ability === 'boar_charge' && a.chargeState !== 'idle') {
                    return runBoarCharge(enemy, a, dt);
                }
                if (ability === 'frog_leap' && a.frogJumpMs > 0) {
                    return advanceFrogLeap(enemy, a, dt);
                }
                return baseMoveEnemy(enemy, dt);
            };
            wrappedMoveEnemy.__rastreroV630Wrapped = true;
            global.moveEnemyV312 = wrappedMoveEnemy;
        }

        const baseMoveSpeed = global.getEnemyMovementSpeedV610;
        if (typeof baseMoveSpeed === 'function' && !baseMoveSpeed.__rastreroV630Wrapped) {
            const wrappedMoveSpeed = function getEnemyMovementSpeedWithRastrerosV630(enemy) {
                let speed = baseMoveSpeed(enemy);
                const ability = getAbilityId(enemy);
                const a = enemy?.__rastreroV630;
                if (ability === 'crab_shell') {
                    const targetGX = Number.isFinite(enemy._tileMoveTargetGX) ? enemy._tileMoveTargetGX : null;
                    const targetGY = Number.isFinite(enemy._tileMoveTargetGY) ? enemy._tileMoveTargetGY : null;
                    const tile = tileOf(enemy, 'enemy');
                    const horizontal = targetGX !== null ? targetGX !== tile.x : ['left', 'right'].includes(String(enemy.ai?.direction || enemy.lastDirection));
                    if (horizontal) speed *= 1.4;
                }
                if (ability === 'hellhound_ember' && Number(a?.hellhoundBoostMs || 0) > 0) speed *= 1.3;
                return speed;
            };
            wrappedMoveSpeed.__rastreroV630Wrapped = true;
            global.getEnemyMovementSpeedV610 = wrappedMoveSpeed;
        }

    }

    function enemyIgnoresBombs(enemy) {
        return getAbilityId(enemy) === 'cloud_ethereal';
    }

    function handleEnemyBlast(enemy, explosion) {
        if (!enemy || !explosion) return false;
        const ability = getAbilityId(enemy);
        if (!ability) return false;
        const a = ensureEnemyState(enemy);
        const blastId = Number(explosion.blastId);
        if (isEnemyBuried(enemy)) return true;

        if (ability === 'crab_shell') {
            if (Number.isFinite(blastId) && a.lastBlastId === blastId) return true;
            if (a.shellIntact) {
                a.shellIntact = false;
                a.lastBlastId = Number.isFinite(blastId) ? blastId : `frame-${getState()?.animFrame || 0}`;
                if (typeof global.addFloatingText === 'function') global.addFloatingText('¡CAPARAZÓN ROTO!', enemy.x, enemy.y - enemy.height * 0.6, '#fdba74');
                if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#f5d0a0', 10);
                return true;
            }
            return Number.isFinite(blastId) && a.lastBlastId === blastId;
        }

        if (ability === 'mole_burrow') {
            const meta = runtime.blastMeta.get(blastId);
            const enemyTile = tileOf(enemy, 'enemy');
            if (!meta || meta.owner !== 'player' || !Number.isFinite(blastId)) return false;
            if (a.moleSavedBlastId === blastId) return true;
            if (enemyTile.x !== explosion.x || enemyTile.y !== explosion.y) return false;
            const dx = enemyTile.x - meta.x, dy = enemyTile.y - meta.y;
            if (dx !== 0 && dy !== 0) return false;
            const edgeDistance = Math.abs(dx) + Math.abs(dy);
            if (edgeDistance === 0) return false;
            const direction = dx === 0 ? (dy < 0 ? 'up' : 'down') : (dx < 0 ? 'left' : 'right');
            const effectiveReach = Number(meta.directionReach?.[direction] || 0);
            if (effectiveReach <= 0 || edgeDistance < effectiveReach) return false;
            a.moleBuriedMs = 1500;
            a.moleSavedBlastId = blastId;
            enemy._tileMoveActive = false;
            enemy.vx = 0;
            enemy.vy = 0;
            if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#b58a57', 7);
            if (typeof global.addFloatingText === 'function') global.addFloatingText('¡SE ENTERRÓ!', enemy.x, enemy.y - enemy.height * 0.55, '#d6b48c');
            return true;
        }

        if (ability === 'goat_stomp') triggerGoatStompOnHit(enemy, a);
        return false;
    }

    function onEnemyDefeated(enemy, deathContext = null) {
        // La habilidad se activa por la muerte, no por el tipo de daño.
        // Se conserva la excepción histórica para una explosión directa del jefe.
        if (getAbilityId(enemy) !== 'alien_acid') return false;
        if (deathContext?.owner === 'boss') return false;
        const tile = tileOf(enemy, 'enemy');
        addTimedTile(runtime.acid, tile.x, tile.y, 4000, 'acid');
        if (typeof global.addFloatingText === 'function') global.addFloatingText('ÁCIDO', (tile.x + 0.5) * getTileSize(), (tile.y + 0.35) * getTileSize(), '#86efac');
        if (typeof global.addParticles === 'function') global.addParticles(enemy.x, enemy.y, '#84cc16', 10);
        return true;
    }

    function registerBlastMeta() {
        const bus = global.gameEventBus;
        const eventName = global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
        if (!bus || !eventName || typeof bus.on !== 'function' || global.__RASTRERO_BLAST_LISTENER_V630__) return;
        bus.on(eventName, payload => {
            const bomb = payload?.bomb;
            const blastId = Number(payload?.blastId);
            if (!bomb || !Number.isFinite(blastId)) return;
            const bx = Number(bomb.x), by = Number(bomb.y);
            const directionReach = { up: 0, down: 0, left: 0, right: 0 };
            for (const cell of payload.cells || []) {
                const dx = Number(cell.x) - bx, dy = Number(cell.y) - by;
                if (dx === 0 && dy < 0) directionReach.up = Math.max(directionReach.up, -dy);
                else if (dx === 0 && dy > 0) directionReach.down = Math.max(directionReach.down, dy);
                else if (dy === 0 && dx < 0) directionReach.left = Math.max(directionReach.left, -dx);
                else if (dy === 0 && dx > 0) directionReach.right = Math.max(directionReach.right, dx);
            }
            runtime.blastMeta.set(blastId, {
                x: bx, y: by,
                range: Math.max(1, Number(bomb.range) || 1),
                directionReach,
                owner: String(bomb.owner || 'player'),
                createdAt: runtime.clock
            });
        }, { key: 'rastrero-abilities-v630:blast-meta' });
        global.__RASTRERO_BLAST_LISTENER_V630__ = true;
    }

    function scanExplosionResidues() {
        const s = getState();
        if (!s) return;
        const current = new Set();
        for (const exp of s.explosions || []) {
            if (!exp || exp.blastId == null) continue;
            const key = `${exp.blastId}:${exp.x},${exp.y}`;
            current.add(key);
        }
        for (const [key, prev] of runtime.seenExplosions) {
            if (current.has(key)) continue;
            if (runtime.clock - prev.lastSeen <= 260) addTimedTile(runtime.fire, prev.x, prev.y, 1000, 'ember');
            runtime.seenExplosions.delete(key);
        }
        for (const exp of s.explosions || []) {
            if (!exp || exp.blastId == null) continue;
            const key = `${exp.blastId}:${exp.x},${exp.y}`;
            runtime.seenExplosions.set(key, { x: exp.x, y: exp.y, blastId: exp.blastId, lastSeen: runtime.clock });
        }
    }

    function updatePlayerAcidContact() {
        const s = getState();
        const p = getPlayer();
        if (!s || !p || !s.isPlaying || s.paused) return;
        const tile = tileOf(p, 'player');
        const key = tileKey(tile.x, tile.y);
        if (!effectAt(runtime.acid, tile.x, tile.y)) {
            p.__rastreroAcidLastTileV630 = null;
            return;
        }
        if (p.__rastreroAcidLastTileV630 === key) return;
        p.__rastreroAcidLastTileV630 = key;
        if (typeof global.takeDamage === 'function') global.takeDamage('acid', (tile.x + 0.5) * getTileSize(), (tile.y + 0.5) * getTileSize());
        else applyPlayerSlow(700);
    }

    function installUpdateHook() {
        const baseUpdate = global.update;
        if (typeof baseUpdate !== 'function' || baseUpdate.__rastreroV630Wrapped) return;
        const wrappedUpdate = function updateWithRastreroAbilitiesV630(dt) {
            const s = getState();
            const active = !!s?.isPlaying && !s?.paused;
            const delta = Math.max(0, Number(dt) || 0);
            runtime.frameScale = Math.max(0, Math.min(2, delta / 16.6667));
            if (active) {
                ensureRoomState();
                runtime.clock += delta;
                if (getPlayer()) getPlayer().__rastreroSlowTimerV630 = Math.max(0, Number(getPlayer().__rastreroSlowTimerV630 || 0) - delta);
                cleanupEffects();
                scanExplosionResidues();
            }
            const result = baseUpdate(dt);
            if (active && s?.isPlaying && !s?.paused) {
                cleanupEffects();
                updatePlayerAcidContact();
            }
            return result;
        };
        wrappedUpdate.__rastreroV630Wrapped = true;
        global.update = wrappedUpdate;
    }

    // Internal read-only bridge for the separate visual module. Gameplay state remains owned here.
    global.__RASTRERO_RENDER_BRIDGE_V630__ = Object.freeze({
        getRenderState: () => ({ clock: runtime.clock, ice: runtime.ice, acid: runtime.acid, fire: runtime.fire }),
        getAbilityId,
        ensureEnemyState,
        isEnemyBuried,
        isLizardCamouflaged,
        getTileSize
    });

    // Public hooks consumed by the existing simulation and renderer.
    global.enemyIgnoresBombsV630 = enemyIgnoresBombs;
    global.isEnemyBuriedV630 = isEnemyBuried;
    global.enemyBlastInteractionV630 = handleEnemyBlast;
    global.enemyOnDefeatedV630 = onEnemyDefeated;
    global.getRastreroPlayerSpeedFactorV630 = getPlayerSpeedFactor;
    global.RASTRERO_ABILITIES_V630 = Object.freeze({
        version: '6.30.0',
        species: Object.freeze({ ...SPECIES_ABILITIES }),
        getAbilityId,
        tileTypes: Object.freeze({ ICE_TRAIL: TILE_TYPES.ICE_TRAIL }),
        iceTrailLifetimeMs: ICE_TRAIL_DURATION_MS,
        frictionIce: FRICTION_ICE,
        inspectRuntime: () => ({
            roomKey: runtime.roomKey,
            iceTiles: runtime.ice.size,
            acidTiles: runtime.acid.size,
            fireTiles: runtime.fire.size,
            blastMetadata: runtime.blastMeta.size
        })
    });

    global.rastreroPlayerTileArrivedV630 = onPlayerTileArrivedV630;
    global.rastreroPlayerIceMoveBlockedV630 = onPlayerIceMoveBlockedV630;
    installPlayerIceInertia();
    installAIHooks();
    registerBlastMeta();
    installLevelResetHook();
    installUpdateHook();
})(window);
