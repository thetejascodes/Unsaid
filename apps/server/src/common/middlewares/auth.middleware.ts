import type { Request, Response, NextFunction } from "express";
import ApiError from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/jwt.utils.js";
const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer")) {
      throw ApiError.unauthorized("No token provided");
    }
    const token = header.replace("Bearer ", "");
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch (error) {
    next(error);
  }
};

export default isAuthenticated;