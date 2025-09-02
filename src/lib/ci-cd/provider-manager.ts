/**
 * CI/CD Provider Manager
 * Manages multiple CI/CD providers and provides a unified interface
 */

import { 
  CIProvider, 
  CIProviderType, 
  ProviderConfig,
  Build,
  BuildDetails,
  BuildQueryOptions,
  TriggerBuildOptions,
  Deployment,
  DeploymentQueryOptions,
  TriggerDeploymentOptions,
  Statistics,
  StatisticsOptions,
  UpdateCallback
} from './types';
import { GitHubActionsProvider } from './providers/github-actions';

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
          // Fallback to options
          const owner = config.options?.owner || 'default-owner';
          const repo = config.options?.repo || 'default-repo';
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
      // Filter out sensitive data before saving
      const safeConfig: Record<string, any> = {};
      
      this.config.forEach((config, id) => {
        safeConfig[id] = {
          type: config.type,
          baseUrl: config.baseUrl,
          options: config.options,
          // Don't save auth tokens
        };
      });
      
      // Save to localStorage or electron store
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('ci-provider-config', JSON.stringify({
          providers: safeConfig,
          activeProviderId: this.activeProviderId
        }));
      }
    } catch (error) {
      console.error('Failed to save CI provider configurations:', error);
    }
  }
  
  /**
   * Load configurations from persistent storage
   */
  private loadConfigurations(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('ci-provider-config');
        if (stored) {
          const data = JSON.parse(stored);
          
          // Load provider configurations (auth will need to be re-entered)
          Object.entries(data.providers || {}).forEach(([id, config]: [string, any]) => {
            this.config.set(id, config);
          });
          
          this.activeProviderId = data.activeProviderId || null;
        }
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
