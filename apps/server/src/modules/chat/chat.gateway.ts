import { registerMessageHandler } from "../../common/ws/server.js";
import { persistMessage,endRoom } from "./chat.service.js";
import { checkModeration } from "../ai/moderation.js";
import { getSocket } from "../matching/socket-registry.js";
import {redis} from "../../common/redis/index.js";
import { banDenylistKey } from "../../common/redis/keys.js";
import { db } from "../../common/db/index.js";
import {rooms} from "./chat.schema.js";
import { eq } from "drizzle-orm";
import ApiError from "../../common/utils/api-error.js";

export const lookupPartnerId = async(roomId:string, requestingUserId:string)=>{
    const [room] = await db.select().from(rooms).where(eq(rooms.id,roomId))
    if(!room){
        return;
    }
    if(requestingUserId !== room.userAId && requestingUserId !== room.userBId){
        throw ApiError.forbidden("not a participant in this room")
    }
    return room.userAId === requestingUserId ? room.userBId : room.userAId;;
}
