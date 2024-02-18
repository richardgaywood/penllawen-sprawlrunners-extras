

import { log } from "./logger.mjs";

// to use this in a macro:
// const tools = game.modules.get("swade-dev-scratchpad").tools
export class DocgTools {
    helloWorld() {
        log('Hello, world!');
    }


    async testWarpgate() {
        const texture = '/assets/tiles/hex_green.svg';

        log ("starting WG");

        const center = await warpgate.crosshairs.show({
            lockSize: false, 
            texture: texture,
            drawIcon: false,
            drawOutline:false,
            interval: 1
          });
          
        // const center = {
        //     x: 500,
        //     y: 500,
        //     radius: 1000
        // }


          /* define tile data -- assumed square aspect ratio */
          const data = {
              x: center.x - center.radius,
              y: center.y - center.radius,
              width: center.radius * 2,
              height: center.radius * 2,
              texture: {src: texture},
          }
          
        log ("making Tile");

        canvas.scene.createEmbeddedDocuments('Tile', [data])

    }

    /* module category stuff */

    // itemCategories;
    // itemCategories = new dict();


    // moduleCategoryAnalysis() {
    //     game.modules.forEach(x => this._processModule(x));
    // }
    // _processModule(module) {
    //     if (module.id === '_dev-mode') return;
    //     module.packs.filter(
    //         x => x.system === 'swade' 
    //             && x.packageType === 'module' 
    //             && x.type === 'Item')
    //         .forEach(x => this._processPack(x, module));
    // }
    // _processPack(pack, module) {
    //     if (!pack) return;
    //     log(`Doing pack ${pack.name} from ${module.id}`, pack);
    // }

    moduleCategoryAnalysis() {

    }


    // _processItem(item, pack, module) {
    //     log()
    // }
}



/*

function processPack(pack) {


}

function processModule(module) {
  module.packs.filter(x => x.system === 'swade' && x.packageType === 'module' && x.type === 'Item')
}

game.modules.forEach(processModule);




/*

dl = game.modules.get("deadlands-core-rules")

dl.packs.filter(x => x.system === 'swade' && x.packageType === 'module' && x.type === 'Item')


*/