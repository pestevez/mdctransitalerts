// Trigger.dev trigger that runs every 5 minutes to fetch rider alerts from the database and send them to the rider
import { logger, task, tasks, wait } from "@trigger.dev/sdk/v3";
import axios from "axios";
import * as xml2js from "xml2js";
import { RIDER_ALERTS_FEED_URL } from "../constants";
import { processAlertsTask } from "./processAlerts";

export const fetchRiderAlerts = task({
    id: "fetch-rider-alerts",
    // Set an optional maxDuration to prevent tasks from running indefinitely
    maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
    run: async (payload: any, { ctx }) => {
        logger.log("Fetching rider alerts");
        
        const { settings } = payload;
        
        const response = await axios.get(RIDER_ALERTS_FEED_URL);
        
        logger.debug('Rider alerts fetched successfully.');

        const result = await xml2js.parseStringPromise(response.data, { explicitArray: false });
        const alerts = result.RecordSet.Record;

        await tasks.trigger<typeof processAlertsTask>("process-alerts", {
            alerts,
            settings,
        });
    },
});