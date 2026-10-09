// v6.31.1 — Visibilidad del sidebar y de los controles táctiles.
(() => {
    'use strict';

    function initUIVisibilityV6311() {
        const mainMenu = document.getElementById('main-menu');
        const layout = document.getElementById('game-layout');
        const panel = document.getElementById('game-info-panel');
        const toggle = document.getElementById('btn-toggle-game-info');
        const mobileControls = document.getElementById('mobile-controls');
        const startScreen = document.getElementById('start-screen');
        const blockingScreens = [
            document.getElementById('game-over-screen'),
            document.getElementById('level-complete-screen'),
            document.getElementById('pause-screen')
        ].filter(Boolean);

        if (!mainMenu || !layout || !panel || !toggle || !mobileControls || !startScreen) return;

        // Cerrado por defecto para dejar el máximo espacio visible al tablero.
        layout.classList.add('info-panel-collapsed');

        function syncSidebar() {
            const expanded = !layout.classList.contains('info-panel-collapsed');
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.setAttribute('aria-label', expanded
                ? 'Ocultar información de la partida'
                : 'Mostrar información de la partida');
            toggle.textContent = expanded ? 'INFO ×' : 'INFO +';
            panel.setAttribute('aria-hidden', String(!expanded));
        }

        function syncGameplayControls() {
            const activeRun = mainMenu.classList.contains('run-active');
            const startHidden = startScreen.classList.contains('hidden');
            const overlayVisible = blockingScreens.some(screen => !screen.classList.contains('hidden'));
            const active = activeRun && startHidden && !overlayVisible;
            document.body.classList.toggle('gameplay-active', active);
            mobileControls.setAttribute('aria-hidden', String(!active));
        }

        toggle.addEventListener('click', () => {
            layout.classList.toggle('info-panel-collapsed');
            syncSidebar();
        });

        // La app usa clases .run-active y .hidden para dirigir sus pantallas.
        const observer = new MutationObserver(() => syncGameplayControls());
        [mainMenu, startScreen, ...blockingScreens].forEach(element => {
            observer.observe(element, { attributes: true, attributeFilter: ['class'] });
        });

        syncSidebar();
        syncGameplayControls();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUIVisibilityV6311, { once: true });
    } else {
        initUIVisibilityV6311();
    }
})();
