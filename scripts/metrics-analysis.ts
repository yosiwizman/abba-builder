import dotenv from 'dotenv';
import { getMetricsTracker } from '../src/services/enhanced/metrics-tracker';

dotenv.config();

function categorizeError(err?: string) {
  if (!err) return 'Other';
  const e = err.toLowerCase();
  if (e.includes('token')) return 'Token Limit';
  if (e.includes('rate')) return 'Rate Limit';
  if (e.includes('timeout')) return 'Timeout';
  if (e.includes('model')) return 'Model Error';
  if (e.includes('validation')) return 'Validation Error';
  return 'Other';
}

async function main() {
  const hours = Number(process.env.METRICS_HOURS || 24);
  const tracker = getMetricsTracker();
  const analysis = tracker.getDetailedAnalysis(hours);

  console.log('\n📊 GENERATION ANALYSIS (Last ' + hours + 'h)');
  console.log('Real Claude Success Rate:', analysis.realClaudeSuccessRate.toFixed(1) + '%');
  console.log('Fallback Usage Rate:', analysis.fallbackRate.toFixed(1) + '%');
  console.log('Average Duration:', Math.round(analysis.averageDuration) + 'ms');
  console.log('Most Successful Model:', analysis.bestModel || 'n/a');
  console.log('Simple Success:', analysis.simpleSuccessRate.toFixed(1) + '%');
  console.log('Medium Success:', analysis.mediumSuccessRate.toFixed(1) + '%');
  console.log('Complex Success:', analysis.complexSuccessRate.toFixed(1) + '%');

  const failures = analysis.sessions.filter(s => !s.success);
  const buckets: Record<string, any[]> = {};
  for (const f of failures) {
    const t = categorizeError(f.error);
    if (!buckets[t]) buckets[t] = [];
    buckets[t].push(f);
  }

  console.log('\n🔍 FAILURE PATTERN ANALYSIS:');
  for (const [type, arr] of Object.entries(buckets)) {
    console.log(`  ${type}: ${arr.length} failures`);
    const sample = arr.find(x => x.error)?.error;
    if (sample) console.log('    Sample:', String(sample).substring(0, 120) + '...');
  }

  tracker.destroy();
}

main().catch((err) => {
  console.error('Metrics analysis failed:', err);
  process.exit(1);
});

