import { IntegrationProvider, ConnectionResult, IntegrationStatus, VercelConfig } from './types';

export class VercelIntegration implements IntegrationProvider {
  id = 'vercel';
  name = 'Vercel';
  private config: VercelConfig | null = null;
  private apiUrl = 'https://api.vercel.com';

  async connect(config: VercelConfig): Promise<ConnectionResult> {
    try {
      this.config = config;
      
      // Test the connection by fetching user info
      const response = await fetch(`${this.apiUrl}/www/user`, {
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to authenticate: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          username: data.user.username,
          email: data.user.email,
          name: data.user.name,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Vercel',
      };
    }
  }

  async disconnect(): Promise<void> {
    this.config = null;
  }

  async test(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      const response = await fetch(`${this.apiUrl}/www/user`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    const connected = await this.test();
    
    if (!connected) {
      return {
        connected: false,
        error: this.config ? 'Authentication failed' : 'Not configured',
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/www/user`, {
        headers: {
          Authorization: `Bearer ${this.config!.token}`,
        },
      });
      
      const data = await response.json();
      return {
        connected: true,
        lastCheck: new Date(),
        metadata: {
          username: data.user.username,
          email: data.user.email,
        }
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  async listProjects(teamId?: string) {
    if (!this.config) throw new Error('Vercel client not initialized');

    const url = new URL(`${this.apiUrl}/v9/projects`);
    if (teamId) {
      url.searchParams.append('teamId', teamId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data.projects;
  }

  async createDeployment(projectName: string, files: any[], teamId?: string) {
    if (!this.config) throw new Error('Vercel client not initialized');

    const body: any = {
      name: projectName,
      files,
      projectSettings: {
        framework: 'nextjs', // or detect automatically
      },
    };

    if (teamId) {
      body.teamId = teamId;
    }

    const response = await fetch(`${this.apiUrl}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to create deployment: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getDeploymentStatus(deploymentId: string, teamId?: string) {
    if (!this.config) throw new Error('Vercel client not initialized');

    const url = new URL(`${this.apiUrl}/v13/deployments/${deploymentId}`);
    if (teamId) {
      url.searchParams.append('teamId', teamId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get deployment status: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
}
