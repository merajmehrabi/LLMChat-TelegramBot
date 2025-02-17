import winston from 'winston';
import env from './env.config';

// Helper function to convert Error or string to string
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: env.logLevel,
  format: logFormat,
  defaultMeta: { service: 'llm-chat-bot' },
  transports: [
    // Write all logs to file
    new winston.transports.File({
      filename: env.logFilePath,
      level: env.logLevel
    }),
    // Write error logs to separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

// Add console transport in development
if (env.isDevelopment) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Helper functions for structured logging
export const logError = (message: string | Error, context: Record<string, any> = {}) => {
  const errorMessage = getErrorMessage(message);
  logger.error(errorMessage, {
    ...context,
    stack: message instanceof Error ? message.stack : undefined
  });
};

export const logWarning = (message: string | Error, context: Record<string, any> = {}) => {
  const warningMessage = getErrorMessage(message);
  logger.warn(warningMessage, context);
};

export const logInfo = (message: string | Error, context: Record<string, any> = {}) => {
  const infoMessage = getErrorMessage(message);
  logger.info(infoMessage, context);
};

export const logDebug = (message: string | Error, context: Record<string, any> = {}) => {
  const debugMessage = getErrorMessage(message);
  logger.debug(debugMessage, context);
};

export default logger;
