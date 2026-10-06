import path from 'path';
import dotenv from 'dotenv';

/**
 * This function loads environment variables from a .env file located at the specified path.
 * It uses the dotenv package to achieve this.
 *
 * @param {string} options.path - The path to the .env file.
 */
const filePath = process.env.NODE_ENV === 'production' ? path.resolve('.env') : path.resolve('../.env');
dotenv.config({ path: filePath });

/**
 * This object contains environment variables used throughout the application.
 * The values are loaded from a .env file located at the specified path using the dotenv package.
 *
 * @typedef {Object} EnvironmentVariables
 * @property {string} MONGO_URI - The MongoDB connection URI.
 * @property {number} PORT - The server port number. Default is 8000 if not specified.
 * @property {string} NODE_ENV - The environment mode. Default is 'development' if not specified.
 * @property {string} CLIENT_URL - The server connection URL.
 * @property {string} JWT_SECRET - The secret key for JSON Web Tokens.
 * @property {string} TMDB_API_KEY - The API key for The Movie Database (TMDB).
 * @property {string} MAILTRAP_TOKEN - The token for Mailtrap SMTP service.
 * @property {string} MAILTRAP_ENDPOINT - The endpoint for Mailtrap SMTP service.
 */

const sanitizeEnvString = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/DRONE_SSH_PREV_COMMAND_EXIT_CODE=.*$/gi, '').trim();
};

export const ENV_VARS = {
  // APP configuration
  MONGO_URI: sanitizeEnvString(process.env.MONGO_URI),
  PORT: process.env.SERVER_PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_PORT: process.env.CLIENT_PORT || 3000,
  CLIENT_HOST: sanitizeEnvString(process.env.CLIENT_HOST) || 'localhost',
  CLIENT_URL: sanitizeEnvString(process.env.CLIENT_URL) || 'http://localhost:5173',

  // JWT configuration
  JWT_SECRET: sanitizeEnvString(process.env.JWT_SECRET),

  // TMDB API configuration
  TMDB_API_KEY: sanitizeEnvString(process.env.TMDB_API_KEY),

  // Mailtrap legacy configuration
  MAILTRAP_TOKEN: sanitizeEnvString(process.env.MAILTRAP_TOKEN),
  MAILTRAP_ENDPOINT: sanitizeEnvString(process.env.MAILTRAP_ENDPOINT),

  // Universal SMTP Email Configuration (Nodemailer: Gmail / Mailtrap / SES)
  SMTP_HOST: sanitizeEnvString(process.env.SMTP_HOST) || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: sanitizeEnvString(process.env.SMTP_USER),
  SMTP_PASS: sanitizeEnvString(process.env.SMTP_PASS),
  EMAIL_FROM: sanitizeEnvString(process.env.EMAIL_FROM) || '"Netflix Clone" <no-reply@netflix-clone.com>',

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: sanitizeEnvString(process.env.GOOGLE_CLIENT_ID),

  // PostgreSQL Database configuration
  DATABASE_URL: sanitizeEnvString(process.env.DATABASE_URL),
  DB_HOST: sanitizeEnvString(process.env.DB_HOST),
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: sanitizeEnvString(process.env.DB_USER),
  DB_PASSWORD: sanitizeEnvString(process.env.DB_PASSWORD),
  DB_NAME: sanitizeEnvString(process.env.DB_NAME),
  DB_SSL: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production',
};
