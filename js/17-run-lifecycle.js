// Bomberman Roguelike v4.0 — Death & Restart Lifecycle
// Mantiene estadísticas de la run, cierre de muerte y reinicio limpio.

const RUN_LIFECYCLE = {
    elapsedMs: 0,
    lastSummary: null
};

function formatRunTime(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function resetCombatFeedbackForRun() {
    if (typeof combatFeedback === 'undefined') return;
    combatFeedback.hitStop = 0;
    combatFeedback.flash = 0;
    combatFeedback.flashAlpha = 0;
    combatFeedback.playerHit = 0;
    combatFeedback.playerRecoilX = 0;
    combatFeedback.playerRecoilY = 0;
    combatFeedback.death = 0;
    combatFeedback.bombPulse = 0;
    combatFeedback.lastBomb = null;
}

function resetPlayerRuntimeState() {
    player.x = 0;
    player.y = 0;
    player.speed = 3.0;
    player.maxBombs = 1;
    player.bombsPlaced = 0;
    player.bombCooldown = 0;
    player.bombRange = 1;
    player.health = 3;
    player.maxHealth = 5;
    player.hasShield = false;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    player.lastDamageFrame = -1;
    player.dir = 'down';
    player.isMoving = false;
    player.walkCycle = 0;
    player._frameScale = 1;
    player.vx = 0;
    player.vy = 0;
    player.inputDir = 0;
    player.inputAxis = null;
    player.inputBuffer = null;
    player.inputBufferTimer = 0;
    player.hazardSlowTimer = 0;
    player.hazardSlowFactor = 1;
    player.hazardSlowType = '';
}

function resetWorldRuntimeState() {
    gameState.isPlaying = false;
    gameState.paused = false;
    gameState.level = 1;
    gameState.score = 0;
    gameState.coins = 0;
    gameState.gridWidth = 17;
    gameState.gridHeight = 17;
    gameState.grid = [];
    gameState.bombs = [];
    gameState.explosions = [];
    gameState.enemies = [];
    gameState.items = [];
    gameState.particles = [];
    gameState.floaters = [];
    gameState.hazards = [];
    gameState.hazardCooldown = 0;
    gameState.boss = null;
    gameState.bossProjectiles = [];
    gameState.roomTime = 0;
    gameState.threatLevel = 0;
    gameState.difficulty = null;
    gameState.nextReinforcement = 20000;
    gameState.exitPos = null;
    gameState.roomDesign = null;
    gameState.lastTime = 0;
    gameState.keys = {};
    gameState.touchControls = { x: 0, y: 0 };
    gameState.lastMoveAxis = 'vertical';
    gameState.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    gameState.shakeTimer = 0;
    gameState.shakeIntensity = 0;
    gameState.animFrame = 0;
    gameState.blastSerial = 0;
    gameState.lastMoveInputAt = 0;
    gameState.blocksBroken = 0;
    gameState.totalKills = 0;
    gameState.coinBonus = 0;
    gameState.killScoreMult = 1;
    gameState.fireScoreMult = 1;
    gameState.hitInvulnerabilityBonus = 0;
    gameState.rerollDiscount = 0;
    gameState.rerolls = 1;
    gameState.relics = [];
    gameState.roomType = ROOM_TYPES.STANDARD;
    gameState.runElapsedMs = 0;
    gameState.rafId = 0;

    if (typeof resetRelicModifiers === 'function') resetRelicModifiers();
    if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
    resetCombatFeedbackForRun();

    if (typeof ambient !== 'undefined') {
        clearTimeout(ambient.introTimer);
        ambient.dustTimer = 0;
        ambient.lastFoot = 0;
        ambient.introTimer = 0;
    }
    if (typeof adaptiveUI !== 'undefined') {
        adaptiveUI.lastLayout = '';
        adaptiveUI.lastPlayerState = false;
    }
    resetPlayerRuntimeState();

    if (typeof UI !== 'undefined') {
        UI['danger-indicator']?.classList.add('hidden');
        UI['boss-hud']?.classList.add('hidden');
        UI['room-intro']?.classList.add('hidden');
    }
}

function beginNewRun() {
    if (typeof debugRecordEvent === 'function') debugRecordEvent('LIFECYCLE', 'beginNewRun()');
    // Si una callback de requestAnimationFrame quedó en cola, la invalida.
    if (typeof gameState.rafId === 'number' && gameState.rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(gameState.rafId);
    }
    gameState.rafId = 0;

    resetWorldRuntimeState();

    gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0) + 1;
    localStorage.setItem('bombermanRogueRun', gameState.runNumber);

    RUN_LIFECYCLE.elapsedMs = 0;
    RUN_LIFECYCLE.lastSummary = null;
    gameState.runElapsedMs = 0;
    gameState.rafId = 0;

    return gameState.runNumber;
}

