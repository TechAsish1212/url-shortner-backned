import { Router } from "express";
import { getPrpfile, signin, signup, verifyOTP } from "../controllers/user.controller";
import { protect } from "../middlewares/auth.middleware";

const authRoutes=Router();

authRoutes.post('/signup',signup);
authRoutes.post('/signin',signin);
authRoutes.post('/verify-otp',verifyOTP);
authRoutes.get('/me',protect,getPrpfile);

export default authRoutes;