FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose the API port
EXPOSE 4001

# Start the server
CMD ["node", "server.js"]
