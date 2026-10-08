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
                bombBtn?.classList.remove('is-pressed');
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
                bombBtn.classList.add('is-pressed');
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
    const values = {
        up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
    };

    function clearPressed() {
        buttons.forEach((button) => button.classList.remove('is-pressed'));
    }

    function setDirection(dir) {
        const value = values[dir];
        if (!value || !gameState.touchControls) return;
        gameState.touchControls.x = value[0];
        gameState.touchControls.y = value[1];
        // La cola representa SOLO la próxima orden. Mientras un tile está
        // avanzando puede reemplazarse por la dirección más reciente.
        gameState.touchControls.queuedX = value[0];
        gameState.touchControls.queuedY = value[1];
        gameState.lastMoveAxis = value[0] ? 'horizontal' : 'vertical';
        gameState.lastMoveInputAt = performance.now();
    }

    function getButtonAtPoint(clientX, clientY) {
        const element = document.elementFromPoint(clientX, clientY);
        const button = element?.closest?.('[data-mobile-dir]');
        return button && pad.contains(button) ? button : null;
    }

    function activateButton(button, pointerId) {
        if (!button) return;
        const dir = button.dataset.mobileDir;
        if (!values[dir]) return;
        activePointers.set(pointerId, dir);
        clearPressed();
        buttons.forEach((candidate) => {
            if (Array.from(activePointers.values()).includes(candidate.dataset.mobileDir)) {
                candidate.classList.add('is-pressed');
            }
        });
        setDirection(dir);
    }

    function releasePointer(pointerId) {
        activePointers.delete(pointerId);
        const remaining = Array.from(activePointers.values()).pop();
        clearPressed();
        if (remaining) {
            setDirection(remaining);
            buttons.find((button) => button.dataset.mobileDir === remaining)?.classList.add('is-pressed');
        } else if (gameState.touchControls) {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
            // No borrar la cola: un toque corto debe terminar exactamente
            // el tile que ya fue ordenado, sin iniciar una segunda orden.
        }
    }

    buttons.forEach((button) => {
        button.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            activateButton(button, event.pointerId);
            try { button.setPointerCapture(event.pointerId); } catch (_) {}
        }, { passive: false });

        button.addEventListener('pointermove', (event) => {
            event.preventDefault();
            if (!activePointers.has(event.pointerId)) return;
            const hovered = getButtonAtPoint(event.clientX, event.clientY);
            if (hovered && hovered !== button) activateButton(hovered, event.pointerId);
        }, { passive: false });

        const release = (event) => {
            event.preventDefault();
            releasePointer(event.pointerId);
        };
        button.addEventListener('pointerup', release, { passive: false });
        button.addEventListener('pointercancel', release, { passive: false });
        button.addEventListener('lostpointercapture', (event) => {
            if (activePointers.has(event.pointerId)) releasePointer(event.pointerId);
        });
        button.addEventListener('contextmenu', (event) => event.preventDefault());
    });

    window.addEventListener('blur', () => {
        activePointers.clear();
        clearPressed();
        if (gameState.touchControls) {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
            gameState.touchControls.queuedX = 0;
            gameState.touchControls.queuedY = 0;
        }
    });
})();
