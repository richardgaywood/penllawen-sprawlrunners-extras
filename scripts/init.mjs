import { log } from "./logger.mjs";
import { LpCalc, LpRender  } from "./logistic_points.mjs";
import { PowerStuff } from "./power_prepopulation.mjs";
import { EZRoller } from "./ezroller.mjs";
import { DocgTools } from './tools.mjs';

export const CONSTANTS = {
    moduleName: "penllawen-sprawlrunners-extras",
    lpGameSettingName: "lpForActors",
    lpActorFlagName: "lpSpent",
    debug: true,
};

try {
    Hooks.once('init', function () {
        console.log(`DOCG | init-ing ${CONSTANTS.moduleName}`);

        game.settings.register(CONSTANTS.moduleName, 'lpCalculator', {
            name: 'Enable LP calculator',
            hint: "Turn on/off the automatic tracking of Logistic Points for Sprawlrunners / Titan Effect",
            default: true,
            scope: 'world',
            type: Boolean,
            config: true,
            requiresReload: true,
        });

        game.settings.register(CONSTANTS.moduleName, 'ezRoller', {
            name: 'Enable EZ Roller mode',
            hint: "Visual tweaks to the SWADE system roller to make it (IMO) more intuitive",
            default: true,
            scope: 'world',
            type: Boolean,
            config: true,
            requiresReload: true,
        });

        // you have to register renderItemDirectory hook before ready is called, or it won't
        // show up on the first render of the itemDirectory
        if (game?.settings?.get(CONSTANTS.moduleName, 'lpCalculator')) {
            Hooks.on('renderActorSheet', LpRender.charsheetRenderer);
            Hooks.on("swadeActorPrepareDerivedData", LpCalc.updateOtherActors);
            Hooks.on('renderItemDirectory', LpRender.itemDirectoryRenderer);
        }

    });
    console.log(`DOCG | Registered init hook ${CONSTANTS.moduleName}`);
} catch {
    console.error(`DOCG | Failed to register init hook ${CONSTANTS.moduleName}`);
}

Hooks.once('devModeReady', function () {
    game.modules.get('_dev-mode')?.api
        .registerPackageDebugFlag(CONSTANTS.moduleName);
    log("DevMode debug flag logging is enabled!");
});


Hooks.on('preCreateItem', PowerStuff.onPowerPreCreate);




Hooks.on("ready", () => { 
    log("registering tools package-level global");
    // to use this in a macro:
    // const tools = game.modules.get("swade-dev-scratchpad").tools;
    game.modules.get(CONSTANTS.moduleName).tools = new DocgTools();


    // if (game?.settings?.get(CONSTANTS.moduleName, 'lpCalculator')) {
    //     Hooks.on('renderActorSheet', LpRender.charsheetRenderer);
    //     Hooks.on("swadeActorPrepareDerivedData", LpCalc.updateOtherActors);
    //     // if you put this in here, then it doesn't get called, because the renderItemDirectory
    //     // hook is called before the ready one
    //     // Hooks.on('renderItemDirectory', LpRender.itemDirectoryRenderer);
    // }

    if (game?.settings?.get(CONSTANTS.moduleName, 'ezRoller')) {
        Hooks.on('renderRollDialog', EZRoller.onRenderRollDialog);
    }
});


/*
to get ABs
game.actors.get("G2UjlJYUEkrhZQvs").items
   .filter(x => x.type === 'edge')
 .filter(x => x.system.isArcaneBackground)
 .map(x => x.system.additionalStats.abArcaneSkill)
 ;
*/