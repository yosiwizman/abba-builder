import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import DyadOrchestrator from '../src/services/enhanced/orchestrator';

dotenv.config();

async function main() {
  console.log('🚀 Smoke Integration Suite');
  const orchestrator = new DyadOrchestrator(process.env.ANTHROPIC_API_KEY);

  const cases = [
    { name: 'Weather Widget', prompt: 'Create a weather widget that displays current temperature and conditions', type: 'web' },
    { name: 'Electron Desktop App', prompt: 'Create a simple Electron desktop app with a main window', type: 'desktop' },
    { name: 'Real-time Chat', prompt: 'Create a real-time chat interface with message history', type: 'web' },
  ];

  const outDir = path.join(process.cwd(), 'smoke-results', new Date().toISOString().replace(/:/g, '-'));
  await fs.ensureDir(outDir);

  const results: any[] = [];

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    console.log(`\n🧪 ${i + 1}/${cases.length}: ${tc.name}`);
    try {
      const res = await orchestrator.generateCode({ request: tc.prompt, type: tc.type as any, projectPath: process.cwd() });
      results.push({ name: tc.name, success: res.success, type: res.generationType, model: res.modelUsed, error: res.error });
      console.log(`   Result: ${res.success ? '✅' : '❌'} | Type: ${res.generationType} | Model: ${res.modelUsed || 'n/a'}`);
      if (!res.success && res.error) {
        console.log(`   Error: ${res.error.substring(0, 140)}...`);
      }
      await fs.writeFile(path.join(outDir, `${i + 1}-${tc.name.replace(/\s+/g, '-').toLowerCase()}.txt`), res.code || res.error || 'no output');
    } catch (e: any) {
      console.log(`   ❌ ERROR: ${e?.message || String(e)}`);
      results.push({ name: tc.name, success: false, type: 'error', error: e?.message || String(e) });
    }
  }

  const summary = {
    total: results.length,
    successes: results.filter(r => r.success).length,
    realClaude: results.filter(r => r.type === 'real_claude').length,
    fallbacks: results.filter(r => r.type === 'fallback_template').length,
    errors: results.filter(r => r.type === 'error').length,
  };

  console.log('\n📊 Smoke Summary:', summary);
  await fs.writeJson(path.join(outDir, 'summary.json'), { results, summary }, { spaces: 2 });
}

main().catch((err) => {
  console.error('Smoke run failed:', err);
  process.exit(1);
});

