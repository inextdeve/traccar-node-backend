import moment from "moment";
import dbPools from "../db/config/index.js";
import { LAST7DAYS, LASTWEEK } from "../helpers/constants.js";
import { getDaysBetweenDates } from "../helpers/utils.js";

const bins = async (req, res) => {
  let db;

  const query = req.query;

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

  //Query for empted bins only
  const dbQuery = `SELECT geoid, bydevice FROM tcn_poi_schedule WHERE serv_time BETWEEN "${
    query.from
  }" AND ${query.to ? `"${query.to}"` : false || "(SELECT current_timestamp)"}`;

  //Query for all bins
  const queryAllBins = `SELECT tc_geofences.id AS id_bin, tc_geofences.description, tc_geofences.area AS position, tc_geofences.routid, tc_geofences.centerid,tc_geofences.bintypeid , tcn_centers.center_name, tcn_routs.rout_code AS route, tcn_bin_type.bintype
                        FROM tc_geofences
                        JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                        JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                        JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id 
                        WHERE attributes LIKE '%"bins": "yes"%'
                        AND JSON_EXTRACT(attributes, "$.cartoon") IS NULL
                        ${routeCondition ? `AND ${routeCondition}` : ""} ${
    centerCondition ? `AND ${centerCondition}` : ""
  } ${binTypeCondition ? `AND ${binTypeCondition}` : ""}`;

  const queryLastOperations = `SELECT tt.geoid AS id, tt.serv_time FROM tcn_poi_schedule tt
  INNER JOIN (SELECT geoid, MAX(serv_time) AS MaxDateTime FROM tcn_poi_schedule GROUP BY geoid)
  groupedtt ON tt.geoid=groupedtt.geoid
  AND tt.serv_time = groupedtt.MaxDateTime`;

  try {
    db = await dbPools.pool.getConnection();
    const allBins = await db.query(queryAllBins);

    const data = await db.query(dbQuery);

    const lastOperations = await db.query(queryLastOperations);

    // const [allBins, data, lastOperations] = await Promise.all([
    //   db.query(queryAllBins),
    //   db.query(dbQuery),
    //   db.query(queryLastOperations),
    // ]);

    const lastOpearionsObject = new Object();

    lastOperations.forEach((element) => {
      lastOpearionsObject[element.id] = element.serv_time;
    });

    const dataObject = new Object();

    data.forEach((element) => {
      dataObject[element.geoid] = element;
    });

    let response = allBins.map((bin) => {
      const newBin = {
        ...bin,
        latitude: bin.position.split(" ")[0].split("(")[1],
        longitude: bin.position.split(" ")[1].split(",")[0],
        status: dataObject[bin.id_bin] ? "empty" : "unempty",
        empted: !!dataObject[bin.id_bin],
        time: lastOpearionsObject[bin.id_bin]
          ? lastOpearionsObject[bin.id_bin]?.toISOString().split("T")[0]
          : null,
      };

      delete newBin.position;
      return newBin;
    });

    if (binStatusCondition !== "all") {
      response = response.filter((item) => {
        if (binStatusCondition === "empted") {
          return item.empted === true;
        }
        return item.empted === false;
      });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

const binById = async (req, res) => {
  let db;

  //GET TODAY STATUS
  const id = parseInt(req.params.id) || "0";

  const condition = `SELECT tcn_poi_schedule.serv_time FROM tcn_poi_schedule WHERE serv_time BETWEEN "${req.query.from}" AND (select current_timestamp) AND tcn_poi_schedule.geoid=${id}`;

  const dbQuery = `IF EXISTS (${condition})
                  THEN
                    SELECT tcn_poi_schedule.geoid AS id_bin, tcn_poi_schedule.serv_time, tcn_poi_schedule.VehicleID AS emptied_by,tc_geofences.description, tc_geofences.area AS position,tcn_centers.center_name, tcn_routs.rout_code, tc_drivers.name AS driverName, tc_drivers.phone AS driver_phone, tcn_bin_type.bintype FROM tcn_poi_schedule
                    JOIN tc_geofences ON tcn_poi_schedule.geoid=tc_geofences.id
                    JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                    JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                    JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                    JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id
                    WHERE tcn_poi_schedule.serv_time BETWEEN "${req.query.from}" AND (select current_timestamp) AND tcn_poi_schedule.geoid=${id} AND tc_geofences.attributes LIKE '%"bins": "yes"%' AND JSON_EXTRACT(tc_geofences.attributes, "$.cartoon") IS NULL LIMIT 1;
                  ELSE
                    SELECT tc_geofences.id AS id_bin, tc_geofences.description, tc_geofences.area AS position, tcn_centers.center_name AS center, tcn_routs.rout_code AS route, tc_drivers.name AS driverName, tc_drivers.phone AS driver_phone, tcn_bin_type.bintype FROM tc_geofences
                    JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                    JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                    JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                    JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id
                    WHERE tc_geofences.id=${id} AND tc_geofences.attributes LIKE '%"bins": "yes"%';
                  END IF;`;

  try {
    db = await dbPools.pool.getConnection();
    const data = await db.query(dbQuery);

    const last7DaysQuery = `SELECT tcn_poi_schedule.serv_time, tcn_poi_schedule.VehicleID AS emptied_by FROM tcn_poi_schedule WHERE tcn_poi_schedule.serv_time BETWEEN "${LASTWEEK()}" AND (select current_timestamp) AND  tcn_poi_schedule.geoid=${id}`;

    const last7DaysStatus = await db.query(last7DaysQuery);

    //Check which day is empted and not
    const lastSevenDaysCheck = LAST7DAYS().map((day) => {
      return {
        date: day,
        status: last7DaysStatus.some(
          (bin) => bin.serv_time.toISOString().split("T")[0] === day
        )
          ? "empty"
          : "unempty",
        emptedTime: last7DaysStatus
          .filter((bin) => bin.serv_time.toISOString().split("T")[0] === day)
          .map((ele) => ele.serv_time)[0],
        emptiedBy: last7DaysStatus.filter(
          (bin) => bin.serv_time.toISOString().split("T")[0] === day
        )[0]?.emptied_by,
      };
    });

    const response = [
      ...data[0].map((ele) => ({
        ...ele,
        driver_phone: `${ele.driver_phone}`,
        latitude: ele.position.split(" ")[0].split("(")[1],
        longitude: ele.position.split(" ")[1].split(",")[0],
        status: !!ele.serv_time ? "empty" : "unempty",
      })),
      { last7Days: lastSevenDaysCheck.reverse() },
    ];
    res.json(response);
  } catch (error) {
    res.json({ error: error.message });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

const binReports = async (req, res) => {
  let db;

  const query = req.query;

  let dbQuery = `SELECT tcn_g_reprots.id,tcn_g_reprots.phone, tcn_g_reprots.username, tcn_g_reprots.description, tcn_g_reprots.idbin AS id_bin, tcn_g_reprots.time, tcn_g_reprots.img, tcn_g_reprots.imgafter, tcn_g_reprots.type, tcn_g_reprots.status, tc_geofences.area, tc_geofences.description AS description_bin, tcn_centers.center_name FROM tcn_g_reprots
  JOIN tc_geofences ON tcn_g_reprots.idbin = tc_geofences.id
  JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
  WHERE time BETWEEN "${query.from}" AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }`;

  try {
    db = await dbPools.pool.getConnection();
    const data = (await db.query(dbQuery)).map((item) => {
      return {
        ...item,
        img: item.img
          ? `https://bins.rcj.care/${JSON.parse(item.img)[0]}`
          : null,
        imgafter: item.imgafter
          ? `https://bins.rcj.care/${JSON.parse(item.imgafter)[0]}`
          : null,
        type: JSON.parse(item.type)[0],
        latitude: item.area.split(" ")[0].split("(")[1],
        longitude: item.area.split(" ")[1].split("(")[0].split(",")[0],
      };
    });

    res.json(data);
  } catch (error) {
    res.json({ error: error.message });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

export const newBins = async (req, res) => {
  let db;

  const params = [];

  let { empted, from, to, by } = req.query;

  console.log(from, to);

  // Validation for required parameters
  if (empted) {
    if (!from || !to) {
      return res
        .status(400)
        .send(
          `Both "from" and "to" parameters are required when "empted" is specified.`
        );
    }
  } else if (from || to) {
    return res
      .status(400)
      .send(
        `"from" and "to" parameters can only be used with the "empted" query.`
      );
  }
  // Columns
  let query = `SELECT bin.id, bin.description, bin.area AS position, tcn_centers.id AS centerId, tcn_centers.center_name, tcn_routs.id AS routeId, tcn_routs.rout_code, tc_drivers.name AS driverName, tc_drivers.phone, tcn_bin_type.bintype, tcn_bin_type.id AS binTypeId `;

  if (empted || from || to) {
    query += `, emptedBin.geoid, emptedBin.bydevice `;
  }
  // Table Joins
  query += `FROM tc_geofences bin
            LEFT JOIN tcn_centers ON bin.centerid=tcn_centers.id
            LEFT JOIN tcn_routs ON bin.routid=tcn_routs.id
            LEFT JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
            LEFT JOIN tcn_bin_type ON bin.bintypeid=tcn_bin_type.id`;

  if (empted || from || to) {
    query += `
                LEFT JOIN tcn_poi_schedule emptedBin ON bin.id = emptedBin.geoid AND emptedBin.serv_time >= ? AND emptedBin.serv_time <= ?
               `;
    params.push(from, to);
  }

  query += `
    WHERE bin.attributes LIKE '%"bins": "yes"%' 
  `;

  try {
    // Execute the query
    db = await dbPools.pool.getConnection();
    const data = await db.query(query, params);

    res.json(data.map((bin) => ({ ...bin, phone: Number(bin.phone) })));
  } catch (error) {
    console.error("Database query failed:", error);
    res.status(500).send("An error occurred while fetching bins");
  }
};

const binCategorized = async (req, res) => {
  let db;

  const query = req.query;
  const category = req.params.category;

  const allBinsParams = [];

  const numberOfDays =
    getDaysBetweenDates(query.from, query.to || new Date().toISOString()) + 1;

  //Query for empted bins only
  const dbQuery = `SELECT tcn_poi_schedule.geoid, tcn_poi_schedule.bydevice, tc_geofences.description FROM tcn_poi_schedule
                  RIGHT JOIN tc_geofences ON tcn_poi_schedule.geoid=tc_geofences.id
                  WHERE tcn_poi_schedule.serv_time BETWEEN ? AND ?`;
  //Query for all bins
  let queryAllBins = `SELECT tc_geofences.id, tc_geofences.description, tc_geofences.area AS position,tcn_centers.center_name, tcn_centers.id AS centerId, tcn_routs.rout_code, tcn_routs.id AS routeId,tc_drivers.name AS driverName, tc_drivers.phone, tcn_bin_type.bintype, tcn_bin_type.id AS binTypeId FROM tc_geofences
                        JOIN tcn_centers ON tc_geofences.centerid=tcn_centers.id
                        JOIN tcn_routs ON tc_geofences.routid=tcn_routs.id
                        JOIN tc_drivers ON tcn_routs.driverid=tc_drivers.id
                        JOIN tcn_bin_type ON tc_geofences.bintypeid=tcn_bin_type.id 
                        WHERE tc_geofences.attributes LIKE '%"bins": "yes"%' AND JSON_EXTRACT(tc_geofences.attributes, "$.cartoon") IS NULL
                         `;

  if (query.id) {
    if (category === "bintype") {
      queryAllBins += "AND tcn_bin_type.id = ? ";
    } else if (category === "center") {
      queryAllBins += "AND tcn_centers.id = ? ";
    } else {
      queryAllBins += "AND tcn_routs.id = ? ";
    }
    allBinsParams.push(query.id);
  }

  const groupedBy = (emptedBins, allBins, category) => {
    const categorizedBins = (categoryId) =>
      Object.values(allBins).reduce((acc, bin) => {
        if (!acc[bin[categoryId]]) {
          acc[bin[categoryId]] = [];
        }
        acc[bin[categoryId]].push(bin);
        return acc;
      }, {});

    if (category === "route") {
      const allBinsByRoute = categorizedBins("routeId");

      const summary = Object.keys(allBinsByRoute).map((key) => {
        const empty_bin = emptedBins.filter((bin) => bin.routeId == key).length;
        const total = allBinsByRoute[key].length * numberOfDays;
        return {
          route: allBinsByRoute[key][0].rout_code,
          total,
          empty_bin,
          un_empty_bin: total - empty_bin,
          phone: `${parseInt(allBinsByRoute[key][0].phone)}`,
          shift: "morning",
          routeId: Number(key),
          driver: allBinsByRoute[key][0].driverName,
        };
      });

      return res.json(summary);
    }

    if (category === "bintype") {
      const allBinsByType = categorizedBins("binTypeId");

      const summary = Object.keys(allBinsByType).map((key) => {
        const empty_bin = emptedBins.filter(
          (bin) => bin.binTypeId == key
        ).length;
        const total = allBinsByType[key].length * numberOfDays;
        return {
          bintype: allBinsByType[key][0].bintype,
          total,
          empty_bin,
          un_empty_bin: total - empty_bin,
          binTypeId: Number(key),
        };
      });

      return res.json(summary);
    }

    if (category === "center") {
      const allBinsByCenter = categorizedBins("centerId");

      const summary = Object.keys(allBinsByCenter).map((key) => {
        const empty_bin = emptedBins.filter(
          (bin) => bin.centerId == key
        ).length;
        const total = allBinsByCenter[key].length * numberOfDays;

        return {
          center: allBinsByCenter[key][0].center_name,
          total,
          empty_bin,
          un_empty_bin: total - empty_bin,
          centerId: Number(key),
        };
      });

      return res.json(summary);
    }
  };

  try {
    db = await dbPools.pool.getConnection();

    const allBins = await db.query(queryAllBins, allBinsParams);

    let emptedBins = await db.query(dbQuery, [
      query.from,
      query.to || new Date().toISOString(),
    ]);

    const allBinsObject = allBins.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    emptedBins = emptedBins.map((bin) => ({
      ...bin,
      ...allBinsObject[bin.geoid],
    }));

    return groupedBy(emptedBins, allBins, category);
  } catch (e) {
    res.status(500).end();
  } finally {
    if (db) {
      await db.release();
    }
  }
};

const summary = async (req, res) => {
  let db;

  const query = req.query;
  //Query for last 7 days bins status
  const dbQuery = `SELECT tcn_poi_schedule.geoid, tcn_poi_schedule.serv_time FROM tcn_poi_schedule
                    WHERE tcn_poi_schedule.serv_time BETWEEN "${
                      query.from
                    }" AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }`;
  //Query for all bins
  const queryAllBins = `SELECT COUNT(tc_geofences.id) AS counter FROM tc_geofences
                        WHERE tc_geofences.attributes LIKE '%"bins": "yes"%' AND JSON_EXTRACT(tc_geofences.attributes, "$.cartoon") IS NULL`;

  try {
    db = await dbPools.pool.getConnection();
    const [allBins, data] = await Promise.all([
      db.query(queryAllBins),
      db.query(dbQuery),
    ]);

    const groupedByDate = new Object();

    data.forEach((item) => {
      const date = item.serv_time.toISOString().split("T")[0];
      if (groupedByDate[date]) {
        groupedByDate[date] += 1;
        return;
      }
      groupedByDate[date] = 1;
    });

    const response = new Array();

    for (let key in groupedByDate) {
      //Skip the first day because is not full
      // if (key === query.from.split("T")[0]) {
      //   continue;
      // }
      response.push({
        date: key,
        total: parseInt(allBins[0].counter),
        empty_bin: groupedByDate[key],
        un_empty_bin: parseInt(allBins[0].counter) - groupedByDate[key],
      });
    }
    res.json(response);
  } catch (error) {
    res.status(500).end();
  } finally {
    if (db) {
      await db.release();
    }
  }
};

// Patch Controllers

const updateBin = async (req, res) => {
  let db;

  const body = req.body;

  // Check if the target id is exist
  try {
    db = await dbPools.pool.getConnection();
    const query = `SELECT tc_geofences.id FROM tc_geofences WHERE tc_geofences.id='${body.id_bin}' AND tc_geofences.attributes LIKE '%"bins": "yes"%' AND JSON_EXTRACT(tc_geofences.attributes, "$.cartoon") IS NULL`;
    const targetExist = await db.query(query);

    if (!targetExist?.length) {
      throw new Error("You try to modify a none exist element");
    }

    if (body.position) {
      // Rename position property
      body.area = `CIRCLE(${body.position},7)`;
      delete body.position;
    }

    let keyValue = "";

    Object.keys(body).forEach((key, index, array) => {
      // Skip the id_bin
      if (key === "id_bin") return;

      keyValue += `${key}='${body[key]}'`;

      if (index === array.length - 1) return;

      keyValue += ",";
    });

    const updateQuery = `UPDATE tc_geofences SET ${keyValue} WHERE tc_geofences.id='${body.id_bin}'`;

    await db.query(updateQuery);

    res
      .status(204)
      .json({ success: true, message: "Item updated successfully" });
  } catch (e) {
    res
      .status(400)
      .json({ success: false, message: "Item cannot updated server error" });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

// Put Controller

const addBin = async (req, res) => {
  let db;

  const body = req.body;
  delete body.id_bin;

  // Optimize properties for DB
  if (body.position) {
    // Rename position property
    body.area = `CIRCLE(${body.position},7)`;
    delete body.position;
  }
  // Add attributes value

  body.attributes = {
    color: "#3f51b5",
    bins: "yes",
    ...body,
  };

  const flatValues = Object.values(body)
    .map((value) => {
      if (typeof value === "string") {
        return "'" + value + "'";
      }
      if (typeof value === "object") {
        return "'" + JSON.stringify(value, null, 1) + "'";
      }
      return value;
    })
    .join(", ");

  try {
    db = await dbPools.pool.getConnection();
    const addQuery = `INSERT INTO tc_geofences (${Object.keys(body).join(
      ", "
    )}) VALUES (${flatValues});`;

    const addRow = await db.query(addQuery);

    res.status(200).json({
      sccuess: true,
      message: "Entries added successfully",
    });
  } catch (e) {
    res.status(400).json({ success: false });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

const deleteBin = async (req, res) => {
  let db;

  const body = req.body;

  // body.selected contains ids of bins you want to delete

  try {
    db = await dbPools.pool.getConnection();
    if (body.selected.length > 10) {
      throw new Error(
        "You cannot delete more than 10 items for security reasons"
      );
    }
    const addQuery = `DELETE FROM tc_geofences WHERE tc_geofences.id IN (${Object.values(
      body.selected
    ).join(", ")});`;

    await db.query(addQuery);

    res.status(200).json({
      sccuess: true,
      message: "Entries deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

// Set a bin status [empted]

const updateBinStatus = async (req, res) => {
  let db;

  const { description } = req.body;

  if (!description)
    return res
      .status(404)
      .json({ success: false, message: "request without description" });

  const targetBinQuery = `SELECT tc_geofences.id, tc_devices.name FROM tc_geofences
                          JOIN tcn_routs ON tc_geofences.routid = tcn_routs.id
                          JOIN tc_devices ON tc_devices.id = tcn_routs.deviceid
                          WHERE tc_geofences.description="${description}" LIMIT 1`;

  try {
    db = await dbPools.pool.getConnection();
    // Check if the target bin is exist
    const targetBin = await db.query(targetBinQuery);
    if (!targetBin || !targetBin?.length)
      return res
        .status(404)
        .json({ success: false, message: "Bin not found !" });

    // Check if the target is already empted

    const isEmptedQuery = `SELECT id from tcn_poi_schedule WHERE serv_time BETWEEN "${req.query.from}" AND (select current_timestamp) AND geoid="${targetBin[0].id}"`;

    const isEmpted = await db.query(isEmptedQuery);

    if (isEmpted?.length)
      return res
        .status(409)
        .json({ success: false, message: "Conflict! already empted bin" });

    // Add bin to empted, query

    const addBinToEmptedQuery = `INSERT INTO tcn_poi_schedule (serv_time, geoid, codeserv, VehicleID) VALUES (current_timestamp, ${
      targetBin[0].id
    }, ${moment().format("YYYYMMDD") + targetBin[0].id}, "${
      targetBin[0].name
    }")`;

    await db.query(addBinToEmptedQuery);

    res.sendStatus(202);
  } catch (error) {
    // console.log(error);
    if (error?.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ success: false, message: "Conflict! already empted bin" });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    if (db) {
      await db.release();
    }
  }
};

export {
  bins,
  binById,
  binReports,
  binCategorized,
  summary,
  updateBin,
  addBin,
  deleteBin,
  updateBinStatus,
};
