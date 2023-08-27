import express from "express";
import { centers } from "../controllers/centers.js";

const router = express.Router();

router.get("/", centers);

export default router;
