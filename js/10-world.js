// Bomberman Roguelike v6.12.20 — Level generation with controlled procedural layout + classic fallback.
        function applyProceduralMapV61220() {
            const generator = (typeof window !== 'undefined') ? window.DungeonGenerator : null;
            if (!generator || typeof generator.getRunRequest !== 'function') return false;

            const request = generator.getRunRequest(gameState.level);
            if (!request || request.enabled !== true) return false;

            const profile = {
                ...(request.profile || {}),
                width: gameState.gridWidth,
                height: gameState.gridHeight,
                targetRooms: gameState.gridWidth >= 21 ? 5 : (gameState.gridWidth >= 17 ? 4 : 3)
            };
            const result = generator.generate(request.seed, profile);
            const validation = typeof generator.validateResult === 'function'
                ? generator.validateResult(result)
                : { valid: false, errors: ['generator_validator_missing'] };

            if (!result || result.generated !== true || !result.mapData || validation.valid !== true) {
                return false;
            }

            const tileMap = {
                EMPTY: TYPES.EMPTY,
                WALL: TYPES.WALL,
                BLOCK: TYPES.BLOCK,
                EXIT_LOCKED: TYPES.EXIT_LOCKED,
                EXIT_OPEN: TYPES.EXIT_OPEN
            };
            const mapData = result.mapData;
            const nextGrid = mapData.tiles.map(row => row.map(tile => tileMap[tile]));
            if (nextGrid.some(row => row.some(tile => !Number.isInteger(tile)))) return false;

            gameState.grid = nextGrid;
            gameState.gridWidth = mapData.width;
            gameState.gridHeight = mapData.height;
            gameState.exitPos = mapData.exit ? { x: mapData.exit.x, y: mapData.exit.y } : null;
            if (mapData.playerSpawn) {
                player.x = mapData.playerSpawn.x * TILE_SIZE + (TILE_SIZE - player.width) / 2;
                player.y = mapData.playerSpawn.y * TILE_SIZE + (TILE_SIZE - player.height) / 2;
                if (typeof gridResetTileMove === 'function') gridResetTileMove(player, false);
            }
            gameState.proceduralMapActive = true;
            gameState.proceduralMapSeed = request.seed;

            // Mantener el flujo visual existente: la salida procedural queda oculta bajo un bloque.
            if (gameState.exitPos && gameState.grid[gameState.exitPos.y]?.[gameState.exitPos.x] === TYPES.EMPTY) {
                gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.BLOCK;
            }

            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            return true;
        }

        function buildClassicMapV61220() {
            gameState.proceduralMapActive = false;
            gameState.proceduralMapSeed = null;
            gameState.grid = Array(gameState.gridHeight).fill().map(() => Array(gameState.gridWidth).fill(TYPES.EMPTY));

            // Outer walls & pillar walls
            for (let y = 0; y < gameState.gridHeight; y++) {
                for (let x = 0; x < gameState.gridWidth; x++) {
                    if (x === 0 || x === gameState.gridWidth - 1 || y === 0 || y === gameState.gridHeight - 1) {
                        gameState.grid[y][x] = TYPES.WALL;
                    } else if (x % 2 === 0 && y % 2 === 0) {
                        gameState.grid[y][x] = TYPES.WALL;
                    }
                }
            }

            const blockDensity = 0.42;
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    if ((x <= 2 && y <= 2) || (x === 1 && y === 3) || (x === 3 && y === 1)) continue;
                    if (Math.random() < blockDensity) gameState.grid[y][x] = TYPES.BLOCK;
                }
            }

            let blocks = [];
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.BLOCK) blocks.push({ x, y });
                }
            }

            if (blocks.length > 0) {
                const exitBlock = blocks[Math.floor(Math.random() * blocks.length)];
                gameState.exitPos = { x: exitBlock.x, y: exitBlock.y };
            } else {
                gameState.exitPos = { x: gameState.gridWidth - 2, y: gameState.gridHeight - 2 };
                gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            gameState.exitUnlocked = true;
            }

            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
        }

        function setExitStateV613(open = false) {
            const pos = gameState.exitPos;
            if (!pos || !gameState.grid?.[pos.y]) return false;
            const current = gameState.grid[pos.y][pos.x];
            if (current === TYPES.BLOCK && open) return false;
            gameState.grid[pos.y][pos.x] = open ? TYPES.EXIT_OPEN : TYPES.EXIT_LOCKED;
            gameState.exitUnlocked = !!open;
            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            return true;
        }

        function tryUnlockExitCurrentRoom() {
            if (!gameState?.exitPos || gameState.roomType?.id === 'BOSS') return false;
            if (gameState.exitUnlocked) return true;
            if (Array.isArray(gameState.enemies) && gameState.enemies.length > 0) return false;
            const pos = gameState.exitPos;
            const tile = gameState.grid?.[pos.y]?.[pos.x];
            if (tile === TYPES.BLOCK) return false;
            return setExitStateV613(true);
        }

        function initLevel() {
            gameState.roomType = ROOM_TYPES.STANDARD;
            if (typeof applyDifficultyV323 === 'function') applyDifficultyV323();
            gameState.gridWidth = 15;
            gameState.gridHeight = 15;

            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            gameState.bombs = [];
            if (typeof materialResetV60 === 'function') materialResetV60();
            player.bombsPlaced = 0;
            gameState.explosions = [];
            gameState.enemies = [];
            gameState.items = [];
            gameState.particles = [];
            gameState.floaters = [];
            gameState.hazards = [];
            gameState.boss = null;
            gameState.blastSerial = 0;
            gameState.roomTime = typeof getDifficultyRoomTimeV323 === 'function'
                ? getDifficultyRoomTimeV323(Math.max(35000, 80000 - gameState.level * 1500))
                : Math.max(35000, 80000 - gameState.level * 1500);
            gameState.threatLevel = 0;
            const firstReinforcementBase = Math.max(10000, gameState.roomTime - 18000);
            gameState.nextReinforcement = typeof getDifficultyReinforcementIntervalV323 === 'function'
                ? getDifficultyReinforcementIntervalV323(firstReinforcementBase)
                : firstReinforcementBase;

            // El mapa nunca se publica parcialmente: el generador trabaja sobre MapData aislado.
            player.x = TILE_SIZE + (TILE_SIZE - player.width) / 2;
            player.y = TILE_SIZE + (TILE_SIZE - player.height) / 2;
            // El spawn inicia una nueva navegación: nunca heredar un tile-move
            // activo ni su objetivo de la sala anterior.
            if (typeof gridResetTileMove === 'function') gridResetTileMove(player, false);

            const proceduralApplied = applyProceduralMapV61220();
            if (!proceduralApplied) buildClassicMapV61220();
            // Tanto el mapa procedural como el fallback dejan el jugador en un
            // spawn válido y limpio para la nueva profundidad.
            if (typeof gridResetTileMove === 'function') gridResetTileMove(player, false);

            if (typeof resetCameraToPlayer === 'function') resetCameraToPlayer();

            spawnEnemies();
            updateRoguePresentation();
            updateUI();
        }

        function damageBoss(amount = 1) {
            const b = gameState.boss;
            if (!b || b.defeated || b.invuln > 0) return false;
            b.hp -= amount;
            b.invuln = 220;
            triggerBossHitFeedback(b);
            b.flash = 180;
            gameState.score += 75;
            sfx('bossHit');
            triggerScreenShake(3, 100);
            addFloatingText(`-${amount}`, b.x, b.y - b.height / 2, '#fb7185');
            if (b.hp <= 0) defeatBoss();
            return true;
        }

        function defeatBoss() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            b.defeated = true;
            b.hp = 0;
            gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            gameState.coins += 30;
            gameState.score += 1500;
            addParticles(b.x, b.y, 'particleBoss', 55);
            addFloatingText('☠ JEFE DERROTADO', b.x, b.y - 50, '#facc15');
            addFloatingText('+30¢  +1500', b.x, b.y + 20, '#fbbf24');
            sfx('boom');
            triggerScreenShake(12, 500);
            updateUI();
        }

        function updateBoss(dt) {
            const b=gameState.boss;
            if(!b || b.defeated) return;
            b.invuln=Math.max(0,b.invuln-dt); b.flash=Math.max(0,b.flash-dt);
            b.moveTimer-=dt;
            const ratio=b.hp/b.maxHp;
            b.phase=ratio<=.33?3:(ratio<=.66?2:1);
            const scale=Math.min(getCombatMotionDt(dt)/16.6667,2);

            if(b.moveTimer<=0){
                b.moveTimer=760-Math.min(260,b.phase*80);
                const dx=player.x+player.width/2-b.x, dy=player.y+player.height/2-b.y;
                if(Math.abs(dx)>Math.abs(dy)){b.vx=Math.sign(dx)*(0.8+b.phase*.3);b.vy=0;} else {b.vx=0;b.vy=Math.sign(dy)*(0.8+b.phase*.3);}
            }
            const nx=b.x+b.vx*scale, ny=b.y+b.vy*scale;
            if(!rectCollidesSolid(nx-b.width/2,ny-b.height/2,b.width,b.height)){b.x=nx;b.y=ny;} else {b.vx*=-1;b.vy*=-1;}

            // v4.1: el boss ya no tiene proyectiles, cargas ni refuerzos;
            // sus ataques viven únicamente en js/28-boss-system.js.
            const hit={left:b.x-b.width*.38,right:b.x+b.width*.38,top:b.y-b.height*.38,bottom:b.y+b.height*.38};
            const ph={left:player.x+5,right:player.x+player.width-5,top:player.y+5,bottom:player.y+player.height-5};
            if(checkOverlap(hit,ph)) takeDamage('boss-contact', b.x, b.y);
        }

        function drawBoss() {
            const b=gameState.boss; if(!b || b.defeated) return;
            drawLargeBossShadow(b);
            ctx.save();
            const pulse=1+Math.sin(gameState.animFrame*.10)*.035;
            const rage=b.phase===3;
            ctx.translate(b.x,b.y);ctx.scale(pulse,pulse);
            ctx.globalAlpha=b.flash>0 ? .55 : 1;
            const aura=ctx.createRadialGradient(0,0,20,0,0,b.width*.8);
            aura.addColorStop(0,rage?'rgba(244,63,94,.20)':'rgba(168,85,247,.16)');
            aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,b.width*.8,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(0,0,0,.58)';ctx.beginPath();ctx.ellipse(0,b.height*.43,b.width*.48,10,0,0,Math.PI*2);ctx.fill();
            // Massive armored body
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageBase', '#581c1c') : '#581c1c') : (typeof themeColorV46 === 'function' ? themeColorV46('bossBase', '#312e81') : '#312e81');
            ctx.strokeStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageOutline', '#fb7185') : '#fb7185') : (typeof themeColorV46 === 'function' ? themeColorV46('bossOutline', '#a78bfa') : '#a78bfa');ctx.lineWidth=5;
            ctx.beginPath();ctx.roundRect(-b.width*.43,-b.height*.42,b.width*.86,b.height*.84,18);ctx.fill();ctx.stroke();
            // Shoulder armor
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageShoulder', '#991b1b') : '#991b1b') : (typeof themeColorV46 === 'function' ? themeColorV46('bossShoulder', '#4c1d95') : '#4c1d95');
            ctx.beginPath();ctx.arc(-b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.arc(b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.fill();
            // Face plate
            ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossFacePlate', '#111827') : '#111827';ctx.fillRect(-b.width*.25,-b.height*.19,b.width*.50,b.height*.30);
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageEye', '#fda4af') : '#fda4af') : (typeof themeColorV46 === 'function' ? themeColorV46('bossEye', '#e9d5ff') : '#e9d5ff');ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;
            ctx.fillRect(-b.width*.16,-b.height*.10,b.width*.10,7);ctx.fillRect(b.width*.06,-b.height*.10,b.width*.10,7);ctx.shadowBlur=0;
            // Crown / horns
            ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossCrown', '#facc15') : '#facc15';ctx.beginPath();ctx.moveTo(-b.width*.28,-b.height*.38);ctx.lineTo(-b.width*.17,-b.height*.62);ctx.lineTo(-b.width*.04,-b.height*.38);ctx.lineTo(b.width*.08,-b.height*.62);ctx.lineTo(b.width*.25,-b.height*.38);ctx.closePath();ctx.fill();
            // Core
            ctx.fillStyle=rage ? (typeof themeColorV46 === 'function' ? themeColorV46('bossRageCore', '#ef4444') : '#ef4444') : (typeof themeColorV46 === 'function' ? themeColorV46('bossCore', '#c084fc') : '#c084fc');ctx.shadowBlur=18;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(0,b.height*.15,b.width*.10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            // Phase markers
            ctx.fillStyle=typeof themeColorV46 === 'function' ? themeColorV46('bossPhaseMarker', '#fef08a') : '#fef08a';for(let i=0;i<b.phase;i++){ctx.beginPath();ctx.arc(-10+(i-1)*10,b.height*.34,3,0,Math.PI*2);ctx.fill();}
            ctx.restore();
        }

        // V3.12.3: el sistema de trampas/hazards vive en js/17-traps.js.
        // Este módulo mantiene la generación del nivel y delega allí la lógica
        // de generación, activación, efectos y renderizado de trampas.
        function spawnReinforcement(count = 1) {
            const currentCount = Array.isArray(gameState.enemies) ? gameState.enemies.length : 0;
            const spawnCap = typeof getDifficultyEnemySpawnCapV619 === 'function'
                ? getDifficultyEnemySpawnCapV619(gameState.level)
                : Math.min(12, 2 + Math.max(1, Math.floor(Number(gameState.level) || 1)));
            const remainingCapacity = Math.max(0, spawnCap - currentCount);
            if (remainingCapacity <= 0) return;
            count = Math.min(Math.max(0, Math.floor(Number(count) || 0)), remainingCapacity);
            if (count <= 0) return;
            const candidates = [];
            const px = Math.floor((player.x + player.width / 2) / TILE_SIZE);
            const py = Math.floor((player.y + player.height / 2) / TILE_SIZE);
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] !== TYPES.EMPTY) continue;
                    const distance = Math.abs(x - px) + Math.abs(y - py);
                    if (distance >= 6 && !gameState.enemies.some(e => Math.floor(e.x/TILE_SIZE) === x && Math.floor(e.y/TILE_SIZE) === y)) candidates.push({x,y,distance});
                }
            }
            candidates.sort((a,b) => b.distance - a.distance);
            for (let i = 0; i < Math.min(count, candidates.length); i++) {
                const c = candidates[i];
                const roll = Math.random();
                let type = ENEMY_TYPES.RASTRERO;
                if (gameState.level >= 3 && roll > .68) type = ENEMY_TYPES.ESPECIAL;
                else if (gameState.level >= 2 && roll > .38) type = ENEMY_TYPES.VOLADOR;
                const behavior = typeof pickEnemyBehaviorV324 === 'function' ? pickEnemyBehaviorV324(type, gameState.level, gameState.enemies.length + i, roll) : null;
                // v6.10.2: threatLevel se aplica una sola vez en moveEnemyV312().
                const speed = typeof getEnemyBaseSpeedV610 === 'function'
                    ? getEnemyBaseSpeedV610(type)
                    : type.speed * gameState.roomType.enemySpeedMult * (gameState.difficulty?.enemySpeedMult || 1);
                gameState.enemies.push({ x:c.x*TILE_SIZE+TILE_SIZE/2, y:c.y*TILE_SIZE+TILE_SIZE/2, width:TILE_SIZE*.75, height:TILE_SIZE*.75, type, vx:speed*(Math.random()<.5?-1:1), vy:0, baseSpeed:speed, changeTimer:15+Math.random()*35, elite:false, reinforcement:true, aiBehavior:behavior?.id || null });
                addFloatingText('REFUERZO', c.x*TILE_SIZE+TILE_SIZE/2, c.y*TILE_SIZE+TILE_SIZE/2, '#fb7185');
            }
            if (count > 0) sfx('alarm');
        }

        function updateRoomThreat(dt) {
            gameState.roomTime -= dt;
            gameState.nextReinforcement -= dt;
            if (gameState.roomType.id === 'BOSS') return;
            if (gameState.nextReinforcement <= 0) {
                gameState.threatLevel++;
                const diff = gameState.difficulty || (typeof getDifficultyV323 === 'function' ? getDifficultyV323(gameState.level) : null);
                const amount = Math.min(3, 1 + Math.floor(gameState.threatLevel / 2) + (diff?.reinforcementAmountBonus || 0));
                spawnReinforcement(amount);
                const baseInterval = Math.max(12000, 24000 - gameState.level * 500);
                gameState.nextReinforcement = typeof getDifficultyReinforcementIntervalV323 === 'function'
                    ? getDifficultyReinforcementIntervalV323(baseInterval)
                    : baseInterval;
                triggerScreenShake(3, 140);
            }
        }

