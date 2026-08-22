import BaseDto from "../../../common/dto/BaseDto.js";
import {z} from 'zod'

class RequestOtpDto extends BaseDto{

    static schema = z.object({
        phone:z.string().min(10).max(15),
    })
}

export type RequestOtpInput = z.infer<typeof RequestOtpDto.schema>;
export default RequestOtpDto;
