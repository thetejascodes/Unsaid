import { db } from "../../common/db/index.js"
import { reports } from "./moderation.schema.js"

export const  createReport = async(reporterId:string, reportedUserId:string, messageId:string, reason:string)=>{
    const [report] = await db.insert(reports).values({
        reporterId, reportedUserId, messageId, reason
    }).returning()
    return report;
}

export const createBlock = async()=>{

}

export const banUser = async()=>{

}