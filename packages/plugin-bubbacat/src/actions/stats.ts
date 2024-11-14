import { Action, ActionExample, Content } from "@ai16z/eliza/src/types.ts";
import { abbreviateNumber } from "../utils/abbreviate.ts";
import { getDexscreenerData } from "../utils/get-dexscreener-data.ts";
const statsAction: Action = {
    name: "GET_STATS",
    similes: ["CHECK_STATS", "FETCH_STATS", "TOKEN_STATS"],
    description:
        "Gets detailed statistics for the bubbacat token including price, volume, and transaction data",
    validate: async (runtime, message) => {
        if (message.content.text === undefined) {
            return false;
        }
        const content = message.content.text.toLowerCase();

        // Check for stats-related keywords
        const statsKeywords = [
            "stats",
            "statistics",
            "metrics",
            "numbers",
            "data",
            "performance",
            "volume",
            "transactions",
            "activity",
        ];

        // Check if message contains stats keywords and bubbacat mention
        const hasStatsKeyword = statsKeywords.some((keyword) =>
            content.includes(keyword)
        );
        const hasBubbacatMention =
            content.includes("@bubbacat") || content.includes("bubbacat");

        return hasStatsKeyword && hasBubbacatMention;
    },
    handler: async (runtime, message, state, options, callback) => {
        try {
            const response = await getDexscreenerData({
                type: "token",
                tokenAddress: "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump",
            });

            if (!response) {
                throw new Error("Could not fetch token stats data");
            }

            let messageText = `📊 Bubbacat Stats 📊\n\n`;

            // Price and Market Cap
            messageText += `💰 Price: $${Number(response.priceUsd).toFixed(8)}\n`;
            messageText += `📈 Market Cap: $${abbreviateNumber(response.fdv ?? 0)}\n`;
            messageText += `💧 Liquidity: $${abbreviateNumber(response.liquidity?.usd ?? 0)}\n\n`;

            // Volume
            messageText += `📊 Volume (24h): $${abbreviateNumber(response.volume.h24)}\n`;
            messageText += `📊 Volume (6h): $${abbreviateNumber(response.volume.h6)}\n`;
            messageText += `📊 Volume (1h): $${abbreviateNumber(response.volume.h1)}\n\n`;

            // Price Changes
            messageText += `📈 Price Change (24h): ${response.priceChange.h24}%\n`;
            messageText += `📈 Price Change (6h): ${response.priceChange.h6}%\n`;
            messageText += `📈 Price Change (1h): ${response.priceChange.h1}%\n\n`;

            // Transactions
            messageText += `🔄 24h Transactions: ${response.txns.h24.buys + response.txns.h24.sells}\n`;
            messageText += `(Buys: ${response.txns.h24.buys} | Sells: ${response.txns.h24.sells})\n`;

            const responseContent: Content = {
                text: messageText,
                action: "STATS_INFO",
                source: message.content.source,
            };

            await callback(responseContent);
            return responseContent;
        } catch (error) {
            console.error("Error fetching stats:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't fetch the stats data right now. Please try again later.",
                action: "STATS_ERROR",
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
                    text: "What are the stats for bubbacat?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me fetch the current stats for bubbacat...",
                    action: "GET_STATS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me bubbacat metrics",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll get the latest statistics for bubbacat...",
                    action: "GET_STATS",
                },
            },
        ],
    ] as ActionExample[][],
};

export default statsAction;
