import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import log from 'electron-log';

class ComprehensiveProjectLibrary {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN;
    this.libraryPath = path.join(process.cwd(), 'project-library');
    this.dbPath = path.join(process.cwd(), 'data', 'project-library.json');
    
    // Comprehensive category system - 50+ categories
    this.categories = {
      // Business & Enterprise (7 categories)
      'crm': ['customer', 'relationship', 'crm', 'client', 'contact', 'lead', 'sales'],
      'ecommerce': ['shopping', 'cart', 'store', 'marketplace', 'payment', 'checkout', 'shop', 'product'],
      'erp': ['erp', 'enterprise', 'resource', 'planning', 'business', 'workflow'],
      'hrm': ['human', 'resource', 'hr', 'employee', 'payroll', 'recruitment', 'staff'],
      'accounting': ['accounting', 'finance', 'invoice', 'billing', 'bookkeeping', 'expense'],
      'inventory': ['inventory', 'warehouse', 'stock', 'supply', 'logistics', 'shipping'],
      'pos': ['point-of-sale', 'pos', 'retail', 'restaurant', 'cashier', 'register'],
      
      // AI & Machine Learning (5 categories)
      'ai-agents': ['agent', 'autonomous', 'assistant', 'ai-agent', 'intelligent'],
      'chatbot': ['chatbot', 'conversational', 'dialogue', 'chat-ai', 'nlp'],
      'computer-vision': ['vision', 'image', 'opencv', 'detection', 'recognition', 'face'],
      'ml-models': ['machine-learning', 'ml', 'model', 'tensorflow', 'pytorch', 'sklearn'],
      'data-science': ['data-science', 'analytics', 'pandas', 'numpy', 'jupyter', 'visualization'],
      
      // Games (5 categories)
      'web-game': ['game', 'html5', 'canvas', 'webgl', 'phaser', 'browser-game'],
      'mobile-game': ['mobile-game', 'unity', 'game-engine', 'android-game', 'ios-game'],
      'desktop-game': ['desktop-game', 'steam', 'pc-game', 'native-game'],
      'multiplayer': ['multiplayer', 'online-game', 'mmo', 'realtime-game', 'socket-game'],
      'puzzle-game': ['puzzle', 'casual', 'match3', 'tetris', 'wordle', 'sudoku'],
      
      // Mobile Development (5 categories)
      'ios': ['ios', 'swift', 'objective-c', 'iphone', 'ipad', 'apple'],
      'android': ['android', 'kotlin', 'java-android', 'mobile-app'],
      'react-native': ['react-native', 'expo', 'cross-platform', 'mobile-react'],
      'flutter': ['flutter', 'dart', 'mobile-flutter', 'cross-platform-flutter'],
      'ionic': ['ionic', 'cordova', 'capacitor', 'hybrid', 'mobile-web'],
      
      // Web Development (6 categories)
      'landing-page': ['landing', 'homepage', 'marketing', 'website', 'static-site'],
      'portfolio': ['portfolio', 'resume', 'cv', 'personal', 'showcase'],
      'blog': ['blog', 'cms', 'content', 'article', 'publishing', 'writing'],
      'dashboard': ['dashboard', 'admin', 'analytics', 'monitoring', 'metrics', 'panel'],
      'saas': ['saas', 'subscription', 'multi-tenant', 'billing', 'stripe', 'recurring'],
      'webapp': ['webapp', 'application', 'spa', 'pwa', 'web-app'],
      
      // Desktop Software (5 categories)
      'electron': ['electron', 'desktop-app', 'cross-platform-desktop'],
      'tauri': ['tauri', 'rust-desktop', 'lightweight-desktop'],
      'qt': ['qt', 'cpp-desktop', 'qt-framework'],
      'windows-native': ['windows', 'wpf', 'winforms', 'win32', 'uwp'],
      'mac-native': ['macos', 'cocoa', 'swift-desktop', 'mac-app'],
      
      // Crypto & Blockchain (5 categories)
      'defi': ['defi', 'decentralized-finance', 'yield', 'farming', 'liquidity'],
      'nft': ['nft', 'non-fungible', 'opensea', 'collection', 'minting'],
      'crypto-wallet': ['wallet', 'crypto-wallet', 'metamask', 'web3-wallet'],
      'smart-contract': ['smart-contract', 'solidity', 'ethereum', 'blockchain'],
      'crypto-exchange': ['exchange', 'trading', 'dex', 'swap', 'crypto-trading'],
      
      // Browser Extensions (4 categories)
      'chrome-extension': ['chrome-extension', 'chrome', 'browser-extension'],
      'firefox-addon': ['firefox', 'addon', 'firefox-extension', 'mozilla'],
      'productivity-extension': ['productivity', 'blocker', 'automation', 'helper'],
      'developer-extension': ['devtools', 'debugger', 'inspector', 'developer-tool'],
      
      // Communication (4 categories)
      'voip': ['voip', 'webrtc', 'voice', 'calling', 'telephony'],
      'chat': ['chat', 'messaging', 'instant', 'messenger', 'realtime'],
      'email': ['email', 'mail', 'smtp', 'newsletter', 'mailer'],
      'video-conference': ['video', 'conference', 'meeting', 'zoom', 'streaming'],
      
      // Productivity Tools (4 categories)
      'notes': ['notes', 'note-taking', 'markdown', 'knowledge', 'wiki'],
      'todo': ['todo', 'task', 'productivity', 'gtd', 'kanban'],
      'calendar': ['calendar', 'scheduling', 'appointment', 'event', 'planner'],
      'time-tracking': ['time', 'tracking', 'timer', 'pomodoro', 'timesheet'],
      
      // Membership & Subscription (4 categories)
      'subscription-management': ['subscription', 'membership', 'recurring', 'saas-billing'],
      'community-platform': ['community', 'forum', 'discussion', 'social-platform'],
      'course-platform': ['course', 'lms', 'learning', 'education', 'online-course'],
      'paywall': ['paywall', 'premium', 'monetization', 'content-gate'],
      
      // Complex Open Source (6 categories)
      'cms': ['cms', 'content-management', 'wordpress', 'drupal', 'strapi'],
      'framework': ['framework', 'library', 'toolkit', 'foundation', 'boilerplate'],
      'devops': ['devops', 'ci-cd', 'deployment', 'docker', 'kubernetes'],
      'monitoring': ['monitoring', 'observability', 'logging', 'metrics', 'apm'],
      'database': ['database', 'db', 'orm', 'migration', 'query'],
      'api': ['api', 'rest', 'graphql', 'backend', 'microservice'],
      
      // Additional Categories
      'social': ['social', 'network', 'community', 'sharing', 'feed'],
      'media': ['video', 'audio', 'gallery', 'streaming', 'player', 'editor'],
      'healthcare': ['medical', 'health', 'patient', 'clinic', 'hospital', 'telemedicine'],
      'education': ['education', 'school', 'university', 'student', 'teacher', 'classroom'],
      'iot': ['iot', 'arduino', 'raspberry', 'sensor', 'embedded', 'hardware'],
      'security': ['security', 'encryption', 'auth', 'firewall', 'vpn', 'password'],
      'automation': ['automation', 'workflow', 'bot', 'scraper', 'rpa', 'zapier'],
      'general': ['general', 'misc', 'other', 'utility', 'tool']
    };
    
