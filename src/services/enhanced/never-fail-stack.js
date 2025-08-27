/**
 * Never-Fail Stack System
 * Guarantees successful builds through multiple strategies
 */

class NeverFailStack {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.strategies = [
      "direct", // Try direct generation first
      "template", // Use proven templates
      "decompose", // Break into smaller parts
      "fallback", // Use simpler alternatives
      "minimal", // Absolutely minimal working version
    ];
    this.maxAttempts = 5;
    this.attemptHistory = [];
  }

  async build(request, options = {}) {
    console.log("🛡️ Never-Fail Stack: Starting guaranteed build process...");

    let lastError = null;
    let bestAttempt = null;
    let attempt = 0;

    for (const strategy of this.strategies) {
      attempt++;
      console.log(`\n📍 Attempt ${attempt}: Using ${strategy} strategy`);

      try {
        const result = await this.executeStrategy(
          strategy,
          request,
          options,
          lastError,
        );

        // Test the result
        if (result && result.code) {
          const testResult = await this.quickTest(result.code, options);

          if (testResult.success) {
            console.log(`✅ Success with ${strategy} strategy!`);

            // Record successful attempt
            this.recordAttempt({
              strategy,
              request,
              success: true,
              attempt,
              testResult,
            });

            return {
              ...result,
              strategy,
              attempts: attempt,
              testResults: testResult,
            };
          } else {
            console.log(
              `⚠️ ${strategy} strategy produced code but tests failed`,
            );
            lastError = testResult.error;

            // Keep best attempt even if tests fail
            if (!bestAttempt || testResult.score > bestAttempt.score) {
              bestAttempt = { ...result, testResult, strategy };
            }
          }
        }
      } catch (error) {
        console.error(`❌ ${strategy} strategy failed:`, error.message);
        lastError = error;

        // Record failed attempt
        this.recordAttempt({
          strategy,
          request,
          success: false,
          attempt,
          error: error.message,
        });
      }

      // Don't try all strategies if we're running low on attempts
      if (attempt >= this.maxAttempts - 1) {
        break;
      }
    }

    // If all strategies fail, return the best attempt or create minimal version
    console.log("⚠️ All strategies exhausted, creating fallback...");

    if (bestAttempt) {
      console.log("Returning best attempt with partial success");
      return {
        ...bestAttempt,
        partial: true,
        attempts: attempt,
      };
    }

    // Ultimate fallback - create absolutely minimal version
    const minimalVersion = await this.createMinimalVersion(request, options);
    return {
      ...minimalVersion,
      strategy: "ultimate-fallback",
      attempts: attempt + 1,
      fallback: true,
    };
  }

  async executeStrategy(strategy, request, options, lastError) {
    switch (strategy) {
      case "direct":
        return await this.directStrategy(request, options);

      case "template":
        return await this.templateStrategy(request, options);

      case "decompose":
        return await this.decomposeStrategy(request, options);

      case "fallback":
        return await this.fallbackStrategy(request, options, lastError);

      case "minimal":
        return await this.minimalStrategy(request, options);

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  async directStrategy(request, options) {
    // Try direct generation with the orchestrator
    console.log("Attempting direct generation...");

    const result = await this.orchestrator.generateCode(request, {
      ...options,
      maxRetries: 1,
      timeout: 30000,
    });

    return result;
  }

  async templateStrategy(request, options) {
    // Use proven templates
    console.log("Searching for matching templates...");

    const templates = await this.findBestTemplates(request, options);

    if (templates.length === 0) {
      throw new Error("No suitable templates found");
    }

    // Use the best template
    const template = templates[0];
    console.log(`Using template: ${template.name}`);

    // Adapt template to requirements
    const adapted = await this.adaptTemplate(template, request, options);

    return {
      code: adapted,
      template: template.name,
      confidence: template.confidence,
    };
  }

  async decomposeStrategy(request, options) {
    // Break the request into smaller, manageable parts
    console.log("Decomposing request into smaller parts...");

    const parts = this.decomposeRequest(request);
    console.log(`Decomposed into ${parts.length} parts`);

    const results = [];

    for (const part of parts) {
      try {
        const partResult = await this.orchestrator.generateCode(part.request, {
          ...options,
          simplified: true,
        });
        results.push({
          ...partResult,
          part: part.name,
        });
      } catch (error) {
        console.error(`Failed to generate ${part.name}:`, error.message);
        // Continue with other parts
      }
    }

    if (results.length === 0) {
      throw new Error("All decomposed parts failed");
    }

    // Combine the parts
    const combined = await this.combineParts(results, request);

    return {
      code: combined,
      parts: results.length,
      decomposed: true,
    };
  }

  async fallbackStrategy(request, options, lastError) {
    // Use simpler alternatives based on what failed
    console.log("Generating simplified fallback version...");

    const simplified = this.simplifyRequest(request, lastError);

    // Try with simplified requirements
    const result = await this.orchestrator.generateCode(simplified, {
      ...options,
      complexity: "simple",
      framework: "vanilla", // Use vanilla JS/HTML
      features: "minimal",
    });

    return {
      ...result,
      simplified: true,
    };
  }

  async minimalStrategy(request, options) {
    // Create absolute minimal working version
    console.log("Creating minimal viable version...");

    const appType = this.detectAppType(request);
    const minimal = this.getMinimalCode(appType, request);

    return {
      code: minimal,
      minimal: true,
      warning:
        "This is a minimal implementation. Many features may be missing.",
    };
  }

  async createMinimalVersion(request, options) {
    console.log("Creating ultimate fallback - minimal working app...");

    const appType = this.detectAppType(request);
    const title = this.extractTitle(request);

    let code = "";

    switch (appType) {
      case "web":
        code = this.getMinimalWebApp(title);
        break;

      case "api":
        code = this.getMinimalAPI();
        break;

      case "desktop":
        code = this.getMinimalDesktopApp(title);
        break;

      default:
        code = this.getMinimalWebApp(title);
    }

    return {
      code,
      type: appType,
      minimal: true,
    };
  }

  async quickTest(code, options) {
    // Perform quick validation tests
    const tests = {
      syntax: false,
      structure: false,
      basic: false,
      score: 0,
    };

    try {
      // Check syntax (basic validation)
      if (this.validateSyntax(code)) {
        tests.syntax = true;
        tests.score += 30;
      }

      // Check structure
      if (this.validateStructure(code, options)) {
        tests.structure = true;
        tests.score += 30;
      }

      // Check if it has basic required elements
      if (this.hasBasicElements(code, options)) {
        tests.basic = true;
        tests.score += 40;
      }

      tests.success = tests.score >= 70;
    } catch (error) {
      tests.error = error.message;
      tests.success = false;
    }

    return tests;
  }

  validateSyntax(code) {
    // Basic syntax validation
    try {
      // Check for basic syntax errors
      const hasOpeningTags = (code.match(/</g) || []).length;
      const hasClosingTags = (code.match(/>/g) || []).length;
      const hasOpenBraces = (code.match(/{/g) || []).length;
      const hasCloseBraces = (code.match(/}/g) || []).length;

      // Basic balance check
      if (Math.abs(hasOpeningTags - hasClosingTags) > 2) return false;
      if (Math.abs(hasOpenBraces - hasCloseBraces) > 2) return false;

      // Check for common syntax patterns
      if (
        code.includes("function") ||
        code.includes("=>") ||
        code.includes("<html") ||
        code.includes("class")
      ) {
        return true;
      }

      return code.length > 50; // Has some content
    } catch {
      return false;
    }
  }

  validateStructure(code, options) {
    // Check if code has expected structure
    const type = options.type || this.detectCodeType(code);

    switch (type) {
      case "html":
      case "web":
        return code.includes("<html") || code.includes("<!DOCTYPE");

      case "react":
        return code.includes("React") || code.includes("jsx");

      case "vue":
        return code.includes("Vue") || code.includes("<template>");

      case "node":
      case "api":
        return code.includes("express") || code.includes("http");

      default:
        return true; // Pass if we can't determine
    }
  }

  hasBasicElements(code, options) {
    // Check for basic required elements
    const requirements = options.requirements || "";
    const hasContent = code.length > 100;
    const hasFunction = code.includes("function") || code.includes("=>");
    const hasStructure = code.includes("<") || code.includes("{");

    return hasContent && (hasFunction || hasStructure);
  }

  detectCodeType(code) {
    if (code.includes("<!DOCTYPE") || code.includes("<html")) return "html";
    if (code.includes("React")) return "react";
    if (code.includes("Vue")) return "vue";
    if (code.includes("express")) return "node";
    if (code.includes("angular")) return "angular";
    return "unknown";
  }

  findBestTemplates(request, options) {
    // This would connect to a template database
    // For now, return mock templates
    const templates = [
      {
        name: "basic-web-app",
        confidence: 0.8,
        code: this.getBasicWebTemplate(),
      },
      {
        name: "simple-react-app",
        confidence: 0.7,
        code: this.getReactTemplate(),
      },
    ];

    // Filter templates based on requirements
    const filtered = templates.filter((t) => {
      // Add filtering logic based on request
      return true;
    });

    return filtered;
  }

  async adaptTemplate(template, request, options) {
    // Adapt template to specific requirements
    let code = template.code;

    // Replace placeholders
    const title = this.extractTitle(request);
    code = code.replace(/{{TITLE}}/g, title);
    code = code.replace(/{{DESCRIPTION}}/g, request.substring(0, 100));

    // Add requested features
    const features = this.extractFeatures(request);
    for (const feature of features) {
      code = this.addFeatureToTemplate(code, feature);
    }

    return code;
  }

  decomposeRequest(request) {
    // Break request into logical parts
    const parts = [];

    // Identify main components
    if (
      request.toLowerCase().includes("frontend") ||
      request.toLowerCase().includes("ui")
    ) {
      parts.push({
        name: "frontend",
        request: "Create a basic frontend interface",
      });
    }

    if (
      request.toLowerCase().includes("backend") ||
      request.toLowerCase().includes("api")
    ) {
      parts.push({
        name: "backend",
        request: "Create a simple API backend",
      });
    }

    if (request.toLowerCase().includes("database")) {
      parts.push({
        name: "database",
        request: "Create database schema",
      });
    }

    // If no specific parts identified, create generic parts
    if (parts.length === 0) {
      parts.push({
        name: "main",
        request: `Create main functionality for: ${request.substring(0, 50)}`,
      });

      parts.push({
        name: "ui",
        request: "Create basic user interface",
      });
    }

    return parts;
  }

  async combineParts(parts, originalRequest) {
    // Intelligently combine generated parts
    let combined = "";

    // Check what type of parts we have
    const hasFrontend = parts.some((p) => p.part === "frontend");
    const hasBackend = parts.some((p) => p.part === "backend");

    if (hasFrontend && hasBackend) {
      // Full-stack app
      combined = this.combineFullStack(parts);
    } else if (hasFrontend) {
      // Frontend only
      combined = parts.find((p) => p.part === "frontend").code;
    } else if (hasBackend) {
      // Backend only
      combined = parts.find((p) => p.part === "backend").code;
    } else {
      // Concatenate all parts with comments
      combined = parts
        .map((p) => `// --- ${p.part} ---\n${p.code}\n`)
        .join("\n\n");
    }

    return combined;
  }

  combineFullStack(parts) {
    const frontend = parts.find((p) => p.part === "frontend");
    const backend = parts.find((p) => p.part === "backend");

    // Create a combined full-stack structure
    return `
// Full-Stack Application

// --- BACKEND ---
${backend ? backend.code : "// Backend code here"}

// --- FRONTEND ---
${frontend ? frontend.code : "// Frontend code here"}

// --- INTEGRATION ---
// Connect frontend to backend using fetch/axios
`;
  }

  simplifyRequest(request, lastError) {
    // Simplify based on what failed
    let simplified = request;

    if (lastError) {
      // Remove complex features that might have caused issues
      const complexFeatures = [
        "real-time",
        "websocket",
        "authentication",
        "payment",
        "complex",
        "advanced",
        "sophisticated",
        "enterprise",
      ];

      complexFeatures.forEach((feature) => {
        simplified = simplified.replace(new RegExp(feature, "gi"), "");
      });
    }

    // Add simplification instructions
    simplified = `Create a simple, basic version of: ${simplified}. 
                  Focus on core functionality only. 
                  Use simple HTML/CSS/JavaScript if possible.`;

    return simplified;
  }

  detectAppType(request) {
    const lower = request.toLowerCase();

    if (lower.includes("api") || lower.includes("backend")) return "api";
    if (lower.includes("desktop") || lower.includes("electron"))
      return "desktop";
    if (lower.includes("mobile") || lower.includes("app")) return "mobile";
    if (lower.includes("cli") || lower.includes("command")) return "cli";

    return "web"; // Default to web
  }

  extractTitle(request) {
    // Try to extract a title from the request
    const match = request.match(/["']([^"']+)["']/);
    if (match) return match[1];

    // Use first few words
    const words = request.split(" ").slice(0, 3).join(" ");
    return words.substring(0, 30);
  }

  extractFeatures(request) {
    const features = [];
    const featureKeywords = {
      form: ["form", "input", "submit"],
      auth: ["login", "auth", "user"],
      database: ["database", "data", "store"],
      api: ["api", "endpoint", "rest"],
    };

    const lower = request.toLowerCase();

    Object.entries(featureKeywords).forEach(([feature, keywords]) => {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        features.push(feature);
      }
    });

    return features;
  }

  addFeatureToTemplate(code, feature) {
    // Add feature-specific code to template
    const featureCode = {
      form: `
        <form id="mainForm">
          <input type="text" placeholder="Enter text" required>
          <button type="submit">Submit</button>
        </form>`,

      auth: `
        <div id="auth">
          <input type="email" placeholder="Email" id="email">
          <input type="password" placeholder="Password" id="password">
          <button onclick="login()">Login</button>
        </div>`,

      api: `
        // API endpoint
        app.get('/api/data', (req, res) => {
          res.json({ message: 'API endpoint working' });
        });`,
    };

    if (featureCode[feature]) {
      // Find appropriate place to insert
      if (code.includes("</body>")) {
        code = code.replace("</body>", `${featureCode[feature]}\n</body>`);
      } else {
        code += `\n${featureCode[feature]}`;
      }
    }

    return code;
  }

  getMinimalCode(appType, request) {
    const title = this.extractTitle(request);

    switch (appType) {
      case "web":
        return this.getMinimalWebApp(title);
      case "api":
        return this.getMinimalAPI();
      case "desktop":
        return this.getMinimalDesktopApp(title);
      default:
        return this.getMinimalWebApp(title);
    }
  }

  getMinimalWebApp(title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || "App"}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }
        h1 { color: #fff; }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover { background: #45a049; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title || "Welcome"}</h1>
        <p>This is a minimal working version of your app.</p>
        <button onclick="alert('App is working!')">Test Button</button>
        
        <div id="content">
            <!-- App content goes here -->
        </div>
    </div>
    
    <script>
        console.log('App initialized');
        // Add your JavaScript here
    </script>
</body>
</html>`;
  }

  getMinimalAPI() {
    return `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'API is working',
        version: '1.0.0'
    });
});

