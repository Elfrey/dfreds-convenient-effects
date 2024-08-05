import { id as MODULE_ID } from "@static/module.json";
import { ConvenientEffectsApp } from "./app/convenient-effects-app.ts";
import { FLAGS } from "./constants.ts";
import {
    ActiveEffectSource,
    EffectChangeData,
} from "types/foundry/common/documents/active-effect.js";
import { ItemFlags, ItemSource } from "types/foundry/common/documents/item.js";
import { Settings } from "./settings.ts";
import { log } from "./logger.ts";

interface ICreateItemAddOns {
    item: PreCreate<ItemSource>;
}

// TODO method for hiding/showing individual effects/folder from players using IS_VIEWABLE
interface ICreateEffectAddOns {
    effect: PreCreate<ActiveEffectSource>;
    isTemporary?: boolean; // TODO determines if we add our own status
    isDynamic?: boolean;
    atlChanges?: DeepPartial<EffectChangeData>[];
    tokenMagicChanges?: DeepPartial<EffectChangeData>[];
    nestedEffects?: PreCreate<ActiveEffectSource>[];
    subEffects?: PreCreate<ActiveEffectSource>[];
    otherEffects?: PreCreate<ActiveEffectSource>[];
}

function createConvenientItem({
    item,
}: ICreateItemAddOns): PreCreate<ItemSource> {
    const itemFlags = item.flags ?? {};
    const ceFlags: DeepPartial<ItemFlags> = {};

    ceFlags[MODULE_ID] = {};
    ceFlags[MODULE_ID]![FLAGS.IS_CONVENIENT] = true; // TODO use to filter from item directory
    ceFlags[MODULE_ID]![FLAGS.IS_VIEWABLE] = true;

    item.flags = foundry.utils.mergeObject(ceFlags, itemFlags);
    item.img =
        item.img ?? "modules/dfreds-convenient-effects/images/magic-palm.svg";

    return item;
}

function createConvenientEffect({
    effect,
    isTemporary = true,
    isDynamic = false,
    atlChanges = [],
    tokenMagicChanges = [],
    nestedEffects = [],
    subEffects = [],
    otherEffects = [],
}: ICreateEffectAddOns): PreCreate<ActiveEffectSource> {
    const effectFlags = effect.flags ?? {};
    const ceFlags: DeepPartial<DocumentFlags> = {};

    ceFlags[MODULE_ID] = {};

    ceFlags[MODULE_ID]![FLAGS.IS_CONVENIENT] = true;
    ceFlags[MODULE_ID]![FLAGS.IS_VIEWABLE] = true;

    ceFlags[MODULE_ID]![FLAGS.IS_DYNAMIC] = isDynamic;
    ceFlags[MODULE_ID]![FLAGS.NESTED_EFFECTS] = nestedEffects;
    ceFlags[MODULE_ID]![FLAGS.SUB_EFFECTS] = subEffects;
    ceFlags[MODULE_ID]![FLAGS.OTHER_EFFECTS] = otherEffects;

    effect.flags = foundry.utils.mergeObject(ceFlags, effectFlags);

    if (isTemporary) {
        log("isTemp"); // TODO remove or do something for making passive effects
    }

    const settings = new Settings();
    if (settings.integrateWithAte) {
        effect.changes?.push(...atlChanges);
    }

    if (settings.integrateWithTokenMagic) {
        effect.changes?.push(...tokenMagicChanges);
    }

    return effect;
}

/**
 * Gets the actor object by the actor UUID
 *
 * @param uuid The actor UUID
 * @returns the actor that was found via the UUID or undefined if not found
 */
function findActorByUuid(
    uuid: string,
): Actor<TokenDocument<any> | null> | undefined {
    const actorToken = fromUuidSync(uuid);

    if (!actorToken) return undefined;

    if (actorToken instanceof TokenDocument) {
        return actorToken.actor ?? undefined;
    } else if (actorToken instanceof Actor) {
        return actorToken;
    }

    return undefined;
}

function findEffectFolderItems(): Item<null>[] {
    return game.items
        .filter((item) => {
            const isConvenient = isItemConvenient(item);
            return isConvenient;
        })
        .sort((itemA, itemB) => {
            const nameA = itemA.name.toUpperCase(); // ignore upper and lowercase
            const nameB = itemB.name.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            // names must be equal
            return 0;
        });
}

function findEffectsForItem(itemId: string): ActiveEffect<Item<null>>[] {
    const item = game.items.get(itemId);

    if (!item) return [];

    return (
        item.effects
            .map((effect) => effect as ActiveEffect<Item<null>>)
            // TODO rethink below - maybe based on permissions?
            // .filter(
            //     (effect) => effect.getFlag(MODULE_ID, FLAGS.IS_VIEWABLE) ?? true,
            // )
            .sort((effectA, effectB) => {
                const nameA = effectA.name.toUpperCase(); // ignore upper and lowercase
                const nameB = effectB.name.toUpperCase(); // ignore upper and lowercase
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }

                // names must be equal
                return 0;
            })
    );
}

/**
 * Gets all UUIDs for selected or targeted tokens
 *
 * @param isPrioritizeTargets If true, will grab actor UUIDs by target instead of by controlled
 * @returns list of actor UUIDs for selected or targeted tokens
 */
function getActorUuids(isPrioritizeTargets: boolean): ActorUUID[] {
    if (isPrioritizeTargets && game.user.targets.size !== 0) {
        // Start with targets if prioritized
        return Array.from(game.user.targets).map(
            (target) => target.actor!.uuid,
        );
    } else if (canvas.tokens.controlled.length !== 0) {
        // Use controlled tokens if targets aren't prioritized
        return canvas.tokens.controlled.map((token) => token.actor!.uuid);
    } else if (game.user.targets.size !== 0) {
        // Use targets if not prioritized and no controlled tokens
        return Array.from(game.user.targets).map((token) => token.actor!.uuid);
    } else if (game.user.character) {
        // Use the default character for the user
        return [game.user.character.uuid];
    } else {
        return [];
    }
}

function getBaseType(): string {
    const types = Object.keys(CONFIG.Item.typeLabels);
    return types[0] ?? "";
}

/**
 * Checks if the effect is flagged as convenient
 *
 * @param activeEffect - The effect to check
 * @returns true if it is convenient, false otherwise
 */
function isEffectConvenient(activeEffect: ActiveEffect<any>): boolean {
    return (
        (activeEffect.getFlag(MODULE_ID, FLAGS.IS_CONVENIENT) as boolean) ??
        false
    );
}

function isItemConvenient(item: Item<any>): boolean {
    return (item.getFlag(MODULE_ID, FLAGS.IS_CONVENIENT) as boolean) ?? false;
}

/**
 * Re-renders the Convenient Effects application if it's open
 */
function renderConvenientEffectsAppIfOpen(): void {
    const openApps = Object.values(ui.windows);
    const ceApp = openApps.find((app) => app instanceof ConvenientEffectsApp);

    if (ceApp) {
        ceApp.render();
    }
}

export {
    createConvenientItem,
    createConvenientEffect,
    findActorByUuid,
    findEffectFolderItems,
    findEffectsForItem,
    getActorUuids,
    getBaseType,
    isEffectConvenient,
    isItemConvenient,
    renderConvenientEffectsAppIfOpen,
};
