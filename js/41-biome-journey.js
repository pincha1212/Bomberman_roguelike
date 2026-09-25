// Bomberman Roguelike v5.0 — Biome Journey
// Capa narrativa/data-driven sobre la progresión existente.
// No crea mecánicas, hazards ni lógica de combate.
(function initBiomeJourneyV50(global) {
    'use strict';

    const BIOME_JOURNEY = Object.freeze({
        winter: Object.freeze({
            verb: 'deslizar', lesson: 'Planear la inercia antes de frenar.', rhythm: 'anticipacion', bossLesson: 'Controlar el deslizamiento bajo presión.', transitionIn: 'El hielo cubre el suelo.'
        }),
        autumn: Object.freeze({
            verb: 'leer', lesson: 'Leer el viento antes de comprometer una jugada.', rhythm: 'lectura', bossLesson: 'Anticipar el viento y reposicionarse.', transitionIn: 'El hielo se derrite y el viento levanta hojas.'
        }),
        spring: Object.freeze({
            verb: 'adaptar', lesson: 'Cambiar de ruta cuando el terreno se transforma.', rhythm: 'mutacion', bossLesson: 'Adaptarse a pasillos que cambian.', transitionIn: 'El suelo vuelve a crecer.'
        }),
        summer: Object.freeze({
            verb: 'administrar', lesson: 'Administrar velocidad, espacio y recursos.', rhythm: 'presion', bossLesson: 'Mantener recursos mientras aumenta la presión.', transitionIn: 'La humedad desaparece y llega el calor.'
        }),
        underground: Object.freeze({
            verb: 'escuchar', lesson: 'Esperar información antes de romper.', rhythm: 'tension', bossLesson: 'Leer el peligro con poca visibilidad.', transitionIn: 'El camino desciende bajo tierra.'
        }),
        clouds: Object.freeze({
            verb: 'flotar', lesson: 'Soltar el movimiento antes de llegar al destino.', rhythm: 'desfase', bossLesson: 'Corregir la inercia aérea.', transitionIn: 'El suelo desaparece bajo las nubes.'
        }),
        mountains: Object.freeze({
            verb: 'posicionar', lesson: 'Elegir una línea segura antes de exponerse.', rhythm: 'precision', bossLesson: 'Mantener posición con el terreno inestable.', transitionIn: 'La ruta se estrecha y gana altura.'
        }),
        beach: Object.freeze({
            verb: 'esperar', lesson: 'Esperar la ventana correcta antes de avanzar.', rhythm: 'ventanas', bossLesson: 'Cruzar cuando la marea abre espacio.', transitionIn: 'La piedra termina y aparece la costa.'
        }),
        space: Object.freeze({
            verb: 'soltar', lesson: 'Soltar la dirección antes de alcanzar el objetivo.', rhythm: 'desfase', bossLesson: 'Convertir la inercia en ventaja.', transitionIn: 'La gravedad comienza a desaparecer.'
        }),
        sky: Object.freeze({
            verb: 'anticipar', lesson: 'Leer corrientes antes de cruzar un vacío.', rhythm: 'anticipacion', bossLesson: 'Combinar viento y movimiento en el aire.', transitionIn: 'La mazmorra se abre hacia el cielo.'
        }),
        inferno: Object.freeze({
            verb: 'correr', lesson: 'Moverse antes de que el terreno cierre la oportunidad.', rhythm: 'reloj', bossLesson: 'Tomar decisiones rápidas cuando el espacio se consume.', transitionIn: 'El aire se calienta y el suelo comienza a arder.'
        })
    });

    const STAGE_ROLES = Object.freeze({
        1: Object.freeze({ id: 'introduction', label: 'INTRODUCCIÓN' }),
        2: Object.freeze({ id: 'reinforcement', label: 'REFUERZO' }),
        3: Object.freeze({ id: 'combination', label: 'COMBINACIÓN' }),
        4: Object.freeze({ id: 'exam', label: 'EXAMEN' })
    });

    function getJourneyDataV50(metaOrId) {
        const id = typeof metaOrId === 'string' ? metaOrId : metaOrId?.id;
        const data = BIOME_JOURNEY[id];
        return data ? Object.freeze({ ...data, stageRole: STAGE_ROLES[Number(metaOrId?.stage) || 1] || STAGE_ROLES[1] }) : null;
    }

    function createJourneyStateV50() {
        return {
            visitedBiomes: [],
            discoveredVerbs: [],
            currentBiomeId: null,
            currentStage: 1,
            maxDepth: 0
        };
    }

    function ensureJourneyStateV50() {
        if (typeof gameState === 'undefined') return null;
        if (!gameState.runJourneyV50) gameState.runJourneyV50 = createJourneyStateV50();
        return gameState.runJourneyV50;
    }

    function registerBiomeVisitV50(meta) {
        const state = ensureJourneyStateV50();
        if (!state || !meta?.id) return null;
        const data = getJourneyDataV50(meta);
        if (!data) return null;

        state.currentBiomeId = meta.id;
        state.currentStage = Number(meta.stage) || 1;
        state.maxDepth = Math.max(Number(state.maxDepth) || 0, Number(gameState.level) || Number(meta.startDepth) || 0);

        if (!state.visitedBiomes.some(item => item.id === meta.id)) {
            state.visitedBiomes.push({ id: meta.id, name: meta.nombre, startDepth: meta.startDepth, endDepth: meta.endDepth });
        }
        if (!state.discoveredVerbs.includes(data.verb)) state.discoveredVerbs.push(data.verb);
        return data;
    }

    function touchRunDepthV50(depth) {
        const state = ensureJourneyStateV50();
        if (!state) return;
        state.maxDepth = Math.max(Number(state.maxDepth) || 0, Number(depth) || 0);
    }

    function getRunJourneySummaryV50() {
        const state = ensureJourneyStateV50() || createJourneyStateV50();
        const details = state.visitedBiomes.map(item => {
            const data = BIOME_JOURNEY[item.id];
            return { ...item, verb: data?.verb || null, lesson: data?.lesson || null };
        });
        return Object.freeze({
            maxDepth: Number(state.maxDepth) || 0,
            visitedBiomes: details,
            discoveredVerbs: [...state.discoveredVerbs]
        });
    }

    function getBiomeStageRoleV50(stage) {
        return STAGE_ROLES[Math.max(1, Math.min(4, Number(stage) || 1))];
    }

    global.BIOME_JOURNEY_V50 = BIOME_JOURNEY;
    global.BIOME_STAGE_ROLES_V50 = STAGE_ROLES;
    global.getJourneyDataV50 = getJourneyDataV50;
    global.createJourneyStateV50 = createJourneyStateV50;
    global.registerBiomeVisitV50 = registerBiomeVisitV50;
    global.touchRunDepthV50 = touchRunDepthV50;
    global.getRunJourneySummaryV50 = getRunJourneySummaryV50;
    global.getBiomeStageRoleV50 = getBiomeStageRoleV50;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getBiomeJourney = () => BIOME_JOURNEY;
    global.BOMBER_ENGINE.getBiomeStageRoles = () => STAGE_ROLES;
    global.BOMBER_ENGINE.getRunJourney = getRunJourneySummaryV50;
})(window);
