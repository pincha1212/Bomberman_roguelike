// BOMBERMAN ROGUELIKE v6.31.7 — Renderizado separado de habilidades Rastrero.
(function installRastreroRenderV6317(global) {
    'use strict';
    const bridge = global.__RASTRERO_RENDER_BRIDGE_V630__;
    if (!bridge) {
        console.error('[Rastrero Render] No se encontró el puente del módulo principal.');
        return;
    }
    const getAbilityId = bridge.getAbilityId;
    const ensureEnemyState = bridge.ensureEnemyState;
    const isEnemyBuried = bridge.isEnemyBuried;
    const isLizardCamouflaged = bridge.isLizardCamouflaged;
    const getTileSize = bridge.getTileSize;

    function drawRastreroAbilityEffectsV630(targetCtx) {
        const renderState = bridge.getRenderState();
        const context = targetCtx || global.ctx || (typeof ctx !== 'undefined' ? ctx : null);
        if (!context) return;
        const size = getTileSize();
        context.save();
        for (const effect of renderState.ice.values()) {
            const remaining = Math.max(0, effect.expiresAt - renderState.clock);
            const alpha = Math.min(0.48, 0.12 + 0.36 * remaining / Math.max(1, effect.durationMs));
            context.globalAlpha = alpha;
            context.fillStyle = '#8be9ff';
            context.fillRect(effect.x * size + size * 0.09, effect.y * size + size * 0.09, size * 0.82, size * 0.82);
            context.strokeStyle = '#dffaff';
            context.lineWidth = Math.max(1, size * 0.035);
            context.beginPath();
            context.moveTo(effect.x * size + size * 0.2, effect.y * size + size * 0.68);
            context.lineTo(effect.x * size + size * 0.42, effect.y * size + size * 0.44);
            context.lineTo(effect.x * size + size * 0.63, effect.y * size + size * 0.55);
            context.lineTo(effect.x * size + size * 0.8, effect.y * size + size * 0.28);
            context.stroke();
        }
        for (const effect of renderState.acid.values()) {
            const remaining = Math.max(0, effect.expiresAt - renderState.clock);
            const alpha = Math.min(0.8, 0.32 + 0.45 * remaining / Math.max(1, effect.durationMs));
            context.globalAlpha = alpha;
            context.fillStyle = '#65a30d';
            context.beginPath();
            context.ellipse((effect.x + 0.5) * size, (effect.y + 0.56) * size, size * 0.36, size * 0.24, 0, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = '#bef264';
            context.lineWidth = Math.max(1, size * 0.035);
            context.stroke();
            context.fillStyle = '#d9f99d';
            context.beginPath();
            context.arc((effect.x + 0.36) * size, (effect.y + 0.45) * size, size * 0.045, 0, Math.PI * 2);
            context.arc((effect.x + 0.62) * size, (effect.y + 0.62) * size, size * 0.035, 0, Math.PI * 2);
            context.fill();
        }
        for (const effect of renderState.fire.values()) {
            const remaining = Math.max(0, effect.expiresAt - renderState.clock);
            context.globalAlpha = Math.min(0.58, 0.12 + 0.45 * remaining / Math.max(1, effect.durationMs));
            context.fillStyle = '#f97316';
            context.beginPath();
            context.ellipse((effect.x + 0.5) * size, (effect.y + 0.58) * size, size * 0.29, size * 0.15, 0, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = '#fef3c7';
            context.fillRect((effect.x + 0.45) * size, (effect.y + 0.43) * size, size * 0.1, size * 0.13);
        }
        context.restore();
    }

    function drawEnemyAbilityMarker(enemy, a, ability) {
        const context = global.ctx || (typeof ctx !== 'undefined' ? ctx : null);
        if (!context || !a) return;
        const size = getTileSize();
        context.save();
        if (ability === 'crab_shell') {
            if (a.shellIntact) {
                context.strokeStyle = '#fed7aa';
                context.lineWidth = 3;
                context.beginPath();
                context.arc(enemy.x, enemy.y, enemy.width * 0.52, 0, Math.PI * 2);
                context.stroke();
            } else {
                context.strokeStyle = '#fef3c7';
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(enemy.x - 5, enemy.y - 5);
                context.lineTo(enemy.x + 2, enemy.y + 1);
                context.lineTo(enemy.x - 1, enemy.y + 8);
                context.stroke();
            }
        } else if (ability === 'boar_charge' && (a.chargeState === 'telegraph' || a.chargeState === 'charging')) {
            const dir = a.chargeDirection;
            if (dir) {
                context.strokeStyle = a.chargeState === 'telegraph' ? '#fdba74' : '#ef4444';
                context.lineWidth = a.chargeState === 'telegraph' ? 3 : 4;
                context.setLineDash(a.chargeState === 'telegraph' ? [5, 4] : []);
                context.beginPath();
                context.moveTo(enemy.x + dir.x * enemy.width * 0.4, enemy.y + dir.y * enemy.height * 0.4);
                context.lineTo(enemy.x + dir.x * size * 1.4, enemy.y + dir.y * size * 1.4);
                context.stroke();
                context.setLineDash([]);
            }
        } else if (ability === 'goat_stomp' && (a.goatTelegraphMs > 0 || a.goatEffectMs > 0)) {
            context.strokeStyle = a.goatEffectMs > 0 ? 'rgba(226,232,240,.85)' : 'rgba(203,213,225,.62)';
            context.lineWidth = 3;
            context.beginPath();
            context.arc(enemy.x, enemy.y, size * (a.goatEffectMs > 0 ? 1.45 : 1.1), 0, Math.PI * 2);
            context.stroke();
        } else if (ability === 'cherub_aura' && (a.cherubTelegraphMs > 0 || a.cherubPulseMs > 0)) {
            context.strokeStyle = a.cherubPulseMs > 0 ? '#f5d0fe' : 'rgba(216,180,254,.7)';
            context.lineWidth = 2.5;
            context.beginPath();
            context.arc(enemy.x, enemy.y, size * (a.cherubPulseMs > 0 ? 1.65 : 1.25), 0, Math.PI * 2);
            context.stroke();
        } else if (ability === 'hellhound_ember' && a.hellhoundBoostMs > 0) {
            context.fillStyle = '#fb923c';
            context.globalAlpha = 0.82;
            context.beginPath();
            context.moveTo(enemy.x - size * 0.22, enemy.y + size * 0.28);
            context.lineTo(enemy.x - size * 0.1, enemy.y + size * 0.02);
            context.lineTo(enemy.x + size * 0.01, enemy.y + size * 0.22);
            context.lineTo(enemy.x + size * 0.17, enemy.y - size * 0.05);
            context.lineTo(enemy.x + size * 0.24, enemy.y + size * 0.28);
            context.closePath();
            context.fill();
        }
        context.restore();
    }

    function drawEnemyWithRastreroAbilities(enemy, drawBase) {
        if (typeof drawBase !== 'function') return;
        const ability = getAbilityId(enemy);
        if (!ability) {
            drawBase(enemy);
            return;
        }
        const a = ensureEnemyState(enemy);
        const context = global.ctx || (typeof ctx !== 'undefined' ? ctx : null);
        if (a.moleBuriedMs > 0) {
            if (context) {
                context.save();
                context.fillStyle = '#8b6b45';
                context.globalAlpha = 0.85;
                context.beginPath();
                context.ellipse(enemy.x, enemy.y + enemy.height * 0.22, enemy.width * 0.48, enemy.height * 0.22, 0, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = '#d6b48c';
                context.lineWidth = 2;
                context.stroke();
                context.restore();
            }
            return;
        }
        if (!context) {
            drawBase(enemy);
            return;
        }
        context.save();
        try {
            if (isLizardCamouflaged(enemy)) context.globalAlpha *= 0.45;
            if (ability === 'frog_leap' && a.frogJumpMs > 0) {
                const progress = 1 - a.frogJumpMs / Math.max(1, a.frogJumpDurationMs);
                context.translate(0, -Math.sin(progress * Math.PI) * getTileSize() * 0.38);
            }
            drawBase(enemy);
        } finally {
            context.restore();
        }
        drawEnemyAbilityMarker(enemy, a, ability);
    }

    global.drawRastreroAbilityEffectsV630 = drawRastreroAbilityEffectsV630;
    global.drawRastreroEnemySpriteV630 = drawEnemyWithRastreroAbilities;
})(window);
