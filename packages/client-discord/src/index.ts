import { embeddingZeroVector } from "@ai16z/eliza";
import { Character, Client as ElizaClient, IAgentRuntime } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import {
    Client,
    Events,
    GatewayIntentBits,
    Guild,
    MessageReaction,
    Partials,
    User,
} from "discord.js";
import { EventEmitter } from "events";
import { getVoiceConnection } from "@discordjs/voice";
import chat_with_attachments from "./actions/chat_with_attachments.ts";
import download_media from "./actions/download_media.ts";
import leavevoice from "./actions/leavevoice.ts";
import summarize from "./actions/summarize_conversation.ts";
import transcribe_media from "./actions/transcribe_media.ts";
import { MessageManager } from "./messages.ts";
import channelStateProvider from "./providers/channelState.ts";
import voiceStateProvider from "./providers/voiceState.ts";
import { VoiceManager } from "./voice.ts";

export class DiscordClient extends EventEmitter {
    apiToken: string;
    client: Client;
    runtime: IAgentRuntime;
    character: Character;
    private messageManager: MessageManager;
    private voiceManager: VoiceManager;
    private leaveInterval: NodeJS.Timeout | null = null;

    constructor(runtime: IAgentRuntime) {
        super();
        this.apiToken = runtime.getSetting("DISCORD_API_TOKEN") as string;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessageTyping,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildMessageReactions,
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.User,
                Partials.Reaction,
            ],
        });

        this.runtime = runtime;
        this.voiceManager = new VoiceManager(this);
        this.messageManager = new MessageManager(this, this.voiceManager);

        // Only register essential actions
        this.runtime.registerAction(leavevoice);
        this.runtime.registerAction(summarize);
        this.runtime.registerAction(chat_with_attachments);
        this.runtime.registerAction(transcribe_media);
        this.runtime.registerAction(download_media);

        this.runtime.providers.push(channelStateProvider);
        this.runtime.providers.push(voiceStateProvider);

        this.setupEventListeners();
        this.client.login(this.apiToken);
    }

    private leaveVoice() {
        if (!this.client?.guilds) return;

        try {
            // Only use getVoiceConnection and destroy
            this.client.guilds.cache.forEach((guild) => {
                try {
                    const connection = getVoiceConnection(guild.id);
                    if (connection) {
                        connection.destroy();
                    }
                } catch (e) {
                    // Silently handle connection errors
                }
            });

            // Safely clear adapters if they exist
            if (this.client.voice?.adapters) {
                try {
                    this.client.voice.adapters.clear();
                } catch (e) {
                    // Silently handle adapter errors
                }
            }
        } catch (error) {
            // Log error but don't throw
            console.error("Leave voice error:", error);
        }
    }

    private setupEventListeners() {
        // Client ready handler
        this.client.once(Events.ClientReady, (c) => {
            elizaLogger.success(`Logged in as ${c.user.tag}`);

            // Start periodic leave check
            if (!this.leaveInterval) {
                this.leaveInterval = setInterval(() => this.leaveVoice(), 1000);
            }

            // Initial leave attempt
            this.leaveVoice();
        });

        // Voice state update - use only safe methods
        this.client.on("voiceStateUpdate", (oldState, newState) => {
            if (newState.member?.user.id === this.client.user?.id) {
                const connection = getVoiceConnection(newState.guild.id);
                if (connection) {
                    connection.destroy();
                }
            }
        });

        // Basic guild create handler
        this.client.on("guildCreate", (guild: Guild) => {
            console.log(`Joined guild ${guild.name}`);
            this.leaveVoice();
        });

        // Message handler
        this.client.on(
            Events.MessageCreate,
            this.messageManager.handleMessage.bind(this.messageManager)
        );

        // Reaction handlers
        this.client.on(
            Events.MessageReactionAdd,
            this.handleReactionAdd.bind(this)
        );

        this.client.on(
            Events.MessageReactionRemove,
            this.handleReactionRemove.bind(this)
        );

        // Interaction handler - simplified
        this.client.on("interactionCreate", async (interaction: any) => {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === "joinchannel") {
                await interaction
                    .reply("Voice join is disabled.")
                    .catch(() => {});
                return;
            }

            if (interaction.commandName === "leavechannel") {
                this.leaveVoice();
                await interaction
                    .reply("Leaving voice channels.")
                    .catch(() => {});
            }
        });
    }

    async handleReactionAdd(reaction: MessageReaction, user: User) {
        // ... existing reaction add handler code ...
    }

    async handleReactionRemove(reaction: MessageReaction, user: User) {
        elizaLogger.log("Reaction removed");
        // if (user.bot) return;

        let emoji = reaction.emoji.name;
        if (!emoji && reaction.emoji.id) {
            emoji = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
        }

        // Fetch the full message if it's a partial
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error(
                    "Something went wrong when fetching the message:",
                    error
                );
                return;
            }
        }

        const messageContent = reaction.message.content;
        const truncatedContent =
            messageContent.length > 50
                ? messageContent.substring(0, 50) + "..."
                : messageContent;

        const reactionMessage = `*Removed <${emoji} emoji> from: "${truncatedContent}"*`;

        const roomId = stringToUuid(
            reaction.message.channel.id + "-" + this.runtime.agentId
        );
        const userIdUUID = stringToUuid(user.id);

        // Generate a unique UUID for the reaction removal
        const reactionUUID = stringToUuid(
            `${reaction.message.id}-${user.id}-${emoji}-removed-${this.runtime.agentId}`
        );

        const userName = reaction.message.author.username;
        const name = reaction.message.author.displayName;

        await this.runtime.ensureConnection(
            userIdUUID,
            roomId,
            userName,
            name,
            "discord"
        );

        try {
            // Save the reaction removal as a message
            await this.runtime.messageManager.createMemory({
                id: reactionUUID, // This is the ID of the reaction removal message
                userId: userIdUUID,
                agentId: this.runtime.agentId,
                content: {
                    text: reactionMessage,
                    source: "discord",
                    inReplyTo: stringToUuid(
                        reaction.message.id + "-" + this.runtime.agentId
                    ), // This is the ID of the original message
                },
                roomId,
                createdAt: Date.now(),
                embedding: embeddingZeroVector,
            });
        } catch (error) {
            console.error("Error creating reaction removal message:", error);
        }
    }

    private handleGuildCreate(guild: Guild) {
        console.log(`Joined guild ${guild.name}`);
        this.voiceManager.scanGuild(guild);
    }

    private async handleInteractionCreate(interaction: any) {
        if (!interaction.isCommand()) return;

        switch (interaction.commandName) {
            case "joinchannel":
                await this.voiceManager.handleJoinChannelCommand(interaction);
                break;
            case "leavechannel":
                await this.voiceManager.handleLeaveChannelCommand(interaction);
                break;
        }
    }

    private async onReady() {
        const guilds = await this.client.guilds.fetch();
        for (const [, guild] of guilds) {
            const fullGuild = await guild.fetch();
            this.voiceManager.scanGuild(fullGuild);
        }
    }
}

export function startDiscord(runtime: IAgentRuntime) {
    return new DiscordClient(runtime);
}

export const DiscordClientInterface: ElizaClient = {
    start: async (runtime: IAgentRuntime) => new DiscordClient(runtime),
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Discord client does not support stopping yet");
    },
};
