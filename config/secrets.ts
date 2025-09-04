// Centralized secrets management module
// This module handles loading and providing access to sensitive configuration

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

interface GitHubOAuthConfig {
  available: boolean;
  clientId?: string;
  clientSecret?: string;
}

interface APIKeysConfig {
  openai?: string;
  anthropic?: string;
  github?: string;
}

/**
 * Get GitHub OAuth configuration
 * Returns available=false if not properly configured
 */
export function getGitHubOAuthConfig(): GitHubOAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return { available: false };
  }
  
  return {
    available: true,
    clientId,
    clientSecret
  };
}

/**
 * Get GitHub personal access token
 */
export function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN;
}

/**
 * Get API keys configuration
 */
export function getAPIKeys(): APIKeysConfig {
  return {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    github: process.env.GITHUB_TOKEN
  };
}

/**
 * Validate that required secrets are configured
 */
export function validateSecrets(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Check for critical secrets (optional for now)
  // Add required secrets here as needed
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Get database encryption key
 * Generate one if not exists
 */
export function getDatabaseEncryptionKey(): string {
  const key = process.env.DB_ENCRYPTION_KEY;
  
  if (!key) {
    // Generate a random key for development
    // In production, this should be set via environment variable
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
  
  return key;
}

/**
 * Get session secret for authentication
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  
  if (!secret) {
    // Generate a random secret for development
    // In production, this should be set via environment variable
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }
  
  return secret;
}
