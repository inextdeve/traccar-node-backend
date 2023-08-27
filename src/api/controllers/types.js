// Controllers for bin types
import { db } from "../db/config/index.js";

export const types = async (req, res) => {
  const query = "SELECT * FROM tcn_bin_type";
  try {
    const dbQuery = await db.query(query);
    res.json(dbQuery);
  } catch (error) {
    res.status(400).end();
  }
};
