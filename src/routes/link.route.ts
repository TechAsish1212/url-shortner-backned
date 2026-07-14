import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { createShortUrl, getAllUserLinks, redirectToOriginalUrl } from "../controllers/link.controller";

const linkRoutes=Router();

linkRoutes.post('/shorten',protect,createShortUrl);
linkRoutes.get('/:shortCode',redirectToOriginalUrl);
linkRoutes.get('/user/links',protect,getAllUserLinks);

export default linkRoutes;