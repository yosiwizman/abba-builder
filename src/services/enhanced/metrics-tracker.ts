/**
 * Enhanced Metrics Tracking System
 * Tracks and reports generation success rates, distinguishing between real Claude and fallback
 */

import * as fs from 'fs-extra';
import * as path from 'path';

interface GenerationMetric {
  id: string;
  timestamp: number;
  type: 'web' | 'desktop' | 'mobile' | 'extension' | 'general';
  framework?: string;
  complexity: string;
  success: boolean;
  generationType: 'real_claude' | 'fallback_template' | 'error';
  modelUsed?: string;
  duration?: number;
  tokensUsed?: number;
  iterations?: number;
  error?: string;
  retryCount?: number;
}

interface MetricsSummary {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  realClaudeCount: number;
  fallbackCount: number;
  errorCount: number;
  realClaudeSuccessRate: number;
  averageDuration: number;
  averageTokens: number;
  averageIterations: number;
  byType: Record<string, TypeMetrics>;
  byModel: Record<string, ModelMetrics>;
  byComplexity: Record<string, ComplexityMetrics>;
  timeRange: {
    start: number;
    end: number;
  };
}

interface DetailedAnalysis {
  sessions: GenerationMetric[];
  realClaudeSuccessRate: number;
  fallbackRate: number;
  averageDuration: number;
  bestModel?: string;
  simpleSuccessRate: number;
  mediumSuccessRate: number;
  complexSuccessRate: number;
}

interface TypeMetrics {
  total: number;
  successful: number;
  successRate: number;
  realClaudeRate: number;
}

interface ModelMetrics {
  total: number;
  successful: number;
  successRate: number;
  averageDuration: number;
  averageTokens: number;
}

interface ComplexityMetrics {
  total: number;
  successful: number;
  successRate: number;
  realClaudeRate: number;
  averageDuration: number;
}

