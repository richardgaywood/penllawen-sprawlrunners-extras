import { log } from "./logger.mjs";
import {CONSTANTS} from "./init.mjs";

export class LpCalc {

    /**
     * Handle document updates to any SWADE actor, refreshing our local views as necessary.
     * @param {Actor} actor
     * */
    static onSwadeActorPrepareDerivedData(actor) {
        log("entering LpCalc.onSwadeActorPrepareDerivedData");
        if (!actor || !actor.hasPlayerOwner) return;

        if (LpCache.lpHasChanged(actor)) {
            // this actor's LP cost has been updated, so if we have their sheet open, we should
            // redraw it. We try to minimise redraws, hence this cache.
            Object.values(ui.windows)
                .filter(x => (x.object?.type === "character" && x.rendered && x.object.id === actor.id))
                .forEach(x => x.render(true));
            // Also force a re-render of the Item Directory toolbar, for the per-character summary section
            ui.sidebar?.render(true);
        }
    }

    /** Calculate LP for all actors in the game. */
    static calcLpCostForAllActors() {
        const lpForActors = new Map();
        for (const actor of game.actors) {
            if (!actor.hasPlayerOwner) continue;
            const lp = LpCalc.calcLpCostForActor(actor);
            if (!(lp > 0)) continue;
            lpForActors.set(actor.id, [lp, LpCalc.getMaxLpForActor(actor)]);
        }
        return lpForActors;
    }

    /** Calculate LP for one actor.
     * @param {Actor} actor
     */
    static calcLpCostForActor(actor) {
        const isNPC = (actor.type === 'npc');
        const isVehicle = (actor.type === 'vehicle');
        // the other option is 'character', BTW

        let lp = actor.items
            .map(i => i.system.price)
            .filter(p => p > 0)
            .reduce((total, curr) => total + curr, 0);

        if (isVehicle || isNPC) {
            let data = isVehicle
                ? actor.system.description
                : actor.system.details.biography.value

            if (data && data !== "") {
                const extracted = data.match(/Cost.*?:.*?([0-9.]+)/im);
                // only one extracted group expected
                if (extracted && extracted.length === 2) {
                    lp += parseInt(extracted[1]);
                }
                // TODO: figure out handling here
                //  else {
                //     console.warning(
                //         `When getting LP for ${actor.name}, couldn't parse cost`, extracted, data );
                // }
            }
        }
        return lp;
    }

    static getMaxLpForActor(actor) {
        if (actor.system.additionalStats.maxLp) {
            return actor.system.additionalStats.maxLp.value;
        } else {
            return undefined;
        }
    }
}

export class LpRender {
    /**
     * @param {ActorSheet} sheet
     * @param {JQuery} html
     */
    static charsheetRenderer(sheet, [html]) {
        const actor = sheet.actor;
        if (!actor || !actor.hasPlayerOwner) return;
        log(`entering LpRender.charsheetRenderer for ${actor.name}`);

        const sectionDom = html.querySelector('.tab[data-tab="inventory"] > .flexrow');
        if (!sectionDom) return;

        let lpString;
        const lpSpent = LpCalc.calcLpCostForActor(actor);
        const maxLP = LpCalc.getMaxLpForActor(actor);
        if (maxLP) {
            lpString = `${lpSpent} / ${maxLP}`;
        } else {
            lpString =  `${lpSpent} / ??`;
        }

        const divToAdd = document.createElement('div');
        divToAdd.classList.add("lp");

        divToAdd.innerHTML = 
            '<span class="label">LP</span> '
            + '<span class="value">'
            + lpString
            + '</span>';

        // Insert a summary table of LP spend into a tooltip    
        // This part is optional and honestly maybe a little annoying -
        // the table appears really readily as you mouseover it, and
        // takes a bit too long to disappear again.
        // (I think the timing is tweakable, IIRC.)
        const tableToInsert = LpRender.#lpTableRendererOneChar(actor);
        divToAdd.setAttribute("data-tooltip", tableToInsert);

        // Finally, jam our data into the sheet.
        sectionDom.insertBefore(divToAdd, sectionDom.childNodes[2]);
    }

    static itemDirectoryRenderer(directory, html, options) {
        log(`entering LpRender.itemDirectoryRenderer`);
        const tableToInsert = LpRender.#lpTableRendererAllChars();

        const tabElement = html[0];
        const actionButtons = tabElement.querySelector('.directory-footer.action-buttons');
        actionButtons.insertAdjacentHTML('beforeend', tableToInsert);
    }

    static #lpTableRendererAllChars() {
        log("entering LpRender.lpTableRendererAllChars!");
        const lpForActors = LpCalc.calcLpCostForAllActors();
        
        let tableToInsert =
            '<table class="lp-spend-table"><caption>LP spend</caption><tbody>';
        let totalLp = 0;
        let totalMaxLp = 0;
        for (const [actorId, [lp, maxLp]] of lpForActors.entries()) {
            // if (lp === 0) continue; // skip chars with no gear, eg. summoned spirits
            const actorName = game.actors.get(actorId).name;
            tableToInsert += `<tr><td>${actorName}</td><td>${lp}</td></tr>`;
            totalLp += lp;
            if (maxLp > 0) totalMaxLp += maxLp;
        }
        tableToInsert += `<tr class="total-row"><td>TOTAL</td><td>${totalLp} / ${totalMaxLp}</td></tr></tbody></table>`;
        return tableToInsert;
    }

    static #lpTableRendererOneChar(actor) {
        log("entering LpRender.lpTableRendererOneChar!");
        const itemsWithCost = actor.items
            .map(i => [i.system.price, i.name])
            .filter(i => i[0]>0);

        let tableToInsert =
            '<table class="lp-spend-table"><caption>LP spend</caption><tbody>';
        let totalLp = 0;
        for (const [lp, itemName] of itemsWithCost) {
            tableToInsert += `<tr><td>${itemName}</td><td>${lp}</td></tr>`;
            totalLp += lp;
        }
        tableToInsert += `<tr class="total-row"><td>TOTAL</td><td>${totalLp}</td></tr></tbody></table>`;
        return tableToInsert;
    }
}

export class LpCache {
    /**
     *
     * @param {Actor} actor
     * @returns {boolean}
     */
    static lpHasChanged(actor) {
        log("entering LpCache.lpHasChanged!");

        // a guard in case we get called before the game is ready
        if (game === undefined || game.settings === undefined)
            return true;

        const newLp = LpCalc.calcLpCostForActor(actor);
        let storage = game?.settings?.get(CONSTANTS.moduleName, 'lpCalculatorOutputCache');

        if ( ! actor.id in storage) {
            if (newLp === 0)
                return false;
        } else {
            if (storage[actor.id] === newLp)
                return false;
        }

        storage[actor.id] = newLp;
        game.settings.set(CONSTANTS.moduleName, 'lpCalculatorOutputCache', storage);
        return true;
    }
}
