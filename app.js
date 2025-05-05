require('dotenv').config();
const axios = require('axios');
const log4js = require('log4js');
const xml2js = require('xml2js');
const fs = require('fs');

const {
    ACTION_BLOCKED_ERROR_CODE,
    ACTION_BLOCKED_ERROR_SUBCODE,
    ACTION_BLOCKED_PAUSED_DURATION_IN_MS,
    DEFAULT_LOG_FILE,
    DEFAULT_LOG_LEVEL,
    DEFAULT_SETTINGS,
    RIDER_ALERTS_FEED_URL,
    SETTINGS_FILE_PATH,
    THREADS_API_URL,
    TIMESTAMP_FILE_PATH,
} = require('./constants');

log4js.configure({
    appenders: {
        out: { type: "stdout" },
        app: {
            type: "file",
            filename: process.env.LOG_FILE || DEFAULT_LOG_FILE,
            layout: {
                type: 'pattern',
                pattern: '[%d{yyyy-MM-dd hh:mm:ss}] [%p] - %m',
            },
            maxLogSize: 10485760,
        },
    },
    categories: {
        default: {
            appenders: ["out", "app"],
            level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL
        },
    },
});
const logger = log4js.getLogger();

// Function to fetch rider alerts
const fetchRiderAlerts = async () => {
    try {
        logger.debug('Fetching rider alerts...');
        const response = await axios.get(RIDER_ALERTS_FEED_URL);
        logger.debug('Rider alerts fetched successfully.');

        const result = await xml2js.parseStringPromise(response.data, { explicitArray: false });
        return result.RecordSet.Record;
    } catch (error) {
        logger.error('Error fetching rider alerts:', error.data || error.cause);
        return null;
    }
};



// Main function
const main = async () => {
    

    

    settings.lastProcessedAlertTimestamp = latestTimestamp;
    saveSettings(settings);

    logger.trace('Application finished.');
};

// Execute the main function
main();
