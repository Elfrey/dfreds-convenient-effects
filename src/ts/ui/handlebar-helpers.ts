import { id as MODULE_ID } from "@static/module.json";
import { FLAGS } from "../constants.ts";
import {
    ActiveEffectSource,
    // EffectChangeData,
} from "types/foundry/common/documents/active-effect.js";
import { Settings } from "../settings.ts";

class HandlebarHelpers {
    #settings: Settings;

    constructor() {
        this.#settings = new Settings();
    }

    register(): void {
        this.#registerIncHelper();
        this.#registerIsGmHelper();
        this.#registerCanCreateFoldersHelper();
        this.#registerHasNestedEffectsHelper();
        this.#registerConvenientIconsHelper();
    }

    #registerIncHelper() {
        Handlebars.registerHelper("inc", (value) => {
            return parseInt(value) + 1;
        });
    }

    #registerIsGmHelper() {
        Handlebars.registerHelper("isGm", () => {
            return game.user.isGM;
        });
    }

    #registerCanCreateFoldersHelper() {
        Handlebars.registerHelper("canCreateFolders", () => {
            const canCreateItems = game.user.hasPermission("ITEM_CREATE");
            const settingEnabled =
                game.user.role >= this.#settings.createFoldersPermission;

            return canCreateItems && settingEnabled;
        });
    }

    #registerHasNestedEffectsHelper() {
        Handlebars.registerHelper("hasNestedEffects", (effect) => {
            const nestedEffects =
                effect.getFlag(MODULE_ID, FLAGS.NESTED_EFFECTS) ?? [];

            return nestedEffects.length > 0;
        });
    }

    #registerConvenientIconsHelper() {
        Handlebars.registerHelper(
            "convenientIcons",
            (effect: ActiveEffect<any>) => {
                let icons = "";

                const nestedEffects = (effect.getFlag(
                    MODULE_ID,
                    FLAGS.NESTED_EFFECTS,
                ) ?? []) as PreCreate<ActiveEffectSource>[];

                // const nestedEffects: ActiveEffect<any>[] = nestedEffectData.map(
                //     (data) => {
                //         return game.dfreds.effectInterface.findEffect({
                //             effectId: data.id,
                //         });
                //     },
                // );

                const subChanges = nestedEffects.flatMap(
                    (nestedEffect) => nestedEffect.changes,
                );

                const allChanges = [...effect.changes, ...subChanges];

                icons += this.#getNestedEffectsIcon(nestedEffects);
                icons += this.#getMidiIcon(allChanges);
                icons += this.#getAtlIcon(allChanges);
                icons += this.#getTokenMagicIcon(allChanges);

                return icons;
            },
        );
    }

    #getNestedEffectsIcon(
        nestedEffects: PreCreate<ActiveEffectSource>[],
    ): string {
        return nestedEffects.length > 0
            ? "<i class='fas fa-tree integration-icon' title='Nested Effects'></i> "
            : "";
    }

    #getMidiIcon(changes: any[]): string {
        return changes.some((change) => change.key.startsWith("flags.midi-qol"))
            ? "<i class='fas fa-dice-d20 integration-icon' title='Midi-QoL Effects'></i> "
            : "";
    }

    // TODO typing here
    #getAtlIcon(changes: any[]): string {
        return changes.some((change) => change.key.startsWith("ATL"))
            ? "<i class='fas fa-lightbulb integration-icon' title='ATL Effects'></i> "
            : "";
    }

    #getTokenMagicIcon(changes: any[]): string {
        return changes.some((change) =>
            change.key.startsWith("macro.tokenMagic"),
        )
            ? "<i class='fas fa-magic integration-icon' title='Token Magic Effects'></i> "
            : "";
    }
}

export { HandlebarHelpers };
