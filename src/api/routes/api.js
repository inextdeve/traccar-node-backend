import express from "express";
import binsRouter from "./bins.js";

const router = express.Router();

router.use("/bins", binsRouter);

export default router;
