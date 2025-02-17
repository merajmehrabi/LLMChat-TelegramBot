import {
  formatErrorMessage,
  createOperationError,
  createErrorMessage,
  createResourceNotFoundError,
  createAuthorizationError,
  ErrorMessages,
  type ErrorOperation
} from './error.utils';

// Export individual utilities
export {
  formatErrorMessage,
  createOperationError,
  createErrorMessage,
  createResourceNotFoundError,
  createAuthorizationError,
  ErrorMessages,
  type ErrorOperation
};

// Export default object with utilities
const utils = {
  formatErrorMessage,
  createOperationError,
  createErrorMessage,
  createResourceNotFoundError,
  createAuthorizationError,
  ErrorMessages
};

export default utils;
