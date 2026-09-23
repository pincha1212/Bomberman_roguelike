// Bomberman Roguelike v3.15.1 — Debug Lab
// Modo aislado de pruebas. No se carga desde index.html ni altera la jugabilidad.
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const frame = $('game-frame');
  const logNode = $('log');
  const errorsNode = $('errors');
  const errorCountNode = $('error-count');
  const testCountNode = $('test-count');
  const engineStatus = $('engine-status');
  const runtimeBadge = $('runtime-badge');
  const stateBadge = $('live-state');
  const logs = [];
  const runtimeErrors = [];
  let ready = false;
  let busy = false;

  const log = (message, type='INFO') => {
    const stamp = new Date().toLocaleTimeString('es-AR', {hour12:false});
    logs.push(`[${stamp}] ${type.padEnd(5)} ${message}`);
    if (logs.length > 260) logs.shift();
    logNode.textContent = logs.join('\n');
    logNode.scrollTop = logNode.scrollHeight;
  };

  const fail = (message) => { throw new Error(message); };
  const assert = (condition, message) => { if (!condition) fail(message); };
  const approx = (a,b,t=0.001) => Math.abs(Number(a)-Number(b)) <= t;

  function realm(){
    if (!ready) throw new Error('El motor todavía no está cargado.');
    return frame.contentWindow;
  }

  function evaluate(source){
    return realm().eval(source);
  }

  function call(name, ...args){
    const encoded = args.map(v => JSON.stringify(v)).join(',');
    return evaluate(`${name}(${encoded})`);
  }

  function json(source){
    return evaluate(`JSON.stringify(${source})`);
  }

  function installRuntimeCapture(){
    try {
      evaluate(`
        window.__debugRuntimeErrors = []; window.findDebugTrapCell = function(){ for(let y=1;y<gameState.gridHeight-1;y++){ for(let x=1;x<gameState.gridWidth-1;x++){ if(gameState.grid[y][x]===TYPES.EMPTY) return {x,y}; } } return {x:1,y:1}; };
        window.addEventListener('error', function(e){
          window.__debugRuntimeErrors.push((e.message || 'Error') + ' @ ' + (e.filename || 'unknown') + ':' + (e.lineno || 0));
        });
        window.addEventListener('unhandledrejection', function(e){
          window.__debugRuntimeErrors.push('UnhandledPromiseRejection: ' + String(e.reason || 'unknown'));
        });
      `);
    } catch (error) {
      log(`No se pudo instalar captura de errores: ${error.message}`, 'WARN');
    }
  }

  function readRuntimeErrors(){
    try {
      const value = evaluate('window.__debugRuntimeErrors || []');
      runtimeErrors.splice(0, runtimeErrors.length, ...value);
      errorsNode.textContent = runtimeErrors.length ? runtimeErrors.join('\n') : 'Sin errores.';
      errorCountNode.textContent = String(runtimeErrors.length);
    } catch (_) {}
  }

  async function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  function findCorridorCell(){
    return evaluate(`(() => {
      for(let y=1;y<gameState.gridHeight-1;y++){
        for(let x=1;x<gameState.gridWidth-2;x++){
          if(gameState.grid[y][x]===TYPES.EMPTY && gameState.grid[y][x+1]===TYPES.EMPTY && gameState.grid[y][x+2]===TYPES.EMPTY){
            return {x,y};
          }
        }
      }
      return {x:1,y:1};
    })()`);
  }

  function findEmptyCellWithFreeNeighbor(){
    return evaluate(`(() => {
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      for(let y=1;y<gameState.gridHeight-1;y++){
        for(let x=1;x<gameState.gridWidth-1;x++){
          if(gameState.grid[y][x]!==TYPES.EMPTY) continue;
          for(const [dx,dy] of dirs){
            if(gameState.grid[y+dy]?.[x+dx]===TYPES.EMPTY) return {x,y,dx,dy};
          }
        }
      }
      return {x:1,y:1,dx:1,dy:0};
    })()`);
  }

  function prepareTest(){
    evaluate(`(() => {
      if(gameState.rafId){ cancelAnimationFrame(gameState.rafId); gameState.rafId=0; }
      gameState.isPlaying=false;
      gameState.paused=false;
      resetWorldRuntimeState();
      resetPlayerRuntimeState();
      if(typeof resetRelicModifiers==='function') resetRelicModifiers();
      if(typeof resetBombHandlingState==='function') resetBombHandlingState();
      if(typeof resetCombatFeedbackForRun==='function') resetCombatFeedbackForRun();
      if(typeof RUN_LIFECYCLE!=='undefined'){ RUN_LIFECYCLE.elapsedMs=0; RUN_LIFECYCLE.lastSummary=null; }
      gameState.runNumber=1;
      initLevel();
      gameState.isPlaying=true;
      gameState.paused=false;
      gameState.lastTime=performance.now();
      updateUI(true);
      draw();
    })()`);
  }

  function isolatePlayerAt(cell){
    evaluate(`(() => {
      const c=${JSON.stringify(cell)};
      player.x=c.x*TILE_SIZE + TILE_SIZE/2 - player.width/2;
      player.y=c.y*TILE_SIZE + TILE_SIZE/2 - player.height/2;
      player.vx=0; player.vy=0; player.isMoving=false;
      gameState.keys={}; gameState.touchControls={x:0,y:0};
      resetCameraToPlayer();
    })()`);
  }

  const tests = {
    movement: async () => {
      prepareTest();
      const c = findCorridorCell();
      isolatePlayerAt(c);
      const before = JSON.parse(json('{x:player.x,y:player.y}'));
      evaluate(`gameState.keys={ArrowRight:true};`);
      for(let i=0;i<12;i++) call('updatePlayerMovement',16.6667);
      evaluate(`gameState.keys={};`);
      const after = JSON.parse(json('{x:player.x,y:player.y,vx:player.vx,vy:player.vy}'));
      assert(after.x > before.x + 1, 'El jugador no avanzó hacia la derecha.');
      assert(approx(after.vy, 0, .05), 'El movimiento cardinal generó componente Y.');
      return `OK · ${before.x.toFixed(1)} → ${after.x.toFixed(1)}`;
    },

    bombs: async () => {
      prepareTest();
      evaluate(`gameState.enemies=[]; gameState.hazards=[]; gameState.explosions=[];`);
      const c = findEmptyCellWithFreeNeighbor();
      isolatePlayerAt(c);
      const placed = call('placeBomb','debug');
      assert(placed === true, 'No se pudo colocar la bomba.');
      const count = evaluate('gameState.bombs.length');
      assert(count === 1, 'El conteo de bombas no aumentó correctamente.');
      evaluate(`gameState.bombs[0].timer=0; explodeBomb(0);`);
      const after = JSON.parse(json('{bombs:gameState.bombs.length,explosions:gameState.explosions.length,bombsPlaced:player.bombsPlaced}'));
      assert(after.bombs === 0, 'La bomba no fue removida después de detonar.');
      assert(after.explosions > 0, 'La detonación no creó explosiones.');
      assert(after.bombsPlaced === 0, 'bombsPlaced no volvió a cero.');
      return `OK · explosiones=${after.explosions}`;
    },

    damage: async () => {
      prepareTest();
      evaluate(`player.health=3; player.isInvincible=false; player.invincibleTimer=0; player.lastDamageFrame=-1; gameState.animFrame=1;`);
      assert(call('takeDamage','enemy',player.x,player.y) === true, 'El primer daño no fue aplicado.');
      const first = JSON.parse(json('{hp:player.health,inv:player.isInvincible,timer:player.invincibleTimer}'));
      assert(first.hp === 2, 'El daño inicial no restó exactamente 1 HP.');
      assert(call('takeDamage','trap',player.x,player.y) === false, 'Se aplicó daño doble durante la inmunidad.');
      call('updatePlayerInvulnerability',1600);
      evaluate(`gameState.animFrame=2;`);
      assert(call('takeDamage','trap',player.x,player.y) === true, 'No volvió a recibir daño tras terminar la inmunidad.');
      const second = evaluate('player.health');
      assert(second === 1, 'El segundo daño no restó 1 HP.');
      return `OK · HP ${first.hp} → ${second}`;
    },

    traps: async () => {
      prepareTest();
      const c = findEmptyCellWithFreeNeighbor();
      isolatePlayerAt(c);
      const result = JSON.parse(json(`(() => {
        const types = Object.values(TRAP_TYPES);
        const out=[];
        for(const type of types){
          const h={x:${c.x},y:${c.y},id:'debug-'+type,type,triggered:false,visible:false,telegraphTimer:0,flashTimer:0,effectTimer:0,delayTimer:0,effectConsumed:false,detonated:false,phase:0};
          const a=triggerHazard(h,'player');
          const b=triggerHazard(h,'player');
          out.push({type,first:a,second:b,triggered:h.triggered,effectConsumed:h.effectConsumed});
          if(type===TRAP_TYPES.DELAYED && !h.detonated){ h.delayTimer=1; gameState.hazards=[h]; updateHazards(5); out[out.length-1].detonated=h.detonated; }
        }
        return out;
      })()`));
      for(const r of result){
        assert(r.first === true, `La trampa ${r.type} no se activó.`);
        assert(r.second === false, `La trampa ${r.type} se volvió a activar.`);
        assert(r.triggered === true && r.effectConsumed === true, `Estado inválido en ${r.type}.`);
      }
      return `OK · ${result.length} tipos · activación única`;
    },

    enemies: async () => {
      prepareTest();
      evaluate(`gameState.bombs=[]; gameState.explosions=[]; gameState.hazards=[]; gameState.enemies=[];`);
      const c = findCorridorCell();
      evaluate(`(() => {
        const x=${c.x}, y=${c.y};
        player.x=x*TILE_SIZE + TILE_SIZE/2 - player.width/2;
        player.y=y*TILE_SIZE + TILE_SIZE/2 - player.height/2;
        const e={x:(x+2)*TILE_SIZE+TILE_SIZE/2,y:y*TILE_SIZE+TILE_SIZE/2,width:TILE_SIZE*.75,height:TILE_SIZE*.75,type:ENEMY_TYPES.RASTRERO,vx:-1.4,vy:0,baseSpeed:1.4,lastDirection:'left',desiredDirection:'left',__gridAnchor:'center'};
        gameState.enemies=[e];
        ensureEnemyMotionStateV312(e,0);
      })()`);
      for(let i=0;i<20;i++) call('updateEnemyAI',100);
      const state = JSON.parse(json(`({x:gameState.enemies[0].x,alert:gameState.enemies[0].ai?.alert,behavior:gameState.enemies[0].ai?.behavior})`));
      assert(state.alert === 'chase' || state.behavior === 'chase', 'El enemigo no entró en comportamiento de persecución.');
      return `OK · alert=${state.alert} · x=${state.x.toFixed(1)}`;
    },

    camera: async () => {
      prepareTest();
      const c = findCorridorCell();
      isolatePlayerAt(c);
      call('resetCameraToPlayer');
      const before = JSON.parse(json('{x:gameState.camera.x,y:gameState.camera.y}'));
      const moved = evaluate(`(() => { player.x=Math.max(0,(gameState.gridWidth-3)*TILE_SIZE-player.width); player.y=Math.max(0,(gameState.gridHeight-3)*TILE_SIZE-player.height); updateCamera(16.6667); return {x:player.x,y:player.y}; })()`);
      for(let i=0;i<12;i++) call('updateCamera',16.6667);
      const after = JSON.parse(json('{x:gameState.camera.x,y:gameState.camera.y,targetX:gameState.camera.targetX,targetY:gameState.camera.targetY}'));
      const bounds = JSON.parse(json('getCameraBounds()'));
      assert(after.x >= 0 && after.x <= bounds.maxX + .01, 'Cámara fuera de límites X.');
      assert(after.y >= 0 && after.y <= bounds.maxY + .01, 'Cámara fuera de límites Y.');
      assert(after.x !== before.x || after.y !== before.y, 'La cámara no siguió al jugador.');
      return `OK · (${before.x.toFixed(0)},${before.y.toFixed(0)}) → (${after.x.toFixed(0)},${after.y.toFixed(0)})`;
    },

    restart: async () => {
      prepareTest();
      evaluate(`(() => {
        player.health=1; player.vx=4; player.vy=2; player.maxBombs=3; player.bombsPlaced=2;
        gameState.bombs=[{x:2,y:2}]; gameState.explosions=[{x:2,y:2,timer:300}]; gameState.enemies=[{x:100,y:100}];
        gameState.hazards=[{x:3,y:3,triggered:true}]; gameState.bossProjectiles=[{x:1,y:1}]; gameState.particles=[{x:1,y:1}];
        gameState.shakeTimer=100; gameState.shakeIntensity=9;
      })()`);
      const beforeRefs = JSON.parse(json(`({enemy:gameState.enemies[0] ? {x:gameState.enemies[0].x,y:gameState.enemies[0].y} : null,hazard:gameState.hazards[0] ? {id:gameState.hazards[0].id} : null})`));
      call('finishRun','debug');
      call('beginNewRun');
      call('initLevel');
      const state = JSON.parse(json(`({hp:player.health,maxBombs:player.maxBombs,bombsPlaced:player.bombsPlaced,bombs:gameState.bombs.length,explosions:gameState.explosions.length,enemies:gameState.enemies.length,hazards:gameState.hazards.length,projectiles:gameState.bossProjectiles.length,vx:player.vx,vy:player.vy,shake:gameState.shakeTimer,lastSummary:RUN_LIFECYCLE.lastSummary,enemy:gameState.enemies[0] ? {x:gameState.enemies[0].x,y:gameState.enemies[0].y} : null,hazard:gameState.hazards[0] ? {id:gameState.hazards[0].id} : null})`));
      assert(state.hp === 3, 'La vida no se restableció.');
      assert(state.bombsPlaced === 0, 'bombsPlaced quedó contaminado.');
      assert(state.vx === 0 && state.vy === 0, 'La velocidad del jugador no se restableció.');
      assert(state.bombs === 0 && state.explosions === 0, 'Persistieron bombas/explosiones.');
      assert(state.projectiles === 0 && state.shake === 0, 'Persistieron proyectiles o shake.');
      assert(state.lastSummary === null, 'La nueva run conservó el resumen anterior.');
      assert(beforeRefs.enemy === null || !state.enemy || beforeRefs.enemy.x !== state.enemy.x || beforeRefs.enemy.y !== state.enemy.y, 'Se reutilizó inesperadamente el estado de enemigos anterior.');
      assert(beforeRefs.hazard === null || !state.hazard || beforeRefs.hazard.id !== state.hazard.id, 'Se reutilizó inesperadamente la primera trampa anterior.');
      return 'OK · estado limpio después de reinicio';
    }
  };

  async function runTest(name){
    if (busy) return;
    busy = true;
    try {
      log(`TEST ${name.toUpperCase()}`, 'TEST');
      const result = await tests[name]();
      log(result, 'PASS');
      updateTestCount();
    } catch (error) {
      log(`${name}: ${error.message}`, 'FAIL');
      console.error(error);
    } finally {
      busy = false;
      refreshTelemetry();
    }
  }

  async function runAll(){
    if (busy) return;
    busy = true;
    let passed = 0;
    try {
      const names = Object.keys(tests);
      log('INICIO DE SUITE v3.15.1', 'TEST');
      for(const name of names){
        try {
          const result = await tests[name]();
          passed++;
          log(result, 'PASS');
        } catch(error){
          log(`${name}: ${error.message}`, 'FAIL');
        }
        refreshTelemetry();
        await wait(60);
      }
      log(`SUITE FINALIZADA · ${passed}/${names.length} pruebas`, passed === names.length ? 'PASS' : 'WARN');
      updateTestCount();
    } finally {
      busy = false;
      refreshTelemetry();
    }
  }

  function updateTestCount(){
    const pass = logs.filter(line => line.includes('PASS  OK')).length;
    testCountNode.textContent = `${Math.min(pass,7)}/7`;
  }

  function refreshTelemetry(){
    if(!ready) return;
    try {
      const state = JSON.parse(json(`({playing:gameState.isPlaying,paused:gameState.paused,px:player.x,py:player.y,hp:player.health,bombs:gameState.bombs.length,placed:player.bombsPlaced,enemies:gameState.enemies.length,traps:gameState.hazards?.length||0,explosions:gameState.explosions.length,cx:gameState.camera.x,cy:gameState.camera.y,run:gameState.runNumber,depth:gameState.level})`));
      $('m-playing').textContent = state.playing ? (state.paused ? 'PAUSED' : 'PLAYING') : 'STOP';
      $('m-player').textContent = `${state.px.toFixed(0)}, ${state.py.toFixed(0)}`;
      $('m-hp').textContent = `${state.hp}`;
      $('m-bombs').textContent = `${state.bombs}/${state.placed}`;
      $('m-enemies').textContent = `${state.enemies}`;
      $('m-traps').textContent = `${state.traps}`;
      $('m-explosions').textContent = `${state.explosions}`;
      $('m-camera').textContent = `${state.cx.toFixed(0)}, ${state.cy.toFixed(0)}`;
      $('m-run').textContent = `${state.run}`;
      $('m-depth').textContent = `${state.depth}`;
      stateBadge.textContent = state.playing ? 'ACTIVO' : 'DETENIDO';
      runtimeBadge.textContent = runtimeErrors.length ? `${runtimeErrors.length} ERROR(ES)` : 'SIN ERRORES';
      readRuntimeErrors();
    } catch(error){
      runtimeBadge.textContent = 'ERROR DE LECTURA';
    }
  }

  function loadEngine(){
    ready = false;
    engineStatus.textContent = 'CARGANDO…';
    runtimeBadge.textContent = 'CARGANDO';
    frame.src = 'index.html?debug=1';
  }

  frame.addEventListener('load', () => {
    ready = true;
    installRuntimeCapture();
    engineStatus.textContent = 'MOTOR CARGADO';
    runtimeBadge.textContent = 'SIN ERRORES';
    log('Motor del juego cargado en iframe aislado.', 'PASS');
    refreshTelemetry();
  });

  document.querySelectorAll('[data-test]').forEach(button => {
    button.addEventListener('click', () => runTest(button.dataset.test));
  });
  $('btn-load').addEventListener('click', loadEngine);
  $('btn-run-all').addEventListener('click', runAll);
  $('btn-clear-log').addEventListener('click', () => { logs.length=0; logNode.textContent=''; });

  $('btn-start-real').addEventListener('click', () => {
    try { evaluate("document.getElementById('btn-start')?.click()"); log('Run real iniciada.', 'INFO'); }
    catch(error){ log(`No se pudo iniciar la run real: ${error.message}`, 'FAIL'); }
  });
  $('btn-stop-real').addEventListener('click', () => {
    try { evaluate("if(gameState.rafId){cancelAnimationFrame(gameState.rafId);gameState.rafId=0;} gameState.isPlaying=false; gameState.paused=false;"); log('Run real detenida.', 'INFO'); }
    catch(error){ log(`No se pudo detener la run: ${error.message}`, 'FAIL'); }
  });

  $('manual-bomb').addEventListener('click', () => { try { const v=call('placeBomb','debug-manual'); log(v?'Bomba colocada.':'Bomba rechazada.',v?'PASS':'WARN'); } catch(e){log(e.message,'FAIL');} });
  $('manual-hit').addEventListener('click', () => { try { const v=call('takeDamage','enemy',0,0); log(v?'Daño aplicado.':'Daño bloqueado por inmunidad.',v?'PASS':'INFO'); } catch(e){log(e.message,'FAIL');} });
  $('manual-trap').addEventListener('click', () => { try { evaluate(`(() => { const c=findDebugTrapCell(); const h={x:c.x,y:c.y,type:TRAP_TYPES.SPIKE,triggered:false,visible:false,telegraphTimer:0,flashTimer:0,effectTimer:0,delayTimer:0,effectConsumed:false,detonated:false,phase:0}; gameState.hazards=[h]; triggerHazard(h,'player'); })()`); log('Trampa de prueba activada.','PASS'); } catch(e){log(e.message,'FAIL');} });
  $('manual-enemy').addEventListener('click', () => { try { call('spawnEnemies'); log(`Enemigos en escena: ${evaluate('gameState.enemies.length')}.`,'PASS'); } catch(e){log(e.message,'FAIL');} });
  $('manual-camera').addEventListener('click', () => { try { call('updateCamera',16.6667); log('Cámara actualizada.','PASS'); } catch(e){log(e.message,'FAIL');} });
  $('manual-restart').addEventListener('click', () => { try { call('beginNewRun'); call('initLevel'); log('Nueva escena inicializada.','PASS'); } catch(e){log(e.message,'FAIL');} });

  loadEngine();
  setInterval(() => { if(ready) refreshTelemetry(); }, 300);
})();
