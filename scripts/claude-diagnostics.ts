import dotenv from 'dotenv';
import { ClaudeOpusService } from '../src/services/enhanced/claude-opus';

dotenv.config();

async function main() {
  console.log('🔬 Claude Diagnostics');
  console.log('====================');

  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    console.warn('⚠️ ANTHROPIC_API_KEY is not set. Real API diagnostics will fail.');
  }

  const service = new ClaudeOpusService({ apiKey });

  // Optional model override via env (comma-separated)
  const modelsEnv = (process.env.DIAG_MODELS || '').trim();
  const modelsToTest = modelsEnv
    ? modelsEnv.split(',').map(s => s.trim()).filter(Boolean)
    : [
        process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        process.env.CLAUDE_FALLBACK_MODEL || 'claude-3-haiku-20240307',
        'claude-3-5-sonnet-latest',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ];

  console.log('\n🧪 Testing model connectivity:');
  for (const model of modelsToTest) {
    try {
      const ok = await service.testModel(model);
      console.log(`   ${ok ? '✅' : '❌'} ${model} ${ok ? 'WORKING' : 'FAILED'}`);
    } catch (e: any) {
      console.log(`   ❌ ${model}: ${e?.message || String(e)}`);
    }
  }

  const noStream = String(process.env.DIAG_NO_STREAM || '').toLowerCase() === 'true';
  if (!noStream) {
    console.log('\n🌊 Streaming smoke test:');
    try {
      const result = await service.generateWithStreaming(
        'Create a simple React component named Hello that renders a greeting.',
        { totalTokens: 5000, files: [] },
      );
      console.log('   Streaming result:', {
        success: result.success,
        generationType: result.generationType,
        duration: result.duration,
        modelUsed: result.modelUsed,
        tokens: result.tokensUsed || result.usage?.total_tokens,
        error: result.error,
      });
    } catch (e: any) {
      console.log('   ❌ Streaming test failed:', e?.message || String(e));
    }
  } else {
    console.log('\n(skipping streaming smoke test due to DIAG_NO_STREAM=true)');
  }
}

main().catch((err) => {
  console.error('Diagnostics failed:', err);
  process.exit(1);
});

