// Bomberman Roguelike v3.12 — Cardinal assisted player movement and collision helpers
        // V3.2.4 — MOVEMENT UPDATE
        // Movimiento continuo cardinal asistido. La cuadrícula SOLO define las paredes.
        // El personaje usa una hurtbox de movimiento más pequeña que el sprite,
        // con un pequeño "skin" de seguridad para evitar enganches en esquinas.
        // V3.4 — ASSISTED MOTION
        // V4.3.3 — FEEL UPDATE: turn carry + buffered cardinal steering
        // El jugador sigue moviéndose SOLO en los cuatro ejes cardinales.
        // La asistencia no crea diagonales: ayuda a centrar carriles, memoriza
        // brevemente un giro y suaviza aceleración/frenado/reversa.
        const MOVEMENT_COLLISION_INSET = 5;
        const MOVEMENT_WALL_PADDING = 1.5;
        const MOVEMENT_EPSILON = 0.001;
        const MOTION = {
            // v4.3.3 — sensación de control: entrada rápida sin perder continuidad.
            maxStep: 2.0,
            acceleration: 1.05,
            braking: 1.45,
            reverseBraking: 2.35,
            turnAssistRadius: 12,
            turnSnapRadius: 4.5,
            turnCorrectionStep: 3.25,
            turnCarrySpeed: 0.92,
            inputBufferMs: 145,
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
            const beforeX = player.x;
            const beforeY = player.y;
            const result = gridMoveCardinal(player, axis === 'x' ? amount : 0, axis === 'y' ? amount : 0, {
                kind: 'player',
                maxStep: MOTION.maxStep
            });
            if (!result.moved) return false;

            // Invierno: oso/estorbador ocupan espacio, pero no hacen daño de contacto.
            // Si el jugador intenta atravesarlos, revertimos solo este paso físico.
            if (gameState.biomeV49?.id === 'winter' && Array.isArray(gameState.enemies)) {
                const hitbox = { left: player.x, right: player.x + player.width, top: player.y, bottom: player.y + player.height };
                const blocked = gameState.enemies.some(e => {
                    if (!e?.type?.winterRole) return false;
                    const er = { left: e.x - e.width / 2, right: e.x + e.width / 2, top: e.y - e.height / 2, bottom: e.y + e.height / 2 };
                    return hitbox.right > er.left && hitbox.left < er.right && hitbox.bottom > er.top && hitbox.top < er.bottom;
                });
                if (blocked) {
                    player.x = beforeX;
                    player.y = beforeY;
                    return false;
                }
            }
            return true;
        }

        function getLaneTarget(axis) {
            const center = axis === 'x' ? player.y + player.height / 2 : player.x + player.width / 2;
            const maxCell = axis === 'x' ? gameState.gridHeight - 1 : gameState.gridWidth - 1;
            // Usamos el centro más cercano, no el piso actual. Así el giro queda
            // asociado a la intersección más cercana y no a la celda de origen.
            const rawCell = Math.round((center / TILE_SIZE) - 0.5);
            const cell = Math.max(0, Math.min(maxCell, rawCell));
            const laneCenter = cell * TILE_SIZE + TILE_SIZE / 2;
            return axis === 'x' ? laneCenter - player.height / 2 : laneCenter - player.width / 2;
        }

        function getLaneOffset(axis) {
            const target = getLaneTarget(axis);
            const current = axis === 'x' ? player.y : player.x;
            return target - current;
        }

        function trySnapToLane(axis) {
            const offset = getLaneOffset(axis);
            const snapRadius = MOTION.turnSnapRadius + (Number(gameState.relicMods?.turnSnapBonus) || 0);
            if (Math.abs(offset) > snapRadius) return false;

            const current = axis === 'x' ? player.y : player.x;
            const target = current + offset;
            const candidateX = axis === 'x' ? player.x : target;
            const candidateY = axis === 'x' ? target : player.y;
            if (rectCollidesSolid(candidateX, candidateY, player.width, player.height)) return false;

            if (axis === 'x') player.y = target;
            else player.x = target;
            return true;
        }

        function isReadyForTurn(axis) {
            const offset = getLaneOffset(axis);
            const assistRadius = MOTION.turnAssistRadius + (Number(gameState.relicMods?.turnAssistBonus) || 0);
            return Math.abs(offset) <= assistRadius;
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
                const effectMods = typeof getBombEffectMovementModifiersV64 === 'function'
                    ? getBombEffectMovementModifiersV64(player)
                    : { inputBufferMultiplier: 1 };
                player.inputBufferTimer = (MOTION.inputBufferMs + (Number(gameState.relicMods?.inputBufferBonus) || 0))
                    * Number(effectMods.inputBufferMultiplier || 1);
            } else if (player.inputBufferTimer > 0) {
                player.inputBufferTimer -= dt;
                if (player.inputBufferTimer <= 0) player.inputBuffer = null;
            }

            const desired = input.axis ? input : player.inputBuffer;
            const currentAxis = Math.abs(player.vx) > 0.01 ? 'x' : Math.abs(player.vy) > 0.01 ? 'y' : null;
            const movementMods = typeof getMovementModifiersV47 === 'function'
                ? getMovementModifiersV47()
                : { acceleration: 1, braking: 1, turnCarrySpeed: 1, speedMultiplier: 1 };
            const effectMods = typeof getBombEffectMovementModifiersV64 === 'function'
                ? getBombEffectMovementModifiersV64(player)
                : { accelerationMultiplier: 1, brakingMultiplier: 1, turnCarryMultiplier: 1, speedMultiplier: 1 };
            const materialMods = typeof getMaterialMovementModifiersV67 === 'function'
                ? getMaterialMovementModifiersV67(player)
                : { acceleration: 1, braking: 1, turnCarry: 1, speedMultiplier: 1, inputBufferMultiplier: 1 };
            const gameplayMods = typeof getGameplayPowerupMovementModifiersV676 === 'function'
                ? getGameplayPowerupMovementModifiersV676(player)
                : { acceleration: 1, braking: 1, turnCarry: 1, speedMultiplier: 1, inputBufferMultiplier: 1 };
            const acceleration = MOTION.acceleration * Number(movementMods.acceleration || 1) * Number(effectMods.accelerationMultiplier || 1) * Number(materialMods.acceleration || 1) * Number(gameplayMods.acceleration || 1);
            const braking = MOTION.braking * Number(movementMods.braking || 1) * Number(effectMods.brakingMultiplier || 1) * Number(materialMods.braking || 1) * Number(gameplayMods.braking || 1);
            const turnCarrySpeed = MOTION.turnCarrySpeed * Number(movementMods.turnCarrySpeed || 1) * Number(effectMods.turnCarryMultiplier || 1) * Number(materialMods.turnCarry || 1) * Number(gameplayMods.turnCarry || 1);
            const effectiveSpeedBase = player.speed * Number(movementMods.speedMultiplier || 1) * Number(effectMods.speedMultiplier || 1) * Number(materialMods.speedMultiplier || 1) * Number(gameplayMods.speedMultiplier || 1);
            const effectiveSpeed = typeof getHazardSpeedFactor === 'function'
                ? effectiveSpeedBase * getHazardSpeedFactor()
                : effectiveSpeedBase;
            let axis = currentAxis;
            let turnEntrySpeed = 0;
            let turnCorrectionConsumed = false;
            let movementDirection = desired?.dir || 0;

            // Un snap de carril consume este frame. Guardamos la velocidad de
            // entrada para arrancar el nuevo eje en el frame siguiente, evitando
            // combinar la corrección lateral con el avance del giro.
            if (desired && !currentAxis && player._turnEntryAxis === desired.axis && player._turnEntryDir === desired.dir && player._turnEntrySpeed > 0) {
                axis = desired.axis;
                movementDirection = desired.dir;
                turnEntrySpeed = player._turnEntrySpeed;
                player._turnEntrySpeed = 0;
                player._turnEntryAxis = null;
                player._turnEntryDir = 0;
            }
            if (!desired) {
                // Solo limpiamos el estado de giro aquí. El frenado físico se aplica
                // una única vez en el bloque común del eje más abajo.
                player._turnEntrySpeed = 0;
                player._turnEntryAxis = null;
                player._turnEntryDir = 0;
            } else if (!currentAxis) {
                axis = desired.axis;
            } else if (currentAxis !== desired.axis) {
                const currentVelocity = currentAxis === 'x' ? player.vx : player.vy;
                const currentDirection = Math.sign(currentVelocity) || (gameState.lastMoveAxis === 'horizontal' ? 1 : 1);
                const turnReady = isReadyForTurn(desired.axis);

                if (turnReady) {
                    // Primero intentamos el giro limpio en el centro del carril.
                    if (trySnapToLane(desired.axis)) {
                        turnEntrySpeed = Math.abs(currentVelocity) * turnCarrySpeed;
                        player._turnEntrySpeed = turnEntrySpeed;
                        player._turnEntryAxis = desired.axis;
                        player._turnEntryDir = desired.dir;
                        if (currentAxis === 'x') player.vx = 0;
                        else player.vy = 0;
                        turnCorrectionConsumed = true;
                        axis = desired.axis;
                        movementDirection = desired.dir;
                    } else {
                        // Asistencia mínima y estrictamente cardinal. Si todavía
                        // faltan unos píxeles para entrar a la intersección,
                        // corregimos SOLO el eje perpendicular y consumimos este
                        // frame. Esto evita desplazamiento diagonal.
                        const offset = getLaneOffset(desired.axis);
                        const correction = Math.min(MOTION.turnCorrectionStep, Math.abs(offset));
                        if (correction > MOVEMENT_EPSILON) {
                            const correctionAxis = desired.axis === 'x' ? 'y' : 'x';
                            const movedCorrection = correctionAxis === 'x'
                                ? moveAxisWithCollision('x', Math.sign(offset) * correction)
                                : moveAxisWithCollision('y', Math.sign(offset) * correction);
                            if (movedCorrection) {
                                turnCorrectionConsumed = true;
                                axis = currentAxis;
                                movementDirection = currentDirection;
                            } else {
                                // Si la corrección lateral es físicamente imposible,
                                // no forzamos el giro. Mantenemos el carril actual.
                                axis = currentAxis;
                                movementDirection = currentDirection;
                            }
                        } else {
                            axis = currentAxis;
                            movementDirection = currentDirection;
                        }
                    }
                } else {
                    // El jugador puede anticipar el giro. Seguimos avanzando en
                    // la dirección actual hasta llegar a la ventana de giro; el
                    // input perpendicular queda bufferizado. Nunca invertimos el
                    // eje por culpa del nuevo input.
                    axis = currentAxis;
                    movementDirection = currentDirection;
                }
            } else {
                axis = desired.axis;
                movementDirection = desired.dir;
            }

            if (turnCorrectionConsumed && turnEntrySpeed <= 0) {
                // La corrección lateral ya movió al personaje este frame. No
                // aplicamos después otro desplazamiento sobre el eje longitudinal.
                player.isMoving = true;
                player.walkCycle += motionDt * 0.015;
                return;
            }

            if (turnCorrectionConsumed && turnEntrySpeed > 0) {
                // Un snap de giro no avanza el nuevo eje en el mismo frame.
                player.isMoving = true;
                player.walkCycle += motionDt * 0.015;
                return;
            }

            // Un solo componente de velocidad puede existir en todo momento.
            if (axis === 'x') {
                player.vy = 0;
                const target = desired ? movementDirection * effectiveSpeed : 0;
                if (turnEntrySpeed > 0) {
                    player.vx = movementDirection * Math.min(
                        effectiveSpeed,
                        Math.max(turnEntrySpeed, effectiveSpeed * 0.68)
                    );
                } else {
                    player.vx = approach(
                        player.vx,
                        target,
                        (desired ? acceleration : braking) * frameScale
                    );
                }
                if (Math.abs(player.vx) < MOTION.stopEpsilon) player.vx = 0;
                if (player.vx !== 0) player.dir = player.vx < 0 ? 'left' : 'right';
            } else if (axis === 'y') {
                player.vx = 0;
                const target = desired ? movementDirection * effectiveSpeed : 0;
                if (turnEntrySpeed > 0) {
                    player.vy = movementDirection * Math.min(
                        effectiveSpeed,
                        Math.max(turnEntrySpeed, effectiveSpeed * 0.68)
                    );
                } else {
                    player.vy = approach(
                        player.vy,
                        target,
                        (desired ? acceleration : braking) * frameScale
                    );
                }
                if (Math.abs(player.vy) < MOTION.stopEpsilon) player.vy = 0;
                if (player.vy !== 0) player.dir = player.vy < 0 ? 'up' : 'down';
            }

            const beforeMoveX = player.x;
            const beforeMoveY = player.y;
            let moved = false;
            if (player.vx) moved = moveAxisWithCollision('x', player.vx * frameScale);
            else if (player.vy) moved = moveAxisWithCollision('y', player.vy * frameScale);
            if (moved && typeof globalThis.gameplayPowerupAfterPlayerMovementV676 === 'function') {
                globalThis.gameplayPowerupAfterPlayerMovementV676(player, beforeMoveX, beforeMoveY);
            }

            if (!moved && (player.vx || player.vy)) {
                if (player.vx) player.vx = 0;
                if (player.vy) player.vy = 0;
            }
            player.isMoving = moved;
            if (moved) player.walkCycle += motionDt * 0.015;

            // v5.7: sincroniza la FSM con el resultado físico real.
            if (typeof playerFSMSyncMovement === 'function') {
                playerFSMSyncMovement({
                    moving: moved,
                    inputActive: !!desired
                });
            }
        }

        function approach(value, target, amount) {
            if (value < target) return Math.min(value + amount, target);
            if (value > target) return Math.max(value - amount, target);
            return target;
        }

