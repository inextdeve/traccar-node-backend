import moment from "moment";
const YESTERDAY = moment().subtract(1, "days").format("YYYY-MM-DD");

export { YESTERDAY };
