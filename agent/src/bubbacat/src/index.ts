import { Plugin } from "@elizaos/core";

import priceAction from "./actions/price.ts";
import statsAction from "./actions/stats.ts";
import chartAction from "./actions/chart.ts";
import dcaSummaryAction from "./actions/dca-summary.ts";

export const bubbacatPlugin: Plugin = {
    name: "bubbacat",
    description: "Plugin for basic bubbacat actions",
    actions: [
        dcaSummaryAction,
        // dcaAction,
        priceAction,
        statsAction,
        // whatIfAction,
        chartAction,
        // generateBubbacatImageAction,
        // generateBubbacatResponseAction,
    ],
    evaluators: [],
    providers: [],
};
