/**
 * IPC Channel Security Validator
 * Validates IPC channels against whitelist for security
 */

import { validInvokeChannels } from '../../preload';

// Additional security-critical channels that should never be allowed
const BLOCKED_CHANNELS = [
  'eval:code',
  'system:execute',
  'fs:delete',
  'process:exit',
  'shell:exec',
  'require:module',
  'child_process:spawn',
];

// Pattern-based validation for dynamic channels
const VALID_PATTERNS = [
  /^get-[\w-]+$/,
  /^create-[\w-]+$/,
  /^update-[\w-]+$/,
  /^delete-[\w-]+$/,
  /^chat:[\w-]+$/,
  /^github:[\w-]+$/,
  /^neon:[\w-]+$/,
  /^vercel:[\w-]+$/,
  /^supabase:[\w-]+$/,
  /^help:[\w:]+$/,
  /^prompts:[\w-]+$/,
  /^knowledge:[\w-]+$/,
  /^project-library:[\w-]+$/,
  /^worker:[\w-]+$/,
  /^job:[\w-]+$/,
  /^ci:[\w-]+$/,
  /^ai-contract:[\w-]+$/,
  /^blockchain:[\w-]+$/,
  /^enhanced:[\w-]+$/,
  /^portal:[\w-]+$/,
  /^window:[\w]+$/,
];

/**
 * Validates if a channel is allowed
 * @param channel The IPC channel to validate
 * @returns true if the channel is valid, false otherwise
 */
export function isValidChannel(channel: string): boolean {
  // Check if explicitly blocked
  if (BLOCKED_CHANNELS.includes(channel)) {
    return false;
  }

  // Check if in whitelist (from preload)
  if (validInvokeChannels?.includes(channel)) {
    return true;
  }

  // Check against valid patterns
  return VALID_PATTERNS.some(pattern => pattern.test(channel));
}

/**
 * Sanitizes a channel name to remove potentially dangerous characters
 * @param channel The channel to sanitize
 * @returns Sanitized channel name
 */
export function sanitizeChannel(channel: string): string {
  // Remove any non-alphanumeric characters except - : _
  return channel.replace(/[^a-zA-Z0-9\-:_]/g, '');
}

/**
 * Validates and sanitizes a channel
 * @param channel The channel to validate and sanitize
 * @throws Error if channel is invalid
 * @returns Sanitized channel name
 */
export function validateAndSanitizeChannel(channel: string): string {
  const sanitized = sanitizeChannel(channel);
  
  if (!isValidChannel(sanitized)) {
    throw new Error(`Invalid IPC channel: ${channel}`);
  }
  
  return sanitized;
}

// Export for tests
export const testExports = {
  BLOCKED_CHANNELS,
  VALID_PATTERNS,
};
