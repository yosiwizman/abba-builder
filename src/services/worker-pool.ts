import Piscina from "piscina";
import path from "path";
import os from "os";
import log from "electron-log";
import { app } from "electron";

const logger = log.scope("worker-pool");

export interface WorkerTask {
  type: "compile" | "parse" | "analyze" | "transform" | "custom";
  data: any;
}

export interface WorkerResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

/**
 * Enhanced Worker Pool for CPU-intensive tasks
 * Uses Piscina for better performance than native worker_threads
 */
export class WorkerPoolService {
  private pool: Piscina | null = null;
  private isInitialized = false;
  private taskQueue: Map<string, (result: WorkerResult) => void> = new Map();

  constructor(
    private options: {
      minThreads?: number;
      maxThreads?: number;
      idleTimeout?: number;
      maxQueue?: number;
    } = {},
  ) {
    // Set sensible defaults based on CPU cores
    const cpuCount = os.cpus().length;
    this.options = {
      minThreads: options.minThreads || Math.max(2, Math.floor(cpuCount / 2)),
      maxThreads: options.maxThreads || cpuCount,
      idleTimeout: options.idleTimeout || 30000, // 30 seconds
      maxQueue: options.maxQueue || 1000,
      ...options,
    };
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create worker script path - resolve relative to app path
      const appPath = app.getAppPath();
      const workerPath = path.join(
        appPath,
        "src",
        "services",
        "workers",
        "pool-worker.js",
      );

      // Check if worker file exists
      const fs = require("fs");
      if (!fs.existsSync(workerPath)) {
        // Try alternative path for packaged app
        const altPath = path.join(__dirname, "workers", "pool-worker.js");
        if (fs.existsSync(altPath)) {
          logger.info(`Using alternative worker path: ${altPath}`);
        } else {
          logger.warn(
            `Worker file not found at ${workerPath} or ${altPath}, worker pool disabled`,
          );
          // Set initialized to true to prevent repeated initialization attempts
          this.isInitialized = true;
          return;
        }
      }

      this.pool = new Piscina({
        filename: workerPath,
        minThreads: this.options.minThreads,
        maxThreads: this.options.maxThreads,
        idleTimeout: this.options.idleTimeout,
        maxQueue: this.options.maxQueue,
      });

      this.isInitialized = true;
      logger.info(
        `Worker pool initialized with ${this.options.minThreads}-${this.options.maxThreads} threads`,
      );
    } catch (error) {
      logger.error("Failed to initialize worker pool:", error);
      // Mark as initialized to prevent repeated attempts
      this.isInitialized = true;
      // Don't throw - allow app to continue without worker pool
    }
  }

  /**
   * Execute a task in the worker pool
   */
  async execute<T = any>(task: WorkerTask): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If pool is not available (initialization failed), return mock result
    if (!this.pool) {
      logger.warn(
        `Worker pool not available, returning mock result for task: ${task.type}`,
      );
      return {
        success: false,
        error: "Worker pool not initialized",
        data: null,
      } as any;
    }

    const startTime = Date.now();

    try {
      logger.debug(`Executing task: ${task.type}`);
      const result = await this.pool.run(task);

      const duration = Date.now() - startTime;
      logger.debug(`Task ${task.type} completed in ${duration}ms`);

      return result as T;
    } catch (error: any) {
      logger.error(`Task ${task.type} failed:`, error);
      throw error;
    }
  }

  /**
   * Compile TypeScript code in a worker thread
   */
  async compileTypeScript(code: string, options?: any): Promise<WorkerResult> {
    return this.execute({
      type: "compile",
      data: { code, options },
    });
  }

  /**
   * Parse and analyze code structure
   */
  async analyzeCode(code: string, language: string): Promise<WorkerResult> {
    return this.execute({
      type: "analyze",
      data: { code, language },
    });
  }

  /**
   * Transform code (minification, transpilation, etc.)
   */
  async transformCode(
    code: string,
    transformType: "minify" | "beautify" | "transpile",
  ): Promise<WorkerResult> {
    return this.execute({
      type: "transform",
      data: { code, transformType },
    });
  }

  /**
   * Run multiple tasks in parallel
   */
  async executeParallel<T = any>(tasks: WorkerTask[]): Promise<T[]> {
    const promises = tasks.map((task) => this.execute<T>(task));
    return Promise.all(promises);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    if (!this.pool) return null;

    return {
      threads: this.pool.threads.length,
      queueSize: this.pool.queueSize,
      utilization: this.pool.utilization,
      waitTime: this.pool.waitTime,
      runTime: this.pool.runTime,
    };
  }

  /**
   * Destroy the worker pool
   */
  async destroy(): Promise<void> {
    if (this.pool) {
      await this.pool.destroy();
      this.pool = null;
      this.isInitialized = false;
      logger.info("Worker pool destroyed");
    }
  }
}

/**
 * Singleton instance
 */
let globalWorkerPool: WorkerPoolService | null = null;

export function getWorkerPool(): WorkerPoolService {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPoolService();
  }
  return globalWorkerPool;
}

/**
 * Utility functions for common tasks
 */

export async function compileInWorker(code: string): Promise<any> {
  const pool = getWorkerPool();
  return pool.compileTypeScript(code);
}

export async function analyzeInWorker(
  code: string,
  language: string,
): Promise<any> {
  const pool = getWorkerPool();
  return pool.analyzeCode(code, language);
}

export async function batchProcess<T>(
  items: T[],
  processor: (item: T) => WorkerTask,
  batchSize: number = 10,
): Promise<any[]> {
  const pool = getWorkerPool();
  const results: any[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const tasks = batch.map(processor);
    const batchResults = await pool.executeParallel(tasks);
    results.push(...batchResults);
  }

  return results;
}

export default WorkerPoolService;
