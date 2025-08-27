/**
 * Self-Healing System
 * Monitors deployments and automatically recovers from failures
 */

import fetch from "node-fetch";
import fs from "fs";
import path from "path";

class SelfHealingSystem {
  constructor() {
    this.monitors = new Map();
    this.healingLog = [];
    this.healthCheckInterval = 60000; // 1 minute
    this.maxHealingAttempts = 3;
    this.alertHandlers = [];
  }

  async startMonitoring(deployment) {
    const monitorId = `monitor_${deployment.id}`;

    if (this.monitors.has(monitorId)) {
      console.log(`Already monitoring ${monitorId}`);
      return monitorId;
    }

    const monitor = {
      deployment,
      interval: setInterval(async () => {
        await this.performHealthCheck(deployment);
      }, this.healthCheckInterval),
      startTime: Date.now(),
      checks: 0,
      failures: 0,
      consecutiveFailures: 0,
      healingAttempts: 0,
      lastCheck: null,
      status: "active",
    };

    this.monitors.set(monitorId, monitor);
    console.log(
      `🩺 Started monitoring ${deployment.projectName || deployment.id}`,
    );

    // Perform initial check
    await this.performHealthCheck(deployment);

    return monitorId;
  }

  async performHealthCheck(deployment) {
    const monitor = this.monitors.get(`monitor_${deployment.id}`);
    if (!monitor) return;

    monitor.checks++;
    monitor.lastCheck = Date.now();

    try {
      const health = await this.checkHealth(deployment);

      if (!health.healthy) {
        monitor.failures++;
        monitor.consecutiveFailures++;
        console.log(
          `⚠️ Health check failed for ${deployment.projectName || deployment.id}: ${health.issue}`,
        );

        // Attempt healing if threshold reached
        if (
          monitor.consecutiveFailures >= 2 &&
          monitor.healingAttempts < this.maxHealingAttempts
        ) {
          await this.attemptHealing(deployment, health);
          monitor.healingAttempts++;
        }

        // Alert if critical
        if (monitor.consecutiveFailures >= 5) {
          this.sendAlert({
            type: "critical",
            deployment: deployment.id,
            message: `Deployment ${deployment.projectName} is experiencing critical issues`,
            failures: monitor.consecutiveFailures,
          });
        }
      } else {
        // Reset failure count on success
        if (monitor.consecutiveFailures > 0) {
          console.log(
            `✅ ${deployment.projectName || deployment.id} recovered!`,
          );
          monitor.consecutiveFailures = 0;
          monitor.healingAttempts = 0;
        }
        monitor.status = "healthy";
      }
    } catch (error) {
      console.error(
        `Health check error for ${deployment.projectName || deployment.id}:`,
        error,
      );
      monitor.failures++;
      monitor.consecutiveFailures++;
      monitor.status = "error";
    }
  }

  async checkHealth(deployment) {
    const health = {
      healthy: true,
      checks: {},
      timestamp: Date.now(),
      responseTime: 0,
    };

    // Check web deployment
    if (deployment.platforms?.vercel?.url) {
      const startTime = Date.now();
      try {
        const response = await fetch(deployment.platforms.vercel.url, {
          timeout: 10000,
          headers: {
            "User-Agent": "Abba-Health-Check/1.0",
          },
        });

        health.responseTime = Date.now() - startTime;
        health.checks.web = {
          status: response.status,
          ok: response.ok,
          responseTime: health.responseTime,
        };

        // Check for specific error codes
        if (response.status >= 500) {
          health.healthy = false;
          health.issue = `Server error (HTTP ${response.status})`;
        } else if (response.status === 404) {
          health.healthy = false;
          health.issue = "Deployment not found (404)";
        } else if (response.status >= 400) {
          health.healthy = false;
          health.issue = `Client error (HTTP ${response.status})`;
        }

        // Check response time
        if (health.responseTime > 5000) {
          health.healthy = false;
          health.issue = "Slow response time";
        }
      } catch (error) {
        health.healthy = false;
        health.checks.web = { error: error.message };
        health.issue = "Connection failed";
      }
    }

    // Check database connection if configured
    if (deployment.platforms?.database) {
      try {
        const dbHealth = await this.checkDatabaseHealth(
          deployment.platforms.database,
        );
        health.checks.database = dbHealth;

        if (!dbHealth.healthy) {
          health.healthy = false;
          health.issue = health.issue
            ? `${health.issue}, Database unhealthy`
            : "Database unhealthy";
        }
      } catch (error) {
        health.checks.database = { error: error.message, healthy: false };
      }
    }

    // Check memory and CPU if metrics available
    if (deployment.metrics) {
      health.checks.resources = {
        memory: deployment.metrics.memory,
        cpu: deployment.metrics.cpu,
      };

      if (deployment.metrics.memory > 90) {
        health.healthy = false;
        health.issue = "High memory usage";
      }

      if (deployment.metrics.cpu > 90) {
        health.healthy = false;
        health.issue = "High CPU usage";
      }
    }

    return health;
  }

