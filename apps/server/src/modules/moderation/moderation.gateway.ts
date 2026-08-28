import { db } from "../../common/db/index.js"
import { blocks, reports } from "./moderation.schema.js"

const POSTGRES_UNIQUE_VIOLATION = "23505";

export const  createReport = async(reporterId:string, reportedUserId:string, messageId:string, reason:string)=>{
    const [report] = await db.insert(reports).values({
        reporterId, reportedUserId, messageId, reason
    }).returning()
    return report;
}

export const createBlock = async(blockerId:string, blockedUserId:string)=>{
    try {
        const [block] = await db.insert(blocks).values({
            blockerId,
            blockedUserId,
        }).returning();
        return block;
    } catch (error: any) {
        if(error?.code === POSTGRES_UNIQUE_VIOLATION){
            return;
        }
        throw error;
    }
}

export const banUser = async()=>{

}