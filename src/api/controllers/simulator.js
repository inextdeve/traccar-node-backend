import { db } from "../db/config/index.js";
import axios from "axios";
const apiKey = "AIzaSyARJ_KeukkNkWiSOWFZ6nJl31anmVC_R14";

const simulator = async (req, res) => {
  const waypoints = [
    // Your array of more than 25 waypoints here
  ];

  // Function to divide waypoints into segments of 25 or fewer
  function divideWaypointsIntoSegments(waypoints, segmentSize) {
    const segments = [];
    for (let i = 0; i < waypoints.length; i += segmentSize) {
      const segment = waypoints.slice(i, i + segmentSize);
      segments.push(segment);
    }
    return segments;
  }

  // Function to get directions for a segment of waypoints
  async function getDirectionsForSegment(segment) {
    const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${
      segment[0]
    }&destination=${
      segment[segment.length - 1]
    }&waypoints=optimize:true|${segment.join("|")}&key=${apiKey}`;

    try {
      const response = await axios.get(apiUrl);
      if (response.data.status === "OK") {
        return response.data.routes[0];
      } else {
        throw new Error("Directions request failed");
      }
    } catch (error) {
      throw new Error("Error in directions request");
    }
  }

  // Function to get directions for the entire route
  async function getDirectionsForRoute(waypoints) {
    const segmentSize = 25;
    const segments = divideWaypointsIntoSegments(waypoints, segmentSize);
    const route = [];

    for (const segment of segments) {
      const directions = await getDirectionsForSegment(segment);
      route.push(...directions.legs);
    }

    return route;
  }

  // Call the function to get directions for the entire route
  getDirectionsForRoute(waypoints)
    .then((route) => {
      console.log("Complete route directions:", route);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};
export { simulator };
