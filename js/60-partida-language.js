// Bomberman Roguelike v6.12.25 — Terminología visible: RUN -> PARTIDA
(function initPartidaLanguageV61225(global){
    'use strict';
    const REPLACEMENTS=[
        [/\bRUN-BASED ROGUELIKE\b/gi,'ROGUELIKE POR PARTIDAS'],
        [/\bROGUELIKE \/\/ RUN-BASED\b/gi,'ROGUELIKE // PARTIDAS'],
        [/\bDEEPER EVERY RUN\b/gi,'MÁS PROFUNDA CADA PARTIDA'],
        [/\bRECOMPENSA DE RUN\b/gi,'RECOMPENSA DE PARTIDA'],
        [/\bRUN TERMINADA\b/gi,'PARTIDA TERMINADA'],
        [/\bRUN FINALIZADA\b/gi,'PARTIDA FINALIZADA'],
        [/\bRUN PAUSADA\b/gi,'PARTIDA PAUSADA'],
        [/\bNUEVA RUN\b/gi,'NUEVA PARTIDA'],
        [/\bCONTINUAR RUN\b/gi,'CONTINUAR PARTIDA'],
        [/\bINICIAR RUN\b/gi,'INICIAR PARTIDA'],
        [/\bESTADO DE LA RUN\b/gi,'ESTADO DE LA PARTIDA'],
        [/\bRUNS\b/g,'PARTIDAS'],
        [/\brun\b/g,'partida'],
        [/\bRUN\b/g,'PARTIDA']
    ];
    const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
    function transformText(text){let out=text;for(const [pattern,replacement] of REPLACEMENTS)out=out.replace(pattern,replacement);return out;}
    function walk(root){
        const walker=global.document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        const nodes=[];let node;while((node=walker.nextNode()))nodes.push(node);
        for(const textNode of nodes){if(SKIP.has(textNode.parentElement?.tagName))continue;const next=transformText(textNode.nodeValue);if(next!==textNode.nodeValue)textNode.nodeValue=next;}
        root.querySelectorAll?.('[title],[aria-label]').forEach(el=>{if(el.hasAttribute('title'))el.setAttribute('title',transformText(el.getAttribute('title')));if(el.hasAttribute('aria-label'))el.setAttribute('aria-label',transformText(el.getAttribute('aria-label')));});
    }
    function init(){
        if(!global.document?.body)return;
        walk(global.document.body);
        const observer=new MutationObserver(mutations=>{for(const mutation of mutations){for(const added of mutation.addedNodes){if(added.nodeType===Node.TEXT_NODE){const next=transformText(added.nodeValue);if(next!==added.nodeValue)added.nodeValue=next;}else if(added.nodeType===Node.ELEMENT_NODE&&!SKIP.has(added.tagName)){walk(added);}}}});
        observer.observe(global.document.body,{subtree:true,childList:true});
        global.PARTIDA_LANGUAGE_V61225=true;
    }
    if(global.document?.readyState==='loading')global.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
