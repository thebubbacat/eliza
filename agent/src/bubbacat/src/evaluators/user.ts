import { Evaluator, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { ChannelType } from "discord.js";
import {
    Client,
    Message as DiscordMessage,
    PermissionsBitField,
    TextChannel,
    ThreadChannel,
} from "discord.js";

const userEvaluator: Evaluator = {
    name: "USER_MESSAGE_EVALUATOR",
    similes: ["MESSAGE_EVALUATOR", "CHANNEL_EVALUATOR"],
    description:
        "Evaluates if a user message should be processed based on channel type and permissions",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        // Always validate messages to allow evaluation
        console.log("userEvaluator validate");

        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<boolean> => {
        console.log("userEvaluator handler");
        return false;

        // const channelType = message.content.channelType;
        // const channelId = message.content.channelId;
        // const userName = message.content.userName;

        // // Check if DM
        // if (channelType === ChannelType.DM) {
        //     // Allow DMs only from allowlisted users
        //     const allowedUsers = ["vivoidos", "oguzserdar"];

        //     if (!allowedUsers.includes(userName)) {
        //         return false;
        //     }
        //     return true;
        // }

        // // Check allowed channels for non-DM messages
        // const NIRAI_CHANNEL = "1305103636556415040";
        // const AI16Z_CHANNEL = "1285105813349859421";

        // const allowedChannels = [
        //     NIRAI_CHANNEL,
        //     AI16Z_CHANNEL
        // ];

        // if (!allowedChannels.includes(channelId)) {
        //     return false;
        // }

        // return true;
    },
    examples: [],
};

export default userEvaluator;
