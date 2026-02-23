import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "purge-old-dropoff-reports",
  { hours: 24 },
  internal.reports.purgeOldReports,
  {}
);

export default crons;
