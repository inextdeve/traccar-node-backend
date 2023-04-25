import express from "express";
import { kpi, reports } from "../controllers/statistics.js";

const router = express.Router();

router.get("/kpi", kpi);
router.get("/reports", reports);

export default router;
