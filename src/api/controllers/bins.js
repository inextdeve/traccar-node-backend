import moment from "moment";
import { db } from "../db/config/index.js";
import { TODAY, LAST7DAYS, YESTERDAY, LASTWEEK } from "../helpers/constants.js";

const bins = async (req, res) => {
  const query = req.query;
  console.log("test");
  const routeCondition = req.query.routeid
    ? `tc_geofences.routid=${req.query.routeid}`
    : "";
  const centerCondition = req.query.centerid
    ? `tcn_centers.id=${req.query.centerid}`
    : "";
  const binTypeCondition = req.query.bintypeid
    ? `tcn_bin_type.id=${req.query.bintypeid}`
    : "";
  const binStatusCondition = req.query.status || "all";

  console.log("Condition", routeCondition);

  //Query for empted bins only
  const dbQuery = `SELECT geoid, bydevice FROM tcn_poi_schedule WHERE serv_time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  //Query for all bins
  const queryAllBins = `SELECT tc_geofences.id AS id_bin, tc_geofences.description, tc_geofences.area AS position, tcn_centers.center_name, tcn_routs.rout_code AS route, tcn_bin_type.bintype
                        FROM tc_geofences
                        JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                        JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                        JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id 
                        WHERE attributes LIKE '%"bins": "yes"%' ${
                          routeCondition ? `AND ${routeCondition}` : ""
                        } ${centerCondition ? `AND ${centerCondition}` : ""} ${
    binTypeCondition ? `AND ${binTypeCondition}` : ""
  }`;
  console.log(queryAllBins);
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
        if (dataObject[bin.id_bin]) {
          return {
            ...bin,
            latitude: bin.position.split(" ")[0].split("(")[1],
            longitude: bin.position.split(" ")[1].split(",")[0],
            status: "empty",
            empted: true,
          };
        } else {
          return {
            ...bin,
            latitude: bin.position.split(" ")[0].split("(")[1],
            longitude: bin.position.split(" ")[1].split(",")[0],
            status: "unempty",
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

  let dbQuery = `SELECT tcn_g_reprots.id,tcn_g_reprots.phone, tcn_g_reprots.username, tcn_g_reprots.description, tcn_g_reprots.idbin AS id_bin, tcn_g_reprots.time, tcn_g_reprots.img, tcn_g_reprots.imgafter, tcn_g_reprots.type, tcn_g_reprots.status, tc_geofences.area, tc_geofences.description AS description_bin, tcn_centers.center_name FROM tcn_g_reprots
  JOIN tc_geofences ON tcn_g_reprots.idbin = tc_geofences.id
  JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
  WHERE time BETWEEN ${
    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
  } AND ${query.to ? `"${query.to}"` : false || "(select current_timestamp)"}`;

  const data = (await db.query(dbQuery)).map((item) => {
    return {
      ...item,
      img: item.img ? `https://bins.rcj.care/${JSON.parse(item.img)[0]}` : null,
      imgafter: item.imgafter
        ? `https://bins.rcj.care/${JSON.parse(item.imgafter)[0]}`
        : null,
      type: JSON.parse(item.type)[0],
      latitude: item.area.split(" ")[0].split("(")[1],
      longitude: item.area.split(" ")[1].split("(")[0],
    };
  });

  res.json(data);
};

const binCategorized = async (req, res) => {
  const query = req.query;
  const category = req.params.category;
  console.log(query);

  //Query for empted bins only
  const dbQuery = `SELECT tcn_poi_schedule.geoid, tcn_poi_schedule.bydevice, tc_geofences.description FROM tcn_poi_schedule
                  RIGHT JOIN tc_geofences ON tcn_poi_schedule.geoid=tc_geofences.id
                  WHERE tcn_poi_schedule.serv_time BETWEEN ${
                    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
                  } AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }`;
  //Query for all bins
  const queryAllBins = `SELECT tc_geofences.id, tc_geofences.description, tc_geofences.area AS position,tcn_centers.center_name, tcn_centers.id AS centerId, tcn_routs.rout_code, tcn_routs.id AS routeId,tc_drivers.name AS driverName, tc_drivers.phone, tcn_bin_type.bintype, tcn_bin_type.id AS binTypeId FROM tc_geofences
                        JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                        JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                        JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                        JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id 
                        WHERE tc_geofences.attributes LIKE '%"bins": "yes"%'
                        ${
                          query.id
                            ? category === "bintype"
                              ? `AND tcn_bin_type.id = ${query.id}`
                              : category === "center"
                              ? `AND tcn_centers.id = ${query.id}`
                              : category === "route"
                              ? `AND tcn_routs.id = ${query.id}`
                              : ""
                            : ""
                        }`;

  const groupedBy = (data, category) => {
    const byGroup = {};

    data.forEach((item) => {
      if (byGroup[item[category]]) {
        byGroup[item[category]].total += 1;
        byGroup[item[category]].empty_bin += Number(item.empty_bin);
        byGroup[item[category]].un_empty_bin += Number(!item.empty_bin);
        return;
      }
      byGroup[item[category]] = {
        [req.params.category]: item[category],
        total: 1,
        empty_bin: Number(item.empty_bin),
        un_empty_bin: Number(!item.empty_bin),
      };

      if (category === "rout_code") {
        byGroup[item[category]].phone = `${parseInt(item.phone)}`;
        byGroup[item[category]].shift = "morning";
        byGroup[item[category]].routeId = item.routeId;
        byGroup[item[category]].driver = item.driverName;
      }

      if (category === "bintype") {
        byGroup[item[category]].binTypeId = item.binTypeId;
      }

      if (category === "center_name") {
        byGroup[item[category]].centerId = item.centerId;
      }
    });
    const byGroupList = [];
    for (let key in byGroup) {
      byGroupList.push(byGroup[key]);
    }

    res.json(byGroupList);
  };

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
            empty_bin: true,
          };
        } else {
          return {
            ...bin,
            empty_bin: false,
          };
        }
      });
    }

    switch (req.params.category) {
      case "bintype":
        groupedBy(response, "bintype");
        break;
      case "center":
        groupedBy(response, "center_name");
        break;
      case "route":
        groupedBy(response, "rout_code");
        break;
      default:
        res.status(204).end();
        break;
    }
  } catch (e) {
    res.status(500).end();
  }
};

const summary = async (req, res) => {
  //Query for last 7 days bins status
  const dbQuery = `SELECT tcn_poi_schedule.geoid, tcn_poi_schedule.serv_time FROM tcn_poi_schedule
                    WHERE tcn_poi_schedule.serv_time BETWEEN ${LASTWEEK} AND (SELECT current_timestamp)`;

  //Query for all bins
  const queryAllBins = `SELECT COUNT(tc_geofences.id) AS counter FROM tc_geofences
                        WHERE tc_geofences.attributes LIKE '%"bins": "yes"%'`;

  try {
    const [allBins, data] = await Promise.all([
      db.query(queryAllBins),
      db.query(dbQuery),
    ]);

    const lastSevenDaysStatus = LAST7DAYS.map((day) => {
      const empty_bin = data.filter(
        (item) => item.serv_time.toISOString().split("T")[0] === day
      ).length;
      return {
        date: day,
        total: parseInt(allBins[0].counter),
        empty_bin,
        un_empty_bin: parseInt(allBins[0].counter) - empty_bin,
      };
    });

    res.json(lastSevenDaysStatus);
  } catch (error) {
    res.status(500).end();
  }
};

export { bins, binById, binReports, binCategorized, summary };
