/**
 * Context Memory System
 * Tracks user preferences, history, and learning patterns
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

class ContextMemorySystem {
  constructor() {
    this.memoryPath = path.join(process.cwd(), "memory");
    this.ensureMemoryDirectory();
    this.activeUsers = new Map();
    this.learningModel = {
      patterns: new Map(),
      preferences: new Map(),
    };
  }

  ensureMemoryDirectory() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
  }

  getUserId() {
    // Generate or retrieve a unique user ID
    const userIdPath = path.join(this.memoryPath, "user-id.txt");

    if (fs.existsSync(userIdPath)) {
      return fs.readFileSync(userIdPath, "utf8").trim();
    }

    const userId = crypto.randomBytes(16).toString("hex");
    fs.writeFileSync(userIdPath, userId);
    return userId;
  }

  getUserProfile(userId = this.getUserId()) {
    const profilePath = path.join(this.memoryPath, `${userId}.json`);

    if (fs.existsSync(profilePath)) {
      const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
      // Migrate old profiles if needed
      return this.migrateProfile(profile);
    }

    // Create new profile with comprehensive structure
    const newProfile = {
      userId,
      created: Date.now(),
      lastActive: Date.now(),
      preferences: {
        colors: [],
        frameworks: [],
        complexity: "medium",
        style: "modern",
        deployment: {
          preferredPlatform: null,
          autoDeployEnabled: false,
          monitoringEnabled: true,
        },
        ui: {
          theme: "dark",
          language: "javascript",
          fontSize: "medium",
        },
      },
      history: [],
      projects: [],
      statistics: {
        totalProjects: 0,
        successfulProjects: 0,
        failedProjects: 0,
        favoriteTypes: {},
        averageBuildTime: 0,
        totalTokensUsed: 0,
      },
      learning: {
        skills: [],
        interests: [],
        improvements: [],
      },
      feedback: [],
    };

    this.saveUserProfile(userId, newProfile);
    return newProfile;
  }

  migrateProfile(profile) {
    // Ensure all new fields exist
    if (!profile.projects) profile.projects = [];
    if (!profile.learning)
      profile.learning = { skills: [], interests: [], improvements: [] };
    if (!profile.feedback) profile.feedback = [];
    if (!profile.preferences.deployment) {
      profile.preferences.deployment = {
        preferredPlatform: null,
        autoDeployEnabled: false,
        monitoringEnabled: true,
      };
    }
    if (!profile.preferences.ui) {
      profile.preferences.ui = {
        theme: "dark",
        language: "javascript",
        fontSize: "medium",
      };
    }
    return profile;
  }

  saveUserProfile(userId, profile) {
    const profilePath = path.join(this.memoryPath, `${userId}.json`);
    profile.lastActive = Date.now();
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  }

  recordInteraction(userId, interaction) {
    const profile = this.getUserProfile(userId);

    // Add to history with more detail
    const detailedInteraction = {
      id: crypto.randomBytes(8).toString("hex"),
      timestamp: Date.now(),
      type: interaction.type,
      request: interaction.request,
      response: interaction.response,
      success: interaction.success,
      duration: interaction.duration || 0,
      tokensUsed: interaction.tokensUsed || 0,
      metadata: interaction.metadata || {},
    };

    profile.history.push(detailedInteraction);

    // Keep only last 200 interactions for history
    if (profile.history.length > 200) {
      profile.history = profile.history.slice(-200);
    }

    // Update statistics
    profile.statistics.totalProjects++;
    if (interaction.success) {
      profile.statistics.successfulProjects++;
    } else {
      profile.statistics.failedProjects++;
    }

    // Update token usage
    if (interaction.tokensUsed) {
      profile.statistics.totalTokensUsed += interaction.tokensUsed;
    }

    // Update average build time
    if (interaction.duration) {
      const totalTime =
        profile.statistics.averageBuildTime *
        (profile.statistics.totalProjects - 1);
      profile.statistics.averageBuildTime =
        (totalTime + interaction.duration) / profile.statistics.totalProjects;
    }

    // Learn from interaction
    this.learnFromInteraction(profile, detailedInteraction);

    // Add to projects if it's a project creation
    if (interaction.type === "project" && interaction.success) {
      profile.projects.push({
        id: detailedInteraction.id,
        name:
          interaction.metadata?.projectName ||
          `Project ${profile.projects.length + 1}`,
        type: interaction.metadata?.framework || "unknown",
        created: Date.now(),
        deploymentUrl: interaction.metadata?.deploymentUrl,
        status: "active",
      });

      // Keep only last 50 projects
      if (profile.projects.length > 50) {
        profile.projects = profile.projects.slice(-50);
      }
    }

    this.saveUserProfile(userId, profile);

    // Update learning model
    this.updateLearningModel(userId, detailedInteraction);

    return detailedInteraction.id;
  }

  learnFromInteraction(profile, interaction) {
    // Learn color preferences
    if (
      interaction.metadata?.colors &&
      Array.isArray(interaction.metadata.colors)
    ) {
      profile.preferences.colors.push(...interaction.metadata.colors);
      profile.preferences.colors = this.getTopItems(
        profile.preferences.colors,
        5,
      );
    }

    // Learn framework preferences
    if (interaction.metadata?.framework) {
      profile.preferences.frameworks.push(interaction.metadata.framework);
      profile.preferences.frameworks = this.getTopItems(
        profile.preferences.frameworks,
        3,
      );

      // Update deployment preference
      if (interaction.success) {
        profile.preferences.deployment.preferredPlatform =
          this.detectDeploymentPlatform(interaction.metadata.framework);
      }
    }

    // Learn complexity preference based on success rate
    if (interaction.success && interaction.metadata?.complexity) {
      profile.preferences.complexity = interaction.metadata.complexity;
    }

    // Track project types
    if (interaction.type) {
      profile.statistics.favoriteTypes[interaction.type] =
        (profile.statistics.favoriteTypes[interaction.type] || 0) + 1;
    }

    // Learn skills and interests
    if (interaction.request) {
      const skills = this.extractSkills(interaction.request);
      profile.learning.skills = [
        ...new Set([...profile.learning.skills, ...skills]),
      ];

      const interests = this.extractInterests(interaction.request);
      profile.learning.interests = [
        ...new Set([...profile.learning.interests, ...interests]),
      ];
    }
  }

  extractSkills(text) {
    const skillKeywords = [
      "react",
      "vue",
      "angular",
      "nextjs",
      "nodejs",
      "python",
      "java",
      "typescript",
      "javascript",
      "html",
      "css",
      "tailwind",
      "bootstrap",
      "database",
      "api",
      "rest",
      "graphql",
      "authentication",
      "deployment",
    ];

    const foundSkills = [];
    const lowerText = text.toLowerCase();

    for (const skill of skillKeywords) {
      if (lowerText.includes(skill)) {
        foundSkills.push(skill);
      }
    }

    return foundSkills;
  }

  extractInterests(text) {
    const interestKeywords = {
      "e-commerce": ["shop", "store", "product", "cart", "payment"],
      social: ["chat", "message", "friend", "social", "profile"],
      productivity: ["todo", "task", "calendar", "note", "organize"],
      entertainment: ["game", "video", "music", "movie", "fun"],
      education: ["learn", "course", "tutorial", "quiz", "study"],
      business: ["dashboard", "analytics", "report", "chart", "data"],
    };

    const foundInterests = [];
    const lowerText = text.toLowerCase();

    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        foundInterests.push(interest);
      }
    }

    return foundInterests;
  }

  detectDeploymentPlatform(framework) {
    const platformMap = {
      nextjs: "vercel",
      react: "vercel",
      vue: "vercel",
      static: "vercel",
      nodejs: "vercel",
      python: "vercel",
    };

    return platformMap[framework] || "vercel";
  }

  getTopItems(items, count) {
    const counts = {};
    items.forEach((item) => {
      counts[item] = (counts[item] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map((entry) => entry[0]);
  }

  updateLearningModel(userId, interaction) {
    // Update pattern recognition
    const pattern = `${interaction.type}_${interaction.success ? "success" : "failure"}`;
    const patternCount = this.learningModel.patterns.get(pattern) || 0;
    this.learningModel.patterns.set(pattern, patternCount + 1);

    // Update preferences model
    if (interaction.metadata?.framework) {
      const prefKey = `${userId}_${interaction.metadata.framework}`;
      const prefCount = this.learningModel.preferences.get(prefKey) || 0;
      this.learningModel.preferences.set(prefKey, prefCount + 1);
    }
  }

  enhanceRequest(userId, originalRequest) {
    const profile = this.getUserProfile(userId);

    // Build enhanced context with richer information
    const context = {
      request: originalRequest,
      userPreferences: profile.preferences,
      recentHistory: profile.history.slice(-10),
      recentProjects: profile.projects.slice(-5),
      favoriteProjectTypes: Object.entries(profile.statistics.favoriteTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((entry) => entry[0]),
      skills: profile.learning.skills,
      interests: profile.learning.interests,
      successRate:
        profile.statistics.totalProjects > 0
          ? profile.statistics.successfulProjects /
            profile.statistics.totalProjects
          : 1,
    };

    // Generate enhanced prompt with intelligent suggestions
    return this.buildEnhancedPrompt(context);
  }

  buildEnhancedPrompt(context) {
    let enhanced = context.request;

    // Add user preferences intelligently
    const preferences = [];

    if (context.userPreferences.colors.length > 0) {
      preferences.push(
        `Preferred colors: ${context.userPreferences.colors.join(", ")}`,
      );
    }

    if (context.userPreferences.frameworks.length > 0) {
      preferences.push(
        `Preferred frameworks: ${context.userPreferences.frameworks.join(", ")}`,
      );
    }

    preferences.push(
      `Complexity preference: ${context.userPreferences.complexity}`,
    );
    preferences.push(`Style preference: ${context.userPreferences.style}`);

    // Add skill context
    if (context.skills.length > 0) {
      preferences.push(`User skills: ${context.skills.slice(0, 5).join(", ")}`);
    }

    // Add interest context
    if (context.interests.length > 0) {
      preferences.push(
        `User interests: ${context.interests.slice(0, 3).join(", ")}`,
      );
    }

    // Only add preferences if they're relevant to the request
    if (
      preferences.length > 0 &&
      !context.request.toLowerCase().includes("ignore preferences")
    ) {
      enhanced += `\n\n[User Context]\n${preferences.join("\n")}`;
    }

    // Add success patterns
    const successfulPatterns = context.recentHistory
      .filter((h) => h.success)
      .slice(-3);

    if (successfulPatterns.length > 0) {
      const patterns = successfulPatterns
        .map((p) => p.metadata?.framework || p.type)
        .filter(Boolean);

      if (patterns.length > 0) {
        enhanced += `\n\nRecent successful patterns: ${patterns.join(", ")}`;
      }
    }

    // Add deployment preference
    if (context.userPreferences.deployment.autoDeployEnabled) {
      enhanced += `\n\nAuto-deployment enabled for ${context.userPreferences.deployment.preferredPlatform || "Vercel"}`;
    }

    return enhanced;
  }

  getInsights(userId = this.getUserId()) {
    const profile = this.getUserProfile(userId);

    const successRate =
      profile.statistics.totalProjects > 0
        ? (
            (profile.statistics.successfulProjects /
              profile.statistics.totalProjects) *
            100
          ).toFixed(1)
        : "N/A";

    const insights = {
      summary: {
        totalProjects: profile.statistics.totalProjects,
        successRate: `${successRate}%`,
        averageBuildTime: `${Math.round(profile.statistics.averageBuildTime / 1000)}s`,
        totalTokensUsed: profile.statistics.totalTokensUsed,
        activeProjects: profile.projects.filter((p) => p.status === "active")
          .length,
      },
      preferences: {
        favoriteColors: profile.preferences.colors,
        favoriteFrameworks: profile.preferences.frameworks,
        preferredComplexity: profile.preferences.complexity,
        preferredStyle: profile.preferences.style,
        deploymentPlatform: profile.preferences.deployment.preferredPlatform,
      },
      topProjectTypes: Object.entries(profile.statistics.favoriteTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      skills: profile.learning.skills.slice(0, 10),
      interests: profile.learning.interests.slice(0, 5),
      recentProjects: profile.projects.slice(-5),
      recommendations: this.generateRecommendations(profile),
    };

    return insights;
  }

  generateRecommendations(profile) {
    const recommendations = [];

    // Recommend based on success rate
    if (
      profile.statistics.successfulProjects / profile.statistics.totalProjects <
      0.7
    ) {
      recommendations.push({
        type: "complexity",
        message:
          "Consider starting with simpler projects to improve success rate",
        action: "setComplexity:simple",
      });
    }

    // Recommend new frameworks based on skills
    const unusedFrameworks = ["react", "vue", "angular", "nextjs"].filter(
      (f) => !profile.preferences.frameworks.includes(f),
    );

    if (unusedFrameworks.length > 0) {
      recommendations.push({
        type: "framework",
        message: `Try building with ${unusedFrameworks[0]} to expand your skills`,
        action: `tryFramework:${unusedFrameworks[0]}`,
      });
    }

    // Recommend deployment if not using it
    if (!profile.preferences.deployment.autoDeployEnabled) {
      recommendations.push({
        type: "deployment",
        message: "Enable auto-deployment to instantly share your projects",
        action: "enableAutoDeployment",
      });
    }

    // Recommend based on interests
    if (
      profile.learning.interests.includes("e-commerce") &&
      !profile.projects.some((p) => p.type === "e-commerce")
    ) {
      recommendations.push({
        type: "project",
        message: "Build an e-commerce project based on your interests",
        action: "buildProject:e-commerce",
      });
    }

    return recommendations;
  }

  addFeedback(userId, feedback) {
    const profile = this.getUserProfile(userId);

    profile.feedback.push({
      timestamp: Date.now(),
      type: feedback.type || "general",
      rating: feedback.rating || 0,
      message: feedback.message,
      context: feedback.context || {},
    });

    // Keep only last 50 feedback entries
    if (profile.feedback.length > 50) {
      profile.feedback = profile.feedback.slice(-50);
    }

    // Learn from feedback
    if (feedback.type === "improvement" && feedback.message) {
      profile.learning.improvements.push(feedback.message);
    }

    this.saveUserProfile(userId, profile);
  }

  exportUserData(userId = this.getUserId()) {
    const profile = this.getUserProfile(userId);
    const exportPath = path.join(
      this.memoryPath,
      `export_${userId}_${Date.now()}.json`,
    );

    const exportData = {
      profile,
      insights: this.getInsights(userId),
      exportDate: new Date().toISOString(),
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    return exportPath;
  }

  clearUserData(userId = this.getUserId()) {
    const profilePath = path.join(this.memoryPath, `${userId}.json`);

    if (fs.existsSync(profilePath)) {
      // Create backup before clearing
      const backupPath = path.join(
        this.memoryPath,
        `backup_${userId}_${Date.now()}.json`,
      );
      fs.copyFileSync(profilePath, backupPath);

      // Create fresh profile
      const newProfile = this.getUserProfile("temp");
      newProfile.userId = userId;

      this.saveUserProfile(userId, newProfile);

      console.log(`User data cleared. Backup saved to ${backupPath}`);
    }
  }
}

export default ContextMemorySystem;




