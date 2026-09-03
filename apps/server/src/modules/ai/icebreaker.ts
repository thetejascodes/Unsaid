import { aiClient } from "../../common/ai/client.js";
import config from "../../common/config/index.js";

const lastIcebreakerByRoom = new Map<string, string>();

export const generateIcebreaker = async (context: { mood: string; roomId: string }) => {
  const previous = lastIcebreakerByRoom.get(context.roomId);

  try {
    const completion = await aiClient.chat.completions.create({
      model: config.ai.icebreakerModel,
      messages: [
        {
          role: "user",
          content:
            "Two strangers just matched because they both feel " +
            context.mood +
            ". Give me ONE single casual conversation starter for them, as a single sentence. " +
            "Do not give options, a list, numbering, or any preamble — output only the one sentence itself, nothing else." +
            (previous
              ? ` Do not repeat or closely rephrase this previous suggestion: "${previous}"`
              : ""),
        },
      ],
      temperature: 1.0,
      max_tokens: 100,
      stream: false,
    });

    const suggestion = completion.choices[0]?.message?.content;
    if (!suggestion) {
      console.error(
        "Icebreaker generation returned no content (finish_reason:",
        completion.choices[0]?.finish_reason,
        ")",
      );
    }
    const result = suggestion || "What's been on your mind today?";
    lastIcebreakerByRoom.set(context.roomId, result);
    return result;
  } catch (error) {
    console.error("Icebreaker generation failed:", error);
    return "What's been on your mind today?";
  }
};

export const clearIcebreakerHistory = (roomId: string) => {
  lastIcebreakerByRoom.delete(roomId);
};