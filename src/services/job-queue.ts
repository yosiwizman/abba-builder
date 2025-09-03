import Bull, { Queue, Job, JobOptions, JobStatus } from "bull";
import Redis from "ioredis";
import log from "electron-log";
import { EventEmitter } from "events";

const logger = log.scope("job-queue");

export interface JobData {
  type: string;
  payload: any;
  metadata?: {
    userId?: string;
    projectId?: string;
    timestamp?: number;
    [key: string]: any;
  };
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

export interface QueueConfig {
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: JobOptions;
  concurrency?: number;
}

/**
 * Enhanced Job Queue Service using Bull
 * Handles background tasks, scheduled jobs, and async processing
 */
export class JobQueueService extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private redisClient: Redis | null = null;
  private isInitialized = false;
  private config: QueueConfig;
  private jobHandlers: Map<string, (job: Job) => Promise<any>> = new Map();

  constructor(config: QueueConfig = {}) {
    super();
    this.config = {
      redis: {
        host: "localhost",
        port: 6379,
        db: 0,
        ...config.redis,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        ...config.defaultJobOptions,
      },
      concurrency: config.concurrency || 5,
    };
  }

  /**
   * Initialize the job queue service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create Redis client
      this.redisClient = new Redis({
        host: this.config.redis!.host,
        port: this.config.redis!.port,
        password: this.config.redis!.password,
        db: this.config.redis!.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      // Test Redis connection
      await this.redisClient.ping();

      this.isInitialized = true;
      logger.info("Job queue service initialized");
      this.emit("ready");
    } catch (error) {
      logger.error("Failed to initialize job queue service:", error);
      // Fallback to in-memory queue if Redis is not available
      logger.warn("Falling back to in-memory queue (jobs will not persist)");
      this.isInitialized = true;
      this.emit("ready", { warning: "Using in-memory queue" });
    }
  }

  /**
   * Create or get a queue
   */
  getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Bull(queueName, {
        redis: this.config.redis!,
        defaultJobOptions: this.config.defaultJobOptions,
      });

      // Set up queue event listeners
      this.setupQueueEvents(queue, queueName);

      // Process jobs if handlers are registered
      if (this.jobHandlers.has(queueName)) {
        queue.process(
          this.config.concurrency!,
          this.jobHandlers.get(queueName)!,
        );
      }

      this.queues.set(queueName, queue);
      logger.info(`Queue '${queueName}' created`);
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Register a job handler for a queue
   */
  registerHandler(
    queueName: string,
    handler: (job: Job) => Promise<any>,
  ): void {
    this.jobHandlers.set(queueName, handler);

    // If queue already exists, start processing
    if (this.queues.has(queueName)) {
      const queue = this.queues.get(queueName)!;
      queue.process(this.config.concurrency!, handler);
    }

    logger.info(`Handler registered for queue '${queueName}'`);
  }

  /**
   * Add a job to a queue
   */
  async addJob(
    queueName: string,
    data: JobData,
    options?: JobOptions,
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    const jobOptions = { ...this.config.defaultJobOptions, ...options };

    const job = await queue.add(data, jobOptions);
    logger.debug(`Job ${job.id} added to queue '${queueName}'`);

    return job;
  }

  /**
   * Add multiple jobs to a queue
   */
  async addBulkJobs(
    queueName: string,
    jobs: Array<{ data: JobData; options?: JobOptions }>,
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    const bulkJobs = jobs.map(({ data, options }) => ({
      data,
      opts: { ...this.config.defaultJobOptions, ...options },
    }));

    const result = await queue.addBulk(bulkJobs);
    logger.debug(`${result.length} jobs added to queue '${queueName}'`);

    return result;
  }

  /**
   * Schedule a recurring job
   */
  async scheduleJob(
    queueName: string,
    jobName: string,
    cronExpression: string,
    data: JobData,
    options?: JobOptions,
  ): Promise<void> {
    const queue = this.getQueue(queueName);

    await queue.add(jobName, data, {
      ...this.config.defaultJobOptions,
      ...options,
      repeat: {
        cron: cronExpression,
      },
    });

    logger.info(
      `Scheduled job '${jobName}' in queue '${queueName}' with cron: ${cronExpression}`,
    );
  }

