// Bomberman Roguelike v5.7 — Player FSM
// Máquina de estados finitos del jugador.
//
// REGLA ARQUITECTÓNICA:
// - La FSM decide el estado lógico/presentacional del jugador.
// - Gameplay (movimiento, bombas, daño) emite eventos.
// - Render/animación SOLO lee el estado.
// - No se cambia player.fsmState directamente desde otros módulos.

(function installPlayerFSM(global) {
    'use strict';

    const STATES = Object.freeze({
        QUIETO: 'QUIETO',
        CAMINANDO: 'CAMINANDO',
        PONIENDO_BOMBA: 'PONIENDO_BOMBA',
        MUERTO: 'MUERTO'
    });

    const EVENTS = Object.freeze({
        MOVE_START: 'MOVE_START',
        MOVE_STOP: 'MOVE_STOP',
        BOMB_START: 'BOMB_START',
        BOMB_FINISHED: 'BOMB_FINISHED',
        DEATH: 'DEATH',
        RESPAWN: 'RESPAWN',
        RESET: 'RESET'
    });

    // Tabla cerrada y auditable. Un evento no listado es una transición inválida.
    const TRANSITIONS = Object.freeze({
        [STATES.QUIETO]: Object.freeze({
            [EVENTS.MOVE_START]: STATES.CAMINANDO,
            [EVENTS.BOMB_START]: STATES.PONIENDO_BOMBA,
            [EVENTS.DEATH]: STATES.MUERTO,
            [EVENTS.RESET]: STATES.QUIETO
        }),
        [STATES.CAMINANDO]: Object.freeze({
            [EVENTS.MOVE_STOP]: STATES.QUIETO,
            [EVENTS.BOMB_START]: STATES.PONIENDO_BOMBA,
            [EVENTS.DEATH]: STATES.MUERTO,
            [EVENTS.RESET]: STATES.QUIETO
        }),
        [STATES.PONIENDO_BOMBA]: Object.freeze({
            [EVENTS.BOMB_FINISHED]: '__RESOLVE_MOVEMENT__',
            [EVENTS.DEATH]: STATES.MUERTO,
            [EVENTS.RESET]: STATES.QUIETO
        }),
        [STATES.MUERTO]: Object.freeze({
            [EVENTS.RESPAWN]: STATES.QUIETO,
            [EVENTS.RESET]: STATES.QUIETO
        })
    });

    const ANIMATIONS = Object.freeze({
        [STATES.QUIETO]: 'idle',
        [STATES.CAMINANDO]: 'walk',
        [STATES.PONIENDO_BOMBA]: 'plant-bomb',
        [STATES.MUERTO]: 'death'
    });

    const CONFIG = Object.freeze({
        bombAnimationMs: 150,
        maxHistory: 80
    });

    class PlayerFSM {
        constructor() {
            this.state = STATES.QUIETO;
            this.context = {
                moving: false,
                inputActive: false
            };
            this.bombAnimationRemaining = 0;
            this.history = [];
            this._record(null, 'INIT', STATES.QUIETO, 'OK');
        }

        getState() {
            return this.state;
        }

        getAnimation() {
            return ANIMATIONS[this.state] || ANIMATIONS[STATES.QUIETO];
        }

        can(event) {
            const table = TRANSITIONS[this.state];
            return !!table && Object.prototype.hasOwnProperty.call(table, event);
        }

        transition(event, payload = {}) {
            const from = this.state;

            if (!this.can(event)) {
                this._record(from, event, from, 'REJECTED');
                return false;
            }

            let to = TRANSITIONS[from][event];

            if (to === '__RESOLVE_MOVEMENT__') {
                to = this.context.moving
                    ? STATES.CAMINANDO
                    : STATES.QUIETO;
            }

            if (!STATES[to]) {
                this._record(from, event, from, 'INVALID_TARGET');
                return false;
            }

            this.state = to;
            this._record(from, event, to, 'OK', payload);
            return true;
        }

        syncMovement({ moving = false, inputActive = false } = {}) {
            this.context.moving = !!moving;
            this.context.inputActive = !!inputActive;

            // Bomb planting is transient and owns the animation state until
            // BOMB_FINISHED. Movement gameplay may continue underneath it.
            if (this.state === STATES.PONIENDO_BOMBA || this.state === STATES.MUERTO) {
                return false;
            }

            const target = this.context.moving
                ? STATES.CAMINANDO
                : STATES.QUIETO;

            if (target === this.state) return false;

            return this.transition(
                target === STATES.CAMINANDO
                    ? EVENTS.MOVE_START
                    : EVENTS.MOVE_STOP,
                { moving: this.context.moving, inputActive: this.context.inputActive }
            );
        }

        startBomb() {
            if (this.state === STATES.MUERTO) return false;
            if (this.state === STATES.PONIENDO_BOMBA) return false;

            const changed = this.transition(EVENTS.BOMB_START, { source: 'bomb-placed' });
            if (changed) this.bombAnimationRemaining = CONFIG.bombAnimationMs;
            return changed;
        }

        finishBomb(source = 'timer') {
            if (this.state !== STATES.PONIENDO_BOMBA) return false;
            this.bombAnimationRemaining = 0;
            return this.transition(EVENTS.BOMB_FINISHED, { source });
        }

        update(dt) {
            if (this.state !== STATES.PONIENDO_BOMBA) return;

            const safeDt = Math.max(0, Math.min(Number(dt) || 0, 100));
            this.bombAnimationRemaining = Math.max(0, this.bombAnimationRemaining - safeDt);

            if (this.bombAnimationRemaining <= 0) {
                this.finishBomb('timer');
            }
        }

        die(source = 'unknown') {
            this.bombAnimationRemaining = 0;
            return this.transition(EVENTS.DEATH, { source });
        }

        reset(source = 'reset') {
            this.context.moving = false;
            this.context.inputActive = false;
            this.bombAnimationRemaining = 0;
            return this.transition(EVENTS.RESET, { source });
        }

        getHistory() {
            return this.history.map(entry => ({ ...entry }));
        }

        clearHistory() {
            this.history.length = 0;
        }

        validate() {
            const errors = [];

            for (const state of Object.values(STATES)) {
                if (!TRANSITIONS[state]) {
                    errors.push(`Falta tabla de transición para ${state}`);
                }
                if (!ANIMATIONS[state]) {
                    errors.push(`Falta animación para ${state}`);
                }
            }

            for (const [state, table] of Object.entries(TRANSITIONS)) {
                for (const [event, target] of Object.entries(table)) {
                    if (!Object.values(EVENTS).includes(event)) {
                        errors.push(`Evento desconocido ${event} en ${state}`);
                    }
                    if (target !== '__RESOLVE_MOVEMENT__' && !STATES[target]) {
                        errors.push(`Destino inválido ${target} en ${state}.${event}`);
                    }
                }
            }

            const deadTransitions = TRANSITIONS[STATES.MUERTO];
            for (const forbidden of [EVENTS.MOVE_START, EVENTS.MOVE_STOP, EVENTS.BOMB_START, EVENTS.BOMB_FINISHED]) {
                if (Object.prototype.hasOwnProperty.call(deadTransitions, forbidden)) {
                    errors.push(`MUERTO expone transición prohibida ${forbidden}`);
                }
            }

            return {
                valid: errors.length === 0,
                errors
            };
        }

        _record(from, event, to, result, payload = {}) {
            this.history.push({
                time: Number(global.performance?.now?.() || Date.now()),
                from,
                event,
                to,
                result,
                payload
            });

            while (this.history.length > CONFIG.maxHistory) {
                this.history.shift();
            }
        }
    }

    const fsm = new PlayerFSM();

    global.PLAYER_FSM_STATES = STATES;
    global.PLAYER_FSM_EVENTS = EVENTS;
    global.PLAYER_FSM_ANIMATIONS = ANIMATIONS;
    global.PLAYER_FSM_CONFIG = CONFIG;
    global.PlayerFSM = PlayerFSM;
    global.playerFSM = fsm;

    // API pequeña y estable para el resto del juego.
    global.playerFSMGetState = () => fsm.getState();
    global.playerFSMGetAnimation = () => fsm.getAnimation();
    global.playerFSMCan = event => fsm.can(event);
    global.playerFSMSyncMovement = payload => fsm.syncMovement(payload);
    global.playerFSMStartBomb = () => fsm.startBomb();
    global.playerFSMFinishBombAnimation = source => fsm.finishBomb(source || 'animation');
    global.playerFSMUpdate = dt => fsm.update(dt);
    global.playerFSMDeath = source => fsm.die(source || 'unknown');
    global.playerFSMReset = source => fsm.reset(source || 'reset');
    global.playerFSMGetHistory = () => fsm.getHistory();
    global.playerFSMValidate = () => fsm.validate();
    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.playerFSM = fsm;
    global.BOMBER_ENGINE.getPlayerFSMState = () => fsm.getState();
    global.BOMBER_ENGINE.getPlayerFSMAnimation = () => fsm.getAnimation();
    global.BOMBER_ENGINE.getPlayerFSMHistory = () => fsm.getHistory();
    global.BOMBER_ENGINE.validatePlayerFSM = () => fsm.validate();
})(window);
