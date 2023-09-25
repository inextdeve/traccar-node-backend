import express from "express";
import { simulator } from "../controllers/simulator.js";

const router = express.Router();

router.get("/", simulator);

export default router;
