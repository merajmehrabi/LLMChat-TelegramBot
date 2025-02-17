import botController from './bot.controller';
import { createError } from '../types/errors';
import { formatErrorMessage, ErrorMessages } from '../utils';

// Export controllers
export {
  botController
};

// Export error utilities for controllers
export const createControllerError = (
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
) => {
  return createError(
    'TELEGRAM',
    formatErrorMessage(operation, error, context)
  );
};

// Export default object
export default {
  botController,
  createControllerError
};
