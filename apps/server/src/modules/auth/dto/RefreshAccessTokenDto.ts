import BaseDto from "../../../common/dto/BaseDto.js";
import {z} from 'zod'

class RefreshAccessTokenDto extends BaseDto{

    static schema = z.object({
        refreshToken:z.string().nonempty(),
    })
}

export type RefreshAccessTokenInput = z.infer<typeof RefreshAccessTokenDto.schema>;
export default RefreshAccessTokenDto;
