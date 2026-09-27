// Bomberman Roguelike v3.6 — Keyboard, D-pad móvil, bomba y pausa

        function togglePause() {
            if (!gameState.isPlaying) return;
            gameState.paused = !gameState.paused;
            const screen = document.getElementById('pause-screen');
            if (screen) screen.classList.toggle('hidden', !gameState.paused);
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
        });

        // v6.9.5: el movimiento táctil usa exclusivamente el D-pad digital.
        // El movimiento táctil usa exclusivamente el D-pad digital, alineado
        // con el sistema de movimiento por tiles.

        // V3.10: un único sistema de input para bomba.
        // Una pulsación coloca una bomba; mantener pulsado permite repetir con
        // retardo/cooldown controlados y nunca depende del auto-repeat del teclado.
        const setupBombInput = () => {
            const bombBtn = document.getElementById('btn-bomb-mobile');
            const startHold = (event, source='input') => {
                event?.preventDefault?.();
                if (typeof beginBombHold === 'function') beginBombHold(source, event);
            };
            const endHold = (event) => {
                event?.preventDefault?.();
                if (typeof endBombHold === 'function') endBombHold();
            };

            window.addEventListener('keydown', (e) => {
                if (e.code !== 'Space' && e.code !== 'KeyZ') return;
                if (!gameState.isPlaying) return;
                e.preventDefault();
                if (e.repeat) return;
                startHold(e, 'keyboard');
            });
            window.addEventListener('keyup', (e) => {
                if (e.code === 'Space' || e.code === 'KeyZ') endHold(e);
            });
            window.addEventListener('blur', () => endHold());

            if (!bombBtn) return;
            bombBtn.addEventListener('pointerdown', (e) => {
                startHold(e, 'pointer');
                try { bombBtn.setPointerCapture(e.pointerId); } catch (_) {}
            }, {passive:false});
            bombBtn.addEventListener('pointerup', endHold, {passive:false});
            bombBtn.addEventListener('pointercancel', endHold, {passive:false});
            bombBtn.addEventListener('contextmenu', (e) => e.preventDefault());
        };
        setupBombInput();



// v6.9.5 — Controles móviles orientados a movimiento por tiles.
// D-pad digital: cada dirección representa una orden cardinal estable y puede
// mantenerse presionada para encadenar tiles. Usa Pointer Events para evitar
// conflictos entre touch/mouse y permite multitouch independiente con bomba.
(function setupMobileTileControls() {
    const pad = document.getElementById('mobile-dpad');
    if (!pad) return;

    const buttons = Array.from(pad.querySelectorAll('[data-mobile-dir]'));
    const activePointers = new Map();

    function setDirection(dir) {
        if (!gameState.touchControls) return;
        const values = {
            up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
        };
        const value = values[dir];
        if (!value) return;
        gameState.touchControls.x = value[0];
        gameState.touchControls.y = value[1];
        gameState.lastMoveInputAt = performance.now();
    }

    function releasePointer(pointerId) {
        activePointers.delete(pointerId);
        const remaining = Array.from(activePointers.values()).pop();
        if (remaining) setDirection(remaining);
        else {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
        }
    }

    buttons.forEach((button) => {
        const dir = button.dataset.mobileDir;
        button.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            activePointers.set(event.pointerId, dir);
            button.classList.add('is-pressed');
            try { button.setPointerCapture(event.pointerId); } catch (_) {}
            setDirection(dir);
        }, { passive: false });

        const release = (event) => {
            event.preventDefault();
            button.classList.remove('is-pressed');
            releasePointer(event.pointerId);
        };
        button.addEventListener('pointerup', release, { passive: false });
        button.addEventListener('pointercancel', release, { passive: false });
        button.addEventListener('lostpointercapture', (event) => {
            if (activePointers.has(event.pointerId)) releasePointer(event.pointerId);
            button.classList.remove('is-pressed');
        });
        button.addEventListener('contextmenu', (event) => event.preventDefault());
    });

    window.addEventListener('blur', () => {
        activePointers.clear();
        buttons.forEach((button) => button.classList.remove('is-pressed'));
        gameState.touchControls.x = 0;
        gameState.touchControls.y = 0;
    });
})();
