import express from "express";
import { bins, binById, binReports } from "../controllers/bins.js";

const router = express.Router();

router.get("/", bins);
router.get("/reports", binReports);
router.get("/:id", binById);

export default router;
