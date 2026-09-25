// Bomberman Roguelike v5.9 — Event Bus
// Event-driven infrastructure, deliberately small and auditable.
//
// PRINCIPLES:
// - Publisher does not know who listens.
// - Listeners are registered with stable keys.
// - The same key cannot create a second listener for the same event.
// - emit() is synchronous so gameplay order remains deterministic.
// - No DOM CustomEvent dependency: this is an internal game bus.

(function installGameEventBus(global) {
    'use strict';

    const VERSION = '6.0.0';

    const EVENTS = Object.freeze({
        BOMBA_EXPLOTO: 'BOMBA_EXPLOTO'
    });

    class GameEventBus {
        constructor() {
            this.__v59EventBus = true;
            this.listeners = new Map();
            this.stats = new Map();
            this.duplicateAttempts = [];
            this.eventSerial = 0;
        }

        on(eventName, handler, options = {}) {
            const event = String(eventName || '');
            const key = String(options.key || '');

            if (!event) throw new Error('EventBus: eventName requerido');
            if (typeof handler !== 'function') throw new TypeError(`EventBus: handler inválido para ${event}`);
            if (!key) throw new Error(`EventBus: listener key requerido para ${event}`);

            let bucket = this.listeners.get(event);
            if (!bucket) {
                bucket = new Map();
                this.listeners.set(event, bucket);
            }

            if (bucket.has(key)) {
                this.duplicateAttempts.push({
                    event,
                    key,
                    time: Number(global.performance?.now?.() || Date.now())
                });
                return bucket.get(key).unsubscribe;
            }

            const entry = {
                key,
                handler,
                unsubscribe: () => this.off(event, key)
            };

            bucket.set(key, entry);
            return entry.unsubscribe;
        }

        off(eventName, key) {
            const event = String(eventName || '');
            const listenerKey = String(key || '');
            const bucket = this.listeners.get(event);
            if (!bucket) return false;

            const removed = bucket.delete(listenerKey);
            if (!bucket.size) this.listeners.delete(event);
            return removed;
        }

        emit(eventName, payload = {}) {
            const event = String(eventName || '');
            const bucket = this.listeners.get(event);
            const listeners = bucket ? Array.from(bucket.values()) : [];
            const eventId = ++this.eventSerial;
            const stamp = Number(global.performance?.now?.() || Date.now());

            const stat = this.stats.get(event) || {
                emitted: 0,
                listenerCalls: 0,
                listenerErrors: 0
            };
            stat.emitted++;
            this.stats.set(event, stat);

            const meta = Object.freeze({
                event,
                eventId,
                time: stamp
            });

            const errors = [];
            for (const entry of listeners) {
                try {
                    entry.handler(payload, meta);
                    stat.listenerCalls++;
                } catch (error) {
                    stat.listenerErrors++;
                    errors.push({ key: entry.key, error });
                    // Un listener defect should be visible, but one bad listener
                    // must not stop the rest of the event fan-out.
                    if (global.console?.error) {
                        global.console.error(`[EventBus ${event}] listener ${entry.key} falló`, error);
                    }
                }
            }

            return Object.freeze({
                event,
                eventId,
                listenerCount: listeners.length,
                errors
            });
        }

        listenerCount(eventName) {
            const bucket = this.listeners.get(String(eventName || ''));
            return bucket ? bucket.size : 0;
        }

        getListenerKeys(eventName) {
            const bucket = this.listeners.get(String(eventName || ''));
            return bucket ? Array.from(bucket.keys()) : [];
        }

        audit() {
            const listeners = {};
            for (const [event, bucket] of this.listeners.entries()) {
                listeners[event] = Array.from(bucket.keys());
            }

            const stats = {};
            for (const [event, value] of this.stats.entries()) {
                stats[event] = { ...value };
            }

            const duplicateKeys = this.duplicateAttempts.map(item => `${item.event}:${item.key}`);

            const errors = [];
            for (const [event, keys] of Object.entries(listeners)) {
                const unique = new Set(keys);
                if (unique.size !== keys.length) {
                    errors.push(`Listener duplicado en ${event}`);
                }
            }

            if (this.duplicateAttempts.length) {
                errors.push(`Intentos de registro duplicado: ${this.duplicateAttempts.length}`);
            }

            return {
                valid: errors.length === 0,
                version: VERSION,
                listeners,
                stats,
                duplicateAttempts: this.duplicateAttempts.map(item => ({ ...item })),
                duplicateKeys,
                errors
            };
        }

        resetStats() {
            this.stats.clear();
            this.duplicateAttempts.length = 0;
            this.eventSerial = 0;
        }
    }

    // Preserve an existing bus if the script is evaluated more than once.
    const existingBus = global.gameEventBus;
    const bus = existingBus && existingBus.__v59EventBus === true
        ? existingBus
        : new GameEventBus();

    global.GameEventBus = GameEventBus;
    global.GAME_EVENTS_V59 = EVENTS;
    global.GAME_EVENTS_V60 = EVENTS;
    global.gameEventBus = bus;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEventBus = () => bus;
    global.BOMBER_ENGINE.auditEventListeners = () => bus.audit();
    global.BOMBER_ENGINE.emitGameEvent = (eventName, payload) => bus.emit(eventName, payload);
})(window);
