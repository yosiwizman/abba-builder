import { ipcMain } from "electron";
import * as log from "electron-log";
import * as path from "path";
import * as fs from "fs-extra";
import { randomBytes } from "crypto";

// Dynamic import for ES module
let ProjectLibrarySystem: any;

// Enhanced logging wrapper with correlation IDs and timing
function withProjectLibraryLogging<T extends any[], R>(
  handlerName: string,
  handler: (...args: T) => Promise<R>,
  validateInput?: (input: any) => string | null,
) {
  return async (...args: T): Promise<R> => {
    const correlationId = randomBytes(8).toString("hex");
    const startTime = Date.now();
    const input = args[1]; // args[0] is event, args[1+] are the actual inputs

    log.info(`[${correlationId}] ${handlerName} started`, {
      handler: handlerName,
      correlationId,
      input: JSON.stringify(input).substring(0, 200), // Truncate for logging
    });

    // Validate input if validator provided
    if (validateInput && input !== undefined) {
      const validationError = validateInput(input);
      if (validationError) {
        const error = `Input validation failed: ${validationError}`;
        log.error(`[${correlationId}] ${handlerName} validation error`, {
          handler: handlerName,
          correlationId,
          error,
          durationMs: Date.now() - startTime,
        });
        return {
          success: false,
          error,
          correlationId,
          data: null,
        } as R;
      }
    }

    try {
      const result = await handler(...args);
      const durationMs = Date.now() - startTime;

      log.info(`[${correlationId}] ${handlerName} completed`, {
        handler: handlerName,
        correlationId,
        durationMs,
        success: (result as any)?.success ?? true,
        dataCount: Array.isArray((result as any)?.data)
          ? (result as any).data.length
          : undefined,
      });

      // Add correlation ID and timing to result
      if (typeof result === "object" && result !== null) {
        (result as any).correlationId = correlationId;
        (result as any).durationMs = durationMs;
      }

      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      log.error(`[${correlationId}] ${handlerName} failed`, {
        handler: handlerName,
        correlationId,
        error: error.message || error,
        stack: error.stack,
        durationMs,
      });

      return {
        success: false,
        error: error.message || "Operation failed",
        correlationId,
        durationMs,
        data: null,
      } as R;
    }
  };
}

// Input validators for project library operations
const projectLibraryValidators = {
  scrapeAll: (projectsPerCategory: any) => {
    if (
      projectsPerCategory !== undefined &&
      typeof projectsPerCategory !== "number"
    ) {
      return "Projects per category must be a number";
    }
    if (projectsPerCategory && projectsPerCategory < 1) {
      return "Projects per category must be at least 1";
    }
    if (projectsPerCategory && projectsPerCategory > 100) {
      return "Projects per category cannot exceed 100";
    }
    return null;
  },
  scrape: (searchQuery: any) => {
    if (searchQuery !== undefined && typeof searchQuery !== "string") {
      return "Search query must be a string";
    }
    return null;
  },
  download: (projectId: any) => {
    if (projectId === undefined || projectId === null) {
      return "Project ID is required";
    }
    if (typeof projectId !== "number") {
      return "Project ID must be a number";
    }
    return null;
  },
  downloadTop: (limit: any) => {
    if (limit !== undefined && typeof limit !== "number") {
      return "Limit must be a number";
    }
    if (limit && limit < 1) {
      return "Limit must be at least 1";
    }
    if (limit && limit > 500) {
      return "Limit cannot exceed 500";
    }
    return null;
  },
  getByCategory: (category: any) => {
    if (!category || typeof category !== "string") {
      return "Category is required and must be a string";
    }
    return null;
  },
  search: (query: any) => {
    if (!query || typeof query !== "string") {
      return "Search query is required and must be a string";
    }
    if (query.length < 2) {
      return "Search query must be at least 2 characters";
    }
    return null;
  },
  findTemplate: (requirements: any) => {
    if (!requirements || typeof requirements !== "object") {
      return "Requirements must be an object";
    }
    return null;
  },
  useTemplate: (projectId: any) => {
    if (projectId === undefined || projectId === null) {
      return "Project ID is required";
    }
    if (typeof projectId !== "number") {
      return "Project ID must be a number";
    }
    return null;
  },
};

