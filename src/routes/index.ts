import { Router } from "express";
import authRoutes from "./auth.route";
import linkRoutes from "./link.route";


const routes=Router();

routes.use('/auth',authRoutes);
routes.use('/link',linkRoutes);


export default routes;