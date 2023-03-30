import { db } from "../db/config/index.js";
import { getDatesInRange } from "../helpers/utils.js";

import { TODAY, LAST7DAYS, YESTERDAY, LASTWEEK } from "../helpers/constants.js";
const summary = async (req, res) => {
  const query = req.query;

  const dbQuery = `SELECT count(DISTINCT tc_events.deviceid) AS completed, eventtime from  tc_events
                  inner join tc_user_device on tc_events.deviceid = tc_user_device.deviceid
                  where tc_events.eventtime BETWEEN ${
                    query.from ? `"${query.from}"` : false || `"${TODAY} 00:00"`
                  } AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }
                  GROUP BY DATE_FORMAT(tc_events.eventtime, '%Y-%m-%d')
                  `;

  try {
    const data = (await db.query(dbQuery)).map((element) => ({
      ...element,
      completed: parseInt(element.completed),
    }));
    res.json(data);
  } catch (error) {
    res.status(500).end;
  }
};
export { summary };
