const { LangChainOrchestrator } = require('./src/services/langchain-orchestrator');

async function testMultiModel() {
  const orchestrator = new LangChainOrchestrator();
  await orchestrator.initialize();

  console.log('Available models:', Object.keys(orchestrator.models || {}));

  const tests = [
    { task: 'code-generation', prompt: 'Write a React component' },
    { task: 'analysis', prompt: 'Analyze this architecture' },
    { task: 'quick-response', prompt: 'What is 2+2?' },
    { task: 'mobile-build', prompt: 'Build iOS app' }
  ];

  for (const t of tests) {
    const model = orchestrator.selectBestModel(t.task);
    console.log(`Task: ${t.task}, Model: ${model?.modelName || 'none'}`);
    if (model && typeof model.invoke === 'function') {
      try {
        const result = await model.invoke(t.prompt);
        const text = result?.content ? String(result.content) : (result?.text || result?.output || '');
        console.log('Result:', text.substring(0, 100));
      } catch (e) {
        console.log('Invoke failed:', e?.message || String(e));
      }
    }
  }

  const consensus = await orchestrator.multiModelConsensus('Build a chat app');
  console.log('Multi-model consensus:', consensus.substring(0, 120));
}

void testMultiModel().catch((e) => {
  console.error(e);
  process.exit(1);
});

