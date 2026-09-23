// Bomberman Roguelike v3.6 — Canvas rendering and sprite drawing
        function draw() {
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            
            // Screen Shake Effect
            let shakeX = 0, shakeY = 0;
            if (gameState.shakeTimer > 0) {
                shakeX = (Math.random() - 0.5) * gameState.shakeIntensity;
                shakeY = (Math.random() - 0.5) * gameState.shakeIntensity;
            }

            // Apply Camera Translation
            ctx.translate(-Math.floor(gameState.camera.x) + shakeX, -Math.floor(gameState.camera.y) + shakeY);

            // Draw Dungeon Floor Grid
            for (let y = 0; y < gameState.gridHeight; y++) {
                for (let x = 0; x < gameState.gridWidth; x++) {
                    if (!gameState.grid[y]) continue;
                    let px = x * TILE_SIZE, py = y * TILE_SIZE;
                    let isAlt = (x + y) % 2 === 0;
                    
                    // Suelo cuadriculado detallado
                    ctx.fillStyle = isAlt ? '#0f172a' : '#1e293b';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.fillRect(px, py, TILE_SIZE, 2);
                    ctx.fillRect(px, py, 2, TILE_SIZE);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
                    ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);

                    let tile = gameState.grid[y][x];
                    if (tile === TYPES.WALL) {
                        drawSteelWall(px, py);
                    } else if (tile === TYPES.BLOCK) {
                        drawBrickBlock(px, py);
                    } else if (tile === TYPES.EXIT_OPEN) {
                        drawExitPortal(px, py);
                    }
                }
            }

            // V3.3: las trampas aparecen visualmente solo después de activarse.
            drawHazards();

            // Draw Items / Powerups
            gameState.items.forEach(it => {
                drawPowerupSprite(it.x * TILE_SIZE, it.y * TILE_SIZE, it.type);
            });

            // Draw Bombs
            gameState.bombs.forEach(b => {
                renderBombRangePreview(b);
                drawBombSprite((b.x + 0.5) * TILE_SIZE, (b.y + 0.5) * TILE_SIZE, b);
            });
            drawBombChainLinks();

            // Draw Explosions
            gameState.explosions.forEach(exp => {
                drawExplosionSprite(exp.x * TILE_SIZE, exp.y * TILE_SIZE);
            });

            // Draw Enemies
            gameState.enemies.forEach(e => {
                drawEnemySprite(e);
            });
            if (typeof drawEnemyAISignals === 'function') drawEnemyAISignals();

            // Draw Boss
            drawBoss();

            // Draw Player Bomberman
            if (!player.isInvincible || Math.floor(gameState.animFrame / 4) % 2 === 0) {
                drawBombermanSprite(player.x, player.y);
            }

            // Draw Particles
            gameState.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });

            // Draw Floater Texts
            gameState.floaters.forEach(f => {
                ctx.font = '10px "Press Start 2P"';
                ctx.fillStyle = f.color;
                ctx.globalAlpha = Math.max(0, f.opacity);
                ctx.fillText(f.text, f.x, f.y);
                ctx.globalAlpha = 1.0;
            });

            ctx.restore();

            drawAmbientDust();
            drawLighting();
            renderCombatFeedback();
        }

        function drawSteelWall(x, y) {
            // Pilar 3D Reforzado
            ctx.fillStyle = '#475569'; // Top Base
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#94a3b8'; // Top Highlight
            ctx.fillRect(x, y, TILE_SIZE, 3);
            ctx.fillRect(x, y, 3, TILE_SIZE);
            ctx.fillStyle = '#334155'; // Sombra inferior/derecha
            ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
            ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
            
            // Bisel interior
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
            
            // Remaches
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 10, y + 10, 2, 2);
            ctx.fillRect(x + TILE_SIZE - 12, y + TILE_SIZE - 12, 2, 2);
        }

        function drawBrickBlock(x, y) {
            // Cajas de madera (Crates) destructibles
            ctx.fillStyle = '#b45309'; // Marrón base
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            
            // Bordes de madera
            ctx.fillStyle = '#f59e0b'; // Borde claro
            ctx.fillRect(x, y, TILE_SIZE, 3);
            ctx.fillRect(x, y, 3, TILE_SIZE);
            ctx.fillStyle = '#78350f'; // Borde oscuro
            ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
            ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);

            // Patrón de cruz
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 6);
            ctx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
            ctx.moveTo(x + TILE_SIZE - 6, y + 6);
            ctx.lineTo(x + 6, y + TILE_SIZE - 6);
            ctx.stroke();
            
            // Refuerzo central
            ctx.fillStyle = '#451a03';
            ctx.fillRect(x + TILE_SIZE/2 - 4, y + TILE_SIZE/2 - 4, 8, 8);
        }

        function drawExitPortal(x, y) {
            let pulse = Math.sin(gameState.animFrame * 0.1) * 3;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE*0.35 + pulse, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText('🚪', x + 10, y + 32);
        }

        function drawBombermanSprite(x, y) {
            ctx.save();
            let bounce = Math.sin(player.walkCycle * 4) * (player.isMoving ? 3 : 1);
            const recoil = getPlayerRenderRecoil();
            let px = x + recoil.x, py = y + bounce + recoil.y;

            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(px + player.width/2, y + player.height, player.width/2.2, 5, 0, 0, Math.PI*2);
            ctx.fill();

            // Burbuja de Escudo
            if (player.hasShield) {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(px + player.width/2, py + player.height/2, player.width*0.8, 0, Math.PI*2);
                ctx.stroke();
            }

            // Traje (Azul)
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(px + 6, py + 12, player.width - 12, player.height - 16);
            
            // Cinturón
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px + 6, py + 22, player.width - 12, 4);
            // Hebilla
            ctx.fillStyle = '#facc15';
            if (player.dir === 'down') {
                ctx.fillRect(px + player.width/2 - 4, py + 21, 8, 6);
            } else if (player.dir === 'left') {
                ctx.fillRect(px + 4, py + 21, 4, 6);
            } else if (player.dir === 'right') {
                ctx.fillRect(px + player.width - 8, py + 21, 4, 6);
            }

            // Casco (Blanco)
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(px + player.width/2, py + 10, 14, 0, Math.PI*2);
            ctx.fill();

            // Rostro Direccional
            if (player.dir === 'down') {
                ctx.fillStyle = '#ffedd5';
                ctx.fillRect(px + player.width/2 - 9, py + 4, 18, 11);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px + player.width/2 - 5, py + 7, 3, 6);
                ctx.fillRect(px + player.width/2 + 2, py + 7, 3, 6);
            } else if (player.dir === 'left') {
                ctx.fillStyle = '#ffedd5';
                ctx.fillRect(px + player.width/2 - 12, py + 4, 14, 11);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px + player.width/2 - 7, py + 7, 3, 6);
            } else if (player.dir === 'right') {
                ctx.fillStyle = '#ffedd5';
                ctx.fillRect(px + player.width/2 - 2, py + 4, 14, 11);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(px + player.width/2 + 4, py + 7, 3, 6);
            }

            // Antena
            ctx.fillStyle = '#94a3b8'; 
            ctx.fillRect(px + player.width/2 - 2, py - 6, 4, 4);
            ctx.fillStyle = '#ec4899'; 
            ctx.beginPath();
            ctx.arc(px + player.width/2, py - 8, 5, 0, Math.PI*2);
            ctx.fill();

            // Guantes
            ctx.fillStyle = '#ec4899';
            if (player.dir !== 'right') { 
                ctx.beginPath(); ctx.arc(px + 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }
            if (player.dir !== 'left') { 
                ctx.beginPath(); ctx.arc(px + player.width - 2, py + 18, 5, 0, Math.PI*2); ctx.fill();
            }

            // Pies (Zapatos Rojos) animando
            ctx.fillStyle = '#dc2626';
            let leftFootY = py + player.height - 4 + (player.isMoving && Math.floor(player.walkCycle*4)%2===0 ? -4 : 0);
            let rightFootY = py + player.height - 4 + (player.isMoving && Math.floor(player.walkCycle*4)%2===1 ? -4 : 0);
            
            if (player.dir === 'right') {
                ctx.beginPath(); ctx.ellipse(px + player.width/2 - 2, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + player.width/2 + 6, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else if (player.dir === 'left') {
                ctx.beginPath(); ctx.ellipse(px + player.width/2 - 6, leftFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + player.width/2 + 2, rightFootY, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.ellipse(px + 8, leftFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(px + player.width - 8, rightFootY, 5, 4, 0, 0, Math.PI*2); ctx.fill();
            }

            ctx.restore();
        }

        function drawEnemySprite(e) {
            ctx.save();
            if (e.elite) {
                ctx.strokeStyle = gameState.roomType.color;
                ctx.globalAlpha = 0.45 + Math.sin(gameState.animFrame * 0.15) * 0.1;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(e.x, e.y, TILE_SIZE * 0.48, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            let floaty = e.type.canFly ? Math.sin((gameState.animFrame + e.x) * 0.1) * 4 : Math.sin((gameState.animFrame + e.x) * 0.3) * 2;
            
            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(e.x, e.y + e.height/2, e.width/2, 4, 0, 0, Math.PI*2);
            ctx.fill();

            // Cuerpo
            ctx.fillStyle = e.type.color;
            ctx.beginPath();
            if (e.type.canFly) {
                // Cola de fantasma
                ctx.arc(e.x, e.y + floaty, e.width/2, Math.PI, 0);
                ctx.lineTo(e.x + e.width/2, e.y + e.height/2 + floaty);
                ctx.lineTo(e.x + e.width/4, e.y + e.height/4 + floaty);
                ctx.lineTo(e.x, e.y + e.height/2 + floaty);
                ctx.lineTo(e.x - e.width/4, e.y + e.height/4 + floaty);
                ctx.lineTo(e.x - e.width/2, e.y + e.height/2 + floaty);
                ctx.fill();
            } else {
                ctx.arc(e.x, e.y + floaty, e.width/2, 0, Math.PI*2);
                ctx.fill();
            }

            // Ojos mirando a la dirección de movimiento
            let eyeOffsetX = e.vx > 0 ? 3 : (e.vx < 0 ? -3 : 0);
            
            ctx.fillStyle = '#ffffff'; 
            ctx.beginPath();
            ctx.arc(e.x - 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.arc(e.x + 4 + eyeOffsetX, e.y - 2 + floaty, 4, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = '#000000'; 
            ctx.beginPath();
            ctx.arc(e.x - 3 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.arc(e.x + 5 + eyeOffsetX, e.y - 2 + floaty, 2, 0, Math.PI*2);
            ctx.fill();

            // Cejas enojadas para los Rastreros (Rojos)
            if (e.type.name === 'Rastrero') {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(e.x - 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x - 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.moveTo(e.x + 8 + eyeOffsetX, e.y - 6 + floaty);
                ctx.lineTo(e.x + 2 + eyeOffsetX, e.y - 4 + floaty);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawBombSprite(cx, cy, b) {
            let scale = 1.0 + Math.sin(gameState.animFrame * 0.2) * 0.08;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);

            // La bomba del jugador usa un aro cian de identidad; la mecha sigue en ámbar/rojo.
            if ((b.owner || 'player') === 'player') {
                ctx.strokeStyle = 'rgba(34,211,238,.78)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, TILE_SIZE * .42, 0, Math.PI * 2);
                ctx.stroke();
            }
            renderBombFuseFeedback(0, 0, b);

            // Sombra bomba
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(0, TILE_SIZE*0.3, TILE_SIZE*0.3, 4, 0, 0, Math.PI*2); ctx.fill();

            // Cuerpo brillante
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, TILE_SIZE*0.35, 0, Math.PI*2);
            ctx.fill();
            
            // Reflejo
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(-6, -6, TILE_SIZE*0.1, 0, Math.PI*2);
            ctx.fill();

            // Tapa y mecha
            ctx.fillStyle = '#64748b';
            ctx.fillRect(-4, -TILE_SIZE*0.38, 8, 6);

            let sparkColor = gameState.animFrame % 4 < 2 ? '#facc15' : '#ef4444';
            ctx.fillStyle = sparkColor;
            ctx.beginPath();
            ctx.arc(0, -TILE_SIZE*0.45, 5 + (b.timer < 650 ? Math.sin(gameState.animFrame*.8)*2 : 0), 0, Math.PI*2);
            ctx.fill();
            if(b.timer < 650){
                ctx.strokeStyle='#fee2e2';
                ctx.lineWidth=2;
                ctx.beginPath();
                ctx.moveTo(0,-TILE_SIZE*.47);
                ctx.lineTo(Math.cos(gameState.animFrame)*7,-TILE_SIZE*.58+Math.sin(gameState.animFrame)*5);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawExplosionSprite(x, y) {
            let size = TILE_SIZE;
            let pulse = Math.sin(gameState.animFrame * 0.5) * 4;
            
            ctx.fillStyle = 'rgba(220, 38, 38, 0.8)'; // Fuego exterior
            ctx.fillRect(x + 2 - pulse/2, y + 2 - pulse/2, size - 4 + pulse, size - 4 + pulse);
            
            ctx.fillStyle = '#f97316'; // Fuego medio
            ctx.fillRect(x + 6 - pulse/2, y + 6 - pulse/2, size - 12 + pulse, size - 12 + pulse);
            
            ctx.fillStyle = '#fef08a'; // Núcleo
            ctx.fillRect(x + 12 - pulse/2, y + 12 - pulse/2, size - 24 + pulse, size - 24 + pulse);
        }

        function drawPowerupSprite(x, y, type) {
            let floaty = Math.sin((gameState.animFrame + x) * 0.1) * 3;
            if (type === 'RELIC') {
                ctx.fillStyle = '#3b1d6b';
                ctx.fillRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 6, y + 6 + floaty, TILE_SIZE - 12, TILE_SIZE - 12);
                const relic = RELICS.find(r => gameState.items.find(it => it.x * TILE_SIZE === x && it.y * TILE_SIZE === y && it.relicId === r.id)?.id === r.id);
                ctx.font = '14px "Press Start 2P"';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(relic?.icon || '✦', x + 11, y + 31 + floaty);
                return;
            }
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);
            ctx.strokeStyle = '#38bdf8';
            ctx.strokeRect(x + 8, y + 8 + floaty, TILE_SIZE - 16, TILE_SIZE - 16);

            ctx.font = '14px "Press Start 2P"';
            let icon = '💣';
            if (type === POWERUPS.FIRE_UP) icon = '🔥';
            if (type === POWERUPS.SPEED_UP) icon = '👟';
            if (type === POWERUPS.HEALTH_UP) icon = '❤️';
            if (type === POWERUPS.SHIELD_UP) icon = '🛡️';
            ctx.fillText(icon, x + 10, y + 30 + floaty);
        }


