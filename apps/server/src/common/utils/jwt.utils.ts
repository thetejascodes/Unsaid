import  jwt, { type SignOptions } from 'jsonwebtoken'

export const  generateAccessToken = (payload: { userId: string })=>{
    const options : SignOptions = {
        expiresIn:(process.env.Access_expire_time as SignOptions['expiresIn']) ?? '15m' 
    }
    return jwt.sign(payload,process.env.Access_secret as string,options)
}

 export const  verifyAccessToken = (token:string)=>{
    return jwt.verify(token,process.env.Access_secret as string);
 }

 export const generateRefreshToken = (payload: { userId: string })=>{
    const options : SignOptions = {
        expiresIn:(process.env.Refresh_expire_time as SignOptions['expiresIn']) ?? '7d'
    }
    return jwt.sign(payload,process.env.Refresh_secret as string,options);
 }

 export const verifyRefreshToken = (token:string)=>{
    return jwt.verify(token,process.env.Refresh_secret as string);
 }