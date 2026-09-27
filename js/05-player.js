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

            // v6.9.6: un toque corto puede dejar una orden de UN tile en cola.
            // Esto evita que el jugador tenga que mantener el dedo apoyado durante
            // todo el desplazamiento entre dos centros de tile.
            if (!dx && !dy) {
                dx = Number(gameState.touchControls.queuedX || 0);
                dy = Number(gameState.touchControls.queuedY || 0);
            }

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
            const input = getCardinalInput();
            const movementMods = typeof getMovementModifiersV47 === 'function'
                ? getMovementModifiersV47()
                : { speedMultiplier: 1 };
            const effectMods = typeof getBombEffectMovementModifiersV64 === 'function'
                ? getBombEffectMovementModifiersV64(player)
                : { speedMultiplier: 1 };
            const materialMods = typeof getMaterialMovementModifiersV67 === 'function'
                ? getMaterialMovementModifiersV67(player)
                : { speedMultiplier: 1 };
            const gameplayMods = typeof getGameplayPowerupMovementModifiersV676 === 'function'
                ? getGameplayPowerupMovementModifiersV676(player)
                : { speedMultiplier: 1 };
            const effectiveSpeed = Math.max(0.1, player.speed
                * Number(movementMods.speedMultiplier || 1)
                * Number(effectMods.speedMultiplier || 1)
                * Number(materialMods.speedMultiplier || 1)
                * Number(gameplayMods.speedMultiplier || 1)
                * (typeof getHazardSpeedFactor === 'function' ? getHazardSpeedFactor() : 1));

            const playerTile = gridCurrentTile(player, 'player');
            const playerTilePos = gridGetEntityTileCenterPosition(player, playerTile.x, playerTile.y, 'player');
            if (!player._tileMoveActive && (!player._tileMoveInitialized
                || Math.abs(player.x - playerTilePos.x) > 0.01
                || Math.abs(player.y - playerTilePos.y) > 0.01)) {
                gridSnapEntityToTile(player, playerTile.x, playerTile.y, 'player');
                player._tileMoveInitialized = true;
            }

            // Una orden corresponde a UNA celda. El siguiente giro se evalúa
            // únicamente cuando se alcanza el centro de la celda destino.
            if (!player._tileMoveActive && input.axis) {
                const current = gridCurrentTile(player, 'player');
                const gx = current.x + (input.axis === 'x' ? input.dir : 0);
                const gy = current.y + (input.axis === 'y' ? input.dir : 0);
                const started = gridBeginTileMove(player, gx, gy, { kind: 'player' });
                if (started) {
                    // La orden en cola ya fue consumida al iniciar este tile.
                    if (gameState.touchControls) {
                        gameState.touchControls.queuedX = 0;
                        gameState.touchControls.queuedY = 0;
                    }
                    player.dir = input.axis === 'x' ? (input.dir < 0 ? 'left' : 'right') : (input.dir < 0 ? 'up' : 'down');
                    player.vx = input.axis === 'x' ? input.dir * effectiveSpeed : 0;
                    player.vy = input.axis === 'y' ? input.dir * effectiveSpeed : 0;
                } else {
                    player.vx = 0;
                    player.vy = 0;
                }
            }

            const beforeMoveX = player.x;
            const beforeMoveY = player.y;
            const result = gridAdvanceTileMove(player, effectiveSpeed, motionDt);
            // 'active' no significa que la entidad haya avanzado: también puede
            // quedar activo un movimiento si el delta/speed del frame fue 0.
            // La animación debe depender exclusivamente de desplazamiento real.
            const moved = result.moved;

            if (result.arrived) {
                // La posición final es siempre exactamente el centro del tile.
                player.vx = 0;
                player.vy = 0;
                if (typeof globalThis.gameplayPowerupAfterPlayerMovementV676 === 'function') {
                    globalThis.gameplayPowerupAfterPlayerMovementV676(player, beforeMoveX, beforeMoveY);
                }
            }

            player.isMoving = moved;
            if (moved) player.walkCycle += motionDt * 0.015;

            if (typeof playerFSMSyncMovement === 'function') {
                playerFSMSyncMovement({
                    moving: moved,
                    inputActive: !!input.axis
                });
            }
        }

        function approach(value, target, amount) {
            if (value < target) return Math.min(value + amount, target);
            if (value > target) return Math.max(value - amount, target);
            return target;
        }

