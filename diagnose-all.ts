#!/usr/bin/env tsx
/**
 * Comprehensive Diagnostic Tool for Abba AI Builder
 * Run: npx tsx diagnose-all.ts
 */

import { MasterDebugger } from "./src/utils/master-debugger";
import * as fs from "fs-extra";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

class ComprehensiveDiagnostic {
  private debugger: MasterDebugger;
  private errors: string[] = [];
  private warnings: string[] = [];
  private fixes: string[] = [];

  constructor() {
    this.debugger = MasterDebugger.getInstance();
  }

  async run() {
    console.log(`${COLORS.bold}${COLORS.blue}
╔══════════════════════════════════════════════════════════════╗
║     ABBA AI BUILDER - COMPREHENSIVE DIAGNOSTIC TOOL         ║
╚══════════════════════════════════════════════════════════════╝
${COLORS.reset}`);

    await this.checkGitHub();
    await this.checkFileSystem();
    await this.checkDependencies();
    await this.checkReactComponents();
    await this.checkCSS();
    await this.checkBuildSystem();
    await this.checkElectron();
    await this.checkRuntime();
    await this.generateReport();
    await this.applyAutoFixes();
  }

  private async checkGitHub() {
    console.log(
      `\n${COLORS.blue}📦 Checking GitHub Repository...${COLORS.reset}`,
    );

    try {
      // Check if git is initialized
      if (fs.existsSync(".git")) {
        const { stdout } = await execAsync("git remote -v");
        if (stdout.includes("github.com/yosiwizman/Abba")) {
          console.log(
            `${COLORS.green}✓ Connected to correct GitHub repository${COLORS.reset}`,
          );
        } else {
          this.warnings.push("Not connected to the official Abba repository");
        }

        // Check for uncommitted changes
        const { stdout: status } = await execAsync("git status --porcelain");
        if (status) {
          this.warnings.push("You have uncommitted changes");
        }
      } else {
        this.warnings.push("Git not initialized");
      }
    } catch (error) {
      this.errors.push(`Git check failed: ${error.message}`);
    }
  }

