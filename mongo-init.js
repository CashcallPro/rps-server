// This script will be executed by the MongoDB entrypoint
// It runs using the MONGO_INITDB_ROOT_USERNAME and MONGO_INITDB_ROOT_PASSWORD

// Get the application username, password, and database name from environment variables
// These will be passed to the mongo container from docker-compose.yml,
// but for the init script, we need to define them or read them if they were passed to the mongo container itself.
// For this setup, we'll assume the script creates a specific user and database as per requirements.

const appUser = process.env.MONGO_APP_USERNAME || 'appuser'; // Default if not set, but should be from .env via docker-compose for the app service
const appPassword = process.env.MONGO_APP_PASSWORD || 'apppassword'; // Default if not set
const appDbName = process.env.MONGO_INITDB_DATABASE || 'titandb'; // Should be 'titandb' as per requirements

// Connect to the admin database
db = db.getSiblingDB('admin');

// Attempt to create the application user
const userCreationResult = db.createUser({
  user: appUser,
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: appDbName }],
});

if (userCreationResult.ok === 1 || (userCreationResult.code === 51003 || userCreationResult.errmsg.includes("User already exists"))) {
  print(`User '${appUser}' created or already exists.`);
} else {
  print(`Error creating user '${appUser}': ${JSON.stringify(userCreationResult)}`);
  // Decide if you want to exit with an error, which might stop the container startup
  // For now, just printing the error.
}

// Switch to the application database (it will be created if it doesn't exist)
db = db.getSiblingDB(appDbName);

// Optional: Create a dummy collection to ensure the database is created
// MongoDB creates databases lazily. A common practice is to create a collection.
const collectionCreationResult = db.createCollection('starter_collection');

if (collectionCreationResult.ok === 1 || (collectionCreationResult.code === 48 || collectionCreationResult.errmsg.includes("collection already exists"))) {
  print(`Collection 'starter_collection' created or already exists in '${appDbName}'.`);
  print(`Database '${appDbName}' ensured.`);
} else {
  print(`Error creating collection 'starter_collection': ${JSON.stringify(collectionCreationResult)}`);
}

print(`MongoDB initialization script for database '${appDbName}' and user '${appUser}' finished.`);
