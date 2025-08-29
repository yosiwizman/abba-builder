import { getMetricsTracker } from '../src/services/enhanced/metrics-tracker';
import dotenv from 'dotenv';

// Load env (may include model overrides)
dotenv.config();

async function main() {
  const hours = Number(process.env.METRICS_HOURS || 24);
  const tracker = getMetricsTracker();

  // Print summary
  tracker.printSummary(hours);

  // Exit cleanly
  tracker.destroy();
}

main().catch((err) => {
  console.error('Failed to print metrics summary:', err);
  process.exit(1);
});

