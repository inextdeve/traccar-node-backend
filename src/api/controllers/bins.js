import { db } from "../db/config/index.js";
import { YESTERDAY } from "../helpers/constants.js";
const bins = async (req, res) => {
  const query = req.query;

  const dbQuery = `SELECT geoid, bydevice, serv_time FROM tcn_poi_schedule WHERE serv_time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"${YESTERDAY}"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  const data = await db.query(dbQuery);

  let response = [];

  if (data?.length > 0) {
    response = data.map((bin) => {
      return {
        binId: bin.geoid,
        emptyTime: bin.serv_time,
        emptedBy: bin.bydevice,
      };
    });
  }

  res.json({ message: response });
};

const binById = async (req, res) => {
  const { id } = req.params;

  const query = `SELECT * FROM tcn_op_plan`;

  const data = await db.query(query);

  // console.log(data);
  // res.end();
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
    query.from ? `"${query.from}"` : false || `"${YESTERDAY}"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  const data = await db.query(dbQuery);

  res.json({ message: data });
};

export { bins, binById, binReports };
