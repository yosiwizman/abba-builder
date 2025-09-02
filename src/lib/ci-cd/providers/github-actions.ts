/**
 * GitHub Actions CI Provider Implementation
 */

import { Octokit } from '@octokit/rest';
import {
  CIProvider,
  CIProviderType,
  AuthConfig,
  Build,
  BuildDetails,
  BuildQueryOptions,
  BuildStatus,
  BuildStep,
  TriggerBuildOptions,
  Deployment,
  DeploymentQueryOptions,
  DeploymentStatus,
  TriggerDeploymentOptions,
  Statistics,
  StatisticsOptions,
  UpdateCallback,
  ProviderUpdate,
  Artifact
} from '../types';

export class GitHubActionsProvider implements CIProvider {
  public readonly name = 'GitHub Actions';
  public readonly type = CIProviderType.GITHUB_ACTIONS;
  
  private octokit: Octokit | null = null;
  private owner: string;
  private repo: string;
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private pollingInterval: NodeJS.Timeout | null = null;
  
  constructor(owner: string, repo: string) {
    this.owner = owner;
    this.repo = repo;
  }
  
  async authenticate(config: AuthConfig): Promise<boolean> {
    try {
      if (config.type === 'token' && config.token) {
        this.octokit = new Octokit({
          auth: config.token
        });
      } else if (config.type === 'app' && config.privateKey && config.appId && config.installationId) {
        // GitHub App authentication would go here
        // For now, we'll use token auth
        throw new Error('GitHub App authentication not yet implemented');
      } else {
        throw new Error('Invalid authentication configuration');
      }
      
      // Test authentication
      await this.octokit.users.getAuthenticated();
      
      // Start polling for updates
      this.startPolling();
      
      return true;
    } catch (error) {
      console.error('GitHub Actions authentication failed:', error);
      this.octokit = null;
      return false;
    }
  }
  
  isAuthenticated(): boolean {
    return this.octokit !== null;
  }
  
