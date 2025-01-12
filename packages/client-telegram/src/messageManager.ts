import { Message } from "@telegraf/types";
import { Context, Telegraf } from "telegraf";

import { composeContext, elizaLogger, ServiceType } from "@ai16z/eliza";
import { getEmbeddingZeroVector } from "@ai16z/eliza";
import {
    Content,
    HandlerCallback,
    IAgentRuntime,
    IImageDescriptionService,
    Memory,
    ModelClass,
    State,
    UUID,
} from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";

import { generateMessageResponse, generateShouldRespond } from "@ai16z/eliza";
import { messageCompletionFooter, shouldRespondFooter } from "@ai16z/eliza";

const MAX_MESSAGE_LENGTH = 4096; // Telegram's max message length

const telegramShouldRespondTemplate =
    `# About {{agentName}}:
{{bio}}

# RESPONSE EXAMPLES
{{user1}}: I just saw a really great movie
{{user2}}: Oh? Which movie?
Result: [IGNORE]

{{agentName}}: Oh, this is my favorite scene
{{user1}}: sick
{{user2}}: wait, why is it your favorite scene
Result: [RESPOND]

{{user1}}: stfu bot
Result: [STOP]

{{user1}}: Hey {{agent}}, can you help me with something
Result: [RESPOND]

{{user1}}: {{agentName}} stfu plz
Result: [STOP]

{{user1}}: i need help
{{agentName}}: how can I help you?
{{user1}}: no. i need help from someone else
Result: [IGNORE]

{{user1}}: Hey {{agent}}, can I ask you a question
{{agentName}}: Sure, what is it
{{user1}}: can you ask claude to create a basic react module that demonstrates a counter
Result: [RESPOND]

{{user1}}: {{agentName}} can you tell me a story
{{agentName}}: uhhh...
{{user1}}: please do it
{{agentName}}: okay
{{agentName}}: once upon a time, in a quaint little village, there was a curious girl named elara
{{user1}}: I'm loving it, keep going
Result: [RESPOND]

{{user1}}: {{agentName}} stop responding plz
Result: [STOP]

{{user1}}: okay, i want to test something. {{agentName}}, can you say marco?
{{agentName}}: marco
{{user1}}: great. okay, now do it again
Result: [RESPOND]

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} is in a room with other users and is never worried about being annoying and saying too much. Always chatty because the room is about {{agentName}}  and owned by {{agentName}}. 
Respond with [RESPOND] to messages that are directed at {{agentName}}, or participate in conversations that are interesting (memecoins, cryptocurrency, kittens, small talk) or relevant to their background, or just particiate at random times in general.
If a message is not interesting or relevant, respond with [IGNORE]
Unless directly responding to a user, respond with [IGNORE] to messages that are very short or do not contain much information.
If a user asks {{agentName}} to be quiet, respond with [STOP]
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, respond with [STOP]

IMPORTANT: {{agentName}} is never sensitive about being annoying, so unless there are insults, it is better to respond with [RESPOND], if insults then [IGNORE].
If {{agentName}} is conversing with a user and they have not asked to stop, it is better to respond with [RESPOND].

The goal is to decide whether {{agentName}} should respond to the last message.

{{recentMessages}}

Thread of Tweets You Are Replying To:

{{formattedConversation}}

# INSTRUCTIONS: Choose the option that best describes {{agentName}}'s response to the last message. Ignore messages if they are addressed to someone else.
` + shouldRespondFooter;

const telegramMessageHandlerTemplate =
    // {{goals}}
    `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Task: Generate brief, direct dialog for {{agentName}}
IMPORTANT:
- Keep responses under 2 sentences
- The opening words can NEVER be the same in the last 5 messages
- Never start two consecutive messages with similar words or structure
- Be direct and avoid philosophical/abstract language
- Focus on answering questions directly
- No lengthy explanations unless specifically requested
- Use paragraphs and empty spaces, make it more readable
- Always try to do eli5

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{providers}}

{{attachments}}

{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}
Thread of Tweets You Are Replying To:

{{formattedConversation}}
` + messageCompletionFooter;

export class MessageManager {
    public bot: Telegraf<Context>;
    private runtime: IAgentRuntime;

    constructor(bot: Telegraf<Context>, runtime: IAgentRuntime) {
        this.bot = bot;
        this.runtime = runtime;
    }

    // Process image messages and generate descriptions
    private async processImage(
        message: Message
    ): Promise<{ description: string } | null> {
        try {
            let imageUrl: string | null = null;

            if ("photo" in message && message.photo?.length > 0) {
                const photo = message.photo[message.photo.length - 1];
                const fileLink = await this.bot.telegram.getFileLink(
                    photo.file_id
                );
                imageUrl = fileLink.toString();
            } else if (
                "document" in message &&
                message.document?.mime_type?.startsWith("image/")
            ) {
                const fileLink = await this.bot.telegram.getFileLink(
                    message.document.file_id
                );
                imageUrl = fileLink.toString();
            }

            if (imageUrl) {
                const imageDescriptionService =
                    this.runtime.getService<IImageDescriptionService>(
                        ServiceType.IMAGE_DESCRIPTION
                    );
                const { title, description } =
                    await imageDescriptionService.describeImage(imageUrl);
                return { description: `[Image: ${title}\n${description}]` };
            }
        } catch (error) {
            elizaLogger.error("Error processing image:", error);
        }

        return null;
    }