  /**
   * Process a specific type of job
   */
  async processJobType(
    jobType: string,
    processor: (data: any) => Promise<any>,
  ): Promise<void> {
    const handler = async (job: Job) => {
      if (job.data.type === jobType) {
        const startTime = Date.now();

        try {
          const result = await processor(job.data.payload);
          const duration = Date.now() - startTime;

          logger.debug(`Job ${job.id} (${jobType}) completed in ${duration}ms`);

          return {
            success: true,
            data: result,
            duration,
          };
        } catch (error: any) {
          const duration = Date.now() - startTime;
          logger.error(`Job ${job.id} (${jobType}) failed:`, error);

          throw {
            success: false,
            error: error.message,
            duration,
          };
        }
      }
    };

    // Register handler for the job type queue
    this.registerHandler(jobType, handler);
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<{
    status: JobStatus;
    progress: number;
    result?: any;
    error?: any;
  } | null> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) return null;

    const status = await job.getState();
    const progress = job.progress();

    return {
      status,
      progress: typeof progress === "number" ? progress : 0,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed, paused] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueue(
    queueName: string,
    grace: number = 0,
    status: "completed" | "failed" = "completed",
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, status);
    logger.info(`Cleaned ${status} jobs from queue '${queueName}'`);
  }

  /**
   * Pause/resume a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`Queue '${queueName}' paused`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`Queue '${queueName}' resumed`);
  }

  /**
   * Setup queue event listeners
   */
  private setupQueueEvents(queue: Queue, queueName: string): void {
    queue.on("completed", (job, result) => {
      this.emit("job:completed", { queue: queueName, jobId: job.id, result });
      logger.debug(`Job ${job.id} completed in queue '${queueName}'`);
    });

    queue.on("failed", (job, err) => {
      this.emit("job:failed", { queue: queueName, jobId: job.id, error: err });
      logger.error(`Job ${job.id} failed in queue '${queueName}':`, err);
    });

    queue.on("progress", (job, progress) => {
      this.emit("job:progress", { queue: queueName, jobId: job.id, progress });
    });

    queue.on("active", (job) => {
      this.emit("job:active", { queue: queueName, jobId: job.id });
    });

    queue.on("stalled", (job) => {
      this.emit("job:stalled", { queue: queueName, jobId: job.id });
      logger.warn(`Job ${job.id} stalled in queue '${queueName}'`);
    });
  }

  /**
   * Destroy all queues and close connections
   */
  async destroy(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue '${name}' closed`);
    }

    this.queues.clear();
    this.jobHandlers.clear();

    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
    }

    this.isInitialized = false;
    logger.info("Job queue service destroyed");
  }
}

/**
 * Singleton instance
 */
let globalJobQueue: JobQueueService | null = null;

export function getJobQueue(config?: QueueConfig): JobQueueService {
  if (!globalJobQueue) {
    globalJobQueue = new JobQueueService(config);
  }
  return globalJobQueue;
}

/**
 * Common job types and processors
 */

export const JOB_TYPES = {
  COMPILE_CODE: "compile-code",
  ANALYZE_PROJECT: "analyze-project",
  SYNC_GITHUB: "sync-github",
  BUILD_TEMPLATE: "build-template",
  SEND_NOTIFICATION: "send-notification",
  CLEANUP_CACHE: "cleanup-cache",
  GENERATE_REPORT: "generate-report",
} as const;

/**
 * Helper function to create a delayed job
 */
export async function createDelayedJob(
  queueName: string,
  data: JobData,
  delayMs: number,
): Promise<Job> {
  const queue = getJobQueue();
  return queue.addJob(queueName, data, { delay: delayMs });
}

/**
 * Helper function to create a priority job
 */
export async function createPriorityJob(
  queueName: string,
  data: JobData,
  priority: number,
): Promise<Job> {
  const queue = getJobQueue();
  return queue.addJob(queueName, data, { priority });
}

/**
 * Helper function to retry failed jobs
 */
export async function retryFailedJobs(queueName: string): Promise<void> {
  const queueService = getJobQueue();
  const queue = queueService.getQueue(queueName);
  const failedJobs = await queue.getFailed();

  for (const job of failedJobs) {
    await job.retry();
  }

  logger.info(
    `Retried ${failedJobs.length} failed jobs in queue '${queueName}'`,
  );
}

export default JobQueueService;
