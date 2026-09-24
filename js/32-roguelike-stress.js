/* BOMBERMAN ROGUELIKE v3.27.0 - Roguelike Stress */

function runRoguelikeStressV327() {
    const layer = window.ROGUELIKE_V327;
    if (!layer) throw new Error('ROGUELIKE_V327 no disponible.');

    const originalRandom = Math.random;
    let seed = 123456789;
    Math.random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };

    const originalState = {
        relics: layer.relics.slice(),
        offers: layer.relicOffers.slice(),
        selected: layer.selectedRelic,
        currentRoomPlan: layer.currentRoomPlan,
        pendingRoomPlan: layer.pendingRoomPlan,
        roomOffers: layer.roomOffers.slice(),
        rerollsUsed: layer.rerollsUsed
    };

    try {
        layer.relics = [];
        layer.relicOffers = [];
        layer.selectedRelic = null;
        layer.rerollsUsed = 0;
        layer.currentRoomPlan = 'standard';
        layer.pendingRoomPlan = 'standard';
        layer.roomOffers = [];

        const offersA = window.rogueV327RollRelicOffers(3, 0);
        const uniqueA = new Set(offersA.map(r => r.id)).size === offersA.length;
        const poolUniqueFromOwned = offersA.every(r => !layer.relics.includes(r.id));

        if (!uniqueA || !poolUniqueFromOwned) throw new Error('Relic offer uniqueness failed.');

        const acquiredA = window.rogueV327AcquireRelic(offersA[0]?.id);
        if (!acquiredA) throw new Error('Relic acquisition failed.');

        layer.relics = ['ember_core', 'blast_capacitor'];
        const synergies = window.rogueV327GetActiveSynergies();
        if (!synergies.some(s => s.id === 'double_burn')) throw new Error('Double Burn synergy failed.');
        const bonuses = window.rogueV327GetRelicBonuses();
        if (bonuses.range < 3) throw new Error(`Derived range synergy failed: ${bonuses.range}`);

        layer.relics = ['salvage_hook', 'bounty_seal'];
        const economyBonuses = window.rogueV327GetRelicBonuses();
        if (economyBonuses.coinMultiplier < 0.25) throw new Error('Economy synergy failed.');

        layer.relics = [];
        const baseOffers = window.rogueV327RollRelicOffers(3, 0).map(r => r.id);
        layer.relics = [];
        const qualityOffers = window.rogueV327RollRelicOffers(3, 2).map(r => r.id);
        if (!baseOffers.length || !qualityOffers.length) throw new Error('Relic offer generation failed.');

        const roomPlans = window.ROGUELIKE_ROOM_PLANS_V327.map(p => p.id);
        const roomOffers = window.rogueV327RollRoomOffers(3);
        const uniqueRoomOffers = new Set(roomOffers.map(p => p.id)).size === roomOffers.length;
        if (roomPlans.length !== 4) throw new Error('Room plan count mismatch.');
        if (roomOffers.length !== 3 || !uniqueRoomOffers || !roomOffers.some(p => p.id === 'standard')) {
            throw new Error('Room offer selection failed.');
        }
        if (!roomPlans.includes('treasure') || !roomPlans.includes('elite') || !roomPlans.includes('shrine')) {
            throw new Error('Room decision pool incomplete.');
        }

        const result = {
            status: 'PASS',
            relicOfferUnique: uniqueA,
            relicAcquisition: acquiredA,
            activeSynergies: synergies.map(s => s.id),
            derivedRangeWithSynergy: bonuses.range,
            economySynergyMultiplier: economyBonuses.coinMultiplier,
            baseOfferIds: baseOffers,
            qualityOfferIds: qualityOffers,
            roomPlans: roomPlans,
            roomOffers: roomOffers.map(p => p.id),
            maxRelics: window.ROGUELIKE_V327_CONFIG.maxRelics,
            rerollCost: window.ROGUELIKE_V327_CONFIG.rerollCost
        };

        return result;
    } finally {
        Math.random = originalRandom;
        layer.relics = originalState.relics;
        layer.relicOffers = originalState.offers;
        layer.selectedRelic = originalState.selected;
        layer.currentRoomPlan = originalState.currentRoomPlan;
        layer.pendingRoomPlan = originalState.pendingRoomPlan;
        layer.roomOffers = originalState.roomOffers;
        layer.rerollsUsed = originalState.rerollsUsed;
    }
}

if (window.DEBUG_TESTS) {
    window.DEBUG_TESTS['roguelike-stress'] = runRoguelikeStressV327;
}
window.runRoguelikeStressV327 = runRoguelikeStressV327;
