import { log } from "./logger.mjs";

export class PowerStuff {
    static onPowerPreCreate(item, data, options, userId) {
        log('in PowerStuff.onPowerPreCreate', item, userId, data, options);

        if (item.type !== 'power') return;

        game.actors.get(userId).items
           .filter(x => x.type === 'edge')
           .filter(x => x.system.isArcaneBackground)
           .forEach;
    }

}