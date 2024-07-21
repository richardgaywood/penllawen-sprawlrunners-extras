import { log } from "./logger.mjs";
import {CONSTANTS} from "./init.mjs";

export class AddButtonOverride {



    /**
     * @param {SwadeItem} item
     * @returns {boolean}
     */
    static onPreCreateItem(item) {
        if (! game?.settings?.get(CONSTANTS.moduleName, 'addButtonOverride')) return true;
        if (!item.actor || !item.actor.hasPlayerOwner) return true;
        /* onPreCreateItem can be called in two ways: when a new item is being created for the sheet (ie. the user
            clicks the +Add button), and when an item is dragged onto the sheet from elsewhere (and a copy is being
            made.) We only want to hook the latter.

            There's a few approaches that could work here, using the different call semantics, but the most obvious
            is to check if the incoming object has an _id field. If it does, it's not new, and we shouldn't process
            this hook.
         */
        if ('_id' in item && item._id !== null && item._id.length > 0) return true;
        log('entering AddButtonOverride.onPreCreateItem for ', item);

        let tabs;
        switch (item.type) {
            case 'hindrance':
                tabs = [{ tabName: 'hindrances', tabGroup: 'category-tabs'}];
                break;
            case 'skill':
                tabs = [{ tabName: 'skills', tabGroup: 'category-tabs'}];
                break;
            case 'edge':
                tabs = [{ tabName: 'edges', tabGroup: 'category-tabs'}];
                break;
            case 'power':
                tabs = [{ tabName: 'powers', tabGroup: 'category-tabs'}];
                break;
            case 'ability':
                tabs = [{ tabName: 'abilities', tabGroup: 'category-tabs'}];
                break;
            case 'action':
                tabs = [{ tabName: 'actions', tabGroup: 'category-tabs'}];
                break;

            case 'weapon':
                tabs = [{ tabName: 'equipment', tabGroup: 'category-tabs'},
                    { tabName: 'ranged-weapons', tabGroup: 'equipment-tabs' }];
                break;
            case 'armor':
                tabs = [{ tabName: 'equipment', tabGroup: 'category-tabs'},
                    { tabName: 'armor', tabGroup: 'equipment-tabs' }];
                break;
            case 'gear':
            case 'consumable':
                tabs = [{ tabName: 'equipment', tabGroup: 'category-tabs'},
                    { tabName: 'gear', tabGroup: 'equipment-tabs' }];
                break;
            case 'shield':
                tabs = [{ tabName: 'equipment', tabGroup: 'category-tabs'},
                    { tabName: 'shields', tabGroup: 'equipment-tabs' }];
                break;

            default:
                return true;
        }
        // despite this being a `new` window, if one is already open, SWADE IT is
        // smart enough to navigate that existing window to the new destination
        // rather than open another
        new CONFIG.SWADEItemTables.ItemTables({tabs: tabs}).render(true);
        return false;
    }



    // old approach that relies on removing the button from the sheet -- abandoned in favour of
    // onPreCreateItem() approach below
    //
    // static onRenderActorSheet(sheet, [html]) {
    //     if (! game?.settings?.get(CONSTANTS.moduleName, 'addButtonOverride'))
    //         return;
    //     const actor = sheet.actor;
    //     if (!actor || !actor.hasPlayerOwner) return;
    //     log(`entering AddButtonOverride.onRenderActorSheet for ${actor.name}`, html);
    //
    //     const sectionDom = html.querySelector('.tab[data-tab="inventory"] span.item-controls > button');
    //     // log("sectionDom is", sectionDom);
    //     if (!sectionDom) return;
    //
    //     /* this gives this snippet:
    //         <button type="button" class="item-create" data-type="weapon">
    //           <i class="fa fa-plus"></i>Add
    //         </button>
    //      */
    // }

    /* Full object dumped out of preCreateItem hook
[
{
    "name": "New Weapon",
    "type": "weapon",
    "system": {
        "description": "",
        "notes": "",
        "source": "",
        "swid": "new-weapon",
        "additionalStats": {},
        "choiceSets": [],
        "quantity": 1,
        "weight": 0,
        "price": 0,
        "equippable": false,
        "equipStatus": 1,
        "isArcaneDevice": false,
        "arcaneSkillDie": {
            "sides": 4,
            "modifier": 0
        },
        "powerPoints": {},
        "isVehicular": false,
        "mods": 1,
        "actions": {
            "trait": "",
            "traitMod": "",
            "dmgMod": "",
            "additional": {}
        },
        "bonusDamageDie": 6,
        "bonusDamageDice": 1,
        "favorite": false,
        "templates": {
            "cone": false,
            "stream": false,
            "small": false,
            "medium": false,
            "large": false
        },
        "category": "",
        "grants": [],
        "grantOn": 1,
        "damage": "",
        "range": "",
        "rangeType": null,
        "rof": 1,
        "ap": 0,
        "parry": 0,
        "minStr": "",
        "shots": 0,
        "currentShots": 0,
        "ammo": "",
        "reloadType": "none",
        "ppReloadCost": 2,
        "trademark": 0,
        "isHeavyWeapon": false
    },
    "_id": null,
    "img": "systems/swade/assets/icons/weapon.svg",
    "effects": [],
    "folder": null,
    "sort": 0,
    "ownership": {
        "default": 0
    },
    "flags": {},
    "_stats": {
        "coreVersion": "12.328",
        "systemId": "swade",
        "systemVersion": "4.0.3",
        "createdTime": null,
        "modifiedTime": null,
        "lastModifiedBy": null,
        "compendiumSource": null,
        "duplicateSource": null
    }
},
{
    "name": "New Weapon",
    "type": "weapon",
    "system": {}
},
{
    "renderSheet": true,
    "modifiedTime": 1721124738721,
    "render": true
},
"88cztJFw38TXpmQJ"
]

 */




}