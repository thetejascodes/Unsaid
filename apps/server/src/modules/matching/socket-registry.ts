import {WebSocket} from "ws";
import type { AuthenticatedWebSocket } from "../../common/ws/server.js";

const connectedSockets = new Map<string,AuthenticatedWebSocket>();

export const registerSocket = (userId:string,ws:AuthenticatedWebSocket)=>{
    connectedSockets.set(userId,ws)
}

export const unregisterSocket = (userId:string)=>{
    connectedSockets.delete(userId)
}

export const getSocket = (userId: string): AuthenticatedWebSocket | undefined => {
   return connectedSockets.get(userId)
}
