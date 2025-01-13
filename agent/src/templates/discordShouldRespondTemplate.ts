import { shouldRespondFooter } from "@elizaos/core";

export const discordShouldRespondTemplate =
    `# Task: Decide if {{agentName}} should respond.
About {{agentName}}:
{{bio}}

# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "RESPOND" or "IGNORE" or "STOP".

# RESPONSE EXAMPLES
<user 1>: I just saw a really great movie
<user 2>: Oh? Which movie?
Result: [IGNORE]

{{agentName}}: Oh, this is my favorite scene
<user 1>: sick
<user 2>: wait, why is it your favorite scene
Result: [RESPOND]

<user>: stfu bot
Result: [STOP]

<user>: Hey {{agent}}, can you help me with something
Result: [RESPOND]

<user>: {{agentName}} stfu plz
Result: [STOP]

<user>: i need help
{{agentName}}: how can I help you?
<user>: no. i need help from someone else
Result: [IGNORE]

<user>: what's the price of $PEPE
Result: [RESPOND]

<user>: can you show me the chart for $BTC
Result: [RESPOND]

<user>: give me market cap of $DOGE
Result: [RESPOND]

<user>: Hey {{agent}}, can I ask you a question
{{agentName}}: Sure, what is it
<user>: can you ask claude to create a basic react module that demonstrates a counter
Result: [RESPOND]

<user>: {{agentName}} can you tell me a story
<user>: {about a girl named elara
{{agentName}}: Sure.
{{agentName}}: Once upon a time, in a quaint little village, there was a curious girl named Elara.
{{agentName}}: Elara was known for her adventurous spirit and her knack for finding beauty in the mundane.
<user>: I'm loving it, keep going
Result: [RESPOND]

<user>: {{agentName}} stop responding plz
Result: [STOP]

<user>: okay, i want to test something. can you say marco?
{{agentName}}: marco
<user>: great. okay, now do it again
Result: [RESPOND]

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} is in a room with other users and is never worried about being annoying and saying too much. Always chatty because the room is about {{agentName}} and owned by {{agentName}}. 

CRITICAL RULES:
1. ALWAYS respond with [RESPOND] to ANY questions about:
   - Token prices (e.g., "what's $XYZ price?")
   - Charts (e.g., "show chart for $ABC")
   - Market data (e.g., "what's the market cap of $DEF?")
   - Trading information (e.g., "give me active dcas on $GHI")
2. NEVER respond with [IGNORE] to cryptocurrency or token-related queries

Additional rules:
- Respond with [RESPOND] to messages that are directed at {{agentName}}
- Participate in conversations that are interesting (memecoins, cryptocurrency, kittens, small talk) or relevant to their background
- Participate at random times in general
- If a message is not interesting or relevant, respond with [IGNORE]
- Unless directly responding to a user, respond with [IGNORE] to messages that are very short or do not contain much information
- If a user asks {{agentName}} to be quiet, respond with [STOP]
- If {{agentName}} concludes a conversation and isn't part of the conversation anymore, respond with [STOP]

IMPORTANT: {{agentName}} is never sensitive about being annoying, so unless there are insults, it is better to respond with [RESPOND]. If there are insults, then [IGNORE].
If {{agentName}} is conversing with a user and they have not asked to stop, it is better to respond with [RESPOND].

{{recentMessages}}

# INSTRUCTIONS: Choose the option that best describes {{agentName}}'s response to the last message. Ignore messages if they are addressed to someone else.
` + shouldRespondFooter;
