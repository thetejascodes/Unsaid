import * as userService from "./users.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response, NextFunction } from "express";

const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const result = await userService.getMe(userId);
    return ApiResponse.ok(res, "Profile", result);
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const result = await userService.updateMe(userId, req.body);
    return ApiResponse.ok(res, "Profile Updated",result);
  } catch (error) {
    next(error);
  }
};

export { getMe,updateMe };
