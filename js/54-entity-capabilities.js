// Bomberman Roguelike v6.8.1 — Entity Capability Foundation
// Capacidades declarativas + power-ups permanentes y mutuamente excluyentes.
(function initEntityCapabilitiesV681(global) {
    'use strict';

    const ARCHETYPE_CAPABILITIES = Object.freeze({
        player:  Object.freeze({ kick:true,  grab:true,  carry:false, throw:false }),
        chaser:  Object.freeze({ kick:false, grab:false, carry:false, throw:false }),
        flyer:   Object.freeze({ kick:false, grab:false, carry:false, throw:false }),
        boss:    Object.freeze({ kick:true,  grab:true,  carry:true,  throw:true  }),
        echo:    Object.freeze({ kick:true,  grab:false, carry:false, throw:false }),
        generic: Object.freeze({ kick:false, grab:false, carry:false, throw:false })
    });

    const CAPABILITY_POWERUPS = Object.freeze({
        KICK: Object.freeze({
            id:'KICK', capability:'kick', label:'PATADA', icon:'→',
            category:'INTERACCION', rarity:'BASE', permanent:true,
            exclusiveGroup:'bomb-interaction',
            desc:'Capacidad permanente de empujar bombas al caminar contra ellas.'
        }),
        GRAB: Object.freeze({
            id:'GRAB', capability:'grab', label:'AGARRE', icon:'✋',
            category:'INTERACCION', rarity:'BASE', permanent:true,
            exclusiveGroup:'bomb-interaction',
            desc:'Capacidad permanente de levantar una bomba y transportarla.'
        })
    });

    function normalizeArchetype(value) {
        const id = String(value || '').toLowerCase();
        return Object.prototype.hasOwnProperty.call(ARCHETYPE_CAPABILITIES, id) ? id : 'generic';
    }

    function getState() {
        return global.BOMBER_ENGINE?.getState?.() || null;
    }

    function getPlayer() {
        return global.BOMBER_ENGINE?.getPlayer?.() || null;
    }

    function getArchetype(entity) {
        if (!entity || typeof entity !== 'object') return 'generic';
        if (entity.archetype) return normalizeArchetype(entity.archetype);

        const player = getPlayer();
        if (player && entity === player) return 'player';

        const state = getState();
        if (state?.boss && entity === state.boss) return 'boss';

        const aiArchetype = entity.ai?.archetype;
        if (aiArchetype) return normalizeArchetype(aiArchetype);

        if (Array.isArray(state?.enemies) && state.enemies.includes(entity)) return 'chaser';
        return 'generic';
    }

    function getCapabilityProfile(entity, create = true) {
        if (!entity || typeof entity !== 'object') return null;
        if (!entity.capabilityProfileV681 && create) {
            entity.capabilityProfileV681 = {
                permanent: [],
                byGroup: Object.create(null)
            };
        }
        return entity.capabilityProfileV681 || null;
    }

    function hasPermanentCapability(entity, capability) {
        const profile = getCapabilityProfile(entity, false);
        return !!profile?.permanent?.includes(String(capability));
    }

    function getCapabilityPowerupIdsV681() {
        return Object.freeze(Object.keys(CAPABILITY_POWERUPS));
    }

    function getCapabilityPowerupDefV681(powerupId) {
        return CAPABILITY_POWERUPS[String(powerupId)] || null;
    }

    // can* responde a la capacidad declarada por arquetipo (elegibilidad).
    // El estado efectivo de un power-up se consulta con isCapabilityActiveV681.
    function canUseCapability(entity, capability) {
        if (!entity || typeof entity !== 'object') return false;
        const archetype = getArchetype(entity);
        const caps = ARCHETYPE_CAPABILITIES[archetype] || ARCHETYPE_CAPABILITIES.generic;
        return caps[String(capability)] === true;
    }

    function isCapabilityActiveV681(entity, capability) {
        return canUseCapability(entity, capability) && hasPermanentCapability(entity, capability);
    }

    function canKick(entity) { return canUseCapability(entity, 'kick'); }
    function canGrab(entity) { return canUseCapability(entity, 'grab'); }
    function canCarry(entity) { return canUseCapability(entity, 'carry'); }
    function canThrow(entity) { return canUseCapability(entity, 'throw'); }
    function isKickActiveV681(entity) { return isCapabilityActiveV681(entity, 'kick'); }
    function isGrabActiveV681(entity) { return isCapabilityActiveV681(entity, 'grab'); }

    function activateCapabilityPowerupV681(entity, powerupId) {
        const def = getCapabilityPowerupDefV681(powerupId);
        if (!entity || !def) return false;

        const archetype = getArchetype(entity);
        const archetypeCaps = ARCHETYPE_CAPABILITIES[archetype] || ARCHETYPE_CAPABILITIES.generic;
        if (archetypeCaps[def.capability] !== true) return false;

        const profile = getCapabilityProfile(entity, true);
        if (profile.permanent.includes(def.capability)) return false;

        if (def.exclusiveGroup) {
            const activeGroup = profile.byGroup[def.exclusiveGroup];
            if (activeGroup && activeGroup !== def.capability) return false;
        }

        profile.permanent.push(def.capability);
        if (def.exclusiveGroup) profile.byGroup[def.exclusiveGroup] = def.capability;
        return true;
    }

    function resetEntityCapabilitiesV681(entity) {
        if (!entity || typeof entity !== 'object') return false;
        entity.capabilityProfileV681 = {
            permanent: [],
            byGroup: Object.create(null)
        };
        return true;
    }

    function getActiveCapabilityPowerupsV681(entity) {
        const profile = getCapabilityProfile(entity, false);
        if (!profile) return [];
        return profile.permanent.map(capability =>
            Object.values(CAPABILITY_POWERUPS).find(def => def.capability === capability)?.id
        ).filter(Boolean);
    }

    global.ARCHETYPE_CAPABILITIES = ARCHETYPE_CAPABILITIES;
    global.CAPABILITY_POWERUPS_V681 = CAPABILITY_POWERUPS;
    global.getArchetypeV681 = getArchetype;
    global.canKick = canKick;
    global.canGrab = canGrab;
    global.canCarry = canCarry;
    global.canThrow = canThrow;
    global.isCapabilityActiveV681 = isCapabilityActiveV681;
    global.isKickActiveV681 = isKickActiveV681;
    global.isGrabActiveV681 = isGrabActiveV681;
    global.activateCapabilityPowerupV681 = activateCapabilityPowerupV681;
    global.resetEntityCapabilitiesV681 = resetEntityCapabilitiesV681;
    global.getActiveCapabilityPowerupsV681 = getActiveCapabilityPowerupsV681;
    global.getCapabilityPowerupIdsV681 = getCapabilityPowerupIdsV681;
    global.getCapabilityPowerupDefV681 = getCapabilityPowerupDefV681;

    global.BOMBER_ENGINE = global.BOMBER_ENGINE || {};
    global.BOMBER_ENGINE.getEntityArchetype = getArchetype;
    global.BOMBER_ENGINE.canKick = canKick;
    global.BOMBER_ENGINE.canGrab = canGrab;
    global.BOMBER_ENGINE.canCarry = canCarry;
    global.BOMBER_ENGINE.canThrow = canThrow;
    global.BOMBER_ENGINE.isCapabilityActive = isCapabilityActiveV681;
    global.BOMBER_ENGINE.isKickActive = isKickActiveV681;
    global.BOMBER_ENGINE.isGrabActive = isGrabActiveV681;
    global.BOMBER_ENGINE.activateCapabilityPowerup = activateCapabilityPowerupV681;
    global.BOMBER_ENGINE.resetEntityCapabilities = resetEntityCapabilitiesV681;
    global.BOMBER_ENGINE.getCapabilityPowerupIds = getCapabilityPowerupIdsV681;
})(window);
