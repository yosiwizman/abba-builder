#!/usr/bin/env tsx
import 'dotenv/config';
import { DyadOrchestrator } from './src/services/enhanced/orchestrator';

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'Create a small React button component with onClick logging.';
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const orch = new DyadOrchestrator(apiKey);
  const result = await orch.generateCode({ request: prompt, type: 'web' });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
