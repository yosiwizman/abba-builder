/**
 * Path Security Validator
 * Validates and sanitizes file system paths for security
 */

import * as path from 'path';
import { app } from 'electron';

// Paths that should never be accessed
const RESTRICTED_PATHS = [
  '/etc',
  '/System',
  '/Windows/System32',
  '/Windows/System',
  'C:\\Windows\\System32',
  'C:\\Windows\\System',
  '/usr/bin',
  '/usr/sbin',
  '/bin',
  '/sbin',
  '/boot',
  '/root',
];

// Patterns that indicate path traversal attempts
const DANGEROUS_PATTERNS = [
  /\.\.[/\\]/,  // Parent directory traversal
  /^\//,         // Absolute Unix path
  /^[A-Z]:\\/,   // Absolute Windows path
  /~[/\\]/,     // Home directory reference
  /%[0-9a-fA-F]{2}/, // URL encoded characters
];

/**
 * Gets the safe base paths for the application
 * @returns Array of allowed base paths
 */
function getSafeBasePaths(): string[] {
  return [
    app.getPath('userData'),
    app.getPath('temp'),
    app.getPath('downloads'),
    process.cwd(), // Current working directory
  ];
}

/**
 * Checks if a path is within allowed directories
 * @param filePath The path to check
 * @returns true if path is safe, false otherwise
 */
export function isPathSafe(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  
  // Check against restricted paths
  for (const restricted of RESTRICTED_PATHS) {
    if (normalizedPath.startsWith(restricted)) {
      return false;
    }
  }
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitizes a file path by removing dangerous characters and sequences
 * @param filePath The path to sanitize
 * @returns Sanitized path
 */
export function sanitizePath(filePath: string): string {
  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, '');
  
  // Remove multiple consecutive dots
  sanitized = sanitized.replace(/\.{3,}/g, '');
  
  // Remove URL encoding
  sanitized = decodeURIComponent(sanitized);
  
  // Normalize the path
  sanitized = path.normalize(sanitized);
  
  // Remove any remaining parent directory references
  sanitized = sanitized.replace(/\.\.[/\\]/g, '');
  
  return sanitized;
}

/**
 * Validates that a path is within the app's allowed directories
 * @param filePath The path to validate
 * @param basePath Optional base path to resolve against
 * @returns true if path is within allowed directories
 */
export function isWithinAppDirectory(filePath: string, basePath?: string): boolean {
  const resolvedPath = basePath 
    ? path.resolve(basePath, filePath)
    : path.resolve(filePath);
  
  const safeBasePaths = getSafeBasePaths();
  
  return safeBasePaths.some(safePath => {
    const normalizedSafe = path.normalize(safePath);
    const normalizedResolved = path.normalize(resolvedPath);
    return normalizedResolved.startsWith(normalizedSafe);
  });
}

/**
 * Validates and sanitizes a file path
 * @param filePath The path to validate
 * @param basePath Optional base path
 * @throws Error if path is invalid or unsafe
 * @returns Sanitized and validated path
 */
export function validateAndSanitizePath(filePath: string, basePath?: string): string {
  const sanitized = sanitizePath(filePath);
  
  if (!isPathSafe(sanitized)) {
    throw new Error(`Unsafe path detected: ${filePath}`);
  }
  
  if (!isWithinAppDirectory(sanitized, basePath)) {
    throw new Error(`Path outside allowed directories: ${filePath}`);
  }
  
  return sanitized;
}

// Export for tests
export const testExports = {
  RESTRICTED_PATHS,
  DANGEROUS_PATTERNS,
  getSafeBasePaths,
};
