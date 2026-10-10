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



// v6.31.4 — Controles táctiles invisibles: izquierda mueve; derecha toca/ mantiene.
(function setupInvisibleTouchControlsV6314() {
    const moveZone = document.getElementById('mobile-gesture-zone');
    const actionZone = document.getElementById('mobile-action-zone');
    if (!moveZone || !actionZone) return;

    const dirs = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const movePointers = new Map();
    const actionPointers = new Map();
    const threshold = 22;
    const longPressMs = 360;

    function canControl() {
        return !!(gameState?.isPlaying && !gameState.paused && !document.hidden);
    }
    function isTouchLayout() {
        return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    }
    function getCarriedBomb() {
        if (typeof window.getCarriedBombForEntityV682 !== 'function' || !window.player) return null;
        return window.getCarriedBombForEntityV682(window.player) || null;
    }
    function move(dir) {
        const v = dirs[dir];
        if (!v || !canControl() || !gameState?.touchControls) return;
        gameState.touchControls.x = v[0];
        gameState.touchControls.y = v[1];
        gameState.touchControls.queuedX = v[0];
        gameState.touchControls.queuedY = v[1];
        gameState.lastMoveAxis = v[0] ? 'horizontal' : 'vertical';
        gameState.lastMoveInputAt = performance.now();
    }
    function clearMove(id) {
        movePointers.delete(id);
        if (!movePointers.size && gameState?.touchControls) {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
        }
    }
    function performShortTap() {
        if (!canControl()) return;
        // Existing bomb placement flow: one immediate placement, no repeat-hold.
        if (typeof beginBombHold === 'function') {
            beginBombHold('pointer');
            if (typeof endBombHold === 'function') endBombHold();
        }
    }
    function performLongPress() {
        if (!canControl()) return;
        if (getCarriedBomb()) {
            if (typeof window.throwCarriedBombV683 === 'function') {
                window.throwCarriedBombV683(window.player);
            }
        } else if (typeof window.tryGrabPlayerBombV610 === 'function') {
            window.tryGrabPlayerBombV610();
        }
    }
    function cancelAction(id) {
        const state = actionPointers.get(id);
        if (!state) return;
        if (state.timer) window.clearTimeout(state.timer);
        actionPointers.delete(id);
    }
    function reset() {
        for (const id of actionPointers.keys()) cancelAction(id);
        movePointers.clear();
        if (gameState?.touchControls) {
            gameState.touchControls.x = 0;
            gameState.touchControls.y = 0;
            gameState.touchControls.queuedX = 0;
            gameState.touchControls.queuedY = 0;
        }
        if (typeof endBombHold === 'function') endBombHold();
    }

    moveZone.addEventListener('pointerdown', e => {
        if (!isTouchLayout() || !canControl()) return;
        e.preventDefault();
        movePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
        try { moveZone.setPointerCapture(e.pointerId); } catch (_) {}
    }, {passive:false});
    moveZone.addEventListener('pointermove', e => {
        const point = movePointers.get(e.pointerId);
        if (!point) return;
        e.preventDefault();
        const dx = e.clientX - point.x;
        const dy = e.clientY - point.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
        const dir = Math.abs(dx) > Math.abs(dy)
            ? (dx < 0 ? 'left' : 'right')
            : (dy < 0 ? 'up' : 'down');
        point.x = e.clientX;
        point.y = e.clientY;
        move(dir);
    }, {passive:false});
    const releaseMove = e => {
        if (!movePointers.has(e.pointerId)) return;
        e.preventDefault?.();
        clearMove(e.pointerId);
    };
    moveZone.addEventListener('pointerup', releaseMove, {passive:false});
    moveZone.addEventListener('pointercancel', releaseMove, {passive:false});
    moveZone.addEventListener('lostpointercapture', releaseMove);

    actionZone.addEventListener('pointerdown', e => {
        if (!isTouchLayout() || !canControl()) return;
        e.preventDefault();
        if (actionPointers.has(e.pointerId)) return;
        const state = {startedAt:performance.now(), longTriggered:false, timer:null};
        state.timer = window.setTimeout(() => {
            const current = actionPointers.get(e.pointerId);
            if (!current || !canControl()) return;
            current.longTriggered = true;
            performLongPress();
        }, longPressMs);
        actionPointers.set(e.pointerId, state);
        try { actionZone.setPointerCapture(e.pointerId); } catch (_) {}
    }, {passive:false});

    const releaseAction = e => {
        const state = actionPointers.get(e.pointerId);
        if (!state) return;
        e.preventDefault?.();
        if (state.timer) window.clearTimeout(state.timer);
        actionPointers.delete(e.pointerId);
        // A release before the threshold is a short tap: place one bomb.
        if (!state.longTriggered && canControl()) performShortTap();
    };
    actionZone.addEventListener('pointerup', releaseAction, {passive:false});
    actionZone.addEventListener('pointercancel', e => cancelAction(e.pointerId), {passive:false});
    actionZone.addEventListener('lostpointercapture', e => {
        // Pointer capture may be lost after a normal pointerup; only clean up
        // a still-pending action to avoid converting a long press into a tap.
        cancelAction(e.pointerId);
    });
    actionZone.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
    document.addEventListener('gameplay:ended', reset);
})();
