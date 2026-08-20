import ApiError from "../utils/api-error.js";
import {z} from "zod"
import type { Request,Response,NextFunction } from "express";
import type BaseDto from "../dto/BaseDto.js";

const validate = <T>(dto:BaseDto<T>)=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        const {errors,value} =  dto.validate(req.body as object)
        if(errors){
        throw  ApiError.badRequest(errors.join("; "))
       }
       req.body = value
       next();
    }
}
 export default validate;