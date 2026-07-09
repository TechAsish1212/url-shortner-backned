import { Router } from "express";
import { signin, signup, verifyOTP } from "../controllers/user.controller";

const authRoutes=Router();

authRoutes.post('/signup',signup);
authRoutes.post('/signin',signin);
authRoutes.post('/verify-otp',verifyOTP);

export default authRoutes;