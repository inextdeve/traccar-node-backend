import express from "express";
import {
  bins,
  binById,
  binReports,
  binCategorized,
} from "../controllers/bins.js";

const router = express.Router();

router.get("/", bins);
router.get("/reports", binReports);
router.get("/:id", binById);
router.get("/by/:category", binCategorized);

export default router;
