import { db } from "../../common/db/index.js";
import { users, otpCodes, sessions } from "./auth.schema.js";
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import sendOtp from "./otp.js";
import ApiError from "../../common/utils/api-error.js";
import crypto, { randomInt } from 'crypto'
import { eq,gt,and,count } from "drizzle-orm";

const hashToken = (token:string) => crypto.createHash("sha256").update(token).digest("hex")

const requestOtp = async(phone:string)=>{
  const phoneHash = hashToken(phone)
  const oneHourAgo  = new Date(Date.now() - 60 * 60 * 1000);
  const row = await db.select({recentCount: count() }).from(otpCodes).where(and(eq(otpCodes.phoneHash,phoneHash),gt(otpCodes.createdAt,oneHourAgo )));
  const recentCount = row[0]?.recentCount?? 0;
  if(recentCount >= 3){
    throw ApiError.tooManyRequests("Too many attempts, try again later")
  }
  const code = randomInt(100000,999999).toString();
  const codeHash = hashToken(code);
  const otpCode = await db.insert(otpCodes).values({
    phoneHash:phoneHash,
    codeHash:codeHash,
    expiresAt:new Date(Date.now() + 5 * 60 * 1000),
    consumed:false  
  })

   await sendOtp(phone,code);
  return {success:true}
}