export class MetricsTracker {
  private metricsFile: string;
  private metrics: GenerationMetric[] = [];
  private currentSessions: Map<string, Partial<GenerationMetric>> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor(metricsDir?: string) {
    const dir = metricsDir || path.join(process.cwd(), '.metrics');
    fs.ensureDirSync(dir);
    this.metricsFile = path.join(dir, 'generation-metrics.json');
    
    // Load existing metrics
    this.loadMetrics();
    
    // Auto-flush every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }
  
  /**
   * Start tracking a new generation
   */
  trackGeneration(info: {
    type?: string;
    framework?: string;
    complexity?: string;
  }): string {
    const id = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSessions.set(id, {
      id,
      timestamp: Date.now(),
      type: (info.type as any) || 'general',
      framework: info.framework,
      complexity: info.complexity || 'medium',
      success: false,
      generationType: 'error'
    });
    
    return id;
  }
  
  /**
   * Complete a generation tracking session
   */
  completeGeneration(
    id: string, 
    success: boolean,
    details?: {
      generationType?: 'real_claude' | 'fallback_template' | 'error';
      modelUsed?: string;
      duration?: number;
      tokensUsed?: number;
      iterations?: number;
      error?: string;
      retryCount?: number;
    }
  ): void {
    const session = this.currentSessions.get(id);
    if (!session) return;
    
    const metric: GenerationMetric = {
      ...session,
      success,
      generationType: details?.generationType || (success ? 'real_claude' : 'error'),
      modelUsed: details?.modelUsed,
      duration: details?.duration || (Date.now() - (session.timestamp || Date.now())),
      tokensUsed: details?.tokensUsed,
      iterations: details?.iterations || 1,
      error: details?.error,
      retryCount: details?.retryCount
    } as GenerationMetric;
    
    this.metrics.push(metric);
    this.currentSessions.delete(id);
    
    // Log immediate feedback
    const emoji = success ? '✅' : '❌';
    const typeLabel = metric.generationType === 'real_claude' ? '🤖 Claude' :
                     metric.generationType === 'fallback_template' ? '📋 Fallback' : '⚠️ Error';
    
    console.log(`${emoji} Generation ${id.substr(0, 12)} completed: ${typeLabel}`);
    
    if (metric.modelUsed) {
      console.log(`   Model: ${metric.modelUsed}`);
    }
    if (metric.duration) {
      console.log(`   Duration: ${(metric.duration / 1000).toFixed(2)}s`);
    }
    if (metric.tokensUsed) {
      console.log(`   Tokens: ${metric.tokensUsed}`);
    }
  }
  
  /**
   * Record an error during generation
   */
  recordError(error: any, request: any): void {
    const metric: GenerationMetric = {
      id: `error-${Date.now()}`,
      timestamp: Date.now(),
      type: request.type || 'general',
      framework: request.framework,
      complexity: 'unknown',
      success: false,
      generationType: 'error',
      error: error.message || String(error)
    };
    
    this.metrics.push(metric);
  }
  
  /**
   * Get success rates broken down by type
   */
  getSuccessRatesByType(): Record<string, TypeMetrics> {
    const byType: Record<string, TypeMetrics> = {};
    
    const types = ['web', 'desktop', 'mobile', 'extension', 'general'];
    
    for (const type of types) {
      const typeMetrics = this.metrics.filter(m => m.type === type);
      if (typeMetrics.length === 0) continue;
      
      const successful = typeMetrics.filter(m => m.success).length;
      const realClaude = typeMetrics.filter(m => m.generationType === 'real_claude').length;
      
      byType[type] = {
        total: typeMetrics.length,
        successful,
        successRate: (successful / typeMetrics.length) * 100,
        realClaudeRate: (realClaude / typeMetrics.length) * 100
      };
    }
    
    return byType;
  }
  
  /**
   * Get comprehensive metrics summary
   */
  getSummary(hoursBack: number = 24): MetricsSummary {
    const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    if (recentMetrics.length === 0) {
      return this.getEmptySummary();
    }
    
    const successful = recentMetrics.filter(m => m.success);
    const realClaude = recentMetrics.filter(m => m.generationType === 'real_claude');
    const fallback = recentMetrics.filter(m => m.generationType === 'fallback_template');
    const errors = recentMetrics.filter(m => m.generationType === 'error');
    
    // Calculate averages
    const durations = recentMetrics.filter(m => m.duration).map(m => m.duration!);
    const tokens = recentMetrics.filter(m => m.tokensUsed).map(m => m.tokensUsed!);
    const iterations = recentMetrics.filter(m => m.iterations).map(m => m.iterations!);
    
    // By type breakdown
    const byType = this.getSuccessRatesByType();
    
    // By model breakdown
    const byModel: Record<string, ModelMetrics> = {};
    const models = Array.from(new Set(recentMetrics.filter(m => m.modelUsed).map(m => m.modelUsed!)));
    
    for (const model of models) {
      const modelMetrics = recentMetrics.filter(m => m.modelUsed === model);
      const modelSuccessful = modelMetrics.filter(m => m.success);
      const modelDurations = modelMetrics.filter(m => m.duration).map(m => m.duration!);
      const modelTokens = modelMetrics.filter(m => m.tokensUsed).map(m => m.tokensUsed!);
      
      byModel[model] = {
        total: modelMetrics.length,
        successful: modelSuccessful.length,
        successRate: (modelSuccessful.length / modelMetrics.length) * 100,
        averageDuration: modelDurations.length > 0 ? 
          modelDurations.reduce((a, b) => a + b, 0) / modelDurations.length : 0,
        averageTokens: modelTokens.length > 0 ?
          modelTokens.reduce((a, b) => a + b, 0) / modelTokens.length : 0
      };
    }
    
    // By complexity breakdown
    const byComplexity: Record<string, ComplexityMetrics> = {};
    const complexities = Array.from(new Set(recentMetrics.map(m => m.complexity)));
    
    for (const complexity of complexities) {
      const complexityMetrics = recentMetrics.filter(m => m.complexity === complexity);
      const complexitySuccessful = complexityMetrics.filter(m => m.success);
      const complexityRealClaude = complexityMetrics.filter(m => m.generationType === 'real_claude');
      const complexityDurations = complexityMetrics.filter(m => m.duration).map(m => m.duration!);
      
      byComplexity[complexity] = {
        total: complexityMetrics.length,
        successful: complexitySuccessful.length,
        successRate: (complexitySuccessful.length / complexityMetrics.length) * 100,
        realClaudeRate: (complexityRealClaude.length / complexityMetrics.length) * 100,
        averageDuration: complexityDurations.length > 0 ?
          complexityDurations.reduce((a, b) => a + b, 0) / complexityDurations.length : 0
      };
    }
    
    return {
      total: recentMetrics.length,
      successful: successful.length,
      failed: recentMetrics.length - successful.length,
      successRate: (successful.length / recentMetrics.length) * 100,
      realClaudeCount: realClaude.length,
      fallbackCount: fallback.length,
      errorCount: errors.length,
      realClaudeSuccessRate: realClaude.length > 0 ?
        (realClaude.filter(m => m.success).length / realClaude.length) * 100 : 0,
      averageDuration: durations.length > 0 ?
        durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      averageTokens: tokens.length > 0 ?
        tokens.reduce((a, b) => a + b, 0) / tokens.length : 0,
      averageIterations: iterations.length > 0 ?
        iterations.reduce((a, b) => a + b, 0) / iterations.length : 0,
      byType,
      byModel,
      byComplexity,
      timeRange: {
        start: Math.min(...recentMetrics.map(m => m.timestamp)),
        end: Math.max(...recentMetrics.map(m => m.timestamp))
      }
    };
  }
  
  /**
   * Get empty summary structure
   */
  private getEmptySummary(): MetricsSummary {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      realClaudeCount: 0,
      fallbackCount: 0,
      errorCount: 0,
      realClaudeSuccessRate: 0,
      averageDuration: 0,
      averageTokens: 0,
      averageIterations: 0,
      byType: {},
      byModel: {},
      byComplexity: {},
      timeRange: {
        start: Date.now(),
        end: Date.now()
      }
    };
  }
  
