// Bomberman Roguelike v6.12.14 — future dungeon generator contract only.
// This module defines the input/output boundary for procedural generation.
// It intentionally does NOT generate maps and does NOT touch gameState.
(function installDungeonGeneratorContract(global) {
    'use strict';

    const VERSION = '6.12.14-contract-1';

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
        topology: 'classic-bomberman',
        blockDensity: null,
        preservePlayerSafeSpawn: true,
        preserveExit: true,
        allowHazards: true,
        allowPowerups: true,
        allowEnemySpawn: true,
        allowBiomeRules: true
    });

    function normalizeSeed(seed) {
        if (seed === undefined || seed === null) return '0';
        return String(seed).trim() || '0';
    }

    function normalizeProfile(profile = {}) {
        const source = profile && typeof profile === 'object' ? profile : {};
        return Object.freeze({
            ...DEFAULT_PROFILE,
            ...source,
            width: Number.isFinite(Number(source.width))
                ? Math.max(5, Math.floor(Number(source.width)))
                : DEFAULT_PROFILE.width,
            height: Number.isFinite(Number(source.height))
                ? Math.max(5, Math.floor(Number(source.height)))
                : DEFAULT_PROFILE.height
        });
    }

    function createRequest(seed, profile = {}) {
        return Object.freeze({
            contractVersion: VERSION,
            seed: normalizeSeed(seed),
            profile: normalizeProfile(profile)
        });
    }

    function generate(seed, profile = {}) {
        const request = createRequest(seed, profile);

        // No generation in v6.12.14. This is a contract boundary only.
        return Object.freeze({
            status: 'CONTRACT_ONLY',
            gameplayReady: false,
            generated: false,
            request,
            resultSchema: Object.freeze({
                dimensions: Object.freeze(['width', 'height']),
                grid: 'TYPES-compatible 2D tile matrix',
                playerSpawn: 'single {x,y} tile',
                enemySpawns: 'array of {x,y,type}',
                powerups: 'array of {x,y,type}',
                hazards: 'array of {x,y,type}',
                exit: 'single {x,y,state}',
                metadata: Object.freeze(['seed', 'depth', 'biome', 'stage', 'profile'])
            })
        });
    }

    function validateResult(result) {
        if (!result || typeof result !== 'object') {
            return { valid: false, errors: ['result_missing'] };
        }
        if (result.status === 'CONTRACT_ONLY') {
            return { valid: true, errors: [] };
        }
        const errors = [];
        if (!result.generated) errors.push('generated_false');
        if (!Array.isArray(result.grid)) errors.push('grid_missing');
        return { valid: errors.length === 0, errors };
    }

    const api = Object.freeze({
        version: VERSION,
        tileSchema: TILE_SCHEMA,
        defaultProfile: DEFAULT_PROFILE,
        createRequest,
        generate,
        validateResult
    });

    global.DungeonGenerator = api;
    global.DUNGEON_GENERATOR_CONTRACT_V61214 = api;
})(typeof window !== 'undefined' ? window : globalThis);
