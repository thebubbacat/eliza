import { embeddingZeroVector } from "@ai16z/eliza/src/memory.ts";
import {
    Character,
    Client as ElizaClient,
    IAgentRuntime,
} from "@ai16z/eliza/src/types.ts";
import { stringToUuid } from "@ai16z/eliza/src/uuid.ts";
import { elizaLogger } from "@ai16z/eliza/src/logger.ts";
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
import priceAction from "./actions/price.ts";

export class DiscordClient extends EventEmitter {
    apiToken: string;
    private client: Client;
    private runtime: IAgentRuntime;
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
        // this.runtime.registerAction(dcaAction);
        this.runtime.registerAction(priceAction);

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
        // ... existing reaction remove handler code ...
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