async function getProjectLibrary() {
  if (!ProjectLibrarySystem) {
    try {
      const modulePath = path.join(
        __dirname,
        "../../services/enhanced/project-library-system.js",
      );
      log.info(`Loading ProjectLibrarySystem from: ${modulePath}`);

      if (await fs.pathExists(modulePath)) {
        const module = await import(modulePath);
        ProjectLibrarySystem = module.default;
      } else {
        log.warn("Project Library System not found, using mock implementation");

        // Mock implementation
        ProjectLibrarySystem = class {
          async scrapeGitHubProjects(query: string, limit: number) {
            log.info(
              `Mock: Scraping GitHub projects with query: ${query}, limit: ${limit}`,
            );
            return this.getMockProjects().slice(0, limit);
          }

          async scrapeAllCategories(projectsPerCategory: number) {
            log.info(
              `Mock: Scraping all categories with ${projectsPerCategory} projects per category`,
            );
            return this.getMockProjects();
          }

          async downloadProject(projectId: number) {
            log.info(`Mock: Downloading project ${projectId}`);
            const projects = this.getMockProjects();
            const project = projects.find((p: any) => p.id === projectId);
            if (project) {
              project.is_downloaded = true;
              project.local_path = `/mock/path/${project.name}`;
            }
            return project;
          }

          async downloadTopProjects(limit: number) {
            log.info(`Mock: Downloading top ${limit} projects`);
            return { downloaded: limit };
          }

          async getAllProjects() {
            return this.getMockProjects();
          }

          async getProjectsByCategory(category: string) {
            return this.getMockProjects().filter(
              (p: any) => p.category === category,
            );
          }

          async searchProjects(query: string) {
            const lowQuery = query.toLowerCase();
            return this.getMockProjects().filter(
              (p: any) =>
                p.name.toLowerCase().includes(lowQuery) ||
                p.description?.toLowerCase().includes(lowQuery),
            );
          }

          async getStats() {
            return {
              totalProjects: 1000,
              downloadedProjects: 100,
              categoryCounts: {
                ecommerce: 50,
                dashboard: 75,
                social: 40,
                productivity: 60,
                saas: 45,
                "ai-agents": 30,
                chatbot: 25,
                "web-game": 35,
                "mobile-game": 40,
                defi: 20,
                nft: 15,
              },
              averageQuality: 75,
              topCategories: [
                ["dashboard", 75],
                ["productivity", 60],
                ["ecommerce", 50],
              ],
              topTechStacks: [
                ["React", 450],
                ["Node.js", 400],
                ["TypeScript", 350],
                ["Python", 200],
                ["Docker", 150],
              ],
            };
          }

          async findBestTemplate(requirements: any) {
            const projects = this.getMockProjects();
            return projects
              .filter(
                (p: any) =>
                  !requirements.category ||
                  p.category === requirements.category,
              )
              .slice(0, 5);
          }

          async useProjectAsTemplate(projectId: number, modifications: any) {
            const projects = this.getMockProjects();
            const project = projects.find((p: any) => p.id === projectId);
            return {
              originalProject: project,
              templatePath: `/mock/generated/${project?.name}-custom`,
              newProjectName: `${project?.name}-custom`,
              modifications,
              createdAt: new Date().toISOString(),
            };
          }

          async initializeWithProvenProjects() {
            log.info("Mock: Initializing with proven projects");
            return this.getMockProjects();
          }

          getMockProjects() {
            return [
              {
                id: 1,
                name: "react-ecommerce-template",
                owner: "proven-templates",
                url: "https://github.com/proven-templates/react-ecommerce",
                clone_url:
                  "https://github.com/proven-templates/react-ecommerce.git",
                description:
                  "A proven React ecommerce template with cart, checkout, and payment integration",
                stars: 2500,
                forks: 450,
                language: "JavaScript",
                category: "ecommerce",
                topics: ["react", "ecommerce", "shopping-cart", "stripe"],
                tech_stack: [
                  "React",
                  "Node.js",
                  "Express",
                  "MongoDB",
                  "Stripe",
                ],
                is_downloaded: false,
                quality_score: 85,
                difficulty: "intermediate",
                build_commands: {
                  install: "npm install",
                  build: "npm run build",
                  start: "npm start",
                  dev: "npm run dev",
                },
              },
              {
                id: 2,
                name: "admin-dashboard-pro",
                owner: "proven-templates",
                url: "https://github.com/proven-templates/admin-dashboard",
                description:
                  "Professional admin dashboard with analytics, charts, and user management",
                stars: 3200,
                forks: 670,
                language: "TypeScript",
                category: "dashboard",
                topics: [
                  "dashboard",
                  "admin",
                  "analytics",
                  "react",
                  "typescript",
                ],
                tech_stack: [
                  "React",
                  "TypeScript",
                  "Redux",
                  "Chart.js",
                  "Material-UI",
                ],
                is_downloaded: false,
                quality_score: 90,
                difficulty: "advanced",
                build_commands: {
                  install: "npm install",
                  build: "npm run build",
                  start: "npm start",
                  dev: "npm run dev",
                },
              },
              {
                id: 3,
                name: "ai-chatbot-platform",
                owner: "ai-templates",
                category: "chatbot",
                description: "Advanced AI chatbot with NLP capabilities",
                stars: 8000,
                forks: 1200,
                quality_score: 95,
                language: "Python",
                tech_stack: ["Python", "TensorFlow", "FastAPI"],
                is_downloaded: true,
                local_path: "/mock/library/chatbot/ai-chatbot-platform",
                build_commands: {
                  install: "pip install -r requirements.txt",
                  start: "python app.py",
                  dev: "python app.py --debug",
                  test: "pytest",
                },
              },
              {
                id: 4,
                name: "defi-exchange",
                owner: "crypto-templates",
                category: "defi",
                description: "Decentralized exchange platform",
                stars: 3000,
                forks: 500,
                quality_score: 80,
                language: "JavaScript",
                tech_stack: ["Solidity", "Web3", "React", "Ethereum"],
                is_downloaded: false,
                build_commands: {
                  install: "npm install",
                  build: "npm run build",
                  start: "npm start",
                  dev: "npm run dev",
                },
              },
              {
                id: 5,
                name: "mobile-game-engine",
                owner: "game-templates",
                category: "mobile-game",
                description: "Cross-platform mobile game engine",
                stars: 12000,
                forks: 2500,
                quality_score: 98,
                language: "C#",
                tech_stack: ["Unity", "C#", "Firebase"],
                is_downloaded: false,
                build_commands: {
                  install: "unity install",
                  build: "unity build",
                  start: "unity run",
                  dev: "unity dev",
                },
              },
            ];
          }
        };
      }
    } catch (error) {
      log.error("Failed to load ProjectLibrarySystem:", error);
      throw error;
    }
  }

  return new ProjectLibrarySystem();
}

