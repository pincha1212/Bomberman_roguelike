/* BOMBERMAN ROGUELIKE v6.32.2 — diagnóstico del arranque y errores no controlados. */
(function installRuntimeIntegrityV632(global) {
    'use strict';

    const BUILD = '6.32.2';
    let reportNode = null;
    let reported = false;

    function safeMessage(value) {
        if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
        if (typeof value === 'string') return value;
        try { return JSON.stringify(value); } catch (_) { return String(value); }
    }

    function showDiagnostic(kind, details) {
        const message = `[Bomberman Roguelike ${BUILD}] ${kind}\n${details}`;
        try { global.console.error(message); } catch (_) {}
        if (reported || !global.document?.body) return;
        reported = true;

        const panel = global.document.createElement('section');
        panel.id = 'runtime-integrity-alert-v632';
        panel.setAttribute('role', 'alert');
        panel.setAttribute('aria-live', 'assertive');
        Object.assign(panel.style, {
            position: 'fixed', inset: '12px 12px auto 12px', zIndex: '2147483647',
            maxHeight: 'min(70vh, 620px)', overflow: 'auto', padding: '16px',
            color: '#fff', background: '#24151a', border: '2px solid #ef4444',
            borderRadius: '8px', boxShadow: '0 12px 36px rgba(0,0,0,.55)',
            font: '12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace',
            textAlign: 'left', whiteSpace: 'normal'
        });

        const heading = global.document.createElement('strong');
        heading.textContent = `DIAGNÓSTICO DEL JUEGO · v${BUILD}`;
        Object.assign(heading.style, { display: 'block', marginBottom: '8px', fontSize: '14px' });

        const body = global.document.createElement('pre');
        body.textContent = `${kind}\n\n${details}`;
        Object.assign(body.style, { margin: '0 0 12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' });

        const close = global.document.createElement('button');
        close.type = 'button';
        close.textContent = 'CERRAR DIAGNÓSTICO';
        Object.assign(close.style, {
            padding: '8px 12px', color: '#fff', background: '#3f2028',
            border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', font: 'inherit'
        });
        close.addEventListener('click', () => panel.remove(), { once: true });

        panel.append(heading, body, close);
        global.document.body.appendChild(panel);
        reportNode = panel;
    }

    function verifyStartup() {
        const problems = [];
        const canvas = global.document?.getElementById('gameCanvas');

        if (!canvas) {
            problems.push('No se encontró el elemento canvas#gameCanvas en index.html.');
        } else {
            if (!(canvas instanceof global.HTMLCanvasElement)) {
                problems.push('#gameCanvas existe, pero no es un elemento <canvas>.');
            } else {
                try {
                    if (!canvas.getContext('2d')) problems.push('El navegador no pudo crear el contexto 2D de #gameCanvas.');
                } catch (error) {
                    problems.push(`No se pudo inicializar el contexto 2D: ${safeMessage(error)}`);
                }
                const rect = canvas.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    problems.push(`#gameCanvas no tiene área visible (ancho ${Math.round(rect.width)}, alto ${Math.round(rect.height)}). Revisar CSS/layout.`);
                }
            }
        }

        const requiredGlobals = [
            ['gameState', () => typeof gameState !== 'undefined'],
            ['player', () => typeof player !== 'undefined'],
            ['startGame', () => typeof startGame === 'function'],
            ['initLevel', () => typeof initLevel === 'function'],
            ['update', () => typeof update === 'function'],
            ['draw', () => typeof draw === 'function'],
            ['gameLoop', () => typeof gameLoop === 'function']
        ];
        for (const [name, check] of requiredGlobals) {
            let exists = false;
            try { exists = check(); } catch (_) { exists = false; }
            if (!exists) problems.push(`Falta el componente esencial «${name}». Puede haber fallado la carga de un módulo previo.`);
        }

        if (problems.length) showDiagnostic('ARRANQUE INCOMPLETO', problems.map((item, index) => `${index + 1}. ${item}`).join('\n'));
    }

    global.BOMBERMAN_BUILD = BUILD;
    global.BOMBERMAN_RUNTIME_INTEGRITY_V632 = Object.freeze({
        version: BUILD,
        check: verifyStartup,
        getDiagnostic: () => reportNode?.textContent || null
    });

    global.addEventListener('error', (event) => {
        // Los errores de recursos externos no deben interrumpir el juego por sí solos.
        if (event?.error || event?.message) {
            const location = event.filename ? `\nArchivo: ${event.filename}${event.lineno ? `:${event.lineno}` : ''}` : '';
            showDiagnostic('ERROR DE JAVASCRIPT', `${event.message || safeMessage(event.error) || 'Error sin mensaje'}${location}`);
        }
    });

    global.addEventListener('unhandledrejection', (event) => {
        showDiagnostic('PROMESA RECHAZADA SIN MANEJADOR', safeMessage(event?.reason ?? 'Motivo no disponible'));
    });

    if (global.document?.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', verifyStartup, { once: true });
    } else {
        verifyStartup();
    }
})(window);
