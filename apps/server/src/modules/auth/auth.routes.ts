import * as authController from "./auth.controllers.js";
import { Router } from "express";
import validate from "../../common/middlewares/vaidate.middleware.js";
import RequestOtpDto from "./dto/RequestOtpDto.js";
const router = Router()

router.post('/otp/request',validate(RequestOtpDto),authController.requestOtp);

export default router;