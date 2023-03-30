import { db } from "../db/config/index.js";
import { TODAY } from "../helpers/constants.js";

const kpi = async (req, res) => {
  //Empted bins today
  const emptedBins = `SELECT COUNT(id) AS completed FROM tcn_poi_schedule
                      WHERE serv_time BETWEEN "${TODAY} 00:00" AND (SELECT current_timestamp)`;

  //Washed bins today
  const washedBins = `SELECT COUNT(id) AS completed FROM tcn_posi_washing
                      WHERE serv_time BETWEEN "${TODAY} 00:00" AND (SELECT current_timestamp)`;

  //Vehicle status
  const exitedVehicle = `SELECT count(DISTINCT tc_events.deviceid) AS completed from  tc_events
                          inner join tc_user_device on tc_events.deviceid = tc_user_device.deviceid
                          where tc_events.eventtime BETWEEN "${TODAY} 00:00" AND (SELECT current_timestamp)
                          `;

  //Sweeper Status
  const exitedSweepers = `SELECT count(DISTINCT tc_events.deviceid) AS completed from  tc_events
                          inner join tc_devices on tc_events.deviceid = tc_devices.id
                          WHERE tc_devices.groupid=5 AND tc_events.type = "geofenceExit" AND tc_events.eventtime BETWEEN "${TODAY} 00:00" AND (SELECT current_timestamp)
                          `;

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
      if (ele[0]?.completed) {
        return { completed: parseInt(ele[0]?.completed) };
      }
      return { count: parseInt(ele[0].count) };
    });

    const response = [
      {
        name: "emptedBinsStatus",
        total: allBins.count,
        completed: emptedStatus.completed,
        uncompleted: allBins.count - emptedStatus.completed,
      },
      {
        name: "washedBinsStatus",
        total: allBins.count,
        completed: washingStatus.completed,
        uncompleted: allBins.count - washingStatus.completed,
      },
      {
        name: "vehicleStatus",
        total: allVehicle.count,
        completed: vehicleStatus.completed,
        uncompleted: allVehicle.count - vehicleStatus.completed,
      },
      {
        name: "sweepersStatus",
        total: allSweepers.count,
        completed: sweepersStatus.completed,
        uncompleted: allSweepers.count - sweepersStatus.completed,
      },
    ];

    res.json(response);
  } catch (error) {
    res.status(500).end();
  }
};

export { kpi };
