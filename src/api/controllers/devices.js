import { db } from "../db/config/index.js";
import { TODAY } from "../helpers/constants.js";
import { date, string, z } from "zod";

const NearbyStopsBodySchema = z.object({
  latitude: z.union([z.string(), z.number()]),
  longitude: z.union([z.string(), z.number()]),
  devices: string().array().nonempty(),
  from: date(),
  to: date().optional(),
});

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

const nearbyStops = async (req, res) => {
  const { success } = NearbyStopsBodySchema.safeParse({
    ...req.query,
    devices: JSON.parse(req.query.devices),
    from: new Date(req.query.from),
  });

  if (!success) return res.status(400).end("Entries not valid");

  const { latitude, longitude, devices, to, from } = req.query;

  const dbQuery = `SELECT * FROM tc_positions
      WHERE latitude  BETWEEN ${latitude} - 0.001 AND ${latitude} + 0.001
      AND longitude BETWEEN ${longitude} - 0.001 AND ${longitude} + 0.001
      AND fixtime BETWEEN "${from}" AND ${
    to ? `"${to}"` : false || "(select current_timestamp)"
  } AND deviceid IN (${JSON.parse(devices).join(",")})`;

  try {
    const data = await db.query(dbQuery);

    res.json(data);
  } catch (error) {
    res.status(500).end();
  }
};
export { summary, nearbyStops };