function tickRunClock(dt) {
    if (!gameState.isPlaying || gameState.paused) return;
    const safeDt = Math.max(0, Math.min(Number(dt) || 0, 100));
    RUN_LIFECYCLE.elapsedMs += safeDt;
    gameState.runElapsedMs = RUN_LIFECYCLE.elapsedMs;
}

function getCurrentRunTimeMs() {
    return RUN_LIFECYCLE.elapsedMs;
}

function getDeathCauseLabel(source) {
    const labels = {
        explosion: 'Explosión',
        trap: 'Trampa',
        'boss-contact': 'Contacto con el jefe',
        'boss-projectile': 'Proyectil del jefe',
        enemy: 'Enemigo',
        'enemy-contact': 'Enemigo',
        'unknown': 'Daño recibido'
    };
    return labels[source] || 'Daño recibido';
}

function finishRun(source = 'unknown') {
    if (typeof debugRecordEvent === 'function') debugRecordEvent('LIFECYCLE', `finishRun() · ${source}`);
    if (RUN_LIFECYCLE.lastSummary) return RUN_LIFECYCLE.lastSummary;

    gameState.isPlaying = false;
    gameState.paused = false;

    if (typeof gameState.rafId === 'number' && gameState.rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(gameState.rafId);
        gameState.rafId = 0;
    }

    const finalDepth = Number(gameState.level) || 1;
    const finalScore = Number(gameState.score) || 0;
    const finalCoins = Number(gameState.coins) || 0;
    const finalKills = Number(gameState.totalKills) || 0;
    const finalTime = RUN_LIFECYCLE.elapsedMs;
    const previousBestDepth = Number(localStorage.getItem('bombermanBestDepth') || gameState.bestDepth || 0);
    const previousBestScore = Number(localStorage.getItem('bombermanBestScore') || 0);
    const bestDepth = Math.max(previousBestDepth, finalDepth);
    const bestScore = Math.max(previousBestScore, finalScore);

    gameState.bestDepth = bestDepth;
    localStorage.setItem('bombermanBestDepth', bestDepth);
    localStorage.setItem('bombermanBestScore', bestScore);

    RUN_LIFECYCLE.lastSummary = {
        runNumber: Number(gameState.runNumber) || 1,
        depth: finalDepth,
        score: finalScore,
        coins: finalCoins,
        kills: finalKills,
        relics: gameState.relics.map(relic => ({
            id: relic.id,
            name: relic.name,
            icon: relic.icon,
            rarity: relic.rarity,
            category: relic.category || 'BOMB'
        })),
        elapsedMs: finalTime,
        cause: getDeathCauseLabel(source),
        bestDepth,
        bestScore,
        newBestDepth: finalDepth > previousBestDepth,
        newBestScore: finalScore > previousBestScore
    };

    renderDeathSummary(RUN_LIFECYCLE.lastSummary);
    return RUN_LIFECYCLE.lastSummary;
}

function renderDeathSummary(summary) {
    const set = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };

    set('go-run', `RUN ${String(summary.runNumber).padStart(2, '0')}`);
    set('go-level', summary.depth);
    set('go-score', summary.score);
    set('go-coins', summary.coins);
    set('go-relics', summary.relics.length);
    set('go-kills', summary.kills);
    set('go-time', formatRunTime(summary.elapsedMs));
    set('go-best', summary.bestDepth);
    set('go-best-score', summary.bestScore);
    set('go-cause', summary.cause);

    const record = document.getElementById('go-record');
    if (record) {
        const parts = [];
        if (summary.newBestDepth) parts.push('NUEVA PROFUNDIDAD');
        if (summary.newBestScore) parts.push('NUEVO PUNTAJE');
        record.textContent = parts.length ? `✦ ${parts.join(' · ')}` : 'RUN FINALIZADA';
        record.classList.toggle('record-new', parts.length > 0);
    }

    const relicList = document.getElementById('go-relic-list');
    if (relicList) {
        if (!summary.relics.length) {
            relicList.innerHTML = '<span class="death-empty">Sin reliquias</span>';
        } else {
            relicList.innerHTML = summary.relics.map(relic => {
                const meta = typeof getRelicCategoryMeta === 'function' ? getRelicCategoryMeta(relic.category) : { color: '#94a3b8', label: relic.category };
                return `<span class="death-relic" style="--relic-category:${meta.color}" title="${relic.name}">${relic.icon} ${relic.name}</span>`;
            }).join('');
        }
    }

    const gameOver = document.getElementById('game-over-screen');
    gameOver?.classList.add('death-ready');
}
