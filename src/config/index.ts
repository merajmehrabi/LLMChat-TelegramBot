import env from './env.config';
import logger, { logError, logInfo, logWarning, logDebug } from './logger.config';
import { connectDB } from './db.config';
import { openRouterClient } from './openrouter.config';

// Export configuration
export {
  env,
  logger,
  logError,
  logInfo,
  logWarning,
  logDebug,
  connectDB,
  openRouterClient
};

// Export default object
export default {
  env,
  logger,
  logError,
  logInfo,
  logWarning,
  logDebug,
  connectDB,
  openRouterClient
};
