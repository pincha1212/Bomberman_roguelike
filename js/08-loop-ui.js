// Bomberman Roguelike v3.10 — Game loop, HUD, run flow, rewards, game over and bootstrap
        function gameLoop(timestamp) {
            let dt = timestamp - gameState.lastTime;
            gameState.lastTime = timestamp;
            if (dt > 100) dt = 16;

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
                requestAnimationFrame(gameLoop);
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
            UI['ui-bombs'].innerText = `${Math.max(0, player.maxBombs - player.bombsPlaced)}/${player.maxBombs}`;
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
            if (UI['relic-strip']) UI['relic-strip'].innerHTML = gameState.relics.map(r => `<span class="relic-chip" title="${r.desc}">${r.icon} ${r.name}</span>`).join('');
        }

        function updateRoguePresentation() {
            const runNode = UI['run-banner'];
            if (runNode) runNode.textContent = `RUN ${String(gameState.runNumber || 1).padStart(2, '0')} · DEPTH ${String(gameState.level).padStart(2, '0')}`;
        }

        function startGame() {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('main-menu')?.classList.add('run-active');
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('level-complete-screen').classList.add('hidden');
            document.getElementById('pause-screen')?.classList.add('hidden');

            gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0) + 1;
            localStorage.setItem('bombermanRogueRun', gameState.runNumber);
            gameState.level = 1;
            gameState.score = 0;
            gameState.coins = 0;
            gameState.relics = [];
            gameState.coinBonus = 0;
            gameState.killScoreMult = 1;
            gameState.rerollDiscount = 0;
            gameState.rerolls = 1;
            gameState.blocksBroken = 0;
            gameState.totalKills = 0;
            gameState.hazards = [];
            gameState.roomTime = 0;
            gameState.threatLevel = 0;
            gameState.nextReinforcement = 20000;
            gameState.paused = false;
            if (typeof resetCombatFeedback === 'function') resetCombatFeedback();
            player.health = 3;
            player.maxHealth = 5;
            player.maxBombs = 1;
            player.bombsPlaced = 0;
            player.bombCooldown = 0;
            player.bombRange = 1;
            player.speed = 3.0;
            player.hasShield = false;
            player.isInvincible = false;
            player.invincibleTimer = 0;

            initLevel();
            gameState.isPlaying = true;
            gameState.lastTime = performance.now();
            updateRoguePresentation();
            requestAnimationFrame(gameLoop);
        }

        function buildRewardChoices() {
            const choices = [];
            const availableRelics = getAvailableRelics().map(relic => ({
                id: `relic_${relic.id}`, kind: 'RELIC', rarity: relic.rarity,
                name: `${relic.icon} ${relic.name}`, desc: relic.desc, relic
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

        function startNextDepth() {
            gameState.level++;
            document.getElementById('level-complete-screen').classList.add('hidden');
            player.isInvincible = false;
            player.invincibleTimer = 0;
            initLevel();
            player.bombCooldown = 0;
            gameState.isPlaying = true;
            gameState.paused = false;
            if (typeof resetCombatFeedback === 'function') resetCombatFeedback();
            gameState.lastTime = performance.now();
            requestAnimationFrame(gameLoop);
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
                    <div class="reward-name">${reward.name}</div>
                    <div class="reward-desc">${reward.desc}</div>
                `;
                card.addEventListener('click', () => {
                    applyReward(reward);
                    startNextDepth();
                }, { once: true });
                options.appendChild(card);
            });

            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => {
                gameState.coins += 15;
                startNextDepth();
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
                card.innerHTML = `<div class="reward-rarity">${reward.rarity}</div><div class="reward-name">${reward.name}</div><div class="reward-desc">${reward.desc}</div>`;
                card.addEventListener('click', () => { applyReward(reward); startNextDepth(); }, { once: true });
                options.appendChild(card);
            });
            const skip = document.createElement('button');
            skip.className = 'reward-secondary';
            skip.textContent = 'NO ELEGIR · +15¢';
            skip.addEventListener('click', () => { gameState.coins += 15; startNextDepth(); }, { once: true });
            footer.appendChild(skip);
            updateUI();
        }

        function gameOver() {
            gameState.isPlaying = false;
            gameState.paused = false;
            const finalDepth = gameState.level;
            gameState.bestDepth = Math.max(gameState.bestDepth, finalDepth);
            localStorage.setItem('bombermanBestDepth', gameState.bestDepth);
            const bestScore = Math.max(Number(localStorage.getItem('bombermanBestScore') || 0), gameState.score);
            localStorage.setItem('bombermanBestScore', bestScore);
            document.getElementById('go-level').innerText = finalDepth;
            document.getElementById('go-score').innerText = gameState.score;
            document.getElementById('go-coins').innerText = gameState.coins;
            document.getElementById('go-relics').innerText = gameState.relics.length;
            document.getElementById('go-best').innerText = gameState.bestDepth;
            document.getElementById('game-over-screen').classList.remove('hidden');
        }

        document.getElementById('btn-start').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-restart').addEventListener('click', () => { initAudio(); audioCtx?.resume(); sfx('click'); startGame(); });
        document.getElementById('btn-resume')?.addEventListener('click', togglePause);

        // Initial setup
        gameState.runNumber = Number(localStorage.getItem('bombermanRogueRun') || 0) + 1;
        initLevel();
        updateRoguePresentation();
        updateUI();
        draw();