export function registerProjectLibraryHandlers() {
  log.info(
    "(project_library_handlers) > Registering Comprehensive Project Library IPC handlers with enhanced logging",
  );

  // Scrape all categories (500+ projects)
  ipcMain.handle(
    "project-library:scrape-all",
    withProjectLibraryLogging(
      "project-library:scrape-all",
      async (_event, projectsPerCategory: number = 10) => {
        const projectLibrary = await getProjectLibrary();
        const projects =
          await projectLibrary.scrapeAllCategories(projectsPerCategory);
        return { success: true, data: projects };
      },
      projectLibraryValidators.scrapeAll,
    ),
  );

  // Scrape GitHub for projects
  ipcMain.handle(
    "project-library:scrape",
    withProjectLibraryLogging(
      "project-library:scrape",
      async (
        _event,
        searchQuery: string = "stars:>100",
        limit: number = 50,
      ) => {
        const projectLibrary = await getProjectLibrary();
        const projects = await projectLibrary.scrapeGitHubProjects(
          searchQuery,
          limit,
        );
        return { success: true, data: projects };
      },
      projectLibraryValidators.scrape,
    ),
  );

  // Download a project locally
  ipcMain.handle(
    "project-library:download",
    withProjectLibraryLogging(
      "project-library:download",
      async (_event, projectId: number) => {
        const projectLibrary = await getProjectLibrary();
        const project = await projectLibrary.downloadProject(projectId);
        return { success: true, data: project };
      },
      projectLibraryValidators.download,
    ),
  );

  // Download top projects
  ipcMain.handle(
    "project-library:download-top",
    withProjectLibraryLogging(
      "project-library:download-top",
      async (_event, limit: number = 100) => {
        const projectLibrary = await getProjectLibrary();
        await projectLibrary.downloadTopProjects(limit);
        return { success: true, message: `Downloaded top ${limit} projects` };
      },
      projectLibraryValidators.downloadTop,
    ),
  );

  // Get all projects
  ipcMain.handle(
    "project-library:get-all",
    withProjectLibraryLogging("project-library:get-all", async () => {
      const projectLibrary = await getProjectLibrary();
      const projects = await projectLibrary.getAllProjects();
      return { success: true, data: projects };
    }),
  );

  // Get projects by category
  ipcMain.handle(
    "project-library:get-by-category",
    withProjectLibraryLogging(
      "project-library:get-by-category",
      async (_event, category: string) => {
        const projectLibrary = await getProjectLibrary();
        const projects = await projectLibrary.getProjectsByCategory(category);
        return { success: true, data: projects };
      },
      projectLibraryValidators.getByCategory,
    ),
  );

  // Search projects
  ipcMain.handle(
    "project-library:search",
    withProjectLibraryLogging(
      "project-library:search",
      async (_event, query: string) => {
        const projectLibrary = await getProjectLibrary();
        const projects = await projectLibrary.searchProjects(query);
        return { success: true, data: projects };
      },
      projectLibraryValidators.search,
    ),
  );

  // Get statistics
  ipcMain.handle(
    "project-library:get-stats",
    withProjectLibraryLogging("project-library:get-stats", async () => {
      const projectLibrary = await getProjectLibrary();
      const stats = await projectLibrary.getStats();
      return { success: true, data: stats };
    }),
  );

  // Find best template for requirements
  ipcMain.handle(
    "project-library:find-template",
    withProjectLibraryLogging(
      "project-library:find-template",
      async (_event, requirements: any) => {
        const projectLibrary = await getProjectLibrary();
        const templates = await projectLibrary.findBestTemplate(requirements);
        return { success: true, data: templates };
      },
      projectLibraryValidators.findTemplate,
    ),
  );

  // Use project as template
  ipcMain.handle(
    "project-library:use-template",
    withProjectLibraryLogging(
      "project-library:use-template",
      async (_event, projectId: number, modifications: any = {}) => {
        const projectLibrary = await getProjectLibrary();
        const result = await projectLibrary.useProjectAsTemplate(
          projectId,
          modifications,
        );
        return { success: true, data: result };
      },
      projectLibraryValidators.useTemplate,
    ),
  );

  // Initialize with proven projects
  ipcMain.handle(
    "project-library:init-proven",
    withProjectLibraryLogging("project-library:init-proven", async () => {
      const projectLibrary = await getProjectLibrary();
      const projects = await projectLibrary.initializeWithProvenProjects();
      return {
        success: true,
        data: projects,
        message: "Initialized with proven projects",
      };
    }),
  );

  // Enhanced refresh that includes project library update
  ipcMain.handle(
    "project-library:refresh",
    withProjectLibraryLogging("project-library:refresh", async () => {
      const projectLibrary = await getProjectLibrary();

      // Scrape fresh projects from different categories
      const searches = [
        "stars:>1000 language:JavaScript react",
        "stars:>500 dashboard admin",
        "stars:>500 ecommerce",
        "stars:>500 chat messaging",
        "stars:>500 machine learning",
        "stars:>500 game javascript",
      ];

      let totalProjects = 0;
      for (const search of searches) {
        const projects = await projectLibrary.scrapeGitHubProjects(search, 10);
        totalProjects += projects.length;
      }

      return {
        success: true,
        message: `Refreshed with ${totalProjects} projects`,
        totalProjects,
      };
    }),
  );

  log.info(
    "(project_library_handlers) > Comprehensive Project Library IPC handlers registered successfully",
  );
}
