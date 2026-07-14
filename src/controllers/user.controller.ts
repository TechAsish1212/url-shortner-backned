import { Request, Response } from "express";
import { User } from "../models/user.model";
import { sendEmail } from "../utils/mail";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth.middleware";

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "User already register with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    const otp = user.getEmailVerificationOTP();

    await user.save();

    const sentOTP = await sendEmail(email, otp);

    if (!sentOTP) {
      return res.status(400).json({
        success: false,
        message: "Error coming while sending OTP to email",
      });
    }

    return res.status(201).json({
      success: true,
      message: "User signup successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server error",
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.findOne({
      email,
      emailVerificationOTP: hashedOTP,
      emailVerificationOTPExpire: {
        $gt: new Date(),
      },
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
      success: false,
      message: "Internal server error",
    });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email }).select(
      "+password +refreshToken",
    );
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "user not found with this email",
      });
    }

    const isMatchPass = await existingUser.matchPassword(password);
    if (!isMatchPass) {
      return res.status(400).json({
        success: false,
        message: "user password is incorrect",
      });
    }

    const refreshToken = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: "30d",
      },
    );

    const accessToken = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_SECRET!,
      {
        expiresIn: "15m",
      },
    );
    existingUser.refreshToken = refreshToken;
    existingUser.lastLoginAt = new Date();

    await existingUser.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "User login succesfully",
      data: existingUser,
      token: accessToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getPrpfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {}
};

export const signout = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, mobileNumber, countryCode, dob, gender } = req.body;

    const user = await User.findById(req.user?.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (mobileNumber !== undefined) {
      user.mobileNumber = mobileNumber;
    }

    if (countryCode !== undefined) {
      user.countryCode = countryCode;
    }

    if (dob) {
      const [day, month, year] = dob.split("-");

      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY",
        });
      }

      user.dob = parsedDate;
    //   console.log(user.dob?.toLocaleDateString("en-IN"));
    }

    // if (dob !== undefined) {
    //   user.dob = dob;
    // }

    if (gender !== undefined) {
      user.gender = gender;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile update successfuly",
      user,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
