/**
 * URL Security Validator
 * Validates external URLs for security before opening
 */

// List of allowed protocols
const ALLOWED_PROTOCOLS = [
  'http:',
  'https:',
  'mailto:',
  'dyad:', // Our custom protocol
];

// List of explicitly blocked protocols
const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'about:',
  'chrome:',
  'chrome-extension:',
  'ms-windows-store:',
  'ms-appx:',
  'ms-appx-web:',
];

// Trusted domains (can be expanded based on requirements)
const TRUSTED_DOMAINS = [
  'github.com',
  'api.github.com',
  'openai.com',
  'api.openai.com',
  'anthropic.com',
  'api.anthropic.com',
  'google.com',
  'googleapis.com',
  'dyad.sh',
  'api.dyad.sh',
  'vercel.com',
  'api.vercel.com',
  'supabase.com',
  'supabase.co',
  'neon.tech',
  'console.neon.tech',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
];

// Patterns that might indicate malicious URLs
const SUSPICIOUS_PATTERNS = [
  /%[0-9a-f]{2}/i,  // URL encoding (when excessive)
  /[<>"']/,         // HTML/Script injection characters
  /\\x[0-9a-f]{2}/i, // Hex encoding
  /\\u[0-9a-f]{4}/i, // Unicode encoding
  /@/,               // Username in URL (potential phishing)
];

/**
 * Checks if a URL protocol is allowed
 * @param url The URL to check
 * @returns true if protocol is safe, false otherwise
 */
export function hasAllowedProtocol(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Checks if a URL protocol is explicitly blocked
 * @param url The URL to check
 * @returns true if protocol is blocked
 */
export function hasBlockedProtocol(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BLOCKED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // If URL parsing fails, consider it blocked
    return true;
  }
}

/**
 * Checks if a URL's domain is trusted
 * @param url The URL to check
 * @returns true if domain is trusted
 */
export function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    return TRUSTED_DOMAINS.some(trusted => {
      // Check exact match or subdomain
      return hostname === trusted || 
             hostname.endsWith('.' + trusted);
    });
  } catch {
    return false;
  }
}

/**
 * Checks if a URL contains suspicious patterns
 * @param url The URL to check
 * @returns true if URL appears suspicious
 */
export function hasSuspiciousPatterns(url: string): boolean {
  // Check for excessive URL encoding
  const encodingMatches = (url.match(/%[0-9a-f]{2}/gi) || []).length;
  if (encodingMatches > 5) {
    return true;
  }
  
  // Check other suspicious patterns
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Validates if an external URL is safe to open
 * @param url The URL to validate
 * @returns true if URL is safe to open
 */
export function isValidExternalUrl(url: string): boolean {
  // Check for blocked protocols
  if (hasBlockedProtocol(url)) {
    return false;
  }
  
  // Check for allowed protocols
  if (!hasAllowedProtocol(url)) {
    return false;
  }
  
  // Check for suspicious patterns
  if (hasSuspiciousPatterns(url)) {
    return false;
  }
  
  // URLs with trusted domains are always allowed
  if (isTrustedDomain(url)) {
    return true;
  }
  
  // For non-trusted domains, apply additional checks
  try {
    const parsed = new URL(url);
    
    // Block URLs with credentials
    if (parsed.username || parsed.password) {
      return false;
    }
    
    // Block non-standard ports for HTTP/HTTPS
    if (parsed.protocol === 'http:' && parsed.port && parsed.port !== '80') {
      return false;
    }
    if (parsed.protocol === 'https:' && parsed.port && parsed.port !== '443') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL by removing dangerous elements
 * @param url The URL to sanitize
 * @returns Sanitized URL or null if unsalvageable
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Remove credentials
    parsed.username = '';
    parsed.password = '';
    
    // Remove dangerous protocols
    if (BLOCKED_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates and sanitizes an external URL
 * @param url The URL to validate and sanitize
 * @throws Error if URL is invalid or unsafe
 * @returns Sanitized URL
 */
export function validateAndSanitizeUrl(url: string): string {
  const sanitized = sanitizeUrl(url);
  
  if (!sanitized) {
    throw new Error(`Invalid URL: ${url}`);
  }
  
  if (!isValidExternalUrl(sanitized)) {
    throw new Error(`Unsafe URL detected: ${url}`);
  }
  
  return sanitized;
}

// Export for tests
export const testExports = {
  ALLOWED_PROTOCOLS,
  BLOCKED_PROTOCOLS,
  TRUSTED_DOMAINS,
  SUSPICIOUS_PATTERNS,
};
