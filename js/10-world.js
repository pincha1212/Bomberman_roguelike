// Bomberman Roguelike v6.27.0 — Level generation without periodic enemy reinforcements.
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
            const requestedRoomType = gameState.__roomTypeOverrideV626;
            gameState.roomType = requestedRoomType && ROOM_TYPES[requestedRoomType] ? ROOM_TYPES[requestedRoomType] : ROOM_TYPES.STANDARD;
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

            if (gameState.roomType?.id === 'BOSS') {
                if (typeof spawnBossV626 === 'function') spawnBossV626();
            } else {
                spawnEnemies();
            }
            gameState.__roomTypeOverrideV626 = null;
            updateRoguePresentation();
            updateUI();
        }

        function damageBoss(amount = 1) {
            const b = gameState.boss;
            if (!b || b.defeated || Number(b.invuln) > 0) return false;
            const maxHp = Math.max(1, Number(b.maxHp) || Number(b.maxHealth) || 1);
            const currentHp = Number.isFinite(b.hp) ? b.hp : (Number.isFinite(b.health) ? b.health : maxHp);
            const damage = Math.max(1, Number(amount) || 1);
            b.maxHp = maxHp;
            b.maxHealth = maxHp;
            b.hp = Math.max(0, currentHp - damage);
            b.health = b.hp; // mirror field used by older UI/save code
            b.invuln = 220;
            triggerBossHitFeedback(b);
            b.flash = 180;
            gameState.score += 75;
            sfx('bossHit');
            triggerScreenShake(3, 100);
            addFloatingText(`-${damage}`, b.x, b.y - b.height / 2, '#fb7185');
            if (typeof bossV41SetHUD === 'function') bossV41SetHUD(b, typeof bossV41GetPhase === 'function' ? bossV41GetPhase(b) : b.phase || 1);
            if (b.hp <= 0) defeatBoss();
            return true;
        }

        function defeatBoss() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            b.defeated = true;
            b.hp = 0;
            b.health = 0;
            b.maxHp = Math.max(1, Number(b.maxHp) || Number(b.maxHealth) || 1);
            b.maxHealth = b.maxHp;
            if (gameState.exitPos && gameState.grid?.[gameState.exitPos.y]) gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            gameState.coins += 30;
            gameState.score += 1500;
            addParticles(b.x, b.y, 'particleBoss', 55);
            addFloatingText('☠ JEFE DERROTADO', b.x, b.y - 50, '#facc15');
            addFloatingText('+30¢  +1500', b.x, b.y + 20, '#fbbf24');
            sfx('boom');
            triggerScreenShake(12, 500);
            if (typeof bossV41SetHUD === 'function') bossV41SetHUD(b, 0);
            updateUI();
        }

        function updateBoss(dt) {
            // v6.26: el Boss V4.1 es la única autoridad de actualización cuando está cargado.
            if (typeof updateBossV41 === 'function') return;
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

            // Los ataques del Boss viven únicamente en js/27-boss-system.js.
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
            ctx.globalAlpha = b.flash > 0 ? .55 : (b.invuln > 0 && Math.floor(gameState.animFrame / 3) % 2 === 0 ? .72 : 1);
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
        // v6.27: el reloj de sala continúa, pero no genera enemigos nuevos.
        // La cantidad de enemigos queda fija al entrar en la sala.
        function updateRoomTimerV627(dt) {
            const elapsed = Math.max(0, Number(dt) || 0);
            gameState.roomTime = Math.max(0, (Number(gameState.roomTime) || 0) - elapsed);
        }
