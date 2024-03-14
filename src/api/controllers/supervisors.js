import dbPools from "../db/config/index.js";

const statistics = async (req, res) => {
    let db;

  const query = req.query;
  // Get how many bins belongs to each driver
  const allBinsQuery = `SELECT tcn_routs.driverid, tc_drivers.name, COUNT(*) AS bins FROM tc_geofences
                        INNER JOIN tcn_routs ON tc_geofences.routid = tcn_routs.id
                        INNER JOIN tc_drivers ON tc_drivers.id = tcn_routs.driverid
                        GROUP BY tcn_routs.driverid`;

    //Query for empted bins for each driver

    const emptedBinsQuery = `SELECT tcn_routs.driverid,  COUNT(tcn_poi_schedule.geoid) AS emptedBins FROM tcn_poi_schedule
                    inner JOIN tcn_routs ON tcn_routs.deviceid = tcn_poi_schedule.bydevice
                    inner JOIN tc_drivers ON tcn_routs.driverid = tc_drivers.id
                    WHERE serv_time BETWEEN "${query.from}" AND ${query.to ? `"${query.to}"` : false || "(SELECT current_timestamp)"}
                    GROUP BY tcn_routs.driverid`;

  try {
    db = await dbPools.pool.getConnection();

    const binsByDriver = await db.query(allBinsQuery);

    const emptedBins = await db.query(emptedBinsQuery);

    const supervisorsStatistic = binsByDriver.map((driverBins) => {
        return {
            ...driverBins,
            bins: parseInt(driverBins.bins),
            emptedBins: parseInt(emptedBins.find(emptedByDriver => emptedByDriver.driverid === driverBins.driverid)?.emptedBins)
        }
    })

    res.json(supervisorsStatistic);

  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    if (db) {
      await db.release();
    }
  }

}

export { statistics }