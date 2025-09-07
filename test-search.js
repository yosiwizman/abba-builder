const { LangChainOrchestrator } = require('./src/services/langchain-orchestrator');

async function run() {
  const orchestrator = new LangChainOrchestrator();
  await orchestrator.initialize();

  const tests = [
    'Find open source React dashboard templates',
    'Search for best Node.js authentication libraries',
    'Find trending AI projects on GitHub',
    'Look for latest Next.js tutorials',
  ];

  for (const query of tests) {
    console.log(`\nSearching: ${query}`);
    const results = await orchestrator.searchAndUse(query);
    console.log('Results:', JSON.stringify(results, null, 2));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

