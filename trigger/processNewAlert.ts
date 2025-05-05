import { logger, task } from "@trigger.dev/sdk/v3";
import { ACTION_BLOCKED_ERROR_CODE, ACTION_BLOCKED_ERROR_SUBCODE, ACTION_BLOCKED_PAUSED_DURATION_IN_MS, THREADS_API_URL } from "../constants";
import axios from "axios";

const processNewAlert = async (alert, settings) => {
    logger.info(`New alert detected: [ID: ${alert.MessageID}; Time: ${alert.MessageStamp}] ${alert.Message}`);

    const postText = createPostText(alert);

    return await postToSocialMedia(postText, settings);
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

// Function to post alert to social media
const postToSocialMedia = async (alertMessage, settings) => {
    try {
        const accessToken = process.env.ACCESS_TOKEN;

        logger.debug('Creating container...');
        const container_response = await axios.post(`${THREADS_API_URL}/me/threads?text=${encodeURIComponent(alertMessage)}&media_type=TEXT&access_token=${accessToken}`);
        const container_id = container_response?.data?.id;

        if (!container_id) {
            logger.error('Error creating container:', container_response.data);
            return null;
        }

        logger.info('Container created:', container_response.data);

        logger.debug('Publishing container...');
        const publish_response = await axios.post(`${THREADS_API_URL}/me/threads_publish?creation_id=${container_id}&access_token=${accessToken}`);
        const post_id = publish_response?.data?.id;

        if (!post_id) {
            logger.error('Error publishing container:', publish_response.data);
            return null;
        }

        logger.info('Container published:', publish_response.data);

        logger.debug('Getting post details...');
        const post_details = await axios.get(`${THREADS_API_URL}/${post_id}?fields=id,permalink&access_token=${accessToken}`);
        console.info('Alert posted to social media:', post_details.data);

        return publish_response.data.id;
    } catch (error) {
        logger.error('Error posting to social media:', error.response.data);
        updateSettingsFromGraphApiResponse(error.response.data, settings);
        return null;
    }
};

const updateSettingsFromGraphApiResponse = (response, settings) => {
    if (response?.error?.code === ACTION_BLOCKED_ERROR_CODE &&
        response?.error?.error_subcode === ACTION_BLOCKED_ERROR_SUBCODE) {
        
        const pausedUntil = new Date(Date.now() +
            ACTION_BLOCKED_PAUSED_DURATION_IN_MS);

        logger.warn(`Action blocked. Pausing the application until ${pausedUntil.toString()}...`);
        
        settings.paused = true;
        settings.pausedUntil = pausedUntil.toUTCString();
        // saveSettings(settings);
    }
}

export const processNewAlertTask = task({
    id: "process-new-alert",
    // Set an optional maxDuration to prevent tasks from running indefinitely
    maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
    run: async (payload: any, { ctx }) => {
        const { alert, settings } = payload;
        
        const postId = await processNewAlert(alert, settings);
        
        return postId;
    },
});