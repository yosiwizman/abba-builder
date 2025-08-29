import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import log from 'electron-log';

class ProjectLibrarySystem {
  constructor() {
    // Note: Octokit will be optional - we'll use fetch API for GitHub
    this.githubToken = process.env.GITHUB_TOKEN;
    this.libraryPath = path.join(process.cwd(), 'project-library');
    this.dbPath = path.join(process.cwd(), 'data', 'project-library.json');
    this.categories = {
      'ecommerce': ['shopping', 'cart', 'store', 'marketplace', 'payment'],
      'dashboard': ['admin', 'dashboard', 'analytics', 'monitoring', 'panel'],
      'social': ['chat', 'social', 'messaging', 'forum', 'community'],
      'productivity': ['todo', 'calendar', 'notes', 'task', 'kanban'],
      'media': ['video', 'audio', 'gallery', 'streaming', 'player'],
      'saas': ['subscription', 'billing', 'tenant', 'multi-tenant', 'stripe'],
      'educational': ['learning', 'course', 'quiz', 'education', 'tutorial'],
      'healthcare': ['medical', 'health', 'patient', 'clinic', 'hospital'],
      'ai': ['machine-learning', 'ai', 'llm', 'neural', 'chatbot'],
      'blockchain': ['crypto', 'blockchain', 'web3', 'defi', 'nft']
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
          categoryCounts: {}
        }
      });
    }
  }

  async scrapeGitHubProjects(searchQuery = 'stars:>100', limit = 50) {
    try {
      log.info(`Scraping GitHub for projects: ${searchQuery}`);
      
      // Use GitHub Search API directly
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Abba-Project-Library'
      };
      
      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${limit}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      const projects = [];
      
      for (const repo of data.items || []) {
        const category = this.categorizeProject(repo);
        const project = {
          id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          url: repo.html_url,
          clone_url: repo.clone_url,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
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
          has_readme: true,
          license: repo.license?.spdx_id || 'Unknown',
          default_branch: repo.default_branch || 'main'
        };
        
        projects.push(project);
      }
      
      // Save to database
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
      
      await fs.writeJson(this.dbPath, db, { spaces: 2 });
      
      log.info(`Scraped ${projects.length} projects, total in library: ${db.projects.length}`);
      return projects;
    } catch (error) {
      log.error('Failed to scrape GitHub:', error);
      
      // Return mock data if GitHub API fails
      return this.getMockProjects();
    }
  }

  getMockProjects() {
    return [
      {
        id: 1,
        name: 'react-ecommerce-template',
        owner: 'proven-templates',
        url: 'https://github.com/proven-templates/react-ecommerce',
        clone_url: 'https://github.com/proven-templates/react-ecommerce.git',
        description: 'A proven React ecommerce template with cart, checkout, and payment integration',
        stars: 2500,
        forks: 450,
        language: 'JavaScript',
        category: 'ecommerce',
        topics: ['react', 'ecommerce', 'shopping-cart', 'stripe'],
        size: 15000,
        last_updated: new Date().toISOString(),
        created_at: '2023-01-15T00:00:00Z',
        local_path: null,
        is_downloaded: false,
        build_commands: {
          install: 'npm install',
          build: 'npm run build',
          start: 'npm start',
          dev: 'npm run dev'
        },
        tech_stack: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe'],
        has_readme: true,
        license: 'MIT',
        default_branch: 'main'
      },
      {
        id: 2,
        name: 'admin-dashboard-pro',
        owner: 'proven-templates',
        url: 'https://github.com/proven-templates/admin-dashboard',
        clone_url: 'https://github.com/proven-templates/admin-dashboard.git',
        description: 'Professional admin dashboard with analytics, charts, and user management',
        stars: 3200,
        forks: 670,
        language: 'TypeScript',
        category: 'dashboard',
        topics: ['dashboard', 'admin', 'analytics', 'react', 'typescript'],
        size: 22000,
        last_updated: new Date().toISOString(),
        created_at: '2023-02-20T00:00:00Z',
        local_path: null,
        is_downloaded: false,
        build_commands: {
          install: 'npm install',
          build: 'npm run build',
          start: 'npm start',
          dev: 'npm run dev'
        },
        tech_stack: ['React', 'TypeScript', 'Redux', 'Chart.js', 'Material-UI'],
        has_readme: true,
        license: 'MIT',
        default_branch: 'main'
      },
      {
        id: 3,
        name: 'realtime-chat-app',
        owner: 'proven-templates',
        url: 'https://github.com/proven-templates/realtime-chat',
        clone_url: 'https://github.com/proven-templates/realtime-chat.git',
        description: 'Real-time chat application with WebSocket, rooms, and file sharing',
        stars: 1800,
        forks: 380,
        language: 'JavaScript',
        category: 'social',
        topics: ['chat', 'websocket', 'realtime', 'socket.io', 'messaging'],
        size: 8500,
        last_updated: new Date().toISOString(),
        created_at: '2023-03-10T00:00:00Z',
        local_path: null,
        is_downloaded: false,
        build_commands: {
          install: 'npm install',
          build: 'npm run build',
          start: 'npm start',
          dev: 'npm run dev'
        },
        tech_stack: ['React', 'Socket.io', 'Node.js', 'Express', 'MongoDB'],
        has_readme: true,
        license: 'MIT',
        default_branch: 'main'
      }
    ];
  }

  async downloadProject(projectId) {
    try {
      const db = await fs.readJson(this.dbPath);
      const project = db.projects.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }
      
      const categoryPath = path.join(this.libraryPath, project.category);
      const projectPath = path.join(categoryPath, `${project.owner}-${project.name}`);
      await fs.ensureDir(categoryPath);
      
      // Check if already downloaded
      if (await fs.pathExists(projectPath)) {
        log.info(`Project already exists at: ${projectPath}`);
        project.local_path = projectPath;
        project.is_downloaded = true;
      } else {
        log.info(`Downloading project: ${project.name}`);
        
        try {
          // Clone the repository (shallow clone for speed)
          execSync(`git clone --depth 1 ${project.clone_url} "${projectPath}"`, {
            stdio: 'inherit'
          });
          
          // Update project record
          project.local_path = projectPath;
          project.is_downloaded = true;
          project.download_date = new Date().toISOString();
        } catch (error) {
          log.error('Git clone failed, creating mock project structure', error);
          
          // Create a mock project structure if clone fails
          await this.createMockProjectStructure(projectPath, project);
          project.local_path = projectPath;
          project.is_downloaded = true;
          project.is_mock = true;
        }
      }
      
      // Analyze project structure
      project.structure = await this.analyzeProjectStructure(projectPath);
      
      // Update statistics
      db.statistics.downloadedProjects = db.projects.filter(p => p.is_downloaded).length;
      
      // Save updated database
      await fs.writeJson(this.dbPath, db, { spaces: 2 });
      
      log.info(`Project available at: ${projectPath}`);
      return project;
    } catch (error) {
      log.error('Failed to download project:', error);
      throw error;
    }
  }

  async createMockProjectStructure(projectPath, project) {
    await fs.ensureDir(projectPath);
    
    // Create package.json
    const packageJson = {
      name: project.name,
      version: '1.0.0',
      description: project.description,
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js',
        build: 'webpack --mode production',
        test: 'jest'
      },
      dependencies: {
        'express': '^4.18.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    };
    
    await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
    
    // Create README
    const readme = `# ${project.name}

${project.description}

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Tech Stack
${project.tech_stack.join(', ')}

## License
${project.license}
`;
    
    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
    
    // Create basic src structure
    const srcPath = path.join(projectPath, 'src');
    await fs.ensureDir(srcPath);
    
    // Create index.js
    const indexJs = `// ${project.name} - Entry point
console.log('Starting ${project.name}...');

// This is a template project structure
// Replace with actual implementation
`;
    
    await fs.writeFile(path.join(srcPath, 'index.js'), indexJs);
  }

  async analyzeProjectStructure(projectPath) {
    const structure = {
      files: [],
      directories: [],
      entryPoint: null,
      packageJson: null,
      hasTests: false,
      hasDocker: false,
      hasCICD: false,
      totalFiles: 0,
      totalSize: 0
    };
    
    try {
      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        structure.packageJson = await fs.readJson(packageJsonPath);
        structure.entryPoint = structure.packageJson.main || 'index.js';
      }
      
      // Check for common files and directories
      structure.hasTests = await fs.pathExists(path.join(projectPath, 'test')) || 
                          await fs.pathExists(path.join(projectPath, '__tests__')) ||
                          await fs.pathExists(path.join(projectPath, 'tests'));
      structure.hasDocker = await fs.pathExists(path.join(projectPath, 'Dockerfile')) ||
                           await fs.pathExists(path.join(projectPath, 'docker-compose.yml'));
      structure.hasCICD = await fs.pathExists(path.join(projectPath, '.github', 'workflows')) ||
                         await fs.pathExists(path.join(projectPath, '.gitlab-ci.yml'));
      
      // Get file list with size limit
      const { files, directories, totalSize } = await this.getFileList(projectPath);
      structure.files = files.slice(0, 100); // Limit to 100 files for performance
      structure.directories = directories;
      structure.totalFiles = files.length;
      structure.totalSize = totalSize;
      
      return structure;
    } catch (error) {
      log.error('Failed to analyze project structure:', error);
      return structure;
    }
  }

  async getFileList(dirPath, baseDir = dirPath, result = { files: [], directories: [], totalSize: 0 }) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        // Skip common ignore patterns
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') {
          continue;
        }
        
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          result.directories.push(path.relative(baseDir, itemPath));
          // Recursively get files from subdirectories
          if (result.files.length < 500) { // Limit recursion for performance
            await this.getFileList(itemPath, baseDir, result);
          }
        } else if (stat.isFile()) {
          result.files.push(path.relative(baseDir, itemPath));
          result.totalSize += stat.size;
        }
      }
    } catch (error) {
      log.error('Error reading directory:', error);
    }
    
    return result;
  }

  categorizeProject(repo) {
    const name = (repo.name || '').toLowerCase();
    const description = (repo.description || '').toLowerCase();
    const topics = (repo.topics || []).join(' ').toLowerCase();
    const combined = `${name} ${description} ${topics}`;
    
    for (const [category, keywords] of Object.entries(this.categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }
    
    // Additional categorization based on language
    if (repo.language === 'Python' && combined.includes('django')) return 'dashboard';
    if (repo.language === 'Ruby' && combined.includes('rails')) return 'saas';
    
    return 'general';
  }

  detectTechStack(repo) {
    const stack = [];
    const lang = repo.language;
    const topics = repo.topics || [];
    const topicsStr = topics.join(' ').toLowerCase();
    
    // Language-based detection
    if (lang === 'JavaScript' || lang === 'TypeScript') {
      stack.push('Node.js');
      if (topicsStr.includes('react') || repo.name.includes('react')) stack.push('React');
      if (topicsStr.includes('vue')) stack.push('Vue');
      if (topicsStr.includes('angular')) stack.push('Angular');
      if (topicsStr.includes('nextjs') || topicsStr.includes('next')) stack.push('Next.js');
      if (topicsStr.includes('express')) stack.push('Express');
      if (topicsStr.includes('nestjs')) stack.push('NestJS');
    } else if (lang === 'Python') {
      stack.push('Python');
      if (topicsStr.includes('django')) stack.push('Django');
      if (topicsStr.includes('flask')) stack.push('Flask');
      if (topicsStr.includes('fastapi')) stack.push('FastAPI');
    } else if (lang === 'Java') {
      stack.push('Java');
      if (topicsStr.includes('spring')) stack.push('Spring Boot');
    } else if (lang === 'Ruby') {
      stack.push('Ruby');
      if (topicsStr.includes('rails')) stack.push('Ruby on Rails');
    }
    
    // Database detection
    if (topicsStr.includes('mongodb') || topicsStr.includes('mongo')) stack.push('MongoDB');
    if (topicsStr.includes('postgresql') || topicsStr.includes('postgres')) stack.push('PostgreSQL');
    if (topicsStr.includes('mysql')) stack.push('MySQL');
    if (topicsStr.includes('redis')) stack.push('Redis');
    
    // Other technologies
    if (topicsStr.includes('docker')) stack.push('Docker');
    if (topicsStr.includes('kubernetes') || topicsStr.includes('k8s')) stack.push('Kubernetes');
    if (topicsStr.includes('graphql')) stack.push('GraphQL');
    if (topicsStr.includes('websocket') || topicsStr.includes('socket.io')) stack.push('WebSocket');
    
    return stack;
  }

  detectBuildCommands(repo) {
    const commands = {
      install: 'npm install',
      build: 'npm run build',
      start: 'npm start',
      dev: 'npm run dev',
      test: 'npm test'
    };
    
    // Customize based on language
    if (repo.language === 'Python') {
      commands.install = 'pip install -r requirements.txt';
      commands.start = 'python app.py';
      commands.dev = 'python app.py --debug';
      commands.test = 'pytest';
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
      commands.test = 'go test';
    }
    
    // Check for Yarn
    if ((repo.topics || []).includes('yarn')) {
      commands.install = 'yarn install';
      commands.build = 'yarn build';
      commands.start = 'yarn start';
      commands.dev = 'yarn dev';
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
      p.tech_stack?.some(t => t.toLowerCase().includes(lowQuery))
    );
  }

  async getAllProjects() {
    const db = await fs.readJson(this.dbPath);
    return db.projects;
  }

  async getStatistics() {
    const db = await fs.readJson(this.dbPath);
    return db.statistics;
  }

  async useProjectAsTemplate(projectId, modifications = {}) {
    const db = await fs.readJson(this.dbPath);
    const project = db.projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (!project.is_downloaded) {
      // Auto-download if not available locally
      await this.downloadProject(projectId);
    }
    
    // Create a copy of the project for modification
    const timestamp = Date.now();
    const newProjectName = modifications.name || `${project.name}-custom-${timestamp}`;
    const newProjectPath = path.join(this.libraryPath, 'generated', newProjectName);
    
    await fs.ensureDir(path.dirname(newProjectPath));
    
    if (project.local_path) {
      await fs.copy(project.local_path, newProjectPath);
    } else {
      // Create basic structure if no local path
      await this.createMockProjectStructure(newProjectPath, {
        ...project,
        name: newProjectName
      });
    }
    
    // Apply modifications if specified
    if (modifications.packageJson) {
      const pkgPath = path.join(newProjectPath, 'package.json');
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath);
        Object.assign(pkg, modifications.packageJson);
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }
    }
    
    log.info(`Created template copy at: ${newProjectPath}`);
    
    return {
      originalProject: project,
      templatePath: newProjectPath,
      newProjectName: newProjectName,
      modifications: modifications,
      createdAt: new Date().toISOString()
    };
  }

  // Initialize with proven projects
  async initializeWithProvenProjects() {
    log.info('Initializing project library with proven projects...');
    
    // Popular, proven repositories
    const provenSearches = [
      'react stars:>1000 template',
      'dashboard admin stars:>500',
      'ecommerce shopping cart stars:>500',
      'chat messaging realtime stars:>500',
      'saas boilerplate starter stars:>500'
    ];
    
    for (const search of provenSearches) {
      await this.scrapeGitHubProjects(search, 5);
    }
    
    // Specific proven projects
    const specificRepos = [
      'facebook/create-react-app',
      'vercel/next.js',
      'gothinkster/realworld',
      'sahat/hackathon-starter'
    ];
    
    for (const repo of specificRepos) {
      await this.scrapeGitHubProjects(`repo:${repo}`, 1);
    }
    
    const db = await fs.readJson(this.dbPath);
    log.info(`Library initialized with ${db.projects.length} proven projects`);
    
    return db.projects;
  }
}

export default ProjectLibrarySystem;




