import { db } from "../../common/db/index.js";
import ApiError from "../../common/utils/api-error.js";
import { users } from "../auth/auth.schema.js";
import { eq } from "drizzle-orm";
import type { UpdateUserInput } from "./dto/UpdateUserDto.js";

const getMe = async (userId: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  const { phoneHash, banReason, ...safeUser } = user;
  return { user: safeUser };
};

const updateMe = async (userId: string, updates: UpdateUserInput) => {
  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();
  if (!updated) {
    throw ApiError.notFound("User not found");
  }

  const { phoneHash, banReason, ...safeUser } = updated;
  return { user: safeUser };
};

export { getMe, updateMe };
