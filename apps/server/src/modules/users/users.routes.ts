import { Router } from "express";
import * as userController from "./users.controller.js";
import validate from "../../common/middlewares/vaidate.middleware.js";
import UpdateUserDto from "./dto/UpdateUserDto.js";
import isAuthenticated from "../../common/middlewares/auth.middleware.js";

const router = Router()

router.get('/me',isAuthenticated,userController.getMe)
router.patch('/me',isAuthenticated,validate(UpdateUserDto),userController.updateMe)

export default router