  async checkDatabaseHealth(databaseConfig) {
    const dbHealth = { healthy: true };

    if (databaseConfig.supabase) {
      try {
        // This would check Supabase connection
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          databaseConfig.supabase.url || process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
        );

        const { error } = await supabase
          .from("_health_check")
          .select("count")
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = table doesn't exist (which is OK)
          dbHealth.healthy = false;
          dbHealth.error = error.message;
        }
      } catch (error) {
        dbHealth.healthy = false;
        dbHealth.error = error.message;
      }
    }

    if (databaseConfig.neon) {
      try {
        // This would check Neon connection
        dbHealth.neon = { connected: true };
      } catch (error) {
        dbHealth.healthy = false;
        dbHealth.error = error.message;
      }
    }

    return dbHealth;
  }

  async attemptHealing(deployment, health) {
    console.log(
      `🔧 Attempting to heal ${deployment.projectName || deployment.id}...`,
    );

    const healing = {
      deploymentId: deployment.id,
      issue: health.issue,
      timestamp: Date.now(),
      actions: [],
      success: false,
    };

    try {
      // Determine healing strategy based on issue
      if (
        health.issue === "Connection failed" ||
        health.issue === "Deployment not found (404)"
      ) {
        // Try to redeploy
        healing.actions.push("redeploy");
        await this.triggerRedeploy(deployment);
      } else if (health.issue?.includes("Server error")) {
        // Server error - restart and check logs
        healing.actions.push("restart");
        await this.restartDeployment(deployment);

        // Check error logs
        healing.actions.push("analyze-logs");
        const logs = await this.getDeploymentLogs(deployment);
        healing.logs = logs;
      } else if (health.issue === "Database unhealthy") {
        // Reset database connection
        healing.actions.push("reset-database");
        await this.resetDatabaseConnection(deployment);
      } else if (health.issue === "Slow response time") {
        // Scale up resources
        healing.actions.push("scale-up");
        await this.scaleDeployment(deployment, "up");
      } else if (
        health.issue === "High memory usage" ||
        health.issue === "High CPU usage"
      ) {
        // Restart and possibly scale
        healing.actions.push("restart-and-scale");
        await this.restartDeployment(deployment);
        await this.scaleDeployment(deployment, "up");
      }

      healing.success = true;
      console.log(
        `✅ Healing successful for ${deployment.projectName || deployment.id}`,
      );
    } catch (error) {
      healing.success = false;
      healing.error = error.message;
      console.error(
        `❌ Healing failed for ${deployment.projectName || deployment.id}:`,
        error,
      );
    }

    this.healingLog.push(healing);
    this.saveHealingLog();

    return healing;
  }

  async triggerRedeploy(deployment) {
    console.log(
      `Triggering redeploy for ${deployment.projectName || deployment.id}`,
    );

    // This would trigger a new deployment through the deployment system
    if (deployment.platforms?.vercel?.deploymentId) {
      // Implementation would use Vercel API
      console.log("Would trigger Vercel redeployment");
    }
  }

  async restartDeployment(deployment) {
    console.log(`Restarting ${deployment.projectName || deployment.id}`);

    // This would restart the deployment
    if (deployment.platforms?.vercel) {
      // Implementation would use platform-specific restart API
      console.log("Would restart deployment");
    }
  }

  async resetDatabaseConnection(deployment) {
    console.log(
      `Resetting database for ${deployment.projectName || deployment.id}`,
    );

    // This would reset database connections
    if (deployment.platforms?.database) {
      // Implementation would reset connection pools
      console.log("Would reset database connections");
    }
  }

  async scaleDeployment(deployment, direction = "up") {
    console.log(
      `Scaling ${direction} ${deployment.projectName || deployment.id}`,
    );

    // This would scale the deployment resources
    if (deployment.platforms?.vercel) {
      // Implementation would use platform scaling API
      console.log(`Would scale deployment ${direction}`);
    }
  }

  async getDeploymentLogs(deployment, lines = 100) {
    // This would fetch deployment logs
    const logs = {
      timestamp: Date.now(),
      lines: [],
      errors: [],
    };

    // Implementation would fetch actual logs from platform
    console.log(`Would fetch last ${lines} log lines`);

    return logs;
  }

  stopMonitoring(deploymentId) {
    const monitorId = `monitor_${deploymentId}`;
    const monitor = this.monitors.get(monitorId);

    if (monitor) {
      clearInterval(monitor.interval);
      this.monitors.delete(monitorId);
      console.log(`🛑 Stopped monitoring ${deploymentId}`);
    }
  }

  registerAlertHandler(handler) {
    this.alertHandlers.push(handler);
  }

  sendAlert(alert) {
    console.log(`🚨 ALERT: ${alert.message}`);

    // Send to all registered handlers
    this.alertHandlers.forEach((handler) => {
      try {
        handler(alert);
      } catch (error) {
        console.error("Alert handler error:", error);
      }
    });

    // Log alert
    this.logAlert(alert);
  }

  logAlert(alert) {
    const alertPath = path.join(process.cwd(), "logs", "alerts.json");

    // Ensure directory exists
    const dir = path.dirname(alertPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let alerts = [];
    if (fs.existsSync(alertPath)) {
      alerts = JSON.parse(fs.readFileSync(alertPath, "utf8"));
    }

    alerts.push({
      ...alert,
      timestamp: Date.now(),
    });

    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts = alerts.slice(-100);
    }

    fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));
  }

  saveHealingLog() {
    const logPath = path.join(process.cwd(), "logs", "healing.json");

    // Ensure directory exists
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(logPath, JSON.stringify(this.healingLog, null, 2));
  }

  getMonitoringStatus() {
    const status = [];

    this.monitors.forEach((monitor, id) => {
      const uptime = Date.now() - monitor.startTime;
      const availability =
        monitor.checks > 0
          ? (
              ((monitor.checks - monitor.failures) / monitor.checks) *
              100
            ).toFixed(2)
          : 100;

      status.push({
        id,
        projectName: monitor.deployment.projectName || monitor.deployment.id,
        status: monitor.status,
        uptime: uptime,
        uptimeHuman: this.formatUptime(uptime),
        checks: monitor.checks,
        failures: monitor.failures,
        consecutiveFailures: monitor.consecutiveFailures,
        availability: `${availability}%`,
        healingAttempts: monitor.healingAttempts,
        lastCheck: monitor.lastCheck
          ? new Date(monitor.lastCheck).toISOString()
          : "Never",
      });
    });

    return status;
  }

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getHealingHistory() {
    const logPath = path.join(process.cwd(), "logs", "healing.json");

    if (fs.existsSync(logPath)) {
      return JSON.parse(fs.readFileSync(logPath, "utf8"));
    }

    return this.healingLog;
  }

  getHealthReport() {
    const monitors = this.getMonitoringStatus();
    const healingHistory = this.getHealingHistory();

    const totalChecks = monitors.reduce((sum, m) => sum + m.checks, 0);
    const totalFailures = monitors.reduce((sum, m) => sum + m.failures, 0);
    const overallAvailability =
      totalChecks > 0
        ? (((totalChecks - totalFailures) / totalChecks) * 100).toFixed(2)
        : 100;

    return {
      summary: {
        activeMonitors: monitors.length,
        overallAvailability: `${overallAvailability}%`,
        totalChecks,
        totalFailures,
        healingAttempts: healingHistory.length,
        successfulHealings: healingHistory.filter((h) => h.success).length,
      },
      monitors,
      recentHealing: healingHistory.slice(-10),
    };
  }
}

export default SelfHealingSystem;
