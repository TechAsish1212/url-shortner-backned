import { Router } from "express";
import authRoutes from "./auth.route";
import linkRoutes from "./link.route";
import clickRouter from "./clickEvent.route";


const routes=Router();

routes.use('/auth',authRoutes);
routes.use('/link',linkRoutes);
routes.use('/clicks',clickRouter);


export default routes;