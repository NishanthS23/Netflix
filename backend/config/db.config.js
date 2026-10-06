import pg from 'pg';
import { ENV_VARS } from './env.config.js';
import { getCurrentDateTime } from '../helpers/helper.js';

const { Pool } = pg;

let poolConfig = {};

if (ENV_VARS.DATABASE_URL) {
  const cleanConnectionString = ENV_VARS.DATABASE_URL.replace(/[\?&]sslmode=[^&]+/gi, '');
  poolConfig = {
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
  };
} else {
  poolConfig = {
    host: ENV_VARS.DB_HOST,
    port: ENV_VARS.DB_PORT,
    user: ENV_VARS.DB_USER,
    password: ENV_VARS.DB_PASSWORD,
    database: ENV_VARS.DB_NAME,
    ssl: { rejectUnauthorized: false },
  };
}

export const pool = new Pool(poolConfig);

/**
 * Establishes a connection to PostgreSQL and initializes database schema tables.
 */
export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connection established successfully, ' + getCurrentDateTime());

    // Auto-create required tables if they do not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        profile_pic VARCHAR(255) DEFAULT '/avatar1.png',
        search_history JSONB DEFAULT '[]'::jsonb,
        reset_password_token VARCHAR(255),
        reset_password_expires_at TIMESTAMP,
        verification_token VARCHAR(255),
        verification_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custom_videos (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT 'General',
        video_path VARCHAR(500),
        video_file_id VARCHAR(64),
        video_filename VARCHAR(255) NOT NULL,
        video_content_type VARCHAR(100) DEFAULT 'video/mp4',
        video_size BIGINT NOT NULL,
        thumbnail_path VARCHAR(500),
        thumbnail_file_id VARCHAR(64),
        user_id VARCHAR(64) NOT NULL,
        username VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    client.release();
    console.log('PostgreSQL tables initialized and ready.');
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
  process.on(signal, async () => {
    try {
      await pool.end();
      console.log('PostgreSQL pool closed gracefully at ' + getCurrentDateTime());
    } catch (e) {
      // ignore
    }
    process.exit(0);
  })
);
