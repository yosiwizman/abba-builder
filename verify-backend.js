require("dotenv").config();

console.log("🧪 Verifying Backend Success Rate...\n");

// Check for API keys
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

console.log("API Keys:");
console.log(`OpenAI: ${hasOpenAI ? "✅" : "❌"}`);
console.log(`Anthropic: ${hasAnthropic ? "✅" : "❌"}\n`);

if (!hasOpenAI && !hasAnthropic) {
  console.log("❌ No API keys found - cannot test backend");
  process.exit(1);
}

// Test LangChain orchestrator
const {
  LangChainOrchestrator,
} = require("./src/services/langchain-orchestrator");

async function testBackend() {
  const testPrompts = [
    "Build a todo app",
    "Create a dashboard",
    "Make a chat application",
    "Build an e-commerce site",
    "Create a blog platform",
  ];

  let successCount = 0;

  for (const prompt of testPrompts) {
    try {
      console.log(`Testing: "${prompt}"`);
      const orchestrator = new LangChainOrchestrator();
      const result = await orchestrator.generateFromPrompt(prompt);
      if (result && (result.code || result.output)) {
        successCount++;
        console.log("✅ Success\n");
      }
    } catch {
      console.log("❌ Failed\n");
    }
  }

  const rate = (successCount / testPrompts.length) * 100;
  console.log(`\n📊 Backend Success Rate: ${rate}%`);

  if (rate >= 90) {
    console.log("✅ Backend working perfectly!");
  } else {
    console.log("⚠️ Backend needs attention");
  }
}

testBackend();
