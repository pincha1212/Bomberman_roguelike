// Bomberman Roguelike v3.24 — Enemy Behavior Stress
(() => {
    'use strict';
    const ROLES = ['chaser','patroller','evasive','aggressive','flyer'];

    function makeEnemyRole(role,index) {
        const profiles = Object.values(window.ENEMY_BEHAVIORS_V324 || {});
        const profile = profiles.find(p => p.id === role);
        const type = role === 'flyer' ? ENEMY_TYPES.VOLADOR : role === 'aggressive' ? ENEMY_TYPES.ESPECIAL : ENEMY_TYPES.RASTRERO;
        return {
            x:(3 + index) * TILE_SIZE + TILE_SIZE / 2,
            y:7 * TILE_SIZE + TILE_SIZE / 2,
            width:TILE_SIZE*.75,
            height:TILE_SIZE*.75,
            type,
            vx:0,
            vy:0,
            baseSpeed:type.speed,
            lastDirection:'right',
            desiredDirection:'right',
            __gridAnchor:'center',
            aiBehavior:profile?.id || role
        };
    }

    function buildGrid() {
        const w=15,h=15;
        gameState.gridWidth=w;
        gameState.gridHeight=h;
        gameState.grid=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>(x===0||y===0||x===w-1||y===h-1)?TYPES.WALL:TYPES.EMPTY));
        // Ramal superior: comprueba navegación local sin depender de BFS.
        for(let x=4;x<11;x++) gameState.grid[5][x]=TYPES.WALL;
        // Bloque aislado: el volador puede atravesarlo, los terrestres no.
        gameState.grid[7][7]=TYPES.BLOCK;
    }

    function runOne(role,index) {
        buildGrid();
        gameState.bombs=[];gameState.explosions=[];gameState.hazards=[];gameState.enemies=[];
        player.x=13*TILE_SIZE; player.y=7*TILE_SIZE; player.vx=0; player.vy=0;
        const enemy=makeEnemyRole(role,index);
        // El volador parte detrás de un bloque para comprobar su capacidad física.
        if(role==='flyer') enemy.x=6*TILE_SIZE+TILE_SIZE/2;
        gameState.enemies.push(enemy);
        ensureEnemyMotionStateV312(enemy,index);
        enemy.ai.visionTimer=Number.MAX_SAFE_INTEGER;
        enemy.ai.decisionTimer=0;
        enemy.ai.seesPlayer=true;
        enemy.ai.memoryTimer=900;
        const beforeBfs=enemy.ai.recoveryPathCalls||0;
        let moved=0;
        let alert='';
        for(let frame=0;frame<30;frame++) {
            const bx=enemy.x,by=enemy.y;
            updateEnemyAI(100);
            moved+=Math.hypot(enemy.x-bx,enemy.y-by);
            alert=enemy.ai.alert;
        }
        const profile=enemyBehaviorProfileV324(enemy,index);
        return {
            role,
            resolved:enemy.ai.archetype,
            alert,
            moved:Number(moved.toFixed(2)),
            speedMultiplier:Number(profile.speedMultiplier || 1),
            canFly:!!enemy.type.canFly,
            bfsCalls:(enemy.ai.recoveryPathCalls||0)-beforeBfs,
            direction:enemy.ai.direction
        };
    }

    async function runBehaviorStress() {
        const t=performance.now();
        const cases=ROLES.map(runOne);
        const failures=[];
        for(const c of cases) {
            if(c.resolved!==c.role) failures.push(`${c.role}: resolved=${c.resolved}`);
            if(c.moved<20) failures.push(`${c.role}: movimiento insuficiente`);
            if(c.bfsCalls>0) failures.push(`${c.role}: BFS=${c.bfsCalls}`);
            if(c.role==='chaser' && c.alert!=='chase') failures.push('chaser: no persigue');
            if(c.role==='patroller' && c.alert!=='patrol') failures.push('patroller: abandonó patrulla a distancia');
            if(c.role==='evasive' && c.alert!=='flee') failures.push('evasive: no entra en evasión');
            if(c.role==='aggressive' && c.alert!=='aggressive') failures.push('aggressive: no entra en modo agresivo');
            if(c.role==='flyer' && !c.canFly) failures.push('flyer: perdió canFly');
        }
        const aggressive=cases.find(c=>c.role==='aggressive');
        const chaser=cases.find(c=>c.role==='chaser');
        if(aggressive && chaser && aggressive.speedMultiplier<=chaser.speedMultiplier) failures.push('aggressive: no supera velocidad base de chaser');
        const distinctAlerts=new Set(cases.map(c=>c.alert));
        if(distinctAlerts.size<3) failures.push(`estados insuficientemente diferenciados (${distinctAlerts.size})`);
        const details={cases,distinctAlerts:[...distinctAlerts],bfsCalls:cases.reduce((n,c)=>n+c.bfsCalls,0)};
        const pass=!failures.length;
        const summary=`Enemy Behavior Stress: ${pass?'5/5 roles':'fallo'} · estados=${distinctAlerts.size} · BFS=${details.bfsCalls}`;
        return {status:pass?'PASS':'FAIL',summary,details,ms:performance.now()-t,error:failures.join(' | ')||null};
    }

    function register() {
        if(!window.DEBUG_TESTS||typeof window.DEBUG_TESTS!=='object'){setTimeout(register,0);return;}
        if(window.DEBUG_TESTS['enemy-behavior-stress']) return;
        window.DEBUG_TESTS['enemy-behavior-stress']=async()=>{
            const r=await runBehaviorStress();
            if(typeof debugRecordEvent==='function')debugRecordEvent(r.status,r.summary,r.details);
            if(r.status!=='PASS')throw new Error(r.error||r.summary);
            return {summary:r.summary,details:r.details};
        };
        window.BOMBER_ENEMY_BEHAVIOR_STRESS_V324=Object.freeze({run:runBehaviorStress,roles:ROLES.slice()});
    }
    register();
})();
