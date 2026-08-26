import { db } from "../../common/db/index.js";
import { messages } from "./chat.schema.js";

const persistMessage = async (
  roomId: string,
  senderId: string,
  content: string,
  messageType: string,
  imageUrl: string,
  flagged: string,
) => {
    const [message] = await db.insert(messages).values({
        roomId,
        senderId,
        content,
        messageType,
        imageUrl,
        flaggedAt:flagged? new Date(Date.now()) : null
    }).returning()
    return message;
};


export { persistMessage }