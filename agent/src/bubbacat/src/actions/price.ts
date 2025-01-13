import { ActionExample, Content, type Action } from "@elizaos/core";
import { getPrice } from "../services/get-price.ts";

const priceAction: Action = {
    name: "GET_PRICE",
    similes: ["CHECK_PRICE", "FETCH_PRICE", "PRICE_INFO"],
    description:
        "Gets current price and market cap information for a given token or contract address",
    validate: async (runtime, message) => {
        if (message.content.text === undefined) {
            return false;
        }
        const content = message.content.text.toLowerCase();

        // Check for price-related keywords
        const priceKeywords = [
            "price",
            "worth",
            "value",
            "cost",
            "rate",
            "trading at",
            "going for",
            "market price",
            "quote",
            "ticker",
            "check",
            "look up",
            "how much",
            "what is",
            "current",
            "price of",
            "tell me price of",
            "give me price of",
        ];

        // Check if message contains any price keywords
        if (!priceKeywords.some((keyword) => content.includes(keyword))) {
            return false;
        }

        // Check for token identifiers ($ symbol or address format) or bubbacat mention
        const hasTokenIdentifier =
            content.includes("$") ||
            /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(content);

        const hasBubbacatMention =
            content.includes("@bubbacat") || content.includes("bubbacat");

        return hasTokenIdentifier || hasBubbacatMention;
    },
    handler: async (runtime, message, state, options, callback) => {
        if (message.content.text === undefined) {
            return;
        }

        try {
            const priceData = await getPrice(runtime, message, state);

            const responseContent: Content = {
                text: priceData,
                action: "PRICE_INFO",
                source: message.content.source,
            };

            await callback(responseContent);
            return responseContent;
        } catch (error) {
            console.error("Error fetching price:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't fetch the price data right now. Please try again later.",
                action: "PRICE_ERROR",
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
                    text: "What's the price of $FWOG?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me check the current price of FWOG...",
                    action: "GET_PRICE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How much is 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU worth?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll look up the price for that token...",
                    action: "GET_PRICE",
                },
            },
        ],
    ] as ActionExample[][],
};

export default priceAction;
