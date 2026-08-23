import BaseDto from "../../../common/dto/BaseDto.js";
import {z} from 'zod'

class UpdateUserDto extends BaseDto{

    static schema = z.object({
        username: z.string().min(3).max(32).optional(),
        avatarUrl: z.string().url().optional(),
        bio: z.string().max(280).optional(),
    })
}

export type UpdateUserInput = z.infer<typeof UpdateUserDto.schema>;
export default UpdateUserDto;
