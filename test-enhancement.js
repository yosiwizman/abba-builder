const { LangChainOrchestrator } = require('./src/services/langchain-orchestrator');

async function run() {
  const orchestrator = new LangChainOrchestrator();
  await orchestrator.initialize();

  const tests = [
    'make todo app',
    'add login',
    'deploy',
    'make it fast',
    'add payment stripe',
    'fix bugs',
    'create dashboard with charts',
  ];

  for (const t of tests) {
    const enhanced = await orchestrator.enhancePrompt(t);
    console.log(`\nOriginal: ${t}`);
    console.log(`Enhanced: ${enhanced}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

