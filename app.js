require('dotenv').config();
const axios = require('axios');
const log4js = require('log4js');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_LOG_FILE = 'logs/application.log';

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

// URL of the rider alerts
const RIDER_ALERTS_FEED_URL = 'https://www.miamidade.gov/transit/WebServices/RiderAlerts/';
// Path to the file where the latest timestamp is stored
const TIMESTAMP_FILE_PATH = path.join(__dirname, 'data/latest_timestamp.txt');
// Social media API URL
const THREADS_API_URL = 'https://graph.threads.net';

// Function to get the current timestamp
const getCurrentTimestamp = () => {
    return new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
};

// Function to fetch rider alerts
const fetchRiderAlerts = async () => {
    try {
        logger.debug('Fetching rider alerts...');
        const response = await axios.get(RIDER_ALERTS_FEED_URL);
        logger.debug('Rider alerts fetched successfully.');

        const result = await xml2js.parseStringPromise(response.data, { explicitArray: false });
        return result.RecordSet.Record;
    } catch (error) {
        logger.error('Error fetching rider alerts:', error);
        return null;
    }
};

// Function to read the latest timestamp from the file
const readLatestTimestamp = () => {
    if (!fs.existsSync(TIMESTAMP_FILE_PATH)) {
        const currentTimestamp = getCurrentTimestamp();
        writeLatestTimestamp(currentTimestamp);
        return currentTimestamp;
    }
    return fs.readFileSync(TIMESTAMP_FILE_PATH, 'utf8');
};

// Function to write the latest timestamp to the file
const writeLatestTimestamp = (timestamp) => {
    fs.writeFileSync(TIMESTAMP_FILE_PATH, timestamp, 'utf8');
};

// Function to format the timestamp
const formatTimestamp = (timestamp) => {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(8, 10);
    const minute = timestamp.slice(10, 12);
    const second = timestamp.slice(12, 14);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

// Function to create post text
const createPostText = (alert) => {
    let emoji;
    switch (alert.Type) {
        case 'MetroMover':
        case 'Mover':
            emoji = '🚈';
            break;
        case 'Bus':
            emoji = '🚌';
            break;
        case 'Train':
        case 'Rail':
            emoji = '🚆';
            break;
        default:
            emoji = 'ℹ️';
    }
    const alertTime = formatTimestamp(alert.MessageStamp);
    return `${emoji} [${alert.Type}] ${alert.Message} \n\nTime: ${alertTime} ET`;
};

// Function to post alert to social media
const postToSocialMedia = async (alertMessage) => {
    try {
        const accessToken = process.env.ACCESS_TOKEN;

        logger.debug('Creating container...');
        const container_response = await axios.post(`${THREADS_API_URL}/me/threads?text=${encodeURIComponent(alertMessage)}&media_type=TEXT&access_token=${accessToken}`);
        const container_id = container_response?.data?.id;

        if (!container_id) {
            logger.error('Error creating container:', container_response.data);
            return;
        }

        logger.info('Container created:', container_response.data);

        logger.debug('Publishing container...');
        const publish_response = await axios.post(`${THREADS_API_URL}/me/threads_publish?creation_id=${container_id}&access_token=${accessToken}`);
        const post_id = publish_response?.data?.id;

        if (!post_id) {
            logger.error('Error publishing container:', publish_response.data);
            return;
        }

        logger.info('Container published:', publish_response.data);

        logger.debug('Getting post details...');
        const post_details = await axios.get(`${THREADS_API_URL}/${post_id}?fields=id,permalink&access_token=${accessToken}`);
        console.info('Alert posted to social media:', post_details.data);
    } catch (error) {
        logger.error('Error posting to social media:', error.response);
    }
};

const processNewAlert = async (alert) => {
    logger.info('New alert detected:', alert.Message);

    const postText = createPostText(alert);

    await postToSocialMedia(postText);
};

// Main function
const main = async () => {
    logger.trace('Starting the application...');

    const alerts = await fetchRiderAlerts();
    if (!alerts) {
        logger.info('No alerts found.');
        return;
    }

    const allAlerts = [];
    const storedTimestamp = readLatestTimestamp();

    if (alerts.length === undefined) {
        // Single record in XML
        allAlerts.push(alerts);
    }
    else {
        for (const alert of alerts) {
            allAlerts.push(alert);
        }
    }

    const newAlerts = allAlerts.filter(alert => alert.MessageStamp > storedTimestamp);
    if (newAlerts.length === 0) {
        logger.info(`No new alerts detected after ${storedTimestamp}.`);
        return;
    }
    
    let latestTimestamp = storedTimestamp;

    for (const newAlert of newAlerts) {
        await processNewAlert(newAlert);
        
        if (newAlert.MessageStamp > latestTimestamp) {
            latestTimestamp = newAlert.MessageStamp;
        }
    }

    writeLatestTimestamp(latestTimestamp);

    logger.trace('Application finished.');
};

// Execute the main function
main();
