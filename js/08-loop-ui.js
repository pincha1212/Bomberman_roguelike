// Bomberman Roguelike v5.6 — Game loop, HUD, run flow, rewards, death summary and bootstrap
        function gameLoop(timestamp) {
            if (!gameState.isPlaying) { gameState.rafId = 0; return; }
            let dt = timestamp - gameState.lastTime;
            gameState.lastTime = timestamp;

            // El timestamp de requestAnimationFrame puede llegar ligeramente antes
            // que un performance.now() usado al iniciar/reanudar la escena.
            // Nunca permitimos que un dt negativo entre en la simulación.
            if (!Number.isFinite(dt) || dt < 0) {
                dt = 16.6667;
            } else if (dt > 100) {
                dt = 16;
            }

            // Adapt visual effects to the device without changing gameplay speed.
            perf.frameCount++;
            if (dt > 26) {
                perf.slowFrames++;
                perf.fastFrames = 0;
            } else if (dt < 18) {
                perf.fastFrames++;
                perf.slowFrames = Math.max(0, perf.slowFrames - 1);
            } else {
                perf.slowFrames = Math.max(0, perf.slowFrames - 1);
                perf.fastFrames = Math.max(0, perf.fastFrames - 1);
            }
            if (perf.slowFrames >= 20) perf.lowQuality = true;
            if (perf.fastFrames >= 120) perf.lowQuality = false;
            update(dt);
            draw();

            if (gameState.isPlaying) {
                gameState.rafId = requestAnimationFrame(gameLoop);
            } else {
                gameState.rafId = 0;
            }
        }

        function updateUI(force = false) {
            const now = performance.now();
            // DOM writes are expensive on mobile/low-end hardware; HUD does not need 60 updates/sec.
            if (!force && now - perf.lastUi < 100) return;
            perf.lastUi = now;

            UI['ui-health'].innerText = player.health;
            UI['ui-score'].innerText = gameState.score;
            UI['ui-level'].innerText = gameState.level;
            const bombAvailable = Math.max(0, player.maxBombs - player.bombsPlaced);
            UI['ui-bombs'].innerText = `${bombAvailable}/${player.maxBombs}`;
            const bombStat = document.getElementById('bomb-stat');
            const bombFill = document.getElementById('ui-bombs-fill');
            if (bombStat) bombStat.classList.toggle('bomb-empty', bombAvailable <= 0);
            if (bombFill) bombFill.style.width = `${player.maxBombs > 0 ? (bombAvailable / player.maxBombs) * 100 : 0}%`;
            UI['ui-range'].innerText = player.bombRange;
            UI['ui-speed'].innerText = (player.speed - 2).toFixed(1);
            UI['ui-coins'].innerText = gameState.coins;
            UI['ui-relics'].innerText = gameState.relics.length;
            if (UI['ui-timer']) UI['ui-timer'].innerText = `${Math.max(0, Math.ceil(gameState.roomTime / 1000))}s`;
            if (UI['ui-threat']) UI['ui-threat'].innerText = gameState.threatLevel;

            if (UI['ui-shield-badge']) UI['ui-shield-badge'].classList.toggle('hidden', !player.hasShield);

            const b = gameState.boss;
            const visible = !!b && !b.defeated;
            if (UI['boss-hud']) UI['boss-hud'].classList.toggle('hidden', !visible);
            if (visible) {
                if (UI['boss-bar']) UI['boss-bar'].style.width = `${Math.max(0, b.hp / b.maxHp * 100)}%`;
                if (UI['boss-phase']) UI['boss-phase'].textContent = `FASE ${b.phase}`;
            }

            if (UI['room-banner']) {
                UI['room-banner'].textContent = `${gameState.roomType.icon} ${gameState.roomType.name} · ${gameState.roomType.subtitle}`;
                UI['room-banner'].style.setProperty('--room-accent', gameState.roomType.color);
            }
            updateRoguePresentation();
            if (UI['relic-strip']) UI['relic-strip'].innerHTML = gameState.relics.map(r => { const meta = getRelicCategoryMeta(r.category); return `<span class="relic-chip" title="${r.desc}" style="--relic-category:${meta.color}">${r.icon} ${r.name} <small>${meta.label}</small></span>`; }).join('');
        }

        function updateRoguePresentation() {
            const runNode = UI['run-banner'];
            if (!runNode) return;
            const biomeLabel = typeof getBiomeRunLabelV49 === 'function' ? getBiomeRunLabelV49(gameState.level) : null;
            runNode.textContent = biomeLabel
                ? `RUN ${String(gameState.runNumber || 1).padStart(2, '0')} · ${biomeLabel.toUpperCase()} · DEPTH ${String(gameState.level).padStart(2, '0')}`
                : `RUN ${String(gameState.runNumber || 1).padStart(2, '0')} · DEPTH ${String(gameState.level).padStart(2, '0')}`;
        }

        function startGame() {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('level-complete-screen').classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');

            // V3.15: una nueva run pasa por un reinicio centralizado para evitar
            // arrastres de bombas, enemigos, trampas, proyectiles, timers, input o cámara.
            if (typeof clearRunSaveV55 === 'function') clearRunSaveV55();
            beginNewRun();
            initLevel();
            gameState.isPlaying = true;
            gameState.lastTime = performance.now();
            updateRoguePresentation();
            updateUI(true);
            gameState.rafId = requestAnimationFrame(gameLoop);
        }

        function startDepthForTestV53(targetDepth) {
            const engine = window.BOMBER_ENGINE || {};
            const state = engine.getState?.() || gameState;
            const currentPlayer = engine.getPlayer?.() || player;
            const maxDepth = typeof getBiomeProgressionSummaryV49 === 'function'
                ? Number(getBiomeProgressionSummaryV49().totalDepths) || 44
                : 44;
            const depth = Math.max(1, Math.min(maxDepth, Math.floor(Number(targetDepth) || 1)));
            document.getElementById('start-screen')?.classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');
            document.getElementById('game-over-screen')?.classList.add('hidden');
            document.getElementById('level-complete-screen')?.classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');
            state.level = depth;
            state.isPlaying = false;
            state.paused = false;
            state.rafId = 0;
            currentPlayer.isInvincible = false;
            currentPlayer.invincibleTimer = 0;
            currentPlayer.lastDamageFrame = -1;
            state.lastMoveInputAt = 0;
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            if (typeof combatFeedback !== 'undefined') {
                combatFeedback.hitStop = 0;
                combatFeedback.flash = 0;
                combatFeedback.playerHit = 0;
                combatFeedback.death = 0;
                combatFeedback.playerRecoilX = 0;
                combatFeedback.playerRecoilY = 0;
            }
            initLevel();
            if (typeof playerFSMReset === 'function') playerFSMReset('test-depth');
            state.isPlaying = true;
            state.paused = false;
            state.lastTime = performance.now();
            updateRoguePresentation();
            updateUI(true);
            if (state.rafId) cancelAnimationFrame(state.rafId);
            state.rafId = requestAnimationFrame(gameLoop);
            return depth;
        }

        window.startDepthForTestV53 = startDepthForTestV53;
        window.BOMBER_ENGINE = window.BOMBER_ENGINE || {};
        window.BOMBER_ENGINE.startDepthForTest = startDepthForTestV53;
        window.BOMBER_ENGINE.nextDepth = () => { startNextDepth(); return (window.BOMBER_ENGINE.getState?.() || gameState).level; };
        window.BOMBER_ENGINE.getMaxRunDepth = getMaxRunDepthV56;
        window.BOMBER_ENGINE.completeRun = completeRunV56;

        function buildRewardChoices() {
            const choices = [];
            const availableRelics = getAvailableRelics().map(relic => ({
                id: `relic_${relic.id}`, kind: 'RELIC', rarity: relic.rarity,
                name: `${relic.icon} ${relic.name}`, desc: relic.desc, category: relic.category, relic
            }));
            const pool = [...REWARDS, ...availableRelics];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            return pool.slice(0, Math.min(3, pool.length));
        }

        function applyReward(reward) {
            if (reward.kind === 'RELIC') {
                grantRelic(reward.relic);
            } else {
                reward.action();
                addFloatingText(reward.name, player.x, player.y, RARITY_COLORS[reward.rarity]);
            }
        }

        function getMaxRunDepthV56() {
            const summary = typeof getBiomeProgressionSummaryV49 === 'function'
                ? getBiomeProgressionSummaryV49()
                : null;
            return Math.max(1, Number(summary?.totalDepths) || 44);
        }

        function completeRunV56() {
            const maxDepth = getMaxRunDepthV56();
            gameState.level = maxDepth;
            gameState.isPlaying = false;
            gameState.paused = false;
            if (typeof gameState.rafId === 'number' && gameState.rafId && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(gameState.rafId);
            }
            gameState.rafId = 0;
            if (typeof clearRunSaveV55 === 'function') clearRunSaveV55();
            document.getElementById('level-complete-screen')?.classList.add('hidden');
            const summary = typeof finishRun === 'function' ? finishRun('completed') : null;
            document.getElementById('game-over-screen')?.classList.remove('hidden');
            updateRoguePresentation();
            updateUI(true);
            return summary;
        }

        function advanceAfterRewardV56() {
            if (gameState.level >= getMaxRunDepthV56()) {
                completeRunV56();
                return false;
            }
            startNextDepth();
            return true;
        }

        function startNextDepth() {
            if (gameState.level >= getMaxRunDepthV56()) {
                completeRunV56();
                return;
            }
            gameState.level++;
            document.getElementById('level-complete-screen').classList.add('hidden');
            player.isInvincible = false;
            player.invincibleTimer = 0;
            player.lastDamageFrame = -1;
            gameState.lastMoveInputAt = 0;
            if (typeof resetBombHandlingState === 'function') resetBombHandlingState();
            combatFeedback.hitStop = 0;
            combatFeedback.flash = 0;
            combatFeedback.playerHit = 0;
            combatFeedback.death = 0;
            combatFeedback.playerRecoilX = 0;
            combatFeedback.playerRecoilY = 0;
            initLevel();
            if (typeof playerFSMReset === 'function') playerFSMReset('depth-start');
            gameState.isPlaying = true;
            gameState.paused = false;
            gameState.lastTime = performance.now();
            gameState.rafId = requestAnimationFrame(gameLoop);
            if (typeof saveRunV55 === 'function') saveRunV55('level-start');
        }

        function completeLevel() {
            gameState.isPlaying = false;
            const screen = document.getElementById('level-complete-screen');
            const options = document.getElementById('upgrade-options');
            const rewardTitle = document.getElementById('reward-title');
            const rewardMeta = document.getElementById('reward-meta');
            const footer = document.getElementById('reward-footer');
            options.innerHTML = '';
            footer.innerHTML = '';

            const roomReward = Math.round(ROOM_TYPES[gameState.roomType.id].rewardCoins * (1 + gameState.coinBonus));
            gameState.coins += roomReward;
            gameState.score += Math.round(250 * (1 + (gameState.level * 0.08)));

            if (rewardTitle) rewardTitle.textContent = `PROFUNDIDAD ${String(gameState.level).padStart(2, '0')} SUPERADA`;
            if (rewardMeta) rewardMeta.textContent = `+${roomReward} monedas · elegí 1 mejora para la próxima sala`;

            const choices = buildRewardChoices();
            choices.forEach(reward => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'upgrade-card reward-card';
                card.style.setProperty('--rarity', RARITY_COLORS[reward.rarity]);
                card.innerHTML = `
                    <div class="reward-rarity">${reward.rarity}</div>
                    ${reward.category ? `<div class="relic-category-badge" style="--relic-category:${getRelicCategoryColor(reward.category)}">${getRelicCategoryLabel(reward.category)}</div>` : ''}
                    <div class="reward-name">${reward.name}</div>
                    <div class="reward-desc">${reward.desc}</div>
                `;
                card.addEventListener('click', () => {
                    applyReward(reward);
                    advanceAfterRewardV56();
                }, { once: true });
                options.appendChild(card);
            });

            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => {
                gameState.coins += 15;
                advanceAfterRewardV56();
            }, { once: true });
            footer.appendChild(skip);

            if (gameState.rerolls > 0) {
                const rerollCost = Math.max(5, 15 - gameState.rerollDiscount);
                const reroll = document.createElement('button');
                reroll.className = 'reward-secondary';
                reroll.textContent = `REROLL · ${rerollCost}¢`;
                reroll.disabled = gameState.coins < rerollCost;
                reroll.addEventListener('click', () => {
                    if (gameState.coins < rerollCost || gameState.rerolls <= 0) return;
                    gameState.coins -= rerollCost;
                    gameState.rerolls--;
                    completeLevelRewardsRefresh(options, footer);
                });
                footer.appendChild(reroll);
            }

            updateUI();
            screen.classList.remove('hidden');
        }

        function completeLevelRewardsRefresh(options, footer) {
            options.innerHTML = '';
            footer.innerHTML = '';
            const choices = buildRewardChoices();
            choices.forEach(reward => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'upgrade-card reward-card';
                card.style.setProperty('--rarity', RARITY_COLORS[reward.rarity]);
                card.innerHTML = `<div class="reward-rarity">${reward.rarity}</div>${reward.category ? `<div class="relic-category-badge" style="--relic-category:${getRelicCategoryColor(reward.category)}">${getRelicCategoryLabel(reward.category)}</div>` : ''}<div class="reward-name">${reward.name}</div><div class="reward-desc">${reward.desc}</div>`;
                card.addEventListener('click', () => { applyReward(reward); advanceAfterRewardV56(); }, { once: true });
                options.appendChild(card);
            });
            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => { gameState.coins += 15; advanceAfterRewardV56(); }, { once: true });
            footer.appendChild(skip);
            updateUI();
        }

        function gameOver(source = 'unknown') {
            finishRun(source);
            document.getElementById('game-over-screen')?.classList.remove('hidden');
        }

        document.getElementById('btn-start').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-restart').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-resume')?.addEventListener('click', togglePause);

        // Initial setup
        gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0);
        initLevel();
        updateRoguePresentation();
        updateUI();
        draw();
