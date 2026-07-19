import { Router } from "express";
import { getClickAnalytics, getClickSummary, getLinkClicksEvent, getRecentClicks, trackClient } from "../controllers/clickEvent.controller";
import { protect } from "../middlewares/auth.middleware";

const clickRouter=Router();

clickRouter.get('/track/:shortCode',trackClient);
clickRouter.get('/link/:linkId',protect,getLinkClicksEvent);
clickRouter.get('/link/:linkId/analytics',protect,getClickAnalytics); 
clickRouter.get('/recent',protect,getRecentClicks);
clickRouter.get('/summary',protect,getClickSummary);

export default clickRouter;