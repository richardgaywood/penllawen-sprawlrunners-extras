import { log } from "./logger.mjs";

export class EZRoller {
    /**
     * @param dialog {RollDialog}
     * @param html {jQuery}
     * @param data
     */
    static onRenderRollDialog(dialog, html, data) {
        // where the player enters any number they want
        html.find('.new-modifier-value')
            .css("background-color", "yellow");

        // where the player selects presets
        html.find('.presets > button')
            .css("background-color", "#7aa5c7");

        // hide roll formula boxes
        html.find('.formula')
            .css("display", "none");
    }
}
