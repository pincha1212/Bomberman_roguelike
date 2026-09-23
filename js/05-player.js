// Bomberman Roguelike v3.12 — Cardinal assisted player movement and collision helpers
        // V3.2.4 — MOVEMENT UPDATE
        // Movimiento continuo cardinal asistido. La cuadrícula SOLO define las paredes.
        // El personaje usa una hurtbox de movimiento más pequeña que el sprite,
        // con un pequeño "skin" de seguridad para evitar enganches en esquinas.
        // V3.4 — ASSISTED MOTION
        // El jugador sigue moviéndose SOLO en los cuatro ejes cardinales.
        // La asistencia no crea diagonales: ayuda a centrar carriles, memoriza
        // brevemente un giro y suaviza aceleración/frenado/reversa.
        const MOVEMENT_COLLISION_INSET = 5;
        const MOVEMENT_WALL_PADDING = 1.5;
        const MOVEMENT_EPSILON = 0.001;
        const MOTION = {
            maxStep: 2.0,
            acceleration: 0.95,
            braking: 1.35,
            reverseBraking: 1.8,
            turnAssistRadius: 8.5,
            turnSnapRadius: 4.5,
            inputBufferMs: 115,
            stopEpsilon: 0.035,
            axisDeadzone: 0.18
        };

        function getMovementHitbox(x, y, width, height) {
            return gridGetEntityRect({width, height}, x, y, 'player');
        }

        function rectCollidesSolid(x, y, width, height) {
            const probe = { width, height, __gridAnchor: 'topleft' };
            return !gridCanOccupy(probe, x, y, { kind: 'player' });
        }

        function moveAxisWithCollision(axis, amount) {
            if (!amount) return false;
            const result = gridMoveCardinal(player, axis === 'x' ? amount : 0, axis === 'y' ? amount : 0, {
                kind: 'player',
                maxStep: MOTION.maxStep
            });
            return result.moved;
        }

        function getLaneTarget(axis) {
            const center = axis === 'x' ? player.y + player.height / 2 : player.x + player.width / 2;
            const cell = Math.floor(center / TILE_SIZE);
            const laneCenter = cell * TILE_SIZE + TILE_SIZE / 2;
            return axis === 'x' ? laneCenter - player.height / 2 : laneCenter - player.width / 2;
        }

        function alignToLane(axis) {
            const target = getLaneTarget(axis);
            const current = axis === 'x' ? player.y : player.x;
            const delta = target - current;
            const abs = Math.abs(delta);
            if (abs > MOTION.turnAssistRadius) return false;

            // Corrección asistida por etapas: el jugador se detiene en su eje
            // actual y se centra suavemente en el carril. Nunca se aplican X e Y
            // en el mismo paso, por lo que no existe movimiento diagonal.
            if (abs <= MOTION.turnSnapRadius) {
                const candidateX = axis === 'x' ? player.x : target;
                const candidateY = axis === 'x' ? target : player.y;
                if (!rectCollidesSolid(candidateX, candidateY, player.width, player.height)) {
                    if (axis === 'x') player.y = target;
                    else player.x = target;
                    return true;
                }
            }

            const correction = Math.min(1.8, abs);
            const moved = axis === 'x'
                ? moveAxisWithCollision('y', Math.sign(delta) * correction)
                : moveAxisWithCollision('x', Math.sign(delta) * correction);
            return moved && Math.abs(target - (axis === 'x' ? player.y : player.x)) <= MOTION.turnSnapRadius;
        }

        function getCardinalInput() {
            let dx = gameState.touchControls.x;
            let dy = gameState.touchControls.y;

            if (Math.abs(dx) < MOTION.axisDeadzone && Math.abs(dy) < MOTION.axisDeadzone) {
                dx = 0; dy = 0;
                if (gameState.keys['ArrowUp'] || gameState.keys['KeyW']) dy = -1;
                if (gameState.keys['ArrowDown'] || gameState.keys['KeyS']) dy = 1;
                if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) dx = -1;
                if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) dx = 1;
            }

            if (!dx && !dy) return { axis: null, dir: 0 };

            // Dominante + último eje en empate: siempre exactamente un eje.
            if (Math.abs(dx) > Math.abs(dy)) return { axis: 'x', dir: dx < 0 ? -1 : 1 };
            if (Math.abs(dy) > Math.abs(dx)) return { axis: 'y', dir: dy < 0 ? -1 : 1 };
            return gameState.lastMoveAxis === 'horizontal'
                ? { axis: 'x', dir: dx < 0 ? -1 : 1 }
                : { axis: 'y', dir: dy < 0 ? -1 : 1 };
        }

        function updatePlayerMovement(dt) {
            const motionDt = getCombatMotionDt(dt);
            const frameScale = Math.min(motionDt / 16.6667, 2);
            player._frameScale = frameScale;
            const input = getCardinalInput();

            if (input.axis) {
                player.inputBuffer = input;
                player.inputBufferTimer = MOTION.inputBufferMs;
            } else if (player.inputBufferTimer > 0) {
                player.inputBufferTimer -= dt;
                if (player.inputBufferTimer <= 0) player.inputBuffer = null;
            }

            const desired = input.axis ? input : player.inputBuffer;
            const currentAxis = Math.abs(player.vx) > 0.01 ? 'x' : Math.abs(player.vy) > 0.01 ? 'y' : null;
            let axis = currentAxis;

            if (!desired) {
                if (currentAxis === 'x') player.vx = approach(player.vx, 0, MOTION.braking * frameScale);
                if (currentAxis === 'y') player.vy = approach(player.vy, 0, MOTION.braking * frameScale);
            } else if (!currentAxis) {
                axis = desired.axis;
            } else if (currentAxis !== desired.axis) {
                // Para girar: primero frena y centra el carril; luego cambia de eje.
                const centered = alignToLane(desired.axis);
                const velocity = currentAxis === 'x' ? player.vx : player.vy;
                if (centered || Math.abs(velocity) <= MOTION.stopEpsilon) {
                    if (currentAxis === 'x') player.vx = 0;
                    else player.vy = 0;
                    axis = desired.axis;
                } else {
                    if (currentAxis === 'x') player.vx = approach(player.vx, 0, MOTION.reverseBraking * frameScale);
                    else player.vy = approach(player.vy, 0, MOTION.reverseBraking * frameScale);
                    axis = currentAxis;
                }
            } else {
                axis = desired.axis;
            }

            // Un solo componente de velocidad puede existir en todo momento.
            if (axis === 'x') {
                player.vy = 0;
                const target = desired ? desired.dir * player.speed : 0;
                player.vx = approach(player.vx, target, (desired ? MOTION.acceleration : MOTION.braking) * frameScale);
                if (Math.abs(player.vx) < MOTION.stopEpsilon) player.vx = 0;
                if (player.vx !== 0) player.dir = player.vx < 0 ? 'left' : 'right';
            } else if (axis === 'y') {
                player.vx = 0;
                const target = desired ? desired.dir * player.speed : 0;
                player.vy = approach(player.vy, target, (desired ? MOTION.acceleration : MOTION.braking) * frameScale);
                if (Math.abs(player.vy) < MOTION.stopEpsilon) player.vy = 0;
                if (player.vy !== 0) player.dir = player.vy < 0 ? 'up' : 'down';
            }

            let moved = false;
            if (player.vx) moved = moveAxisWithCollision('x', player.vx * frameScale);
            else if (player.vy) moved = moveAxisWithCollision('y', player.vy * frameScale);

            if (!moved && (player.vx || player.vy)) {
                // Frente bloqueado: corta solo el eje activo. No empuja al jugador
                // contra la pared ni genera desplazamiento diagonal accidental.
                if (player.vx) player.vx = 0;
                if (player.vy) player.vy = 0;
            }
            player.isMoving = moved;
            if (moved) player.walkCycle += motionDt * 0.015;
        }

        function approach(value, target, amount) {
            if (value < target) return Math.min(value + amount, target);
            if (value > target) return Math.max(value - amount, target);
            return target;
        }