  private async checkFileSystem() {
    console.log(`\n${COLORS.blue}📁 Checking File System...${COLORS.reset}`);

    const criticalFiles = [
      "package.json",
      "tsconfig.json",
      "vite.renderer.config.mts",
      "tailwind.config.ts",
      "postcss.config.js",
      "src/renderer.tsx",
      "src/main.ts",
      "src/styles/globals.css",
      "src/app/layout.tsx",
      "src/router.ts",
      ".env",
    ];

    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        this.errors.push(`Missing critical file: ${file}`);
        this.fixes.push(`Create ${file}`);
      } else {
        console.log(`${COLORS.green}✓ ${file}${COLORS.reset}`);
      }
    }

    // Check directory structure
    const criticalDirs = [
      "src",
      "src/components",
      "src/styles",
      "src/utils",
      "src/services",
      "public",
      "logs",
    ];

    for (const dir of criticalDirs) {
      if (!fs.existsSync(dir)) {
        this.warnings.push(`Missing directory: ${dir}`);
        fs.mkdirpSync(dir);
        console.log(
          `${COLORS.yellow}⚠ Created missing directory: ${dir}${COLORS.reset}`,
        );
      }
    }
  }

  private async checkDependencies() {
    console.log(`\n${COLORS.blue}📦 Checking Dependencies...${COLORS.reset}`);

    try {
      const pkg = await fs.readJson("package.json");
      const requiredDeps = {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.30.0",
        "@tanstack/react-router": "latest",
        tailwindcss: "^3.4.17",
        "lucide-react": "latest",
        "@radix-ui/react-slot": "latest",
        "class-variance-authority": "latest",
        clsx: "latest",
        "tailwind-merge": "latest",
      };

      const requiredDevDeps = {
        "@vitejs/plugin-react": "latest",
        electron: "latest",
        "electron-forge": "latest",
        typescript: "^5.8.3",
        postcss: "latest",
        "postcss-nesting": "latest",
        autoprefixer: "latest",
      };

      // Check main dependencies
      for (const [dep, _version] of Object.entries(requiredDeps)) {
        if (!pkg.dependencies?.[dep]) {
          this.errors.push(`Missing dependency: ${dep}`);
          this.fixes.push(`npm install ${dep}`);
        }
      }

      // Check dev dependencies
      for (const [dep, _version] of Object.entries(requiredDevDeps)) {
        if (!pkg.devDependencies?.[dep]) {
          this.warnings.push(`Missing dev dependency: ${dep}`);
          this.fixes.push(`npm install -D ${dep}`);
        }
      }

      console.log(
        `${COLORS.green}✓ Found ${Object.keys(pkg.dependencies || {}).length} dependencies${COLORS.reset}`,
      );
      console.log(
        `${COLORS.green}✓ Found ${Object.keys(pkg.devDependencies || {}).length} dev dependencies${COLORS.reset}`,
      );
    } catch (error) {
      this.errors.push(`Package.json check failed: ${error.message}`);
    }
  }

  private async checkReactComponents() {
    console.log(
      `\n${COLORS.blue}⚛️ Checking React Components...${COLORS.reset}`,
    );

    try {
      const componentDir = "src/components";
      if (fs.existsSync(componentDir)) {
        const files = await this.getAllFiles(componentDir, ".tsx");
        let componentIssues = 0;

        for (const file of files) {
          const content = await fs.readFile(file, "utf-8");

          // Check for React imports
          if (!content.includes("import") && file.endsWith(".tsx")) {
            this.warnings.push(`${file}: No imports detected`);
            componentIssues++;
          }

          // Check for export
          if (!content.includes("export")) {
            this.warnings.push(`${file}: No exports detected`);
            componentIssues++;
          }

          // Check for common errors
          if (
            content.includes("undefined") &&
            content.includes("Cannot read")
          ) {
            this.errors.push(`${file}: Potential undefined error`);
            componentIssues++;
          }
        }

        if (componentIssues === 0) {
          console.log(
            `${COLORS.green}✓ All ${files.length} components look good${COLORS.reset}`,
          );
        } else {
          console.log(
            `${COLORS.yellow}⚠ Found ${componentIssues} issues in components${COLORS.reset}`,
          );
        }
      }
    } catch (error) {
      this.errors.push(`Component check failed: ${error.message}`);
    }
  }

  private async checkCSS() {
    console.log(`\n${COLORS.blue}🎨 Checking CSS/Styling...${COLORS.reset}`);

    // Check if CSS is imported in main file
    const mainFile = "src/renderer.tsx";
    if (fs.existsSync(mainFile)) {
      const content = await fs.readFile(mainFile, "utf-8");
      if (!content.includes("globals.css") && !content.includes("styles")) {
        this.errors.push("CSS not imported in renderer.tsx");
        this.fixes.push('Add import "./styles/globals.css" to renderer.tsx');
      } else {
        console.log(`${COLORS.green}✓ CSS properly imported${COLORS.reset}`);
      }
    }

    // Check Tailwind configuration
    if (fs.existsSync("tailwind.config.ts")) {
      const content = await fs.readFile("tailwind.config.ts", "utf-8");
      if (!content.includes("content")) {
        this.errors.push("Tailwind content paths not configured");
      } else {
        console.log(`${COLORS.green}✓ Tailwind configured${COLORS.reset}`);
      }
    }

    // Check PostCSS
    if (fs.existsSync("postcss.config.js")) {
      const content = await fs.readFile("postcss.config.js", "utf-8");
      if (!content.includes("tailwindcss")) {
        this.errors.push("Tailwind not configured in PostCSS");
      }
      if (!content.includes("nesting")) {
        this.warnings.push("CSS nesting not configured in PostCSS");
        this.fixes.push("Add postcss-nesting to PostCSS config");
      }
    } else {
      this.errors.push("PostCSS config missing");
      this.fixes.push("Create postcss.config.js");
    }

    // Check globals.css
    const globalsPath = "src/styles/globals.css";
    if (fs.existsSync(globalsPath)) {
      const content = await fs.readFile(globalsPath, "utf-8");
      if (!content.includes("@tailwind")) {
        this.errors.push("Tailwind directives missing in globals.css");
      }
      if (!content.includes("border-border")) {
        this.warnings.push("Custom border-border class missing");
      }
    }
  }

  private async checkBuildSystem() {
    console.log(`\n${COLORS.blue}🔧 Checking Build System...${COLORS.reset}`);

    // Check Vite config
    const viteConfig = "vite.renderer.config.mts";
    if (fs.existsSync(viteConfig)) {
      const content = await fs.readFile(viteConfig, "utf-8");

      if (!content.includes("@vitejs/plugin-react")) {
        this.errors.push("React plugin not configured in Vite");
      }

      if (!content.includes("optimizeDeps")) {
        this.warnings.push("Vite optimizeDeps not configured");
      }

      console.log(`${COLORS.green}✓ Vite configuration found${COLORS.reset}`);
    } else {
      this.errors.push("Vite configuration missing");
    }

    // Check TypeScript config
    if (fs.existsSync("tsconfig.json")) {
      try {
        const tsConfig = await fs.readJson("tsconfig.json");
        if (tsConfig.compilerOptions?.strict === false) {
          this.warnings.push("TypeScript strict mode disabled");
        }
        console.log(`${COLORS.green}✓ TypeScript configured${COLORS.reset}`);
      } catch {
        this.errors.push("Invalid tsconfig.json");
      }
    }
  }

  private async checkElectron() {
    console.log(`\n${COLORS.blue}⚡ Checking Electron...${COLORS.reset}`);

    // Check main process file
    if (fs.existsSync("src/main.ts")) {
      const content = await fs.readFile("src/main.ts", "utf-8");
      if (!content.includes("BrowserWindow")) {
        this.errors.push("BrowserWindow not found in main.ts");
      }
      if (!content.includes("app.whenReady")) {
        this.errors.push("app.whenReady not found in main.ts");
      }
      console.log(
        `${COLORS.green}✓ Electron main process configured${COLORS.reset}`,
      );
    } else {
      this.errors.push("Electron main.ts missing");
    }

    // Check preload
    if (!fs.existsSync("src/preload.ts")) {
      this.warnings.push("Preload script missing");
    }
  }

  private async checkRuntime() {
    console.log(`\n${COLORS.blue}🚀 Checking Runtime...${COLORS.reset}`);

    try {
      // Check Node version
      const { stdout: nodeVersion } = await execAsync("node --version");
      console.log(
        `${COLORS.green}✓ Node.js ${nodeVersion.trim()}${COLORS.reset}`,
      );

      // Check npm version
      const { stdout: npmVersion } = await execAsync("npm --version");
      console.log(`${COLORS.green}✓ npm ${npmVersion.trim()}${COLORS.reset}`);

      // Check if app can start
      console.log(
        `${COLORS.yellow}⚠ To fully test runtime, run: npm start${COLORS.reset}`,
      );
    } catch (error) {
      this.errors.push(`Runtime check failed: ${error.message}`);
    }
  }

  private async getAllFiles(dir: string, ext: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory() && !entry.name.includes("node_modules")) {
          await walk(fullPath);
        } else if (entry.isFile() && fullPath.endsWith(ext)) {
          files.push(fullPath);
        }
      }
    }

    await walk(dir);
    return files;
  }

  private async generateReport() {
    console.log(`\n${COLORS.bold}${COLORS.magenta}
════════════════════════════════════════════════════════════════
                        DIAGNOSTIC REPORT
════════════════════════════════════════════════════════════════
${COLORS.reset}`);

    if (this.errors.length > 0) {
      console.log(
        `\n${COLORS.red}❌ CRITICAL ERRORS (${this.errors.length}):${COLORS.reset}`,
      );
      this.errors.forEach((err) => console.log(`  • ${err}`));
    }

    if (this.warnings.length > 0) {
      console.log(
        `\n${COLORS.yellow}⚠️  WARNINGS (${this.warnings.length}):${COLORS.reset}`,
      );
      this.warnings.forEach((warn) => console.log(`  • ${warn}`));
    }

    if (this.fixes.length > 0) {
      console.log(
        `\n${COLORS.blue}🔧 SUGGESTED FIXES (${this.fixes.length}):${COLORS.reset}`,
      );
      this.fixes.forEach((fix) => console.log(`  • ${fix}`));
    }

    // Overall status
    console.log(`\n${COLORS.bold}Overall Status: `);
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(
        `${COLORS.green}✅ HEALTHY - System is ready!${COLORS.reset}`,
      );
    } else if (this.errors.length === 0) {
      console.log(
        `${COLORS.yellow}⚠️  WARNING - System has minor issues${COLORS.reset}`,
      );
    } else {
      console.log(
        `${COLORS.red}❌ CRITICAL - System needs immediate fixes${COLORS.reset}`,
      );
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      fixes: this.fixes,
      status: this.errors.length === 0 ? "healthy" : "critical",
    };

    const reportPath = path.join("logs", `diagnostic-${Date.now()}.json`);
    await fs.ensureDir("logs");
    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }

  private async applyAutoFixes() {
    if (this.fixes.length === 0) return;

    console.log(`\n${COLORS.blue}🔧 Applying Auto-Fixes...${COLORS.reset}`);

    // Fix missing CSS import
    if (this.fixes.some((f) => f.includes('import "./styles/globals.css"'))) {
      const rendererPath = "src/renderer.tsx";
      if (fs.existsSync(rendererPath)) {
        let content = await fs.readFile(rendererPath, "utf-8");
        if (!content.includes("globals.css")) {
          const lines = content.split("\n");
          lines.splice(2, 0, 'import "./styles/globals.css";');
          await fs.writeFile(rendererPath, lines.join("\n"));
          console.log(
            `${COLORS.green}✓ Added CSS import to renderer.tsx${COLORS.reset}`,
          );
        }
      }
    }

    // Fix PostCSS config
    if (this.fixes.some((f) => f.includes("PostCSS"))) {
      const postcssConfig = `module.exports = {
  plugins: {
    'tailwindcss/nesting': 'postcss-nesting',
    tailwindcss: {},
    autoprefixer: {}
  }
};`;
      await fs.writeFile("postcss.config.js", postcssConfig);
      console.log(
        `${COLORS.green}✓ Fixed PostCSS configuration${COLORS.reset}`,
      );
    }

    console.log(
      `\n${COLORS.green}✅ Auto-fixes applied! Please restart the app.${COLORS.reset}`,
    );
  }
}

// Run diagnostic
(async () => {
  const diagnostic = new ComprehensiveDiagnostic();
  await diagnostic.run();
})().catch(console.error);
