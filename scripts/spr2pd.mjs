import { log } from "./logger.mjs";


export class Spr2Pd {

    static baseContext = {
        outputPackName: "world.spr2paydata",
        iconPath: "modules/paydata/icons/",

        categoryToIcon: new Map([
            // keys here must be lowercase and are used as substrings

            // cyberware
            ["bodyware", "gear_icon_bodyware_v2.png"],
            ["cyberlimb", "gear_icon_cyberarm.png"],
            ["eyewear", "gear_icon_cybereye.png"], // not working?
            // ["headware", "gear_icon_headware.png"], // need icon for this
            // also need earware

            // gear
            ["surveillance", "noun-6966150-FFFFFF.svg"],
            ["electronics", "gadget-1.svg"],
            ["personal computer", "screen%20(1).png"],
            ["software", "sd-card.svg"],
        ]),


        nameToIcon: new Map([
            // keys here must be lowercase and are used as substrings
            ["binocular", "binoculars.svg"],
            ["goggles", "goggles.svg"],
            ["chemsuit", "hazmat-2.svg"],
            ["fake id", "id-card.svg"],
            ["fake license", "id-card.svg"],
            ["respirator", "respirator.svg"],
            ["gear repair", "wrench-spanner.svg"],
            ["survival", "survival-kit.svg"],
        ]),


        nameToNameAndCategory: new Map([
            ["Bullets, Rifle", ["Rifle ammo", "Ammo"]],
            ["Bullets, Pistol", ["Pistol ammo", "Ammo"]],
            ["Shells, Buckshot", ["Shotgun shells", "Ammo"]],
            ["Shells, Slug", ["Shotgun slugs", "Ammo"]],

            ["Assault Rifle, Compact", ["Compact Assault Rifle", "Rifles"]],
            ["Assault Rifle", ["Assault Rifle", "Rifles"]],
        ]),


        weaponCategoryToAmmoType: new Map([
            ["Rifles", "Rifle ammo"],
            ["SMGs", "Rifle ammo"],
            ["Pistols", "Pistol ammo"],
            ["Shotguns", "Shotgun shells"],
            ["Machine guns", "Rifle ammo"],
        ]),

        ammoNameToQuantityOverride: new Map([
            ["Rifle ammo", 2],
            ["Pistol ammo", 2],
            ["Shotgun shells", 10],
            ["Shotgun slugs", 10],
        ]),


        rofToShots: new Map([
            [1, 1], [2, 5], [3, 10], [4, 20], [5, 40], [6, 50],
        ]),

    }

    /**
     * @param {object} context
     */
    constructor(context) {
        this.context = context;
    }


    async run(context) {

        // clear old content first
        const itemsToDel = await game.packs.get(this.context.outputPackName)?.getDocuments() ?? [];
        if (itemsToDel) {
            const idsToDel = itemsToDel.map((item) => item._id);
            Item.deleteDocuments(idsToDel, {pack: this.context.outputPackName});
        }

        /** @type {Map[Document]} */
        const items = await game.packs.get("sprawl-core-rules.sprawlrunner-equipment")?.getDocuments() ?? [];
        const newItems = items
            // using reduce for many-many mapping
            // some items may not be mapped; some may be mapped to more than one output
            .reduce((acc, item) => {
                return acc.concat(this.processItem(item.toObject()));
            }, []);
        Item.createDocuments(newItems, {pack: this.context.outputPackName});
    }


    processItem(itemData) {
        if (/cyberware/i.test(itemData.system.category))
            return [this.processCyberwareItem(itemData)];
        if (/gear/i.test(itemData.system.category))
            return [this.processGearItem(itemData)];
        if (itemData.type === "weapon")
            return [this.processWeaponItem(itemData)];

        return [];
    }


    /**
     *
     * @param itemData {object}
     * @returns {object}
     */
    processCyberwareItem(itemData) {

        log("doing item", itemData);
        itemData.system.source = "Sprawlrunners";
        itemData.type = "ability";


        itemData.system.category = itemData.system.category.replace(/^Cyberware, /, "");

        for (const [category, icon] of this.context.categoryToIcon) {
            console.log(`comparing ${category} to ${itemData.system.category.toLowerCase()}, with icon ${icon}`);
            if (itemData.system.category.toLowerCase().includes(category))
                itemData.img = `${this.context.iconPath}${icon}`;
        }


        const buildCost = itemData.system.description.match(/Implant Points.*?:.*?([0-9.]+)/im);
        if (buildCost) {
            console.log(`for ${itemData.name}, got cost ${buildCost[1]}`);
            itemData.system.build.cost = parseFloat(buildCost[1]);
        } else if (itemData.name === "Voice Amplification") {
            itemData.system.build.cost = 1.0;
        } else if (itemData.name === "Voice Secondary Pattern") {
            itemData.system.build.cost = 0.5;
        } else {
            console.warn(`for ${itemData.name}, could not get build cost`);

        }

        log("finished migrating item", itemData);
        return itemData;
    }

    processGearItem(itemData) {
        log("doing item", itemData);

        itemData.system.source = "Sprawlrunners";

        itemData.system.category = itemData.system.category.replace(/^Gear, /, "");

        for (const [category, icon] of this.context.categoryToIcon) {
            if (itemData.system.category.toLowerCase().includes(category))
                itemData.img = `${this.context.iconPath}${icon}`;
        }
        for (const [name, icon] of this.context.nameToIcon) {
            if (itemData.name.toLowerCase().includes(name))
                itemData.img = `${this.context.iconPath}${icon}`;
        }

        log("finished migrating item", itemData);
        return itemData;
    }







