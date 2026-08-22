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
import crypto from 'crypto'

const hashToken = (token:string) => crypto.createHash("sha256").update(token).digest("hex")

