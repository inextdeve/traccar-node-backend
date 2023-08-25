import { db } from "../db/config/index.js";

export const routes = async (req, res) => {
  const query = "SELECT * FROM tcn_routs";
  try {
    const dbQuery = await db.query(query);
    res.json(dbQuery);
  } catch (error) {
    res.status(400).end();
  }
};
