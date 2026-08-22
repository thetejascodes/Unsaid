import BaseDto from "../../../common/dto/BaseDto.js";
import {z} from "zod";

class VerifyOtpDto extends BaseDto{
    
    static schema = z.object({
            phone: z.string().min(10).max(15),
           code: z.string().length(6),
    })
}

export type  VerifyOtpInput = z.infer<typeof VerifyOtpDto.schema>
export default VerifyOtpDto