import { ActionExample, Content, type Action } from "@elizaos/core";
import { findAddress } from "../utils/find-address.ts";
import { AttachmentBuilder } from "discord.js";
import { abbreviateNumber } from "../utils/abbreviate.ts";

const dcaSummaryAction: Action = {
    name: "DCA_SUMMARY",
    similes: ["GET_DCA_SUMMARY", "DCA_TABLE", "DCA_REPORT"],
    description:
        "Gets a summary table of active DCA positions for a given token",
    validate: async (runtime, message) => {
        if (!message.content.text) return false;

        const content = message.content.text.toLowerCase();
        const hasDcaSummaryKeywords =
            content.includes("dca") ||
            content.includes("dcas") ||
            content.includes("summary") ||
            content.includes("table") ||
            content.includes("report");

        const hasTokenIdentifier =
            content.includes("$") ||
            /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(content);

        return hasDcaSummaryKeywords && hasTokenIdentifier;
    },
    handler: async (runtime, message, state, options, callback) => {
        if (!message.content.text) return;

        try {
            console.log("Starting DCA summary handler...");
            const tokenAddress = await findAddress(message.content.text);
            console.log("Found token address:", tokenAddress);

            const displayName =
                tokenAddress === "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump"
                    ? "bubbacat"
                    : message.content.text.includes("$")
                      ? message.content.text.match(/\$([a-zA-Z0-9]+)/)?.[1]
                      : tokenAddress;
            console.log("Display name:", displayName);

            // Add timestamp to prevent caching
            const timestamp = Date.now();
            const reportUrl = `https://callisto.so/api/dca/get-report-image?address=${tokenAddress}&t=${timestamp}`;
            console.log("Generated report URL:", reportUrl);

            // First request to trigger screenshot generation
            const response = await fetch(reportUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": `${process.env.CALLISTO_API_KEY}`,
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
            });

            console.log("API Response status:", response.status);
            // console.log(
            //     "API Response headers:",
            //     Object.fromEntries(response.headers.entries())
            // );

            if (!response.ok) {
                throw new Error(`Failed to fetch report: ${response.status}`);
            }

            const imageBuffer = await response.arrayBuffer();
            console.log("Received image buffer size:", imageBuffer.byteLength);

            const attachment = new AttachmentBuilder(Buffer.from(imageBuffer), {
                name: "dca-summary.png",
            });
            console.log("Created attachment");

            // Send message with attachment
            console.log("Sending callback with attachment...");
            await callback(
                {
                    text: `here is the DCA summary for ${displayName}`,
                    action: "DCA_SUMMARY_RESULT",
                    source: message.content.source,
                },
                [attachment]
            );
            console.log("Callback sent successfully");

            // Return full content object
            return {
                text: `here is the DCA summary for ${displayName}`,
                action: "DCA_SUMMARY_RESULT",
                source: message.content.source,
                attachments: [
                    {
                        id: "dca-summary",
                        url: reportUrl,
                        title: `${displayName.toUpperCase()} DCA Summary`,
                        description: "Live DCA positions and statistics",
                        source: "API",
                        text: "Summary shows DCA positions, progress, and stats",
                    },
                ],
            };
        } catch (error) {
            console.error("Error processing DCA positions:", error);
            console.error("Full error details:", {
                message: error.message,
                stack: error.stack,
            });
            await callback({
                text: "Sorry, I couldn't process the DCA summary right now. Please try again later.",
                action: "DCA_SUMMARY_ERROR",
                source: message.content.source,
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me dca summary for $bonk",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "here is the DCA summary for bonk",
                    action: "DCA_SUMMARY_RESULT",
                },
            },
        ],
    ] as ActionExample[][],
};

export default dcaSummaryAction;
