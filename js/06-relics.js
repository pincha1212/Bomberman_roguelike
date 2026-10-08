// Bomberman Roguelike v3.14 — Powerups & Relics 2
// Categorías de build y modificadores combinables.

const RELIC_CATEGORIES = {
    BOMB: { id: 'BOMB', label: 'BOMB', icon: '💣', color: '#fbbf24' },
    FIRE: { id: 'FIRE', label: 'FIRE', icon: '🔥', color: '#fb923c' },
    SPEED: { id: 'SPEED', label: 'SPEED', icon: '⚡', color: '#34d399' },
    DEFENSE: { id: 'DEFENSE', label: 'DEFENSE', icon: '🛡', color: '#60a5fa' },
    MOVEMENT: { id: 'MOVEMENT', label: 'MOVEMENT', icon: '🧲', color: '#22d3ee' },
    RISK: { id: 'RISK', label: 'RISK', icon: '☠', color: '#f43f5e' },
    ECONOMY: { id: 'ECONOMY', label: 'ECONOMY', icon: '¢', color: '#facc15' }
};

const RELIC_MOD_DEFAULTS = {
    bombFuseMultiplier: 1,
    turnAssistBonus: 0,
    turnSnapBonus: 0,
    inputBufferBonus: 0,
    unstablePowder: false,
    economyBonus: 0
};

function resetRelicModifiers(){
    gameState.relicMods = { ...RELIC_MOD_DEFAULTS };
}

function getRelicCategoryMeta(category){
    return RELIC_CATEGORIES[category] || RELIC_CATEGORIES.BOMB;
}

function getRelicCategoryLabel(category){
    const meta = getRelicCategoryMeta(category);
    return `${meta.icon} ${meta.label}`;
}

function getRelicCategoryColor(category){
    return getRelicCategoryMeta(category).color;
}

function getRelicMod(key, fallback=0){
    const value = gameState.relicMods?.[key];
    return typeof value === 'number' ? value : (typeof value === 'boolean' ? value : fallback);
}

function getBombFuseMultiplier(){
    return Math.max(0.5, Number(gameState.relicMods?.bombFuseMultiplier || 1));
}

function getPlayerExplosionInset(exp){
    if (exp?.owner === 'player' && gameState.relicMods?.unstablePowder) return 1;
    return 5;
}

function applyRelicCategoryMetadata(relic){
    if (!relic) return relic;
    const meta = getRelicCategoryMeta(relic.category);
    relic.categoryLabel = meta.label;
    relic.categoryIcon = meta.icon;
    relic.categoryColor = meta.color;
    return relic;
}

// Categorías para las reliquias que ya existían en la run.
const existingRelicCategories = {
    ember_core: 'FIRE',
    twin_fuse: 'BOMB',
    iron_boots: 'SPEED',
    heart_engine: 'DEFENSE',
    ward_plate: 'DEFENSE',
    lucky_charm: 'ECONOMY',
    war_trophy: 'RISK',
    merchant_seal: 'ECONOMY'
};

Object.keys(existingRelicCategories).forEach(id => {
    const relic = RELICS.find(r => r.id === id);
    if (relic) applyRelicCategoryMetadata(Object.assign(relic, { category: existingRelicCategories[id] }));
});

const RELICS_V314 = [
    {
        id: 'short_fuse', icon: '⏱', name: 'MECHA CORTA', rarity: 'UNCOMMON', category: 'BOMB',
        desc: 'Las bombas tienen una mecha 28% más corta.',
        apply: () => { gameState.relicMods.bombFuseMultiplier *= 0.72; }
    },
    {
        id: 'unstable_powder', icon: '🧨', name: 'PÓLVORA INESTABLE', rarity: 'RARE', category: 'RISK',
        desc: '+1 rango de bomba. Tus propias explosiones son menos tolerantes al roce.',
        apply: () => { gameState.relicMods.unstablePowder = true; if (typeof clampPlayerCapacitiesV67 === 'function') clampPlayerCapacitiesV67(); }
    },
    {
        id: 'magnetic_boots', icon: '🧲', name: 'BOTAS MAGNÉTICAS', rarity: 'RARE', category: 'MOVEMENT',
        desc: 'Mejora la asistencia de giro y amplía la ventana para tomar una esquina.',
        apply: () => {
            gameState.relicMods.turnAssistBonus += 4;
            gameState.relicMods.turnSnapBonus += 1.25;
            gameState.relicMods.inputBufferBonus += 75;
        }
    },
    {
        id: 'heat_lens', icon: '🔆', name: 'LENTE TÉRMICA', rarity: 'UNCOMMON', category: 'FIRE',
        desc: '+1 rango de bomba y +10% de puntuación por objetivos dañados con fuego.',
        apply: () => { gameState.fireScoreMult = (gameState.fireScoreMult || 1) + 0.10; }
    },
    {
        id: 'salvage_core', icon: '🪙', name: 'NÚCLEO DE SALVAMENTO', rarity: 'UNCOMMON', category: 'ECONOMY',
        desc: '+20% de monedas obtenidas. Se combina con otros bonos económicos.',
        apply: () => { gameState.coinBonus += 0.20; gameState.relicMods.economyBonus += 0.20; }
    },
    {
        id: 'kinetic_shell', icon: '🔷', name: 'CAPARAZÓN CINÉTICO', rarity: 'RARE', category: 'DEFENSE',
        desc: 'Tras recibir un golpe obtenés 250 ms adicionales de invulnerabilidad.',
        apply: () => { gameState.hitInvulnerabilityBonus = (gameState.hitInvulnerabilityBonus || 0) + 250; }
    }
];

RELICS_V314.forEach(relic => applyRelicCategoryMetadata(relic));
RELICS.push(...RELICS_V314);

// Categoría por defecto para cualquier reliquia futura añadida por otro módulo.
RELICS.forEach(applyRelicCategoryMetadata);

if (!gameState.relicMods) resetRelicModifiers();
