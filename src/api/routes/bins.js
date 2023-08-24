import express from "express";
import {
  bins,
  binById,
  binReports,
  binCategorized,
  summary,
  updateBin,
  addBin
} from "../controllers/bins.js";
import cache from "../middlewares/cache.js";

const router = express.Router();

router.use(cache(30, "json"));

router.get("/", bins);
router.get("/reports", binReports);
router.get("/summary", summary);
router.get("/by/:category", binCategorized);
router.get("/:id", binById);

router.patch("/", updateBin);

router.put("/", addBin);

export default router;
