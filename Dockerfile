# Use an official Node.js runtime as a parent image
FROM node:22-alpine AS development

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
COPY yarn.lock ./

# Install app dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# Copy package.json and yarn.lock to leverage Docker cache
COPY package*.json ./
COPY yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Copy built artifacts from the development stage
COPY --from=development /usr/src/app/dist ./dist

# Expose the port the app is designed to run on (e.g., 3000).
# The actual port listening inside the container can be configured by APP_INTERNAL_PORT
# in main.ts, and this is what docker-compose will map to.
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
