import { log } from "./logger.mjs";

export class LpCalc {
    static computeLpCost(actor) {
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

    static getLpForActors() {
        const lpForActors = new Map();
        for (const actor of game.actors) {
            if (!actor.hasPlayerOwner) continue;
            const lp = LpCalc.computeLpCost(actor);
            if (!(lp > 0)) continue;
            lpForActors.set(actor._id, [lp, LpCalc.getMaxLpForActor(actor)]);
        }
        return lpForActors;
    }

    static updateOtherActors(actor) {
        log("entering LpCalc.updateOtherActors");
        if (! actor || !actor.hasPlayerOwner) return;

        // if we are updating any player-owned character, we might
        // be updating their LP spend; and if we are updating their
        // LP spend, we must recalculate our own display of the
        // per-character total LP spend
        Object.values(ui.windows)
            .filter(x=> (x.object?.type === "character" && x.rendered))
            .forEach(x => x.render(true))

        // Also force a re-render of the Item Directory toolbar, if 
        // has already been created  
        ui.sidebar?.render(true);

        // this causes infinite loops, duh
        // Hooks.callAll('swadeActorPrepareDerivedData', game.user.character);
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
        const lpSpent = LpCalc.computeLpCost(actor);
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
        const lpForActors = LpCalc.getLpForActors();
        
        var tableToInsert = 
            '<table class="lp-spend-table"><caption>LP spend</caption><tbody>';
        var totalLp = 0;
        var totalMaxLp = 0;
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

        var tableToInsert =
            '<table class="lp-spend-table"><caption>LP spend</caption><tbody>';
        var totalLp = 0;
        for (const [lp, itemName] of itemsWithCost) {
            tableToInsert += `<tr><td>${itemName}</td><td>${lp}</td></tr>`;
            totalLp += lp;
        }
        tableToInsert += `<tr class="total-row"><td>TOTAL</td><td>${totalLp}</td></tr></tbody></table>`;
        return tableToInsert;
    }

}