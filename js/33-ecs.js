// Bomberman Roguelike v5.8 — ECS ultra simple
//
// Objetivo de esta versión:
// - Entity = solo un ID + metadata mínima.
// - Componentes = datos independientes.
// - Systems = funciones pequeñas que sincronizan/validan esos datos.
//
// IMPORTANTE:
// v5.8 NO migra todavía el gameplay a ECS. El ECS funciona como una capa
// estructurada y auditable sobre los objetos existentes para evitar una
// migración grande y riesgosa. La fuente de verdad del gameplay sigue siendo
// el runtime actual; los componentes contienen copias de datos normalizadas.

(function installSimpleECS(global) {
    'use strict';

    const VERSION = '5.8.0';

    const COMPONENTS = Object.freeze({
        POSITION: 'Position',
        HEALTH: 'Health',
        EXPLOSIVE: 'Explosive'
    });

    const ENTITY_KINDS = Object.freeze({
        PLAYER: 'player',
        ENEMY: 'enemy',
        BOMB: 'bomb',
        BOSS: 'boss'
    });

    function finite(value, fallback = 0) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    function positive(value, fallback = 0) {
        return Math.max(0, finite(value, fallback));
    }

    class SimpleECS {
        constructor() {
            this.nextEntityId = 1;
            this.entities = new Set();
            this.meta = new Map();
            this.components = new Map([
                [COMPONENTS.POSITION, new Map()],
                [COMPONENTS.HEALTH, new Map()],
                [COMPONENTS.EXPLOSIVE, new Map()]
            ]);
            this.refToEntity = new WeakMap();
        }

        createEntity(kind = 'generic', ref = null) {
            if (ref && typeof ref === 'object') {
                const existing = this.refToEntity.get(ref);
                if (existing && this.entities.has(existing)) return existing;
            }

            const id = this.nextEntityId++;
            this.entities.add(id);
            this.meta.set(id, {
                kind: String(kind || 'generic'),
                ref: ref && typeof ref === 'object' ? ref : null
            });

            if (ref && typeof ref === 'object') {
                this.refToEntity.set(ref, id);
            }

            return id;
        }

        destroyEntity(entityId) {
            if (!this.entities.has(entityId)) return false;

            for (const store of this.components.values()) {
                store.delete(entityId);
            }

            this.meta.delete(entityId);
            this.entities.delete(entityId);
            return true;
        }

        add(entityId, componentName, data = {}) {
            this._assertComponent(componentName);
            if (!this.entities.has(entityId)) return false;
            this.components.get(componentName).set(entityId, { ...data });
            return true;
        }

        set(entityId, componentName, data = {}) {
            return this.add(entityId, componentName, data);
        }

        get(entityId, componentName) {
            this._assertComponent(componentName);
            return this.components.get(componentName).get(entityId) || null;
        }

        has(entityId, componentName) {
            this._assertComponent(componentName);
            return this.components.get(componentName).has(entityId);
        }

        remove(entityId, componentName) {
            this._assertComponent(componentName);
            return this.components.get(componentName).delete(entityId);
        }

        getMeta(entityId) {
            const meta = this.meta.get(entityId);
            return meta ? { ...meta, ref: meta.ref || null } : null;
        }

        getEntityForObject(objectRef) {
            if (!objectRef || typeof objectRef !== 'object') return null;
            const entityId = this.refToEntity.get(objectRef);
            return entityId && this.entities.has(entityId) ? entityId : null;
        }

        query(...requiredComponents) {
            requiredComponents.forEach(name => this._assertComponent(name));
            if (!requiredComponents.length) return Array.from(this.entities);

            return Array.from(this.entities).filter(entityId =>
                requiredComponents.every(name => this.components.get(name).has(entityId))
            );
        }

        getEntitiesByKind(kind) {
            const expected = String(kind || 'generic');
            return Array.from(this.meta.entries())
                .filter(([, meta]) => meta.kind === expected)
                .map(([entityId]) => entityId);
        }

        count() {
            return this.entities.size;
        }

        reset() {
            this.nextEntityId = 1;
            this.entities.clear();
            this.meta.clear();
            for (const store of this.components.values()) store.clear();
            this.refToEntity = new WeakMap();
        }

        validate() {
            const errors = [];

            for (const [componentName, store] of this.components.entries()) {
                for (const entityId of store.keys()) {
                    if (!this.entities.has(entityId)) {
                        errors.push(`${componentName} apunta a entidad inexistente: ${entityId}`);
                    }
                }
            }

            for (const entityId of this.entities) {
                if (!this.meta.has(entityId)) {
                    errors.push(`Entidad ${entityId} no tiene metadata`);
                }

                const position = this.get(entityId, COMPONENTS.POSITION);
                if (position) {
                    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
                        errors.push(`Position inválida en entidad ${entityId}`);
                    }
                }

                const health = this.get(entityId, COMPONENTS.HEALTH);
                if (health) {
                    if (!Number.isFinite(health.current) || !Number.isFinite(health.max)) {
                        errors.push(`Health inválida en entidad ${entityId}`);
                    }
                    if (health.max < 0 || health.current < 0 || health.current > health.max) {
                        errors.push(`Health fuera de rango en entidad ${entityId}`);
                    }
                }

                const explosive = this.get(entityId, COMPONENTS.EXPLOSIVE);
                if (explosive) {
                    if (!Number.isFinite(explosive.range) || explosive.range < 0) {
                        errors.push(`Explosive.range inválido en entidad ${entityId}`);
                    }
                    if (!Number.isFinite(explosive.remainingMs) || explosive.remainingMs < 0) {
                        errors.push(`Explosive.remainingMs inválido en entidad ${entityId}`);
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                entities: this.count(),
                positions: this.components.get(COMPONENTS.POSITION).size,
                health: this.components.get(COMPONENTS.HEALTH).size,
                explosives: this.components.get(COMPONENTS.EXPLOSIVE).size
            };
        }

        _assertComponent(componentName) {
            if (!this.components.has(componentName)) {
                throw new Error(`Componente ECS desconocido: ${componentName}`);
            }
        }
    }

    const world = new SimpleECS();

    function ensureEntity(kind, ref) {
        return world.createEntity(kind, ref);
    }

    function setPosition(entityId, objectRef, mode = 'object') {
        const tileSize = finite(global.TILE_SIZE, 48);
        let x = finite(objectRef?.x);
        let y = finite(objectRef?.y);

        // Las bombas mantienen coordenadas de grilla como x/y. El ECS usa
        // posición de mundo para no mezclar semánticas entre entidades.
        if (mode === 'bomb') {
            x = Number.isFinite(Number(objectRef?.worldX))
                ? Number(objectRef.worldX)
                : (finite(objectRef?.x) + 0.5) * tileSize;
            y = Number.isFinite(Number(objectRef?.worldY))
                ? Number(objectRef.worldY)
                : (finite(objectRef?.y) + 0.5) * tileSize;
        }

        world.set(entityId, COMPONENTS.POSITION, {
            x,
            y,
            width: positive(objectRef?.width),
            height: positive(objectRef?.height)
        });
    }

    function setHealth(entityId, current, max) {
        const safeMax = positive(max, 0);
        const safeCurrent = Math.min(positive(current, 0), safeMax || positive(current, 0));
        world.set(entityId, COMPONENTS.HEALTH, {
            current: safeCurrent,
            max: safeMax || safeCurrent
        });
    }

    function setExplosive(entityId, bomb) {
        world.set(entityId, COMPONENTS.EXPLOSIVE, {
            range: positive(bomb?.range, 0),
            fuseMs: positive(bomb?.fuseTotal, bomb?.timer || 0),
            remainingMs: positive(bomb?.timer, 0),
            owner: String(bomb?.owner || 'unknown'),
            damage: positive(bomb?.damage, 1)
        });
    }

    function syncPlayer() {
        const player = global.BOMBER_ENGINE?.getPlayer?.() || global.player;
        if (!player) return null;

        const entityId = ensureEntity(ENTITY_KINDS.PLAYER, player);
        setPosition(entityId, player);
        setHealth(entityId, player.health, player.maxHealth);
        return entityId;
    }

    function syncEnemies() {
        const state = global.BOMBER_ENGINE?.getState?.() || global.gameState;
        const enemies = Array.isArray(state?.enemies) ? state.enemies : [];
        const seen = new Set(enemies);

        for (const entityId of world.getEntitiesByKind(ENTITY_KINDS.ENEMY)) {
            const meta = world.getMeta(entityId);
            if (!meta?.ref || !seen.has(meta.ref)) world.destroyEntity(entityId);
        }

        for (const enemy of enemies) {
            if (!enemy) continue;
            const entityId = ensureEntity(ENTITY_KINDS.ENEMY, enemy);
            setPosition(entityId, enemy);

            // Enemigos actuales no tienen HP separado en el gameplay; para que
            // el componente siga siendo uniforme, su vida efectiva es 1/1.
            setHealth(entityId, 1, 1);
        }
    }

    function syncBombs() {
        const state = global.BOMBER_ENGINE?.getState?.() || global.gameState;
        const bombs = Array.isArray(state?.bombs) ? state.bombs : [];
        const seen = new Set(bombs);

        for (const entityId of world.getEntitiesByKind(ENTITY_KINDS.BOMB)) {
            const meta = world.getMeta(entityId);
            if (!meta?.ref || !seen.has(meta.ref)) world.destroyEntity(entityId);
        }

        for (const bomb of bombs) {
            if (!bomb) continue;
            const entityId = ensureEntity(ENTITY_KINDS.BOMB, bomb);
            setPosition(entityId, bomb, 'bomb');
            setExplosive(entityId, bomb);
        }
    }

    function syncBoss() {
        const state = global.BOMBER_ENGINE?.getState?.() || global.gameState;
        const boss = state?.boss;

        for (const entityId of world.getEntitiesByKind(ENTITY_KINDS.BOSS)) {
            const meta = world.getMeta(entityId);
            if (!boss || meta?.ref !== boss) world.destroyEntity(entityId);
        }

        if (!boss) return;

        const entityId = ensureEntity(ENTITY_KINDS.BOSS, boss);
        setPosition(entityId, boss);
        setHealth(entityId, boss.hp, boss.maxHp);
    }

    // System principal de v5.8: sincronización, no gameplay.
    function ecsUpdate() {
        syncPlayer();
        syncEnemies();
        syncBombs();
        syncBoss();
    }

    function ecsReset() {
        world.reset();
    }

    function ecsGetSnapshot() {
        const snapshot = {};
        for (const entityId of world.entities) {
            const meta = world.getMeta(entityId);
            snapshot[entityId] = {
                meta: meta ? { kind: meta.kind } : null,
                position: world.get(entityId, COMPONENTS.POSITION),
                health: world.get(entityId, COMPONENTS.HEALTH),
                explosive: world.get(entityId, COMPONENTS.EXPLOSIVE)
            };
        }
        return snapshot;
    }

    global.ECS_COMPONENTS_V58 = COMPONENTS;
    global.ECS_ENTITY_KINDS_V58 = ENTITY_KINDS;
    global.SimpleECS = SimpleECS;
    global.gameECS = world;
    global.ecsUpdate = ecsUpdate;
    global.ecsReset = ecsReset;
    global.ecsValidate = () => world.validate();
    global.ecsGetSnapshot = ecsGetSnapshot;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getECS = () => world;
    global.BOMBER_ENGINE.validateECS = () => world.validate();
    global.BOMBER_ENGINE.getECSSnapshot = () => ecsGetSnapshot();
    global.BOMBER_ENGINE.getECSEntityForObject = objectRef => world.getEntityForObject(objectRef);
})(window);
