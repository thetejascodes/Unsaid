import * as authController from "./auth.controllers.js";
import { Router } from "express";
import validate from "../../common/middlewares/vaidate.middleware.js";
import RequestOtpDto from "./dto/RequestOtpDto.js";
import VerifyOtpDto from "./dto/VerifyOtpDto.js";
import RefreshAccessTokenDto from "./dto/RefreshAccessTokenDto.js";
import isAuthenticated from "../../common/middlewares/auth.middleware.js";
const router = Router()

router.post('/otp/request',validate(RequestOtpDto),authController.requestOtp);
router.post('/otp/verify',validate(VerifyOtpDto),authController.verifyOtp);
router.post('/refresh',validate(RefreshAccessTokenDto),authController.refreshAccessToken)
router.post('/logout',isAuthenticated,validate(RefreshAccessTokenDto),authController.logout)
export default router;