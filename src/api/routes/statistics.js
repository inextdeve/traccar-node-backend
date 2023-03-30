import express from "express";
import { kpi } from "../controllers/statistics.js";

const router = express.Router();

router.get("/kpi", kpi);

export default router;
