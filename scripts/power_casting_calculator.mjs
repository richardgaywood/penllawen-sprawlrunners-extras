import {log, logError} from "./logger.mjs";
import { CONSTANTS } from "./init.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/* demo code to run from console
game.actors.get('G2UjlJYUEkrhZQvs')
game.actors.get('G2UjlJYUEkrhZQvs').items.get('5m94HcSDL631l68O');
game.modules.get("penllawen-sprawlrunners-extras").tools.runPowerCastingCalculator(game.actors.get('G2UjlJYUEkrhZQvs'), game.actors.get('G2UjlJYUEkrhZQvs').items.get('5m94HcSDL631l68O'));
 */

/*
example from honeybadger

https://discord.com/channels/170995199584108546/722559135371231352/1264250982469074944

  _latchLayer(evt, html, data) {
    evt.preventDefault();
    this.sliceDB.updateSource({state: {groups: null, variants: null}});
    this.#latchChoice('layers', data, {force: false, parts: ['groups', 'variants']});
  }

  #latchChoice(listName, data, options) {
    let choice = Number(data.object[listName]);
    if (isNaN(choice)) choice = null;
    this.sliceDB.updateSource({[`state.${listName}`]: choice})
    this.render(options);
  }
 */

export class PowerCastingCalculator {
    /**
     * @param {SwadeActor} actor
     * @param {SwadeItem} power
     */
    constructor(actor, power) {
        this.actor = actor;
        this.power = power;

        // TODO: data sanitisation
        // make sure it's a power
        // make sure actor has additionalStats
        // make sure actor has powers?
        // make sure power belongs to actor?

        this.basePP = this.power.system.pp;
        this.powerLimit = this.actor.system.additionalStats.arcanePowerLimit.value;
        this.modLimit = this.actor.system.additionalStats.arcaneModLimit.value;
    }

    show() {
        new PowerCastingCalculatorApp(this).render(true);
    }
}

class PowerCastingCalculatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
    /**
     * @param{PowerCastingCalculator} pcc
     */
    constructor(pcc) {
        super();
        this.pcc = pcc;
        this.systemMods = SwadeSystemPowerMods.getMods();

        const numDamagingActions =
            Object.entries(this.pcc.power.system.actions.additional)
                .filter(([key,data]) => data.type === 'damage')
                .length;
        if (this.pcc.power.system.damage || numDamagingActions) {
            this.powerHasDamage = true;
            this.systemDamageMods = SwadeSystemPowerMods.getDamageMods();
        }

        log('power desc is ', this.pcc.power.system.description);
        this.powerMods = SwadePowerModifierExtractor.attemptExtract(this.pcc.power.system.description);
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        form: {
            handler: PowerCastingCalculatorApp.myFormHandler,
            submitOnChange: true,
            closeOnSubmit: false,
            submitOnClose: false,
        },
        window: {
            icon: 'fa-solid fa-hand-sparkles',
            title: 'Power calculator',
            resizeable: true,
            minimizable: true
        },
        position: {
            width: 800
        },
        actions: {
            rollIt: PowerCastingCalculatorApp.rollItButton
        }
    }

    static PARTS = {
        form: {
            template: 'modules/penllawen-sprawlrunners-extras/templates/power_casting_calculator.hbs',
        }
    }

    async _prepareContext() {
        this.calcDerivedValues();

        const context = {
            powerName: this.pcc.power.name,
            actorName: this.pcc.actor.name,
            basePP: this.pcc.basePP,
            powerLimit: this.pcc.powerLimit,
            modLimit: this.pcc.modLimit,

            systemMods: this.systemMods,
            powerMods: this.powerMods,
            powerHasDamage: this.powerHasDamage,
            systemDamageMods: this.systemDamageMods,

            currentNumMods: this.totalModCount,
            totalPPModCost: this.totalPPModCost,
            totalPPCost: this.pcc.basePP + this.totalPPModCost,
            isWildCast: this.isWildCast,
        };

        context.powerDesc = await TextEditor.enrichHTML(this.pcc.power.system.description);
        return context;
    }

    calcDerivedValues() {
        const checkedSysMods = Object.entries(this.systemMods)
            .map(([key, value]) => { return value; })
            .filter(x => x.checked);
        const checkedPowerMods = Object.entries(this.powerMods)
            .map(([key, value]) => { return value; })
            .filter(x => x.checked);

        this.totalModCount = checkedSysMods.length + checkedPowerMods.length;

        this.totalPPModCost =
            checkedSysMods.reduce(
                (acc, x) => {acc += x.cost; return acc;}, 0)
            + checkedPowerMods.reduce(
                (acc, x) => {acc += x.cost; return acc;}, 0)

        this.isWildCast = ((this.pcc.basePP + this.totalPPModCost) > this.pcc.powerLimit
            || (this.totalModCount > this.pcc.modLimit));
    }

    /**
     * Process form submission for the sheet
     * @this {PowerCastingCalculatorApp}                      The handler is called with the application as its bound scope
     * @param {SubmitEvent} event                   The originating form submission event
     * @param {HTMLFormElement} form                The form element that was submitted
     * @param {FormDataExtended} formData           Processed data for the submitted form
     * @returns {Promise<void>}
     */
    static async myFormHandler(event, form, formData) {
        // log ("in myFormHandler; data is", formData.object, event, form, formData);

        for (const [formKey, formValue] of Object.entries(formData.object)) {
            for (const mods of [this.systemMods, this.powerMods]) {
                if (!(formKey in mods)) continue;

                switch (mods[formKey].type) {
                    case 'radio':
                        Object.entries(mods[formKey].radioButtons).forEach(
                            ([id, data]) => {
                                if (formValue === data.id) {
                                    data.checked = true;
                                    // these two fields that are on the top-level object
                                    // (rather than the radio button itself) will be used
                                    // in calcDerivedValues() above when adding up PP costs
                                    mods[formKey].checked = true;
                                    mods[formKey].cost = data.cost;
                                } else {
                                    data.checked = false;
                                }
                            })
                        break;
                    case 'checkbox':
                        mods[formKey].checked = formValue;
                        break;
                    default:
                        logError(`Unknown mod type for key ${formKey} ${mods[formKey].type}`, true);
                        console.error(`formKey ${formKey} -> mods[formKey]`, mods[formKey]);
                        console.error('myFormHandler event / form / formData', event, form, formData);
                }
            }
        }

        log('finished handler', this);
        this.render();
    }

    static rollItButton(event, target) {
        log('in rollItButton', event, target, this);
        const powerSkill = this.pcc.actor.items.filter(i => i.name===this.pcc.power.system.arcane)[0];

        let options = {
            // title: `Using ${this.pcc.power.name} Power with modifiers`,
            // item: this.pcc.power
        }
        if (this.isWildCast) {
            options.additionalMods = [{label: 'Wild Magic', value: -4}];
        }

        let message ="<div>"
        message += `Uses <strong>${this.pcc.power.name}</strong> with ${this.totalModCount} mods for ${this.pcc.basePP + this.totalPPModCost} PP`;

        if (this.totalModCount > 0) {
            message += '<p>Mods:</p><ul>';
            const mods =
                Object.entries(Object.assign(this.systemMods, this.powerMods))
                .map(([key, value]) => { return value; })
                .filter(x => x.checked);
            mods.forEach(mod => message += `<li>${mod.name} (${mod.cost} PP)</li>`);
            message += '</ul>';
        }
        message += '</div>';
        log('chatmessage', message);

        getDocumentClass('ChatMessage').create({
            content: message,
            speaker: {actor: this.pcc.actor}
        });

        this.pcc.actor.rollSkill(powerSkill._id, options);
        this.close();
    }
}


class SwadePowerModifierExtractor {
    /**
     * @this {string} desc The "description" string from the Foundry system, see below for example
     */
    static attemptExtract(desc) {
        const matches = desc.matchAll(/<li><strong>(.*?)\s\(\+(\d)\).*?>(.*?)<\/li>/g);

        let modifiers = {};
        let idx = 0;

        for(const match of matches) {
            modifiers['powermod_' + idx++] = {
                type: 'checkbox',
                name: match[1],
                cost: parseInt(match[2]),
                checked: false,
                hint: match[3]
            }
        }
        return modifiers;
    }


// <li><strong>(.*?)\s\(\+(\d)\).*?>(.*?)<\/li>


    /* example of input
    <article class="swade-core">
<p><em>Barrier </em>creates a straight wall 5″ (10 yards) long and 1″ (two yards) tall, of immobile material that conforms to the surface it’s cast upon. Thickness varies depending on what the wall is made of, but is usually a few inches.</p>
<p>The wall has a @UUID[Compendium.swade-core-rules.swade-rules.swadecor03rules0.JournalEntryPage.03breakingthin00]{Hardness} of 10, and may be destroyed as any other object (see @Compendium[swade-core-rules.swade-rules.Breaking Things]{Breaking Things}).</p>
<p>When the spell expires or the wall is broken it crumbles to dust or dissipates. @UUID[Compendium.swade-core-rules.swade-rules.swadecor05powers.JournalEntryPage.05trappings00000]{Trappings} are never left behind.</p>
<p><strong>Modifiers</strong></p>
<ul>
<li><strong>Damage (+1): </strong>The barrier causes 2d4 damage to anyone who contacts it</li>
<li><strong>Hardened (+1): </strong>The wall is @UUID[Compendium.swade-core-rules.swade-rules.swadecor03rules0.JournalEntryPage.03breakingthin00]{Hardness} 12.</li>
<li><strong>Shaped (+2): </strong>The barrier forms a circle, square or other basic shape.</li>
<li><strong>Size (+1): </strong>The length and height of the barrier doubles.  </li>
</ul>
</article>
     */

}


