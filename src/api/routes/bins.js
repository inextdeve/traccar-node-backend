import express from "express";
import {
  bins,
  binById,
  binReports,
  binCategorized,
  summary,
  updateBin,
  addBin,
  deleteBin,
  updateBinStatus,
  newBins,
} from "../controllers/bins.js";
import cache from "../middlewares/cache.js";

const router = express.Router();

router.use(cache(30, "json"));

router.get("/", bins);
router.get("/reports", binReports);
router.get("/summary", summary);
router.get("/by/:category(bintype|center|route)", binCategorized);
router.get("/test", newBins);

router.get("/:id", binById);

router.put("/", addBin);
router.patch("/", updateBin);
router.patch("/status", updateBinStatus);
router.delete("/", deleteBin);

export default router;
