import { Router } from "express";
import { trackClient } from "../controllers/clickEvent.controller";

const clickRouter=Router();

clickRouter.get('/track/:shortCode',trackClient);

export default clickRouter;