class SwadeSystemPowerMods {
    static getMods() {
        return {
            fatigue: {
                type: 'checkbox',
                id: 'fatigue', name: 'Fatigue', cost: 2, checked: false,
                hint: 'Only for powers that drain or tax an opponent; cannot cause Incap'
            },
            glow_shroud: {
                type: 'checkbox',
                id: 'glow_shroud', name: 'Glow/Shroud', cost: 1, checked: false,
                hint: 'Soft light or deeper shadows in SBT around target'
            },
            hinder_hurry: {
                type: 'checkbox',
                id: 'hinder_hurry', name: 'Hinder/Hurry', cost: 1, checked: false,
                hint: '-2 or +2 to target\'s Pace'
            },
            range: {
                type: 'radio',
                name: 'Extra range',
                hint: 'Double (+1PP) or triple (+2PP) listed Power range',
                radioButtons: [{
                    group: 'range', id: 'range-1', cost: 1, checked: false, name: '2×'
                }, {
                    group: 'range', id: 'range-2', cost: 2, checked: false, name: '3×'
                }, {
                    group: 'range', id: 'range-0', cost: 0, checked: true, name: '(none)'
                }]
            },
            selective: {
                type: 'checkbox',
                id: 'selective', name: 'Selective', cost: 1, checked: false,
                hint: 'Can pick targets inside spell\'s Area of Effect'
            },
        }
    }

    static getDamageMods() {
        return {
            ap: {
                type: 'radio',
                name: 'Armour Piercing',
                hint: 'Add armour piercing values to the damage roll from this power; 1/2/3 PP for +2/+4/+6',
                radioButtons: [{
                    group: 'ap',  id: 'ap1', cost: 1, checked: false, name: 'AP+2',
                },
                    {
                        group: 'ap', id: 'ap2', cost: 2, checked: false, name: 'AP+4',
                    },
                    {
                        group: 'ap', id: 'ap3', cost: 3, checked: false, name: 'AP+6',
                    },
                    {
                        group: 'ap', id: 'ap0', cost: 0, checked: true, name: '(none)'
                    }]
            },
            heavy_weapon: {
                type: 'checkbox',
                id: 'heavy_weapon', name: 'Heavy Weapon', cost: 2, checked: false,
                hint: 'The attack counts as a Heavy Weapon'
            },
            lingering_damage: {
                type: 'checkbox',
                id: 'lingering_damage', name: 'Lingering Damage', cost: 2, checked: false,
                hint: 'Extends damage into next turn, at -1 die step (eg 2d6 -> 2d4)'
            },
        }
    }
    static getModsOld () {
        return {
            ap1: {
                // NB: the child `id` field here isn't used but I haven't gotten around
                // to deleting it yet
                id: 'ap1', name: 'Armour Piercing +2', cost: 1, checked: false,
                hint: 'Add 2 AP to damage dealt'
            },
            ap2: {
                id: 'ap2', name: 'Armour Piercing +4', cost: 2, checked: false,
                hint: 'Add 4 AP to damage dealt'
            },
            ap3: {
                id: 'ap3', name: 'Armour Piercing +6', cost: 3, checked: false,
                hint: 'Add 6 AP to damage dealt'
            },
            fatigue: {
                id: 'fatigue', name: 'Fatigue', cost: 2, checked: false,
                hint: 'Only for powers that drain or tax an opponent; cannot cause Incap'
            },
            glow_shroud: {
                id: 'glow_shroud', name: 'Glow/Shroud', cost: 1, checked: false,
                hint: 'Soft light or deeper shadows in SBT around target'
            },
            heavy_weapon: {
                id: 'heavy_weapon', name: 'Heavy Weapon', cost: 2, checked: false,
                hint: 'The attack counts as a Heavy Weapon'
            },
            hinder_hurry: {
                id: 'hinder_hurry', name: 'Hinder/Hurry', cost: 1, checked: false,
                hint: '-2 or +2 to target\'s Pace'
            },
            lingering_damage: {
                id: 'lingering_damage', name: 'Lingering Damage', cost: 2, checked: false,
                hint: 'Extends damage into next turn, at -1 die step (eg 2d6 -> 2d4)'
            },
            range_1: {
                id: 'range-1', name: 'Range (double)', cost: 1, checked: false,
                hint: 'Double listed range'
            },
            range_2: {
                id: 'range-2', name: 'Range (triple)', cost: 2, checked: false,
                hint: 'Triple listed range'
            },
            selective: {
                id: 'selective', name: 'Selective', cost: 1, checked: false,
                hint: 'Can pick targets inside spell\'s Area of Effect'
            },
        }
    }
}