import { db } from "../db/config/index.js";
import { TODAY, LAST7DAYS, YESTERDAY, LASTWEEK } from "../helpers/constants.js";

const washingCategorized = async (req, res) => {
  const query = req.query;

  //Query for washed bins only
  const dbQuery = `SELECT tcn_posi_washing.geoid, tcn_posi_washing.bydevice, tc_geofences.description FROM tcn_posi_washing
                    RIGHT JOIN tc_geofences ON tcn_posi_washing.geoid=tc_geofences.id
                    WHERE tcn_posi_washing.serv_time BETWEEN ${
                      query.from
                        ? `"${query.from}"`
                        : false || `"${TODAY} 00:00"`
                    } AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }`;
  //Query for all bins
  const queryAllBins = `SELECT tc_geofences.id, tc_geofences.description, tc_geofences.area AS position,tcn_centers.center_name, tcn_routs.rout_code, tcn_routs.id AS route_id, tc_drivers.name AS driver, tc_drivers.phone, tcn_bin_type.bintype FROM tc_geofences
                          JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                          JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                          JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                          JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id 
                          WHERE tc_geofences.attributes LIKE '%"bins": "yes"%'`;

  const groupedBy = (data, category) => {
    const byGroup = {};

    data.forEach((item) => {
      if (byGroup[item[category]]) {
        byGroup[item[category]].total += 1;
        byGroup[item[category]].cleaned += Number(item.cleaned);
        byGroup[item[category]].not_cleaned += Number(!item.cleaned);
        return;
      }
      byGroup[item[category]] = {
        route_id: item.route_id, //Route Prop
        [req.params.category]: item[category],
        total: 1,
        cleaned: Number(item.cleaned),
        not_cleaned: Number(!item.cleaned),
        driver: item.driver, //Route Prop
        phone: parseInt(item.phone), //Route Prop
        shift: "morning", //Route Prop Fix It Depends on Time
      };
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
            cleaned: true,
          };
        } else {
          return {
            ...bin,
            cleaned: false,
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
  //Query for last 7 days washing status
  const dbQuery = `SELECT tcn_posi_washing.geoid, tcn_posi_washing.serv_time FROM tcn_posi_washing
                    WHERE tcn_posi_washing.serv_time BETWEEN ${LASTWEEK} AND (SELECT current_timestamp)`;

  //Query for all bins
  const queryAllBins = `SELECT COUNT(tc_geofences.id) AS counter FROM tc_geofences
                        WHERE tc_geofences.attributes LIKE '%"bins": "yes"%'`;

  try {
    const allBins = await db.query(queryAllBins);
    const data = await db.query(dbQuery);

    const lastSevenDaysStatus = LAST7DAYS.map((day) => {
      const cleaned = data.filter(
        (item) => item.serv_time.toISOString().split("T")[0] === day
      ).length;
      return {
        date: day,
        total: parseInt(allBins[0].counter),
        washed,
        unwashed: parseInt(allBins[0].counter) - washed,
      };
    });

    res.json(lastSevenDaysStatus);
  } catch (error) {
    res.status(500).end();
  }
};

export { washingCategorized, summary };
