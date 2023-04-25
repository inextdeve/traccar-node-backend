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
                          }" AND "${
    query.from.split("T")[0] + " 23:59"
  }" and tc_events.type="geofenceExit"
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

const summary = async (req, res) => {
  const dbQueryReports = `SELECT 
  COUNT(*) AS total_rows,
  SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS Open,
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS Closed
  FROM tcn_g_reprots
  WHERE time >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;

  const dbQuerySweepers = `SELECT AVG(speed) AS avg_speed, MAX(speed) AS max_speed, SUM(JSON_EXTRACT(attributes, '$.distance')/1000) AS total_distance, 826 * 7 AS total_routs, (SUM(JSON_EXTRACT(attributes, '$.distance')/1000)/(826 * 7))*100 AS rate_percentage
  FROM tc_positions
  WHERE deviceid IN (SELECT id FROM tc_devices WHERE groupid = 5)
  AND speed < 15
  AND fixtime >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;

  const [reports, sweepers] = await Promise.all([
    db.query(dbQueryReports),
    db.query(dbQuerySweepers),
  ]);

  const response = [
    {
      name: "reports",
      total: 100,
      done: parseInt(reports[0].Closed),
      rate: parseInt(
        countRate(parseInt(reports[0].total_rows), parseInt(reports[0].Closed))
      ),
    },
    {
      name: "sweepers",
      total: 100,
      done: parseInt(sweepers[0].total_distance),
      rate: parseInt(sweepers[0].rate_percentage),
    },
  ];

  res.json(response);
};

export { kpi, summary };
