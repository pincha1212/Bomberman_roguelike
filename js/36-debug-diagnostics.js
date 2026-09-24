// Bomberman Roguelike v4.5.3 — Real Diagnostic Debug Core
// P0/P1 diagnóstico: predicción separada de verificación, invariantes independientes,
// inspector espacial, input, timestep, trace de colisión y freeze sobre corrupción.
(() => {
    'use strict';
    const D = window.DEBUG_MODE;
    if (!D?.enabled) return;
    if (window.DEBUG_DIAGNOSTICS) return;

    const TYPES = window.TYPES || globalThis.TYPES;
    const TILE = Number(window.TILE_SIZE || globalThis.TILE_SIZE || 48);
    const MAX_INPUT_TRACE = 40;
    const MAX_COLLISION_TRACE = 40;

    const diagnostics = {
        frame: 0,
        rawDt: 0,
        dt: 0,
        clamped: false,
        invariantChecks: [],
        hardFailures: [],
        designWarnings: [],
        invariantFrozen: false,
        freezeFrame: 0,
        freezeReason: '',
        lastFrameBefore: null,
        lastFrameCurrent: null,
        lastFailure: null,
        selectedCell: null,
        selectedCellDump: null,
        selectedCellDiff: null,
        collisionTrace: [],
        inputTrace: [],
        lastInput: null,
        lastDesignWarningSignature: ''
    };

    const state = () => window.BOMBER_ENGINE?.getState?.() || null;
    const player = () => window.BOMBER_ENGINE?.getPlayer?.() || null;
    const finite = n => Number.isFinite(Number(n));
    const entityTile = (e, kind='player') => {
        if (!e) return {x:-1,y:-1};
        return kind === 'enemy'
            ? {x:Math.floor(Number(e.x)/TILE), y:Math.floor(Number(e.y)/TILE)}
            : {x:Math.floor((Number(e.x)+Number(e.width||0)/2)/TILE), y:Math.floor((Number(e.y)+Number(e.height||0)/2)/TILE)};
    };
    const bounds = (e, kind='player') => {
        if (!e || !finite(e.x) || !finite(e.y) || !finite(e.width) || !finite(e.height)) return null;
        const w=Number(e.width), h=Number(e.height), x=Number(e.x), y=Number(e.y);
        return kind==='enemy' ? {left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2} : {left:x,right:x+w,top:y,bottom:y+h};
    };
    const overlapArea = (a,x,y) => {
        const l=x*TILE,r=l+TILE,t=y*TILE,b=t+TILE;
        return Math.max(0,Math.min(a.right,r)-Math.max(a.left,l))*Math.max(0,Math.min(a.bottom,b)-Math.max(a.top,t));
    };
    const directSolids = (e, kind='player', flying=false) => {
        const s=state(), rect=bounds(e,kind); if(!s||!rect||!Array.isArray(s.grid)) return [];
        const minX=Math.max(0,Math.floor(rect.left/TILE)), maxX=Math.min(s.gridWidth-1,Math.floor((rect.right-0.001)/TILE));
        const minY=Math.max(0,Math.floor(rect.top/TILE)), maxY=Math.min(s.gridHeight-1,Math.floor((rect.bottom-0.001)/TILE));
        const area=Math.max(1,(rect.right-rect.left)*(rect.bottom-rect.top)); const out=[];
        for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++){
            const type=s.grid[y]?.[x]; if(type!==TYPES.WALL && !(type===TYPES.BLOCK && !flying)) continue;
            const ratio=overlapArea(rect,x,y)/area; if(ratio>=0.15) out.push({x,y,type,overlapRatio:Number(ratio.toFixed(3))});
        }
        return out;
    };

    function cloneKeys(keys){
        const names=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyZ'];
        return Object.fromEntries(names.map(k=>[k,!!keys?.[k]]));
    }

    function inputSnapshot(){
        const s=state(), p=player();
        return {keys:cloneKeys(s?.keys), axis:p?.inputAxis||null, dir:Number(p?.inputDir||0), buffer:p?.inputBuffer?{...p.inputBuffer}:null, bufferMs:Number(p?.inputBufferTimer||0), touch:s?.touchControls?{x:Number(s.touchControls.x||0),y:Number(s.touchControls.y||0)}:null};
    }

    function frameSnapshot(){
        const s=state(), p=player(); if(!s) return null;
        return {frame:Number(s.animFrame||0), time:performance.now(), grid:Array.isArray(s.grid)?s.grid.map(r=>Array.isArray(r)?r.slice():[]):[], player:p?{x:Number(p.x),y:Number(p.y),vx:Number(p.vx||0),vy:Number(p.vy||0),tile:entityTile(p,'player'),axis:p.inputAxis||null,dir:Number(p.inputDir||0),buffer:p.inputBuffer?{...p.inputBuffer}:null,bufferMs:Number(p.inputBufferTimer||0)}:null,
            bombs:(s.bombs||[]).map((b,i)=>({i,x:Number(b.x),y:Number(b.y),timer:Number(b.timer||0),owner:b.owner||null,range:Number(b.range||0),state:b.state||null,passThrough:b.playerPassThrough!==false})),
            explosions:(s.explosions||[]).map((e,i)=>({i,x:Number(e.x),y:Number(e.y),timer:Number(e.timer||0),blastId:e.blastId??null})),
            enemies:(s.enemies||[]).map((e,i)=>({index:i,x:Number(e.x),y:Number(e.y),tile:entityTile(e,'enemy'),vx:Number(e.vx||0),vy:Number(e.vy||0),type:e?.type?.name||e?.type||e?.ai?.archetype||'ENEMY'})),
            items:(s.items||[]).map((it,i)=>({i,x:Number(it.x),y:Number(it.y),type:it.type||null,relicId:it.relicId||null}))};
    }

    function independentChecks(){
        const s=state(), p=player();
        const checks=[], hardFailures=[], designWarnings=[];
        if(!s||!s.isPlaying||!Array.isArray(s.grid)||!p) return {checks,hardFailures,designWarnings};
        const hard=(id,detail,cell=null)=>{const x={id,severity:'RED',detail,cell};checks.push(x);hardFailures.push(x)};
        const warn=(id,detail,cell=null)=>{const x={id,severity:'YELLOW',detail,cell};checks.push(x);designWarnings.push(x)};
        const widthPx=Number(s.gridWidth||0)*TILE, heightPx=Number(s.gridHeight||0)*TILE;

        if([p.x,p.y,p.vx,p.vy,p.width,p.height].some(v=>!finite(v))) hard('player-non-finite','Jugador contiene NaN/Infinity.');
        const pr=bounds(p,'player');
        if(pr&&(pr.left<-.01||pr.top<-.01||pr.right>widthPx+.01||pr.bottom>heightPx+.01)) hard('player-out-of-bounds','Jugador fuera del mapa.');
        const ps=directSolids(p,'player',false); if(ps.length) hard('player-solid-overlap',`Jugador dentro de sólido en ${ps[0].x},${ps[0].y}.`,ps[0]);

        (s.enemies||[]).forEach((e,i)=>{
            if([e.x,e.y,e.vx,e.vy,e.width,e.height].some(v=>!finite(v))) hard(`enemy-${i}-non-finite`,`E${i} contiene NaN/Infinity.`);
            const er=bounds(e,'enemy'); if(er&&(er.left<-.01||er.top<-.01||er.right>widthPx+.01||er.bottom>heightPx+.01)) hard(`enemy-${i}-out-of-bounds`,`E${i} fuera del mapa.`);
            const es=directSolids(e,'enemy',!!e?.canFly||!!e?.type?.canFly); if(es.length) hard(`enemy-${i}-solid-overlap`,`E${i} dentro de sólido en ${es[0].x},${es[0].y}.`,es[0]);
        });

        const bombCells=new Map();
        (s.bombs||[]).forEach((b,i)=>{
            const x=Number(b.x), y=Number(b.y), timer=Number(b.timer);
            if(!finite(x)||!finite(y)||!finite(timer)) hard(`bomb-${i}-non-finite`,`Bomba ${i} contiene valor inválido.`);
            if(timer < -1) hard(`bomb-${i}-negative-timer`,`Bomba ${i} tiene timer negativo (${timer}).`);
            if(x<0||y<0||x>=s.gridWidth||y>=s.gridHeight) hard(`bomb-${i}-out-of-bounds`,`Bomba ${i} fuera del mapa.`);
            else { const key=`${x},${y}`; bombCells.set(key,(bombCells.get(key)||0)+1); if(s.grid[y]?.[x]===TYPES.WALL) hard(`bomb-${i}-inside-wall`,`Bomba ${i} dentro de muro.`,{x,y,type:TYPES.WALL}); if(s.grid[y]?.[x]===TYPES.BLOCK) warn(`bomb-${i}-inside-block`,`Bomba ${i} comparte celda con bloque.`,{x,y,type:TYPES.BLOCK}); }
        });
        for(const [key,count] of bombCells) if(count>1) warn('multiple-bombs-same-cell',`${count} bombas en ${key}.`);

        (s.explosions||[]).forEach((e,i)=>{
            const x=Number(e.x),y=Number(e.y),timer=Number(e.timer);
            if(!finite(x)||!finite(y)||!finite(timer)) hard(`explosion-${i}-non-finite`,`Explosión ${i} contiene valor inválido.`);
            if(timer<-1) hard(`explosion-${i}-negative-timer`,`Explosión ${i} tiene timer negativo (${timer}).`);
            if(x<0||y<0||x>=s.gridWidth||y>=s.gridHeight) hard(`explosion-${i}-out-of-bounds`,`Explosión ${i} fuera del mapa.`);
            else if(s.grid[y]?.[x]===TYPES.WALL) hard(`explosion-${i}-through-wall`,`Explosión ${i} ocupa muro en ${x},${y}.`,{x,y,type:TYPES.WALL});
        });
        (s.items||[]).forEach((it,i)=>{
            const x=Number(it.x),y=Number(it.y); if(!finite(x)||!finite(y)) hard(`item-${i}-non-finite`,`Item ${i} tiene posición inválida.`); else if(x<0||y<0||x>=s.gridWidth||y>=s.gridHeight) hard(`item-${i}-out-of-bounds`,`Item ${i} fuera del mapa.`); else if(s.grid[y]?.[x]===TYPES.BLOCK) warn(`item-${i}-under-block`,`Item ${i} bajo un bloque.`,{x,y,type:TYPES.BLOCK});
        });
        return {checks,hardFailures,designWarnings};
    }

    function cellInspector(x,y,previous){
        const s=state(), p=player(); if(!s||x<0||y<0||x>=s.gridWidth||y>=s.gridHeight) return null;
        const tile=s.grid[y]?.[x];
        const terrain=tile===TYPES.WALL?'WALL':tile===TYPES.BLOCK?'BLOCK':tile===TYPES.EXIT_LOCKED?'EXIT_LOCKED':tile===TYPES.EXIT_OPEN?'EXIT_OPEN':'EMPTY';
        const bombs=(s.bombs||[]).map((b,i)=>({i,x:Number(b.x),y:Number(b.y),timer:Number(b.timer||0),owner:b.owner||null,range:Number(b.range||0),state:b.state||null,playerPassThrough:b.playerPassThrough!==false})).filter(b=>b.x===x&&b.y===y);
        const explosions=(s.explosions||[]).map((e,i)=>({i,x:Number(e.x),y:Number(e.y),timer:Number(e.timer||0),blastId:e.blastId??null,owner:e.owner||null})).filter(e=>e.x===x&&e.y===y);
        const enemies=(s.enemies||[]).map((e,i)=>({i,type:e?.type?.name||e?.type||e?.ai?.archetype||'ENEMY',tile:entityTile(e,'enemy'),behavior:e?.ai?.behavior||null,target:e?.ai?.target||null,path:Array.isArray(e?.ai?.route)?e.ai.route.slice(0,24):null})).filter(e=>e.tile?.x===x&&e.tile?.y===y);
        const playerTile=p?entityTile(p,'player'):null; const playerHere=!!playerTile&&playerTile.x===x&&playerTile.y===y;
        const items=(s.items||[]).map((it,i)=>({i,x:Number(it.x),y:Number(it.y),type:it.type||null,relicId:it.relicId||null})).filter(it=>it.x===x&&it.y===y);
        const predictedBy=[]; for(const [i,b] of (s.bombs||[]).entries()) { try { const cells=typeof calculateBombBlastCells==='function'?calculateBombBlastCells(b):[]; if(cells.some(c=>c.x===x&&c.y===y)) predictedBy.push({i,owner:b.owner||null,timer:Number(b.timer||0),range:Number(b.range||0)}); } catch(_){} }
        const overlaps=[]; if(playerHere&&bombs.length) overlaps.push('PLAYER_ON_BOMB'); if(playerHere&&explosions.length) overlaps.push('PLAYER_IN_FIRE'); if(enemies.length&&explosions.length) overlaps.push('ENEMY_IN_FIRE'); if(enemies.length>1) overlaps.push('MULTIPLE_ENEMIES');
        const previousTerrain=previous?.grid?.[y]?.[x]; const diff={changed:previousTerrain!==undefined&&previousTerrain!==tile,from:previousTerrain??null,to:tile};
        return {cell:{x,y},terrain:{code:tile,name:terrain},bombs,explosions,enemies,items,player:{present:playerHere,tile:playerTile},danger:{predictedBy,actual:explosions.length>0},overlaps,diff};
    }

    function buildReport(){return {frame:diagnostics.frame,timestep:{rawDt:diagnostics.rawDt,dt:diagnostics.dt,clamped:diagnostics.clamped},input:diagnostics.lastInput,invariants:{hardFailures:diagnostics.hardFailures,designWarnings:diagnostics.designWarnings},freeze:{active:diagnostics.invariantFrozen,frame:diagnostics.freezeFrame,reason:diagnostics.freezeReason},selectedCell:diagnostics.selectedCellDump,collisionTrace:diagnostics.collisionTrace.slice(-20),lastFailure:diagnostics.lastFailure?{frame:diagnostics.lastFailure.frame,reason:diagnostics.lastFailure.reason,focusCell:diagnostics.lastFailure.focusCell,capturedAt:diagnostics.lastFailure.capturedAt}:null};}

    const originalShouldUpdate=D.shouldUpdate.bind(D);
    D.shouldUpdate=function(){ if(diagnostics.invariantFrozen) return false; return originalShouldUpdate(); };
    const originalReset=D.resetScene?.bind(D);
    if(originalReset) D.resetScene=function(){ const result=originalReset(); reset(); return result; };

    function reset(){
        diagnostics.frame=0; diagnostics.rawDt=0; diagnostics.dt=0; diagnostics.clamped=false; diagnostics.invariantChecks=[]; diagnostics.hardFailures=[]; diagnostics.designWarnings=[]; diagnostics.invariantFrozen=false; diagnostics.freezeFrame=0; diagnostics.freezeReason=''; diagnostics.lastFrameBefore=null; diagnostics.lastFrameCurrent=null; diagnostics.lastFailure=null; diagnostics.selectedCell=null; diagnostics.selectedCellDump=null; diagnostics.selectedCellDiff=null; diagnostics.collisionTrace=[]; diagnostics.inputTrace=[]; diagnostics.lastInput=null; diagnostics.lastDesignWarningSignature='';
    }

    const originalRecordEvent=D.recordEvent?.bind(D);
    if(originalRecordEvent){
        D.recordEvent=function(type,message,data=null){
            const beforeLength=D.eventLog?.length||0;
            const result=originalRecordEvent(type,message,data);
            const log=D.eventLog||[];
            const item=log[log.length-1];
            if(item && (log.length>beforeLength || item.message===message)){
                item.frame=Number(state()?.animFrame||diagnostics.frame||0);
                item.debugTimeMs=performance.now();
            }
            return result;
        };
    }

    D.beginDiagnosticFrame=function(rawDt,dt,clamped){ diagnostics.frame=Number(state()?.animFrame||0)+1; diagnostics.rawDt=finite(rawDt)?Number(rawDt):0; diagnostics.dt=finite(dt)?Number(dt):0; diagnostics.clamped=!!clamped; diagnostics.collisionTrace=[]; diagnostics.lastInput=inputSnapshot(); };
    D.recordTimestep=function(rawDt,dt,clamped){ diagnostics.rawDt=finite(rawDt)?Number(rawDt):0; diagnostics.dt=finite(dt)?Number(dt):0; diagnostics.clamped=!!clamped; };
    D.recordCollisionTrace=function(trace){ if(!trace)return; diagnostics.collisionTrace.push({frame:Number(state()?.animFrame||diagnostics.frame),time:performance.now(),...trace}); if(diagnostics.collisionTrace.length>MAX_COLLISION_TRACE) diagnostics.collisionTrace.splice(0,diagnostics.collisionTrace.length-MAX_COLLISION_TRACE); };
    D.recordInputTrace=function(kind,event){ const item={frame:Number(state()?.animFrame||0),time:performance.now(),kind,code:event?.code||null,repeat:!!event?.repeat,keys:cloneKeys(state()?.keys),axis:player()?.inputAxis||null,dir:Number(player()?.inputDir||0),buffer:player()?.inputBuffer?{...player().inputBuffer}:null,bufferMs:Number(player()?.inputBufferTimer||0),touch:state()?.touchControls?{x:Number(state().touchControls.x||0),y:Number(state().touchControls.y||0)}:null}; diagnostics.lastInput=item; diagnostics.inputTrace.push(item); if(diagnostics.inputTrace.length>MAX_INPUT_TRACE) diagnostics.inputTrace.splice(0,diagnostics.inputTrace.length-MAX_INPUT_TRACE); };
    D.afterLogicalUpdate=function(dt,rawDt){
        D.recordTimestep(rawDt,dt,rawDt!==dt);
        const before=diagnostics.lastFrameCurrent, current=frameSnapshot(); diagnostics.lastFrameBefore=before; diagnostics.lastFrameCurrent=current;
        const result=independentChecks(); diagnostics.invariantChecks=result.checks; diagnostics.hardFailures=result.hardFailures; diagnostics.designWarnings=result.designWarnings;
        if(result.hardFailures.length&&!D.busy&&!diagnostics.invariantFrozen){
            diagnostics.invariantFrozen=true; diagnostics.freezeFrame=Number(state()?.animFrame||diagnostics.frame); diagnostics.freezeReason=result.hardFailures.map(x=>x.id).join(', ');
            const focus=result.hardFailures.find(x=>x.cell)||result.designWarnings.find(x=>x.cell); diagnostics.lastFailure={frame:diagnostics.freezeFrame,reason:diagnostics.freezeReason,hardFailures:result.hardFailures,designWarnings:result.designWarnings,previous:before,current,focusCell:focus?.cell||null,capturedAt:new Date().toISOString()};
            D.paused=true; if(focus?.cell) D.inspectCell?.(focus.cell.x,focus.cell.y); D.recordEvent('ERROR',`INVARIANTE ROJA · frame ${diagnostics.freezeFrame} · ${diagnostics.freezeReason}`,{failures:result.hardFailures,warnings:result.designWarnings}); return;
        }
        if(result.designWarnings.length){ const sig=result.designWarnings.map(x=>`${x.id}:${x.cell?`${x.cell.x},${x.cell.y}`:''}`).join('|'); if(sig!==diagnostics.lastDesignWarningSignature){ diagnostics.lastDesignWarningSignature=sig; D.recordEvent('WARN',`Reglas de diseño · ${result.designWarnings.length} aviso(s).`,{warnings:result.designWarnings.slice(0,8)}); } } else diagnostics.lastDesignWarningSignature='';
    };
    D.inspectCell=function(x,y){ const dump=cellInspector(Number(x),Number(y),diagnostics.lastFrameBefore); diagnostics.selectedCell=dump?.cell||null; diagnostics.selectedCellDump=dump; diagnostics.selectedCellDiff=dump?.diff||null; window.dispatchEvent(new CustomEvent('bomber-debug-updated')); return dump; };
    D.releaseInvariantFreeze=function(){ diagnostics.invariantFrozen=false; diagnostics.freezeFrame=0; diagnostics.freezeReason=''; D.paused=false; D.stepRequested=false; D.recordEvent('DEBUG','Freeze de invariante liberado.'); };
    D.buildDiagnosticReport=buildReport;
    D.copyDiagnosticReport=async function(){ try{const text=JSON.stringify(buildReport(),null,2); if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text); else {const ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();} D.lastAction='Diagnóstico copiado'; D.recordEvent('DEBUG','Diagnóstico real copiado.'); return {ok:true};}catch(error){D.captureError(error,'clipboard.diagnostic');return {ok:false,message:error?.message||'No se pudo copiar'};} };

    const originalSnapshot=D.snapshot.bind(D);
    D.snapshot=function(){ const s=originalSnapshot(); s.diagnostics=buildReport(); return s; };
    const originalBuildReport=D.buildTestReport.bind(D);
    D.buildTestReport=function(){ const base=originalBuildReport(); return `${base}\nINVARIANTES: R${diagnostics.hardFailures.length} · A${diagnostics.designWarnings.length} · freeze=${diagnostics.invariantFrozen?'SI':'NO'}\nTIMESTEP: ${diagnostics.rawDt.toFixed(2)}→${diagnostics.dt.toFixed(2)}ms${diagnostics.clamped?' · CLAMP':''}`; };

    window.addEventListener('keydown', event=>{
        if(!D.enabled) return;
        if(event.code==='F9'){ event.preventDefault(); D.releaseInvariantFreeze(); }
        else if(event.code==='F10'){ event.preventDefault(); console.log('[BOMBER DEBUG v4.5.3]',buildReport()); D.recordEvent('DEBUG','Diagnóstico volcado a consola.'); }
        D.recordInputTrace('keydown',event);
    }, true);
    window.addEventListener('keyup', event=>D.recordInputTrace('keyup',event), true);
    window.addEventListener('blur', event=>D.recordInputTrace('blur',event), true);

    window.DEBUG_DIAGNOSTICS={version:'4.5.1',diagnostics,reset,buildIndependentInvariantChecks:independentChecks,buildCellInspector:cellInspector};
    D.diagnostics=diagnostics;
    D.recordEvent('DEBUG','Debug 4.5.3 listo.');
})();
