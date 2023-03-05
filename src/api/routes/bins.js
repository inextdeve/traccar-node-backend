import express from "express";
import { binById, binReports } from "../controllers/bins.js";

const router = express.Router();

router.get("/reports", binReports);
router.get("/:id", binById);

export default router;
