// Bomberman Roguelike v3.10 — Keyboard, joystick, bomb button and pause input

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
        
        const setupBombButton = () => {
            const bombBtn = document.getElementById('btn-bomb-mobile');
            if(!bombBtn) return;
            const triggerBomb = (e) => {
                e.preventDefault();
                requestBombPlacement();
            };
            bombBtn.addEventListener('pointerdown', triggerBomb, {passive: false});
            bombBtn.addEventListener('contextmenu', (e) => e.preventDefault());
        };
        setupBombButton();

