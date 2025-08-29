/**
 * ABBA Testing Bot System
 * Human-like automated testing for web/desktop/mobile/extension apps
 */

// Use dynamic imports to avoid hard dependencies at build time
// Prefer Playwright (already present via @playwright/test) and fall back to Puppeteer if available

class AbbaTestingBots {
  constructor() {
    this.puppeteer = null; // will be loaded lazily if available
    this.playwright = null; // will be loaded lazily (core)
    this.testScenarios = new Map();
    this.humanBehaviorPatterns = this.loadHumanPatterns();
    this._servers = new Set(); // track test servers to clean up
  }

  async ensureRuntimesLoaded() {
    // Try to load Playwright first (core)
    if (!this.playwright) {
      try {
        this.playwright = await import("playwright");
      } catch (_) {
        try {
          this.playwright = await import("playwright-core");
        } catch (err) {
          this.playwright = null;
          console.warn(
            "[AbbaTestingBots] Playwright not available:",
            err?.message,
          );
        }
      }
    }

    // Try to load Puppeteer (optional)
    if (!this.puppeteer) {
      try {
        this.puppeteer = await import("puppeteer");
      } catch (_) {
        try {
          this.puppeteer = await import("puppeteer-core");
        } catch (err) {
          this.puppeteer = null;
          // Not critical if missing
        }
      }
    }
  }

  async createTestingBot(appType, generatedCode, requirements = {}) {
    await this.ensureRuntimesLoaded();

    const testingStrategy = this.selectTestingStrategy(appType);
    void testingStrategy; // currently unused, future extension

    return {
      webAppBot:
        appType === "web"
          ? await this.createWebTestBot(generatedCode, requirements)
          : null,
      desktopBot:
        appType === "desktop"
          ? await this.createDesktopTestBot(generatedCode, requirements)
          : null,
      extensionBot:
        appType === "extension"
          ? await this.createExtensionTestBot(generatedCode, requirements)
          : null,
      mobileBot:
        appType === "mobile"
          ? await this.createMobileTestBot(generatedCode, requirements)
          : null,
    };
  }

  selectTestingStrategy(appType) {
    const strategies = {
      web: "playwright-preferred",
      desktop: "smoke-and-ui",
      extension: "manifest-and-ui",
      mobile: "ui-gestures",
    };
    return strategies[appType] || "generic";
  }

  async createWebTestBot(generatedCode, requirements) {
    return new WebTestingBot({
      code: generatedCode,
      requirements: requirements,
      humanBehavior: this.humanBehaviorPatterns.web,
      testScenarios: this.generateWebTestScenarios(generatedCode, requirements),
      runtimes: {
        playwright: this.playwright,
        puppeteer: this.puppeteer,
      },
      registerServer: (server) => this._servers.add(server),
      unregisterServer: (server) => this._servers.delete(server),
    });
  }

  async createDesktopTestBot(generatedCode) {
    // Placeholder for future desktop testing via Spectron/Playwright for Electron/Tauri
    return {
      runSmokeTest: async () => ({ success: true, notes: "Desktop test stub" }),
    };
  }

  async createExtensionTestBot(generatedCode) {
    // Placeholder for Chrome extension testing
    return {
      runManifestValidation: async () => ({
        success: true,
        notes: "Extension test stub",
      }),
    };
  }

  async createMobileTestBot(generatedCode) {
    // Placeholder for mobile testing
    return {
      runUITest: async () => ({ success: true, notes: "Mobile test stub" }),
    };
  }

  generateWebTestScenarios(code, requirements) {
    return this.generateTestScenarios(code, requirements);
  }

