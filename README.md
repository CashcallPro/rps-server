# RPS Server (Rock Paper Scissors)

This project is a backend server for a Rock Paper Scissors game, built with NestJS. It uses MongoDB for data storage and Redis for caching or session management. The application is fully containerized using Docker.

Using docker compose up lunches only mongo and redis instances and doesn't actually lunch/build the backend application

## Production build
> docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

down server:
> docker compose -f docker-compose.yml -f docker-compose.prod.yml down
## Server log
> docker logs -f rps-server-app-prod

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Environment Variables](#environment-variables)
  - [Development Environment](#development-environment)
  - [Production Environment](#production-environment)
- [Running Tests](#running-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Project Structure](#project-structure)

## Prerequisites

Before you begin, ensure you have the following installed:
- [Docker](https://www.docker.com/get-started) (with Docker Compose V2 support, i.e., `docker compose` command)
- [Node.js](https://nodejs.org/) (for local development outside Docker, if needed, or for `yarn` commands locally)
- [Yarn](https://yarnpkg.com/) (as the package manager)

## Getting Started

### Environment Variables

The application uses environment variables for configuration. These are managed through a `.env` file at the root of the project.

1.  **Create `.env` file**: Copy the example file `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  **Update `.env`**: Open the `.env` file and customize the variables as needed. Refer to `.env.example` for the full list and descriptions. Key categories include:
    *   **Application Specific Variables**: `TELEGRAM_BOT_TOKEN`, `PORT` (app's internal listening port), `MONGODB_URI` (crucial for DB connection), `HASH_KEY`, and other game/bot parameters.
        *   Ensure `MONGODB_URI` is correctly formatted for Docker, e.g., `mongodb://appuser:apppassword@mongodb:27017/titandb?authSource=admin`, using the credentials defined by `APP_MONGO_USERNAME_INIT` and `APP_MONGO_PASSWORD_INIT`.
    *   **Docker Environment & Service Initialization Variables**:
        *   `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`: For MongoDB service's initial setup.
        *   `APP_MONGO_USERNAME_INIT`, `APP_MONGO_PASSWORD_INIT`, `APP_MONGO_DATABASE_INIT`: Define the user/database `mongo-init.js` will create.
        *   `REDIS_HOST`, `REDIS_PORT`: For the application to connect to Redis.
    *   **Host Port Mapping Variables**: `HOST_APP_PORT`, `HOST_MONGO_PORT`, `HOST_REDIS_PORT`. These define which ports on your *host machine* map to the services running inside Docker containers.
    - **Important**: For any real deployment, change all default credentials and secret keys.

### Development Environment

The development setup uses Docker Compose with live reloading for the application.

1.  **Build and Start Containers**:
    ```bash
    docker compose up --build -d
    ```
    This command:
    - Uses `docker-compose.yml` as the base and automatically applies overrides from `docker-compose.override.yml`.
    - Builds the Docker image for the application if it doesn't exist or if Dockerfile changes.
    - Starts all services (`app`, `mongodb`, `redis-server`) in detached mode (`-d`).
    - The application will be accessible on `http://localhost:<HOST_APP_PORT>` (default: `http://localhost:3000`).
    - MongoDB will be accessible on `localhost:<HOST_MONGO_PORT>` (default: `27017`).
    - Redis will be accessible on `localhost:<HOST_REDIS_PORT>` (default: `6379`).

2.  **View Logs**:
    - To view logs for all services:
      ```bash
      docker compose logs -f
      ```
    - To view logs for a specific service (e.g., the app):
      ```bash
      docker compose logs -f app
      ```

3.  **Stop Containers**:
    ```bash
    docker compose down
    ```
    To stop and remove volumes (like MongoDB data):
    ```bash
    docker compose down -v
    ```

### Production Environment

The production setup uses a Docker Compose configuration optimized for production.

1.  **Ensure Environment Variables are Set**:
    For production, environment variables should ideally be injected by your hosting environment or CI/CD system, not from a committed `.env` file. However, if using a `.env` file for a specific production-like deployment, ensure it has production-ready values (especially secrets).

2.  **Build and Start Containers**:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    ```
    This command:
    - Explicitly uses `docker-compose.yml` and `docker-compose.prod.yml`.
    - Builds the production-optimized Docker image.
    - Starts all services. The application code is baked into the image; no live reloading.

3.  **View Logs and Stop Containers**:
    Use the same `docker compose logs` and `docker compose down` commands as in development, but include the prod compose file if necessary for `down` if it defines specific resources:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down
    ```

## Running Tests

The project includes unit and end-to-end (e2e) tests.

1.  **Install Dependencies (if not already done for other local tasks)**:
    ```bash
    yarn install --frozen-lockfile
    ```

2.  **Run Tests**:
    - Run all tests (unit and e2e):
      ```bash
      # Ensure you have a test environment configured or use the CI setup.
      # E2E tests might require running database instances.
      yarn test
      yarn test:e2e
      ```
    - The CI pipeline (`.github/workflows/ci.yml`) runs these tests in an environment with MongoDB and Redis services.

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Continuous Delivery. The workflow is defined in `.github/workflows/ci.yml`.

-   **Triggers**: On pushes and pull requests to the `main` branch.
-   **Jobs**:
    1.  **Lint and Format Check**: Verifies code style and formatting.
    2.  **Run Tests**: Executes unit and e2e tests against Node.js 18, with MongoDB and Redis services available to the test runner.
    3.  **Build Docker Image**: Builds the application's Docker image.
    4.  **Push to GHCR**: On pushes to `main`, the built Docker image is tagged and pushed to GitHub Container Registry (GHCR).

The image will be available at `ghcr.io/<YOUR_GITHUB_USERNAME_OR_ORG>/<REPOSITORY_NAME>`.

## Project Structure (Brief Overview)

-   `src/`: Contains the NestJS application source code.
    -   `main.ts`: Application entry point.
    -   `app.module.ts`: Root module.
    -   Other modules for features (e.g., `users/`, `game/`, `bot/`).
-   `test/`: Contains e2e tests.
-   `Dockerfile`: Defines the multi-stage Docker build for the application.
-   `docker-compose.yml`: Base Docker Compose configuration (MongoDB, Redis, network).
-   `docker-compose.override.yml`: Docker Compose overrides for the development environment (app service with hot-reloading).
-   `docker-compose.prod.yml`: Docker Compose overrides for the production environment (app service optimized for production).
-   `.env.example`: Template for environment variables.
-   `mongo-init.js`: Initialization script for MongoDB to create the application user and database.
-   `.github/workflows/ci.yml`: GitHub Actions CI/CD workflow definition.



## Redis problem
it would solved by
> docker exec -it redis-server redis-cli

> REPLICAOF NO ONE

---

This README provides a starting point. Feel free to expand it with more details about API endpoints, specific game logic, or deployment instructions for your chosen platform.
