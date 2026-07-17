import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Link } from "../models/link.model";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import { ClickEvent } from "../models/clickEvent.model";

interface AuthenticatedRequest extends AuthRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

const isAuthenticated = (req: Request): req is AuthenticatedRequest => {
  return (
    (req as AuthenticatedRequest).user !== undefined &&
    (req as AuthenticatedRequest).user.id !== undefined
  );
};

const getClientIp = (req: Request): string => {
  return (
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    ""
  )
    .split(",")[0]
    .trim();
};

// Helper to generate visitor ID (using IP + User Agent)
const generateVisitorId = (ip: string, userAgent: string): string => {
  const crypto = require("crypto");
  return crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}`)
    .digest("hex")
    .substring(0, 16);
};

// Helper to hash IP for privacy
const hashIP = (ip: string): string => {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
};

// track client event
export const trackClient = async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    if (!shortCode) {
      return res.status(400).json({
        success: false,
        message: "Short ",
      });
    }

    const link = await Link.findOne({
      $or: [{ shortCode }, { customAlias: shortCode }],
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Short URL not found",
      });
    }

    if (!link.isActive) {
      return res.status(410).json({
        success: false,
        message: "This link is deactivated",
      });
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(410).json({
        success: false,
        message: "This link is expired",
      });
    }

    const clientIp = getClientIp(req);
    console.log("Client IP:", clientIp);

    const userAgent = req.headers["user-agent"] || "";
    console.log("User-Agent:", req.headers["user-agent"]);

    const referer = req.headers["referer"] || req.headers["origin"] || "";

    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();
    console.log("UA Result:", uaResult);

    const geoData = geoip.lookup(clientIp) || {
      country: "Unknown",
      city: "Unknown",
      region:"Unknown"
    };
    console.log("Geo Data:", geoData);

    const visitorId = generateVisitorId(clientIp, userAgent);

    const existingClick = await ClickEvent.findOne({
      linkId: link._id,
      visitorId: visitorId,
    });

    if (!existingClick) {
      link.uniqueClicks += 1;
    }

    link.totalClicks += 1;
    await link.save();

    const clickEvent = new ClickEvent({
      linkId: link._id,
      visitorId: visitorId,
      ipHash: hashIP(clientIp),
      country: geoData.country || "Unknown",
      city: geoData.city || "Unknown",
      region:geoData.region||"Unknown",
      deviceType: uaResult.device.type || "desktop",
      browser: uaResult.browser.name || "Unknown",
      os: uaResult.os.name || "Unknown",
      referer: referer || undefined,
      clickedAt: new Date(),
    });

    await clickEvent.save();

    console.log(
      `Click tracked: ${shortCode} | IP: ${clientIp} | Device: ${uaResult.device.type || "desktop"}`,
    );

    console.log("x-forwarded-for:", req.headers["x-forwarded-for"]);
    console.log("req.ip:", req.ip);
    console.log("remoteAddress:", req.socket.remoteAddress);

    res.status(200).json({
      success: true,
      data: {
        linkId: link._id,
        originalUrl: link.originalUrl,
        visitorId: visitorId,
        isNewVisitor: !existingClick,
        clickedAt: clickEvent.clickedAt,
      },
    });
  } catch (error: any) {
    console.error("Error tracking click:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track click",
    });
  }
};
