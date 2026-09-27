// Bomberman Roguelike v3.6 — Keyboard, joystick, bomb button and pause input

        function togglePause() {
            if (!gameState.isPlaying) return;
            gameState.paused = !gameState.paused;
            const screen = document.getElementById('pause-screen');
            if (screen) screen.classList.toggle('hidden', !gameState.paused);
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
        });

        // Virtual Joystick setup
        const setupJoystick = () => {
            const zone = document.getElementById('joystick-zone');
            const knob = document.getElementById('joystick-knob');
            if (!zone || !knob) return;

            const maxRadius = 35;
            let joyActive = false;
            let joyCenterX = 0;
            let joyCenterY = 0;
            let lastJoyDirection = null;

            const updateJoyPosition = (clientX, clientY) => {
                let dx = clientX - joyCenterX;
                let dy = clientY - joyCenterY;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > maxRadius) {
                    dx = (dx / distance) * maxRadius;
                    dy = (dy / distance) * maxRadius;
                }

                knob.style.transform = `translate(${dx}px, ${dy}px)`;

                let normalizedX = dx / maxRadius;
                let normalizedY = dy / maxRadius;
                
                if (Math.abs(normalizedX) < 0.2) normalizedX = 0;
                if (Math.abs(normalizedY) < 0.2) normalizedY = 0;

                gameState.touchControls.x = normalizedX;
                gameState.touchControls.y = normalizedY;
                let joyDirection = null;
                if (Math.abs(normalizedX) >= Math.abs(normalizedY) && Math.abs(normalizedX) >= 0.2) {
                    joyDirection = normalizedX > 0 ? 'right' : 'left';
                } else if (Math.abs(normalizedY) >= 0.2) {
                    joyDirection = normalizedY > 0 ? 'down' : 'up';
                }
                if (joyDirection !== lastJoyDirection) {
                    if (joyDirection) gameState.lastMoveInputAt = performance.now();
                    lastJoyDirection = joyDirection;
                }
            };

            const start = (e) => {
                e.preventDefault();
                joyActive = true;
                const rect = zone.getBoundingClientRect();
                joyCenterX = rect.left + rect.width / 2;
                joyCenterY = rect.top + rect.height / 2;
                const touch = e.type === 'touchstart' ? e.touches[0] : e;
                updateJoyPosition(touch.clientX, touch.clientY);
            };

            const move = (e) => {
                if (!joyActive) return;
                e.preventDefault();
                const touch = e.type === 'touchmove' ? e.touches[0] : e;
                updateJoyPosition(touch.clientX, touch.clientY);
            };

            const end = (e) => {
                joyActive = false;
                knob.style.transform = `translate(0px, 0px)`;
                gameState.touchControls.x = 0;
                gameState.touchControls.y = 0;
                lastJoyDirection = null;
            };

            zone.addEventListener('touchstart', start, { passive: false });
            zone.addEventListener('touchmove', move, { passive: false });
            zone.addEventListener('touchend', end, { passive: false });
            zone.addEventListener('touchcancel', end, { passive: false });
            
            zone.addEventListener('mousedown', start);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', end);
        };

        setupJoystick();

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



// v6.9.4 — Controles móviles orientados a movimiento por tiles.
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