// Example endpoint
app.get('/api/data', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

app.post('/api/data', (req, res) => {
    const { data } = req.body;
    res.json({
        success: true,
        message: 'Data received',
        received: data
    });
});

app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});`;
  }

  getMinimalDesktopApp(title) {
    return `const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});`;
  }

  getBasicWebTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        /* Add your styles here */
        body { font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <h1>{{TITLE}}</h1>
    <div id="app">
        <!-- Content here -->
    </div>
    <script>
        // Add your JavaScript here
    </script>
</body>
</html>`;
  }

  getReactTemplate() {
    return `import React, { useState } from 'react';

function App() {
    const [data, setData] = useState(null);
    
    return (
        <div className="App">
            <h1>{{TITLE}}</h1>
            <p>{{DESCRIPTION}}</p>
            {/* Add your components here */}
        </div>
    );
}

export default App;`;
  }

  recordAttempt(attempt) {
    this.attemptHistory.push({
      ...attempt,
      timestamp: Date.now(),
    });

    // Keep only last 100 attempts
    if (this.attemptHistory.length > 100) {
      this.attemptHistory = this.attemptHistory.slice(-100);
    }
  }

  getStatistics() {
    const total = this.attemptHistory.length;
    const successful = this.attemptHistory.filter((a) => a.success).length;

    const strategyStats = {};
    this.strategies.forEach((strategy) => {
      const attempts = this.attemptHistory.filter(
        (a) => a.strategy === strategy,
      );
      strategyStats[strategy] = {
        total: attempts.length,
        successful: attempts.filter((a) => a.success).length,
        successRate:
          attempts.length > 0
            ? (
                (attempts.filter((a) => a.success).length / attempts.length) *
                100
              ).toFixed(1) + "%"
            : "N/A",
      };
    });

    return {
      totalAttempts: total,
      successfulAttempts: successful,
      overallSuccessRate:
        total > 0 ? ((successful / total) * 100).toFixed(1) + "%" : "N/A",
      strategyStats,
    };
  }
}

export default NeverFailStack;
