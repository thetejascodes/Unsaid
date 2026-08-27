import OpenAI from "openai";
import config from "../../common/config/index.js";

const client = new OpenAI({
  apiKey: config.ai.apiKey,
  baseURL: config.ai.baseUrl,
});

export const checkModeration = async (content: string) => {
  try {
    const completion = await client.chat.completions.create({
      model: config.ai.moderationModel,
      messages: [
        {
          role: "user",
          content:
            "Analyze this message for safety concerns " +
            "(self-harm, harassment, spam). Respond with ONLY valid JSON, " +
            'no other text: { "flagged": boolean, "category": string | null } ' +
            "Message: " +
            content,
        },
      ],
      temperature: 0,
      max_tokens: 200,
      stream: false,
    });
    const textOutput = completion.choices[0]?.message?.content;
    if (!textOutput) {
      return { flagged: false, category: null };
    }
    const parsed = JSON.parse(textOutput);
    return parsed;
  } catch (error) {
    console.error("Moderation check failed:", error);
    return { flagged: false, category: null };
  }
};
