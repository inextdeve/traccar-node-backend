import express from "express";
import { types } from "../controllers/types.js";

const router = express.Router();

router.get("/", types);

export default router;
