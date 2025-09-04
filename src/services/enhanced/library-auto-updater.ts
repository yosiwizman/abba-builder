import * as log from "electron-log";
import * as fs from "fs-extra";
import * as path from "path";
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { getGitHubToken } from "../../config/secrets";

const logger = log.scope("library-auto-updater");

interface UpdateConfig {
  enabled: boolean;
  intervalHours: number;
  maxProjectsPerUpdate: number;
  autoDownloadPopular: boolean;
  popularThreshold: number;
  categories: string[];
  githubToken?: string;
}

interface UpdateResult {
  success: boolean;
  projectsUpdated: number;
  projectsDownloaded: number;
  newProjects: number;
  errors: string[];
  duration: number;
}

export class LibraryAutoUpdater extends EventEmitter {
  private config: UpdateConfig;
  private updateTimer: NodeJS.Timeout | null = null;
  private isUpdating: boolean = false;
  private libraryPath: string;
  private dbPath: string;
  private configPath: string;
  private lastUpdatePath: string;
  private updateHistory: UpdateResult[] = [];

  constructor() {
    super();

    this.libraryPath = path.join(process.cwd(), "project-library");
    this.dbPath = path.join(process.cwd(), "data", "project-library.json");
    this.configPath = path.join(
      process.cwd(),
      "data",
      "library-updater-config.json",
    );
    this.lastUpdatePath = path.join(
      process.cwd(),
      "data",
      "library-last-update.json",
    );

    this.config = {
      enabled: true,
      intervalHours: 24, // Daily updates by default
      maxProjectsPerUpdate: 100,
      autoDownloadPopular: true,
      popularThreshold: 1000, // Auto-download projects with >1000 stars
      categories: [], // Empty means all categories
      githubToken: getGitHubToken(), // Securely loaded from environment
    };

    this.initialize();
  }

  private async initialize() {
    try {
      // Ensure directories exist
      await fs.ensureDir(this.libraryPath);
      await fs.ensureDir(path.dirname(this.dbPath));

      // Load configuration
      if (await fs.pathExists(this.configPath)) {
        const savedConfig = await fs.readJson(this.configPath);
        this.config = { ...this.config, ...savedConfig };
        logger.info("Loaded auto-updater configuration", this.config);
      } else {
        await this.saveConfig();
      }

      // Load last update info
      if (await fs.pathExists(this.lastUpdatePath)) {
        const lastUpdate = await fs.readJson(this.lastUpdatePath);
        logger.info("Last update was at:", lastUpdate.timestamp);
      }

      // Start auto-update timer if enabled
      if (this.config.enabled) {
        this.startAutoUpdate();
      }

      this.emit("initialized", this.config);
    } catch (error) {
      logger.error("Failed to initialize auto-updater:", error);
      this.emit("error", error);
    }
  }

  private async saveConfig() {
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    logger.info("Saved auto-updater configuration");
  }

  public async updateConfig(newConfig: Partial<UpdateConfig>) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();

    // Restart timer if interval changed
    if (
      newConfig.intervalHours !== undefined ||
      newConfig.enabled !== undefined
    ) {
      this.stopAutoUpdate();
      if (this.config.enabled) {
        this.startAutoUpdate();
      }
    }

