import * as log from "electron-log";
import * as fs from "fs-extra";
import * as path from "path";
import { EventEmitter } from "events";
import crypto from "crypto";

const logger = log.scope("self-learning-kb");

interface KnowledgeEntry {
  id: string;
  timestamp: string;
  type: "command" | "error" | "solution" | "pattern" | "preference";
  category: string;
  context: {
    app?: string;
    language?: string;
    framework?: string;
    error?: string;
    command?: string;
  };
  content: {
    problem?: string;
    solution?: string;
    command?: string;
    output?: string;
    notes?: string;
  };
  metadata: {
    frequency: number;
    successRate: number;
    lastUsed: string;
    tags: string[];
    relatedEntries: string[];
  };
  learned: boolean;
  confidence: number;
}

interface LearningPattern {
  id: string;
  pattern: string;
  occurrences: number;
  context: Record<string, any>;
  solutions: string[];
  successRate: number;
}

interface UserPreference {
  category: string;
  preference: string;
  value: any;
  frequency: number;
  lastUpdated: string;
}

export class SelfLearningKnowledgeBase extends EventEmitter {
  private dbPath: string;
  private patternsPath: string;
  private preferencesPath: string;
  private entries: Map<string, KnowledgeEntry>;
  private patterns: Map<string, LearningPattern>;
  private preferences: Map<string, UserPreference>;
  private learningThreshold: number = 3; // Min occurrences to learn a pattern
  private confidenceThreshold: number = 0.7; // Min confidence to apply knowledge

  constructor() {
    super();

    this.dbPath = path.join(process.cwd(), "data", "knowledge-base.json");
    this.patternsPath = path.join(
      process.cwd(),
      "data",
      "learning-patterns.json",
    );
    this.preferencesPath = path.join(
      process.cwd(),
      "data",
      "user-preferences.json",
    );

    this.entries = new Map();
    this.patterns = new Map();
    this.preferences = new Map();

    this.initialize();
  }

  private async initialize() {
    try {
      await fs.ensureDir(path.dirname(this.dbPath));

      // Load existing knowledge base
      if (await fs.pathExists(this.dbPath)) {
        const data = await fs.readJson(this.dbPath);
        data.entries?.forEach((entry: KnowledgeEntry) => {
          this.entries.set(entry.id, entry);
        });
        logger.info(`Loaded ${this.entries.size} knowledge entries`);
      }

      // Load patterns
      if (await fs.pathExists(this.patternsPath)) {
        const patterns = await fs.readJson(this.patternsPath);
        patterns.forEach((pattern: LearningPattern) => {
          this.patterns.set(pattern.id, pattern);
        });
        logger.info(`Loaded ${this.patterns.size} learning patterns`);
      }

      // Load preferences
      if (await fs.pathExists(this.preferencesPath)) {
        const prefs = await fs.readJson(this.preferencesPath);
        prefs.forEach((pref: UserPreference) => {
          this.preferences.set(`${pref.category}:${pref.preference}`, pref);
        });
        logger.info(`Loaded ${this.preferences.size} user preferences`);
      }

      this.emit("initialized", {
        entries: this.entries.size,
        patterns: this.patterns.size,
        preferences: this.preferences.size,
      });
    } catch (error) {
      logger.error("Failed to initialize knowledge base:", error);
      this.emit("error", error);
    }
  }

  // Record a command execution
  public async recordCommand(data: {
    command: string;
    output: string;
    success: boolean;
    context: Record<string, any>;
  }) {
    const entry: KnowledgeEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: "command",
      category: this.categorizeCommand(data.command),
      context: {
        command: data.command,
        ...data.context,
      },
      content: {
        command: data.command,
        output: data.output,
      },
      metadata: {
        frequency: 1,
        successRate: data.success ? 100 : 0,
        lastUsed: new Date().toISOString(),
        tags: this.extractTags(data.command),
        relatedEntries: [],
      },
      learned: false,
      confidence: data.success ? 0.5 : 0.1,
    };

    // Check for similar commands and update frequency
    const similar = this.findSimilarEntries(entry);
    if (similar.length > 0) {
      const existing = similar[0];
      existing.metadata.frequency++;
      existing.metadata.lastUsed = new Date().toISOString();
      existing.metadata.successRate =
        (existing.metadata.successRate * (existing.metadata.frequency - 1) +
          (data.success ? 100 : 0)) /
        existing.metadata.frequency;

      // Increase confidence with repeated success
      if (data.success) {
        existing.confidence = Math.min(1, existing.confidence + 0.1);
      }

      // Mark as learned if threshold met
      if (
        existing.metadata.frequency >= this.learningThreshold &&
        existing.confidence >= this.confidenceThreshold
      ) {
        existing.learned = true;
        this.emit("patternLearned", existing);
      }

      await this.save();
    } else {
      this.entries.set(entry.id, entry);
      await this.save();
    }

