import { aiClient } from "./moderation.js";
import config from "../../common/config/index.js";

export const generateIcebreaker = async (context: {
  mood: string;
}) => {
  try {
    const completion = await aiClient.chat.completions.create({
      model: config.ai.icebreakerModel,
      messages: [
        {
          role: "user",
          content:
            "Suggest a short, warm conversation starter for two strangers who matched because they both feel " +
            context.mood +
            ". One sentence, casual, no therapy-speak.",
        },
      ],
      temperature: 0.9,
      max_tokens: 100,
      stream: false,
    });

    const suggestion = completion.choices[0]?.message?.content;
    return suggestion || "What's been on your mind today?";
  } catch (error) {
    console.error("Icebreaker generation failed:", error);
    return "What's been on your mind today?";
  }
};
