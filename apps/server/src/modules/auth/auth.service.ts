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
import crypto, { randomInt } from "crypto";
import { eq, gt, and, count, lt, desc } from "drizzle-orm";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const requestOtp = async (phone: string) => {
  const phoneHash = hashToken(phone);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const row = await db
    .select({ recentCount: count() })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneHash, phoneHash),
        gt(otpCodes.createdAt, oneHourAgo),
      ),
    );
  const recentCount = row[0]?.recentCount ?? 0;
  if (recentCount >= 3) {
    throw ApiError.tooManyRequests("Too many attempts, try again later");
  }
  const code = randomInt(100000, 999999).toString();
  const codeHash = hashToken(code);
  const otpCode = await db.insert(otpCodes).values({
    phoneHash: phoneHash,
    codeHash: codeHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    consumed: false,
  });

  await sendOtp(phone, code);
  return { success: true };
};

const verifyOtp = async (phone: string, submittedCode: string) => {
  const phoneHash = hashToken(phone);
  const submitedCodeHash = hashToken(submittedCode);
  const currentTime = new Date(Date.now());
  const consumedRow = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phoneHash, phoneHash),
          eq(otpCodes.codeHash, submitedCodeHash),
          eq(otpCodes.consumed, false),
          gt(otpCodes.expiresAt, currentTime),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1)
      .for("update");
    if (!row) {
      throw ApiError.badRequest("Invalid or expired code");
    }
    const [updated] = await tx
      .update(otpCodes)
      .set({ consumed: true })
      .where(eq(otpCodes.id, row.id))
      .returning();
    return updated;
  });
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.phoneHash, phoneHash));
  let user;
  if (!existingUser) {
    const generatedUsername = `user_${Math.random().toString(36).substring(2, 10)}`;
    const [newUser] = await db
      .insert(users)
      .values({ phoneHash, username: generatedUsername })
      .returning();
    user = newUser;
  } else {
    user = existingUser;
  }
  if (!user) {
    throw new Error("User should exist at this point");
  }
  if (user?.bannedAt) {
    throw ApiError.forbidden("User is banned");
  }
  const accessToken = generateAccessToken({ userId: user.id });
  const refreshToken = generateRefreshToken({ userId: user.id });
  const refreshTokenHash = hashToken(refreshToken);
  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  const { phoneHash: _phoneHash, banReason, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
};

const refreshAccessToken = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const refreshTokenHash = hashToken(refreshToken);
  const tokens = await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, refreshTokenHash),
          eq(sessions.userId, payload.userId),
        ),
      )
      .for("update");
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date(Date.now())
    ) {
      throw ApiError.unauthorized("Session invalid or expired");
    }
    await tx
      .update(sessions)
      .set({ revokedAt: new Date(Date.now()) })
      .where(eq(sessions.id, session.id));
    const newAccessToken = generateAccessToken({ userId: payload.userId });
    const newRefreshToken = generateRefreshToken({ userId: payload.userId });
    const newRefreshTokenHash = hashToken(newRefreshToken);
    await tx.insert(sessions).values({
      userId: payload.userId,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return { newAccessToken, newRefreshToken };
  });
  return {
    accessToken: tokens.newAccessToken,
    refreshToken: tokens.newRefreshToken,
  };
};

const logout = async (refreshToken: string) => {
  const refreshTokenHash = hashToken(refreshToken);
  await db
    .update(sessions)
    .set({ revokedAt: new Date(Date.now()) })
    .where(eq(sessions.refreshTokenHash, refreshTokenHash));
};
export { requestOtp, verifyOtp, refreshAccessToken, logout };
