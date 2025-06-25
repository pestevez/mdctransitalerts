# MDC Transit Alerts

This application fetches rider alerts from the Miami-Dade County transit system and posts them to social media using the Threads API. It is built with Node.js and uses several dependencies including axios, dotenv, log4js, and xml2js.

## Features

- Fetches rider alerts from the Miami-Dade County transit system.
- Posts alerts to social media (Threads API).
- Configurable via environment variables and a settings file.
- Logging and error handling built-in.
- Docker support for easy deployment.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)
- Docker (optional, for containerized deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pestevez/mdctransitalerts.git
   cd mdctransitalerts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following environment variables:
   ```
   ACCESS_TOKEN=your_threads_api_access_token
   LOG_FILE=logs/application.log
   LOG_LEVEL=info
   ```

   Replace `your_threads_api_access_token` with your actual Threads API access token.

## Usage

### Running Locally

To start the application, run:
```bash
npm start
```

### Running with Docker

1. Build the Docker image:
   ```bash
   docker build -t mdctransitalerts .
   ```

2. Run the container:
   ```bash
   docker run -d --env-file .env mdctransitalerts
   ```

## Configuration

The application uses a settings file located at `data/settings.json`. If the file does not exist, default settings will be used. You can modify the settings file to enable/disable the application or adjust other parameters.

## Environment Variables

In addition to the required variables, you can configure the following (optional):

```
MAX_CONTAINER_STATUS_ATTEMPTS=5                # Maximum number of attempts to check if a Threads container is ready (default: 5)
CONTAINER_STATUS_INITIAL_WAIT_MS=1000          # Initial wait time in milliseconds before first status check (default: 1000)
AUTO_REPLY=false                               # Whether to automatically reply to posts with transit alert info (default: false)
```

## Improved Posting Logic

When posting to Threads, the app now waits for the media container to be ready before publishing. It checks the container status with exponential backoff (starting at 1 second, doubling each time), up to the configured maximum number of attempts. This helps avoid errors from publishing too soon.

If the container is not ready after the maximum attempts, the post is aborted and an error is logged.

## License

This project is licensed under the ISC License. 