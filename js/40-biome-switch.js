// Bomberman Roguelike v6.32.1 — Cambio de bioma durante la partida
(function initBiomeSwitchV61225(global){
    'use strict';
    const runtime={ready:false};

    function getSelect(){return global.document?.getElementById?.('biome-switch-select')||null;}
    function sync(){
        const select=getSelect();
        if(!select)return;
        // El selector debe seguir disponible durante recompensas, pausa y transiciones.
        select.disabled=false;
        if(typeof gameState==='undefined')return;
        const current=gameState.biomeOverrideV49||gameState.biomeV49?.id||(typeof getBiomeForDepthV49==='function'?getBiomeForDepthV49(gameState.level)?.id:'winter');
        if(current&&select.value!==current)select.value=current;
        const status=global.document.getElementById('biome-switch-status');
        if(status)status.textContent=gameState.biomeOverrideV49?'MANUAL':'AUTOMÁTICO';
    }
    function change(id){
        if(typeof gameState==='undefined')return;
        if(typeof global.setBiomeOverrideV49==='function'){
            if(global.setBiomeOverrideV49(id,true)){
                sync();
            }
            return;
        }
        if(typeof global.BOMBER_ENGINE?.setBiomeOverride==='function'){
            if(global.BOMBER_ENGINE.setBiomeOverride(id,true))sync();
        }
    }
    function init(){
        const select=getSelect();
        if(!select)return;
        if(runtime.ready)return;
        runtime.ready=true;
        select.addEventListener('change',()=>change(select.value));
        sync();
        global.setInterval(sync,250);
    }
    if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
