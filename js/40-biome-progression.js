// Bomberman Roguelike v5.0 — Biome Progression
// La progresión decide qué Theme está activo en cada profundidad.
// No contiene lógica de mecánicas ni hazards: solo composición, etapas y transición.
(function initBiomeProgressionV49(global) {
    'use strict';

    const ROOMS_PER_BIOME = 4;
    const BIOME_PROGRESSION = Object.freeze([
        Object.freeze({ id:'winter', name:'Invierno', themeId:'winter', rooms:ROOMS_PER_BIOME, accent:'#7dd3fc', bossEnabled:false, examRoomType:'ELITE' }),
        Object.freeze({ id:'autumn', name:'Otoño', themeId:'autumn', rooms:ROOMS_PER_BIOME, accent:'#f59e0b' }),
        Object.freeze({ id:'spring', name:'Primavera', themeId:'spring', rooms:ROOMS_PER_BIOME, accent:'#86efac' }),
        Object.freeze({ id:'summer', name:'Verano', themeId:'summer', rooms:ROOMS_PER_BIOME, accent:'#fbbf24' }),
        Object.freeze({ id:'underground', name:'Bajo tierra', themeId:'underground', rooms:ROOMS_PER_BIOME, accent:'#c4b5fd' }),
        Object.freeze({ id:'clouds', name:'Nubes', themeId:'clouds', rooms:ROOMS_PER_BIOME, accent:'#dbeafe' }),
        Object.freeze({ id:'mountains', name:'Montañas', themeId:'mountains', rooms:ROOMS_PER_BIOME, accent:'#cbd5e1' }),
        Object.freeze({ id:'beach', name:'Playa', themeId:'beach', rooms:ROOMS_PER_BIOME, accent:'#67e8f9' }),
        Object.freeze({ id:'space', name:'Espacio', themeId:'space', rooms:ROOMS_PER_BIOME, accent:'#a5b4fc' }),
        Object.freeze({ id:'sky', name:'Cielo', themeId:'sky', rooms:ROOMS_PER_BIOME, accent:'#f0abfc' }),
        Object.freeze({ id:'inferno', name:'Infierno', themeId:'inferno', rooms:ROOMS_PER_BIOME, accent:'#ff7043' })
    ]);
    const TOTAL_BIOME_DEPTHS = BIOME_PROGRESSION.reduce((sum, biome) => sum + biome.rooms, 0);
    const BIOME_STAGE_PROFILES_V51 = Object.freeze({
        winter: Object.freeze({
            1: Object.freeze({
                role: 'introduction',
                lesson: 'Aprende a frenar antes de necesitar frenar.',
                mechanics: Object.freeze({
                    slippery: Object.freeze({ movement: Object.freeze({ acceleration: 0.96, braking: 0.62, turnCarrySpeed: 1.02, speedMultiplier: 1 }) })
                }),
                hazards: Object.freeze({ blizzard: Object.freeze({ initialDelayMs: 9000, intervalMs: 22000, maxActive: 1 }) }),
                generation: Object.freeze({ blockDensityBonus: -0.03 })
            }),
            2: Object.freeze({
                role: 'reinforcement',
                lesson: 'Planea el siguiente movimiento con la inercia ya activa.',
                mechanics: Object.freeze({
                    slippery: Object.freeze({ movement: Object.freeze({ acceleration: 0.93, braking: 0.48, turnCarrySpeed: 1.06, speedMultiplier: 1 }) })
                }),
                hazards: Object.freeze({ blizzard: Object.freeze({ initialDelayMs: 7000, intervalMs: 18000, maxActive: 1 }) }),
                generation: Object.freeze({ blockDensityBonus: -0.01 })
            }),
            3: Object.freeze({
                role: 'combination',
                lesson: 'Combina deslizamiento, bombas y presión ambiental.',
                mechanics: Object.freeze({
                    slippery: Object.freeze({ movement: Object.freeze({ acceleration: 0.90, braking: 0.38, turnCarrySpeed: 1.09, speedMultiplier: 1 }) })
                }),
                hazards: Object.freeze({ blizzard: Object.freeze({ initialDelayMs: 5500, intervalMs: 14500, maxActive: 1 }) }),
                generation: Object.freeze({ blockDensityBonus: 0.01 })
            }),
            4: Object.freeze({
                role: 'exam',
                lesson: 'Demuestra que puedes controlar el deslizamiento bajo presión.',
                mechanics: Object.freeze({
                    slippery: Object.freeze({ movement: Object.freeze({ acceleration: 0.87, braking: 0.30, turnCarrySpeed: 1.12, speedMultiplier: 1 }) })
                }),
                hazards: Object.freeze({ blizzard: Object.freeze({ initialDelayMs: 3500, intervalMs: 11500, maxActive: 1 }) }),
                generation: Object.freeze({ blockDensityBonus: 0.03 })
            })
        }),
        inferno: Object.freeze({
            1: Object.freeze({
                role: 'introduction',
                lesson: 'Moverse antes de que el suelo cierre la oportunidad.',
                mechanics: Object.freeze({
                    darkness: Object.freeze({ visibility: Object.freeze({ radius: 170, midStop: 0.52, midAlpha: 0.28, outerAlpha: 0.84 }) })
                }),
                hazards: Object.freeze({
                    lava: Object.freeze({ initialDelayMs: 6500, intervalMs: 8500, maxActive: 1 }),
                    lightning: Object.freeze({ enabled: false }),
                    landslide: Object.freeze({ enabled: false })
                }),
                generation: Object.freeze({ blockDensityBonus: -0.01 })
            }),
            2: Object.freeze({
                role: 'reinforcement',
                lesson: 'Romper, avanzar y no quedarse donde el calor se acumula.',
                mechanics: Object.freeze({
                    darkness: Object.freeze({ visibility: Object.freeze({ radius: 152, midStop: 0.48, midAlpha: 0.34, outerAlpha: 0.88 }) })
                }),
                hazards: Object.freeze({
                    lava: Object.freeze({ initialDelayMs: 5000, intervalMs: 6800, maxActive: 2 }),
                    lightning: Object.freeze({ initialDelayMs: 9000, intervalMs: 15000, maxActive: 1 }),
                    landslide: Object.freeze({ enabled: false })
                }),
                generation: Object.freeze({ blockDensityBonus: 0.01 })
            }),
            3: Object.freeze({
                role: 'combination',
                lesson: 'Combina presión temporal, oscuridad y rutas que se abren bajo fuego.',
                mechanics: Object.freeze({
                    darkness: Object.freeze({ visibility: Object.freeze({ radius: 136, midStop: 0.44, midAlpha: 0.40, outerAlpha: 0.91 }) })
                }),
                hazards: Object.freeze({
                    lava: Object.freeze({ initialDelayMs: 3800, intervalMs: 5200, maxActive: 2 }),
                    lightning: Object.freeze({ initialDelayMs: 7000, intervalMs: 11200, maxActive: 1 }),
                    landslide: Object.freeze({ initialDelayMs: 9800, intervalMs: 14000, maxActive: 1 })
                }),
                generation: Object.freeze({ blockDensityBonus: 0.025 })
            }),
            4: Object.freeze({
                role: 'exam',
                lesson: 'Corre contra el reloj, lee el espacio y decide dónde romper antes de que cierre.',
                mechanics: Object.freeze({
                    darkness: Object.freeze({ visibility: Object.freeze({ radius: 118, midStop: 0.40, midAlpha: 0.46, outerAlpha: 0.94 }) })
                }),
                hazards: Object.freeze({
                    lava: Object.freeze({ initialDelayMs: 2600, intervalMs: 4100, maxActive: 3 }),
                    lightning: Object.freeze({ initialDelayMs: 4200, intervalMs: 7800, maxActive: 2 }),
                    landslide: Object.freeze({ initialDelayMs: 7200, intervalMs: 9800, maxActive: 1 })
                }),
                generation: Object.freeze({ blockDensityBonus: 0.05 })
            })
        }),
    });

    const runtime = { installed:false, originalInitLevel:null, originalUpdateRoguePresentation:null, originalDraw:null, lastBiomeId:null, transitionTimer:0, transitionNode:null };

    function clampDepth(depth) {
        const value = Math.max(1, Math.floor(Number(depth) || 1));
        return Math.min(value, TOTAL_BIOME_DEPTHS);
    }

    function getBiomeForDepthV49(depth) {
        let remaining = clampDepth(depth);
        for (const biome of BIOME_PROGRESSION) {
            if (remaining <= biome.rooms) return biome;
            remaining -= biome.rooms;
        }
        return BIOME_PROGRESSION[BIOME_PROGRESSION.length - 1];
    }

    function getBiomeStageV49(depth) {
        let remaining = clampDepth(depth);
        for (const biome of BIOME_PROGRESSION) {
            if (remaining <= biome.rooms) return remaining;
            remaining -= biome.rooms;
        }
        return ROOMS_PER_BIOME;
    }

    function getBiomeMetadataV49(depth) {
        const biome = getBiomeForDepthV49(depth);
        return Object.freeze({
            id: biome.id,
            themeId: biome.themeId,
            nombre: biome.name,
            stage: getBiomeStageV49(depth),
            rooms: biome.rooms,
            startDepth: BIOME_PROGRESSION.slice(0, BIOME_PROGRESSION.findIndex(b => b.id === biome.id)).reduce((n,b) => n+b.rooms,1),
            endDepth: BIOME_PROGRESSION.slice(0, BIOME_PROGRESSION.findIndex(b => b.id === biome.id)+1).reduce((n,b) => n+b.rooms,0),
            accent: biome.accent,
            bossEnabled: biome.bossEnabled !== false,
            examRoomType: biome.examRoomType || 'BOSS'
        });
    }

    function getBiomeStageConfigV51(biomeOrId, stage) {
        const id = typeof biomeOrId === 'string' ? biomeOrId : biomeOrId?.id;
        const safeStage = Math.max(1, Math.min(ROOMS_PER_BIOME, Number(stage) || 1));
        const profile = BIOME_STAGE_PROFILES_V51[id]?.[safeStage];
        if (!profile) return Object.freeze({ role: STAGE_ROLES[safeStage]?.id || 'introduction', lesson: '', mechanics: {}, hazards: {}, generation: {} });
        return profile;
    }

    function getBiomeRunLabelV49(depth) {
        const meta = getBiomeMetadataV49(depth);
        return `${meta.nombre} ${meta.stage}`;
    }

    function createTransitionNode() {
        if (!global.document?.body) return null;
        let node = global.document.getElementById('biome-transition');
        if (node) return node;
        node = global.document.createElement('div');
        node.id = 'biome-transition';
        node.className = 'biome-transition hidden';
        node.setAttribute('aria-live','polite');
        node.innerHTML = '<div class="biome-transition-kicker">TRANSICIÓN DE BIOMA</div><div class="biome-transition-name"></div><div class="biome-transition-range"></div>';
        global.document.body.appendChild(node);
        runtime.transitionNode = node;
        return node;
    }

    function showBiomeTransition(meta) {
        if (!runtime.lastBiomeId || runtime.lastBiomeId === meta.id) return;
        const node = createTransitionNode();
        if (!node) return;
        node.style.setProperty('--biome-accent', meta.accent);
        const name = node.querySelector('.biome-transition-name');
        const range = node.querySelector('.biome-transition-range');
        if (name) name.textContent = meta.nombre.toUpperCase();
        if (range) range.textContent = `ETAPA ${meta.stage} · PROFUNDIDADES ${meta.startDepth}–${meta.endDepth}`;
        node.classList.remove('hidden');
        node.classList.remove('is-visible');
        void node.offsetWidth;
        node.classList.add('is-visible');
        clearTimeout(runtime.transitionTimer);
        runtime.transitionTimer = setTimeout(() => {
            node.classList.remove('is-visible');
            setTimeout(() => node.classList.add('hidden'), 320);
        }, 1100);
    }

    function syncBiomeUi(meta) {
        const banner = global.document?.getElementById?.('run-banner');
        if (banner) banner.textContent = `RUN ${String(gameState.runNumber || 1).padStart(2,'0')} · ${meta.nombre.toUpperCase()} ${meta.stage} · DEPTH ${String(gameState.level).padStart(2,'0')}`;
        global.document?.querySelectorAll?.('[data-biome-id]').forEach(node => {
            const active = node.getAttribute('data-biome-id') === meta.id;
            node.classList.toggle('is-active', active);
            node.setAttribute('aria-current', active ? 'step' : 'false');
        });
        const summary = global.document?.getElementById?.('theme-selected-summary');
        if (summary) summary.textContent = `${meta.nombre.toUpperCase()} ${meta.stage} · MECÁNICAS + HAZARDS`;
    }

    function applyBiomeForDepthV49(depth, showTransition = true) {
        const meta = getBiomeMetadataV49(depth);
        if (typeof global.setActiveThemeV46 === 'function') global.setActiveThemeV46(meta.themeId, false);
        if (typeof gameState !== 'undefined') gameState.biomeV49 = { id: meta.id, themeId: meta.themeId, name: meta.nombre, stage: meta.stage, startDepth: meta.startDepth, endDepth: meta.endDepth, bossEnabled: meta.bossEnabled, examRoomType: meta.examRoomType, stageConfig: getBiomeStageConfigV51(meta.id, meta.stage) };
        syncBiomeUi(meta);
        if (typeof global.registerBiomeVisitV50 === 'function') global.registerBiomeVisitV50(meta);
        if (typeof global.touchRunDepthV50 === 'function') global.touchRunDepthV50(Number(depth) || 1);
        if (showTransition) showBiomeTransition(meta);
        runtime.lastBiomeId = meta.id;
        return meta;
    }

    function install() {
        if (runtime.installed) return true;
        if (typeof global.initLevel !== 'function') return false;
        runtime.originalInitLevel = global.initLevel;
        global.initLevel = function initLevelV49(...args) {
            const meta = applyBiomeForDepthV49(gameState.level, true);
            const result = runtime.originalInitLevel(...args);
            syncBiomeUi(meta);
            return result;
        };
        runtime.installed = true;
        applyBiomeForDepthV49(Number(gameState?.level) || 1, false);
        return true;
    }

    function bootstrap() {
        if (install()) return;
        setTimeout(bootstrap, 40);
    }

    global.BIOME_PROGRESSION_V49 = BIOME_PROGRESSION;
    global.getBiomeForDepthV49 = getBiomeForDepthV49;
    global.getBiomeStageV49 = getBiomeStageV49;
    global.getBiomeMetadataV49 = getBiomeMetadataV49;
    global.getBiomeRunLabelV49 = getBiomeRunLabelV49;
    global.getBiomeStageConfigV51 = getBiomeStageConfigV51;
    global.getBiomeProgressionSummaryV49 = () => ({ totalBiomes:BIOME_PROGRESSION.length, roomsPerBiome:ROOMS_PER_BIOME, totalDepths:TOTAL_BIOME_DEPTHS });
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBiomeProgression = () => BIOME_PROGRESSION.map(b => ({ ...b }));
    global.BOMBER_ENGINE.getBiomeForDepth = getBiomeForDepthV49;
    global.BOMBER_ENGINE.getBiomeMetadata = getBiomeMetadataV49;
    global.BOMBER_ENGINE.getBiomeStageConfig = getBiomeStageConfigV51;

    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', bootstrap, { once:true });
    else bootstrap();
})(window);
