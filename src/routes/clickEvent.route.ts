import { Router } from "express";
import { getClickAnalytics, getLinkClicksEvent, trackClient } from "../controllers/clickEvent.controller";
import { protect } from "../middlewares/auth.middleware";

const clickRouter=Router();

clickRouter.get('/track/:shortCode',trackClient);
clickRouter.get('/link/:linkId',protect,getLinkClicksEvent);
clickRouter.get('/link/:linkId/analytics',protect,getClickAnalytics); 

export default clickRouter;