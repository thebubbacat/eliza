import Replicate from "replicate";
import { Action, Content } from "@ai16z/eliza";
import { AttachmentBuilder } from "discord.js";

export const generateBubbacatImageAction: Action = {
    name: "GENERATE_IMAGE",
    description: "Generate an image using the Flux 1.1 Pro model",
    similes: [
        "GENERATE_IMAGE",
        "GENERATE_PHOTO",
        "GENERATE_PICTURE",
        "GENERATE_PHOTOGRAPH",
    ],
    validate: async (runtime, message) => {
        if (!message.content.text) return false;
        return message.content.text.toLowerCase().includes("prompt:");
    },
    handler: async (runtime, message, state, options, callback) => {
        if (!message.content.text) return;

        try {
            console.log("[GENERATE_IMAGE] Starting image generation...");

            // Extract prompt after "prompt:"
            const promptMatch = message.content.text.match(/prompt:(.*)/i);
            if (!promptMatch) {
                const errorContent: Content = {
                    text: "Please provide a prompt in the format 'prompt: your description here'",
                    action: "IMAGE_ERROR",
                    source: message.content.source,
                };
                await callback(errorContent);
                return;
            }

            const prompt = promptMatch[1].trim();
            console.log("[GENERATE_IMAGE] Prompt:", prompt);

            const replicate = new Replicate({
                auth: process.env.REPLICATE_API_TOKEN,
            });

            const input = {
                prompt: prompt,
                prompt_upsampling: true,
            };

            console.log("[GENERATE_IMAGE] Calling Replicate API...");
            const output = await replicate.run(
                "black-forest-labs/flux-1.1-pro",
                { input }
            );
            console.log("[GENERATE_IMAGE] Received response from Replicate");

            // Convert output to buffer
            console.log("[GENERATE_IMAGE] Fetching image data...");
            const response = await fetch(output as unknown as string);
            const imageBuffer = await response.arrayBuffer();

            const attachment = new AttachmentBuilder(Buffer.from(imageBuffer), {
                name: "generated-image.png",
            });
            console.log("[GENERATE_IMAGE] Created attachment");

            // Send message with attachment
            const content: Content = {
                text: "Here's your generated image:",
                action: "IMAGE_GENERATED",
                source: message.content.source,
            };

            console.log("[GENERATE_IMAGE] Sending callback with attachment...");
            await callback(content, [attachment]);

            console.log("[GENERATE_IMAGE] Generation complete");
            return {
                text: "Here's your generated image:",
                action: "IMAGE_GENERATED",
                source: message.content.source,
                attachments: [
                    {
                        id: "generated-image",
                        url: output as unknown as string,
                        title: "Generated Image",
                        description: `Generated from prompt: ${prompt}`,
                        source: "Flux 1.1 Pro",
                        text: prompt,
                    },
                ],
            };
        } catch (error) {
            console.error("[GENERATE_IMAGE] Error generating image:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't generate the image right now. Please try again later.",
                action: "IMAGE_ERROR",
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
                    text: "Generate an image prompt: cat playing piano",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here's your generated image:",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
    ],
};
