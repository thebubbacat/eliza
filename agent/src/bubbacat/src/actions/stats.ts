import { ActionExample, Content, type Action } from "@elizaos/core";
import { getStats } from "../services/get-stats.ts";

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
            const messageText = await getStats(runtime, message, state);

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
