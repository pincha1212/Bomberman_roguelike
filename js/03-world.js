// Bomberman Roguelike v3.6 — Level generation, boss, threats, traps and reinforcement systems
        function initLevel() {
            // Expand map grid size with higher levels
            gameState.roomType = getRoomForDepth(gameState.level);
            if (typeof applyDifficultyV323 === 'function') applyDifficultyV323();
            gameState.gridWidth = 15 + Math.floor((gameState.level - 1) / 2) * 2;
            gameState.gridHeight = 15 + Math.floor((gameState.level - 1) / 2) * 2;
            gameState.gridWidth = Math.min(gameState.gridWidth, 25);
            gameState.gridHeight = Math.min(gameState.gridHeight, 25);

            gameState.grid = Array(gameState.gridHeight).fill().map(() => Array(gameState.gridWidth).fill(TYPES.EMPTY));
            gameState.gridRevision = (gameState.gridRevision || 0) + 1;
            if (typeof invalidateRenderCacheV317 === 'function') invalidateRenderCacheV317();
            gameState.bombs = [];
            // V3.8: una nueva sala/run empieza sin bombas ocupando el cupo del jugador.
            // initLevel() limpia el array de bombas, por lo que el contador debe sincronizarse también.
            player.bombsPlaced = 0;
            gameState.explosions = [];
            gameState.enemies = [];
            gameState.items = [];
            gameState.particles = [];
            gameState.floaters = [];
            gameState.hazards = [];
            gameState.boss = null;
            gameState.bossProjectiles = [];
            gameState.blastSerial = 0;
            gameState.roomTime = typeof getDifficultyRoomTimeV323 === 'function'
                ? getDifficultyRoomTimeV323(Math.max(35000, 80000 - gameState.level * 1500))
                : Math.max(35000, 80000 - gameState.level * 1500);
            gameState.threatLevel = 0;
            const firstReinforcementBase = Math.max(10000, gameState.roomTime - 18000);
            gameState.nextReinforcement = typeof getDifficultyReinforcementIntervalV323 === 'function'
                ? getDifficultyReinforcementIntervalV323(firstReinforcementBase)
                : firstReinforcementBase;

            // Spawn player top-left corner
            player.x = TILE_SIZE + (TILE_SIZE - player.width)/2;
            player.y = TILE_SIZE + (TILE_SIZE - player.height)/2;
            if (typeof resetCameraToPlayer === 'function') resetCameraToPlayer();

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

            // Destructible soft blocks
            const blockDensity = Math.max(0.25, Math.min(0.72, 0.35 + (gameState.level * 0.03) + gameState.roomType.blockBonus + (gameState.difficulty?.blockDensityBonus || 0)));
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.EMPTY) {
                        // Safe spawn zone around player
                        if ((x <= 2 && y <= 2) || (x === 1 && y === 3) || (x === 3 && y === 1)) {
                            continue;
                        }
                        if (Math.random() < blockDensity) {
                            gameState.grid[y][x] = TYPES.BLOCK;
                        }
                    }
                }
            }

            // V3.13: segunda pasada de generación. Primero creamos el mapa procedural
            // base y después tallamos salas/corredores con intención espacial.
            applyRoomDesignV313();

            // V3.13: el layout diseñado elige una puerta de salida dentro de la sala final.
            let blocks = [];
            for (let y = 1; y < gameState.gridHeight - 1; y++) {
                for (let x = 1; x < gameState.gridWidth - 1; x++) {
                    if (gameState.grid[y][x] === TYPES.BLOCK) blocks.push({x, y});
                }
            }
            
            const designedExit = gameState.roomDesign?.exitGate;
            if (designedExit && designedExit.x > 0 && designedExit.x < gameState.gridWidth - 1 && designedExit.y > 0 && designedExit.y < gameState.gridHeight - 1) {
                gameState.exitPos = { x: designedExit.x, y: designedExit.y };
                if (gameState.grid[designedExit.y][designedExit.x] === TYPES.WALL) gameState.grid[designedExit.y][designedExit.x] = TYPES.EMPTY;
                gameState.grid[designedExit.y][designedExit.x] = TYPES.BLOCK;
            } else if (blocks.length > 0) {
                let exitBlock = blocks[Math.floor(Math.random() * blocks.length)];
                gameState.exitPos = {x: exitBlock.x, y: exitBlock.y};
            } else {
                gameState.exitPos = {x: gameState.gridWidth - 2, y: gameState.gridHeight - 2};
                gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_OPEN;
            }

            if (gameState.roomType.id === 'BOSS') {
                setupBossArena();
            }

            if (gameState.roomType.id === 'SHRINE') {
                player.health = Math.min(player.health + 1, player.maxHealth);
                player.hasShield = true;
                addFloatingText('SANTUARIO: +1 VIDA + ESCUDO', player.x, player.y, '#67e8f9');
            }

            generateHazards();
            placeRoomDesignItemsV313();
            spawnEnemies();
            showRoomIntro();
            updateRoguePresentation();
            updateUI();
        }

        function setupBossArena() {
            // El jefe necesita espacio real: despejamos una arena central sin tocar las paredes estructurales.
            const cx = Math.floor(gameState.gridWidth / 2);
            const cy = Math.floor(gameState.gridHeight / 2);
            for (let y = cy - 3; y <= cy + 3; y++) {
                for (let x = cx - 3; x <= cx + 3; x++) {
                    if (x > 0 && x < gameState.gridWidth - 1 && y > 0 && y < gameState.gridHeight - 1) {
                        if (!(x % 2 === 0 && y % 2 === 0)) gameState.grid[y][x] = TYPES.EMPTY;
                    }
                }
            }
            const designedExit = gameState.roomDesign?.exitGate || { x: gameState.gridWidth - 2, y: gameState.gridHeight - 2 };
            gameState.exitPos = { x: designedExit.x, y: designedExit.y };
            if (gameState.grid[gameState.exitPos.y][gameState.exitPos.x] === TYPES.WALL) gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EMPTY;
            gameState.grid[gameState.exitPos.y][gameState.exitPos.x] = TYPES.EXIT_LOCKED;
            gameState.enemies = [];
            const maxHp = 28 + gameState.level * 3;
            gameState.boss = {
                x: cx * TILE_SIZE + TILE_SIZE / 2,
                y: cy * TILE_SIZE + TILE_SIZE / 2,
                width: TILE_SIZE * 2.35,
                height: TILE_SIZE * 2.35,
                hp: maxHp,
                maxHp,
                phase: 1,
                vx: 1.05,
                vy: 0,
                moveTimer: 0,
                attackTimer: 1500,
                summonTimer: 6200,
                waveTimer: 3200,
                chargeTimer: 5200,
                chargeTime: 0,
                charging: false,
                chargeVx: 0,
                chargeVy: 0,
                invuln: 0,
                flash: 0,
                roarTimer: 0,
                defeated: false,
                lastBlastHitId: -1
            };
            sfx('bossRoar');
            triggerScreenShake(8, 350);
            addFloatingText('☠ COLOSO DE LA PROFUNDIDAD', gameState.boss.x, gameState.boss.y - 72, '#f43f5e');
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
            addParticles(b.x, b.y, '#f43f5e', 55);
            addFloatingText('☠ JEFE DERROTADO', b.x, b.y - 50, '#facc15');
            addFloatingText('+30¢  +1500', b.x, b.y + 20, '#fbbf24');
            sfx('boom');
            triggerScreenShake(12, 500);
            updateUI();
        }

        function bossShoot() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            const dx = player.x + player.width / 2 - b.x;
            const dy = player.y + player.height / 2 - b.y;
            const len = Math.hypot(dx, dy) || 1;
            const speed = 2.8 + b.phase * 0.35;
            if(gameState.bossProjectiles.length < largeSupport.maxBossProjectiles) gameState.bossProjectiles.push({x:b.x, y:b.y, vx:dx/len*speed, vy:dy/len*speed, life:4200, radius:9, kind:'orb'});
            if (b.phase >= 2) {
                const spread = 0.16;
                for (const angle of [-spread, spread]) {
                    const c=Math.cos(angle), q=Math.sin(angle);
                    if(gameState.bossProjectiles.length < largeSupport.maxBossProjectiles) gameState.bossProjectiles.push({x:b.x, y:b.y, vx:(dx/len*c-dy/len*q)*speed*.92, vy:(dx/len*q+dy/len*c)*speed*.92, life:3900, radius:7, kind:'orb'});
                }
            }
            sfx('alarm');
        }

        function bossShockwave() {
            const b=gameState.boss;
            if(!b || b.defeated) return;
            const count=b.phase>=3?16:(b.phase>=2?12:10);
            const speed=2.0+b.phase*.35;
            for(let i=0;i<count;i++){
                const a=(Math.PI*2/count)*i;
                if(gameState.bossProjectiles.length < largeSupport.maxBossProjectiles) gameState.bossProjectiles.push({x:b.x,y:b.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:3000,radius:8,kind:'wave'});
            }
            addFloatingText('¡OLA DE CHOQUE!', b.x, b.y-b.height*.55, '#c084fc');
            triggerScreenShake(5,220);
            sfx('bossWave');
        }

        function bossStartCharge() {
            const b=gameState.boss;
            if(!b || b.defeated || b.charging) return;
            const dx=player.x+player.width/2-b.x, dy=player.y+player.height/2-b.y;
            const len=Math.hypot(dx,dy)||1;
            b.charging=true; b.chargeTime=950; b.chargeVx=dx/len*(3.2+b.phase*.55); b.chargeVy=dy/len*(3.2+b.phase*.55);
            sfx('bossCharge'); addFloatingText('¡CARGA!', b.x, b.y-b.height*.55, '#fb7185');
        }

        function bossSummon() {
            const b = gameState.boss;
            if (!b || b.defeated) return;
            const candidates=[];
            const bx=Math.floor(b.x/TILE_SIZE), by=Math.floor(b.y/TILE_SIZE);
            for(let y=1;y<gameState.gridHeight-1;y++) for(let x=1;x<gameState.gridWidth-1;x++) {
                if(gameState.grid[y][x]!==TYPES.EMPTY) continue;
                const d=Math.abs(x-bx)+Math.abs(y-by);
                if(d>=4 && d<10 && !gameState.enemies.some(e=>Math.floor(e.x/TILE_SIZE)===x && Math.floor(e.y/TILE_SIZE)===y)) candidates.push({x,y,d});
            }
            candidates.sort((a,z)=>z.d-a.d);
            const count=Math.min(2,candidates.length, Math.max(0,Math.min(largeSupport.maxEnemies, gameState.difficulty?.maxEnemies || largeSupport.maxEnemies)-gameState.enemies.length));
            for(let i=0;i<count;i++) {
                const c=candidates[i], type=i%2===0?ENEMY_TYPES.RASTRERO:ENEMY_TYPES.VOLADOR;
                const sp=type.speed*gameState.roomType.enemySpeedMult*(1+gameState.threatLevel*.04)*1.15;
                gameState.enemies.push({x:c.x*TILE_SIZE+TILE_SIZE/2,y:c.y*TILE_SIZE+TILE_SIZE/2,width:TILE_SIZE*.75,height:TILE_SIZE*.75,type,vx:sp,vy:0,baseSpeed:sp,changeTimer:25,elite:true,reinforcement:true});
            }
            if(count) addFloatingText('¡REFUERZOS DEL JEFE!', b.x, b.y-55, '#c084fc');
        }

        function updateBoss(dt) {
            const b=gameState.boss;
            if(!b || b.defeated) return;
            b.invuln=Math.max(0,b.invuln-dt); b.flash=Math.max(0,b.flash-dt); b.roarTimer=Math.max(0,b.roarTimer-dt);
            b.attackTimer-=dt; b.summonTimer-=dt; b.waveTimer-=dt; b.chargeTimer-=dt; b.moveTimer-=dt;
            const ratio=b.hp/b.maxHp;
            b.phase=ratio<=.33?3:(ratio<=.66?2:1);
            const scale=Math.min(getCombatMotionDt(dt)/16.6667,2);

            if(b.charging){
                b.chargeTime-=dt;
                const nx=b.x+b.chargeVx*scale, ny=b.y+b.chargeVy*scale;
                if(!rectCollidesSolid(nx-b.width/2,ny-b.height/2,b.width,b.height)) { b.x=nx;b.y=ny; }
                else { b.charging=false;b.chargeTimer=Math.max(1800,4200-b.phase*500);bossShockwave(); }
                if(b.chargeTime<=0){b.charging=false;b.chargeTimer=Math.max(1800,4200-b.phase*500);}
            } else {
                if(b.moveTimer<=0){
                    b.moveTimer=760-Math.min(260,b.phase*80);
                    const dx=player.x+player.width/2-b.x, dy=player.y+player.height/2-b.y;
                    if(Math.abs(dx)>Math.abs(dy)){b.vx=Math.sign(dx)*(0.8+b.phase*.3);b.vy=0;} else {b.vx=0;b.vy=Math.sign(dy)*(0.8+b.phase*.3);}
                }
                const nx=b.x+b.vx*scale, ny=b.y+b.vy*scale;
                if(!rectCollidesSolid(nx-b.width/2,ny-b.height/2,b.width,b.height)){b.x=nx;b.y=ny;} else {b.vx*=-1;b.vy*=-1;}
            }

            if(b.attackTimer<=0){ bossShoot(); b.attackTimer=Math.max(700,1700-b.phase*260); }
            if(b.waveTimer<=0){ bossShockwave(); b.waveTimer=Math.max(2300,4300-b.phase*650); }
            if(b.summonTimer<=0){ bossSummon(); b.summonTimer=Math.max(3000,6500-b.phase*850); }
            if(b.chargeTimer<=0 && b.phase>=2){ bossStartCharge(); }
            if(b.phase===3 && b.roarTimer<=0){ sfx('bossRoar');b.roarTimer=7200;triggerScreenShake(4,180); }

            const hit={left:b.x-b.width*.38,right:b.x+b.width*.38,top:b.y-b.height*.38,bottom:b.y+b.height*.38};
            const ph={left:player.x+5,right:player.x+player.width-5,top:player.y+5,bottom:player.y+player.height-5};
            if(checkOverlap(hit,ph)) takeDamage('boss-contact', b.x, b.y);
            for(let i=gameState.bossProjectiles.length-1;i>=0;i--){
                const p=gameState.bossProjectiles[i]; p.x+=p.vx*scale;p.y+=p.vy*scale;p.life-=dt;
                const gx=Math.floor(p.x/TILE_SIZE),gy=Math.floor(p.y/TILE_SIZE);
                if(isSolid(gx,gy)){gameState.bossProjectiles.splice(i,1);continue;}
                const pr={left:p.x-p.radius,right:p.x+p.radius,top:p.y-p.radius,bottom:p.y+p.radius};
                if(checkOverlap(ph,pr)){takeDamage(p.kind==='wave' ? 'boss-projectile' : 'boss-projectile', p.x, p.y);gameState.bossProjectiles.splice(i,1);continue;}
                if(p.life<=0) gameState.bossProjectiles.splice(i,1);
            }
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
            ctx.fillStyle=rage?'#581c1c':'#312e81';
            ctx.strokeStyle=rage?'#fb7185':'#a78bfa';ctx.lineWidth=5;
            ctx.beginPath();ctx.roundRect(-b.width*.43,-b.height*.42,b.width*.86,b.height*.84,18);ctx.fill();ctx.stroke();
            // Shoulder armor
            ctx.fillStyle=rage?'#991b1b':'#4c1d95';
            ctx.beginPath();ctx.arc(-b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.arc(b.width*.40,-b.height*.12,b.width*.22,0,Math.PI*2);ctx.fill();
            // Face plate
            ctx.fillStyle='#111827';ctx.fillRect(-b.width*.25,-b.height*.19,b.width*.50,b.height*.30);
            ctx.fillStyle=rage?'#fda4af':'#e9d5ff';ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;
            ctx.fillRect(-b.width*.16,-b.height*.10,b.width*.10,7);ctx.fillRect(b.width*.06,-b.height*.10,b.width*.10,7);ctx.shadowBlur=0;
            // Crown / horns
            ctx.fillStyle='#facc15';ctx.beginPath();ctx.moveTo(-b.width*.28,-b.height*.38);ctx.lineTo(-b.width*.17,-b.height*.62);ctx.lineTo(-b.width*.04,-b.height*.38);ctx.lineTo(b.width*.08,-b.height*.62);ctx.lineTo(b.width*.25,-b.height*.38);ctx.closePath();ctx.fill();
            // Core
            ctx.fillStyle=rage?'#ef4444':'#c084fc';ctx.shadowBlur=18;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(0,b.height*.15,b.width*.10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            // Phase markers
            ctx.fillStyle='#fef08a';for(let i=0;i<b.phase;i++){ctx.beginPath();ctx.arc(-10+(i-1)*10,b.height*.34,3,0,Math.PI*2);ctx.fill();}
            if(b.charging){ctx.strokeStyle='#fef08a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,b.width*.58,0,Math.PI*2);ctx.stroke();}
            ctx.restore();
            gameState.bossProjectiles.forEach(p=>{
                ctx.fillStyle=p.kind==='wave'?'#f0abfc':'#c084fc';
                if(!perf.lowQuality){ctx.shadowBlur=p.kind==='wave'?16:12;ctx.shadowColor=ctx.fillStyle;} else {ctx.shadowBlur=0;}
                ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
            });
        }

        // V3.12.3: el sistema de trampas/hazards vive en js/14-traps.js.
        // Este módulo mantiene la generación del nivel y delega allí la lógica
        // de generación, activación, efectos y renderizado de trampas.
        function spawnReinforcement(count = 1) {
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
                const difficultySpeed = gameState.difficulty?.enemySpeedMult || 1;
                const speed = type.speed * gameState.roomType.enemySpeedMult * difficultySpeed * (1 + gameState.threatLevel * .04);
                gameState.enemies.push({ x:c.x*TILE_SIZE+TILE_SIZE/2, y:c.y*TILE_SIZE+TILE_SIZE/2, width:TILE_SIZE*.75, height:TILE_SIZE*.75, type, vx:speed*(Math.random()<.5?-1:1), vy:0, baseSpeed:speed, changeTimer:15+Math.random()*35, elite:false, reinforcement:true });
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

