// Controllers for centers

import { db } from "../db/config/index.js";

export const centers = async (req, res) => {
  const query =
    "SELECT tcn_centers.id, tcn_centers.center_name FROM tcn_centers";
  try {
    const dbQuery = await db.query(query);
    res.json(dbQuery);
  } catch (error) {
    res.status(400).end();
  }
};
