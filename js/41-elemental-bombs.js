// Bomberman Roguelike v6.12.9 — Bombas elementales + combos
// Vertical slice: FIRE / ICE / ELECTRIC. La bomba conserva su elemento
// al ser colocada, agarrada, lanzada o encadenada.
(function installElementalBombsV612(global) {
    'use strict';

    const ELEMENTS = Object.freeze({ NORMAL:'normal', FIRE:'fire', ICE:'ice', ELECTRIC:'electric' });
    const POWERUPS = Object.freeze({ FIRE:'BOMB_FIRE', ICE:'BOMB_ICE', ELECTRIC:'BOMB_ELECTRIC' });
    const DEFINITIONS = Object.freeze({
        [ELEMENTS.NORMAL]: Object.freeze({ id:'normal', label:'NORMAL', color:'#94a3b8', effectIds:[] }),
        [ELEMENTS.FIRE]: Object.freeze({ id:'fire', label:'FUEGO', color:'#fb923c', effectIds:['heat'] }),
        [ELEMENTS.ICE]: Object.freeze({ id:'ice', label:'HIELO', color:'#7dd3fc', effectIds:['frost'] }),
        [ELEMENTS.ELECTRIC]: Object.freeze({ id:'electric', label:'ELÉCTRICA', color:'#facc15', effectIds:['shock'] })
    });
    const POWERUP_DEFS = Object.freeze({
        [POWERUPS.FIRE]: Object.freeze({ id:POWERUPS.FIRE, name:'BOMBA FUEGO', icon:'🔥', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Cambia el elemento de las próximas bombas a FUEGO.', implemented:true }),
        [POWERUPS.ICE]: Object.freeze({ id:POWERUPS.ICE, name:'BOMBA HIELO', icon:'❄️', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Cambia el elemento de las próximas bombas a HIELO. Deja una zona que ralentiza.', implemented:true }),
        [POWERUPS.ELECTRIC]: Object.freeze({ id:POWERUPS.ELECTRIC, name:'BOMBA ELÉCTRICA', icon:'⚡', rarity:'ELEMENTAL', category:'BOMBAS', desc:'Cambia el elemento de las próximas bombas a ELÉCTRICA. Deja una zona dañina.', implemented:true })
    });

    function getPlayer(){ return global.BOMBER_ENGINE?.getPlayer?.() || global.player || null; }
    function getState(){ return global.BOMBER_ENGINE?.getState?.() || global.gameState || null; }
    function normalize(value){ const key=String(value||'').toLowerCase(); return Object.prototype.hasOwnProperty.call(DEFINITIONS,key) ? key : ELEMENTS.NORMAL; }
    function getPlayerBombElementV612(){ return normalize(getPlayer()?.bombElementV612); }
    function setPlayerBombElementV612(element){
        const p=getPlayer(); const key=normalize(element); if(!p) return false;
        p.bombElementV612=key;
        const def=DEFINITIONS[key];
        if(typeof global.addFloatingText==='function' && key!==ELEMENTS.NORMAL) global.addFloatingText(def.label,(p.x+p.width/2),(p.y+0.2),def.color);
        if(typeof global.updateUI==='function') global.updateUI(true);
        return true;
    }
    function applyElementalPowerupV612(type){
        const map={ [POWERUPS.FIRE]:ELEMENTS.FIRE, [POWERUPS.ICE]:ELEMENTS.ICE, [POWERUPS.ELECTRIC]:ELEMENTS.ELECTRIC };
        return Object.prototype.hasOwnProperty.call(map,type) ? setPlayerBombElementV612(map[type]) : false;
    }
    function getBombElementV612(bomb){ return normalize(bomb?.elementV612); }
    function getBombElementDefV612(bombOrElement){
        const key=typeof bombOrElement==='object' ? getBombElementV612(bombOrElement) : normalize(bombOrElement);
        return DEFINITIONS[key] || DEFINITIONS.normal;
    }
    function applyElementToBombV612(bomb){
        if(!bomb) return false;
        bomb.elementV612=getPlayerBombElementV612();
        const def=getBombElementDefV612(bomb);
        bomb.effectIds=def.effectIds.slice();
        return true;
    }
    function getPowerupDefinitionV612(type){ return POWERUP_DEFS[String(type||'')] || null; }
    function getPowerupIdsV612(){ return Object.freeze(Object.keys(POWERUP_DEFS)); }

    function handleExplosion(payload){
        const bomb=payload?.bomb; const cells=Array.isArray(payload?.cells)?payload.cells:[];
        if(!bomb || !cells.length) return;
        const def=getBombElementDefV612(bomb);
        if(!def.effectIds.length) return;
        if(typeof global.depositBombEffectFieldV64!=='function') return;
        for(const effectId of def.effectIds){
            for(const cell of cells){
                global.depositBombEffectFieldV64(effectId, cell.x, cell.y, {
                    durationMs: effectId==='frost' ? 2800 : effectId==='shock' ? 1800 : 2200,
                    intensity:1, source:'elemental-bomb', owner:bomb.owner||'player', sourceBombId:bomb.id
                });
            }
        }
    }

    function update(dt){ if(typeof global.bombEffectUpdateV64==='function') global.bombEffectUpdateV64(dt); }
    function draw(ctx){ if(typeof global.drawBombEffectsV64==='function') global.drawBombEffectsV64(ctx); }
    function validate(){
        const p=getPlayer(); const state=getState();
        return {
            valid:!!p && !!state && !!DEFINITIONS[getPlayerBombElementV612()],
            playerElement:getPlayerBombElementV612(),
            elements:Object.keys(DEFINITIONS),
            powerups:Object.keys(POWERUP_DEFS)
        };
    }

    if(global.gameEventBus){
        const event=global.GAME_EVENTS_V60?.BOMBA_EXPLOTO || global.GAME_EVENTS_V59?.BOMBA_EXPLOTO;
        if(event && !global.__ELEMENTAL_BOMBS_V612_LISTENER__) {
            global.gameEventBus.on(event, handleExplosion, { key:'bomb-explosion:elemental-v612' });
            global.__ELEMENTAL_BOMBS_V612_LISTENER__=true;
        }
    }

    global.ELEMENTAL_BOMBS_V612=ELEMENTS;
    global.ELEMENTAL_BOMB_POWERUPS_V612=POWERUPS;
    global.ELEMENTAL_BOMB_DEFS_V612=DEFINITIONS;
    global.ELEMENTAL_BOMB_POWERUP_DEFS_V612=POWERUP_DEFS;
    global.getPlayerBombElementV612=getPlayerBombElementV612;
    global.setPlayerBombElementV612=setPlayerBombElementV612;
    global.applyElementalPowerupV612=applyElementalPowerupV612;
    global.getBombElementV612=getBombElementV612;
    global.getBombElementDefV612=getBombElementDefV612;
    global.applyElementToBombV612=applyElementToBombV612;
    global.getPowerupDefinitionV612=getPowerupDefinitionV612;
    global.getPowerupIdsV612=getPowerupIdsV612;
    global.updateElementalBombsV612=update;
    global.drawElementalBombFieldsV612=draw;
    global.auditElementalBombsV612=validate;
})(window);
