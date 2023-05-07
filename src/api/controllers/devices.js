import { db } from "../db/config/index.js";
import { TODAY } from "../helpers/constants.js";

const summary = async (req, res) => {
  const query = req.query;

  const dbQuery = `SELECT count(DISTINCT tc_events.deviceid) AS exited, eventtime AS eventTime from  tc_events
                  inner join tc_user_device on tc_events.deviceid = tc_user_device.deviceid
                  where tc_events.eventtime BETWEEN ${
                    query.from
                      ? `"${query.from}"`
                      : false || `"${TODAY()} 00:00"`
                  } AND ${
    query.to ? `"${query.to}"` : false || "(select current_timestamp)"
  }
                  GROUP BY DATE_FORMAT(tc_events.eventtime, '%Y-%m-%d')
                  `;
  const totalQuery = "SELECT COUNT(id) AS total from tc_devices";

  try {
    const [total, data] = await Promise.all([
      db.query(totalQuery),
      db.query(dbQuery),
    ]);
    const response = data.map((element) => ({
      ...element,
      exited: parseInt(element.exited),
      notExited: parseInt(total[0].total) - parseInt(element.exited),
      total: parseInt(total[0].total),
    }));

    res.json(response);
  } catch (error) {
    res.status(500).end;
  }
};
export { summary };
