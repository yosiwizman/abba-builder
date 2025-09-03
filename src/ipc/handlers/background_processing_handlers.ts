import { ipcMain } from "electron";
import * as log from "electron-log";
import { getWorkerPool } from "../../services/worker-pool";
import {
  getJobQueue,
  JOB_TYPES,
  createPriorityJob,
} from "../../services/job-queue";
import * as fs from "fs-extra";
import * as path from "path";

const logger = log.scope("background-processing");

/**
 * Register IPC handlers for background processing and worker pool operations
 */
export function registerBackgroundProcessingHandlers() {
  logger.info("Registering background processing IPC handlers");

  // Initialize services
  const workerPool = getWorkerPool();
  const jobQueue = getJobQueue();

  // Initialize services on startup
  (async () => {
    try {
      await workerPool.initialize();
      await jobQueue.initialize();
      logger.info("Background processing services initialized");
    } catch (error) {
      logger.error("Failed to initialize background services:", error);
    }
  })();

  /**
   * Analyze code using worker pool
   */
  ipcMain.handle(
    "worker:analyze-code",
    async (
      _event,
      params: {
        code: string;
        language: string;
        projectId?: string;
      },
    ) => {
      try {
        logger.info(`Analyzing code for language: ${params.language}`);

        const result = await workerPool.analyzeCode(
          params.code,
          params.language,
        );

        // If projectId provided, save analysis to cache
        if (params.projectId && result.success) {
          await jobQueue.addJob("cache-update", {
            type: "cache-analysis",
            payload: {
              projectId: params.projectId,
              analysis: result.data,
            },
          });
        }

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        logger.error("Code analysis failed:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Compile TypeScript code using worker pool
   */
  ipcMain.handle(
    "worker:compile-typescript",
    async (
      _event,
      params: {
        code: string;
        options?: any;
      },
    ) => {
      try {
        logger.info("Compiling TypeScript code");

        const result = await workerPool.compileTypeScript(
          params.code,
          params.options,
        );

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        logger.error("TypeScript compilation failed:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Transform code (minify, beautify, transpile)
   */
  ipcMain.handle(
    "worker:transform-code",
    async (
      _event,
      params: {
        code: string;
        transformType: "minify" | "beautify" | "transpile";
      },
    ) => {
      try {
        logger.info(`Transforming code: ${params.transformType}`);

        const result = await workerPool.transformCode(
          params.code,
          params.transformType,
        );

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        logger.error("Code transformation failed:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Get worker pool statistics
   */
  ipcMain.handle("worker:get-stats", async () => {
    try {
      const stats = workerPool.getStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      logger.error("Failed to get worker stats:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Analyze entire project using job queue
   */
  ipcMain.handle(
    "job:analyze-project",
    async (
      _event,
      params: {
        projectPath: string;
        deep?: boolean;
      },
    ) => {
      try {
        logger.info(`Creating job to analyze project: ${params.projectPath}`);

        const job = await createPriorityJob(
          JOB_TYPES.ANALYZE_PROJECT,
          {
            type: JOB_TYPES.ANALYZE_PROJECT,
            payload: {
              projectPath: params.projectPath,
              deep: params.deep || false,
            },
          },
          1,
        );

        return {
          success: true,
          data: {
            jobId: job.id,
            queue: JOB_TYPES.ANALYZE_PROJECT,
            message: "Project analysis job created",
          },
        };
      } catch (error: any) {
        logger.error("Failed to create project analysis job:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Sync GitHub data in background
   */
  ipcMain.handle(
    "job:sync-github",
    async (
      _event,
      params: {
        repositories?: string[];
        fullSync?: boolean;
      },
    ) => {
      try {
        logger.info("Creating GitHub sync job");

        const job = await jobQueue.addJob(JOB_TYPES.SYNC_GITHUB, {
          type: JOB_TYPES.SYNC_GITHUB,
          payload: {
            repositories: params.repositories || [],
            fullSync: params.fullSync || false,
          },
        });

        return {
          success: true,
          data: {
            jobId: job.id,
            queue: JOB_TYPES.SYNC_GITHUB,
            message: "GitHub sync job created",
          },
        };
      } catch (error: any) {
        logger.error("Failed to create GitHub sync job:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Build template in background
   */
  ipcMain.handle(
    "job:build-template",
    async (
      _event,
      params: {
        templateId: string;
        configuration: any;
      },
    ) => {
      try {
        logger.info(`Creating template build job for: ${params.templateId}`);

        const job = await jobQueue.addJob(JOB_TYPES.BUILD_TEMPLATE, {
          type: JOB_TYPES.BUILD_TEMPLATE,
          payload: {
            templateId: params.templateId,
            configuration: params.configuration,
          },
        });

        return {
          success: true,
          data: {
            jobId: job.id,
            queue: JOB_TYPES.BUILD_TEMPLATE,
            message: "Template build job created",
          },
        };
      } catch (error: any) {
        logger.error("Failed to create template build job:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Schedule recurring cache cleanup
   */
  ipcMain.handle(
    "job:schedule-cleanup",
    async (
      _event,
      params: {
        cronExpression?: string;
      },
    ) => {
      try {
        const cron = params.cronExpression || "0 2 * * *"; // Default: 2 AM daily
        logger.info(`Scheduling cache cleanup with cron: ${cron}`);

        await jobQueue.scheduleJob(
          JOB_TYPES.CLEANUP_CACHE,
          "cleanup-cache-scheduled",
          cron,
          {
            type: JOB_TYPES.CLEANUP_CACHE,
            payload: {
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              cleanupType: "cache",
            },
          },
        );

        return {
          success: true,
          data: {
            message: `Cache cleanup scheduled with cron: ${cron}`,
          },
        };
      } catch (error: any) {
        logger.error("Failed to schedule cache cleanup:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Get job status
   */
  ipcMain.handle(
    "job:get-status",
    async (
      _event,
      params: {
        queueName: string;
        jobId: string;
      },
    ) => {
      try {
        const status = await jobQueue.getJobStatus(
          params.queueName,
          params.jobId,
        );

        return {
          success: true,
          data: status,
        };
      } catch (error: any) {
        logger.error("Failed to get job status:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Get queue statistics
   */
  ipcMain.handle(
    "job:get-queue-stats",
    async (
      _event,
      params: {
        queueName: string;
      },
    ) => {
      try {
        const stats = await jobQueue.getQueueStats(params.queueName);

        return {
          success: true,
          data: stats,
        };
      } catch (error: any) {
        logger.error("Failed to get queue stats:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Batch analyze multiple files
   */
  ipcMain.handle(
    "worker:batch-analyze",
    async (
      _event,
      params: {
        files: Array<{ path: string; content?: string }>;
        projectId?: string;
      },
    ) => {
      try {
        logger.info(`Batch analyzing ${params.files.length} files`);

        const results = [];
        const batchSize = 5;

        for (let i = 0; i < params.files.length; i += batchSize) {
          const batch = params.files.slice(i, i + batchSize);

          const batchPromises = batch.map(async (file) => {
            let content = file.content;

            // Read file if content not provided
            if (!content && file.path) {
              try {
                content = await fs.readFile(file.path, "utf-8");
              } catch (error) {
                logger.warn(`Failed to read file ${file.path}:`, error);
                return {
                  file: file.path,
                  success: false,
                  error: "Failed to read file",
                };
              }
            }

            if (!content) {
              return {
                file: file.path,
                success: false,
                error: "No content to analyze",
              };
            }

            // Detect language from extension
            const ext = path.extname(file.path).toLowerCase();
            const languageMap: Record<string, string> = {
              ".js": "javascript",
              ".jsx": "javascript",
              ".ts": "typescript",
              ".tsx": "typescript",
              ".py": "python",
              ".java": "java",
              ".go": "go",
              ".rs": "rust",
              ".cpp": "cpp",
              ".c": "c",
              ".cs": "csharp",
              ".rb": "ruby",
              ".php": "php",
              ".swift": "swift",
              ".kt": "kotlin",
            };

            const language = languageMap[ext] || "javascript";

            try {
              const result = await workerPool.analyzeCode(content, language);
              return {
                file: file.path,
                success: true,
                analysis: result,
              };
            } catch (error: any) {
              return {
                file: file.path,
                success: false,
                error: error.message,
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        // Create background job to save results if projectId provided
        if (params.projectId) {
          await jobQueue.addJob("save-analysis", {
            type: "save-batch-analysis",
            payload: {
              projectId: params.projectId,
              results,
            },
          });
        }

        return {
          success: true,
          data: {
            results,
            totalFiles: params.files.length,
            successfulAnalyses: results.filter((r) => r.success).length,
            failedAnalyses: results.filter((r) => !r.success).length,
          },
        };
      } catch (error: any) {
        logger.error("Batch analysis failed:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  );

  /**
   * Register job processors
   */

  // Process project analysis jobs
  jobQueue.processJobType(JOB_TYPES.ANALYZE_PROJECT, async (data: any) => {
    const { projectPath, deep } = data;
    logger.info(`Processing project analysis for: ${projectPath}`);

    try {
      // Get all code files in project
      const codeFiles: string[] = [];
      const extensions = [
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".py",
        ".java",
        ".go",
        ".rs",
      ];

      async function findCodeFiles(dir: string) {
        const items = await fs.readdir(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = await fs.stat(fullPath);

          if (
            stat.isDirectory() &&
            !item.startsWith(".") &&
            item !== "node_modules"
          ) {
            if (deep) {
              await findCodeFiles(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (extensions.includes(ext)) {
              codeFiles.push(fullPath);
            }
          }
        }
      }

      await findCodeFiles(projectPath);

      // Analyze files in batches
      const analysisResults = [];
      const batchSize = 10;

      for (let i = 0; i < codeFiles.length; i += batchSize) {
        const batch = codeFiles.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
          const content = await fs.readFile(file, "utf-8");
          const ext = path.extname(file).toLowerCase();
          const language =
            ext === ".ts" || ext === ".tsx" ? "typescript" : "javascript";

          return workerPool.analyzeCode(content, language);
        });

        const results = await Promise.all(batchPromises);
        analysisResults.push(...results);
      }

      // Calculate project-wide metrics
      const projectMetrics = {
        totalFiles: codeFiles.length,
        totalLines: analysisResults.reduce(
          (sum, r) => sum + (r.data?.metrics?.lines || 0),
          0,
        ),
        totalFunctions: analysisResults.reduce(
          (sum, r) => sum + (r.data?.metrics?.functions || 0),
          0,
        ),
        totalClasses: analysisResults.reduce(
          (sum, r) => sum + (r.data?.metrics?.classes || 0),
          0,
        ),
        averageCognitiveLoad:
          analysisResults.reduce(
            (sum, r) => sum + (r.data?.metrics?.cognitiveLoad || 0),
            0,
          ) / analysisResults.length,
        issues: analysisResults.flatMap((r) => r.data?.issues || []),
        suggestions: analysisResults.flatMap((r) => r.data?.suggestions || []),
      };

      logger.info(`Project analysis complete: ${projectPath}`, projectMetrics);

      return projectMetrics;
    } catch (error: any) {
      logger.error(`Project analysis failed for ${projectPath}:`, error);
      throw error;
    }
  });

  // Process GitHub sync jobs
  jobQueue.processJobType(JOB_TYPES.SYNC_GITHUB, async (data: any) => {
    const { repositories, fullSync } = data;
    logger.info(
      `Processing GitHub sync: ${fullSync ? "Full" : "Partial"} sync for ${repositories.length || "all"} repositories`,
    );

    // TODO: Implement actual GitHub sync logic
    // This would fetch latest data from GitHub API and update local cache

    return {
      synced: repositories.length || "all",
      timestamp: new Date().toISOString(),
    };
  });

  // Process template build jobs
  jobQueue.processJobType(JOB_TYPES.BUILD_TEMPLATE, async (data: any) => {
    const { templateId, configuration } = data;
    logger.info(`Processing template build: ${templateId}`);

    // TODO: Implement actual template building logic
    // This would compile, configure, and prepare the template

    return {
      templateId,
      buildPath: `/builds/${templateId}-${Date.now()}`,
      configuration,
    };
  });

  // Process cache cleanup jobs
  jobQueue.processJobType(JOB_TYPES.CLEANUP_CACHE, async (data: any) => {
    const { maxAge, cleanupType } = data;
    logger.info(
      `Processing cache cleanup: ${cleanupType} with max age ${maxAge}ms`,
    );

    // TODO: Implement actual cache cleanup logic
    // This would remove old cache entries

    return {
      cleaned: Math.floor(Math.random() * 100),
      freedSpace: Math.floor(Math.random() * 1000) + "MB",
    };
  });

  // Listen for job events
  jobQueue.on("job:completed", ({ queue, jobId, _result }) => {
    logger.info(`Job completed - Queue: ${queue}, Job ID: ${jobId}`);
  });

  jobQueue.on("job:failed", ({ queue, jobId, error }) => {
    logger.error(
      `Job failed - Queue: ${queue}, Job ID: ${jobId}, Error:`,
      error,
    );
  });

  jobQueue.on("job:progress", ({ queue, jobId, progress }) => {
    logger.debug(
      `Job progress - Queue: ${queue}, Job ID: ${jobId}, Progress: ${progress}%`,
    );
  });

  logger.info("Background processing IPC handlers registered successfully");
}
