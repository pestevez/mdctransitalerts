import { logger, schedules } from "@trigger.dev/sdk/v3";
import * as fs from 'fs';
import { DEFAULT_SETTINGS, SETTINGS_FILE_PATH } from "../constants";
import { fetchRiderAlerts } from "./fetchRiderAlerts";

export const mainTask = schedules.task({
    id: "main",
    cron: "*/5 * * * *", // Run every 5 minutes
    // Set an optional maxDuration to prevent tasks from running indefinitely
    maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
    run: async (payload: any, { ctx }) => {
        logger.log("Starting the application...", { payload, ctx });

        const settings = readSettings();

        if (!settings?.enabled) {
            logger.info('Application is disabled. Exiting...');
            return;
        }

        if (settings?.paused) {
            const pausedUntil = new Date(settings?.pausedUntil);
            const currentTime = new Date();

            if (pausedUntil > currentTime) {
                logger.info(`Application is paused until ${settings?.pausedUntil}. Exiting...`);
                return;
            }

            settings.paused = false;
            settings.pausedUntil = null;
            saveSettings(settings);

            logger.info('Application is unpaused.');
        }

        const alerts = await fetchRiderAlerts.triggerAndWait({
            settings,
        }).unwrap();
        
        if (!alerts) {
            logger.info('No alerts found.');
            return;
        }

        return alerts;
    },
});

const readSettings = () => {
    if (!fs.existsSync(SETTINGS_FILE_PATH)) {
        logger.info('Settings file not found. Using default settings.');
        return DEFAULT_SETTINGS;
    }

    try {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf8'));
    }
    catch (error) {
        logger.error('Error reading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

const saveSettings = (settings) => {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 4), 'utf8');
}