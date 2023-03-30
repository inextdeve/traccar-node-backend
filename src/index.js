import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import apiRouter from "./api/routes/api.js";
import { db } from "./api/db/config/index.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api", apiRouter);

//if db connection resolved listen to port 3003

app.listen(3003);
