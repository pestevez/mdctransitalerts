# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a log directory
RUN mkdir -p /usr/src/app/logs && chmod -R 777 /usr/src/app/logs

# Command to run the application
CMD ["node", "app.js"]
