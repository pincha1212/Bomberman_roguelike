/*
 * BOMBERMAN ROGUELIKE v4.5 — Device Quality Configuration
 *
 * Manual visual profile selected before starting a run.
 * Gameplay, physics, AI and dungeon generation are intentionally unaffected.
 */

const DEVICE_QUALITY_V45 = Object.freeze({
    low: Object.freeze({
        id: 'low',
        label: 'DETALLES BAJOS',
        target: 'Gama baja',
        description: 'Menos partículas, iluminación mínima y efectos reducidos.',
        particleSpawn: 0.30,
        particleBudget: 28,
        renderParticleBudget: 24,
        ambientDust: 0,
        lightingEnabled: false,
        lightingEvery: 4,
        bombGlow: false,
        shadowEffects: false,
        feedbackParticles: 0.35,
        feedbackRings: 0.35,
        feedbackFlash: 0.45,
        cameraKick: 0.65,
        maxSoundsPerSecond: 5
    }),
    medium: Object.freeze({
        id: 'medium',
        label: 'DETALLES MEDIOS',
        target: 'Gama media',
        description: 'Equilibrio entre apariencia y carga de trabajo.',
        particleSpawn: 0.60,
        particleBudget: 64,
        renderParticleBudget: 48,
        ambientDust: 10,
        lightingEnabled: true,
        lightingEvery: 2,
        bombGlow: true,
        shadowEffects: true,
        feedbackParticles: 0.65,
        feedbackRings: 0.65,
        feedbackFlash: 0.75,
        cameraKick: 0.85,
        maxSoundsPerSecond: 8
    }),
    high: Object.freeze({
        id: 'high',
        label: 'DETALLES MÁXIMOS',
        target: 'Gama alta',
        description: 'Todos los efectos visuales disponibles dentro de los límites del juego.',
        particleSpawn: 1,
        particleBudget: 120,
        renderParticleBudget: 96,
        ambientDust: 24,
        lightingEnabled: true,
        lightingEvery: 1,
        bombGlow: true,
        shadowEffects: true,
        feedbackParticles: 1,
        feedbackRings: 1,
        feedbackFlash: 1,
        cameraKick: 1,
        maxSoundsPerSecond: 10
    })
});

const DEVICE_QUALITY_V45_STORAGE = 'bombermanRoguelikeQuality';

const deviceQualityV45 = {
    selected: 'medium',
    initialized: false
};

function getDeviceQualityV45(id = deviceQualityV45.selected) {
    return DEVICE_QUALITY_V45[id] || DEVICE_QUALITY_V45.medium;
}

function setDeviceQualityV45(id, persist = true) {
    const next = DEVICE_QUALITY_V45[id] ? id : 'medium';
    deviceQualityV45.selected = next;

    if (persist) {
        try { localStorage.setItem(DEVICE_QUALITY_V45_STORAGE, next); } catch (_) {}
    }

    const profile = getDeviceQualityV45(next);
    if (typeof perf === 'object' && perf) {
        perf.lowQuality = next === 'low';
        perf.fastFrames = 0;
        perf.slowFrames = 0;
    }

    if (typeof largeSupport === 'object' && largeSupport) {
        largeSupport.particleBudget = profile.particleBudget;
        largeSupport.renderParticleBudget = profile.renderParticleBudget;
        largeSupport.shadowEffects = profile.shadowEffects;
    }

    document.body?.setAttribute('data-quality', next);

    document.querySelectorAll('[data-quality-option]').forEach(button => {
        const active = button.getAttribute('data-quality-option') === next;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    const summary = document.getElementById('quality-selected-summary');
    if (summary) {
        summary.textContent = `${profile.label} · ${profile.target}`;
    }

    return profile;
}

function initializeDeviceQualityV45() {
    if (deviceQualityV45.initialized) return getDeviceQualityV45();
    deviceQualityV45.initialized = true;

    let stored = null;
    try { stored = localStorage.getItem(DEVICE_QUALITY_V45_STORAGE); } catch (_) {}

    setDeviceQualityV45(DEVICE_QUALITY_V45[stored] ? stored : 'medium', false);

    document.querySelectorAll('[data-quality-option]').forEach(button => {
        button.addEventListener('click', () => {
            initAudio();
            audioCtx?.resume();
            sfx('click');
            setDeviceQualityV45(button.getAttribute('data-quality-option'));
        });
    });

    return getDeviceQualityV45();
}

function getDeviceQualityV45State() {
    return {
        id: deviceQualityV45.selected,
        ...getDeviceQualityV45()
    };
}

function deviceQualityV45ParticleCount(count) {
    const profile = getDeviceQualityV45();
    return Math.max(0, Math.round(Number(count || 0) * profile.particleSpawn));
}

function deviceQualityV45FeedbackCount(count, kind = 'particles') {
    const profile = getDeviceQualityV45();
    const scale = kind === 'rings' ? profile.feedbackRings : profile.feedbackParticles;
    return Math.max(0, Math.round(Number(count || 0) * scale));
}

function deviceQualityV45ShouldBombGlow() {
    const profile = getDeviceQualityV45();
    return profile.bombGlow && (!perf.lowQuality || gameState.animFrame % 2 === 0);
}

function deviceQualityV45ShouldLighting() {
    const profile = getDeviceQualityV45();
    if (!profile.lightingEnabled) return false;
    const interval = Math.max(1, profile.lightingEvery || 1);
    return gameState.animFrame % interval === 0;
}

function deviceQualityV45FeedbackFlash(alpha) {
    return Number(alpha || 0) * getDeviceQualityV45().feedbackFlash;
}

function deviceQualityV45CameraKick(amount) {
    return Number(amount || 0) * getDeviceQualityV45().cameraKick;
}

function deviceQualityV45Init() {
    return initializeDeviceQualityV45();
}

window.DEVICE_QUALITY_V45 = DEVICE_QUALITY_V45;
window.getDeviceQualityV45 = getDeviceQualityV45;
window.setDeviceQualityV45 = setDeviceQualityV45;
window.getDeviceQualityV45State = getDeviceQualityV45State;
window.deviceQualityV45ParticleCount = deviceQualityV45ParticleCount;
window.deviceQualityV45FeedbackCount = deviceQualityV45FeedbackCount;
window.deviceQualityV45ShouldBombGlow = deviceQualityV45ShouldBombGlow;
window.deviceQualityV45ShouldLighting = deviceQualityV45ShouldLighting;
window.deviceQualityV45FeedbackFlash = deviceQualityV45FeedbackFlash;
window.deviceQualityV45CameraKick = deviceQualityV45CameraKick;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deviceQualityV45Init, { once: true });
} else {
    deviceQualityV45Init();
}
