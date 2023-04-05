import express from "express";
import binsRouter from "./bins.js";
import washingRouter from "./washing.js";
import devicesRouter from "./devices.js";
import statisticsRouter from "./statistics.js";
import auth from "../middlewares/auth.js";

const router = express.Router();
router.use(auth);

router.use("/bins", binsRouter);
router.use("/washing", washingRouter);
router.use("/devices", devicesRouter);
router.use("/statistics", statisticsRouter);

export default router;