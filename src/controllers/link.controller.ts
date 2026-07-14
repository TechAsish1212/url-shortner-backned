import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { isValidUrl } from "../utils/validators";
import { Link } from "../models/link.model";
import { codeGenerator } from "../utils/generateShortCode";
import { Types } from "mongoose";

// Extend the AuthRequest type for better type safety
interface AuthenticatedRequest extends AuthRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

// Helper to check if request is authenticated
const isAuthenticated = (req: Request): req is AuthenticatedRequest => {
  return (
    (req as AuthenticatedRequest).user !== undefined &&
    (req as AuthenticatedRequest).user.id !== undefined
  );
};

// create short link
export const createShortUrl = async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { originalUrl, customAlias, expiresAt } = req.body;
    const userId = req.user.id;

    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        message: "Orginal url is required",
      });
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid URL format. Please provide a valid URL with http:// or https://",
      });
    }

    let shortCode: string;

    // handle custom alias
    if (customAlias) {
      if (customAlias.length < 3 || customAlias.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Custom alias must be between 3 and 20 characters",
        });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
        return res.status(400).json({
          success: false,
          message:
            "Custom alias can only contain letters, numbers, underscores, and hyphens",
        });
      }

      const existingLink = await Link.findOne({ customAlias: customAlias });
      if (existingLink) {
        return res.status(409).json({
          success: false,
          message: "Custom alias is already taken. Please choose another one",
        });
      }

      shortCode = customAlias;
    } else {
      try {
        shortCode = await codeGenerator.generateUniqueCode(
          async (code: string) => {
            const existing = await Link.findOne({
              $or: [{ shortCode: code }, { customAlias: code }],
            });
            return !!existing;
          },
          10,
          8,
        );
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate unique short code. Please try again",
        });
      }
    }

    let expiresAtDate = undefined;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiration date format",
        });
      }
      if (expiresAtDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Expiration date must be in the future",
        });
      }
    } else {
      expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + 30);
    }

    // new link
    const newLink = await Link.create({
      userId: new Types.ObjectId(userId),
      originalUrl,
      shortCode,
      customAlias: customAlias || undefined,
      expiresAt: expiresAtDate,
      isActive: true,
      totalClicks: 0,
      uniqueClicks: 0,
    });

    await newLink.save();

    const baseUrl = process.env.BASE_URL || "http://localhost:5001";
    const shortUrl = `${baseUrl}/${shortCode}`;

    res.status(201).json({
      success: true,
      message: "Create URL shortlink successfully",
      data: {
        id: newLink._id,
        originalUrl: newLink.originalUrl,
        shortCode: newLink.shortCode,
        customAlias: newLink.customAlias || null,
        shortUrl,
        expiresAt: newLink.expiresAt || null,
        isActive: newLink.isActive,
        createdAt: newLink.createdAt,
        totalClicks: newLink.totalClicks,
        uniqueClicks: newLink.uniqueClicks,
      },
    });
  } catch (error) {
    console.error("Error creating short URL:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create short URL. Please try again later",
    });
  }
};

// redirect to original url
export const redirectToOriginalUrl = async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    if (!shortCode) {
      return res.status(400).json({
        success: false,
        message: "short code is required",
      });
    }

    // find link
    const link = await Link.findOne({
      $or: [{ shortCode }, { customAlias: shortCode }],
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Short URL not founnd",
      });
    }

    if (!link.isActive) {
      return res.status(410).json({
        success: false,
        message: "Link has been deactivated by owner",
      });
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(410).json({
        success: false,
        message: "Link has expired",
      });
    }

    // total clicks
    link.totalClicks += 1;

    // unique clicks
    const clientIp = req.ip || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    // Simple unique tracking - you might want to use a more sophisticated method
    // Store visitor info in a separate collection for detailed analytics
    if (!req.cookies?.visited) {
      link.uniqueClicks += 1;
      res.cookie("visited", Date.now().toString(), {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    await link.save();

    // log
    console.log(
      `Redirect: ${shortCode} -> ${link.originalUrl} | IP: ${clientIp} | UA: ${userAgent}`,
    );

    console.log(link.totalClicks);
    console.log(link.uniqueClicks);
    return res.redirect(link.originalUrl);
  } catch (error) {
    console.error("Error redirecting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to redirect. Please try again later",
    });
  }
};


