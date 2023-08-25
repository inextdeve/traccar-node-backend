import express from "express";
import { routes } from "../controllers/routes.js";

const router = express.Router();

router.get("/", routes);

export default router;
