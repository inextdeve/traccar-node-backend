import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sqlinjection from "sql-injection";
import apiRouter from "./api/routes/api.js";
import { db } from "./api/db/config/index.js";

dotenv.config();

const app = express();

app.use(cors({ origin: "*", methods: "GET,PUT,POST,DELETE" }));

app.use(express.json());

app.use("/api", apiRouter);

app.use(sqlinjection); // add sql-injection middleware here

//if db connection resolved listen to port 3003

app.listen(3003, () => {
  console.log(`Server running on port ${3003}`);
});
