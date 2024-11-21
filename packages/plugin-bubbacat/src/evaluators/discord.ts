import { ChannelType, Message } from "discord.js";

function checkIfAllowed(message: Message) {
    console.log("Message:", {
        author: message.author?.username,
        bot: message.author?.bot,
        channelType: message.channel.type,
        channelId: message.channel.id,
        content: message.content,
    });

    // Check if message is from a non-bot
    if (!message.author?.bot) {
        console.log("Message is from non-bot user");

        // Check DM messages
        if (message.channel.type === ChannelType.DM) {
            console.log("DM message from:", message.author.username);
            console.log("Message content:", message.content);

            // Allow DMs from allowlisted users
            const allowedUsers = ["vivoidos", "oguzserdar"];
            // console.log("Checking if user is in allowlist:", allowedUsers);

            if (allowedUsers.includes(message.author.username)) {
                console.log("User is in allowlist, allowing message");
                return true;
            }
            console.log("User not in allowlist, rejecting DM");
            message.reply("You can only talk to me in ai16z channel for now");
            return false;
        }

        const channelId = message.channel.id;

        // Channel IDs
        const NIRAI_CHANNEL = "1305103636556415040";
        const AI16Z_CHANNEL = "1285105813349859421";
        const AI16Z_VOICE_CHANNEL = "1253563209462448242";

        const allowedChannels = [NIRAI_CHANNEL, AI16Z_CHANNEL];
        console.log("Allowed channels:", allowedChannels);
        console.log("Current channel:", channelId);

        // Check if message is in allowed channels
        if (allowedChannels.includes(channelId)) {
            console.log("Message is in allowed channel");
            return true;
        }

        // Not in allowed channel
        console.log("Not in allowed channel, ignoring");
        console.log("Message content:", message.content);
        return false;
    }

    console.log("Message is from bot, ignoring");
    return false;
}

export { checkIfAllowed };
