/**
 * Helper function to convert Error or string to string
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

/**
 * Helper function to create error messages with consistent formatting
 */
export const formatErrorMessage = (
  operation: string | ErrorOperation,
  error: unknown,
  context?: Record<string, unknown>
): string => {
  let message = `Error ${operation}`;
  message += `: ${getErrorMessage(error)}`;

  // Add context if provided
  if (context) {
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    message += ` (${contextStr})`;
  }

  return message;
};

/**
 * Helper function to create operation-specific error messages
 */
export const createOperationError = (
  operation: string | ErrorOperation,
  context?: Record<string, unknown>
): string => {
  return formatErrorMessage(operation, 'Operation failed', context);
};

/**
 * Common error messages
 */
export type ErrorOperation = keyof typeof ErrorMessages;

export const ErrorMessages = {
  // Database operations
  DB_CREATE: 'creating database record',
  DB_READ: 'reading database record',
  DB_UPDATE: 'updating database record',
  DB_DELETE: 'deleting database record',
  DB_QUERY: 'querying database',

  // Authentication
  AUTH_VERIFY: 'verifying authentication',
  AUTH_ACCESS: 'checking access rights',
  AUTH_TOKEN: 'validating token',

  // Model operations
  MODEL_REQUEST: 'making model request',
  MODEL_RESPONSE: 'processing model response',
  MODEL_SWITCH: 'switching models',

  // Resource operations
  RESOURCE_NOT_FOUND: 'resource not found',
  RESOURCE_EXISTS: 'resource already exists',
  RESOURCE_INVALID: 'invalid resource',

  // Rate limiting
  RATE_LIMIT: 'rate limit exceeded',
  RATE_CHECK: 'checking rate limits',

  // Usage tracking
  USAGE_TRACK: 'tracking usage',
  USAGE_STATS: 'retrieving usage statistics',
  USAGE_UPDATE: 'updating usage records'
} as const;

// Error message utilities
export const createErrorMessage = (
  operation: ErrorOperation,
  error: unknown,
  context?: Record<string, unknown>
): string => {
  return formatErrorMessage(ErrorMessages[operation], error, context);
};

export const createResourceNotFoundError = (
  resourceType: string,
  resourceId: string | number,
  context?: Record<string, unknown>
): string => {
  return formatErrorMessage(
    ErrorMessages.RESOURCE_NOT_FOUND,
    `${resourceType} not found`,
    { ...context, id: resourceId }
  );
};

export const createAuthorizationError = (
  message: string,
  context?: Record<string, unknown>
): string => {
  return formatErrorMessage(ErrorMessages.AUTH_ACCESS, message, context);
};
