/**
 * CI/CD Provider Manager
 * Manages multiple CI/CD providers and provides a unified interface
 */

import {
  CIProvider,
  Build,
  BuildDetails,
  Deployment,
  Statistics,
  BuildQueryOptions,
  DeploymentQueryOptions,
  TriggerBuildOptions,
  TriggerDeploymentOptions,
  UpdateCallback,
  StatisticsOptions,
  CIProviderType,
  ProviderConfig,
} from './types';
import { GitHubActionsProvider } from './providers/github-actions';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export class CIProviderManager {
  private static instance: CIProviderManager;
  private providers: Map<string, CIProvider> = new Map();
  private activeProviderId: string | null = null;
  private config: Map<string, ProviderConfig> = new Map();
  
  private constructor() {
    // Load saved configurations from storage
    this.loadConfigurations();
  }
  
  static getInstance(): CIProviderManager {
    if (!CIProviderManager.instance) {
      CIProviderManager.instance = new CIProviderManager();
    }
    return CIProviderManager.instance;
  }
  
  /**
   * Register a new provider configuration
   */
  async registerProvider(id: string, config: ProviderConfig): Promise<boolean> {
    try {
      const provider = this.createProvider(config);
      
      // Authenticate the provider
      const authenticated = await provider.authenticate(config.auth);
      
      if (authenticated) {
        this.providers.set(id, provider);
        this.config.set(id, config);
        
        // Save configuration (without sensitive data)
        this.saveConfigurations();
        
        // Set as active if it's the first provider
        if (this.providers.size === 1) {
          this.activeProviderId = id;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to register provider ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Create a provider instance based on type
   */
  private createProvider(config: ProviderConfig): CIProvider {
    switch (config.type) {
      case CIProviderType.GITHUB_ACTIONS:
        // Parse GitHub repository from config
        const repoUrl = config.baseUrl || '';
        const match = repoUrl.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
        
        if (match) {
          return new GitHubActionsProvider(match[1], match[2]);
        } else {
          // Use options if provided, but validate them
          const owner = config.options?.owner;
          const repo = config.options?.repo;
          
          if (!owner || !repo || owner.trim() === '' || repo.trim() === '') {
            throw new Error('GitHub repository owner and name are required');
          }
          
          return new GitHubActionsProvider(owner, repo);
        }
      
      // Add other providers here as they're implemented
      // case CIProviderType.JENKINS:
      //   return new JenkinsProvider(config.baseUrl!);
      // case CIProviderType.CIRCLECI:
      //   return new CircleCIProvider(config);
      
      default:
        throw new Error(`Provider type ${config.type} not supported`);
    }
  }
  
  /**
   * Get the active provider
   */
  getActiveProvider(): CIProvider | null {
    if (!this.activeProviderId) return null;
    return this.providers.get(this.activeProviderId) || null;
  }
  
  /**
   * Set the active provider
   */
  setActiveProvider(id: string): boolean {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
      this.saveConfigurations();
      return true;
    }
    return false;
  }
  
  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, CIProvider> {
    return new Map(this.providers);
  }
  
  /**
   * Remove a provider
   */
  removeProvider(id: string): boolean {
    const provider = this.providers.get(id);
    if (provider) {
      // Clean up provider resources
      if ('dispose' in provider && typeof provider.dispose === 'function') {
        (provider as any).dispose();
      }
      
      this.providers.delete(id);
      this.config.delete(id);
      
      // Update active provider if needed
      if (this.activeProviderId === id) {
        this.activeProviderId = this.providers.size > 0 
          ? this.providers.keys().next().value 
          : null;
      }
      
      this.saveConfigurations();
      return true;
    }
    return false;
  }
  
  // Delegated methods that use the active provider
  
  async getBuilds(options?: BuildQueryOptions): Promise<Build[]> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.getBuilds(options);
  }
  
  async getBuildDetails(buildId: string): Promise<BuildDetails> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.getBuildDetails(buildId);
  }
  
  async triggerBuild(options: TriggerBuildOptions): Promise<Build> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.triggerBuild(options);
  }
  
  async cancelBuild(buildId: string): Promise<boolean> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.cancelBuild(buildId);
  }
  
  async getDeployments(options?: DeploymentQueryOptions): Promise<Deployment[]> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.getDeployments(options);
  }
  
  async triggerDeployment(options: TriggerDeploymentOptions): Promise<Deployment> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.triggerDeployment(options);
  }
  
  async rollbackDeployment(deploymentId: string): Promise<boolean> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.rollbackDeployment(deploymentId);
  }
  
  async getStatistics(options?: StatisticsOptions): Promise<Statistics> {
    const provider = this.getActiveProvider();
    if (!provider) throw new Error('No active CI provider');
    return provider.getStatistics(options);
  }
  
  subscribeToUpdates(callback: UpdateCallback): () => void {
    const provider = this.getActiveProvider();
    if (!provider) {
      return () => {}; // No-op unsubscribe
    }
    return provider.subscribeToUpdates(callback);
  }
  
  /**
   * Get aggregated builds from all providers
   */
  async getAllBuilds(options?: BuildQueryOptions): Promise<Map<string, Build[]>> {
    const results = new Map<string, Build[]>();
    
    await Promise.all(
      Array.from(this.providers.entries()).map(async ([id, provider]) => {
        try {
          const builds = await provider.getBuilds(options);
          results.set(id, builds);
        } catch (error) {
          console.error(`Failed to get builds from provider ${id}:`, error);
          results.set(id, []);
        }
      })
    );
    
    return results;
  }
  
  /**
   * Save configurations to persistent storage
   */
  private saveConfigurations(): void {
    try {
      // Save complete configuration including tokens (will be encrypted by settings system)
      const fullConfig: Record<string, any> = {};
      
      this.config.forEach((config, id) => {
        fullConfig[id] = {
          type: config.type,
          baseUrl: config.baseUrl,
          options: config.options,
          auth: config.auth, // Include auth for persistence
        };
      });
      
      // Save to Electron's userData directory
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'ci-provider-config.json');
      
      fs.writeFileSync(configPath, JSON.stringify({
        providers: fullConfig,
        activeProviderId: this.activeProviderId
      }, null, 2));
      
//       console.log('CI provider configurations saved successfully');
    } catch (error) {
      console.error('Failed to save CI provider configurations:', error);
    }
  }
  
  /**
   * Load configurations from persistent storage
   */
  private loadConfigurations(): void {
    try {
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'ci-provider-config.json');
      
      if (fs.existsSync(configPath)) {
        const stored = fs.readFileSync(configPath, 'utf-8');
        const data = JSON.parse(stored);
        
        // Load provider configurations including auth
        Object.entries(data.providers || {}).forEach(([id, config]: [string, any]) => {
          this.config.set(id, config);
          
          // Re-authenticate providers on startup
          if (config.auth && config.auth.token) {
            this.registerProvider(id, config).catch(err => {
              console.error(`Failed to re-authenticate provider ${id}:`, err);
            });
          }
        });
        
        this.activeProviderId = data.activeProviderId || null;
//         console.log('CI provider configurations loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load CI provider configurations:', error);
    }
  }
  
  /**
   * Dispose all providers and clean up resources
   */
  dispose(): void {
    this.providers.forEach(provider => {
      if ('dispose' in provider && typeof provider.dispose === 'function') {
        (provider as any).dispose();
      }
    });
    
    this.providers.clear();
    this.config.clear();
    this.activeProviderId = null;
  }
}
