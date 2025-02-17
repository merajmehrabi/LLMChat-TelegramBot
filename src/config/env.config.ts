import dotenv from 'dotenv';
import { cleanEnv, str, num, bool } from 'envalid';

// Load environment variables from .env file
dotenv.config();

// Validate and type environment variables
const env = cleanEnv(process.env, {
  // Bot Configuration
  TELEGRAM_BOT_TOKEN: str(),
  OPENROUTER_API_KEY: str(),
  NODE_ENV: str({ choices: ['development', 'production', 'test'] }),

  // Database
  MONGODB_URI: str(),
  MONGODB_TEST_URI: str({ default: 'mongodb://localhost:27017/llm-chat-bot-test' }),

  // Security
  JWT_SECRET: str(),
  JWT_EXPIRY: str({ default: '24h' }),
  ENCRYPTION_KEY: str(),

  // Admin Configuration
  ADMIN_TELEGRAM_IDS: str(), // Comma-separated list of admin Telegram IDs

  // OpenRouter Configuration
  DEFAULT_MODEL: str({ default: 'claude-2' }),
  MAX_TOKENS: num({ default: 2000 }),
  TEMPERATURE: num({ default: 0.7 }),

  // Rate Limiting
  RATE_LIMIT_WINDOW: str({ default: '15m' }),
  RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),

  // Logging
  LOG_LEVEL: str({ default: 'info', choices: ['error', 'warn', 'info', 'debug', 'trace'] }),
  LOG_FILE_PATH: str({ default: 'logs/app.log' })
});

// Export typed environment configuration
export default {
  // Bot Configuration
  telegramToken: env.TELEGRAM_BOT_TOKEN,
  openrouterKey: env.OPENROUTER_API_KEY,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Database
  mongoUri: env.isTest ? env.MONGODB_TEST_URI : env.MONGODB_URI,

  // Security
  jwtSecret: env.JWT_SECRET,
  jwtExpiry: env.JWT_EXPIRY,
  encryptionKey: env.ENCRYPTION_KEY,

  // Admin Configuration
  adminIds: env.ADMIN_TELEGRAM_IDS.split(',').map((id: string) => id.trim()),

  // OpenRouter Configuration
  defaultModel: env.DEFAULT_MODEL,
  maxTokens: env.MAX_TOKENS,
  temperature: env.TEMPERATURE,

  // Rate Limiting
  rateLimitWindow: env.RATE_LIMIT_WINDOW,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,

  // Logging
  logLevel: env.LOG_LEVEL,
  logFilePath: env.LOG_FILE_PATH
} as const;
