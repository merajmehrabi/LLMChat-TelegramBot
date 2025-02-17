import { botController } from './bot.controller';
import { createError } from '../types/errors';
import { formatErrorMessage } from '../utils';

// Create a type-safe interface for the bot controller's public API
interface BotControllerAPI {
  initializeBot(): Promise<void>;
}

// Export only the public interface of the bot controller
export const botControllerAPI: BotControllerAPI = {
  initializeBot: botController.initializeBot.bind(botController)
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

// Export default object with public API
export default {
  botController: botControllerAPI,
  createControllerError
};
