// Bomberman Roguelike v6.16.0 — God Mode de desarrollo
// Interruptor único de desarrollo. No persiste y no modifica la build.
(function installGodModeV616(global){
    'use strict';

    const state = { enabled: false };

    function isGodModeActiveV616(){
        return state.enabled;
    }

    function renderGodModeButton(){
        const button = global.document?.getElementById('btn-god-mode');
        const status = global.document?.getElementById('god-mode-status');
        if (!button) return;

        button.setAttribute('aria-pressed', state.enabled ? 'true' : 'false');
        button.textContent = state.enabled ? 'DESACTIVAR GOD MODE' : 'ACTIVAR GOD MODE';
        button.classList.toggle('is-active', state.enabled);
        if (status){
            status.textContent = state.enabled ? 'ON' : 'OFF';
            status.classList.toggle('is-active', state.enabled);
        }
    }

    function setGodModeV616(enabled){
        state.enabled = !!enabled;
        renderGodModeButton();

        if (typeof global.sfx === 'function') global.sfx('click');
        if (typeof global.pushInformationFeedV61221 === 'function'){
            global.pushInformationFeedV61221(
                state.enabled ? 'GOD MODE ACTIVADO' : 'GOD MODE DESACTIVADO',
                state.enabled ? '#86efac' : '#facc15'
            );
        }
        return state.enabled;
    }

    function toggleGodModeV616(){
        return setGodModeV616(!state.enabled);
    }

    global.isGodModeActiveV616 = isGodModeActiveV616;
    global.setGodModeV616 = setGodModeV616;
    global.toggleGodModeV616 = toggleGodModeV616;

    const boot = () => {
        const button = global.document?.getElementById('btn-god-mode');
        if (!button) return;
        button.addEventListener('click', toggleGodModeV616);
        renderGodModeButton();
    };

    if (global.document?.readyState === 'loading'){
        global.document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})(window);
