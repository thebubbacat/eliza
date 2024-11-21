import { ChannelType, Message } from "discord.js";

function checkIfAllowed(message: Message) {
    // Check if should ignore bot messages
    if (message.author?.bot) {
        return false;
    }

    // Check if should ignore DMs
    if (message.channel.type === ChannelType.DM) {
        console.log("DM message from:", message.author.username);
        console.log("Message content:", message.content);

        // Allow DMs from allowlisted users
        const allowedUsers = ["vivoidos", "oguzserdar"];
        if (!allowedUsers.includes(message.author.username)) {
            message.reply("You can only talk to me in ai16z channel for now");
            return false;
        }
    }

    const channelId = message.channel.id;

    // Channel IDs
    const NIRAI_CHANNEL = "1305103636556415040";
    const AI16Z_CHANNEL = "1285105813349859421";
    const AI16Z_VOICE_CHANNEL = "1253563209462448242";

    const allowedChannels = [NIRAI_CHANNEL, AI16Z_CHANNEL];

    // Check if message is in allowed channels
    if (
        !allowedChannels.includes(channelId) &&
        message.channel.type !== ChannelType.DM
    ) {
        console.log("Not in ai16z channel, ignoring");
        console.log("Message content:", message.content);
        return false;
    }

    // Check if voice channel
    if (channelId === AI16Z_VOICE_CHANNEL) {
        console.log("Voice channel, ignoring");
        return false;
    }

    return true;
}

export { checkIfAllowed };
