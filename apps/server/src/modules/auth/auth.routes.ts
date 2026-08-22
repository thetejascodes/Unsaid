import * as authController from "./auth.controllers.js";
import { Router } from "express";
import validate from "../../common/middlewares/vaidate.middleware.js";
import RequestOtpDto from "./dto/RequestOtpDto.js";
import VerifyOtpDto from "./dto/VerifyOtpDto.js";
const router = Router()

router.post('/otp/request',validate(RequestOtpDto),authController.requestOtp);
router.post('/otp/verify',validate(VerifyOtpDto),authController.verifyOtp);
export default router;