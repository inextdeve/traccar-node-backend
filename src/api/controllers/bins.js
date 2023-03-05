import { db } from "../db/config/index.js";

const binById = async (req, res) => {
  const { id } = req.params;

  const query = "SHOW DATABASES";

  const data = await db.query(query);

  res.json({ message: data });
};

const binReports = async (req, res) => {
  // if (Object.keys(req.query).length) {
  //   let WHERE = "WHERE";
  //   Object.keys(req.query).forEach((key, index) => {
  //     WHERE += ` ${key}=${req.query[key]} ${
  //       index < Object.keys(req.query).length - 1 ? "AND " : ""
  //     }`;
  //   });
  //   query += WHERE;
  // }

  const query = req.query;

  let dbQuery = `SELECT * FROM tcn_g_reprots WHERE time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"2022-01-01"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  console.log(dbQuery);

  const data = await db.query(dbQuery);

  res.json({ message: data });
};

export { binById, binReports };
