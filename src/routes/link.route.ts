import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { createShortUrl, getAllUserLinks, getLinksDetails, redirectToOriginalUrl } from "../controllers/link.controller";

const linkRoutes=Router();

linkRoutes.post('/shorten',protect,createShortUrl);
linkRoutes.get('/:shortCode',redirectToOriginalUrl);
linkRoutes.get('/user/links',protect,getAllUserLinks);
linkRoutes.get('/user/links/:id',protect,getLinksDetails)

export default linkRoutes;