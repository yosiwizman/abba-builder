/**
 * Error Handler for IPC operations
 * Handles and sanitizes errors for secure display
 */

import log from 'electron-log';

const logger = log.scope('error-handler');

/**
 * Handles errors and logs them appropriately
 * @param error The error to handle
 * @param context Additional context about where the error occurred
 */
export function handleError(error: Error | unknown, context: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  logger.error(`Error in ${context}:`, errorMessage, {
    context,
    stack,
    timestamp: new Date().toISOString(),
  });
  
  // You could also send to error tracking service here
  // e.g., Sentry.captureException(error, { extra: { context } });
}

/**
 * Sanitizes error messages for user display
 * Removes sensitive information like passwords, tokens, etc.
 * @param error The error to sanitize
 * @returns User-safe error message
 */
export function sanitizeErrorForUser(error: Error | unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  
  // Remove sensitive patterns
  const sensitivePatterns = [
    /password=[\w\-.]+/gi,
    /token=[\w\-.]+/gi,
    /api[_-]?key=[\w\-.]+/gi,
    /secret=[\w\-.]+/gi,
    /bearer\s+[\w\-.]+/gi,
    /authorization:\s*[\w\-.]+/gi,
    /sk-[\w-]+/g, // OpenAI keys
    /ghp_[\w]+/g,  // GitHub tokens
  ];
  
  for (const pattern of sensitivePatterns) {
    message = message.replace(pattern, '[REDACTED]');
  }
  
  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'ECONNREFUSED': 'Connection failed. Please check your network.',
    'ENOTFOUND': 'Server not found. Please check the URL.',
    'ETIMEDOUT': 'Connection timed out. Please try again.',
    'EACCES': 'Permission denied. Please check file permissions.',
    'ENOENT': 'File or directory not found.',
    'Database connection failed': 'Database operation failed. Please try again.',
    'Invalid credentials': 'Authentication failed. Please check your credentials.',
  };
  
  for (const [technical, friendly] of Object.entries(errorMappings)) {
    if (message.includes(technical)) {
      return friendly;
    }
  }
  
  // Default sanitization
  if (message.length > 200) {
    message = message.substring(0, 200) + '...';
  }
  
  return message;
}

/**
 * Creates a standardized error response
 * @param error The error that occurred
 * @param context The context where the error happened
 * @param code Optional error code
 */
export function createErrorResponse(
  error: Error | unknown,
  context: string,
  code?: string
): {
  success: false;
  error: string;
  code?: string;
  context: string;
} {
  const userMessage = sanitizeErrorForUser(error);
  handleError(error, context);
  
  return {
    success: false,
    error: userMessage,
    code,
    context,
  };
}

/**
 * Wraps an async function with error handling
 * @param fn The function to wrap
 * @param context The context for error logging
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw createErrorResponse(error, context);
    }
  }) as T;
}
