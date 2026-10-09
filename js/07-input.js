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



// v6.31.0 — Gestos cardinales en la mitad izquierda; acciones independientes a la derecha.
(function setupMobileGestureControlsV6310() {
    const zone = document.getElementById('mobile-gesture-zone');
    const grabBtn = document.getElementById('btn-grab-mobile');
    const throwBtn = document.getElementById('btn-throw-mobile');
    if (!zone) return;
    const dirs = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const pointers = new Map(); const threshold = 22;
    function issue(dir) {
        const v=dirs[dir]; if(!v||!gameState?.touchControls||!gameState.isPlaying||gameState.paused)return;
        gameState.touchControls.x=v[0]; gameState.touchControls.y=v[1];
        gameState.touchControls.queuedX=v[0]; gameState.touchControls.queuedY=v[1];
        gameState.lastMoveAxis=v[0]?'horizontal':'vertical'; gameState.lastMoveInputAt=performance.now(); zone.dataset.direction=dir;
    }
    function clear(id) { pointers.delete(id); if(!pointers.size&&gameState?.touchControls){gameState.touchControls.x=0;gameState.touchControls.y=0;delete zone.dataset.direction;} }
    zone.addEventListener('pointerdown',e=>{if(!window.matchMedia('(max-width: 820px), (pointer: coarse)').matches||!gameState?.isPlaying||gameState.paused)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{zone.setPointerCapture(e.pointerId)}catch(_){}},{passive:false});
    zone.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return;const dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');p.x=e.clientX;p.y=e.clientY;issue(dir)},{passive:false});
    const release=e=>{if(!pointers.has(e.pointerId))return;e.preventDefault?.();clear(e.pointerId)};
    zone.addEventListener('pointerup',release,{passive:false});zone.addEventListener('pointercancel',release,{passive:false});zone.addEventListener('lostpointercapture',release);
    function reset(){pointers.clear();if(gameState?.touchControls){gameState.touchControls.x=0;gameState.touchControls.y=0;gameState.touchControls.queuedX=0;gameState.touchControls.queuedY=0;}delete zone.dataset.direction;if(typeof endBombHold==='function')endBombHold();}
    window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
    function bindAction(btn,fn){if(!btn)return;btn.addEventListener('pointerdown',e=>{e.preventDefault();if(!gameState?.isPlaying||gameState.paused)return;btn.classList.add('is-pressed');try{btn.setPointerCapture(e.pointerId)}catch(_){}fn()},{passive:false});const up=e=>{e.preventDefault?.();btn.classList.remove('is-pressed')};btn.addEventListener('pointerup',up,{passive:false});btn.addEventListener('pointercancel',up,{passive:false});btn.addEventListener('lostpointercapture',up);btn.addEventListener('contextmenu',e=>e.preventDefault())}
    bindAction(grabBtn,()=>{if(typeof window.tryGrabPlayerBombV610==='function')window.tryGrabPlayerBombV610()});
    bindAction(throwBtn,()=>{if(typeof window.throwCarriedBombV683==='function')window.throwCarriedBombV683(window.player)});
})();
