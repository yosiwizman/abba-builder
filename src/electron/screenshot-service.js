/**
 * Screenshot Service for Electron
 * Handles app screenshot capture for gallery previews
 */

const { app, BrowserWindow, desktopCapturer, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ScreenshotService {
  constructor() {
    this.screenshotCache = new Map();
    this.screenshotDir = path.join(app.getPath('userData'), 'app-screenshots');
    this.ensureScreenshotDir();
  }

  async ensureScreenshotDir() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create screenshot directory:', error);
    }
  }

  /**
   * Capture screenshot of a specific app window
   */
  async captureAppScreenshot(appId, appPath) {
    try {
      // First, try to find the app window if it's running
      const appWindow = await this.findAppWindow(appId);
      
      if (appWindow) {
        return await this.captureRunningApp(appWindow, appId);
      } else {
        // If app is not running, try to launch it temporarily for screenshot
        return await this.captureLaunchedApp(appId, appPath);
      }
    } catch (error) {
      console.error(`Failed to capture screenshot for ${appId}:`, error);
      return null;
    }
  }

  /**
   * Find window of running app
   */
  async findAppWindow(appId) {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      
      // Find window that matches app ID or name
      const appWindow = sources.find(source => 
        source.name.toLowerCase().includes(appId.toLowerCase()) ||
        source.name.includes('Electron') && source.id.includes(appId)
      );
      
      return appWindow;
    } catch (error) {
      console.error('Failed to find app window:', error);
      return null;
    }
  }

  /**
   * Capture screenshot of running app
   */
  async captureRunningApp(appWindow, appId) {
    try {
      const screenshot = appWindow.thumbnail.toPNG();
      const screenshotPath = path.join(this.screenshotDir, `${appId}.png`);
      
      await fs.writeFile(screenshotPath, screenshot);
      
      // Cache the screenshot
      this.screenshotCache.set(appId, {
        path: screenshotPath,
        timestamp: Date.now()
      });
      
      return screenshotPath;
    } catch (error) {
      console.error('Failed to capture running app screenshot:', error);
      return null;
    }
  }

  /**
   * Launch app and capture screenshot
   */
  async captureLaunchedApp(appId, appPath) {
    if (!appPath || !await this.pathExists(appPath)) {
      console.error(`Invalid app path: ${appPath}`);
      return null;
    }

    let appWindow = null;
    let appProcess = null;

    try {
      // Launch the app
      const exePath = await this.findExecutable(appPath);
      if (!exePath) {
        console.error(`No executable found for ${appId}`);
        return null;
      }

      // Start the app process
      appProcess = exec(`"${exePath}"`, { 
        windowsHide: false,
        detached: true 
      });

      // Wait for app to start
      await this.sleep(3000);

      // Try to find the new window
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1280, height: 720 }
      });

      // Find the most recently created window (likely our app)
      const recentWindow = sources[0]; // Usually the newest window
      
      if (recentWindow) {
        const screenshot = recentWindow.thumbnail.toPNG();
        const screenshotPath = path.join(this.screenshotDir, `${appId}.png`);
        
        await fs.writeFile(screenshotPath, screenshot);
        
        // Cache the screenshot
        this.screenshotCache.set(appId, {
          path: screenshotPath,
          timestamp: Date.now()
        });
        
        return screenshotPath;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to launch and capture ${appId}:`, error);
      return null;
    } finally {
      // Clean up: close the app if we launched it
      if (appProcess) {
        try {
          process.kill(appProcess.pid);
        } catch (err) {
          console.error('Failed to close app process:', err);
        }
      }
    }
  }

  /**
   * Capture screenshot of entire desktop
   */
  async captureDesktop() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      if (sources.length > 0) {
        const screenshot = sources[0].thumbnail.toPNG();
        const screenshotPath = path.join(this.screenshotDir, `desktop-${Date.now()}.png`);
        
        await fs.writeFile(screenshotPath, screenshot);
        return screenshotPath;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to capture desktop screenshot:', error);
      return null;
    }
  }

  /**
   * Get cached screenshot
   */
  getCachedScreenshot(appId) {
    const cached = this.screenshotCache.get(appId);
    
    // Check if cache is still valid (less than 1 hour old)
    if (cached && (Date.now() - cached.timestamp) < 3600000) {
      return cached.path;
    }
    
    return null;
  }

  /**
   * Clear screenshot cache for an app
   */
  async clearScreenshotCache(appId) {
    this.screenshotCache.delete(appId);
    
    try {
      const screenshotPath = path.join(this.screenshotDir, `${appId}.png`);
      await fs.unlink(screenshotPath);
    } catch (error) {
      // File might not exist
    }
  }

  /**
   * Get all screenshots
   */
  async getAllScreenshots() {
    try {
      const files = await fs.readdir(this.screenshotDir);
      const screenshots = {};
      
      for (const file of files) {
        if (file.endsWith('.png')) {
          const appId = file.replace('.png', '');
          screenshots[appId] = path.join(this.screenshotDir, file);
        }
      }
      
      return screenshots;
    } catch (error) {
      console.error('Failed to get all screenshots:', error);
      return {};
    }
  }

  /**
   * Find executable in app directory
   */
  async findExecutable(appPath) {
    try {
      const files = await fs.readdir(appPath);
      
      // Look for common executable patterns
      const exePatterns = ['.exe', '.app', '.AppImage', '.deb', '.dmg'];
      
      for (const file of files) {
        const filePath = path.join(appPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          // Check if it's an executable
          if (exePatterns.some(ext => file.endsWith(ext))) {
            return filePath;
          }
        } else if (stats.isDirectory()) {
          // Check in subdirectories (e.g., dist, build, out)
          if (['dist', 'build', 'out', 'release'].includes(file)) {
            const subExe = await this.findExecutable(filePath);
            if (subExe) return subExe;
          }
        }
      }
      
      // For Electron apps, look for the main entry
      const packageJsonPath = path.join(appPath, 'package.json');
      if (await this.pathExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        if (packageJson.main) {
          // Try to run with electron
          return `electron ${appPath}`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to find executable:', error);
      return null;
    }
  }

  /**
   * Check if path exists
   */
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Take screenshot with fallback to placeholder
   */
  async captureWithFallback(appId, appPath) {
    // Try to get cached screenshot first
    const cached = this.getCachedScreenshot(appId);
    if (cached) return cached;
    
    // Try to capture new screenshot
    const screenshot = await this.captureAppScreenshot(appId, appPath);
    if (screenshot) return screenshot;
    
    // Return placeholder path
    return this.generatePlaceholder(appId);
  }

  /**
   * Generate placeholder image for app
   */
  async generatePlaceholder(appId) {
    // This would generate a placeholder image
    // For now, return null to use the UI placeholder
    return null;
  }
}

module.exports = ScreenshotService;
