# Rock Paper Scissors Server

## Repository Overview

This project is a TypeScript/NestJS application that implements a multiplayer Rock-Paper-Scissors game. The main server bootstrap in `src/main.ts` enables CORS, applies global validation pipes and listens on a configurable port.

The application module wires together the game, bot and user features, sets up MongoDB via `MongooseModule.forRootAsync` and registers the `CompletedGame` schema for persistence.

Key folders inside `src/`:

- **bot/** – Contains the Telegram bot integration. `BotService` retrieves configuration from environment variables, initializes the Telegram bot and exposes a `sendMessage` helper.
- **game/** – Implements the websocket gateway that orchestrates game sessions. `GameGateway` handles matchmaking, timeouts, scoring and session cleanup. It stores session data in Redis and allows bot opponents when no human match is found. Completed game details are stored with the `CompletedGame` schema.
- **users/** – Provides a user API backed by MongoDB. `UsersService` handles CRUD operations, coin balance changes and storing completed matches for each user. `UsersController` exposes endpoints for these operations, including adding and querying match history. User data uses the `User` schema which tracks coins, referrals and matches.
- **redis/** – Supplies a simple `RedisService` used by the game gateway for temporary session storage.
- **types/** – Currently holds a small `Player` interface.

Tests under `src/**` and `test/app.e2e-spec.ts` provide minimal coverage (they only check that the modules instantiate and that the root endpoint returns "Hello World").

Supporting configuration includes ESLint/Prettier settings, tsconfig files, Docker Compose definitions for Redis and MongoDB, and a minimal README.

## Tips for Getting Started

1. **Run the Server**
   - Ensure MongoDB and Redis are running (see `docker-compose.yml` for an example setup).
   - Provide environment variables such as `MONGODB_URI`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GAME_SHORTNAME`, `TELEGRAM_GAME_URL`, `TURN_TIMEOUT_DURATION_MS` and `MATCHMAKING_BOT_TIMEOUT_MS`.
   - Use `yarn start` (for dev mode `yarn start:dev`) to launch the Nest server.

2. **Understand Game Flow**
   - Review `GameGateway` to see how socket events (`find_match`, `make_choice`, `cancel_matchmaking`, `end_game`, etc.) are handled. Matching data is stored in Redis, and the gateway cleans up sessions when games end or clients disconnect.
   - Look into `CompletedGame` schema for persistent storage of results, and `UsersService.addMatch` to understand how user profiles track match history and coin changes.

3. **Explore Telegram Integration**
   - `BotService` demonstrates how to initialize a Telegram bot and respond to commands such as `/play` or `/start` with inline keyboards and referral logic.

4. **Possible Next Steps**
   - Expand the tests to cover real gameplay logic.
   - Harden the Redis and MongoDB connection settings.
   - Improve the README with setup instructions.
   - Consider adding authentication and better security for websocket events.

This layout should help a newcomer navigate the project and identify where key functionality resides. The primary learning areas are NestJS modules/controllers/providers, WebSocket handling with `socket.io`, MongoDB models via Mongoose and the Telegram Bot API integration.

## PM2 Commands

```bash
pm2 start yarn --name "rps" -- start

pm2 start yarn --name "rps-server" -- start:prod
```