  /**
   * Detailed analysis object for last N hours
   */
  getDetailedAnalysis(hoursBack: number = 24): DetailedAnalysis {
    const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
    const sessions = this.metrics.filter(m => m.timestamp >= cutoff);
    const total = sessions.length || 1;

    const realSessions = sessions.filter(s => s.generationType === 'real_claude');
    const realSuccess = realSessions.filter(s => s.success);
    const fallback = sessions.filter(s => s.generationType === 'fallback_template');

    // By model success
    const modelStats: Record<string, { total: number; success: number; avgDuration: number } > = {};
    for (const s of realSessions) {
      const model = s.modelUsed || 'unknown';
      if (!modelStats[model]) modelStats[model] = { total: 0, success: 0, avgDuration: 0 };
      modelStats[model].total++;
      if (s.success) modelStats[model].success++;
      if (typeof s.duration === 'number') {
        modelStats[model].avgDuration += s.duration;
      }
    }
    let bestModel: string | undefined = undefined;
    let bestRate = -1;
    for (const [model, st] of Object.entries(modelStats)) {
      const rate = st.total ? (st.success / st.total) : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestModel = model;
      }
    }

    const byC = (c: string) => {
      const arr = sessions.filter(s => s.complexity === c);
      return arr.length ? (arr.filter(s => s.success && s.generationType === 'real_claude').length / arr.length) * 100 : 0;
    };

