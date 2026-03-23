# Use Node.js 20 slim as the base image
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Set the environment variable for the port that Cloud Run expects
ENV PORT=8080

# Expose the port (informative only as Cloud Run handles this)
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]
