import express from "express";
import { summary } from "../controllers/devices.js";

const router = express.Router();

router.get("/summary", summary);

export default router;