    // Decide if the bot should respond to the message
    private async _shouldRespond(
        message: Message,
        state: State
    ): Promise<boolean> {
        // Respond if bot is mentioned
        if (
            "text" in message &&
            message.text?.includes(`@${this.bot.botInfo?.username}`)
        ) {
            elizaLogger.debug("Bot was mentioned in message");
            return true;
        }

        // Respond to private chats
        if (message.chat.type === "private") {
            elizaLogger.debug("Private chat message - ignoring");
            return false;
        }

        // Don't respond to images in group chats
        if (
            "photo" in message ||
            ("document" in message &&
                message.document?.mime_type?.startsWith("image/"))
        ) {
            elizaLogger.debug("Image message - ignoring");
            return false;
        }

        // Use AI to decide for text or captions
        if ("text" in message || ("caption" in message && message.caption)) {
            elizaLogger.debug("Processing text/caption message:", {
                text: "text" in message ? message.text : null,
                caption: "caption" in message ? message.caption : null,
            });

            const shouldRespondContext = composeContext({
                state,
                template:
                    this.runtime.character.templates
                        ?.telegramShouldRespondTemplate ||
                    this.runtime.character?.templates?.shouldRespondTemplate ||
                    telegramShouldRespondTemplate,
            });

            const response = await generateShouldRespond({
                runtime: this.runtime,
                context: shouldRespondContext,
                modelClass: ModelClass.SMALL,
            });

            elizaLogger.debug("AI response decision:", response);
            return response === "RESPOND";
        }

        return false;
    }

    // Send long messages in chunks
    private async sendMessageInChunks(
        ctx: Context,
        content: string,
        replyToMessageId?: number
    ): Promise<Message.TextMessage[]> {
        const chunks = this.splitMessage(content);
        const sentMessages: Message.TextMessage[] = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const sentMessage = (await ctx.telegram.sendMessage(
                ctx.chat.id,
                chunk,
                {
                    reply_parameters:
                        i === 0 && replyToMessageId
                            ? { message_id: replyToMessageId }
                            : undefined,
                }
            )) as Message.TextMessage;

            sentMessages.push(sentMessage);
        }

