// Imported first by server.ts. The gateway's telemetry library tries to detect
// whether it runs on Google Cloud and prints a warning when it doesn't. We
// aren't, so switch that check off.
process.env.METADATA_SERVER_DETECTION ??= "none";
