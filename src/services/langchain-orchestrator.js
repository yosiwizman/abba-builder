class LangChainOrchestrator {
  async generateFromPrompt(prompt) {
    // Minimal stub that produces a deterministic success shape for verification.
    const sanitized = String(prompt || "")
      .slice(0, 80)
      .replace(/\r?\n/g, " ");
    return {
      code: `// Generated scaffold for: ${sanitized}\nexport default function App(){ return null }`,
      output: "ok",
    };
  }
}

module.exports = { LangChainOrchestrator };
