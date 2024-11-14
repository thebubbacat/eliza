import { Action, ActionExample, Content } from "@ai16z/eliza/src/types.ts";
import { abbreviateNumber } from "../utils/abbreviate.ts";
import { getDexscreenerData } from "../utils/get-dexscreener-data.ts";

function processNumberString(str: string): number | null {
    if (!isNaN(parseFloat(str)) && isFinite(parseFloat(str))) {
        return parseFloat(str);
    }

    const units = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
    const unit = str.slice(-1).toUpperCase();
    const number = parseFloat(str.slice(0, -1));

    if (!isNaN(number) && units[unit as keyof typeof units]) {
        return number * units[unit as keyof typeof units];
    }

    return null;
}

const whatIfAction: Action = {
    name: "WHAT_IF",
    similes: ["PRICE_TARGET", "MARKET_CAP_TARGET", "COMPARE_MCAP"],
    description:
        "Calculates price targets based on market cap comparisons or direct targets",
    validate: async (runtime, message) => {
        if (!message.content.text) {
            return false;
        }
        const content = message.content.text.toLowerCase();

        // Check for "what if" or "whatif" keywords
        const hasWhatIf =
            content.includes("what if") || content.includes("whatif");

        // Check for token address pattern (42-44 hex chars)
        const hasTokenAddress = /[a-fA-F0-9]{42,44}/.test(content);

        // Check for token symbols (starting with $)
        const hasTokenSymbol = /\$[A-Za-z]+/.test(content);

        console.log(hasWhatIf, hasTokenAddress, hasTokenSymbol);
        return hasWhatIf && (hasTokenAddress || hasTokenSymbol);
    },
    handler: async (runtime, message, state, options, callback) => {
        console.log("whatif handler");
        if (!message.content.text) {
            return;
        }

        const content = message.content.text.toLowerCase();
        const words = content.split(/\s+/);

        // Find target value after "what if" or "whatif"
        let targetValue = "";
        for (let i = 0; i < words.length; i++) {
            if (
                words[i] === "whatif" ||
                (words[i] === "what" && words[i + 1] === "if")
            ) {
                targetValue = words[i + (words[i] === "what" ? 2 : 1)] || "";
                break;
            }
        }

        if (!targetValue) {
            const errorContent: Content = {
                text: "Please provide either a target market cap (e.g. '10M') or a token symbol to compare with.",
                action: "WHATIF_ERROR",
                source: message.content.source,
            };
            await callback(errorContent);
            return;
        }

        try {
            // Get bubbacat current data
            const bubbacatData = await getDexscreenerData({
                type: "token",
                tokenAddress: "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump",
            });

            if (!bubbacatData || !bubbacatData.fdv || !bubbacatData.priceUsd) {
                throw new Error("Could not fetch bubbacat data");
            }

            const currentPrice = Number(bubbacatData.priceUsd);
            const currentMarketCap = Number(bubbacatData.fdv);

            // Check if target is a number/market cap
            const targetMc = processNumberString(targetValue);
            if (targetMc !== null) {
                const multiplier = targetMc / currentMarketCap;
                const responseContent: Content = {
                    text: `To reach $${abbreviateNumber(targetMc)} market cap:\n• ${multiplier.toFixed(2)}X from here\n• Price would be: $${(currentPrice * multiplier).toFixed(5)}`,
                    action: "WHATIF_RESULT",
                    source: message.content.source,
                };
                await callback(responseContent);
                return responseContent;
            }

            // Otherwise treat as token symbol
            const response = await fetch(
                `https://api.dexscreener.com/latest/dex/search/?q=${targetValue}`
            );
            const data = await response.json();

            if (!data.pairs || data.pairs.length === 0) {
                throw new Error("No pairs found for token symbol");
            }

            const highestVolumePair = data.pairs.sort(
                (a: any, b: any) => Number(b.volume.h24) - Number(a.volume.h24)
            )[0];

            const targetMcap = Number(highestVolumePair.fdv);
            const multiplier = targetMcap / currentMarketCap;

            const responseContent: Content = {
                text: `To reach ${highestVolumePair.baseToken.name}'s market cap ($${abbreviateNumber(targetMcap)}):\n• ${multiplier.toFixed(2)}X from here\n• Price would be: $${(currentPrice * multiplier).toFixed(5)}`,
                action: "WHATIF_RESULT",
                source: message.content.source,
            };
            await callback(responseContent);
            return responseContent;
        } catch (error) {
            console.error("Error in whatif calculation:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't perform that calculation right now. Please try again later.",
                action: "WHATIF_ERROR",
                source: message.content.source,
            };
            await callback(errorContent);
            return;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "what if bubbacat reaches 10M market cap?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To reach $10M market cap:\n• 2.5X from here\n• Price would be: $0.00125",
                    action: "WHATIF_RESULT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "whatif pepe",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To reach PEPE's market cap ($500M):\n• 125X from here\n• Price would be: $0.06250",
                    action: "WHATIF_RESULT",
                },
            },
        ],
    ] as ActionExample[][],
};

export default whatIfAction;