  async getBuilds(options?: BuildQueryOptions): Promise<Build[]> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      const response = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.owner,
        repo: this.repo,
        branch: options?.branch,
        status: options?.status ? this.mapBuildStatusToGitHub(options.status) : undefined,
        per_page: options?.limit || 30,
        page: options?.offset ? Math.floor(options.offset / (options?.limit || 30)) + 1 : 1
      });
      
      return response.data.workflow_runs.map(run => this.mapWorkflowRunToBuild(run));
    } catch (error) {
      console.error('Failed to fetch builds:', error);
      throw new Error('Failed to fetch builds from GitHub Actions');
    }
  }
  
  async getBuildDetails(buildId: string): Promise<BuildDetails> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      const [runResponse, jobsResponse] = await Promise.all([
        this.octokit.actions.getWorkflowRun({
          owner: this.owner,
          repo: this.repo,
          run_id: parseInt(buildId)
        }),
        this.octokit.actions.listJobsForWorkflowRun({
          owner: this.owner,
          repo: this.repo,
          run_id: parseInt(buildId)
        })
      ]);
      
      const build = this.mapWorkflowRunToBuild(runResponse.data);
      
      // Map jobs to build steps
      const steps: BuildStep[] = jobsResponse.data.jobs.map(job => ({
        name: job.name,
        status: this.mapGitHubStatusToBuildStatus(job.status),
        startedAt: job.started_at ? new Date(job.started_at) : undefined,
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
        duration: job.started_at && job.completed_at 
          ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
          : undefined
      }));
      
      // Get artifacts
      const artifactsResponse = await this.octokit.actions.listWorkflowRunArtifacts({
        owner: this.owner,
        repo: this.repo,
        run_id: parseInt(buildId)
      });
      
      const artifacts: Artifact[] = artifactsResponse.data.artifacts.map(artifact => ({
        name: artifact.name,
        size: artifact.size_in_bytes,
        url: artifact.archive_download_url,
        type: 'zip'
      }));
      
      return {
        ...build,
        steps,
        artifacts,
        triggerInfo: {
          type: runResponse.data.event === 'workflow_dispatch' ? 'manual' : 
                runResponse.data.event === 'schedule' ? 'schedule' : 'webhook',
          actor: runResponse.data.actor?.login,
          event: runResponse.data.event
        }
      };
    } catch (error) {
      console.error('Failed to fetch build details:', error);
      throw new Error('Failed to fetch build details from GitHub Actions');
    }
  }
  
  async triggerBuild(options: TriggerBuildOptions): Promise<Build> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      // First, we need to get the workflow ID
      const workflows = await this.octokit.actions.listRepoWorkflows({
        owner: this.owner,
        repo: this.repo
      });
      
      // Find a workflow (using the first one for now)
      const workflow = workflows.data.workflows[0];
      if (!workflow) {
        throw new Error('No workflows found in repository');
      }
      
      // Trigger the workflow
      await this.octokit.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflow.id,
        ref: options.branch,
        inputs: options.parameters
      });
      
      // Wait a moment for the run to be created
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the latest run
      const runs = await this.octokit.actions.listWorkflowRuns({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflow.id,
        branch: options.branch,
        per_page: 1
      });
      
      if (runs.data.workflow_runs.length === 0) {
        throw new Error('Workflow run not created');
      }
      
      return this.mapWorkflowRunToBuild(runs.data.workflow_runs[0]);
    } catch (error) {
      console.error('Failed to trigger build:', error);
      throw new Error('Failed to trigger build on GitHub Actions');
    }
  }
  
  async cancelBuild(buildId: string): Promise<boolean> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      await this.octokit.actions.cancelWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: parseInt(buildId)
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel build:', error);
      return false;
    }
  }
  
  async getDeployments(options?: DeploymentQueryOptions): Promise<Deployment[]> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      const response = await this.octokit.repos.listDeployments({
        owner: this.owner,
        repo: this.repo,
        environment: options?.environment,
        per_page: options?.limit || 30,
        page: options?.offset ? Math.floor(options.offset / (options?.limit || 30)) + 1 : 1
      });
      
      // Get deployment statuses
      const deployments = await Promise.all(
        response.data.map(async (deployment) => {
          const statusesResponse = await this.octokit!.repos.listDeploymentStatuses({
            owner: this.owner,
            repo: this.repo,
            deployment_id: deployment.id
          });
          
          const latestStatus = statusesResponse.data[0];
          
          return {
            id: deployment.id.toString(),
            environment: deployment.environment || 'production',
            status: this.mapGitHubDeploymentStatus(latestStatus?.state),
            version: deployment.ref,
            deployedBy: deployment.creator?.login || 'unknown',
            deployedAt: new Date(deployment.created_at),
            url: deployment.payload?.web_url || latestStatus?.target_url
          };
        })
      );
      
      return deployments;
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      throw new Error('Failed to fetch deployments from GitHub');
    }
  }
  
  async triggerDeployment(options: TriggerDeploymentOptions): Promise<Deployment> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      const deployment = await this.octokit.repos.createDeployment({
        owner: this.owner,
        repo: this.repo,
        ref: options.version,
        environment: options.environment,
        auto_merge: false,
        required_contexts: [],
        payload: options.parameters || {}
      });
      
      if (deployment.status === 202 && deployment.data) {
        // Create initial deployment status
        await this.octokit.repos.createDeploymentStatus({
          owner: this.owner,
          repo: this.repo,
          deployment_id: deployment.data.id,
          state: 'in_progress',
          description: 'Deployment initiated'
        });
        
        return {
          id: deployment.data.id.toString(),
          environment: options.environment,
          status: DeploymentStatus.IN_PROGRESS,
          version: options.version,
          deployedBy: deployment.data.creator?.login || 'api',
          deployedAt: new Date(deployment.data.created_at)
        };
      } else {
        throw new Error('Failed to create deployment');
      }
    } catch (error) {
      console.error('Failed to trigger deployment:', error);
      throw new Error('Failed to trigger deployment on GitHub');
    }
  }
  
  async rollbackDeployment(deploymentId: string): Promise<boolean> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      // Mark current deployment as inactive
      await this.octokit.repos.createDeploymentStatus({
        owner: this.owner,
        repo: this.repo,
        deployment_id: parseInt(deploymentId),
        state: 'inactive',
        description: 'Rolled back'
      });
      
      return true;
    } catch (error) {
      console.error('Failed to rollback deployment:', error);
      return false;
    }
  }
  
  subscribeToUpdates(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }
  
  async getStatistics(options?: StatisticsOptions): Promise<Statistics> {
    if (!this.octokit) throw new Error('Not authenticated');
    
    try {
      const since = this.getDateForPeriod(options?.period);
      
      const response = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.owner,
        repo: this.repo,
        branch: options?.branch,
        created: `>=${since.toISOString()}`,
        per_page: 100
      });
      
      const runs = response.data.workflow_runs;
      const totalBuilds = runs.length;
      const successfulBuilds = runs.filter(r => r.conclusion === 'success').length;
      const failedBuilds = runs.filter(r => r.conclusion === 'failure').length;
      
      const durations = runs
        .filter(r => r.run_started_at && r.updated_at)
        .map(r => new Date(r.updated_at).getTime() - new Date(r.run_started_at!).getTime());
      
      const averageDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
      
      const daysSincePeriod = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
      const buildsPerDay = totalBuilds / (daysSincePeriod || 1);
      
      return {
        totalBuilds,
        successRate: totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0,
        averageDuration,
        failureRate: totalBuilds > 0 ? (failedBuilds / totalBuilds) * 100 : 0,
        buildsPerDay
      };
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      throw new Error('Failed to fetch statistics from GitHub Actions');
    }
  }
  
  // Private helper methods
  
  private mapWorkflowRunToBuild(run: any): Build {
    return {
      id: run.id.toString(),
      number: run.run_number,
      status: this.mapGitHubStatusToBuildStatus(run.status),
      branch: run.head_branch,
      commit: run.head_sha,
      commitMessage: run.head_commit?.message,
      author: run.head_commit?.author?.name || run.actor?.login,
      startedAt: new Date(run.created_at),
      completedAt: run.updated_at ? new Date(run.updated_at) : undefined,
      duration: run.run_started_at && run.updated_at 
        ? new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()
        : undefined,
      url: run.html_url
    };
  }
  
  private mapGitHubStatusToBuildStatus(status: string): BuildStatus {
    switch (status) {
      case 'queued':
      case 'waiting':
      case 'pending':
        return BuildStatus.QUEUED;
      case 'in_progress':
        return BuildStatus.IN_PROGRESS;
      case 'completed':
      case 'success':
        return BuildStatus.SUCCESS;
      case 'failure':
      case 'failed':
        return BuildStatus.FAILURE;
      case 'cancelled':
      case 'canceled':
        return BuildStatus.CANCELLED;
      case 'skipped':
        return BuildStatus.SKIPPED;
      default:
        return BuildStatus.QUEUED;
    }
  }
  
  private mapBuildStatusToGitHub(status: BuildStatus): string {
    switch (status) {
      case BuildStatus.QUEUED:
        return 'queued';
      case BuildStatus.IN_PROGRESS:
        return 'in_progress';
      case BuildStatus.SUCCESS:
        return 'completed';
      case BuildStatus.FAILURE:
        return 'failure';
      case BuildStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'queued';
    }
  }
  
  private mapGitHubDeploymentStatus(state?: string): DeploymentStatus {
    switch (state) {
      case 'pending':
        return DeploymentStatus.PENDING;
      case 'in_progress':
        return DeploymentStatus.IN_PROGRESS;
      case 'success':
        return DeploymentStatus.SUCCESS;
      case 'failure':
      case 'error':
        return DeploymentStatus.FAILURE;
      case 'inactive':
        return DeploymentStatus.ROLLED_BACK;
      default:
        return DeploymentStatus.PENDING;
    }
  }
  
  private getDateForPeriod(period?: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to week
    }
  }
  
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Poll every 30 seconds for updates
    this.pollingInterval = setInterval(async () => {
      if (!this.octokit || this.updateCallbacks.size === 0) return;
      
      try {
        const builds = await this.getBuilds({ limit: 10 });
        
        // Notify all subscribers of potential updates
        this.updateCallbacks.forEach(callback => {
          builds.forEach(build => {
            callback({
              type: 'build',
              action: build.status === BuildStatus.IN_PROGRESS ? 'started' : 
                      build.status === BuildStatus.SUCCESS ? 'completed' :
                      build.status === BuildStatus.FAILURE ? 'failed' : 'started',
              data: build
            });
          });
        });
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000);
  }
  
  dispose(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.updateCallbacks.clear();
    this.octokit = null;
  }
}