    this.emit("configUpdated", this.config);
    return this.config;
  }

  private startAutoUpdate() {
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;

    logger.info(
      `Starting auto-update timer (interval: ${this.config.intervalHours} hours)`,
    );

    // Clear existing timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    // Run initial update after 1 minute
    setTimeout(() => this.performUpdate(), 60000);

    // Set up recurring updates
    this.updateTimer = setInterval(() => {
      this.performUpdate();
    }, intervalMs);

    this.emit("autoUpdateStarted", this.config.intervalHours);
  }

  private stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      logger.info("Auto-update timer stopped");
      this.emit("autoUpdateStopped");
    }
  }

  public async performUpdate(): Promise<UpdateResult> {
    if (this.isUpdating) {
      logger.warn("Update already in progress, skipping");
      return {
        success: false,
        projectsUpdated: 0,
        projectsDownloaded: 0,
        newProjects: 0,
        errors: ["Update already in progress"],
        duration: 0,
      };
    }

    this.isUpdating = true;
    const startTime = Date.now();
    const result: UpdateResult = {
      success: true,
      projectsUpdated: 0,
      projectsDownloaded: 0,
      newProjects: 0,
      errors: [],
      duration: 0,
    };

    try {
      logger.info("Starting library update...");
      this.emit("updateStarted");

      // Load current database
      const db = await this.loadDatabase();
      const existingIds = new Set(db.projects.map((p: any) => p.id));

      // Fetch latest projects from GitHub
      const categories =
        this.config.categories.length > 0
          ? this.config.categories
          : this.getAllCategories();

      const allNewProjects = [];

      for (const category of categories) {
        try {
          const projects = await this.fetchGitHubProjects(category);
          allNewProjects.push(...projects);

          // Rate limiting
          await this.delay(1000);
        } catch (error: any) {
          logger.error(`Failed to fetch ${category}:`, error);
          result.errors.push(`${category}: ${error.message}`);
        }
      }

      // Process and merge projects
      for (const project of allNewProjects) {
        if (!existingIds.has(project.id)) {
          db.projects.push(project);
          result.newProjects++;
        } else {
          // Update existing project metadata
          const index = db.projects.findIndex((p: any) => p.id === project.id);
          if (index >= 0) {
            db.projects[index] = { ...db.projects[index], ...project };
            result.projectsUpdated++;
          }
        }
      }

      // Auto-download popular projects
      if (this.config.autoDownloadPopular) {
        const popularProjects = db.projects
          .filter(
            (p: any) =>
              p.stars >= this.config.popularThreshold && !p.is_downloaded,
          )
          .sort((a: any, b: any) => b.stars - a.stars)
          .slice(0, 10); // Download top 10 popular projects

        for (const project of popularProjects) {
          try {
            await this.downloadProject(project);
            project.is_downloaded = true;
            project.local_path = path.join(
              this.libraryPath,
              project.owner,
              project.name,
            );
            result.projectsDownloaded++;

            // Rate limiting
            await this.delay(2000);
          } catch (error: any) {
            logger.error(`Failed to download ${project.name}:`, error);
            result.errors.push(`Download ${project.name}: ${error.message}`);
          }
        }
      }

      // Update statistics
      db.lastUpdated = new Date().toISOString();
      db.statistics = this.calculateStatistics(db.projects);

      // Save updated database
      await fs.writeJson(this.dbPath, db, { spaces: 2 });

      // Save last update info
      await fs.writeJson(this.lastUpdatePath, {
        timestamp: new Date().toISOString(),
        result,
      });

      // Store in history
      this.updateHistory.push(result);
      if (this.updateHistory.length > 100) {
        this.updateHistory.shift(); // Keep only last 100 updates
      }

      result.duration = Date.now() - startTime;

      logger.info("Library update completed", result);
      this.emit("updateCompleted", result);
    } catch (error: any) {
      logger.error("Library update failed:", error);
      result.success = false;
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      this.emit("updateFailed", error);
    } finally {
      this.isUpdating = false;
    }

    return result;
  }

  private async loadDatabase() {
    if (!(await fs.pathExists(this.dbPath))) {
      return {
        projects: [],
        lastUpdated: null,
        statistics: {},
      };
    }
    return await fs.readJson(this.dbPath);
  }

  private getAllCategories(): string[] {
    // Default comprehensive categories
    return [
      "web-framework",
      "mobile-app",
      "machine-learning",
      "blockchain",
      "game-development",
      "devops",
      "data-science",
      "api",
      "dashboard",
      "ecommerce",
      "cms",
      "chatbot",
      "iot",
      "security",
      "database",
      "monitoring",
      "automation",
    ];
  }

  private async fetchGitHubProjects(category: string): Promise<any[]> {
    const searchQuery = `${category} stars:>50 pushed:>${this.getDateFilter()}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=20`;

    const headers: any = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Dyad-Library-AutoUpdater",
    };

    if (this.config.githubToken) {
      headers["Authorization"] = `token ${this.config.githubToken}`;
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("GitHub API rate limit reached");
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.items || []).map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        url: repo.html_url,
        clone_url: repo.clone_url,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        category: category,
        topics: repo.topics || [],
        last_updated: repo.updated_at,
        created_at: repo.created_at,
        license: repo.license?.spdx_id || "Unknown",
        qualityScore: this.calculateQualityScore(repo),
        is_downloaded: false,
        local_path: null,
      }));
    } catch (error) {
      logger.error(`Failed to fetch GitHub projects for ${category}:`, error);
      // Return empty array on error to continue with other categories
      return [];
    }
  }

  private getDateFilter(): string {
    // Get projects updated in the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  }

  private calculateQualityScore(repo: any): number {
    let score = 0;

    // Stars contribution
    score += Math.min(30, Math.floor(repo.stargazers_count / 100));

    // Forks contribution
    score += Math.min(20, Math.floor(repo.forks_count / 50));

    // Recent activity
    const lastUpdate = new Date(repo.updated_at);
    const daysOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 30) score += 20;
    else if (daysOld < 90) score += 10;

    // Has description
    if (repo.description) score += 10;

    // Has license
    if (repo.license) score += 10;

    // Has topics
    if (repo.topics && repo.topics.length > 0) score += 10;

    return Math.min(100, score);
  }

  private async downloadProject(project: any) {
    const projectPath = path.join(
      this.libraryPath,
      project.owner,
      project.name,
    );

    // Skip if already exists
    if (await fs.pathExists(projectPath)) {
      logger.info(`Project ${project.name} already exists, skipping download`);
      return;
    }

    await fs.ensureDir(path.dirname(projectPath));

    logger.info(`Downloading project: ${project.name}`);

    // Clone the repository
    execSync(`git clone --depth 1 ${project.clone_url} "${projectPath}"`, {
      stdio: "pipe",
    });

    // Remove .git directory to save space
    await fs.remove(path.join(projectPath, ".git"));

    logger.info(`Downloaded project: ${project.name}`);
  }

  private calculateStatistics(projects: any[]) {
    const stats = {
      totalProjects: projects.length,
      downloadedProjects: projects.filter((p: any) => p.is_downloaded).length,
      categoryCounts: {} as Record<string, number>,
      languageCounts: {} as Record<string, number>,
      averageQualityScore: 0,
      totalStars: 0,
    };

    for (const project of projects) {
      // Category counts
      if (project.category) {
        stats.categoryCounts[project.category] =
          (stats.categoryCounts[project.category] || 0) + 1;
      }

      // Language counts
      if (project.language) {
        stats.languageCounts[project.language] =
          (stats.languageCounts[project.language] || 0) + 1;
      }

      // Quality score
      stats.averageQualityScore += project.qualityScore || 0;

      // Stars
      stats.totalStars += project.stars || 0;
    }

    if (projects.length > 0) {
      stats.averageQualityScore /= projects.length;
    }

    return stats;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async searchProjects(query: string): Promise<any[]> {
    const db = await this.loadDatabase();
    const searchLower = query.toLowerCase();

    return db.projects.filter(
      (p: any) =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        (p.topics &&
          p.topics.some((t: string) => t.toLowerCase().includes(searchLower))),
    );
  }

  public async getProjectsByCategory(category: string): Promise<any[]> {
    const db = await this.loadDatabase();
    return db.projects.filter((p: any) => p.category === category);
  }

  public async getDownloadedProjects(): Promise<any[]> {
    const db = await this.loadDatabase();
    return db.projects.filter((p: any) => p.is_downloaded);
  }

  public async getStatistics() {
    const db = await this.loadDatabase();
    return db.statistics || {};
  }

  public getUpdateHistory(): UpdateResult[] {
    return this.updateHistory;
  }

  public async forceUpdate(): Promise<UpdateResult> {
    logger.info("Force update requested");
    return this.performUpdate();
  }

  public destroy() {
    this.stopAutoUpdate();
    this.removeAllListeners();
    logger.info("Library auto-updater destroyed");
  }
}

// Export singleton instance
export const libraryAutoUpdater = new LibraryAutoUpdater();
