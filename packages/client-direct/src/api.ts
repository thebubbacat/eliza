import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import { AgentRuntime } from "@ai16z/eliza";

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
    REST,
    Routes,
} from "discord.js";
import { EventEmitter } from "events";

export function createApiRouter(agents: Map<string, AgentRuntime>) {
    const router = express.Router();

    router.use(cors());
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    router.get("/hello", (req, res) => {
        res.json({ message: "Hello World!" });
    });

    router.get("/agents", (req, res) => {
        const agentsList = Array.from(agents.values()).map((agent) => ({
            id: agent.agentId,
            name: agent.character.name,
        }));
        res.json({ agents: agentsList });
    });

    router.get("/agents/:agentId", (req, res) => {
        const agentId = req.params.agentId;
        const agent = agents.get(agentId);

        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        res.json({
            id: agent.agentId,
            character: agent.character,
        });
    });

    router.get("/agents/:agentId/channels", async (req, res) => {
        const agentId = req.params.agentId;
        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Runtime not found" });
            return;
        }

        const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
        const rest = new REST({ version: "10" }).setToken(API_TOKEN);

        try {
            const guilds = (await rest.get(Routes.userGuilds())) as Array<any>;

            res.json({
                id: runtime.agentId,
                guilds: guilds,
                serverCount: guilds.length,
            });
        } catch (error) {
            console.error("Error fetching guilds:", error);
            res.status(500).json({ error: "Failed to fetch guilds" });
        }
    });

    router.post("/agents/:agentId/leave-voice", async (req, res) => {
        const agentId = req.params.agentId;
        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Runtime not found" });
            return;
        }

        runtime.plugins;

        const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
        const rest = new REST({ version: "10" }).setToken(API_TOKEN);

        try {
            // Get bot's user ID
            const botUser = (await rest.get(Routes.user())) as { id: string };

            // Get all guilds
            const guilds = (await rest.get(Routes.userGuilds())) as Array<{
                id: string;
            }>;

            // Loop through each guild
            for (const guild of guilds) {
                try {
                    // Get voice states in the guild
                    const guildVoiceStates = (await rest.get(
                        Routes.guildVoiceState(guild.id, botUser.id)
                    )) as Array<{ user_id: string }>;

                    // Check if bot is in any voice channel in this guild
                    const botVoiceState = guildVoiceStates.find(
                        (state) => state.user_id === botUser.id
                    );

                    if (botVoiceState) {
                        // Delete the voice state to disconnect from voice
                        await rest.delete(
                            Routes.guildVoiceState(guild.id, botUser.id)
                        );
                    }
                } catch (err) {
                    console.error(
                        `Error leaving voice in guild ${guild.id}:`,
                        err
                    );
                    // Continue with other guilds even if one fails
                    continue;
                }
            }

            res.json({ message: "Successfully left all voice channels" });
        } catch (error) {
            console.error("Error leaving voice channels:", error);
            res.status(500).json({ error: "Failed to leave voice channels" });
        }
    });

    return router;
}
