import Replicate from "replicate";
import { Action, Content } from "@ai16z/eliza";
import { AttachmentBuilder } from "discord.js";
import Anthropic from "@anthropic-ai/sdk";

export const generateBubbacatResponseAction: Action = {
    name: "GENERATE_BUBBACAT_RESPONSE",
    description: "Generate an image response when bubbacat is asked a question",
    similes: ["GENERATE_BUBBACAT_RESPONSE", "BUBBACAT_RESPONSE"],
    validate: async (runtime, message) => {
        console.log("[GENERATE_BUBBACAT_RESPONSE] Validating message...");
        if (!message.content.text) {
            console.log("[GENERATE_BUBBACAT_RESPONSE] No message text found");
            return false;
        }
        const text = message.content.text.toLowerCase();
        const isValid =
            text.includes("testkeyword") &&
            text.includes("[GENERATE_BUBBACAT_RESPONSE]".toLowerCase());
        console.log(
            "[GENERATE_BUBBACAT_RESPONSE] Message validation result:",
            isValid
        );
        return isValid;
    },
    handler: async (runtime, message, state, options, callback) => {
        if (!message.content.text) return;

        const recentMessagesData = state.recentMessagesData;

        try {
            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Starting response generation..."
            );

            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });

            // Get response from Claude
            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Sending prompt to Claude..."
            );
            // Get response from Claude
            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Sending prompt to Claude..."
            );
            const promptResponse = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1000,
                messages: [
                    {
                        role: "assistant",
                        content:
                            "You are generating prompts specifically for FLUX PRO image generator. FLUX PRO works best with clear, specific prompts that describe:\n" +
                            "- Main subject and action clearly stated first\n" +
                            "- Composition and camera angle\n" +
                            "- Lighting and atmosphere\n" +
                            "- Important details (But avoid over-long descriptions)\n\n" +
                            "Character specifications for Bubbacat:\n" +
                            "- Must include 'bubbacat' keyword in prompt\n" +
                            "- Photorealistic, highly detailed style\n" +
                            "- Known as the tiniest/smallest ginger kitten\n" +
                            "- Fluffy, textured orange/ginger fur with visible strands\n" +
                            "- Large, glossy, reflective eyes with innocent expression\n" +
                            "- Often stands on hind legs in humanoid pose\n" +
                            "- Size always emphasized by surroundings\n" +
                            "- Loves boba tea and is often seen with boba cups/straws\n" +
                            "- Soft, natural lighting that enhances fur detail\n" +
                            "- High-definition, crisp quality with meaningful background\n\n" +
                            "Generate detailed FLUX PRO prompts that maintain photorealistic quality and character consistency. Respond ONLY with the prompt - no other text.",
                    },
                    {
                        role: "user",
                        content:
                            "Create a FLUX PRO prompt based on this conversation:\n\nUser: " +
                            recentMessagesData[0].content.text +
                            "\nKitten: " +
                            recentMessagesData[1].content.text +
                            "\n\nRespond only with the prompt itself.",
                    },
                ],
            });

            // Extract the response text

            // const promptResponse = await anthropic.messages.create({
            //     model: "claude-3-sonnet-20240229",
            //     max_tokens: 1000,
            //     messages: [
            //         {
            //             role: "assistant",
            //             content:
            //                 "Generate very short FLUX PRO prompts for Bubbacat - the tiniest ginger kitten. Format:\n" +
            //                 "'bubbacat [action/situation], [key visual details], photorealistic'\n\n" +
            //                 "Character traits:\n" +
            //                 "- Always use 'bubbacat' in prompt\n" +
            //                 "- Tiny ginger kitten\n" +
            //                 "- Fluffy orange fur\n" +
            //                 "- Large glossy eyes\n" +
            //                 "- Loves boba tea\n" +
            //                 "Respond ONLY with short FLUX PRO prompt.",
            //         },
            //         {
            //             role: "user",
            //             content:
            //                 "Create a short FLUX PRO prompt based on:\n\nUser: " +
            //                 recentMessagesData[0].content.text +
            //                 "\nKitten: " +
            //                 recentMessagesData[1].content.text,
            //         },
            //     ],
            // });
            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Extracting response text..."
            );
            const claudeResponse = (promptResponse.content[0] as any).text;
            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Claude response:",
                claudeResponse
            );

            let prompt = "";
            console.log("[GENERATE_BUBBACAT_RESPONSE] Base prompt:", prompt);

            prompt += claudeResponse;
            console.log("[GENERATE_BUBBACAT_RESPONSE] Final prompt:", prompt);

            // prompt += "kawaii style, cute anime art style, warm colors";

            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Generated prompt:",
                prompt
            );

            const replicate = new Replicate({
                auth: process.env.REPLICATE_API_TOKEN,
            });

            const input = {
                prompt: prompt,
                prompt_upsampling: true,
                seed: 1500999,
            };

            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Calling Replicate API..."
            );
            const output = await replicate.run(
                "oguzserdar/bubbacat:c8216c3771f822ec8fe23fbf7f8ee2e19a40245126ab811f676fe8e44b01372c",
                {
                    input: {
                        model: "dev",
                        lora_scale: 1,
                        num_outputs: 1,
                        aspect_ratio: "1:1",
                        output_format: "webp",
                        guidance_scale: 3.5,
                        output_quality: 90,
                        prompt_strength: 0.8,
                        extra_lora_scale: 1,
                        num_inference_steps: 28,
                        seed: 1500999,
                        prompt: prompt,
                    },
                }
            );
            console.log(output);
            console.log(
                "[GENERATE_BUBBACAT_RESPONSE] Received response from Replicate"
            );

            const response = await fetch(output as unknown as string);
            const imageBuffer = await response.arrayBuffer();

            const attachment = new AttachmentBuilder(Buffer.from(imageBuffer), {
                name: "bubbacat-response.png",
            });

            const content: Content = {
                text: "meow",
                action: "BUBBACAT_RESPONSE",
                source: message.content.source,
            };

            await callback(content, [attachment]);

            return {
                text: "meow",
                action: "BUBBACAT_RESPONSE",
                source: message.content.source,
                attachments: [
                    {
                        id: "bubbacat-response",
                        url: output as unknown as string,
                        title: "Bubbacat Response",
                        description: "A tiny response from bubbacat",
                        source: "Flux 1.1 Pro",
                        text: prompt,
                    },
                ],
            };
        } catch (error) {
            console.error(
                "[GENERATE_BUBBACAT_RESPONSE] Error generating response:",
                error
            );
            const errorContent: Content = {
                text: "meow... sorry, i'm too smol to generate an image right now",
                action: "BUBBACAT_ERROR",
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
                    text: "@bubbacat where are you?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "meow~ here i am!",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "@bubbacat how are you doing?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "i'm doing purrfectly smol and comfy!",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "@bubbacat what are you up to?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "just slurping some boba and watching the charts meow~",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "@bubbacat can i see you?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "here's a tiny peek at me! *wiggles*",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "@bubbacat are you really that small?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "meow! i'm the tiniest ginger kitten you'll ever see!",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "@bubbacat what's your favorite thing to do?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "slurping dipperinos and building the comfiest community!",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "@bubbacat why are you so cute?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "nyaa~ it's my smol size and big heart!",
                    action: "GENERATE_BUBBACAT_RESPONSE",
                },
            },
        ],
    ],
};