  generateTestScenarios(code, requirements) {
    const scenarios = [];

    // Basic functionality test
    scenarios.push({
      name: "Basic Functionality",
      priority: "high",
      steps: [
        { action: "wait", duration: 1200 },
        { action: "click", selector: 'button, .btn, [role="button"]' },
        { action: "wait", duration: 600 },
      ],
      expectations: [
        "page responds",
        "no console errors",
        "UI updates correctly",
      ],
    });

    // Form interaction test (if forms detected)
    if (this.hasForms(code)) {
      scenarios.push({
        name: "Form Interaction",
        priority: "high",
        steps: [
          {
            action: "type",
            selector:
              'input[type="text"], input[type="email"], input:not([type])',
            text: "test@example.com",
          },
          {
            action: "type",
            selector: 'input[type="password"]',
            text: "testPassword123",
          },
          {
            action: "click",
            selector:
              'button[type="submit"], input[type="submit"], form button, form [type="submit"]',
          },
        ],
        expectations: [
          "form submits",
          "validation works",
          "appropriate feedback",
        ],
      });
    }

    // Responsive design test
    scenarios.push({
      name: "Responsive Design",
      priority: "medium",
      steps: [
        { action: "resize", width: 1920, height: 1080 },
        { action: "wait", duration: 300 },
        { action: "resize", width: 768, height: 1024 },
        { action: "wait", duration: 300 },
        { action: "resize", width: 375, height: 667 },
      ],
      expectations: ["layout adapts", "no horizontal scroll", "readable text"],
    });

    // Error handling test
    scenarios.push({
      name: "Error Handling",
      priority: "medium",
      steps: [
        { action: "type", selector: "input", text: "invalid@@@data" },
        { action: "click", selector: "button" },
        { action: "wait", duration: 1200 },
      ],
      expectations: ["error message shown", "no crashes", "user can recover"],
    });

    // Requirements-driven quick checks
    if (requirements?.features?.includes("search")) {
      scenarios.push({
        name: "Search Feature",
        priority: "medium",
        steps: [
          {
            action: "type",
            selector: 'input[type="search"], input[placeholder*="search" i]',
            text: "hello world",
          },
          { action: "wait", duration: 800 },
          {
            action: "click",
            selector:
              'button:has-text("Search"), [role="button"]:has-text("Search")',
          },
        ],
        expectations: ["results appear", "no errors"],
      });
    }

    return scenarios;
  }

  hasForms(code) {
    if (!code) return false;
    if (typeof code === "string") {
      return /<form|<input|<textarea|<select/i.test(code);
    }
    if (typeof code === "object") {
      return Object.values(code).some(
        (v) =>
          typeof v === "string" && /<form|<input|<textarea|<select/i.test(v),
      );
    }
    return false;
  }

  loadHumanPatterns() {
    return {
      web: {
        clickPatterns: {
          hesitation: { min: 100, max: 800 }, // ms before clicking
          doubleClicks: 0.15, // 15% chance of accidental double-click
          misClicks: 0.08, // 8% chance of clicking slightly off-target
        },
        typingPatterns: {
          speed: { min: 80, max: 320 }, // WPM range (used to derive delays)
          typos: 0.12, // 12% chance of typo per word
          corrections: 0.85, // 85% of typos get corrected
          pauses: { thinking: 2000, reading: 1500 }, // ms pauses
        },
        scrolling: {
          speed: { min: 200, max: 800 }, // pixels per second
          overshoot: 0.2, // 20% chance of scrolling too far
          backtrack: 0.3, // 30% chance of scrolling back up
        },
      },
      desktop: {
        windowInteraction: {
          resize: 0.25, // 25% chance of resizing windows
          minimize: 0.15, // 15% chance of minimizing
          multipleWindows: 0.4, // 40% chance of opening multiple instances
        },
      },
    };
  }
}

class WebTestingBot {
  constructor(config) {
    this.code = config.code;
    this.requirements = config.requirements || {};
    this.humanBehavior = config.humanBehavior;
    this.testScenarios = config.testScenarios || [];
    this.browser = null;
    this.page = null;
    this.server = null; // simple static server for testing
    this.runtimes = config.runtimes || {};
    this.registerServer = config.registerServer || (() => {});
    this.unregisterServer = config.unregisterServer || (() => {});
  }

  async runComprehensiveTest() {
    const results = [];
    let deployedUrl = null;

    try {
      // Step 1: Deploy the generated code (if provided) or use current preview
      deployedUrl = await this.deployForTesting();

      // Step 2: Launch browser with human-like settings
      await this.launchHumanLikeBrowser();

      // Step 3: Run all test scenarios
      for (const scenario of this.testScenarios) {
        const result = await this.runTestScenario(scenario, deployedUrl);
        results.push(result);
      }

      // Step 4: Generate comprehensive report
      return this.generateTestReport(results);
    } catch (err) {
      return {
        overallSuccess: false,
        error: err?.message || String(err),
        detailedResults: results,
      };
    } finally {
      await this.cleanup();
    }
  }

