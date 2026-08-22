import type { Request,Response,NextFunction } from "express";
import ApiResponse from "../../common/utils/api-response.js";
import * as authService from "./auth.service.js";

const requestOtp = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {phone} = req.body;
        const result = await authService.requestOtp(phone);
        return ApiResponse.ok(res,"OTP sent",result);
    } catch (error) {
        next(error)
    }
}

const verifyOtp = async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const {phone,code} = req.body;
        const result  = await authService.verifyOtp(phone,code)
        return ApiResponse.ok(res,"Verified",result)
    } catch (error) {
        next(error)
    }
}
export {requestOtp}
