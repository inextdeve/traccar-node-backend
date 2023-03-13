import moment from "moment";
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

  // const query = `SELECT tc_geofences.description, tc_geofences.routid, tcn_routs.id FROM tc_geofences
  // LEFT JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id  WHERE tc_geofences.attributes LIKE '%"bins": "yes"%'`;
  // const query = `SELECT * FROM tcn_routs`;
  const condition = `SELECT tcn_poi_schedule.id, tcn_poi_schedule.serv_time FROM tcn_poi_schedule WHERE serv_time BETWEEN "2023-03-04" AND "2023-03-10" AND tcn_poi_schedule.geoid=2777`;
  const query = `IF EXISTS (${condition})
                  THEN
                  SELECT tcn_poi_schedule.id, tcn_poi_schedule.serv_time FROM tcn_poi_schedule WHERE serv_time BETWEEN "2023-03-04" AND "2023-03-10" AND tcn_poi_schedule.geoid=2777;
                  ELSE
                  SELECT tc_geofences.description FROM tc_geofences WHERE tc_geofences.id = 1119;
                  END IF;`;

  // const query = `SELECT description from tc_geofences where id=2777`;

  const lastSevenDays = [];
  console.log("START", new Date());
  for (let i = 0; i < 7; i++) {
    const time = moment().subtract(i, "day").format("YYYY-MM-DD");

    const query = `SELECT serv_time FROM tcn_poi_schedule WHERE serv_time LIKE '%${time}%' AND geoid=1119`;

    const data = await db.query(query);

    lastSevenDays.push(data[0] || "-");
  }
  console.log("END", new Date());
  console.log(lastSevenDays);
  const data = await db.query(query);

  console.log(data);
  res.end();
  // res.json({ message: data });
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
