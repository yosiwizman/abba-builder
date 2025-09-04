import { Octokit } from '@octokit/rest';
import { IntegrationProvider, ConnectionResult, IntegrationStatus, GitHubConfig } from './types';

export class GitHubIntegration implements IntegrationProvider {
  id = 'github';
  name = 'GitHub';
  private client: Octokit | null = null;
  private config: GitHubConfig | null = null;

  async connect(config: GitHubConfig): Promise<ConnectionResult> {
    try {
      this.config = config;
      this.client = new Octokit({
        auth: config.token,
      });

      // Test the connection
      const { data } = await this.client.users.getAuthenticated();
      
      return {
        success: true,
        data: {
          username: data.login,
          name: data.name,
          email: data.email,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to GitHub',
      };
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.config = null;
  }

  async test(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    const connected = await this.test();
    
    if (!connected) {
      return {
        connected: false,
        error: this.client ? 'Authentication failed' : 'Not configured',
      };
    }

    try {
      const { data } = await this.client!.users.getAuthenticated();
      return {
        connected: true,
        lastCheck: new Date(),
        metadata: {
          username: data.login,
          name: data.name,
        }
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  async listRepositories(org?: string) {
    if (!this.client) throw new Error('GitHub client not initialized');

    if (org) {
      const { data } = await this.client.repos.listForOrg({ org });
      return data;
    } else {
      const { data } = await this.client.repos.listForAuthenticatedUser();
      return data;
    }
  }

  async createRepository(name: string, description?: string, isPrivate = false) {
    if (!this.client) throw new Error('GitHub client not initialized');

    const { data } = await this.client.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });

    return data;
  }

  async deployToGitHubPages(owner: string, repo: string, branch = 'gh-pages') {
    if (!this.client) throw new Error('GitHub client not initialized');

    await this.client.repos.createPagesSite({
      owner,
      repo,
      source: {
        branch,
        path: '/',
      },
    });
  }
}