    // Extract and learn patterns
    await this.extractPatterns(entry);
  }

  // Record an error and its solution
  public async recordError(data: {
    error: string;
    context: Record<string, any>;
    solution?: string;
    solved: boolean;
  }) {
    const entry: KnowledgeEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: data.solved ? "solution" : "error",
      category: "error-handling",
      context: {
        error: data.error,
        ...data.context,
      },
      content: {
        problem: data.error,
        solution: data.solution,
      },
      metadata: {
        frequency: 1,
        successRate: data.solved ? 100 : 0,
        lastUsed: new Date().toISOString(),
        tags: this.extractTags(data.error),
        relatedEntries: [],
      },
      learned: false,
      confidence: data.solved ? 0.6 : 0.2,
    };

    // Check for similar errors
    const similar = this.findSimilarErrors(data.error);
    if (similar.length > 0 && data.solved && data.solution) {
      const existing = similar[0];
      existing.content.solution = data.solution;
      existing.metadata.frequency++;
      existing.confidence = Math.min(1, existing.confidence + 0.15);
      existing.learned = existing.confidence >= this.confidenceThreshold;

      if (existing.learned) {
        this.emit("solutionLearned", existing);
      }

      await this.save();
    } else {
      this.entries.set(entry.id, entry);
      await this.save();
    }
  }

  // Learn user preferences
  public async learnPreference(
    category: string,
    preference: string,
    value: any,
  ) {
    const key = `${category}:${preference}`;
    const existing = this.preferences.get(key);

    if (existing) {
      existing.value = value;
      existing.frequency++;
      existing.lastUpdated = new Date().toISOString();
    } else {
      this.preferences.set(key, {
        category,
        preference,
        value,
        frequency: 1,
        lastUpdated: new Date().toISOString(),
      });
    }

    await this.savePreferences();
    this.emit("preferenceUpdated", { category, preference, value });
  }

  // Get suggestions based on context
  public async getSuggestions(context: {
    command?: string;
    error?: string;
    app?: string;
    language?: string;
  }): Promise<KnowledgeEntry[]> {
    const suggestions: KnowledgeEntry[] = [];

    // Find relevant entries based on context
    for (const entry of this.entries.values()) {
      if (!entry.learned) continue;

      let relevanceScore = 0;

      // Check command similarity
      if (context.command && entry.context.command) {
        const similarity = this.calculateSimilarity(
          context.command,
          entry.context.command,
        );
        relevanceScore += similarity * 0.4;
      }

      // Check error similarity
      if (context.error && entry.context.error) {
        const similarity = this.calculateSimilarity(
          context.error,
          entry.context.error,
        );
        relevanceScore += similarity * 0.3;
      }

      // Check context match
      if (context.app === entry.context.app) relevanceScore += 0.15;
      if (context.language === entry.context.language) relevanceScore += 0.15;

      // Add confidence factor
      relevanceScore *= entry.confidence;

      if (relevanceScore > 0.5) {
        suggestions.push(entry);
      }
    }

    // Sort by relevance and frequency
    suggestions.sort((a, b) => {
      const scoreA = a.confidence * a.metadata.frequency;
      const scoreB = b.confidence * b.metadata.frequency;
      return scoreB - scoreA;
    });

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  // Get solution for an error
  public async getSolution(error: string): Promise<string | null> {
    const similar = this.findSimilarErrors(error);

    for (const entry of similar) {
      if (entry.learned && entry.content.solution) {
        return entry.content.solution;
      }
    }

    return null;
  }

  // Extract patterns from entries
  private async extractPatterns(entry: KnowledgeEntry) {
    if (entry.type !== "command") return;

    const command = entry.content.command || "";
    const tokens = command.split(/\s+/);

    // Look for command patterns
    const baseCommand = tokens[0];
    const patternId = `cmd:${baseCommand}`;

    let pattern = this.patterns.get(patternId);
    if (!pattern) {
      pattern = {
        id: patternId,
        pattern: baseCommand,
        occurrences: 0,
        context: {},
        solutions: [],
        successRate: 0,
      };
      this.patterns.set(patternId, pattern);
    }

    pattern.occurrences++;
    pattern.context = { ...pattern.context, ...entry.context };

    // Update success rate
    const success = entry.metadata.successRate > 50;
    pattern.successRate =
      (pattern.successRate * (pattern.occurrences - 1) + (success ? 100 : 0)) /
      pattern.occurrences;

    if (pattern.occurrences >= this.learningThreshold) {
      this.emit("patternDetected", pattern);
    }

    await this.savePatterns();
  }

  // Find similar entries
  private findSimilarEntries(entry: KnowledgeEntry): KnowledgeEntry[] {
    const similar: KnowledgeEntry[] = [];

    for (const existing of this.entries.values()) {
      if (existing.type !== entry.type) continue;

      let similarity = 0;

      // Compare commands
      if (entry.content.command && existing.content.command) {
        similarity = this.calculateSimilarity(
          entry.content.command,
          existing.content.command,
        );
      }

      // Compare context
      if (entry.context.app === existing.context.app) similarity += 0.2;
      if (entry.context.language === existing.context.language)
        similarity += 0.1;

      if (similarity > 0.7) {
        similar.push(existing);
      }
    }

    return similar;
  }

  // Find similar errors
  private findSimilarErrors(error: string): KnowledgeEntry[] {
    const similar: KnowledgeEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.type !== "error" && entry.type !== "solution") continue;

      if (entry.context.error) {
        const similarity = this.calculateSimilarity(error, entry.context.error);
        if (similarity > 0.6) {
          similar.push(entry);
        }
      }
    }

    // Sort by similarity and confidence
    similar.sort((a, b) => b.confidence - a.confidence);

    return similar;
  }

  // Calculate string similarity (simple implementation)
  private calculateSimilarity(str1: string, str2: string): number {
    const tokens1 = str1.toLowerCase().split(/\s+/);
    const tokens2 = str2.toLowerCase().split(/\s+/);

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  // Categorize command
  private categorizeCommand(command: string): string {
    const tokens = command.toLowerCase().split(/\s+/);
    const baseCommand = tokens[0];

    const categories: Record<string, string[]> = {
      git: ["git", "clone", "commit", "push", "pull", "merge"],
      npm: ["npm", "yarn", "pnpm", "npx"],
      file: ["ls", "cd", "mkdir", "rm", "cp", "mv", "cat", "echo"],
      process: ["ps", "kill", "top", "htop"],
      network: ["ping", "curl", "wget", "ssh", "scp"],
      docker: ["docker", "docker-compose"],
      build: ["make", "cmake", "gradle", "mvn"],
    };

    for (const [category, commands] of Object.entries(categories)) {
      if (commands.includes(baseCommand)) {
        return category;
      }
    }

    return "general";
  }

  // Extract tags from text
  private extractTags(text: string): string[] {
    const tags: string[] = [];
    const tokens = text.toLowerCase().split(/\s+/);

    // Extract technology names
    const techs = [
      "react",
      "vue",
      "angular",
      "node",
      "python",
      "java",
      "typescript",
      "javascript",
    ];
    for (const tech of techs) {
      if (text.toLowerCase().includes(tech)) {
        tags.push(tech);
      }
    }

    // Extract command names
    if (tokens[0] && !tokens[0].includes("/")) {
      tags.push(tokens[0]);
    }

    return tags;
  }

  // Generate unique ID
  private generateId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  // Save knowledge base
  private async save() {
    const data = {
      entries: Array.from(this.entries.values()),
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeJson(this.dbPath, data, { spaces: 2 });
  }

  // Save patterns
  private async savePatterns() {
    const patterns = Array.from(this.patterns.values());
    await fs.writeJson(this.patternsPath, patterns, { spaces: 2 });
  }

  // Save preferences
  private async savePreferences() {
    const preferences = Array.from(this.preferences.values());
    await fs.writeJson(this.preferencesPath, preferences, { spaces: 2 });
  }

  // Get statistics
  public getStatistics() {
    const stats = {
      totalEntries: this.entries.size,
      learnedEntries: Array.from(this.entries.values()).filter((e) => e.learned)
        .length,
      patterns: this.patterns.size,
      preferences: this.preferences.size,
      categories: new Set(
        Array.from(this.entries.values()).map((e) => e.category),
      ).size,
      averageConfidence: 0,
    };

    const entries = Array.from(this.entries.values());
    if (entries.length > 0) {
      stats.averageConfidence =
        entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length;
    }

    return stats;
  }

  // Export knowledge for backup
  public async exportKnowledge(): Promise<string> {
    const data = {
      entries: Array.from(this.entries.values()),
      patterns: Array.from(this.patterns.values()),
      preferences: Array.from(this.preferences.values()),
      exported: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  // Import knowledge from backup
  public async importKnowledge(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);

      // Import entries
      if (data.entries) {
        data.entries.forEach((entry: KnowledgeEntry) => {
          this.entries.set(entry.id, entry);
        });
      }

      // Import patterns
      if (data.patterns) {
        data.patterns.forEach((pattern: LearningPattern) => {
          this.patterns.set(pattern.id, pattern);
        });
      }

      // Import preferences
      if (data.preferences) {
        data.preferences.forEach((pref: UserPreference) => {
          this.preferences.set(`${pref.category}:${pref.preference}`, pref);
        });
      }

      await this.save();
      await this.savePatterns();
      await this.savePreferences();

      this.emit("knowledgeImported", this.getStatistics());
    } catch (error) {
      logger.error("Failed to import knowledge:", error);
      throw error;
    }
  }

  public destroy() {
    this.removeAllListeners();
    logger.info("Self-learning knowledge base destroyed");
  }
}

// Export singleton instance
export const knowledgeBase = new SelfLearningKnowledgeBase();
