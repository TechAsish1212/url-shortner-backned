import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { createShortUrl } from "../controllers/link.controller";

const linkRoutes=Router();

linkRoutes.post('/shorten',protect,createShortUrl);

export default linkRoutes;