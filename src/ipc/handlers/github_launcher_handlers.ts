import { ipcMain } from "electron";
import { Octokit } from "@octokit/rest";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import log from "electron-log";
import { getModelClient } from "../utils/get_model_client";
import { readSettings } from "../../main/settings";
import { safeSend } from "../utils/safe_sender";

const execAsync = promisify(exec);
const logger = log.scope("github-launcher");

interface GitHubProjectAnalysis {
  metadata: any;
  localPath: string;
  structure: ProjectStructure;
  framework: string;
  language: string;
  complexity: string;
}

interface ProjectStructure {
  files: string[];
  directories: string[];
  totalFiles: number;
  totalSize: number;
  fileTypes: Map<string, number>;
}

interface LaunchResult {
  success: boolean;
  originalProject?: GitHubProjectAnalysis;
  understanding?: string;
  customizations?: string;
  generatedProject?: any;
  setupInstructions?: any;
  error?: string;
  fallback?: any;
}

export function registerGitHubLauncherHandlers() {
  ipcMain.handle(
    "github:launcher:analyze",
    async (event, { githubUrl, customizations }: { githubUrl: string; customizations: string }) => {
      try {
        logger.info("Starting GitHub project analysis", { githubUrl });
        
        // Send progress updates
        safeSend(event.sender, "github:launcher:progress", {
          stage: "cloning",
          message: "Cloning repository..."
        });

        const launcher = new GitHubProjectLauncher();
        const result = await launcher.analyzeAndLaunchProject(githubUrl, customizations);
        
        return result;
      } catch (error) {
        logger.error("GitHub launcher error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  ipcMain.handle(
    "github:launcher:generate",
    async (event, { understanding, customizations }: { understanding: string; customizations: string }) => {
      try {
        const launcher = new GitHubProjectLauncher();
        const result = await launcher.generateCustomizedProject(understanding, customizations);
        return result;
      } catch (error) {
        logger.error("Generation error:", error);
        throw error;
      }
    }
  );
}

class GitHubProjectLauncher {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit();
  }

  async analyzeAndLaunchProject(githubUrl: string, userCustomizations: string = ""): Promise<LaunchResult> {
    try {
      // Step 1: Clone and analyze the repository
      logger.info("📥 Cloning repository...");
      const projectAnalysis = await this.analyzeRepository(githubUrl);
      
      // Step 2: Understand the project structure
      logger.info("🔍 Analyzing project structure...");
      const understanding = await this.buildProjectUnderstanding(projectAnalysis);
      
      // Step 3: Apply user customizations
      logger.info("⚡ Applying customizations...");
      const customizedProject = await this.applyCustomizations(
        understanding, 
        userCustomizations
      );
      
      // Step 4: Generate the enhanced version
      logger.info("🚀 Generating enhanced project...");
      const result = await this.generateCustomizedProject(customizedProject, userCustomizations);
      
      return {
        success: true,
        originalProject: projectAnalysis,
        understanding: understanding,
        customizations: userCustomizations,
        generatedProject: result,
        setupInstructions: this.generateSetupInstructions(result)
      };
      
    } catch (error) {
      logger.error("Project launch failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fallback: await this.suggestManualApproach(githubUrl, userCustomizations)
      };
    }
  }

  private parseGitHubUrl(githubUrl: string): { owner: string; repo: string } {
    // Parse URLs like: https://github.com/owner/repo
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
    if (!match) {
      throw new Error("Invalid GitHub URL format");
    }
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, "")
    };
  }

  async analyzeRepository(githubUrl: string): Promise<GitHubProjectAnalysis> {
    const { owner, repo } = this.parseGitHubUrl(githubUrl);
    
    // Get repository metadata
    const { data: repoData } = await this.octokit.repos.get({ owner, repo });
    
    // Clone repository to temp directory
    const tempDir = path.join(process.cwd(), "temp", `${repo}_${Date.now()}`);
    await this.cloneRepository(githubUrl, tempDir);
    
    // Analyze project structure
    const structure = await this.scanProjectStructure(tempDir);
    
    return {
      metadata: repoData,
      localPath: tempDir,
      structure: structure,
      framework: this.detectFramework(structure),
      language: this.detectPrimaryLanguage(structure),
      complexity: this.assessComplexity(structure)
    };
  }

  private async cloneRepository(githubUrl: string, targetDir: string): Promise<void> {
    // Create temp directory
    await fs.mkdir(targetDir, { recursive: true });
    
    // Clone the repository
    try {
      await execAsync(`git clone --depth 1 "${githubUrl}" "${targetDir}"`);
    } catch (error) {
      logger.error("Git clone failed:", error);
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  private async scanProjectStructure(projectPath: string): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      files: [],
      directories: [],
      totalFiles: 0,
      totalSize: 0,
      fileTypes: new Map()
    };

    async function scanDir(dir: string) {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        // Skip node_modules and .git
        if (item.name === "node_modules" || item.name === ".git") continue;
        
        if (item.isDirectory()) {
          structure.directories.push(fullPath);
          await scanDir(fullPath);
        } else {
          structure.files.push(fullPath);
          structure.totalFiles++;
          
          // Track file types
          const ext = path.extname(item.name);
          structure.fileTypes.set(ext, (structure.fileTypes.get(ext) || 0) + 1);
          
          // Get file size
          const stat = await fs.stat(fullPath);
          structure.totalSize += stat.size;
        }
      }
    }

    await scanDir(projectPath);
    return structure;
  }

  private detectFramework(structure: ProjectStructure): string {
    const files = structure.files.map(f => path.basename(f));
    
    // Check for common framework indicators
    if (files.includes("package.json")) {
      // Read package.json to detect framework
      if (files.includes("next.config.js") || files.includes("next.config.mjs")) return "Next.js";
      if (files.includes("vite.config.js") || files.includes("vite.config.ts")) return "Vite";
      if (files.includes("angular.json")) return "Angular";
      if (files.includes("vue.config.js")) return "Vue";
      if (structure.files.some(f => f.includes("react"))) return "React";
    }
    
    if (files.includes("requirements.txt") || files.includes("setup.py")) return "Python";
    if (files.includes("Gemfile")) return "Ruby on Rails";
    if (files.includes("composer.json")) return "PHP";
    
    return "Unknown";
  }

  private detectPrimaryLanguage(structure: ProjectStructure): string {
    const extensions = Array.from(structure.fileTypes.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const langMap: Record<string, string> = {
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".ts": "TypeScript", 
      ".tsx": "TypeScript",
      ".py": "Python",
      ".java": "Java",
      ".rb": "Ruby",
      ".php": "PHP",
      ".go": "Go",
      ".rs": "Rust",
      ".cpp": "C++",
      ".c": "C"
    };
    
    for (const [ext] of extensions) {
      if (langMap[ext]) return langMap[ext];
    }
    
    return "Unknown";
  }

  private assessComplexity(structure: ProjectStructure): string {
    const { totalFiles, totalSize } = structure;
    
    if (totalFiles < 10 && totalSize < 100000) return "Simple";
    if (totalFiles < 50 && totalSize < 1000000) return "Medium";
    if (totalFiles < 200 && totalSize < 10000000) return "Complex";
    return "Very Complex";
  }

  private async buildProjectUnderstanding(analysis: GitHubProjectAnalysis): Promise<string> {
    const settings = await readSettings();
    const modelClient = await getModelClient(settings);

    const prompt = `
# COMPREHENSIVE PROJECT ANALYSIS

You are analyzing this GitHub project to understand its complete architecture and functionality.

## PROJECT METADATA
- Name: ${analysis.metadata.name}  
- Description: ${analysis.metadata.description}
- Language: ${analysis.language}
- Framework: ${analysis.framework}
- Stars: ${analysis.metadata.stargazers_count}

## PROJECT STRUCTURE
Total Files: ${analysis.structure.totalFiles}
Total Size: ${(analysis.structure.totalSize / 1024 / 1024).toFixed(2)} MB
Main Language: ${analysis.language}
Complexity: ${analysis.complexity}

File Types:
${Array.from(analysis.structure.fileTypes.entries())
  .map(([ext, count]) => `- ${ext}: ${count} files`)
  .join("\n")}

## KEY FILES CONTENT
${await this.getKeyFilesContent(analysis)}

## YOUR ANALYSIS TASK
Provide a comprehensive understanding:

1. **CORE FUNCTIONALITY**: What does this project do?
2. **ARCHITECTURE**: How is the code organized and why?
3. **KEY COMPONENTS**: What are the main parts and their roles?
4. **DEPENDENCIES**: What external libraries does it use?
5. **SETUP PROCESS**: How would you set this up from scratch?
6. **CUSTOMIZATION POINTS**: Where could modifications be made?
7. **COMPLEXITY ASSESSMENT**: What makes this project complex or simple?

Be extremely detailed - you'll be using this to recreate and customize the project.
`;

    const response = await modelClient.generateText({
      prompt,
      model: modelClient.model,
    });

    return response.text;
  }

  private async getKeyFilesContent(analysis: GitHubProjectAnalysis): Promise<string> {
    const keyFiles = ["README.md", "package.json", "index.js", "index.ts", "main.py", "app.py"];
    const contents: string[] = [];
    
    for (const fileName of keyFiles) {
      const file = analysis.structure.files.find(f => path.basename(f) === fileName);
      if (file) {
        try {
          const content = await fs.readFile(file, "utf-8");
          contents.push(`### ${fileName}\n\`\`\`\n${content.slice(0, 1000)}\n\`\`\``);
        } catch (error) {
          // Skip if can't read
        }
      }
    }
    
    return contents.join("\n\n");
  }

  private async applyCustomizations(understanding: string, userCustomizations: string): Promise<string> {
    if (!userCustomizations.trim()) {
      return understanding;
    }

    const settings = await readSettings();
    const modelClient = await getModelClient(settings);

    const prompt = `
# PROJECT CUSTOMIZATION TASK

## ORIGINAL PROJECT UNDERSTANDING
${understanding}

## USER REQUESTED CUSTOMIZATIONS
${userCustomizations}

## YOUR TASK
Modify the project understanding to incorporate the user's customizations:

1. **IDENTIFY MODIFICATION POINTS**: Where in the project do changes need to be made?
2. **PLAN CUSTOMIZATIONS**: How will each requested change be implemented?
3. **ASSESS IMPACT**: What other parts of the project will be affected?
4. **INTEGRATION STRATEGY**: How to integrate changes without breaking existing functionality?
5. **UPDATED ARCHITECTURE**: How does the project architecture change?

Provide a detailed plan for implementing all requested customizations while maintaining project integrity.
`;

    const response = await modelClient.generateText({
      prompt,
      model: modelClient.model,
    });

    return response.text;
  }

  async generateCustomizedProject(customizedUnderstanding: string, customizations: string): Promise<any> {
    const settings = await readSettings();
    const modelClient = await getModelClient(settings);

    const prompt = `
Based on this comprehensive project understanding and customization plan, generate the complete project structure and key files:

${customizedUnderstanding}

User Customizations: ${customizations}

Generate:
1. Complete file structure
2. Key implementation files
3. Configuration files
4. Dependencies list
5. Setup instructions

Provide actual code for the main files.
`;

    const response = await modelClient.generateText({
      prompt,
      model: modelClient.model,
    });

    return {
      generatedCode: response.text,
      files: this.extractFilesFromResponse(response.text)
    };
  }

  private extractFilesFromResponse(response: string): Array<{name: string; content: string}> {
    const files: Array<{name: string; content: string}> = [];
    
    // Extract code blocks with file names
    const codeBlockRegex = /```(\w+)?\s+(?:\/\/|#|<!--)?\s*(.+?)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const fileName = match[2].trim();
      const content = match[3];
      
      if (fileName && !fileName.includes(" ")) {
        files.push({ name: fileName, content });
      }
    }
    
    return files;
  }

  private generateSetupInstructions(result: any): any {
    return {
      dependencies: "npm install (or appropriate package manager)",
      setupCommands: [
        "git init",
        "npm install",
        "npm run dev"
      ],
      configurationSteps: [
        "Configure environment variables",
        "Set up database if needed",
        "Configure API keys"
      ],
      runInstructions: "npm run dev to start development server"
    };
  }

  private async suggestManualApproach(githubUrl: string, customizations: string): Promise<string> {
    return `
Manual Approach Suggested:

1. Clone the repository: git clone ${githubUrl}
2. Install dependencies based on the project type
3. Apply these customizations manually:
   ${customizations}
4. Test and iterate on the changes

The project may be too complex for automatic conversion. Consider breaking it down into smaller components.
`;
  }
}
