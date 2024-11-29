import { Plugin } from "@ai16z/eliza";

import dcaAction from "./actions/dca.ts";
import priceAction from "./actions/price.ts";
import statsAction from "./actions/stats.ts";
import whatIfAction from "./actions/whatif.ts";
import chartAction from "./actions/chart.ts";
import dcaSummaryAction from "./actions/dca-summary.ts";
import userEvaluator from "./evaluators/user.ts";
import { generateBubbacatImageAction } from "./actions/generate-image.ts";
import { generateBubbacatResponseAction } from "./actions/test.ts";

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
    evaluators: [userEvaluator],
    providers: [],
};
