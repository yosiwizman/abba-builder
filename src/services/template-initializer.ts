import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import log from 'electron-log';

interface TemplateInitOptions {
  templatePath: string;
  targetPath: string;
  projectName: string;
  description?: string;
  author?: string;
  initGit?: boolean;
  installDependencies?: boolean;
}

interface InitResult {
  success: boolean;
  projectPath?: string;
  error?: string;
  warnings?: string[];
}

class TemplateInitializer {
  private logger = log.scope('template-initializer');

  async initializeFromTemplate(options: TemplateInitOptions): Promise<InitResult> {
    const warnings: string[] = [];
    
    try {
      // Validate inputs
      if (!await fs.pathExists(options.templatePath)) {
        return {
          success: false,
          error: `Template path does not exist: ${options.templatePath}`
        };
      }

      // Create target directory
      const projectPath = path.join(options.targetPath, options.projectName);
      
      if (await fs.pathExists(projectPath)) {
        return {
          success: false,
          error: `Project directory already exists: ${projectPath}`
        };
      }

      this.logger.info(`Initializing project from template: ${options.templatePath} -> ${projectPath}`);

      // Copy template files
      await this.copyTemplateFiles(options.templatePath, projectPath);

      // Update package.json if it exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        await this.updatePackageJson(packageJsonPath, options);
      }

      // Initialize git repository if requested
      if (options.initGit) {
        try {
          await this.initGitRepo(projectPath);
        } catch (err) {
          warnings.push(`Failed to initialize git repository: ${err}`);
        }
      }

      // Install dependencies if requested
      if (options.installDependencies && await fs.pathExists(packageJsonPath)) {
        try {
          await this.installDeps(projectPath);
        } catch (err) {
          warnings.push(`Failed to install dependencies: ${err}`);
        }
      }

      // Clean up template-specific files
      await this.cleanupTemplateFiles(projectPath);

      this.logger.info(`Project initialized successfully at: ${projectPath}`);

      return {
        success: true,
        projectPath,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error: any) {
      this.logger.error('Failed to initialize project from template:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize project'
      };
    }
  }

  private async copyTemplateFiles(sourcePath: string, targetPath: string): Promise<void> {
    // Copy all files except .git directory and node_modules
    await fs.copy(sourcePath, targetPath, {
      filter: (src) => {
        const relativePath = path.relative(sourcePath, src);
        // Skip .git, node_modules, and other build artifacts
        if (relativePath.includes('.git') || 
            relativePath.includes('node_modules') ||
            relativePath.includes('dist') ||
            relativePath.includes('build') ||
            relativePath.includes('.next') ||
            relativePath.includes('.vite') ||
            relativePath.includes('coverage')) {
          return false;
        }
        return true;
      }
    });
  }

  private async updatePackageJson(packageJsonPath: string, options: TemplateInitOptions): Promise<void> {
    const pkg = await fs.readJson(packageJsonPath);
    
    // Update package metadata
    pkg.name = options.projectName.toLowerCase().replace(/\s+/g, '-');
    pkg.version = '0.1.0';
    pkg.description = options.description || `${options.projectName} project`;
    pkg.author = options.author || '';
    
    // Remove template-specific fields
    delete pkg.repository;
    delete pkg.bugs;
    delete pkg.homepage;
    delete pkg.keywords;
    
    // Reset scripts if they contain template-specific commands
    if (pkg.scripts) {
      // Keep essential scripts but remove template-specific ones
      const essentialScripts = ['start', 'build', 'test', 'dev', 'lint'];
      const cleanedScripts: any = {};
      
      essentialScripts.forEach(script => {
        if (pkg.scripts[script]) {
          cleanedScripts[script] = pkg.scripts[script];
        }
      });
      
      pkg.scripts = cleanedScripts;
    }

    await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
  }

  private async initGitRepo(projectPath: string): Promise<void> {
    this.logger.info('Initializing git repository...');
    
    execSync('git init', { cwd: projectPath });
    execSync('git add .', { cwd: projectPath });
    execSync('git commit -m "Initial commit from template"', { cwd: projectPath });
  }

  private async installDeps(projectPath: string): Promise<void> {
    this.logger.info('Installing dependencies...');
    
    // Detect package manager
    const hasYarnLock = await fs.pathExists(path.join(projectPath, 'yarn.lock'));
    const hasPnpmLock = await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'));
    
    let installCommand = 'npm install';
    if (hasPnpmLock) {
      installCommand = 'pnpm install';
    } else if (hasYarnLock) {
      installCommand = 'yarn install';
    }
    
    execSync(installCommand, { 
      cwd: projectPath,
      stdio: 'inherit'
    });
  }

  private async cleanupTemplateFiles(projectPath: string): Promise<void> {
    // Remove template-specific files
    const filesToRemove = [
      '.github-metadata.json',
      'CHANGELOG.md',
      'CODE_OF_CONDUCT.md',
      'CONTRIBUTING.md',
      '.travis.yml',
      '.circleci',
      'renovate.json'
    ];

    for (const file of filesToRemove) {
      const filePath = path.join(projectPath, file);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    }

    // Create a basic README if one doesn't exist
    const readmePath = path.join(projectPath, 'README.md');
    const readmeExists = await fs.pathExists(readmePath);
    
    if (!readmeExists) {
      const projectName = path.basename(projectPath);
      const readmeContent = `# ${projectName}

This project was initialized from a template.

## Getting Started

### Installation
\`\`\`bash
npm install
\`\`\`

### Development
\`\`\`bash
npm run dev
\`\`\`

### Build
\`\`\`bash
npm run build
\`\`\`

## License
MIT
`;
      await fs.writeFile(readmePath, readmeContent);
    }
  }

  async getTemplateInfo(templatePath: string): Promise<any> {
    try {
      const packageJsonPath = path.join(templatePath, 'package.json');
      const readmePath = path.join(templatePath, 'README.md');
      
      let info: any = {
        path: templatePath,
        name: path.basename(templatePath),
        hasPackageJson: false,
        hasReadme: false
      };

      if (await fs.pathExists(packageJsonPath)) {
        const pkg = await fs.readJson(packageJsonPath);
        info.hasPackageJson = true;
        info.packageName = pkg.name;
        info.description = pkg.description;
        info.version = pkg.version;
        info.dependencies = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
        info.devDependencies = pkg.devDependencies ? Object.keys(pkg.devDependencies) : [];
        info.scripts = pkg.scripts ? Object.keys(pkg.scripts) : [];
      }

      if (await fs.pathExists(readmePath)) {
        info.hasReadme = true;
        info.readmeContent = await fs.readFile(readmePath, 'utf-8');
      }

      return info;
    } catch (error: any) {
      this.logger.error('Failed to get template info:', error);
      throw error;
    }
  }
}

export default new TemplateInitializer();
