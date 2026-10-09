// Bomberman Roguelike v6.30.3 — God Mode de desarrollo con inmunidad central.
(function installGodModeV6303(global){
    'use strict';

    const state = { enabled: false };

    function getPlayer(){ return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }
    function getGameState(){ return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }

    function syncRuntimeFlags(enabled){
        const active = !!enabled;
        const p = getPlayer();
        const gs = getGameState();
        if (gs) gs.godModeEnabled = active;
        if (p) {
            p.godModeEnabled = active;
            // God Mode usa la bandera visual ya existente sin borrar invulnerabilidad temporal.
            p.isInvincible = active || Number(p.invincibleTimer || 0) > 0;
        }
        const indicator = global.document?.getElementById('god-mode-indicator');
        if (indicator) {
            indicator.classList.toggle('hidden', !active);
            indicator.setAttribute('aria-hidden', active ? 'false' : 'true');
        }
    }

    function isGodModeActiveV616(){
        syncRuntimeFlags(state.enabled);
        return state.enabled;
    }

    function renderGodModeButton(){
        const button = global.document?.getElementById('btn-god-mode');
        const status = global.document?.getElementById('god-mode-status');
        if (button) {
            button.setAttribute('aria-pressed', state.enabled ? 'true' : 'false');
            button.textContent = state.enabled ? 'DESACTIVAR GOD MODE' : 'ACTIVAR GOD MODE';
            button.classList.toggle('is-active', state.enabled);
        }
        if (status) {
            status.textContent = state.enabled ? 'ON' : 'OFF';
            status.classList.toggle('is-active', state.enabled);
        }
        syncRuntimeFlags(state.enabled);
    }

    function setGodModeV616(enabled){
        state.enabled = !!enabled;
        renderGodModeButton();
        if (typeof global.sfx === 'function') global.sfx('click');
        if (typeof global.pushInformationFeedV61221 === 'function') {
            global.pushInformationFeedV61221(
                state.enabled ? 'GOD MODE ACTIVADO · DAÑO ANULADO' : 'GOD MODE DESACTIVADO',
                state.enabled ? '#86efac' : '#facc15'
            );
        }
        return state.enabled;
    }

    function toggleGodModeV616(){ return setGodModeV616(!state.enabled); }

    global.isGodModeActiveV616 = isGodModeActiveV616;
    global.setGodModeV616 = setGodModeV616;
    global.toggleGodModeV616 = toggleGodModeV616;

    const boot = () => {
        const button = global.document?.getElementById('btn-god-mode');
        if (button && !button.dataset.godModeBound) {
            button.addEventListener('click', toggleGodModeV616);
            button.dataset.godModeBound = 'true';
        }
        renderGodModeButton();
    };

    if (global.document?.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
})(window);
