// v6.12.21 — Información de run fuera del canvas.
(function installInformationUIV61221(global){
    'use strict';

    const state = {
        entries: [],
        nextId: 1,
        runNumber: null,
        lastFeedWrite: 0
    };

    function getFeed(){
        return global.document?.getElementById('ui-info-feed') || null;
    }

    function clearInformationFeedV61221(){
        state.entries.length = 0;
        const feed = getFeed();
        if (feed) feed.innerHTML = '<div id="ui-info-feed-empty" class="info-empty">Sin novedades</div>';
    }

    function pushInformationFeedV61221(text, color = '#facc15'){
        const value = String(text ?? '').trim();
        if (!value) return;
        const run = Number(global.gameState?.runNumber || 1);
        if (state.runNumber !== run){
            state.runNumber = run;
            state.entries.length = 0;
        }
        state.entries.push({
            id: state.nextId++,
            text: value,
            color: String(color || '#facc15'),
            lifeMs: 2800
        });
        if (state.entries.length > 6) state.entries.splice(0, state.entries.length - 6);
        renderFeed();
    }

    function renderFeed(){
        const feed = getFeed();
        if (!feed) return;
        if (!state.entries.length){
            feed.innerHTML = '<div id="ui-info-feed-empty" class="info-empty">Sin novedades</div>';
            return;
        }
        feed.innerHTML = state.entries.slice().reverse().map(entry =>
            `<div class="info-feed-row" data-info-id="${entry.id}" style="--info-color:${entry.color}"><span></span><strong>${escapeHtml(entry.text)}</strong></div>`
        ).join('');
    }

    function escapeHtml(value){
        return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }

    function updateInformationFeedV61221(dt){
        const delta = Number(dt);
        if (!Number.isFinite(delta) || delta <= 0) return;
        for (const entry of state.entries) entry.lifeMs -= delta;
        const before = state.entries.length;
        state.entries = state.entries.filter(entry => entry.lifeMs > 0);
        if (before !== state.entries.length) renderFeed();
    }

    global.pushInformationFeedV61221 = pushInformationFeedV61221;
    global.updateInformationFeedV61221 = updateInformationFeedV61221;
    global.clearInformationFeedV61221 = clearInformationFeedV61221;
})(window);
