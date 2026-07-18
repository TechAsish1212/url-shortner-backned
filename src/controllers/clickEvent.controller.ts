import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Link } from "../models/link.model";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import { ClickEvent } from "../models/clickEvent.model";
import { Types } from "mongoose";

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
      region: "Unknown",
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
      region: geoData.region || "Unknown",
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

// get click events for a specific link
export const getLinkClicksEvent = async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { linkId } = req.params;
    const userId = req.user.id;

    const linkIdString = typeof linkId === "string" ? linkId : linkId?.[0];

    if (!Types.ObjectId.isValid(linkIdString)) {
      return res.status(400).json({
        success: false,
        message: "Invalid link ID",
      });
    }

    const link = await Link.findOne({
      _id: new Types.ObjectId(linkIdString),
      userId: new Types.ObjectId(userId),
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found or you don't have permission",
      });
    }

    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      deviceType,
      browser,
      country,
    } = req.query;

    const query: any = { linkId: new Types.ObjectId(linkIdString) };

    if (startDate || endDate) {
      query.clickedAt = {};
      if (startDate) {
        query.clickedAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.clickedAt.$gte = new Date(endDate as string);
      }
    }

    if (deviceType) {
      query.deviceType = deviceType;
    }

    if (browser) {
      query.browser = browser;
    }

    if (country) {
      query.country = country;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [clickEvents, totalCount, stats] = await Promise.all([
      ClickEvent.find(query)
        .sort({ clickedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ClickEvent.countDocuments(query),
      ClickEvent.aggregate([
        { $match: { linkId: new Types.ObjectId(linkIdString) } },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
            devices: { $addToSet: "$deviceType" },
            browsers: { $addToSet: "$browser" },
            countries: { $addToSet: "$country" },
          },
        },
      ]),
    ]);

    const statsData = stats[0] || {
      totalClicks: 0,
      uniqueVisitors: [],
      devices: [],
      browsers: [],
      countries: [],
    };

    res.status(200).json({
      success: true,
      data: {
        clickEvents,
        stats: {
          totalClicks: statsData.totalClicks,
          uniqueVisitors: statsData.uniqueVisitors.length,
          devices: statsData.devices,
          browsers: statsData.browsers,
          countries: statsData.countries,
        },
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalItems: totalCount,
          itemsPerPage: Number(limit),
          hasNextPage: Number(page) < Math.ceil(totalCount / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching click events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch click events",
    });
  }
};

// get click analytics woth aggregations
export const getClickAnalytics = async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { linkId } = req.params;
    const userId = req.user.id;

    const linkIdString = typeof linkId === "string" ? linkId : linkId?.[0];

    if (!Types.ObjectId.isValid(linkIdString)) {
      return res.status(400).json({
        success: false,
        message: "Invlid link Id",
      });
    }

    const link = await Link.findOne({
      _id: new Types.ObjectId(linkIdString),
      userId: new Types.ObjectId(userId),
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found or you don't have permission",
      });
    }

    const { period = "7d" } = req.query;

    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case "24h":
        startDate.setDate(now.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const matchCondition = {
      linkId: new Types.ObjectId(linkIdString),
      clickedAt: { $gte: startDate, $lte: now },
    };

    // daily click
    const dailyClicks = await ClickEvent.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            year: { $year: "$clickedAt" },
            month: { $month: "$clickedAt" },
            day: { $dayOfMonth: "$clickedAt" },
          },
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorId" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // get device breakdown
    const deviceStats = await ClickEvent.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$deviceType",
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$vistorId" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get browser distribution
    const browserStats = await ClickEvent.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$browser",
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorId" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // get os breackdown
    const osStats = await ClickEvent.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$os",
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: "visitorId" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // get country breakdown
    const countryStats = await ClickEvent.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorId" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get referer stats
    const refererStats = await ClickEvent.aggregate([
      { $match: matchCondition },
      { $match: { referer: { $ne: null } } },
      {
        $group: {
          _id: "$referer",
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorId" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Calculate total unique visitors
    const uniqueVisitors = await ClickEvent.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$visitorId" } },
      { $count: "total" },
    ]);

    // Format daily clicks for chart
    const formattedDailyClicks = dailyClicks.map((day: any) => ({
      date: new Date(day._id.year, day._id.month - 1, day._id.day),
      clicks: day.count,
      uniqueVisitors: day.uniqueVisitors.length,
    }));

    // response
    res.status(200).json({
      success: true,
      data: {
        period,
        summary: {
          totalClicks: formattedDailyClicks.reduce(
            (sum, d) => sum + d.clicks,
            0,
          ),
          uniqueVisitors: uniqueVisitors[0]?.total || 0,
          averageClicksPerDay:
            formattedDailyClicks.length > 0
              ? Math.round(
                  formattedDailyClicks.reduce((sum, d) => sum + d.clicks, 0) /
                    formattedDailyClicks.length,
                )
              : 0,
          startDate,
          endDate: now,
        },
        dailyClicks: formattedDailyClicks,
        devices: deviceStats.map((d) => ({
          type: d._id || "Unknown",
          clicks: d.count,
          uniqueVisitors: d.uniqueVisitors.length,
          percentage: Math.round(
            (d.count /
              (formattedDailyClicks.reduce((sum, d) => sum + d.clicks, 0) ||
                1)) *
              100,
          ),
        })),
        browsers: browserStats.map((b) => ({
          name: b._id || "Unknown",
          clicks: b.count,
          uniqueVisitors: b.uniqueVisitors.length,
          percentage: Math.round(
            (b.count /
              (formattedDailyClicks.reduce((sum, d) => sum + d.clicks, 0) ||
                1)) *
              100,
          ),
        })),
        operatingSystems: osStats.map((os) => ({
          name: os._id || "Unknown",
          clicks: os.count,
          uniqueVisitors: os.uniqueVisitors.length,
          percentage: Math.round(
            (os.count /
              (formattedDailyClicks.reduce((sum, d) => sum + d.clicks, 0) ||
                1)) *
              100,
          ),
        })),
        countries: countryStats.map((c) => ({
          name: c._id || "Unknown",
          clicks: c.count,
          uniqueVisitors: c.uniqueVisitors.length,
          percentage: Math.round(
            (c.count /
              (formattedDailyClicks.reduce((sum, d) => sum + d.clicks, 0) ||
                1)) *
              100,
          ),
        })),
        referers: refererStats.map((r) => ({
          url: r._id,
          clicks: r.count,
          uniqueVisitors: r.uniqueVisitors.length,
        })),
      },
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
