import { db } from "../db/config/index.js";
import { TODAY } from "../helpers/constants.js";
const bins = async (req, res) => {
  const query = req.query;

  //Query for empted bins only
  const dbQuery = `SELECT geoid, bydevice FROM tcn_poi_schedule WHERE serv_time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  //Query for all bins
  const queryAllBins = `SELECT id, description, centerid, routid, bintypeid FROM tc_geofences WHERE attributes LIKE '%"bins": "yes"%'`;

  try {
    const allBins = await db.query(queryAllBins);

    const data = await db.query(dbQuery);

    const dataObject = {};

    data.forEach((element) => {
      dataObject[element.geoid] = element;
    });

    let response = [];
    if (data?.length > 0) {
      response = allBins.map((bin) => {
        if (dataObject[bin.id]) {
          return {
            ...bin,
            status: "empted",
          };
        } else {
          return {
            ...bin,
            status: "notEmpted",
          };
        }
      });
    }

    res.json(response);
  } catch (e) {}
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
    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  const data = await db.query(dbQuery);

  res.json({ message: data });
};

export { bins, binById, binReports };
