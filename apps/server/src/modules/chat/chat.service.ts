import { asc, eq } from "drizzle-orm";
import { db } from "../../common/db/index.js";
import { messages,  rooms } from "./chat.schema.js";
import ApiError from "../../common/utils/api-error.js";

const persistMessage = async (
  roomId: string,
  senderId: string,
  content: string,
  messageType: string,
  imageUrl: string,
  flagged: boolean,
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

const getRoomHistory = async(roomId:string,requestingUserId:string)=>{
    const [room] = await db.select().from(rooms).where(eq(rooms.id,roomId))
    if(!room){
        throw ApiError.notFound("Room not found")
    }
    if(requestingUserId === room.userAId && ! room.userBId){
        throw ApiError.forbidden("not a participant in this room");
    }
    const [message] = await db.select().from(messages).where(eq(messages.roomId,roomId)).orderBy(asc(messages.sentAt))
    return message;
};

const endRoom = async(roomId:string)=>{
    const update = await db.update(rooms).set({endedAt: new Date(Date.now())}).where(eq(rooms.id,roomId)).returning()
    return update;
}

export { persistMessage, getRoomHistory,endRoom }