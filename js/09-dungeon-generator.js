// Bomberman Roguelike v6.12.20 — deterministic procedural layout generator.
// Generates only validated MapData. It never mutates gameState or executes gameplay.
(function installDungeonGenerator(global) {
    'use strict';

    const VERSION = '6.12.20';
    const UINT32_MAX_PLUS_ONE = 4294967296;

    const TILE_SCHEMA = Object.freeze({
        EMPTY: 'EMPTY',
        WALL: 'WALL',
        BLOCK: 'BLOCK',
        EXIT_LOCKED: 'EXIT_LOCKED',
        EXIT_OPEN: 'EXIT_OPEN'
    });

    const DEFAULT_PROFILE = Object.freeze({
        width: 15,
        height: 15,
        topology: 'rooms-corridors',
        targetRooms: 4,
        minRoomSize: 3,
        maxRoomSize: 5,
        maxAttempts: 20,
        blockDensity: 0.34,
        preservePlayerSafeSpawn: true,
        preserveExit: true
    });

    const SEED_STREAMS = Object.freeze([
        'layoutSeed',
        'blockSeed',
        'enemySeed',
        'powerUpSeed',
        'hazardSeed'
    ]);

    const PENDING_REQUEST_KEY = '__BOMBERMAN_PROCEDURAL_MAP_REQUEST_V61220__';

    function normalizeSeed(seed) {
        if (seed === undefined || seed === null) return '0';
        return String(seed).trim() || '0';
    }

    function normalizeProfile(profile = {}) {
        const source = profile && typeof profile === 'object' ? profile : {};
        let width = Number.isFinite(Number(source.width)) ? Math.floor(Number(source.width)) : DEFAULT_PROFILE.width;
        let height = Number.isFinite(Number(source.height)) ? Math.floor(Number(source.height)) : DEFAULT_PROFILE.height;
        width = Math.max(9, Math.min(31, width));
        height = Math.max(9, Math.min(31, height));
        if (width % 2 === 0) width -= 1;
        if (height % 2 === 0) height -= 1;

        let targetRooms = Number.isFinite(Number(source.targetRooms))
            ? Math.floor(Number(source.targetRooms))
            : DEFAULT_PROFILE.targetRooms;
        targetRooms = Math.max(2, Math.min(8, targetRooms));

        let minRoomSize = Number.isFinite(Number(source.minRoomSize))
            ? Math.floor(Number(source.minRoomSize))
            : DEFAULT_PROFILE.minRoomSize;
        let maxRoomSize = Number.isFinite(Number(source.maxRoomSize))
            ? Math.floor(Number(source.maxRoomSize))
            : DEFAULT_PROFILE.maxRoomSize;
        minRoomSize = Math.max(3, Math.min(7, minRoomSize));
        maxRoomSize = Math.max(minRoomSize, Math.min(9, maxRoomSize));
        if (minRoomSize % 2 === 0) minRoomSize -= 1;
        if (maxRoomSize % 2 === 0) maxRoomSize -= 1;

        const maxAttempts = Number.isFinite(Number(source.maxAttempts))
            ? Math.floor(Number(source.maxAttempts))
            : DEFAULT_PROFILE.maxAttempts;
        const blockDensity = Number.isFinite(Number(source.blockDensity))
            ? Math.max(0, Math.min(0.60, Number(source.blockDensity)))
            : DEFAULT_PROFILE.blockDensity;

        return Object.freeze({
            ...DEFAULT_PROFILE,
            ...source,
            width,
            height,
            targetRooms,
            minRoomSize,
            maxRoomSize,
            maxAttempts: Math.max(1, Math.min(100, maxAttempts)),
            blockDensity
        });
    }

    function hashString(input) {
        let h = 2166136261 >>> 0;
        const text = normalizeSeed(input);
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h += h << 13;
        h ^= h >>> 7;
        h += h << 3;
        h ^= h >>> 17;
        h += h << 5;
        return h >>> 0;
    }

    function mixSeed(rootSeed, streamName) {
        return hashString(`${normalizeSeed(rootSeed)}|${streamName}`);
    }

    function createRng(seed) {
        let state = hashString(seed) || 0x9E3779B9;
        return Object.freeze({
            next() {
                state = (state + 0x6D2B79F5) >>> 0;
                let t = state;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX_PLUS_ONE;
            },
            int(min, max) {
                if (!Number.isFinite(min) || !Number.isFinite(max)) throw new TypeError('rng_int_bounds_invalid');
                const lo = Math.ceil(Math.min(min, max));
                const hi = Math.floor(Math.max(min, max));
                return lo + Math.floor(this.next() * (hi - lo + 1));
            },
            pick(array) {
                if (!Array.isArray(array) || array.length === 0) return undefined;
                return array[this.int(0, array.length - 1)];
            }
        });
    }

    function createSeedBundle(seed) {
        const rootSeed = normalizeSeed(seed);
        const streams = {};
        SEED_STREAMS.forEach(name => {
            streams[name] = mixSeed(rootSeed, name);
        });
        return Object.freeze({ rootSeed, ...streams });
    }

    function createSeededRngs(seed) {
        const seeds = createSeedBundle(seed);
        const rngs = {};
        SEED_STREAMS.forEach(name => {
            rngs[name] = createRng(seeds[name]);
        });
        return Object.freeze({ seeds, rngs: Object.freeze(rngs) });
    }

    function inBounds(x, y, width, height) {
        return x >= 0 && y >= 0 && x < width && y < height;
    }



    function roomIntersects(a, b, padding = 1) {
        return !(
            a.x + a.w + padding <= b.x ||
            b.x + b.w + padding <= a.x ||
            a.y + a.h + padding <= b.y ||
            b.y + b.h + padding <= a.y
        );
    }

    function carveRect(tiles, room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
        }
    }

    function carveCorridor(tiles, from, to, horizontalFirst) {
        let x = from.x;
        let y = from.y;
        tiles[y][x] = TILE_SCHEMA.EMPTY;

        if (horizontalFirst) {
            while (x !== to.x) {
                x += Math.sign(to.x - x);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
            while (y !== to.y) {
                y += Math.sign(to.y - y);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
        } else {
            while (y !== to.y) {
                y += Math.sign(to.y - y);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
            while (x !== to.x) {
                x += Math.sign(to.x - x);
                tiles[y][x] = TILE_SCHEMA.EMPTY;
            }
        }
    }

    function roomCells(room) {
        const cells = [];
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) cells.push({ x, y });
        }
        return cells;
    }

    function cellKey(x, y) {
        return `${x},${y}`;
    }

    function findPath(tiles, start, goal) {
        const queue = [start];
        const visited = new Set([cellKey(start.x, start.y)]);
        const directions = [[1,0],[-1,0],[0,1],[0,-1]];

        while (queue.length) {
            const current = queue.shift();
            if (current.x === goal.x && current.y === goal.y) return true;
            for (const [dx, dy] of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                if (!inBounds(nx, ny, tiles[0].length, tiles.length)) continue;
                if (tiles[ny][nx] !== TILE_SCHEMA.EMPTY) continue;
                const key = cellKey(nx, ny);
                if (visited.has(key)) continue;
                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
        return false;
    }

    function createEmptyMapData(seed, profile = {}) {
        const normalizedProfile = normalizeProfile(profile);
        return {
            width: normalizedProfile.width,
            height: normalizedProfile.height,
            tiles: Array.from({ length: normalizedProfile.height }, () => Array(normalizedProfile.width).fill(TILE_SCHEMA.WALL)),
            rooms: [],
            corridors: [],
            playerSpawn: null,
            enemySpawns: [],
            destructibleBlocks: [],
            powerUps: [],
            hazards: [],
            exit: null,
            metadata: {
                seed: normalizeSeed(seed),
                depth: null,
                biome: null,
                stage: null,
                profile: normalizedProfile
            }
        };
    }

    function placeRooms(mapData, rng, profile) {
        const { width, height } = mapData;
        const rooms = [];
        const target = Math.min(profile.targetRooms, Math.max(2, Math.floor((width - 2) / 3)));

        const firstRoom = { x: 1, y: 1, w: 3, h: 3 };
        rooms.push(firstRoom);
        carveRect(mapData.tiles, firstRoom);

        let attempts = 0;
        while (rooms.length < target && attempts < 60) {
            attempts++;
            const w = rng.int(profile.minRoomSize, profile.maxRoomSize) | 1;
            const h = rng.int(profile.minRoomSize, profile.maxRoomSize) | 1;
            const maxX = width - w - 1;
            const maxY = height - h - 1;
            if (maxX < 1 || maxY < 1) break;

            let x = rng.int(1, maxX);
            let y = rng.int(1, maxY);
            if (x % 2 === 0) x -= 1;
            if (y % 2 === 0) y -= 1;
            if (x < 1 || y < 1) continue;

            const room = { x, y, w, h };
            if (rooms.some(existing => roomIntersects(room, existing, 1))) continue;

            rooms.push(room);
            carveRect(mapData.tiles, room);
        }

        mapData.rooms = rooms;
        return rooms.length >= 2;
    }

    function connectRooms(mapData, rng) {
        const corridors = [];
        for (let i = 1; i < mapData.rooms.length; i++) {
            const previous = mapData.rooms[i - 1];
            const current = mapData.rooms[i];
            const from = {
                x: previous.x + Math.floor(previous.w / 2),
                y: previous.y + Math.floor(previous.h / 2)
            };
            const to = {
                x: current.x + Math.floor(current.w / 2),
                y: current.y + Math.floor(current.h / 2)
            };
            const horizontalFirst = rng.next() >= 0.5;
            carveCorridor(mapData.tiles, from, to, horizontalFirst);
            corridors.push({ from, to, horizontalFirst });
        }

        mapData.corridors = corridors;
        return corridors.length >= 1;
    }

    function addDestructibleBlocks(mapData, rng, profile) {
        const protectedCells = new Set();
        const spawn = mapData.playerSpawn;
        const exit = mapData.exit;
        if (spawn) protectedCells.add(cellKey(spawn.x, spawn.y));
        if (exit) protectedCells.add(cellKey(exit.x, exit.y));

        // Keep corridor centerline and immediate player escape lanes free.
        for (const corridor of mapData.corridors) {
            let x = corridor.from.x;
            let y = corridor.from.y;
            protectedCells.add(cellKey(x, y));
            if (corridor.horizontalFirst) {
                while (x !== corridor.to.x) {
                    x += Math.sign(corridor.to.x - x);
                    protectedCells.add(cellKey(x, y));
                }
                while (y !== corridor.to.y) {
                    y += Math.sign(corridor.to.y - y);
                    protectedCells.add(cellKey(x, y));
                }
            } else {
                while (y !== corridor.to.y) {
                    y += Math.sign(corridor.to.y - y);
                    protectedCells.add(cellKey(x, y));
                }
                while (x !== corridor.to.x) {
                    x += Math.sign(corridor.to.x - x);
                    protectedCells.add(cellKey(x, y));
                }
            }
        }
        if (profile.preservePlayerSafeSpawn) {
            [[1,1],[2,1],[1,2],[2,2],[1,3],[3,1]].forEach(([x,y]) => {
                if (inBounds(x,y,mapData.width,mapData.height)) protectedCells.add(cellKey(x,y));
            });
        }

        const candidates = [];
        for (const room of mapData.rooms) {
            for (const {x,y} of roomCells(room)) {
                if (mapData.tiles[y][x] !== TILE_SCHEMA.EMPTY) continue;
                if (protectedCells.has(cellKey(x,y))) continue;
                candidates.push({x,y});
            }
        }

        // Deterministic shuffle.
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const target = Math.floor(candidates.length * profile.blockDensity);
        for (const cell of candidates) {
            if (mapData.destructibleBlocks.length >= target) break;
            if (mapData.tiles[cell.y][cell.x] !== TILE_SCHEMA.EMPTY) continue;
            mapData.tiles[cell.y][cell.x] = TILE_SCHEMA.BLOCK;
            if (!findPath(mapData.tiles, mapData.playerSpawn, mapData.exit)) {
                mapData.tiles[cell.y][cell.x] = TILE_SCHEMA.EMPTY;
                continue;
            }
            mapData.destructibleBlocks.push(cell);
        }
    }

    function generateAttempt(seed, profile, attempt) {
        const seeded = createSeededRngs(`${normalizeSeed(seed)}|attempt|${attempt}`);
        const mapData = createEmptyMapData(seed, profile);

        // Basic rooms + corridors. Geometry is fully deterministic per attempt.
        if (!placeRooms(mapData, seeded.rngs.layoutSeed, profile)) return null;
        if (!connectRooms(mapData, seeded.rngs.layoutSeed)) return null;

        const firstRoom = mapData.rooms[0];
        const lastRoom = mapData.rooms[mapData.rooms.length - 1];
        mapData.playerSpawn = { x: firstRoom.x, y: firstRoom.y };
        mapData.exit = {
            x: lastRoom.x + Math.floor(lastRoom.w / 2),
            y: lastRoom.y + Math.floor(lastRoom.h / 2),
            state: 'LOCKED'
        };

        if (!mapData.tiles[mapData.playerSpawn.y] || mapData.tiles[mapData.playerSpawn.y][mapData.playerSpawn.x] !== TILE_SCHEMA.EMPTY) return null;
        if (!mapData.tiles[mapData.exit.y] || mapData.tiles[mapData.exit.y][mapData.exit.x] !== TILE_SCHEMA.EMPTY) return null;

        addDestructibleBlocks(mapData, seeded.rngs.blockSeed, profile);

        if (!findPath(mapData.tiles, mapData.playerSpawn, mapData.exit)) return null;

        mapData.metadata.attempt = attempt;
        mapData.metadata.seedStreams = createSeedBundle(`${normalizeSeed(seed)}|attempt|${attempt}`);
        return mapData;
    }

    function validateMapData(mapData) {
        const errors = [];
        if (!mapData || typeof mapData !== 'object') return { valid: false, errors: ['map_data_missing'] };
        if (!Number.isInteger(mapData.width) || mapData.width < 9 || mapData.width % 2 === 0) errors.push('width_invalid');
        if (!Number.isInteger(mapData.height) || mapData.height < 9 || mapData.height % 2 === 0) errors.push('height_invalid');
        if (!Array.isArray(mapData.tiles) || mapData.tiles.length !== mapData.height) errors.push('tiles_missing');
        if (!Array.isArray(mapData.rooms) || mapData.rooms.length < 2) errors.push('rooms_missing');
        if (!mapData.playerSpawn) errors.push('player_spawn_missing');
        if (!mapData.exit) errors.push('exit_missing');

        if (Array.isArray(mapData.tiles) && mapData.tiles.length === mapData.height) {
            for (let y = 0; y < mapData.height; y++) {
                if (!Array.isArray(mapData.tiles[y]) || mapData.tiles[y].length !== mapData.width) {
                    errors.push('row_shape_invalid');
                    break;
                }
                for (let x = 0; x < mapData.width; x++) {
                    const tile = mapData.tiles[y][x];
                    if (!Object.values(TILE_SCHEMA).includes(tile)) errors.push('tile_value_invalid');
                    if ((x === 0 || y === 0 || x === mapData.width - 1 || y === mapData.height - 1) && tile !== TILE_SCHEMA.WALL) {
                        errors.push('boundary_open');
                    }
                }
            }
        }

        if (Array.isArray(mapData.rooms)) {
            for (let i = 0; i < mapData.rooms.length; i++) {
                const a = mapData.rooms[i];
                if (!Number.isInteger(a.x) || !Number.isInteger(a.y) || !Number.isInteger(a.w) || !Number.isInteger(a.h)) {
                    errors.push('room_invalid');
                    continue;
                }
                if (a.x < 1 || a.y < 1 || a.x + a.w > mapData.width - 1 || a.y + a.h > mapData.height - 1) errors.push('room_out_of_bounds');
                for (let j = i + 1; j < mapData.rooms.length; j++) {
                    if (roomIntersects(a, mapData.rooms[j], 1)) errors.push('rooms_overlap');
                }
            }
        }

        const start = mapData.playerSpawn;
        const exit = mapData.exit;
        if (start && !inBounds(start.x, start.y, mapData.width, mapData.height)) errors.push('player_spawn_out_of_bounds');
        if (exit && !inBounds(exit.x, exit.y, mapData.width, mapData.height)) errors.push('exit_out_of_bounds');
        if (start && mapData.tiles?.[start.y]?.[start.x] !== TILE_SCHEMA.EMPTY) errors.push('player_spawn_blocked');
        if (exit && mapData.tiles?.[exit.y]?.[exit.x] !== TILE_SCHEMA.EMPTY) errors.push('exit_blocked');
        if (start && exit && Array.isArray(mapData.tiles) && !findPath(mapData.tiles, start, exit)) errors.push('no_start_to_exit_path');

        return { valid: errors.length === 0, errors: [...new Set(errors)] };
    }

    function generate(seed, profile = {}) {
        const normalizedSeed = normalizeSeed(seed);
        const normalizedProfile = normalizeProfile(profile);
        for (let attempt = 0; attempt < normalizedProfile.maxAttempts; attempt++) {
            const mapData = generateAttempt(normalizedSeed, normalizedProfile, attempt);
            if (!mapData) continue;
            const validation = validateMapData(mapData);
            if (!validation.valid) continue;
            return Object.freeze({
                status: 'GENERATED',
                gameplayReady: false,
                generated: true,
                deterministic: true,
                attempts: attempt + 1,
                request: createRequest(normalizedSeed, normalizedProfile),
                validation,
                mapData: deepFreeze(mapData)
            });
        }
        return Object.freeze({
            status: 'REJECTED',
            gameplayReady: false,
            generated: false,
            deterministic: true,
            attempts: normalizedProfile.maxAttempts,
            request: createRequest(normalizedSeed, normalizedProfile),
            validation: { valid: false, errors: ['generation_failed_after_max_attempts'] },
            mapData: null
        });
    }

    function createRequest(seed, profile = {}) {
        const normalizedSeed = normalizeSeed(seed);
        return Object.freeze({
            contractVersion: VERSION,
            seed: normalizedSeed,
            profile: normalizeProfile(profile),
            seeds: createSeedBundle(normalizedSeed)
        });
    }

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.keys(value).forEach(key => deepFreeze(value[key]));
        return value;
    }

    function cloneData(value) {
        if (Array.isArray(value)) return value.map(cloneData);
        if (value && typeof value === 'object') {
            const result = {};
            Object.keys(value).forEach(key => result[key] = cloneData(value[key]));
            return result;
        }
        return value;
    }

    function mapDataFingerprint(mapData) {
        return JSON.stringify(mapData);
    }

    function validateResult(result) {
        if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
        if (!result.generated || result.status !== 'GENERATED' || !result.mapData) return { valid: false, errors: result.validation?.errors || ['generation_not_valid'] };
        return validateMapData(result.mapData);
    }

    function readProceduralRequest(level = 1) {
        const pending = global[PENDING_REQUEST_KEY];
        if (pending && typeof pending === 'object') return cloneData(pending);

        try {
            if (!global.location || typeof global.location.search !== 'string') return null;
            const params = new URLSearchParams(global.location.search);
            if (params.get('map') !== 'procedural') return null;
            const seedParam = params.get('seed');
            const seed = seedParam ? seedParam : `procedural-depth-${level}`;
            return {
                enabled: true,
                seed: normalizeSeed(seed),
                profile: {}
            };
        } catch (_error) {
            return null;
        }
    }

    function requestProceduralMap(seed, profile = {}) {
        const request = {
            enabled: true,
            seed: normalizeSeed(seed),
            profile: cloneData(normalizeProfile(profile))
        };
        global[PENDING_REQUEST_KEY] = request;
        return cloneData(request);
    }

    function clearProceduralRequest() {
        try { delete global[PENDING_REQUEST_KEY]; } catch (_error) { global[PENDING_REQUEST_KEY] = null; }
    }

    const api = Object.freeze({
        version: VERSION,
        tileSchema: TILE_SCHEMA,
        seedStreams: SEED_STREAMS,
        defaultProfile: DEFAULT_PROFILE,
        normalizeSeed,
        normalizeProfile,
        createRng,
        createSeedBundle,
        createSeededRngs,
        createEmptyMapData,
        cloneData,
        mapDataFingerprint,
        createRequest,
        generate,
        validateMapData,
        validateResult,
        getRunRequest: readProceduralRequest,
        requestProceduralMap,
        clearProceduralRequest
    });

    global.DungeonGenerator = api;
    global.DUNGEON_GENERATOR_V61220 = api;
})(typeof window !== 'undefined' ? window : globalThis);
