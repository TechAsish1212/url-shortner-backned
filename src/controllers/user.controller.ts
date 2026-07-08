import { Request, Response } from "express";
import { User } from "../models/user.model";
import { sendEmail } from "../utils/mail";
import crypto from 'crypto'


export const signup = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            })
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "User already register with this email",
            })
        }

        const user = await User.create({
            name,
            email,
            password
        });

        const otp = user.getEmailVerificationOTP();

        await user.save();

        const sentOTP = await sendEmail(email, otp);

        if (!sentOTP) {
            return res.status(400).json({
                success: false,
                message: 'Error coming while sending OTP to email'
            })
        }

        return res.status(201).json({
            success: true,
            message: "User signup successfully",
            data: user
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server error"
        })
    }
}


export const verifyOTP = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        const hashedOTP = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        const user = await User.findOne({
            email,
            emailVerificationOTP: hashedOTP,
            emailVerificationOTPExpire: {
                $gt: new Date(),
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        user.emailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationOTPExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        })
    }
}