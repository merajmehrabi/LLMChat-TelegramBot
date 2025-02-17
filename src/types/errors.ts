// Base application error class
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string | Error,
    code: string,
    status: number = 500,
    details?: Record<string, any>
  ) {
    super(message instanceof Error ? message.message : message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to convert Error or string to string
const getErrorMessage = (error: string | Error): string => {
  return error instanceof Error ? error.message : error;
};

// Authentication Errors
export class AuthenticationError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'AUTHORIZATION_ERROR', 403, details);
  }
}

// API Errors
export class ApiError extends AppError {
  constructor(
    message: string | Error,
    status: number = 500,
    details?: Record<string, any>
  ) {
    super(getErrorMessage(message), 'API_ERROR', status, details);
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'VALIDATION_ERROR', 400, details);
  }
}

// Database Errors
export class DatabaseError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'DATABASE_ERROR', 500, details);
  }
}

// Rate Limiting Errors
export class RateLimitError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'RATE_LIMIT_ERROR', 429, details);
  }
}

// Model Errors
export class ModelError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'MODEL_ERROR', 400, details);
  }
}

// Not Found Errors
export class NotFoundError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'NOT_FOUND_ERROR', 404, details);
  }
}

// Configuration Errors
export class ConfigurationError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'CONFIGURATION_ERROR', 500, details);
  }
}

// OpenRouter API Errors
export class OpenRouterError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'OPENROUTER_ERROR', 502, details);
  }
}

// Telegram Bot Errors
export class TelegramError extends AppError {
  constructor(message: string | Error, details?: Record<string, any>) {
    super(getErrorMessage(message), 'TELEGRAM_ERROR', 502, details);
  }
}

// Error factory for creating appropriate error instances
export const createError = (
  type: string,
  message: string | Error,
  details?: Record<string, any>
): AppError => {
  const errorMessage = message instanceof Error ? message.message : message;
  switch (type.toUpperCase()) {
    case 'AUTHENTICATION':
      return new AuthenticationError(errorMessage, details);
    case 'AUTHORIZATION':
      return new AuthorizationError(errorMessage, details);
    case 'VALIDATION':
      return new ValidationError(errorMessage, details);
    case 'DATABASE':
      return new DatabaseError(errorMessage, details);
    case 'RATE_LIMIT':
      return new RateLimitError(errorMessage, details);
    case 'MODEL':
      return new ModelError(errorMessage, details);
    case 'NOT_FOUND':
      return new NotFoundError(errorMessage, details);
    case 'CONFIGURATION':
      return new ConfigurationError(errorMessage, details);
    case 'OPENROUTER':
      return new OpenRouterError(errorMessage, details);
    case 'TELEGRAM':
      return new TelegramError(errorMessage, details);
    default:
      return new AppError(errorMessage, 'UNKNOWN_ERROR', 500, details);
  }
};
