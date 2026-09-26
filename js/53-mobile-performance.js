/*
 * Bomberman Roguelike v6.5 — Mobile Performance Controller
 *
 * Objetivo: priorizar legibilidad y gameplay en móviles sin cambiar la simulación.
 * No elimina entidades ni efectos de gameplay; reduce únicamente su representación.
 */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'bomberman_render_profile_v65';

    const PROFILES = Object.freeze({
        low: Object.freeze({
            id: 'low',
            particleBudget: 20,
            floaterBudget: 8,
            bombEffectBudget: 96,
            showAmbientDust: false,
            showLighting: false,
            showCombatFeedback: false,
            showRoomDecor: false,
            showEnemyAISignals: false,
            useCanvasFilter: false
        }),
        medium: Object.freeze({
            id: 'medium',
            particleBudget: 48,
            floaterBudget: 16,
            bombEffectBudget: 180,
            showAmbientDust: true,
            showLighting: false,
            showCombatFeedback: true,
            showRoomDecor: true,
            showEnemyAISignals: false,
            useCanvasFilter: true
        }),
        high: Object.freeze({
            id: 'high',
            particleBudget: 96,
            floaterBudget: 24,
            bombEffectBudget: 360,
            showAmbientDust: true,
            showLighting: true,
            showCombatFeedback: true,
            showRoomDecor: true,
            showEnemyAISignals: true,
            useCanvasFilter: true
        })
    });

    function detectRecommendedProfile() {
        const coarse = !!global.matchMedia?.('(pointer: coarse)').matches;
        const cores = Number(global.navigator?.hardwareConcurrency || 4);
        const memory = Number(global.navigator?.deviceMemory || 0);
        const smallViewport = Math.min(global.innerWidth || 9999, global.innerHeight || 9999) <= 820;

        if (coarse && (cores <= 6 || (memory > 0 && memory <= 4) || smallViewport)) return 'low';
        if (coarse || smallViewport) return 'medium';
        return 'high';
    }

    function readProfileId() {
        try {
            const saved = global.localStorage?.getItem(STORAGE_KEY);
            if (saved && PROFILES[saved]) return saved;
        } catch (_) {}
        return detectRecommendedProfile();
    }

    let profileId = readProfileId();

    function getProfile() {
        return PROFILES[profileId] || PROFILES.medium;
    }

    function setProfile(nextId, persist = true) {
        if (!PROFILES[nextId]) return false;
        profileId = nextId;
        if (persist) {
            try { global.localStorage?.setItem(STORAGE_KEY, nextId); } catch (_) {}
        }
        document.body?.classList.toggle('mobile-performance-low', profileId === 'low');
        document.body?.classList.toggle('mobile-performance-medium', profileId === 'medium');
        document.body?.classList.toggle('mobile-performance-high', profileId === 'high');
        return true;
    }

    setProfile(profileId, false);

    global.BOMBER_RENDER_PROFILE_V65 = PROFILES;
    global.getBomberRenderProfileV65 = getProfile;
    global.setBomberRenderProfileV65 = setProfile;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getRenderProfile = getProfile;
    global.BOMBER_ENGINE.setRenderProfile = setProfile;
    global.BOMBER_ENGINE.getRenderProfileAudit = () => ({
        profile: getProfile().id,
        recommended: detectRecommendedProfile(),
        mobile: !!global.matchMedia?.('(pointer: coarse)').matches,
        cores: Number(global.navigator?.hardwareConcurrency || 0),
        memoryGB: Number(global.navigator?.deviceMemory || 0)
    });
})(window);
