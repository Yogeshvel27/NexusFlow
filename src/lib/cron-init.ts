import { checkAndSendAlerts } from "./cron-worker";

if (typeof window === "undefined") {
  if (!(global as any).dueTasksTimerRegistered) {
    (global as any).dueTasksTimerRegistered = true;
    console.log("[NexusFlow Cron] Registering background task due date checker (runs every 5 minutes)...");

    // Wait 10 seconds before running the first check to allow server startup to stabilize
    setTimeout(() => {
      checkAndSendAlerts().catch(err => {
        console.error("[NexusFlow Cron] Error in initial background task checker:", err);
      });
    }, 10000);

    setInterval(() => {
      checkAndSendAlerts().catch(err => {
        console.error("[NexusFlow Cron] Error in background task checker:", err);
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}
