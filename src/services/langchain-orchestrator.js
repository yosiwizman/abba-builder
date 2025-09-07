class LangChainOrchestrator {
  constructor() {
    this.available = false;
    this.models = {};
    this.searchTools = [];
    this.settingsCache = null;
  }

  async initialize() {
    try {
      const settings = await this.getSettings();
      this.settingsCache = settings;
      this.models = {};

      // OpenAI models
      if (settings.OPENAI_API_KEY) {
        try {
          const { ChatOpenAI } = require('@langchain/openai');
          this.models.gpt4 = new ChatOpenAI({
            modelName: 'gpt-4-turbo-preview',
            openAIApiKey: settings.OPENAI_API_KEY,
          });
          this.models.gpt35 = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            openAIApiKey: settings.OPENAI_API_KEY,
          });
        } catch {}
      }

      // Anthropic models
      if (settings.ANTHROPIC_API_KEY) {
        try {
          const { ChatAnthropic } = require('@langchain/anthropic');
          this.models.claude = new ChatAnthropic({
            modelName: 'claude-3-opus-20240229',
            anthropicApiKey: settings.ANTHROPIC_API_KEY,
          });
          this.models.claudeHaiku = new ChatAnthropic({
            modelName: 'claude-3-haiku-20240307',
            anthropicApiKey: settings.ANTHROPIC_API_KEY,
          });
        } catch {}
      }

      // Google Gemini
      if (settings.GOOGLE_API_KEY) {
        try {
          const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
          this.models.gemini = new ChatGoogleGenerativeAI({
            modelName: 'gemini-pro',
            apiKey: settings.GOOGLE_API_KEY,
          });
        } catch {}
      }

      // Local Ollama
      if (settings.OLLAMA_HOST) {
        try {
          const { ChatOllama } = require('@langchain/community/chat_models/ollama');
          this.models.llama = new ChatOllama({
            baseUrl: settings.OLLAMA_HOST,
            model: 'llama2',
          });
        } catch {}
      }

      // Initialize search tools (SerpAPI, scrapers, etc.)
      await this.initializeSearchTools();

      this.available = Object.keys(this.models).length > 0;
      return this.available;
    } catch (e) {
      this.available = false;
      return false;
    }
  }

  // Resolve user-preferred model mapping to instantiated model
  resolvePreferredModel(pref) {
    if (!pref) return null;
    const key = `${pref.provider}:${pref.name}`.toLowerCase();
    if (key.startsWith('openai:gpt-4')) return this.models.gpt4 || null;
    if (key.startsWith('openai:gpt-3.5')) return this.models.gpt35 || null;
    if (key.startsWith('anthropic:claude-3-opus')) return this.models.claude || null;
    if (key.startsWith('anthropic:claude-3-haiku')) return this.models.claudeHaiku || null;
    if (key.startsWith('google:gemini')) return this.models.gemini || null;
    if (key.startsWith('ollama:')) return this.models.llama || null;
    // fallback: try any available
    return Object.values(this.models)[0] || null;
  }

  selectBestModel(task) {
    const t = task || 'quick-response';
    // Check user preferences first
    const prefs = this.settingsCache?.preferredModelsByTask;
    if (prefs) {
      if (t === 'code-generation' && prefs.code) {
        const m = this.resolvePreferredModel(prefs.code);
        if (m) return m;
      }
      if (t === 'analysis' && prefs.analysis) {
        const m = this.resolvePreferredModel(prefs.analysis);
        if (m) return m;
      }
      if (t === 'quick-response' && prefs.quick) {
        const m = this.resolvePreferredModel(prefs.quick);
        if (m) return m;
      }
    }

    const modelSelection = {
      'code-generation': this.models.gpt4 || this.models.claude || this.models.gpt35,
      'analysis': this.models.claude || this.models.gpt4 || this.models.gemini,
      'quick-response': this.models.gpt35 || this.models.claudeHaiku || this.models.gemini,
      'mobile-build': this.models.gpt4 || this.models.claude || this.models.gemini,
      'testing': this.models.claude || this.models.gemini || this.models.gpt35,
      'local-fast': this.models.llama || this.models.gpt35 || this.models.claudeHaiku,
    };
    return modelSelection[t] || this.models.gpt35 || Object.values(this.models)[0];
  }

  async multiModelConsensus(prompt) {
    const models = Object.values(this.models).filter(Boolean).slice(0, 3);
    if (!models.length) return '';
    const results = await Promise.all(
      models.map((m) =>
        m && typeof m.invoke === 'function' ? m.invoke(prompt).catch(() => null) : Promise.resolve(null),
      ),
    );
    return this.combineResults(results);
  }

  combineResults(results) {
    const texts = (results || [])
      .map((r) => (r?.content ? String(r.content) : r?.text || r?.output || ''))
      .filter(Boolean);
    return texts[0] || '';
  }

  async initializeSearchTools() {
    try {
      const tools = [];
      const settings = this.settingsCache || (await this.getSettings());
      // SerpAPI via LangChain community
      try {
        if (process.env.SERPAPI_API_KEY || settings.SERPAPI_API_KEY) {
          const { SerpAPI } = require('@langchain/community/tools/serpapi');
          tools.push(
            new SerpAPI(process.env.SERPAPI_API_KEY || settings.SERPAPI_API_KEY, {
              location: 'United States',
              hl: 'en',
              gl: 'us',
            }),
          );
        }
      } catch {}

      // Web scraper using axios + cheerio
      tools.push({
        name: 'web_scraper',
        description: 'Scrape content from any URL',
        func: async (url) => {
          try {
            const axios = require('axios');
            const cheerio = require('cheerio');
            const response = await axios.get(url, { timeout: 15000 });
            const $ = cheerio.load(response.data);
            return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
          } catch (e) {
            return '';
          }
        },
      });

      // GitHub search tool
      tools.push({
        name: 'github_search',
        description: 'Search GitHub for open source projects',
        func: async (query) => {
          try {
            const axios = require('axios');
            const token = process.env.GITHUB_TOKEN || settings.GITHUB_TOKEN;
            const res = await axios.get(
              `https://api.github.com/search/repositories`,
              {
                params: { q: query, sort: 'stars', order: 'desc' },
                headers: token ? { Authorization: `token ${token}` } : undefined,
                timeout: 15000,
              },
            );
            return (res.data.items || []).slice(0, 5).map((repo) => ({
              name: repo.full_name,
              url: repo.html_url,
              stars: repo.stargazers_count,
              description: repo.description,
            }));
          } catch {
            return [];
          }
        },
      });

      // NPM search tool
      tools.push({
        name: 'npm_search',
        description: 'Search NPM for packages',
        func: async (query) => {
          try {
            const axios = require('axios');
            const res = await axios.get(
              `https://registry.npmjs.org/-/v1/search`,
              { params: { text: query, size: 5 }, timeout: 15000 },
            );
            return (res.data.objects || []).map((obj) => ({
              name: obj.package.name,
              version: obj.package.version,
              description: obj.package.description,
            }));
          } catch {
            return [];
          }
        },
      });

      // Stack Overflow search
      tools.push({
        name: 'stackoverflow_search',
        description: 'Search Stack Overflow for solutions',
        func: async (query) => {
          try {
            const axios = require('axios');
            const res = await axios.get(
              `https://api.stackexchange.com/2.3/search`,
              { params: { order: 'desc', sort: 'votes', intitle: query, site: 'stackoverflow' }, timeout: 15000 },
            );
            return (res.data.items || []).slice(0, 3);
          } catch {
            return [];
          }
        },
      });

      this.searchTools = tools;
    } catch {
      this.searchTools = [];
    }
  }

  async searchGitHub(query) {
    const tool = (this.searchTools || []).find((t) => t.name === 'github_search');
    return tool ? tool.func(query) : [];
  }

  async searchNPM(query) {
    const tool = (this.searchTools || []).find((t) => t.name === 'npm_search');
    return tool ? tool.func(query) : [];
  }

  async searchWeb(query) {
    // Prefer SerpAPI if available
    const serp = (this.searchTools || []).find((t) => t.constructor && t.constructor.name === 'SerpAPI');
    try {
      if (serp && typeof serp.call === 'function') {
        return await serp.call(query);
      }
    } catch {}
    return null;
  }

  shouldSearch(prompt) {
    const searchKeywords = [
      'find', 'search', 'look for', 'open source', 'github',
      'npm', 'package', 'library', 'framework', 'latest',
      'trending', 'popular', 'best', 'documentation'
    ];
    const p = String(prompt || '').toLowerCase();
    return searchKeywords.some((k) => p.includes(k));
  }

  async extractSearchQuery(prompt) {
    // Simple passthrough for now; could be improved with an LLM
    return String(prompt || '');
  }

  async processSearchResults(results, context) {
    try {
      const flattened = {
        github: results[0] || [],
        npm: results[1] || [],
        web: results[2] || null,
      };
      return flattened;
    } catch {
      return {};
    }
  }

  async searchAndUse(prompt, context) {
    const query = await this.extractSearchQuery(prompt);
    const results = await Promise.all([
      this.searchGitHub(query),
      this.searchNPM(query),
      this.searchWeb(query),
    ]);
    return this.processSearchResults(results, context);
  }

  // Prompt enhancement utilities
  getEnhancementPatterns() {
    return {
      'make app': 'Create a full-stack web application with modern UI, responsive design, and proper error handling',
      'add login': 'Implement secure authentication with JWT tokens, password hashing, session management, and remember me functionality',
      'make it faster': 'Optimize performance by implementing caching, lazy loading, code splitting, and database query optimization',
      'add payment': 'Integrate Stripe payment processing with subscription handling, webhooks, invoice generation, and PCI compliance',
      'deploy': 'Deploy to production with CI/CD pipeline, environment variables, SSL certificates, and monitoring',
      'fix': 'Debug and fix all errors, add proper error handling, improve code quality, and add logging',
      'test': 'Create comprehensive test suite with unit tests, integration tests, and E2E tests with >80% coverage',
    };
  }

  expandPrompt(input) {
    const expansions = {
      crud: 'Create, Read, Update, Delete operations with validation and error handling',
      api: 'RESTful API with proper status codes, error responses, and documentation',
      ui: 'user interface with modern design, responsive layout, and accessibility features',
      db: 'database with proper schema, indexes, and migrations',
      auth: 'authentication and authorization with role-based access control',
      secure: 'with security best practices including input validation, XSS protection, and CSRF tokens',
      fast: 'with performance optimization, caching, and lazy loading',
      scalable: 'with horizontal scaling capability, microservices architecture, and load balancing',
      modern: 'using latest stable versions and current best practices',
    };
    let enhanced = String(input || '');
    for (const [short, long] of Object.entries(expansions)) {
      enhanced = enhanced.replace(new RegExp(short, 'gi'), long);
    }
    return enhanced;
  }

  needsEnhancement(prompt) {
    const text = String(prompt || '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasDetails = /with|using|include|implement|create|build/i.test(text);
    const hasTechnical = /api|database|ui|auth|deploy/i.test(text);
    return wordCount < 10 || !hasDetails || !hasTechnical;
  }

  async enhancePrompt(userInput) {
    const base = String(userInput || '');
    // Apply patterns
    let prompt = base;
    const patterns = this.getEnhancementPatterns();
    for (const [simple, detailed] of Object.entries(patterns)) {
      if (prompt.toLowerCase().includes(simple)) {
        prompt = prompt.replace(new RegExp(simple, 'gi'), detailed);
      }
    }
    // Expand terms
    prompt = this.expandPrompt(prompt);

    // Use quick model to rewrite into a professional prompt if available
    try {
      const model = this.selectBestModel('quick-response');
      if (model && typeof model.invoke === 'function') {
        const template = `You are a prompt engineer. Transform the user's simple request into a detailed, professional prompt with clear requirements, output format, and quality criteria.\n\nOriginal: "${prompt}"\n\nEnhanced prompt:`;
        const enhanced = await model.invoke(template);
        const content = enhanced?.content || enhanced?.text || String(enhanced || '');
        return content || prompt;
      }
    } catch {}

    return prompt;
  }

  async regularGeneration(prompt, options = {}) {
    await this.initialize(); // ensure models/tools are ready
    const useConsensus = !!this.settingsCache?.useMultiModelConsensus;
    if (useConsensus) {
      const text = await this.multiModelConsensus(prompt);
      return { text, output: text };
    }
    const model = this.selectBestModel(options.task || 'quick-response');
    if (model && typeof model.invoke === 'function') {
      try {
        const res = await model.invoke(prompt);
        const text = res?.content || res?.text || String(res || '');
        return { text, output: text };
      } catch {}
    }
    // Fallback stub
    const sanitized = String(prompt || '').slice(0, 200).replace(/\r?\n/g, ' ');
    return {
      code: `// Generated scaffold for: ${sanitized}\nexport default function App(){ return null }`,
      output: 'ok',
      text: `Generated output for: ${sanitized}`,
    };
  }

  // Main entry point
  async processRequest(type, data) {
    switch (type) {
      case 'chat':
        return this.generateFromPrompt(data?.prompt || data);
      case 'template':
        return this.findBestTemplate(data);
      case 'deploy':
        return this.createDeploymentPlan(data);
      case 'contract':
        return this.generateSmartContract(data);
      case 'debug':
        return this.debugCode(data);
      case 'optimize':
        return this.optimizeCode(data);
      default:
        return this.generateFromPrompt(data);
    }
  }

  async generateFromPrompt(originalPrompt, options = {}) {
    await this.initialize();
    let prompt = String(originalPrompt || '');

    // Decide if search is warranted
    if (this.shouldSearch(prompt)) {
      const searchResults = await this.searchAndUse(prompt, options.context);
      const enhancedWithSearch = `User request: ${prompt}\n\nFound relevant information:\n${JSON.stringify(searchResults, null, 2)}\n\nUse this information to provide the best response.`;
      prompt = enhancedWithSearch;
    }

    // Auto-enhance if enabled
    const autoEnhance = this.settingsCache?.autoEnhancePrompts !== false; // default true
    if (autoEnhance && this.needsEnhancement(prompt)) {
      prompt = await this.enhancePrompt(prompt);
    }

    return this.regularGeneration(prompt, options);
  }

  async findBestTemplate(prompt) {
    // Simulate intelligent match
    return {
      query: prompt,
      match: {
        id: 'react-dashboard-pro',
        name: 'React Dashboard Pro',
        score: 0.92,
        reason: 'Matches keywords: react, dashboard, admin',
      },
      alternatives: [
        { id: 'react-dashboard-lite', score: 0.86 },
        { id: 'nextjs-dashboard', score: 0.81 },
      ],
    };
  }

  async analyzeCodePattern(code) {
    // Simulate pattern analysis
    return {
      smells: ['long-function', 'duplicate-code'],
      suggestions: [
        'Refactor long function into smaller units',
        'Extract duplicated logic into shared utility',
      ],
      risk: 'medium',
    };
  }

  async createDeploymentPlan({ environment, version }) {
    return {
      environment,
      version: version || 'latest',
      steps: [
        'Run unit tests',
        'Build artifacts',
        'Upload to hosting',
        `Promote to ${environment}`,
        'Smoke tests',
      ],
      rollback: 'Re-deploy previous stable version',
    };
  }

  async generateSmartContract(specs) {
    const type = (specs && specs.type) || 'ERC721';
    const name = (specs && specs.contractName) || 'MyNFT';
    return {
      code: `// Smart contract (${type})\n// Name: ${name}\n// (Stubbed by LangChainOrchestrator)`,
    };
  }

  async debugCode({ error, code }) {
    return {
      fixes: [
        { description: 'Fix type mismatch', diff: '// ...' },
        { description: 'Add missing import', diff: '// ...' },
      ],
    };
  }

  async optimizeCode({ code }) {
    return {
      suggestions: [
        'Memoize heavy computations',
        'Use lazy loading for routes',
      ],
    };
  }

  // Analyze if changes warrant a new checkpoint/auto-save
  async analyzeChanges(content) {
    try {
      const text = String(content || '');
      if (!text.trim()) return false;
      const tokens = text.split(/\s+/).filter(Boolean);
      const unique = new Set(tokens.map((t) => t.toLowerCase())).size;
      const diversity = unique / Math.max(tokens.length, 1);
      // Heuristic: require minimum size and some diversity
      return tokens.length > 200 && diversity > 0.4;
    } catch {
      return false;
    }
  }

  // ===== Authentication management (LangChain-controlled) =====
  async manageAuthentication(action, data) {
    console.log('🔐 LangChain managing auth:', action);
    switch (action) {
      case 'setup-provider':
        return this.setupAuthProvider(data);
      case 'validate-user':
        return this.validateUser(data);
      case 'assign-permissions':
        return this.assignUserPermissions?.(data);
      case 'generate-api-limits':
        return this.generateAPILimits(data);
      default:
        return null;
    }
  }

  async setupAuthProvider(provider) {
    const config = {
      google: provider === 'google' || provider?.providers?.google?.enabled === true,
      facebook: provider === 'facebook' || provider?.providers?.facebook?.enabled === true,
      github: provider === 'github' || provider?.providers?.github?.enabled === true,
      email: true,
      twoFactor: true,
      sessionLength: '7d',
    };
    return config;
  }

  async validateUser(userData) {
    const trustScore = await this.calculateTrustScore?.(userData);
    const tier = (trustScore || 0) > 0.9 ? 'premium' : 'free';
    return {
      approved: (trustScore || 0) > 0.7,
      tier,
      apiLimits: await this.generateAPILimits({ ...userData, tier }),
    };
  }

  async generateAPILimits(user) {
    return {
      requests: user?.tier === 'premium' ? 10000 : 100,
      models: user?.tier === 'premium' ? ['gpt-4', 'claude'] : ['gpt-3.5'],
      searchQueries: user?.tier === 'premium' ? 1000 : 10,
    };
  }

  async selectBackupStorage() {
    // Prefer local by default; can be extended to consider keys/settings
    const s = this.settingsCache || (await this.getSettings());
    if (s?.S3_BUCKET) return 's3';
    if (s?.GDRIVE_TOKEN) return 'gdrive';
    if (s?.DROPBOX_TOKEN) return 'dropbox';
    return 'local';
  }

  // Optional/custom hook used by validateUser
  async calculateTrustScore(_userData) {
    // Heuristic placeholder; increase with signals as needed
    return 0.75;
  }

  async getSettings() {
    const envKeys = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      OLLAMA_HOST: process.env.OLLAMA_HOST,
    };
    const user = await this.getUserSettings();
    return { ...envKeys, ...user };
  }

  async getUserSettings() {
    try {
      const { readSettings } = require('../main/settings');
      const s = readSettings();
      const out = {};
      const ps = s?.providerSettings || {};
      // Map known providers to expected keys if present
      if (ps.openai?.apiKey?.value) out.OPENAI_API_KEY = ps.openai.apiKey.value;
      if (ps.anthropic?.apiKey?.value) out.ANTHROPIC_API_KEY = ps.anthropic.apiKey.value;
      if (ps.google?.apiKey?.value) out.GOOGLE_API_KEY = ps.google.apiKey.value;
      if (s?.ollamaHost?.value) out.OLLAMA_HOST = s.ollamaHost.value;
      return out;
    } catch {
      return {};
    }
  }
}

// Support both CJS and ESM consumers
module.exports = { LangChainOrchestrator };
export { LangChainOrchestrator };
export default { LangChainOrchestrator };
