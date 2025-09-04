/**
 * Secure API Key Vault
 * Manages encryption and secure storage of API keys and sensitive data
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

const logger = log.scope('secure-vault');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

interface EncryptedData {
  salt: string;
  iv: string;
  tag: string;
  encrypted: string;
}

interface VaultData {
  [key: string]: any;
}

class SecureVault {
  private vaultPath: string;
  private masterKey: Buffer | null = null;
  private isInitialized = false;

  constructor() {
    // Store vault in user data directory
    const userDataPath = app.getPath('userData');
    this.vaultPath = path.join(userDataPath, '.vault');
    
    // Ensure vault directory exists
    if (!fs.existsSync(this.vaultPath)) {
      fs.mkdirSync(this.vaultPath, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Initialize the vault with a master key
   * In production, this should use OS keychain/credential manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // In production, retrieve from OS keychain
      // For now, derive from machine ID + app name
      const machineId = this.getMachineIdentifier();
      this.masterKey = await this.deriveMasterKey(machineId);
      this.isInitialized = true;
      logger.info('Secure vault initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize secure vault:', error);
      throw new Error('Vault initialization failed');
    }
  }

  /**
   * Store a secure value
   */
  public async set(key: string, value: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vault not initialized');
    }

    try {
      const data = await this.loadVault();
      data[key] = value;
      await this.saveVault(data);
      logger.info(`Securely stored key: ${key}`);
    } catch (error) {
      logger.error(`Failed to store key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a secure value
   */
  public async get(key: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Vault not initialized');
    }

    try {
      const data = await this.loadVault();
      return data[key];
    } catch (error) {
      logger.error(`Failed to retrieve key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a secure value
   */
  public async delete(key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vault not initialized');
    }

    try {
      const data = await this.loadVault();
      delete data[key];
      await this.saveVault(data);
      logger.info(`Deleted key: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  public async has(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vault not initialized');
    }

    try {
      const data = await this.loadVault();
      return key in data;
    } catch (error) {
      logger.error(`Failed to check key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all vault data
   */
  public async clear(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vault not initialized');
    }

    try {
      await this.saveVault({});
      logger.info('Vault cleared');
    } catch (error) {
      logger.error('Failed to clear vault:', error);
      throw error;
    }
  }

  /**
   * Load and decrypt vault data
   */
  private async loadVault(): Promise<VaultData> {
    const vaultFile = path.join(this.vaultPath, 'vault.enc');
    
    if (!fs.existsSync(vaultFile)) {
      return {};
    }

    try {
      const encryptedContent = fs.readFileSync(vaultFile, 'utf8');
      const encryptedData: EncryptedData = JSON.parse(encryptedContent);
      const decrypted = await this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to load vault:', error);
      // Return empty vault if decryption fails
      return {};
    }
  }

  /**
   * Encrypt and save vault data
   */
  private async saveVault(data: VaultData): Promise<void> {
    const vaultFile = path.join(this.vaultPath, 'vault.enc');
    
    try {
      const jsonData = JSON.stringify(data);
      const encryptedData = await this.encrypt(jsonData);
      fs.writeFileSync(vaultFile, JSON.stringify(encryptedData), {
        mode: 0o600 // Read/write for owner only
      });
    } catch (error) {
      logger.error('Failed to save vault:', error);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private async encrypt(text: string): Promise<EncryptedData> {
    if (!this.masterKey) throw new Error('Master key not available');

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key from master key
    const key = crypto.pbkdf2Sync(this.masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encrypted
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private async decrypt(data: EncryptedData): Promise<string> {
    if (!this.masterKey) throw new Error('Master key not available');

    const salt = Buffer.from(data.salt, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const tag = Buffer.from(data.tag, 'hex');
    
    // Derive decryption key from master key
    const key = crypto.pbkdf2Sync(this.masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get machine identifier for key derivation
   */
  private getMachineIdentifier(): string {
    // Combine multiple factors for uniqueness
    const factors = [
      process.platform,
      process.arch,
      app.getName(),
      app.getVersion(),
      // In production, add MAC address or hardware ID
    ];
    
    return factors.join('-');
  }

  /**
   * Derive master key from machine identifier
   */
  private async deriveMasterKey(identifier: string): Promise<Buffer> {
    // Use PBKDF2 to derive a key from the identifier
    return crypto.pbkdf2Sync(
      identifier,
      'dyad-vault-2024', // Application-specific salt
      ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Rotate encryption keys
   */
  public async rotateKeys(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vault not initialized');
    }

    try {
      // Load current data
      const data = await this.loadVault();
      
      // Generate new master key
      const machineId = this.getMachineIdentifier();
      this.masterKey = await this.deriveMasterKey(machineId + Date.now());
      
      // Re-encrypt with new key
      await this.saveVault(data);
      
      logger.info('Vault keys rotated successfully');
    } catch (error) {
      logger.error('Failed to rotate keys:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const secureVault = new SecureVault();

// API Key Manager built on top of SecureVault
export class APIKeyManager {
  private static readonly KEY_PREFIX = 'api_key_';

  /**
   * Store an API key securely
   */
  static async storeAPIKey(provider: string, key: string): Promise<void> {
    await secureVault.set(`${this.KEY_PREFIX}${provider}`, {
      key,
      timestamp: Date.now(),
      provider
    });
  }

  /**
   * Retrieve an API key
   */
  static async getAPIKey(provider: string): Promise<string | null> {
    const data = await secureVault.get(`${this.KEY_PREFIX}${provider}`);
    return data?.key || null;
  }

  /**
   * Get API key from environment or vault
   */
  static async getKey(provider: string, envVar?: string): Promise<string | null> {
    // First check environment variable
    if (envVar && process.env[envVar]) {
      return process.env[envVar]!;
    }

    // Then check secure vault
    return this.getAPIKey(provider);
  }

  /**
   * Remove an API key
   */
  static async removeAPIKey(provider: string): Promise<void> {
    await secureVault.delete(`${this.KEY_PREFIX}${provider}`);
  }

  /**
   * List all stored API key providers
   */
  static async listProviders(): Promise<string[]> {
    // This would need vault to expose a keys() method
    // For now, return known providers
    return ['openai', 'anthropic', 'github', 'google', 'vercel', 'supabase', 'neon'];
  }
}
