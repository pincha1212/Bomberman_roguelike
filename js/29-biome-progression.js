// Bomberman Roguelike v6.12.25 — Biome Progression + in-party biome override
(function initBiomeProgressionV49(global) {
    'use strict';

    const ROOMS_PER_BIOME = 4;
    const BIOME_PROGRESSION = Object.freeze([
        Object.freeze({ id:'winter', name:'Invierno', themeId:'winter', rooms:ROOMS_PER_BIOME, accent:'#7dd3fc', verbSentence:'Aprendés a comprometerte antes de moverte.' }),
        Object.freeze({ id:'autumn', name:'Otoño', themeId:'autumn', rooms:ROOMS_PER_BIOME, accent:'#f59e0b' }),
        Object.freeze({ id:'spring', name:'Primavera', themeId:'spring', rooms:ROOMS_PER_BIOME, accent:'#86efac' }),
        Object.freeze({ id:'summer', name:'Verano', themeId:'summer', rooms:ROOMS_PER_BIOME, accent:'#fbbf24' }),
        Object.freeze({ id:'underground', name:'Bajo tierra', themeId:'underground', rooms:ROOMS_PER_BIOME, accent:'#c4b5fd' }),
        Object.freeze({ id:'clouds', name:'Nubes', themeId:'clouds', rooms:ROOMS_PER_BIOME, accent:'#dbeafe' }),
        Object.freeze({ id:'mountains', name:'Montañas', themeId:'mountains', rooms:ROOMS_PER_BIOME, accent:'#cbd5e1' }),
        Object.freeze({ id:'beach', name:'Playa', themeId:'beach', rooms:ROOMS_PER_BIOME, accent:'#67e8f9' }),
        Object.freeze({ id:'space', name:'Espacio', themeId:'space', rooms:ROOMS_PER_BIOME, accent:'#a5b4fc' }),
        Object.freeze({ id:'sky', name:'Cielo', themeId:'sky', rooms:ROOMS_PER_BIOME, accent:'#f0abfc' }),
        Object.freeze({ id:'inferno', name:'Infierno', themeId:'inferno', rooms:ROOMS_PER_BIOME, accent:'#ff7043' })
    ]);
    const TOTAL_BIOME_DEPTHS = BIOME_PROGRESSION.reduce((sum, biome) => sum + biome.rooms, 0);
    const STAGE_ROLE_IDS_V56 = Object.freeze({1:'introduction',2:'reinforcement',3:'combination',4:'exam'});
    const BIOME_STAGE_PROFILES_V51 = Object.freeze({
        winter:{1:{role:'introduction',lesson:'Explora la sala y establece una ruta segura.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.03}},2:{role:'reinforcement',lesson:'Consolida una ruta y administra tus recursos.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.01}},3:{role:'combination',lesson:'Combina bombas, movimiento y recursos disponibles.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.01}},4:{role:'exam',lesson:'Demuestra dominio del gameplay base bajo presión.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.03}}},
        space:{1:{role:'introduction',lesson:'Explora la sala y establece una ruta segura.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.03}},2:{role:'reinforcement',lesson:'Consolida una ruta y administra tus recursos.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.01}},3:{role:'combination',lesson:'Combina bombas, movimiento y recursos disponibles.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.015}},4:{role:'exam',lesson:'Demuestra dominio del gameplay base bajo presión.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.035}}},
        inferno:{1:{role:'introduction',lesson:'Explora la sala y establece una ruta segura.',mechanics:{},hazards:{},generation:{blockDensityBonus:-0.01}},2:{role:'reinforcement',lesson:'Consolida una ruta y administra tus recursos.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.01}},3:{role:'combination',lesson:'Combina bombas, movimiento y recursos disponibles.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.025}},4:{role:'exam',lesson:'Demuestra dominio del gameplay base bajo presión.',mechanics:{},hazards:{},generation:{blockDensityBonus:0.05}}}
    });

    const runtime = {installed:false, originalInitLevel:null, lastBiomeId:null, transitionTimer:0, transitionNode:null};

    function clampDepth(depth){return Math.min(Math.max(1,Math.floor(Number(depth)||1)),TOTAL_BIOME_DEPTHS);}
    function getBiomeForDepthV49(depth){
        let remaining=clampDepth(depth);
        for(const biome of BIOME_PROGRESSION){if(remaining<=biome.rooms)return biome;remaining-=biome.rooms;}
        return BIOME_PROGRESSION[BIOME_PROGRESSION.length-1];
    }
    function getBiomeStageV49(depth){
        let remaining=clampDepth(depth);
        for(const biome of BIOME_PROGRESSION){if(remaining<=biome.rooms)return remaining;remaining-=biome.rooms;}
        return ROOMS_PER_BIOME;
    }
    function getBiomeStageConfigV51(biomeOrId,stage){
        const id=typeof biomeOrId==='string'?biomeOrId:biomeOrId?.id;
        const safeStage=Math.max(1,Math.min(ROOMS_PER_BIOME,Number(stage)||1));
        return BIOME_STAGE_PROFILES_V51[id]?.[safeStage]||{role:STAGE_ROLE_IDS_V56[safeStage]||'introduction',lesson:'',mechanics:{},hazards:{},generation:{}};
    }
    function buildMetadataV49(biome,depth){
        const index=BIOME_PROGRESSION.findIndex(item=>item.id===biome.id);
        const stage=getBiomeStageV49(depth);
        const startDepth=index*ROOMS_PER_BIOME+1;
        return Object.freeze({id:biome.id,themeId:biome.themeId,nombre:biome.name,stage,rooms:ROOMS_PER_BIOME,startDepth,endDepth:startDepth+ROOMS_PER_BIOME-1,accent:biome.accent,bossEnabled:biome.bossEnabled!==false,examRoomType:biome.examRoomType||'BOSS',verbSentence:biome.verbSentence||'',stageConfig:getBiomeStageConfigV51(biome.id,stage)});
    }
    function getBiomeMetadataV49(depth){
        const overrideId=typeof gameState!=='undefined'?gameState.biomeOverrideV49:null;
        if(overrideId){
            const selected=BIOME_PROGRESSION.find(item=>item.id===overrideId);
            if(selected)return buildMetadataV49(selected,depth);
        }
        return buildMetadataV49(getBiomeForDepthV49(depth),depth);
    }
    function getBiomeMetadataForIdV49(id,depth){
        const biome=BIOME_PROGRESSION.find(item=>item.id===id);
        return biome?buildMetadataV49(biome,depth):null;
    }
    function getBiomeRunLabelV49(depth){const meta=getBiomeMetadataV49(depth);return `${meta.nombre} ${meta.stage}`;}

    function createTransitionNode(){
        if(!global.document?.body)return null;
        let node=global.document.getElementById('biome-transition');
        if(node)return node;
        node=global.document.createElement('div');node.id='biome-transition';node.className='biome-transition hidden';node.setAttribute('aria-live','polite');
        node.innerHTML='<div class="biome-transition-kicker">TRANSICIÓN DE BIOMA</div><div class="biome-transition-name"></div><div class="biome-transition-range"></div>';
        global.document.body.appendChild(node);runtime.transitionNode=node;return node;
    }
    function showBiomeTransition(meta){
        if(!runtime.lastBiomeId||runtime.lastBiomeId===meta.id)return;
        const node=createTransitionNode();if(!node)return;
        node.style.setProperty('--biome-accent',meta.accent);
        const name=node.querySelector('.biome-transition-name');const range=node.querySelector('.biome-transition-range');
        if(name)name.textContent=meta.nombre.toUpperCase();
        if(range)range.textContent=`ETAPA ${meta.stage} · PROFUNDIDADES ${meta.startDepth}–${meta.endDepth}`;
        node.classList.remove('hidden');node.classList.remove('is-visible');void node.offsetWidth;node.classList.add('is-visible');
        clearTimeout(runtime.transitionTimer);
        runtime.transitionTimer=setTimeout(()=>{node.classList.remove('is-visible');setTimeout(()=>node.classList.add('hidden'),320);},1100);
    }
    function syncBiomeUi(meta){
        const banner=global.document?.getElementById?.('run-banner');
        if(banner)banner.textContent=`PARTIDA ${String(gameState.runNumber||1).padStart(2,'0')} · ${meta.nombre.toUpperCase()} ${meta.stage} · DEPTH ${String(gameState.level).padStart(2,'0')}`;
        const select=global.document?.getElementById?.('biome-switch-select');if(select&&select.value!==meta.id)select.value=meta.id;
        const status=global.document?.getElementById?.('biome-switch-status');if(status)status.textContent=gameState?.biomeOverrideV49?'MANUAL':'AUTOMÁTICO';
    }
    function applyBiomeForDepthV49(depth,showTransition=true){
        const meta=getBiomeMetadataV49(depth);
        if(typeof global.setActiveThemeV46==='function')global.setActiveThemeV46(meta.themeId,false);
        if(typeof gameState!=='undefined')gameState.biomeV49={id:meta.id,themeId:meta.themeId,name:meta.nombre,stage:meta.stage,startDepth:meta.startDepth,endDepth:meta.endDepth,bossEnabled:meta.bossEnabled,examRoomType:meta.examRoomType,verbSentence:meta.verbSentence||'',stageConfig:getBiomeStageConfigV51(meta.id,meta.stage)};
        syncBiomeUi(meta);
        if(typeof global.registerBiomeVisitV50==='function')global.registerBiomeVisitV50(meta);
        if(typeof global.touchRunDepthV50==='function')global.touchRunDepthV50(Number(depth)||1);
        if(showTransition)showBiomeTransition(meta);
        runtime.lastBiomeId=meta.id;
        return meta;
    }
    function setBiomeOverrideV49(id,showTransition=true){
        if(typeof gameState==='undefined'||!gameState.isPlaying)return false;
        const meta=getBiomeMetadataForIdV49(id,gameState.level);
        if(!meta)return false;
        gameState.biomeOverrideV49=meta.id;
        applyBiomeForDepthV49(gameState.level,showTransition);
        return true;
    }
    function clearBiomeOverrideV49(showTransition=false){
        if(typeof gameState==='undefined')return false;
        gameState.biomeOverrideV49=null;
        applyBiomeForDepthV49(gameState.level,showTransition);
        return true;
    }
    function install(){
        if(runtime.installed)return true;
        if(typeof global.initLevel!=='function')return false;
        runtime.originalInitLevel=global.initLevel;
        global.initLevel=function initLevelV49(...args){const result=runtime.originalInitLevel(...args);const meta=applyBiomeForDepthV49(gameState.level,false);return result;};
        runtime.installed=true;
        applyBiomeForDepthV49(Number(gameState?.level)||1,false);
        return true;
    }
    function bootstrap(){if(install())return;setTimeout(bootstrap,40);}

    global.BIOME_PROGRESSION_V49=BIOME_PROGRESSION;
    global.getBiomeForDepthV49=getBiomeForDepthV49;
    global.getBiomeStageV49=getBiomeStageV49;
    global.getBiomeMetadataV49=getBiomeMetadataV49;
    global.getBiomeMetadataForIdV49=getBiomeMetadataForIdV49;
    global.getBiomeRunLabelV49=getBiomeRunLabelV49;
    global.getBiomeStageConfigV51=getBiomeStageConfigV51;
    global.setBiomeOverrideV49=setBiomeOverrideV49;
    global.clearBiomeOverrideV49=clearBiomeOverrideV49;
    global.BOMBER_ENGINE=global.BOMBER_ENGINE||{};
    global.BOMBER_ENGINE.getBiomeProgression=()=>BIOME_PROGRESSION.map(b=>({...b}));
    global.BOMBER_ENGINE.getBiomeForDepth=getBiomeForDepthV49;
    global.BOMBER_ENGINE.getBiomeMetadata=getBiomeMetadataV49;
    global.BOMBER_ENGINE.getBiomeStageConfig=getBiomeStageConfigV51;
    global.BOMBER_ENGINE.setBiomeOverride=setBiomeOverrideV49;
    global.BOMBER_ENGINE.clearBiomeOverride=clearBiomeOverrideV49;
    if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})(window);