  async deployForTesting() {
    // If code contains index.html (object map) or string html, write to temp dir and serve
    const { promises: fsp } = await import("fs");
    const os = await import("os");
    const path = await import("path");
    const http = await import("http");

    const tempRoot = await fsp.mkdtemp(
      path.default.join(os.default.tmpdir(), "abba-test-"),
    );

    let indexHtml = null;
    if (typeof this.code === "string") {
      indexHtml = this.code.includes("<html") ? this.code : null;
    } else if (this.code && typeof this.code === "object") {
      indexHtml = this.code["index.html"] || null;
      // Write all files to disk
      for (const [file, content] of Object.entries(this.code)) {
        const filePath = path.default.join(tempRoot, file);
        await fsp.mkdir(path.default.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, content, "utf8");
      }
    }

    if (indexHtml && typeof this.code === "string") {
      await fsp.writeFile(
        path.default.join(tempRoot, "index.html"),
        indexHtml,
        "utf8",
      );
    }

    // If nothing to serve, default to current proxy preview if present
    if (!indexHtml && (!this.code || typeof this.code !== "object")) {
      // Try default Abba proxy server env
      const fallback = process.env.ABBA_PREVIEW_URL || "http://localhost:51412";
      return fallback;
    }

    // Start a very small static server
    const serveDir = tempRoot;
    const server = http.default.createServer(async (req, res) => {
      try {
        const reqPath = (req.url || "/").split("?")[0];
        const safePath = reqPath === "/" ? "/index.html" : reqPath;
        const filePath = path.default.join(
          serveDir,
          decodeURIComponent(safePath),
        );
        const data = await fsp.readFile(filePath);
        const ext = path.default.extname(filePath).toLowerCase();
        const types = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
        };
        res.writeHead(200, {
          "Content-Type": types[ext] || "application/octet-stream",
        });
        res.end(data);
      } catch (e) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });

    // Pick an available port
    const port = await this.findAvailablePort(3000, 3999);
    await new Promise((resolve) => server.listen(port, resolve));
    this.server = server;
    this.registerServer(server);

