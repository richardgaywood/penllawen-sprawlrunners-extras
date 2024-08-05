import {CONSTANTS} from "./init.mjs";

export function log(...args) {
    if (!CONSTANTS.debug) return;
    console.log(CONSTANTS.moduleName, '|DOCG|', ...args);
    // try {
    //   if (!game.modules.get('_dev-mode')?.enabled) return;
    //
    //     const isDebugging = game.modules.get('_dev-mode')
    //         .api.getPackageDebugValue(CONSTANTS.moduleName);
    //
    //     if (isDebugging) {
    //       console.log(CONSTANTS.moduleName, '|DOCG|', ...args);
    //     }
    //   } catch (e) {
    //     console.error("DOCG | Catastrophic logging failure", e);
    //   }
}

export function logError(msg, sticky) {
    ui.notifications.error(msg.toString(), {
        sticky,
        console: true,
    });
}