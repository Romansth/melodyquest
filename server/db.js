const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool of connections to the PostgreSQL database
const pool = new Pool({
  user: process.env.DB_USER, // Database user
  host: process.env.DB_HOST, // Database host
  database: process.env.DB_NAME, // Database name
  password: process.env.DB_PASSWORD, // Database password
  port: process.env.DB_PORT, // Database port
  ssl: {
    rejectUnauthorized: false, // Set this to true in production with a proper certificate
  },
});

// Export the pool for use in other parts of the application
module.exports = pool;
