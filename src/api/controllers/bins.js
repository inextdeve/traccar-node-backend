import moment from "moment";
import { db } from "../db/config/index.js";
import { TODAY, LAST7DAYS, YESTERDAY, LASTWEEK } from "../helpers/constants.js";
const bins = async (req, res) => {
  const query = req.query;

  const routeCondition = req.query.routeid ? `routid=${req.query.routeid}` : "";
  const centerCondition = req.query.centerid
    ? `centerid=${req.query.centerid}`
    : "";
  const binTypeCondition = req.query.bintype
    ? `bintypeid=${req.query.bintypeid}`
    : "";
  const binStatusCondition = req.query.status || "all";

  //Query for empted bins only
  const dbQuery = `SELECT geoid, bydevice FROM tcn_poi_schedule WHERE serv_time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  //Query for all bins
  const queryAllBins = `SELECT id, description, centerid, routid, bintypeid FROM tc_geofences WHERE attributes LIKE '%"bins": "yes"%' ${
    routeCondition ? `AND ${routeCondition}` : ""
  } ${centerCondition ? `AND ${centerCondition}` : ""} ${
    binTypeCondition ? `AND ${binTypeCondition}` : ""
  }`;

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
            empted: true,
          };
        } else {
          return {
            ...bin,
            empted: false,
          };
        }
      });
    }

    res.json(
      response.filter((item) => {
        if (binStatusCondition === "empted") {
          return item.empted === true;
        } else if (binStatusCondition === "unempted") {
          return item.empted === false;
        } else {
          return true;
        }
      })
    );
  } catch (e) {}
};

const binById = async (req, res) => {
  //GET TODAY STATUS
  const id = parseInt(req.params.id) || "0";

  const condition = `SELECT tcn_poi_schedule.serv_time FROM tcn_poi_schedule WHERE serv_time BETWEEN "${TODAY} 00:00" AND (select current_timestamp) AND tcn_poi_schedule.geoid=${id}`;

  const dbQuery = `IF EXISTS (${condition})
                  THEN
                    SELECT tcn_poi_schedule.geoid AS id, tcn_poi_schedule.serv_time, tcn_poi_schedule.VehicleID,tc_geofences.description, tc_geofences.area AS position,tcn_centers.center_name, tcn_routs.rout_code, tc_drivers.name AS driverName, tc_drivers.phone, tcn_bin_type.bintype FROM tcn_poi_schedule
                    JOIN tc_geofences ON tcn_poi_schedule.geoid=tc_geofences.id
                    JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                    JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                    JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                    JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id
                    WHERE tcn_poi_schedule.serv_time BETWEEN "${TODAY} 00:00" AND (select current_timestamp) AND tcn_poi_schedule.geoid=${id} AND tc_geofences.attributes LIKE '%"bins": "yes"%';
                  ELSE
                    SELECT tc_geofences.id, tc_geofences.description, tc_geofences.area AS position, tcn_centers.center_name, tcn_routs.rout_code, tc_drivers.name AS driverName, tc_drivers.phone, tcn_bin_type.bintype FROM tc_geofences
                    JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                    JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                    JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                    JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id
                    WHERE tc_geofences.id=${id} AND tc_geofences.attributes LIKE '%"bins": "yes"%';
                  END IF;`;

  const data = await db.query(dbQuery);

  const last7DaysQuery = `SELECT tcn_poi_schedule.serv_time, tcn_poi_schedule.VehicleID FROM tcn_poi_schedule WHERE tcn_poi_schedule.serv_time BETWEEN "${LASTWEEK}" AND (select current_timestamp) AND  tcn_poi_schedule.geoid=${id}`;

  const last7DaysStatus = await db.query(last7DaysQuery);

  //Check which day is empted and not
  const lastSevenDaysCheck = LAST7DAYS.map((day) => {
    return {
      date: day,
      empted: last7DaysStatus.some(
        (date) => date.serv_time.toISOString().split("T")[0] === day
      ),
      emptedTime: last7DaysStatus
        .filter((date) => date.serv_time.toISOString().split("T")[0] === day)
        .map((ele) => ele.serv_time)[0],
    };
  });

  const response = {
    bin: data[0].map((ele) => ({
      ...ele,
      phone: `${ele.phone}`,
      position: {
        longitude: ele.position.split(" ")[0].split("(")[1],
        latitude: ele.position.split(" ")[1].split(",")[0],
      },
    })),
    last7Days: lastSevenDaysCheck,
  };

  res.json(response);
};

const binReports = async (req, res) => {
  const query = req.query;

  let dbQuery = `SELECT * FROM tcn_g_reprots WHERE time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  const data = await db.query(dbQuery);

  res.json({ message: data });
};

const binCategorized = async (req, res) => {
  const query = req.query;
  const category = req.params.id;

  //Query for empted bins only
  const dbQuery = `SELECT tcn_poi_schedule.geoid, tcn_poi_schedule.bydevice, tc_geofences.description FROM tcn_poi_schedule
                  RIGHT JOIN tc_geofences ON tcn_poi_schedule.geoid=tc_geofences.id 
                  WHERE tcn_poi_schedule.serv_time BETWEEN ${
                    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
                  } AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }`;
  console.log(dbQuery);
  //Query for all bins
  const queryAllBins = `SELECT id, description, centerid, routid, bintypeid FROM tc_geofences WHERE attributes LIKE '%"bins": "yes"%'`;

  const data = await db.query(dbQuery);

  res.json(data);
};
export { bins, binById, binReports, binCategorized };