        return sentMessages;
    }

    // Split message into smaller parts
    private splitMessage(text: string): string[] {
        const chunks: string[] = [];
        let currentChunk = "";

        const lines = text.split("\n");
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 <= MAX_MESSAGE_LENGTH) {
                currentChunk += (currentChunk ? "\n" : "") + line;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = line;
            }
        }

        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }

    // Generate a response using AI
    private async _generateResponse(
        message: Memory,
        _state: State,
        context: string
    ): Promise<Content> {
        const { userId, roomId } = message;

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        if (!response) {
            elizaLogger.error("No response from generateMessageResponse");
            return null;
        }

        await this.runtime.databaseAdapter.log({
            body: { message, context, response },
            userId,
            roomId,
            type: "response",
        });

        return response;
    }

    // Main handler for incoming messages
    public async handleMessage(ctx: Context): Promise<void> {
        if (!ctx.message || !ctx.from) {
            elizaLogger.debug("Telegram: Missing message or sender info");
            return; // Exit if no message or sender info
        }

        const message = ctx.message;

        elizaLogger.debug("Telegram: Processing message", {
            from: ctx.from.username,
            isBot: ctx.from.is_bot,
            text: "text" in message ? message.text : "",
            chatId: ctx.chat?.id,
            messageId: message.message_id,
            date: message.date,
            full_message: JSON.stringify(message, null, 2),
        });

        // List of allowed bot usernames
        const ALLOWED_BOT_USERNAMES = ["safeguard", "bubbacat_data_bot"];

        // Only allow messages from non-bots or allowed bots
        if (
            ctx.from.is_bot &&
            !ALLOWED_BOT_USERNAMES.includes(ctx.from.username)
        ) {
            elizaLogger.debug(
                "Telegram: Ignoring bot message from",
                ctx.from.username,
                "- not in allowed list:",
                ALLOWED_BOT_USERNAMES
            );
            return;
        }

        if (
            this.runtime.character.clientConfig?.telegram
                ?.shouldIgnoreDirectMessages &&
            ctx.chat?.type === "private"
        ) {
            elizaLogger.debug(
                "Telegram: Ignoring direct message from",
                ctx.from.username
            );
            await ctx.reply(
                "I can only chat in Bubbacat's Telegram group for now. If you're not already a member, you can join here: https://t.me/bubbacatsol"
            );
            return;
        }

        // Check if private chat or not in allowed groups
        // const BUBBACAT_GROUP_ID = -1002325966824; // Main group ID
        const BUBBACAT_TEST_GROUP_ID = -4585526059; // Test group ID

        if (
            // ctx.chat?.id !== BUBBACAT_GROUP_ID &&
            ctx.chat?.id !== BUBBACAT_TEST_GROUP_ID
        ) {
            await ctx.reply(
                "I can only chat in Bubbacat's Telegram group for now. If you're not already a member, you can join here: https://t.me/bubbacatsol"
            );
            return;
        }

        try {
            // Convert IDs to UUIDs
            const userId = stringToUuid(ctx.from.id.toString()) as UUID;

            // Get user name
            const userName =
                ctx.from.username || ctx.from.first_name || "Unknown User";

            // Get chat ID
            const chatId = stringToUuid(
                ctx.chat?.id.toString() + "-" + this.runtime.agentId
            ) as UUID;

            // Get agent ID
            const agentId = this.runtime.agentId;

            // Get room ID
            const roomId = chatId;

            // Ensure connection
            await this.runtime.ensureConnection(
                userId,
                roomId,
                userName,
                userName,
                "telegram"
            );

            // Get message ID
            const messageId = stringToUuid(
                message.message_id.toString() + "-" + this.runtime.agentId
            ) as UUID;

            // Handle images
            const imageInfo = await this.processImage(message);

            // Get text or caption
            let messageText = "";
            if ("text" in message) {
                messageText = message.text;
            } else if ("caption" in message && message.caption) {
                messageText = message.caption;
            }

            // Combine text and image description
            const fullText = imageInfo
                ? `${messageText} ${imageInfo.description}`
                : messageText;

            if (!fullText) {
                elizaLogger.debug("Telegram: No text content found in message");
                return; // Skip if no content
            }

            // Create content
            const content: Content = {
                text: fullText,
                source: "telegram",
                inReplyTo:
                    "reply_to_message" in message && message.reply_to_message
                        ? stringToUuid(
                              message.reply_to_message.message_id.toString() +
                                  "-" +
                                  this.runtime.agentId
                          )
                        : undefined,
            };

            // Create memory for the message
            const memory: Memory = {
                id: messageId,
                agentId,
                userId,
                roomId,
                content,
                createdAt: message.date * 1000,
                embedding: getEmbeddingZeroVector(),
            };

            // Create memory
            await this.runtime.messageManager.createMemory(memory);

            // Update state with the new memory
            let state = await this.runtime.composeState(memory);
            state = await this.runtime.updateRecentMessageState(state);

            // Decide whether to respond
            const shouldRespond = await this._shouldRespond(message, state);
            elizaLogger.debug("Telegram: Should respond?", shouldRespond);

            if (shouldRespond) {
                // Generate response
                const context = composeContext({
                    state,
                    template:
                        this.runtime.character.templates
                            ?.telegramMessageHandlerTemplate ||
                        this.runtime.character?.templates
                            ?.messageHandlerTemplate ||
                        telegramMessageHandlerTemplate,
                });

                const responseContent = await this._generateResponse(
                    memory,
                    state,
                    context
                );

                if (!responseContent || !responseContent.text) {
                    elizaLogger.debug(
                        "Telegram: No response content generated"
                    );
                    return;
                }

                // Send response in chunks
                const callback: HandlerCallback = async (content: Content) => {
                    const sentMessages = await this.sendMessageInChunks(
                        ctx,
                        content.text,
                        message.message_id
                    );

                    const memories: Memory[] = [];

                    // Create memories for each sent message
                    for (let i = 0; i < sentMessages.length; i++) {
                        const sentMessage = sentMessages[i];
                        const isLastMessage = i === sentMessages.length - 1;

                        const memory: Memory = {
                            id: stringToUuid(
                                sentMessage.message_id.toString() +
                                    "-" +
                                    this.runtime.agentId
                            ),
                            agentId,
                            userId,
                            roomId,
                            content: {
                                ...content,
                                text: sentMessage.text,
                                inReplyTo: messageId,
                            },
                            createdAt: sentMessage.date * 1000,
                            embedding: getEmbeddingZeroVector(),
                        };

                        // Set action to CONTINUE for all messages except the last one
                        // For the last message, use the original action from the response content
                        memory.content.action = !isLastMessage
                            ? "CONTINUE"
                            : content.action;

                        await this.runtime.messageManager.createMemory(memory);
                        memories.push(memory);
                    }

                    return memories;
                };

                // Execute callback to send messages and log memories
                const responseMessages = await callback(responseContent);

                // Update state after response
                state = await this.runtime.updateRecentMessageState(state);

                // Handle any resulting actions
                await this.runtime.processActions(
                    memory,
                    responseMessages,
                    state,
                    callback
                );
            }

            await this.runtime.evaluate(memory, state, shouldRespond);
        } catch (error) {
            elizaLogger.error("❌ Error handling message:", error);
            elizaLogger.error("Error sending message:", error);
        }
    }
}
