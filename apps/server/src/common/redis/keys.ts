
export const queueKey = (mood:string)=>{
    return `queue:${mood}`;
}

export const banDenylistKey = (userId:string)=>{
    return `ban:${userId}`;
}


