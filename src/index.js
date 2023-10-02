import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sqlinjection from "sql-injection";
import apiRouter from "./api/routes/api.js";
import { db } from "./api/db/config/index.js";
import https from "https";
import fs from "fs";
import path from "path";
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

dotenv.config();

const app = express();

app.use(cors({ origin: "*", methods: "GET,PUT,POST,DELETE,PATCH" }));

app.use(express.json());

app.use("/api", apiRouter);

app.use(sqlinjection); // add sql-injection middleware here

//if db connection resolved listen to port 3003

const sslServer = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, "cert", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "cert", "cert.pem")),
  },
  app
);

sslServer.listen(3003, () => {
  console.log(`Server running on port ${3003}`);
});
