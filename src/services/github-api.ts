import axios, { AxiosInstance } from 'axios';
import log from 'electron-log';

const logger = log.scope('github-api');

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string;
  html_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string;
  size: number;
  default_branch: string;
  has_issues: boolean;
  has_wiki: boolean;
  has_downloads: boolean;
  archived: boolean;
  disabled: boolean;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  comments: number;
  html_url: string;
}

export interface GitHubTrending {
  author: string;
  name: string;
  avatar: string;
  url: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  currentPeriodStars: number;
  builtBy: Array<{
    username: string;
    href: string;
    avatar: string;
  }>;
}

class GitHubAPIService {
  private client: AxiosInstance;
  private token: string | null;
  private rateLimitRemaining: number = 60;
  private rateLimitReset: Date | null = null;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || null;
    
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(this.token && { Authorization: `token ${this.token}` })
      },
      timeout: 10000
    });

    // Add rate limit handling
    this.client.interceptors.response.use(
      (response) => {
        if (response.headers['x-ratelimit-remaining']) {
          this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining']);
          this.rateLimitReset = new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000);
        }
        return response;
      },
      (error) => {
        if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = new Date(parseInt(error.response.headers['x-ratelimit-reset']) * 1000);
          logger.error(`GitHub API rate limit exceeded. Resets at ${resetTime.toLocaleString()}`);
        }
        return Promise.reject(error);
      }
    );
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch repository ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
    language?: string;
  } = {}): Promise<{ total_count: number; items: GitHubRepo[] }> {
    try {
      const params = {
        q: query + (options.language ? ` language:${options.language}` : ''),
        sort: options.sort || 'stars',
        order: options.order || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1
      };

      const response = await this.client.get('/search/repositories', { params });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to search repositories:', error.message);
      throw error;
    }
  }

  async getRepositoryIssues(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubIssue[]> {
    try {
      const params = {
        state: options.state || 'open',
        labels: options.labels?.join(','),
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1
      };

      const response = await this.client.get(`/repos/${owner}/${repo}/issues`, { params });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch issues for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  async getTrendingRepositories(language?: string, since: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<GitHubTrending[]> {
    // GitHub doesn't have an official trending API, so we use a workaround
    // by searching for repositories created recently with high stars
    try {
      const date = new Date();
      if (since === 'daily') {
        date.setDate(date.getDate() - 1);
      } else if (since === 'weekly') {
        date.setDate(date.getDate() - 7);
      } else {
        date.setMonth(date.getMonth() - 1);
      }

      const dateStr = date.toISOString().split('T')[0];
      let query = `created:>${dateStr}`;
      if (language) {
        query += ` language:${language}`;
      }

      const result = await this.searchRepositories(query, {
        sort: 'stars',
        order: 'desc',
        per_page: 25
      });

      // Transform to trending format
      return result.items.map(repo => ({
        author: repo.owner.login,
        name: repo.name,
        avatar: repo.owner.avatar_url,
        url: repo.html_url,
        description: repo.description || '',
        language: repo.language || 'Unknown',
        languageColor: this.getLanguageColor(repo.language),
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        currentPeriodStars: repo.stargazers_count, // Approximate
        builtBy: []
      }));
    } catch (error: any) {
      logger.error('Failed to fetch trending repositories:', error.message);
      throw error;
    }
  }

  async getUserStarredRepos(username: string, options: {
    sort?: 'created' | 'updated';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepo[]> {
    try {
      const params = {
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        per_page: options.per_page || 30,
        page: options.page || 1
      };

      const response = await this.client.get(`/users/${username}/starred`, { params });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch starred repos for ${username}:`, error.message);
      throw error;
    }
  }

  async importRepositoryAsTemplate(repoUrl: string): Promise<any> {
    try {
      // Parse the GitHub URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = match;
      const repoData = await this.getRepository(owner, repo.replace('.git', ''));

      // Get repository contents
      const response = await this.client.get(`/repos/${owner}/${repo}/contents`);
      const contents = response.data;

      // Get README if exists
      let readme = null;
      try {
        const readmeResponse = await this.client.get(`/repos/${owner}/${repo}/readme`);
        readme = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
      } catch (e) {
        // README might not exist
      }

      return {
        ...repoData,
        contents,
        readme
      };
    } catch (error: any) {
      logger.error('Failed to import repository as template:', error.message);
      throw error;
    }
  }

  getRateLimitStatus(): { remaining: number; reset: Date | null } {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset
    };
  }

  private getLanguageColor(language: string | null): string {
    const colors: Record<string, string> = {
      JavaScript: '#f1e05a',
      TypeScript: '#2b7489',
      Python: '#3572A5',
      Java: '#b07219',
      Go: '#00ADD8',
      Rust: '#dea584',
      'C++': '#f34b7d',
      'C#': '#178600',
      Ruby: '#701516',
      PHP: '#4F5D95',
      Swift: '#ffac45',
      Kotlin: '#F18E33',
      Dart: '#00B4AB',
      Vue: '#4fc08d',
      React: '#61dafb',
      // Add more as needed
    };
    return colors[language || ''] || '#6e7681';
  }
}

export default GitHubAPIService;
