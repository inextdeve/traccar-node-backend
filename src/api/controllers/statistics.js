import { db } from "../db/config/index.js";
import { countRate } from "../helpers/utils.js";

const kpi = async (req, res) => {
  const { query } = req;

  //Empted bins today
  const emptedBins = `SELECT COUNT(id) AS completed FROM tcn_poi_schedule
                      WHERE serv_time BETWEEN "${query.from}" AND "${
    query.from.split("T")[0] + " 23:59"
  }"`;

  //Washed bins today
  const washedBins = `SELECT COUNT(id) AS completed FROM tcn_posi_washing
                      WHERE serv_time BETWEEN "${query.from}" AND "${
    query.from.split("T")[0] + " 23:59"
  }"`;

  //Vehicle status
  const exitedVehicle = `SELECT count(DISTINCT tc_events.deviceid) AS completed from  tc_events
                          inner join tc_user_device on tc_events.deviceid = tc_user_device.deviceid
                          where tc_events.eventtime BETWEEN "${
                            query.from
                          }" AND "${query.from.split("T")[0] + " 23:59"}" and tc_events.type="geofenceExit"
                          `;

  //Sweeper Status
  const exitedSweepers = `SELECT SUM(JSON_EXTRACT(attributes, '$.distance')/1000) AS completed FROM tc_positions 
                          WHERE deviceid IN (SELECT id FROM tc_devices WHERE groupid = 5)
                          AND speed < 15
                          AND DATE(fixtime) ='${query.from.split("T")[0]}'`;

  //Count All Bins
  const countBins = `SELECT COUNT(id) AS count FROM tc_geofences WHERE attributes LIKE '%"bins": "yes"%'`;

  //Count All Vehicle
  const countVehicle = `SELECT COUNT(id) AS count FROM tc_devices`;

  //Count All Sweepers
  const countSweepers = `SELECT  COUNT(id) AS count from  tc_devices WHERE tc_devices.groupid='5' or tc_devices.name like '%14'`;

  try {
    const [
      emptedStatus,
      washingStatus,
      vehicleStatus,
      sweepersStatus,
      allBins,
      allVehicle,
      allSweepers,
    ] = (
      await Promise.all([
        db.query(emptedBins),
        db.query(washedBins),
        db.query(exitedVehicle),
        db.query(exitedSweepers),
        db.query(countBins),
        db.query(countVehicle),
        db.query(countSweepers),
      ])
    ).map((ele) => {
      if (ele[0].hasOwnProperty("completed")) {
        return { completed: parseInt(ele[0].completed) };
      }
      return { count: parseInt(ele[0].count) };
    });

    const response = [
      {
        name: "Bins",
        total: allBins.count,
        completed: emptedStatus.completed,
        uncompleted: allBins.count - emptedStatus.completed,
      },
      {
        name: "Washing",
        total: Math.round(allBins.count / 30),
        completed: washingStatus.completed,
        uncompleted: Math.round(allBins.count / 30) - washingStatus.completed,
      },
      {
        name: "Vehicle",
        total: allVehicle.count,
        completed: vehicleStatus.completed,
        uncompleted: allVehicle.count - vehicleStatus.completed,
      },
      {
        name: "Sweepers",
        total: 826,
        completed: sweepersStatus.completed,
        uncompleted: 826 - sweepersStatus.completed,
      },
    ];

    res.json(
      response.map((item) => ({
        ...item,
        rate: countRate(item.total, item.completed).toFixed(2) + "%",
      }))
    );
  } catch (error) {
    res.status(500).end();
  }
};

export { kpi };