    processWeaponItem(itemData) {
        log("doing item", itemData);

        itemData.system.source = "Sprawlrunners";
        itemData.system.category = itemData.system.category.replace(/^Weapons, /, "");

        const isFirearm = (itemData.system.category === "Basic Firearm Frames");
        const isAmmo = (itemData.system.category === "Ammunition");

        // map item names
        if (this.context.nameToNameAndCategory.has(itemData.name)) {
            itemData.system.category = this.context.nameToNameAndCategory.get(itemData.name)[1];
            itemData.name = this.context.nameToNameAndCategory.get(itemData.name)[0];

        } else if (isFirearm) {
            // do some guessing to work out the name from "Shotgun, Combat" pattern
            const [foo, name1, name2] =
                itemData.name.match(/([a-zA-Z0-9 ]+)(?:, (.+))?/);
            itemData.system.category = name1 + "s";
            if (name2) { // implies "Shotgun, Combat" or "SMG, Compact"
                itemData.name = `${name2} ${name1}`;
            } else { // implies "Shotgun" or "SMG"
                itemData.name = `${name1}`;
            }
            console.log(`new data: ${itemData.name}, ${itemData.category}`);
        }

        // if(itemData.system.category === "Ammunition") {
        //     const [foo, name1, name2] =
        //         itemData.name.match(/([a-zA-Z0-9 ]+)(?:, (.+))?/);
        //     itemData.system.category = name1 + "s";
        //     if (name2) {
        //         itemData.name = `${name2} ${name1}`;
        //     } else {
        //         itemData.name = `${name1}`;
        //     }
        // }

        // Ammo & reloading
        if (isFirearm) {
            itemData.system.ammo = this.context.weaponCategoryToAmmoType.get(itemData.system.category) ?? "";
            itemData.system.reloadType = "magazine";
            itemData.rangeType = 1; // 1=ranged


        } else if (isAmmo) {
            itemData.system.isAmmo = true;
            itemData.system.quantity = this.context.ammoNameToQuantityOverride.get(itemData.name) ?? 1;
        }


        // effects - test with Assault Rifle only
        // seems to be buggy for now (?)
        // if (itemData.name === "Assault Rifle") {
        //     let effect = effects.get("smartgun");
        //
        //     effect.changes = effect.changes.map(change => {
        //         change.key = change.key.replace("NAME_GOES_HERE", itemData.name);
        //         return change; });
        //     itemData.effects.push(effect);
        // }


        // actions
        if (isFirearm) {

            if (itemData.system.rof > 1) {
                itemData.system.actions.additional[foundry.utils.randomID(8)] =
                    this.getFullAutoAction(
                        itemData.system.actions.trait,
                        itemData.system.rof,
                        itemData.system.isHeavyWeapon
                    );


                console.log(itemData.system.actions);
            }



            if (itemData.category === "Shotguns" && itemData.system.shots === 2) {
                itemData.system.actions.additional[foundry.utils.randomID(8)] = getDbsFire();
                itemData.system.actions.additional[foundry.utils.randomID(8)] = getDbsDamage();

            }
        }

        for (const [category, icon] of this.context.categoryToIcon) {
            if (itemData.system.category.toLowerCase().includes(category))
                itemData.img = `${this.context.iconPath}${icon}`;
        }
        for (const [name, icon] of this.context.nameToIcon) {
            if (itemData.name.toLowerCase().includes(name))
                itemData.img = `${this.context.iconPath}${icon}`;
        }

        log("finished with item", itemData);

        return itemData;
    }





    getFullAutoAction(trait, rof, isHeavyWeapon) {
        return {
            "name": trait + " (full auto)",
            "type": "trait",
            "dice": rof,
            "resourcesUsed": this.context.rofToShots.get(rof),
            "modifier": "-2", // recoil
            "override": null, // uses default trait for weapon
            "uuid": null,
            "macroActor": "default",
            "isHeavyWeapon": isHeavyWeapon
        };
    }

    getDbsFire(trait) {
        return {
            "name": "Both Barrels (short range, shells)",
            "type": "trait",
            "dice": 1,
            "resourcesUsed": 2,
            "modifier": "+2",
            "override": null,
            "uuid": null,
            "macroActor": "default",
            "isHeavyWeapon": false
        };
    }

    getDbsDamage() {
        return {
            "name": "Both Barrels (short range, shells)",
            "type": "damage",
            "dice": null,
            "resourcesUsed": null,
            "modifier": "+4",
            "override": "3d6",
            "ap": null,
            "uuid": null,
            "macroActor": "default",
            "isHeavyWeapon": false
        };
    }


    getSmartgunEffect() {
        return {
            "name": "Smartgun Link",
            "description": "<p>(1 LP) Required for the use of the Smartlink cyberware.</p><p><strong>Mount Point:</strong> Top or Under (Swap) or Internal</p>",
            "type": "modifier",
            "img": "modules/sprawl-core-rules/icons/assault-rifle.svg",

            // this can only take integers
            "system": { "cost": 1 },

            // origin field doesn't seem to be required (?)
            // "origin": `Compendium.${packName}.Item.wrNvLR5RadimAzrS`,

            "changes": [
                {
                    // a KI in SWADE seems to break @Weapon effects
                    //"key": "@Weapon{NAME_GOES_HERE}[system.actions.traitMod]",
                    // ... so use @Skill instead
                    "key": "@Skill{Shooting}[system.die.modifier]",
                    "mode": 2, // mode 2 = add
                    "value": "+2",
                    "priority": null
                },
                // this will also get double counted
                //     {
                //         "key": "@Weapon{NAME_GOES_HERE}[system.price]",
                //         "mode": 2,
                //         "value": "+1",
                //         "priority": null
                //   },
            ],

            "disabled": true,
            transfer: false,
            "duration": {
                "startTime": 48, // is this nonsense?
                "seconds": null,
                "combat": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
            },
        };
    }
}



