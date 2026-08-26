import BaseDto from "../../../common/dto/BaseDto.js";
import { z } from "zod";

class SendMessageDto extends BaseDto {
  static schema = z.object({
    roomId: z.string().uuid(),
    content: z.string().min(1).max(2000),
    messageType: z.enum(["text", "image"]).default("text"),
    imageUrl: z.string().url().nullable().optional(),
  });
}

export type SendMessageInput = z.infer<typeof SendMessageDto.schema>;
export default SendMessageDto;