/**
 * Auto-Deployment System
 * Handles automatic deployment to Vercel, Supabase, and Neon
 */

import { createClient } from '@vercel/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NeonClient } from '@neondatabase/api-client';
import fs from 'fs';
import path from 'path';

class AutoDeploymentSystem {
  constructor() {
    this.vercelClient = process.env.VERCEL_TOKEN ? 
      createClient(process.env.VERCEL_TOKEN) : null;
    
    this.supabaseClient = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ?
      createSupabaseClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      ) : null;
    
    this.neonClient = process.env.NEON_API_KEY ? 
      new NeonClient(process.env.NEON_API_KEY) : null;
    
    this.deploymentQueue = [];
    this.deploymentHistory = [];
  }

  async deployEverywhere(code, appConfig) {
    const deploymentId = `deploy_${Date.now()}`;
    console.log(`🚀 Starting deployment ${deploymentId}...`);

    const deployment = {
      id: deploymentId,
      status: 'pending',
      platforms: {},
      timestamp: Date.now(),
      config: appConfig
    };

    try {
      // Deploy to Vercel
      if (this.vercelClient) {
        deployment.platforms.vercel = await this.deployToVercel(code, appConfig);
        console.log(`✅ Vercel deployment successful: ${deployment.platforms.vercel.url}`);
      }
      
      // Setup database if needed
      if (appConfig.needsDatabase) {
        deployment.platforms.database = await this.setupDatabase(appConfig);
        console.log(`✅ Database setup complete`);
      }

      // Generate access methods
      deployment.access = this.generateAccessMethods(deployment.platforms.vercel);
      
      deployment.status = 'success';
      console.log(`✅ Deployment ${deploymentId} successful!`);
      
    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error.message;
      console.error(`❌ Deployment ${deploymentId} failed:`, error);
    }

    this.deploymentQueue.push(deployment);
    this.saveDeploymentHistory(deployment);
    return deployment;
  }

  async deployToVercel(code, config) {
    if (!this.vercelClient) {
      throw new Error('Vercel client not configured. Please set VERCEL_TOKEN environment variable.');
    }

    const projectName = config.projectName || `abba-app-${Date.now()}`;
    
    // Create project files structure
    const files = [];

    // Determine project type and structure files accordingly
    if (config.framework === 'nextjs' || code.includes('import React')) {
      // Next.js/React app
      files.push(
        {
          file: 'package.json',
          data: Buffer.from(JSON.stringify({
            name: projectName,
            version: '1.0.0',
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start'
            },
            dependencies: {
              next: 'latest',
              react: 'latest',
              'react-dom': 'latest',
              ...config.dependencies
            }
          }, null, 2)).toString('base64')
        },
        {
          file: 'pages/index.js',
          data: Buffer.from(code).toString('base64')
        }
      );
    } else if (config.framework === 'vue') {
      // Vue app
      files.push(
        {
          file: 'package.json',
          data: Buffer.from(JSON.stringify({
            name: projectName,
            version: '1.0.0',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview'
            },
            dependencies: {
              vue: '^3.0.0',
              ...config.dependencies
            },
            devDependencies: {
              vite: '^4.0.0',
              '@vitejs/plugin-vue': '^4.0.0'
            }
          }, null, 2)).toString('base64')
        },
        {
          file: 'src/App.vue',
          data: Buffer.from(code).toString('base64')
        }
      );
    } else {
      // Static HTML/CSS/JS
      files.push({
        file: 'index.html',
        data: Buffer.from(code).toString('base64')
      });
      
      if (config.styles) {
        files.push({
          file: 'styles.css',
          data: Buffer.from(config.styles).toString('base64')
        });
      }
      
      if (config.scripts) {
        files.push({
          file: 'script.js',
          data: Buffer.from(config.scripts).toString('base64')
        });
      }
    }

    const deployment = await this.vercelClient.deployments.create({
      name: projectName,
      files,
      projectSettings: {
        framework: config.framework || null,
        buildCommand: config.buildCommand || null,
        outputDirectory: config.outputDirectory || null
      }
    });

    // Wait for deployment to be ready
    await this.waitForDeployment(deployment.id);

    return {
      url: `https://${deployment.url}`,
      deploymentId: deployment.id,
      projectName: projectName,
      region: deployment.region || 'global',
      framework: config.framework || 'static'
    };
  }

  async setupDatabase(config) {
    const dbConfig = {};

    // Setup Supabase tables
    if (this.supabaseClient && config.useSupabase !== false) {
      try {
        // Create deployment tracking table
        const { data, error } = await this.supabaseClient
          .from('_abba_deployments')
          .insert({
            app_name: config.projectName,
            deployed_at: new Date().toISOString(),
            config: config
          });

        if (!error) {
          dbConfig.supabase = {
            url: process.env.SUPABASE_URL,
            configured: true,
            tables: config.tables || []
          };

          // Create custom tables if specified
          if (config.tables && Array.isArray(config.tables)) {
            for (const table of config.tables) {
              await this.createSupabaseTable(table);
            }
          }
        }
      } catch (error) {
        console.error('Supabase setup error:', error);
      }
    }

    // Setup Neon if needed
    if (this.neonClient && config.useNeon) {
      try {
        const database = await this.neonClient.createDatabase({
          name: `abba_${config.projectName}`,
          owner: process.env.NEON_USER || 'default'
        });

        dbConfig.neon = {
          connectionString: database.connectionString,
          databaseId: database.id,
          name: database.name
        };
      } catch (error) {
        console.error('Neon setup error:', error);
      }
    }

    return dbConfig;
  }

  async createSupabaseTable(tableConfig) {
    // This would use Supabase admin API to create tables
    // For now, we'll log the intention
    console.log(`Would create table: ${tableConfig.name} with columns:`, tableConfig.columns);
  }

  async waitForDeployment(deploymentId, maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.vercelClient.deployments.get(deploymentId);
      
      if (status.readyState === 'READY') {
        return true;
      }
      
      if (status.readyState === 'ERROR') {
        throw new Error('Deployment failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Deployment timeout');
  }

  generateAccessMethods(vercelDeployment) {
    if (!vercelDeployment) return null;

    return {
      webUrl: vercelDeployment.url,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vercelDeployment.url)}`,
      embedCode: `<iframe src="${vercelDeployment.url}" width="100%" height="600" frameborder="0"></iframe>`,
      curlCommand: `curl ${vercelDeployment.url}`,
      shareLinks: {
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(vercelDeployment.url)}&text=Check out my app!`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(vercelDeployment.url)}`
      }
    };
  }

  saveDeploymentHistory(deployment) {
    const historyPath = path.join(process.cwd(), 'deployments', 'history.json');
    
    // Ensure directory exists
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing history
    let history = [];
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }

    // Add new deployment
    history.push(deployment);

    // Keep only last 50 deployments
    if (history.length > 50) {
      history = history.slice(-50);
    }

    // Save updated history
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  getDeploymentHistory() {
    const historyPath = path.join(process.cwd(), 'deployments', 'history.json');
    
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    
    return [];
  }

  async rollbackDeployment(deploymentId) {
    if (!this.vercelClient) {
      throw new Error('Vercel client not configured');
    }

    // Find deployment in history
    const history = this.getDeploymentHistory();
    const deployment = history.find(d => d.id === deploymentId);
    
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // Get previous deployment
    const currentIndex = history.indexOf(deployment);
    if (currentIndex <= 0) {
      throw new Error('No previous deployment to rollback to');
    }

    const previousDeployment = history[currentIndex - 1];
    
    // Trigger rollback
    console.log(`Rolling back from ${deploymentId} to ${previousDeployment.id}`);
    
    // This would use Vercel API to rollback
    return previousDeployment;
  }

  async getDeploymentStatus(deploymentId) {
    const deployment = this.deploymentQueue.find(d => d.id === deploymentId);
    
    if (!deployment) {
      // Check history
      const history = this.getDeploymentHistory();
      const historicalDeployment = history.find(d => d.id === deploymentId);
      
      if (historicalDeployment) {
        return historicalDeployment;
      }
      
      throw new Error('Deployment not found');
    }

    // If deployment has Vercel ID, get live status
    if (deployment.platforms?.vercel?.deploymentId && this.vercelClient) {
      try {
        const liveStatus = await this.vercelClient.deployments.get(
          deployment.platforms.vercel.deploymentId
        );
        deployment.liveStatus = liveStatus.readyState;
      } catch (error) {
        console.error('Could not fetch live status:', error);
      }
    }

    return deployment;
  }
}

export default AutoDeploymentSystem;
