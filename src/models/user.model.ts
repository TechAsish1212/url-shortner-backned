import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export type UserRoles = "admin" | "user";

export interface IUser {
  name: string;
  email: string;
  password: string;

  mobileNumber?: string;
  countryCode?: string;
  dob?: Date;
  gender?: "male" | "female" | "other";

  role: UserRoles;

  emailVerified: boolean;
  isActive: boolean;

  refreshToken?: string;

  emailVerificationOTP?: string;
  emailVerificationOTPExpire?: Date;

  resetPasswordToken?: string;
  resetPasswordExpire?: Date;

  lastLoginAt?: Date;

  matchPassword: (enteredPassword: string) => Promise<boolean>;
  getEmailVerificationOTP: () => string;
  getResetPasswordToken: () => string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Name can't exceed 50 characters"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Provide a valid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    mobileNumber: {
      type: String,
      trim: true,
      default: null,
    },

    countryCode: {
      type: String,
      trim: true,
      default: null,
    },

    dob: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationOTP: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationOTPExpire: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpire: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Hash Password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare Password
userSchema.methods.matchPassword = async function (
  enteredPassword: string,
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate Email Verification OTP
userSchema.methods.getEmailVerificationOTP = function (): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.emailVerificationOTP = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  this.emailVerificationOTPExpire = new Date(
    Date.now() + 10 * 60 * 1000, // 10 min
  );

  return otp;
};

// Generate Reset Password Token
userSchema.methods.getResetPasswordToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = new Date(
    Date.now() + 15 * 60 * 1000, // 15 min
  );

  return resetToken;
};

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export { User };
