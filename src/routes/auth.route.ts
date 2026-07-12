import { Router } from "express";
import { getPrpfile, signin, signout, signup, updateProfile, verifyOTP } from "../controllers/user.controller";
import { protect } from "../middlewares/auth.middleware";

const authRoutes=Router();

authRoutes.post('/signup',signup);
authRoutes.post('/signin',signin);
authRoutes.post('/signout',signout);
authRoutes.post('/verify-otp',verifyOTP);
authRoutes.get('/me',protect,getPrpfile);
authRoutes.put('/profile',protect,updateProfile);

export default authRoutes;