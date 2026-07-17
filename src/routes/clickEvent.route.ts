import { Router } from "express";
import { getLinkClicksEvent, trackClient } from "../controllers/clickEvent.controller";
import { protect } from "../middlewares/auth.middleware";

const clickRouter=Router();

clickRouter.get('/track/:shortCode',trackClient);
clickRouter.get('/link/:linkId',protect,getLinkClicksEvent);

export default clickRouter;