    return {
      sessions,
      realClaudeSuccessRate: realSessions.length ? (realSuccess.length / realSessions.length) * 100 : 0,
      fallbackRate: (fallback.length / total) * 100,
      averageDuration: sessions.filter(s => typeof s.duration === 'number').reduce((a, s) => a + (s.duration || 0), 0) / Math.max(1, sessions.filter(s => typeof s.duration === 'number').length),
      bestModel,
      simpleSuccessRate: byC('simple'),
      mediumSuccessRate: byC('medium'),
      complexSuccessRate: byC('complex')
    };
  }

  /**
   * Print formatted summary to console
   */
  printSummary(hoursBack: number = 24): void {
    const summary = this.getSummary(hoursBack);
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 GENERATION METRICS SUMMARY (Last ${hoursBack} hours)`);
    console.log('='.repeat(60));
    
    console.log('\n📈 Overall Statistics:');
    console.log(`   Total Generations: ${summary.total}`);
    console.log(`   Success Rate: ${summary.successRate.toFixed(1)}% (${summary.successful}/${summary.total})`);
    console.log(`   Failed: ${summary.failed}`);
    
    console.log('\n🤖 Generation Types:');
    console.log(`   Real Claude: ${summary.realClaudeCount} (${((summary.realClaudeCount / summary.total) * 100).toFixed(1)}%)`);
    console.log(`   Fallback Templates: ${summary.fallbackCount} (${((summary.fallbackCount / summary.total) * 100).toFixed(1)}%)`);
    console.log(`   Errors: ${summary.errorCount} (${((summary.errorCount / summary.total) * 100).toFixed(1)}%)`);
    
    if (summary.realClaudeCount > 0) {
      console.log(`   Claude Success Rate: ${summary.realClaudeSuccessRate.toFixed(1)}%`);
    }
    
    console.log('\n⚡ Performance:');
    console.log(`   Avg Duration: ${(summary.averageDuration / 1000).toFixed(2)}s`);
    console.log(`   Avg Tokens: ${summary.averageTokens.toFixed(0)}`);
    console.log(`   Avg Iterations: ${summary.averageIterations.toFixed(1)}`);
    
    if (Object.keys(summary.byType).length > 0) {
      console.log('\n📦 By Type:');
      for (const [type, metrics] of Object.entries(summary.byType)) {
        console.log(`   ${type}: ${metrics.successRate.toFixed(1)}% success, ${metrics.realClaudeRate.toFixed(1)}% real Claude (${metrics.total} total)`);
      }
    }
    
    if (Object.keys(summary.byModel).length > 0) {
      console.log('\n🎯 By Model:');
      for (const [model, metrics] of Object.entries(summary.byModel)) {
        console.log(`   ${model}: ${metrics.successRate.toFixed(1)}% success, ${(metrics.averageDuration / 1000).toFixed(2)}s avg (${metrics.total} uses)`);
      }
    }
    
    if (Object.keys(summary.byComplexity).length > 0) {
      console.log('\n📐 By Complexity:');
      for (const [complexity, metrics] of Object.entries(summary.byComplexity)) {
        console.log(`   ${complexity}: ${metrics.successRate.toFixed(1)}% success, ${metrics.realClaudeRate.toFixed(1)}% real Claude (${metrics.total} total)`);
      }
    }
    
    const targetRate = 95;
    const isAchieved = summary.successRate >= targetRate;
    const emoji = isAchieved ? '🎉' : '⚠️';
    
    console.log('\n' + '='.repeat(60));
    console.log(`${emoji} Target Success Rate (${targetRate}%): ${isAchieved ? 'ACHIEVED' : 'NOT MET'}`);
    
    if (!isAchieved) {
      const gap = targetRate - summary.successRate;
      console.log(`   Gap to target: ${gap.toFixed(1)}%`);
      
      // Recommendations
      console.log('\n💡 Recommendations:');
      if (summary.fallbackCount > summary.realClaudeCount) {
        console.log('   - Claude API is underutilized - check API key and connection');
      }
      if (summary.realClaudeSuccessRate < 80) {
        console.log('   - Claude generations have low success rate - review prompts and context');
      }
      if (summary.averageIterations > 2) {
        console.log('   - High iteration count - improve initial generation quality');
      }
    }
    
    console.log('='.repeat(60) + '\n');
  }
  
  /**
   * Load metrics from disk
   */
  private loadMetrics(): void {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readJsonSync(this.metricsFile);
        this.metrics = data.metrics || [];
        console.log(`📊 Loaded ${this.metrics.length} historical metrics`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load metrics:', error);
      this.metrics = [];
    }
  }
  
  /**
   * Save metrics to disk
   */
  flush(): void {
    try {
      fs.writeJsonSync(this.metricsFile, {
        metrics: this.metrics,
        lastUpdated: Date.now()
      }, { spaces: 2 });
    } catch (error) {
      console.error('❌ Failed to save metrics:', error);
    }
  }
  
  /**
   * Clean up old metrics
   */
  cleanup(daysToKeep: number = 7): void {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const before = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    const removed = before - this.metrics.length;
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old metrics`);
      this.flush();
    }
  }
  
  /**
   * Export metrics to CSV
   */
  exportToCSV(outputPath: string): void {
    const headers = [
      'ID', 'Timestamp', 'Type', 'Framework', 'Complexity',
      'Success', 'Generation Type', 'Model', 'Duration (ms)',
      'Tokens', 'Iterations', 'Retry Count', 'Error'
    ];
    
    const rows = this.metrics.map(m => [
      m.id,
      new Date(m.timestamp).toISOString(),
      m.type,
      m.framework || '',
      m.complexity,
      m.success ? 'true' : 'false',
      m.generationType,
      m.modelUsed || '',
      m.duration || '',
      m.tokensUsed || '',
      m.iterations || '',
      m.retryCount || '',
      m.error || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    fs.writeFileSync(outputPath, csv);
    console.log(`📄 Exported ${this.metrics.length} metrics to ${outputPath}`);
  }
  
  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Export singleton instance
let instance: MetricsTracker | null = null;

export function getMetricsTracker(): MetricsTracker {
  if (!instance) {
    instance = new MetricsTracker();
  }
  return instance;
}

export default MetricsTracker;




