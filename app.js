require('dotenv').config();
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

// URL of the rider alerts
const RIDER_ALERTS_FEED_URL = 'https://www.miamidade.gov/transit/WebServices/RiderAlerts/';
// Path to the file where the latest timestamp is stored
const TIMESTAMP_FILE_PATH = path.join(__dirname, 'latest_timestamp.txt');
// Social media API URL
const THREADS_API_URL = 'https://graph.threads.net';

// Function to get the current timestamp
const getCurrentTimestamp = () => {
    return new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
};

// Function to fetch rider alerts
const fetchRiderAlerts = async () => {
    try {
        const response = await axios.get(RIDER_ALERTS_FEED_URL);
        const result = await xml2js.parseStringPromise(response.data, { explicitArray: false });
        return result.RecordSet.Record;
    } catch (error) {
        console.error('Error fetching rider alerts:', error);
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

        const container_response = await axios.post(`${THREADS_API_URL}/me/threads?text=${encodeURIComponent(alertMessage)}&media_type=TEXT&access_token=${accessToken}`);
        const container_id = container_response?.data?.id;

        if (!container_id) {
            console.error('Error creating container:', container_response.data);
            return;
        }

        console.debug('Container created:', container_response.data);

        const publish_response = await axios.post(`${THREADS_API_URL}/me/threads_publish?creation_id=${container_id}&access_token=${accessToken}`);
        const post_id = publish_response?.data?.id;

        if (!post_id) {
            console.error('Error publishing container:', publish_response.data);
            return;
        }

        console.debug('Container published:', publish_response.data);

        const post_details = await axios.get(`${THREADS_API_URL}/${post_id}?fields=id,permalink&access_token=${accessToken}`);
        console.log('Alert posted to social media:', post_details.data);
    } catch (error) {
        console.error('Error posting to social media:', error.response);
    }
};

// Main function
const main = async () => {
    const alerts = await fetchRiderAlerts();
    if (!alerts) {
        console.log('No alerts found.');
        return;
    }

    let latestAlert = undefined;

    if (alerts.length === undefined) {
        // Single record in XML
        latestAlert = alerts;
    }
    else {
        // Find the alert with the newest timestamp
        latestAlert = alerts[0];
        for (const alert of alerts) {
            if (alert.MessageStamp > latestAlert.MessageStamp) {
                latestAlert = alert;
            }
        }
    }

    const latestTimestamp = latestAlert.MessageStamp;
    const storedTimestamp = readLatestTimestamp();

    if (!storedTimestamp || latestTimestamp > storedTimestamp) {
        const postText = createPostText(latestAlert);
        console.log('New alert detected:', latestAlert.Message);
        await postToSocialMedia(postText);
        writeLatestTimestamp(latestTimestamp);
    } else {
        console.log('No new alert detected.');
    }
};

// Execute the main function
main();
