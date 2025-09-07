require('dotenv').config();

const { LangChainOrchestrator } = require('./src/services/langchain-orchestrator');

async function main() {
  const tests = [
    { feature: 'Chat', type: 'chat', test: { prompt: 'Build a todo app' } },
    { feature: 'Templates', type: 'template', test: 'Find React dashboard template' },
    { feature: 'Deploy', type: 'deploy', test: { environment: 'production', version: '1.0.0' } },
    { feature: 'Contract', type: 'contract', test: { type: 'ERC721', contractName: 'MyNFT' } },
    { feature: 'Debug', type: 'debug', test: { error: 'TS2345', code: 'const x: number = "a";' } },
  ];

  const orchestrator = new LangChainOrchestrator();
  let success = 0;

  for (const { feature, type, test } of tests) {
    try {
      console.log(`\nTesting ${feature}:`, typeof test === 'string' ? test : JSON.stringify(test));
      const result = await orchestrator.processRequest(type, test);
      const ok = !!result;
      console.log(ok ? '✅ OK' : '❌ FAIL');
      if (ok) success++;
    } catch (e) {
      console.log('❌ FAIL', e?.message || String(e));
    }
  }

  const rate = Math.round((success / tests.length) * 100);
  console.log(`\nLangChain Integration Test Success Rate: ${rate}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

