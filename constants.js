const path = require('path');

const ACTION_BLOCKED_ERROR_CODE = 1;
const ACTION_BLOCKED_ERROR_SUBCODE = 2207051;
const ACTION_BLOCKED_PAUSED_DURATION_IN_MS = 60 * 60 * 100; // 1 hour

const DEFAULT_LOG_FILE = 'logs/application.log';
const DEFAULT_LOG_LEVEL = 'info';

const DEFAULT_SETTINGS = {
    enabled: true,
    paused: false,
    pausedUntil: null,
    lastProcessedAlertTimestamp: null,
};

// URL of the rider alerts
const RIDER_ALERTS_FEED_URL = 'https://www.miamidade.gov/transit/WebServices/RiderAlerts/';

const SETTINGS_FILE_PATH = path.join(__dirname, 'data/settings.json');

// Threads API URL
const THREADS_API_URL = 'https://graph.threads.net';

// Path to the file where the latest timestamp is stored
const TIMESTAMP_FILE_PATH = path.join(__dirname, 'data/latest_timestamp.txt');

module.exports = {
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
};