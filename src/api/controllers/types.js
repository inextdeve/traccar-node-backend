// Controllers for bin types
import { db } from "../db/config/index.js";
import { flatArray } from "../helpers/utils.js";

export const types = async (_, res) => {
  const query = "SELECT * FROM tcn_bin_type";
  try {
    const dbQuery = await db.query(query);
    res.json(dbQuery);
  } catch (error) {
    res.status(400).end();
  }
};

export const editType = async (req, res) => {
  const body = req.body;

  try {
    const query = `SELECT tcn_bin_type.id FROM tcn_bin_type WHERE tcn_bin_type.id='${body.id}'`;
    const targetExist = await db.query(query);

    if (!targetExist?.length) {
      throw new Error("You try to modify a none exist element");
    }

    let keyValue = "";

    Object.keys(body).forEach((key, index, array) => {
      // Skip the id_bin
      if (key === "id") return;

      keyValue += `${key}='${body[key]}'`;

      if (index === array.length - 1) return;

      keyValue += ",";
    });

    const updateQuery = `UPDATE tcn_bin_type SET ${keyValue} WHERE tcn_bin_type.id='${body.id}'`;

    await db.query(updateQuery);

    res
      .status(204)
      .json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addType = async (req, res) => {
  const body = req.body;
  delete body.id;

  try {
    const values = flatArray(Object.values(body));
    const keys = Object.keys(body).join(", ");

    const query = `INSERT INTO tcn_bin_type (${keys}) VALUES (${values})`;

    await db.query(query);

    res.json({ sccuess: true, message: "Entries added successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: "Cannot add entries" });
  }
};

export const deleteType = async (req, res) => {
  const body = req.body;

  // body.selected contains ids of bins you want to delete

  // Create query

  const targetIds = Object.values(body.selected).join(", ");

  try {
    throw new Error("This operation is currently blocked for security reasons");

    const query = `DELETE FROM tcn_bin_type WHERE tcn_bin_type.id IN (${targetIds});`;

    await db.query(query);

    res.status(200).json({
      success: true,
      message: "Entries deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
