import { logger, task } from "@trigger.dev/sdk/v3";
import { processNewAlertTask } from "./processNewAlert";

export const processAlertsTask = task({
    id: "process-alerts",
    // Set an optional maxDuration to prevent tasks from running indefinitely
    maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
    run: async (payload: any, { ctx }) => {
        const { alerts, settings } = payload;
        const allAlerts: any[] = [];

        if (alerts.length === undefined) {
            // Single record in XML
            allAlerts.push(alerts);
        }
        else {
            for (const alert of alerts) {
                allAlerts.push(alert);
            }
        }

        const storedTimestamp = settings?.lastProcessedAlertTimestamp || '0';
        const newAlerts = allAlerts.filter(alert => alert.MessageStamp > storedTimestamp);
        if (newAlerts.length === 0) {
            logger.info(`No new alerts detected after ${storedTimestamp}.`);
            return;
        }
        
        let latestTimestamp = storedTimestamp;

        for (const newAlert of newAlerts) {
            const postId = await processNewAlertTask.triggerAndWait(
                {alert: newAlert,
                settings,
            }).unwrap();
            
            if (!postId)
                // Stop processing if there is an error
                break;
            
            if (newAlert.MessageStamp > latestTimestamp) {
                latestTimestamp = newAlert.MessageStamp;
            }
        }
    },
});
