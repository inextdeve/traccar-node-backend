import express from "express";
import { summary } from "../controllers/devices.js";

const router = express.Router();

router.use((req, res, next) => {
  // If 'Authorization' header not present
  if (!req.get("Authorization")) {
    var err = new Error("Not Authenticated!");
    // Set status code to '401 Unauthorized' and 'WWW-Authenticate' header to 'Basic'
    res.status(401).set("WWW-Authenticate", "Basic");
    next(err);
  }
  // If 'Authorization' header present
  else {
    // Decode the 'Authorization' header Base64 value
    var credentials = Buffer.from(
      req.get("Authorization").split(" ")[1],
      "base64"
    )
      // <Buffer 75 73 65 72 6e 61 6d 65 3a 70 61 73 73 77 6f 72 64>
      .toString()
      // username:password
      .split(":");
    // ['username', 'password']

    var username = credentials[0];
    var password = credentials[1];

    // If credentials are not valid
    if (!(username === "admin" && password === "admin")) {
      var err = new Error("Not Authenticated!");
      // Set status code to '401 Unauthorized' and 'WWW-Authenticate' header to 'Basic'
      res.status(401).set("WWW-Authenticate", "Basic");
      next(err);
    }
    res.status(200);
    // Continue the execution
    next();
  }
});

router.get("/summary", summary);

export default router;
