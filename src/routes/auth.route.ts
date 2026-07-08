import { Router } from "express";
import { signup, verifyOTP } from "../controllers/user.controller";

const authRoutes=Router();

authRoutes.post('/signup',signup);
authRoutes.post('/verify-otp',verifyOTP);

export default authRoutes;