// Bomberman Roguelike v5.3 — Test Controls
// Solo se activa con ?test=1. No modifica la lógica de juego normal.
(function initTestControlsV53(global) {
    'use strict';

    const TEST_MODE = new URLSearchParams(global.location.search).get('test') === '1';

    function getNode(id) { return global.document?.getElementById(id) || null; }

    function clampDepth(value) {
        const total = typeof global.getBiomeProgressionSummaryV49 === 'function'
            ? Number(global.getBiomeProgressionSummaryV49().totalDepths) || 44
            : 44;
        return Math.max(1, Math.min(total, Math.floor(Number(value) || 1)));
    }

    function syncInput() {
        const input = getNode('test-depth-input');
        if (input && typeof global.gameState !== 'undefined') input.value = String(global.gameState.level || 1);
    }

    function jump(value) {
        const depth = clampDepth(value);
        if (typeof global.startDepthForTestV53 !== 'function') return false;
        global.startDepthForTestV53(depth);
        syncInput();
        return true;
    }

    function install() {
        const root = getNode('test-controls');
        if (!root) return false;
        if (!TEST_MODE) { root.classList.add('hidden'); return true; }
        root.classList.remove('hidden');

        root.querySelectorAll('[data-test-step]').forEach(button => {
            button.addEventListener('click', () => {
                const current = typeof global.gameState !== 'undefined' ? Number(global.gameState.level) || 1 : 1;
                jump(current + Number(button.getAttribute('data-test-step') || 0));
            });
        });

        getNode('test-depth-go')?.addEventListener('click', () => jump(getNode('test-depth-input')?.value));
        getNode('test-depth-input')?.addEventListener('keydown', event => {
            if (event.key === 'Enter') jump(event.currentTarget.value);
        });

        global.document.addEventListener('keydown', event => {
            if (!TEST_MODE || event.target?.matches?.('input,textarea,select,button')) return;
            if (event.key === '[') {
                event.preventDefault();
                jump((Number(global.gameState?.level) || 1) - 1);
            }
            if (event.key === ']') {
                event.preventDefault();
                jump((Number(global.gameState?.level) || 1) + 1);
            }
        });

        syncInput();
        return true;
    }

    function bootstrap() {
        if (install()) return;
        global.setTimeout(bootstrap, 40);
    }

    global.BOMBER_TEST_MODE_V53 = TEST_MODE;
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.isTestMode = () => TEST_MODE;
    global.BOMBER_ENGINE.skipToDepth = jump;
    bootstrap();
})(window);
