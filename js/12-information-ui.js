// v6.30.3 — Notificaciones flotantes temporales; sustituye el registro persistente.
(function installInformationUIV6303(global){
    'use strict';

    const TOAST_LIFETIME_MS = 1500;
    const MAX_VISIBLE_TOASTS = 3;
    const state = { nextId: 1, timers: new Map() };

    function getContainer(){
        return global.document?.getElementById('ui-floating-toasts') || null;
    }

    function removeToast(id, node){
        const timer = state.timers.get(id);
        if (timer) global.clearTimeout(timer);
        state.timers.delete(id);
        if (node?.isConnected) node.remove();
    }

    function clearInformationFeedV61221(){
        for (const [id, timer] of state.timers) {
            global.clearTimeout(timer);
            state.timers.delete(id);
        }
        const container = getContainer();
        if (container) container.replaceChildren();
    }

    function safeAccent(value){
        const color = String(value || '').trim();
        return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#facc15';
    }

    function pushInformationFeedV61221(text, color = '#facc15'){
        const value = String(text ?? '').trim();
        const container = getContainer();
        if (!value || !container) return false;

        const id = state.nextId++;
        const toast = global.document.createElement('div');
        toast.className = 'runtime-toast';
        toast.dataset.toastId = String(id);
        toast.style.setProperty('--toast-accent', safeAccent(color));

        const accent = global.document.createElement('span');
        accent.className = 'runtime-toast-accent';
        accent.setAttribute('aria-hidden', 'true');
        const label = global.document.createElement('span');
        label.className = 'runtime-toast-text';
        label.textContent = value;
        toast.append(accent, label);
        container.appendChild(toast);

        // Mantener una pila corta para que mensajes consecutivos no tapen el mundo.
        while (container.children.length > MAX_VISIBLE_TOASTS) {
            const oldest = container.firstElementChild;
            const oldestId = Number(oldest?.dataset?.toastId);
            if (oldest && Number.isFinite(oldestId)) removeToast(oldestId, oldest);
            else oldest?.remove();
        }

        const timer = global.setTimeout(() => removeToast(id, toast), TOAST_LIFETIME_MS);
        state.timers.set(id, timer);
        return true;
    }

    // Compatibilidad con antiguos consumidores que actualizaban el feed por dt.
    // Los toasts usan reloj de interfaz para respetar 1,5 s incluso durante pausa.
    function updateInformationFeedV61221(){ /* Temporalidad gestionada por setTimeout + CSS. */ }

    global.pushInformationFeedV61221 = pushInformationFeedV61221;
    global.updateInformationFeedV61221 = updateInformationFeedV61221;
    global.clearInformationFeedV61221 = clearInformationFeedV61221;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.clearTransientNotifications = clearInformationFeedV61221;
})(window);