    this.initializeLibrary();
  }

  async initializeLibrary() {
    await fs.ensureDir(this.libraryPath);
    await fs.ensureDir(path.dirname(this.dbPath));
    
    if (!await fs.pathExists(this.dbPath)) {
      await fs.writeJson(this.dbPath, { 
        projects: [], 
        lastUpdated: null,
        statistics: {
          totalProjects: 0,
          downloadedProjects: 0,
          categoryCounts: {},
          qualityScores: {},
          techStacks: {}
        }
      });
    }
  }

  async scrapeAllCategories(projectsPerCategory = 10) {
    log.info(`Starting comprehensive scraping: ${Object.keys(this.categories).length} categories`);
    const allProjects = [];
    
    for (const [category, keywords] of Object.entries(this.categories)) {
      log.info(`Scraping category: ${category}`);
      const searchQuery = `${keywords.slice(0, 3).join(' OR ')} stars:>50`;
      const projects = await this.scrapeGitHubProjects(searchQuery, projectsPerCategory);
      allProjects.push(...projects);
      
      // Rate limiting - wait 1 second between categories
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    log.info(`Comprehensive scraping complete: ${allProjects.length} total projects`);
    return allProjects;
  }

  async scrapeGitHubProjects(searchQuery = 'stars:>100', limit = 50) {
    try {
      log.info(`Scraping GitHub: ${searchQuery} (limit: ${limit})`);
      
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Abba-Comprehensive-Library'
      };
      
      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${limit}`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 403) {
          log.warn('GitHub API rate limit reached, using mock data');
          return this.getMockProjects(limit);
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      const projects = [];
      
      for (const repo of data.items || []) {
        const category = this.categorizeProject(repo);
        const qualityScore = this.calculateQualityScore(repo);
        const difficulty = this.assessDifficulty(repo);
        
        const project = {
          id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          url: repo.html_url,
          clone_url: repo.clone_url,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          issues: repo.open_issues_count,
          language: repo.language,
          category: category,
          topics: repo.topics || [],
          size: repo.size,
          last_updated: repo.updated_at,
          created_at: repo.created_at,
          local_path: null,
          is_downloaded: false,
          build_commands: this.detectBuildCommands(repo),
          tech_stack: this.detectTechStack(repo),
          quality_score: qualityScore,
          difficulty: difficulty,
          has_readme: true,
          has_wiki: repo.has_wiki,
          has_pages: repo.has_pages,
          license: repo.license?.spdx_id || 'Unknown',
          default_branch: repo.default_branch || 'main',
          is_template: repo.is_template || false,
          is_fork: repo.fork,
          archived: repo.archived
        };
        
        projects.push(project);
      }
      
      // Save to database
      await this.saveProjects(projects);
      
      return projects;
    } catch (error) {
      log.error('Failed to scrape GitHub:', error);
      return this.getMockProjects(limit);
    }
  }

  async saveProjects(projects) {
    const db = await fs.readJson(this.dbPath);
    
    // Merge new projects (avoid duplicates)
    for (const project of projects) {
      const existing = db.projects.findIndex(p => p.id === project.id);
      if (existing >= 0) {
        db.projects[existing] = { ...db.projects[existing], ...project };
      } else {
        db.projects.push(project);
      }
    }
    
    // Update statistics
    db.lastUpdated = new Date().toISOString();
    db.statistics.totalProjects = db.projects.length;
    db.statistics.categoryCounts = this.calculateCategoryCounts(db.projects);
    db.statistics.qualityScores = this.calculateAverageQualityScores(db.projects);
    db.statistics.techStacks = this.calculateTechStackDistribution(db.projects);
    
    await fs.writeJson(this.dbPath, db, { spaces: 2 });
    
    log.info(`Database updated: ${db.projects.length} total projects`);
  }

  calculateQualityScore(repo) {
    let score = 0;
    
    // Stars (max 30 points)
    if (repo.stargazers_count > 10000) score += 30;
    else if (repo.stargazers_count > 5000) score += 25;
    else if (repo.stargazers_count > 1000) score += 20;
    else if (repo.stargazers_count > 500) score += 15;
    else if (repo.stargazers_count > 100) score += 10;
    else if (repo.stargazers_count > 50) score += 5;
    
    // Forks (max 20 points)
    if (repo.forks_count > 1000) score += 20;
    else if (repo.forks_count > 500) score += 15;
    else if (repo.forks_count > 100) score += 10;
    else if (repo.forks_count > 50) score += 5;
    
    // Recent activity (max 20 points)
    const lastUpdate = new Date(repo.updated_at);
    const monthsOld = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld < 1) score += 20;
    else if (monthsOld < 3) score += 15;
    else if (monthsOld < 6) score += 10;
    else if (monthsOld < 12) score += 5;
    
    // Documentation (max 15 points)
    if (repo.has_wiki) score += 5;
    if (repo.has_pages) score += 5;
    if (repo.description && repo.description.length > 50) score += 5;
    
    // License (max 10 points)
    if (repo.license) score += 10;
    
    // Topics (max 5 points)
    if (repo.topics && repo.topics.length > 3) score += 5;
    
    return Math.min(100, score);
  }

  assessDifficulty(repo) {
    const size = repo.size || 0;
    const files = repo.size / 50; // Approximate file count
    
    if (size > 100000 || files > 2000) return 'expert';
    if (size > 50000 || files > 1000) return 'advanced';
    if (size > 10000 || files > 500) return 'intermediate';
    return 'beginner';
  }

  categorizeProject(repo) {
    const name = (repo.name || '').toLowerCase();
    const description = (repo.description || '').toLowerCase();
    const topics = (repo.topics || []).join(' ').toLowerCase();
    const combined = `${name} ${description} ${topics}`;
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(this.categories)) {
      const matchCount = keywords.filter(keyword => combined.includes(keyword)).length;
      if (matchCount >= 2 || (matchCount === 1 && keywords[0] === category)) {
        return category;
      }
    }
    
    // Fallback categorization based on language
    if (repo.language === 'Swift' || repo.language === 'Objective-C') return 'ios';
    if (repo.language === 'Kotlin' || repo.language === 'Java') return 'android';
    if (repo.language === 'Dart') return 'flutter';
    if (repo.language === 'Solidity') return 'smart-contract';
    if (repo.language === 'Python' && combined.includes('django')) return 'dashboard';
    if (repo.language === 'Ruby' && combined.includes('rails')) return 'saas';
    
    return 'general';
  }

  detectTechStack(repo) {
    const stack = [];
    const lang = repo.language;
    const topics = repo.topics || [];
    const topicsStr = topics.join(' ').toLowerCase();
    const name = repo.name.toLowerCase();
    
    // Frontend frameworks
    if (topicsStr.includes('react') || name.includes('react')) stack.push('React');
    if (topicsStr.includes('vue')) stack.push('Vue');
    if (topicsStr.includes('angular')) stack.push('Angular');
    if (topicsStr.includes('svelte')) stack.push('Svelte');
    if (topicsStr.includes('nextjs') || topicsStr.includes('next')) stack.push('Next.js');
    if (topicsStr.includes('nuxt')) stack.push('Nuxt');
    if (topicsStr.includes('gatsby')) stack.push('Gatsby');
    
    // Backend frameworks
    if (topicsStr.includes('express')) stack.push('Express');
    if (topicsStr.includes('nestjs')) stack.push('NestJS');
    if (topicsStr.includes('fastify')) stack.push('Fastify');
    if (topicsStr.includes('django')) stack.push('Django');
    if (topicsStr.includes('flask')) stack.push('Flask');
    if (topicsStr.includes('fastapi')) stack.push('FastAPI');
    if (topicsStr.includes('rails')) stack.push('Ruby on Rails');
    if (topicsStr.includes('spring')) stack.push('Spring Boot');
    if (topicsStr.includes('laravel')) stack.push('Laravel');
    
    // Mobile
    if (topicsStr.includes('react-native')) stack.push('React Native');
    if (topicsStr.includes('flutter')) stack.push('Flutter');
    if (topicsStr.includes('ionic')) stack.push('Ionic');
    if (topicsStr.includes('expo')) stack.push('Expo');
    
    // Databases
    if (topicsStr.includes('mongodb') || topicsStr.includes('mongo')) stack.push('MongoDB');
    if (topicsStr.includes('postgresql') || topicsStr.includes('postgres')) stack.push('PostgreSQL');
    if (topicsStr.includes('mysql')) stack.push('MySQL');
    if (topicsStr.includes('redis')) stack.push('Redis');
    if (topicsStr.includes('elasticsearch')) stack.push('Elasticsearch');
    if (topicsStr.includes('firebase')) stack.push('Firebase');
    if (topicsStr.includes('supabase')) stack.push('Supabase');
    
    // Cloud & DevOps
    if (topicsStr.includes('docker')) stack.push('Docker');
    if (topicsStr.includes('kubernetes') || topicsStr.includes('k8s')) stack.push('Kubernetes');
    if (topicsStr.includes('aws')) stack.push('AWS');
    if (topicsStr.includes('azure')) stack.push('Azure');
    if (topicsStr.includes('gcp') || topicsStr.includes('google-cloud')) stack.push('Google Cloud');
    if (topicsStr.includes('vercel')) stack.push('Vercel');
    if (topicsStr.includes('netlify')) stack.push('Netlify');
    
    // Other technologies
    if (topicsStr.includes('graphql')) stack.push('GraphQL');
    if (topicsStr.includes('websocket') || topicsStr.includes('socket.io')) stack.push('WebSocket');
    if (topicsStr.includes('blockchain')) stack.push('Blockchain');
    if (topicsStr.includes('machine-learning') || topicsStr.includes('ml')) stack.push('Machine Learning');
    if (topicsStr.includes('tensorflow')) stack.push('TensorFlow');
    if (topicsStr.includes('pytorch')) stack.push('PyTorch');
    
    // Language-based additions
    if (lang === 'JavaScript' || lang === 'TypeScript') {
      if (!stack.some(s => s.includes('Node'))) stack.push('Node.js');
    }
    if (lang === 'Python' && !stack.some(s => ['Django', 'Flask', 'FastAPI'].includes(s))) {
      stack.push('Python');
    }
    
    return stack;
  }

  detectBuildCommands(repo) {
    const commands = {
      install: 'npm install',
      build: 'npm run build',
      start: 'npm start',
      dev: 'npm run dev',
      test: 'npm test',
      lint: 'npm run lint',
      format: 'npm run format'
    };
    
    const topics = (repo.topics || []).join(' ').toLowerCase();
    const name = repo.name.toLowerCase();
    
    // Package manager detection
    if (topics.includes('yarn') || name.includes('yarn')) {
      commands.install = 'yarn install';
      commands.build = 'yarn build';
      commands.start = 'yarn start';
      commands.dev = 'yarn dev';
      commands.test = 'yarn test';
    } else if (topics.includes('pnpm')) {
      commands.install = 'pnpm install';
      commands.build = 'pnpm build';
      commands.start = 'pnpm start';
      commands.dev = 'pnpm dev';
      commands.test = 'pnpm test';
    }
    
    // Language-specific commands
    if (repo.language === 'Python') {
      commands.install = 'pip install -r requirements.txt';
      commands.start = 'python app.py';
      commands.dev = 'python app.py --debug';
      commands.test = 'pytest';
      commands.lint = 'pylint';
      commands.format = 'black .';
    } else if (repo.language === 'Java') {
      commands.install = 'mvn install';
      commands.build = 'mvn package';
      commands.start = 'java -jar target/*.jar';
      commands.test = 'mvn test';
    } else if (repo.language === 'Ruby') {
      commands.install = 'bundle install';
      commands.start = 'rails server';
      commands.dev = 'rails server';
      commands.test = 'rspec';
    } else if (repo.language === 'Go') {
      commands.install = 'go mod download';
      commands.build = 'go build';
      commands.start = './main';
      commands.test = 'go test ./...';
      commands.lint = 'golint';
    } else if (repo.language === 'Rust') {
      commands.install = 'cargo fetch';
      commands.build = 'cargo build --release';
      commands.start = 'cargo run';
      commands.dev = 'cargo watch -x run';
      commands.test = 'cargo test';
    }
    
    return commands;
  }

  calculateCategoryCounts(projects) {
    const counts = {};
    for (const project of projects) {
      counts[project.category] = (counts[project.category] || 0) + 1;
    }
    return counts;
  }

  calculateAverageQualityScores(projects) {
    const scores = {};
    const counts = {};
    
    for (const project of projects) {
      if (!scores[project.category]) {
        scores[project.category] = 0;
        counts[project.category] = 0;
      }
      scores[project.category] += project.quality_score || 0;
      counts[project.category]++;
    }
    
    const averages = {};
    for (const category in scores) {
      averages[category] = Math.round(scores[category] / counts[category]);
    }
    
    return averages;
  }

  calculateTechStackDistribution(projects) {
    const distribution = {};
    
    for (const project of projects) {
      for (const tech of project.tech_stack || []) {
        distribution[tech] = (distribution[tech] || 0) + 1;
      }
    }
    
    // Sort by frequency
    return Object.fromEntries(
      Object.entries(distribution).sort(([,a], [,b]) => b - a)
    );
  }

  async findBestTemplate(requirements) {
    const db = await fs.readJson(this.dbPath);
    const { category, techStack = [], keywords = [], minQuality = 50 } = requirements;
    
    let candidates = db.projects;
    
    // Filter by category
    if (category) {
      candidates = candidates.filter(p => p.category === category);
    }
    
    // Filter by tech stack
    if (techStack.length > 0) {
      candidates = candidates.filter(p => 
        techStack.some(tech => p.tech_stack?.includes(tech))
      );
    }
    
    // Filter by keywords
    if (keywords.length > 0) {
      candidates = candidates.filter(p => {
        const text = `${p.name} ${p.description} ${p.topics?.join(' ')}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword.toLowerCase()));
      });
    }
    
    // Filter by quality
    candidates = candidates.filter(p => (p.quality_score || 0) >= minQuality);
    
    // Sort by quality score and stars
    candidates.sort((a, b) => {
      const scoreA = (a.quality_score || 0) + Math.log10(a.stars || 1);
      const scoreB = (b.quality_score || 0) + Math.log10(b.stars || 1);
      return scoreB - scoreA;
    });
    
    return candidates.slice(0, 10);
  }

  async downloadTopProjects(limit = 100) {
    const db = await fs.readJson(this.dbPath);
    
    // Get top projects by quality score
    const topProjects = db.projects
      .filter(p => !p.is_downloaded && !p.archived)
      .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
      .slice(0, limit);
    
    log.info(`Downloading top ${topProjects.length} projects...`);
    
    for (const project of topProjects) {
      try {
        await this.downloadProject(project.id);
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        log.error(`Failed to download ${project.name}:`, error);
      }
    }
    
    log.info('Bulk download complete');
  }

  async downloadProject(projectId) {
    const db = await fs.readJson(this.dbPath);
    const project = db.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    const categoryPath = path.join(this.libraryPath, project.category);
    const projectPath = path.join(categoryPath, `${project.owner}-${project.name}`);
    await fs.ensureDir(categoryPath);
    
    if (await fs.pathExists(projectPath)) {
      log.info(`Project already exists: ${projectPath}`);
      project.local_path = projectPath;
      project.is_downloaded = true;
    } else {
      log.info(`Downloading: ${project.name}`);
      
      try {
        execSync(`git clone --depth 1 ${project.clone_url} "${projectPath}"`, {
          stdio: 'inherit',
          timeout: 60000 // 1 minute timeout
        });
        
        project.local_path = projectPath;
        project.is_downloaded = true;
        project.download_date = new Date().toISOString();
      } catch (error) {
        log.error('Git clone failed:', error);
        await this.createMockProjectStructure(projectPath, project);
        project.local_path = projectPath;
        project.is_downloaded = true;
        project.is_mock = true;
      }
    }
    
    // Update statistics
    db.statistics.downloadedProjects = db.projects.filter(p => p.is_downloaded).length;
    await fs.writeJson(this.dbPath, db, { spaces: 2 });
    
    return project;
  }

  async createMockProjectStructure(projectPath, project) {
    await fs.ensureDir(projectPath);
    
    const packageJson = {
      name: project.name,
      version: '1.0.0',
      description: project.description,
      main: 'index.js',
      scripts: project.build_commands,
      keywords: project.topics,
      author: project.owner,
      license: project.license
    };
    
    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
    
    const readme = `# ${project.name}

${project.description || 'No description available'}

## Installation
\`\`\`bash
${project.build_commands.install}
\`\`\`

## Usage
\`\`\`bash
${project.build_commands.start}
\`\`\`

## Tech Stack
${project.tech_stack.join(', ')}

## Category
${project.category}

## License
${project.license}
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
    
    const srcPath = path.join(projectPath, 'src');
    await fs.ensureDir(srcPath);
    
    await fs.writeFile(
      path.join(srcPath, 'index.js'),
      `// ${project.name}\nconsole.log('${project.name} initialized');`
    );
  }

  getMockProjects(limit = 10) {
    const mockProjects = [
      {
        id: 1001,
        name: 'enterprise-crm',
        owner: 'business-templates',
        category: 'crm',
        description: 'Enterprise CRM system with customer management',
        stars: 5000,
        quality_score: 85,
        tech_stack: ['React', 'Node.js', 'PostgreSQL']
      },
      {
        id: 1002,
        name: 'ai-chatbot-platform',
        owner: 'ai-templates',
        category: 'chatbot',
        description: 'Advanced AI chatbot with NLP capabilities',
        stars: 8000,
        quality_score: 90,
        tech_stack: ['Python', 'TensorFlow', 'FastAPI']
      },
      {
        id: 1003,
        name: 'mobile-game-engine',
        owner: 'game-templates',
        category: 'mobile-game',
        description: 'Cross-platform mobile game engine',
        stars: 12000,
        quality_score: 95,
        tech_stack: ['Unity', 'C#', 'Firebase']
      },
      {
        id: 1004,
        name: 'defi-exchange',
        owner: 'crypto-templates',
        category: 'defi',
        description: 'Decentralized exchange platform',
        stars: 3000,
        quality_score: 80,
        tech_stack: ['Solidity', 'Web3', 'React']
      },
      {
        id: 1005,
        name: 'saas-boilerplate',
        owner: 'saas-templates',
        category: 'saas',
        description: 'Complete SaaS starter with billing',
        stars: 6000,
        quality_score: 88,
        tech_stack: ['Next.js', 'Stripe', 'Supabase']
      }
    ];
    
    return mockProjects.slice(0, limit).map(p => ({
      ...p,
      url: `https://github.com/${p.owner}/${p.name}`,
      clone_url: `https://github.com/${p.owner}/${p.name}.git`,
      forks: Math.floor(p.stars / 10),
      language: 'JavaScript',
      topics: p.category.split('-'),
      is_downloaded: false,
      build_commands: this.detectBuildCommands(p),
      difficulty: 'intermediate',
      license: 'MIT'
    }));
  }

  async getStats() {
    const db = await fs.readJson(this.dbPath);
    return {
      totalProjects: db.statistics.totalProjects,
      downloadedProjects: db.statistics.downloadedProjects,
      categoryCounts: db.statistics.categoryCounts,
      topCategories: Object.entries(db.statistics.categoryCounts || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      averageQuality: Math.round(
        db.projects.reduce((sum, p) => sum + (p.quality_score || 0), 0) / 
        (db.projects.length || 1)
      ),
      topTechStacks: Object.entries(db.statistics.techStacks || {})
        .slice(0, 20)
    };
  }

  async getAllProjects() {
    const db = await fs.readJson(this.dbPath);
    return db.projects;
  }

  async getProjectsByCategory(category) {
    const db = await fs.readJson(this.dbPath);
    return db.projects.filter(p => p.category === category);
  }

  async searchProjects(query) {
    const db = await fs.readJson(this.dbPath);
    const lowQuery = query.toLowerCase();
    
    return db.projects.filter(p => 
      p.name.toLowerCase().includes(lowQuery) ||
      p.description?.toLowerCase().includes(lowQuery) ||
      p.topics?.some(t => t.includes(lowQuery)) ||
      p.tech_stack?.some(t => t.toLowerCase().includes(lowQuery)) ||
      p.category.includes(lowQuery)
    );
  }

  async useProjectAsTemplate(projectId, modifications = {}) {
    const db = await fs.readJson(this.dbPath);
    const project = db.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (!project.is_downloaded) {
      await this.downloadProject(projectId);
    }
    
    const timestamp = Date.now();
    const newProjectName = modifications.name || `${project.name}-custom-${timestamp}`;
    const newProjectPath = path.join(this.libraryPath, 'generated', newProjectName);
    
    await fs.ensureDir(path.dirname(newProjectPath));
    
    if (project.local_path && await fs.pathExists(project.local_path)) {
      await fs.copy(project.local_path, newProjectPath);
    } else {
      await this.createMockProjectStructure(newProjectPath, {
        ...project,
        name: newProjectName
      });
    }
    
    // Apply modifications
    if (modifications.packageJson) {
      const pkgPath = path.join(newProjectPath, 'package.json');
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath);
        Object.assign(pkg, modifications.packageJson);
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }
    }
    
    log.info(`Template created: ${newProjectPath}`);
    
    return {
      originalProject: project,
      templatePath: newProjectPath,
      newProjectName,
      modifications,
      createdAt: new Date().toISOString()
    };
  }

  async initializeWithProvenProjects() {
    log.info('Initializing with proven projects across all categories...');
    
    // Scrape proven projects for each major category
    const searches = [
      // Business
      'crm customer management stars:>500',
      'ecommerce shopping cart stars:>500',
      'erp enterprise resource stars:>100',
      'accounting invoice billing stars:>100',
      
      // AI & ML
      'machine learning tensorflow stars:>1000',
      'chatbot nlp conversational stars:>500',
      'computer vision opencv stars:>500',
      
      // Games
      'game javascript html5 stars:>1000',
      'unity game 3d stars:>500',
      'multiplayer game server stars:>500',
      
      // Mobile
      'react native app stars:>1000',
      'flutter app cross platform stars:>500',
      'ios swift app stars:>500',
      
      // Web
      'dashboard admin template stars:>1000',
      'blog cms content stars:>500',
      'saas boilerplate starter stars:>500',
      
      // Crypto
      'defi ethereum blockchain stars:>500',
      'nft marketplace opensea stars:>100',
      
      // Desktop
      'electron desktop app stars:>1000',
      
      // Communication
      'chat messaging realtime stars:>500',
      'video call webrtc stars:>500',
      
      // Productivity
      'todo task management stars:>500',
      'note taking markdown stars:>500'
    ];
    
    for (const search of searches) {
      await this.scrapeGitHubProjects(search, 20);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    const db = await fs.readJson(this.dbPath);
    log.info(`Initialized with ${db.projects.length} proven projects`);
    
    return db.projects;
  }
}

export default ComprehensiveProjectLibrary;