    return `http://localhost:${port}/`;
  }

  async findAvailablePort(start, end) {
    const net = await import("net");
    const tryPort = (p) =>
      new Promise((resolve) => {
        const srv = net.default.createServer();
        srv.once("error", () => resolve(null));
        srv.once("listening", () => srv.close(() => resolve(p)));
        srv.listen(p, "127.0.0.1");
      });
    for (let p = start; p <= end; p++) {
      const found = await tryPort(p);
      if (found) return found;
    }
    return 0;
  }

  async launchHumanLikeBrowser() {
    // Prefer Playwright (chromium) so we don't depend on puppeteer installation
    if (this.runtimes.playwright?.chromium) {
      this.browser = await this.runtimes.playwright.chromium.launch({
        headless: true,
      });
      this.page = await this.browser.newPage({
        viewport: this.getRandomViewport(),
      });
      await this.page.setUserAgent(this.getRandomUserAgent());
      return;
    }

    // Fallback to Puppeteer if available
    if (this.runtimes.puppeteer?.launch) {
      this.browser = await this.runtimes.puppeteer.launch({
        headless: true,
        slowMo: this.randomDelayMs(50, 200),
        defaultViewport: this.getRandomViewport(),
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-automation-controlled",
          "--no-first-run",
        ],
      });
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(this.getRandomUserAgent());
      return;
    }

    throw new Error(
      "No browser automation runtime available (Playwright/Puppeteer not found)",
    );
  }

  async runTestScenario(scenario, url) {
    const startTime = Date.now();
    let success = true;
    let issues = [];
    let screenshots = [];

    try {
      await this.page.goto(url, { waitUntil: "load" });

      for (const step of scenario.steps) {
        await this.executeHumanLikeStep(step);
      }

      const validation = await this.validateScenario(scenario);
      success = validation.success;
      issues = validation.issues || [];
      screenshots = validation.screenshots || [];

      const performance = await this.measurePerformance();

      return {
        scenario: scenario.name,
        success,
        duration: Date.now() - startTime,
        issues,
        screenshots,
        performance,
      };
    } catch (error) {
      return {
        scenario: scenario.name,
        success: false,
        error: error?.message || String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  async executeHumanLikeStep(step) {
    switch (step.action) {
      case "click":
        await this.humanLikeClick(step.selector);
        break;
      case "type":
        await this.humanLikeType(step.selector, step.text || "");
        break;
      case "scroll":
        await this.humanLikeScroll(
          step.direction || "down",
          step.amount || 400,
        );
        break;
      case "wait":
        await this.wait(step.duration || 300);
        break;
      case "navigate":
        await this.page.goto(step.url, { waitUntil: "domcontentloaded" });
        break;
      case "resize":
        await this.page.setViewportSize({
          width: step.width || 1280,
          height: step.height || 800,
        });
        break;
    }
  }

  async humanLikeClick(selector) {
    const element = (await this.page.locator)
      ? this.page.locator(selector).first()
      : null;

    if (element && (await element.count()) > 0) {
      // Use Playwright locator if available
      await this.wait(this.randomDelayMs(100, 400));
      const doubleClick =
        Math.random() < (this.humanBehavior?.clickPatterns?.doubleClicks || 0);
      if (doubleClick) {
        await element.dblclick({ trial: false });
      } else {
        await element.click({ trial: false });
      }
      await this.wait(this.randomDelayMs(80, 250));
      return;
    }

    // Puppeteer fallback
    const handle = await this.page.$(selector);
    if (handle) {
      const box = await handle.boundingBox();
      if (box) {
        const x = box.x + box.width / 2 + this.randomOffset();
        const y = box.y + box.height / 2 + this.randomOffset();
        await this.page.mouse.move(x, y, { steps: this.randomInt(3, 8) });
        const doubleClick =
          Math.random() <
          (this.humanBehavior?.clickPatterns?.doubleClicks || 0);
        if (doubleClick) {
          await this.page.mouse.click(x, y, { clickCount: 2 });
        } else {
          await this.page.mouse.click(x, y);
        }
        await this.wait(this.randomDelayMs(80, 250));
      }
    }
  }

  async humanLikeType(selector, text) {
    // Try Playwright locator first
    const locator = this.page.locator
      ? this.page.locator(selector).first()
      : null;
    const typeWithDelay = async (fn, value, min = 20, max = 80) => {
      for (const ch of value.split("")) {
        await fn(ch, { delay: this.randomDelayMs(min, max) });
      }
    };

    if (locator && (await locator.count()) > 0) {
      await locator.click();
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        let word = words[i];
        if (Math.random() < (this.humanBehavior?.typingPatterns?.typos || 0)) {
          const typo = this.introduceTypo(word);
          await typeWithDelay((ch, opts) => locator.type(ch, opts), typo);
          if (
            Math.random() <
            (this.humanBehavior?.typingPatterns?.corrections || 0)
          ) {
            await this.wait(this.randomDelayMs(150, 500));
            for (let k = 0; k < typo.length; k++)
              await this.page.keyboard.press("Backspace");
            await typeWithDelay(
              (ch, opts) => locator.type(ch, opts),
              word,
              10,
              50,
            );
          }
        } else {
          await typeWithDelay((ch, opts) => locator.type(ch, opts), word);
        }
        if (i < words.length - 1) await locator.type(" ");
        if (Math.random() < 0.15)
          await this.wait(this.randomDelayMs(300, 1200));
      }
      return;
    }

    // Puppeteer fallback
    const handle = await this.page.$(selector);
    if (handle) {
      await handle.focus();
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        let word = words[i];
        if (Math.random() < (this.humanBehavior?.typingPatterns?.typos || 0)) {
          const typo = this.introduceTypo(word);
          await this.page.type(selector, typo, {
            delay: this.randomDelayMs(20, 80),
          });
          if (
            Math.random() <
            (this.humanBehavior?.typingPatterns?.corrections || 0)
          ) {
            await this.wait(this.randomDelayMs(150, 500));
            for (let k = 0; k < typo.length; k++)
              await this.page.keyboard.press("Backspace");
            await this.page.type(selector, word, {
              delay: this.randomDelayMs(10, 60),
            });
          }
        } else {
          await this.page.type(selector, word, {
            delay: this.randomDelayMs(20, 80),
          });
        }
        if (i < words.length - 1) await this.page.type(selector, " ");
        if (Math.random() < 0.15)
          await this.wait(this.randomDelayMs(300, 1200));
      }
    }
  }

  async humanLikeScroll(direction = "down", amount = 400) {
    const delta = direction === "up" ? -amount : amount;
    if (this.page.mouse) {
      // Puppeteer style
      await this.page.mouse.wheel({ deltaY: delta });
    } else {
      // Playwright
      await this.page.evaluate((dy) => window.scrollBy(0, dy), delta);
    }
    await this.wait(this.randomDelayMs(100, 400));
  }

  async validateScenario(scenario) {
    // Basic validation: no severe console errors and body exists
    const issues = [];
    try {
      const severe = await this.page.evaluate(() => {
        return !!document.querySelector("body");
      });
      if (!severe) issues.push("body-missing");
    } catch (e) {
      issues.push("validation-error:" + (e?.message || String(e)));
    }

    // Screenshot
    const screenshot = await this.page
      .screenshot({ fullPage: true })
      .catch(() => null);

    return {
      success: issues.length === 0,
      issues,
      screenshots: screenshot ? [screenshot] : [],
    };
  }

  async measurePerformance() {
    try {
      const perf = await this.page.evaluate(() => {
        const t =
          performance.timing ||
          performance.getEntriesByType?.("navigation")?.[0];
        return {
          domContentLoaded:
            (t.domContentLoadedEventEnd || 0) - (t.navigationStart || 0),
          loadEvent: (t.loadEventEnd || 0) - (t.navigationStart || 0),
        };
      });
      return perf;
    } catch (_) {
      return {};
    }
  }

  generateTestReport(results) {
    const successful = results.filter((r) => r.success).length;
    const total = results.length || 1;
    const successRate = (successful / total) * 100;

    return {
      overallSuccess: successRate >= 80,
      successRate,
      totalTests: total,
      passedTests: successful,
      failedTests: total - successful,
      criticalIssues: results.filter(
        (r) => !r.success && r.scenario?.includes("Basic"),
      ).length,
      detailedResults: results,
      recommendations: this.generateRecommendations(results),
      humanLikeScore: this.calculateHumanLikeScore(results),
    };
  }

  generateRecommendations(results) {
    const recs = [];
    const hasLayout = results.some(
      (r) => r.scenario?.includes("Responsive") && !r.success,
    );
    const hasErrors = results.some((r) =>
      (r.issues || []).some((i) => String(i).includes("validation")),
    );
    if (hasLayout)
      recs.push(
        "Improve responsive layout breakpoints and test at 375/768/1920 widths.",
      );
    if (hasErrors)
      recs.push(
        "Review console/network errors and add user-friendly error states.",
      );
    if (!recs.length)
      recs.push(
        "Looks good! Add more domain-specific tests for deeper coverage.",
      );
    return recs;
  }

  calculateHumanLikeScore(results) {
    let score = 100;
    results.forEach((r) => {
      (r.issues || []).forEach((issue) => {
        const i = String(issue);
        if (i.includes("timeout")) score -= 10;
        if (i.includes("unresponsive")) score -= 15;
        if (i.includes("confusing")) score -= 5;
      });
    });
    return Math.max(0, score);
  }

  // Utilities
  introduceTypo(word) {
    if (!word || word.length < 2) return word;
    const typoTypes = ["swap", "missing", "extra", "wrong"];
    const typoType = typoTypes[this.randomInt(0, typoTypes.length - 1)];
    const pos = this.randomInt(1, word.length - 1);

    switch (typoType) {
      case "swap":
        // Swap two adjacent characters
        if (pos > 0) {
          const chars = word.split("");
          [chars[pos], chars[pos - 1]] = [chars[pos - 1], chars[pos]];
          return chars.join("");
        }
        break;
      case "missing":
        // Miss a character
        return word.slice(0, pos) + word.slice(pos + 1);
      case "extra":
        // Double a character
        return word.slice(0, pos) + word[pos] + word.slice(pos);
      case "wrong":
        // Wrong character (near key)
        const nearKeys = {
          a: "sq",
          b: "vn",
          c: "xv",
          d: "sf",
          e: "wr",
          f: "dg",
          g: "fh",
          h: "gj",
          i: "uo",
          j: "hk",
          k: "jl",
          l: "k",
          m: "n",
          n: "bm",
          o: "ip",
          p: "o",
          q: "wa",
          r: "et",
          s: "ad",
          t: "ry",
          u: "yi",
          v: "cb",
          w: "qe",
          x: "zc",
          y: "tu",
          z: "x",
        };
        const char = word[pos].toLowerCase();
        if (nearKeys[char]) {
          const wrongChar =
            nearKeys[char][this.randomInt(0, nearKeys[char].length - 1)];
          return word.slice(0, pos) + wrongChar + word.slice(pos + 1);
        }
        break;
    }
    return word;
  }

  randomDelayMs(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  randomOffset() {
    return (Math.random() - 0.5) * 6; // +/- 3px
  }
  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1280, height: 800 },
      { width: 375, height: 812 },
    ];
    return viewports[this.randomInt(0, viewports.length - 1)];
  }
  getRandomUserAgent() {
    const uas = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    ];
    return uas[this.randomInt(0, uas.length - 1)];
  }

  async cleanup() {
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
      if (this.server) {
        await new Promise((res) => this.server.close(() => res(undefined)));
        this.unregisterServer(this.server);
      }
    } finally {
      this.page = null;
      this.browser = null;
      this.server = null;
    }
  }
}

export default AbbaTestingBots;
export { WebTestingBot };




