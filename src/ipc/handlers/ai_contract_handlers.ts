/**
 * AI Contract IPC Handlers
 * Handles IPC communication for AI-powered contract generation and Web3 app creation
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { createLoggedHandler } from './safe_handle';
import aiContractService from '../../services/ai-contract-service';
import { EnhancedAIContractService } from '../../services/enhanced-ai-contract-service';
import * as fs from 'fs-extra';
import * as path from 'path';
import { shell, dialog } from 'electron';

const logger = log.scope('ai_contract_handlers');
const handle = createLoggedHandler(logger);

export function registerAIContractHandlers() {
  logger.info('Registering AI Contract IPC handlers');
  const enhancedService = new EnhancedAIContractService();

  // Register the new ai-contract channels for the UI component
  handle('ai-contract:generate', async (_event, params: {
    prompt: string;
    template?: string;
    options?: any;
  }) => {
    logger.info('Generating contract with enhanced service');
    return await enhancedService.generateContract(params);
  });

  handle('ai-contract:analyze', async (_event, params: {
    contract: string;
    checks: string[];
  }) => {
    logger.info('Analyzing contract with enhanced service');
    return await enhancedService.analyzeContract(params);
  });

  handle('ai-contract:compile', async (_event, params: {
    contract: string;
  }) => {
    logger.info('Compiling contract with enhanced service');
    return await enhancedService.compileContract(params.contract);
  });

  // Generate smart contract from natural language (legacy)
  handle('ai:generate-contract', async (_event, params: {
    prompt: string;
    template?: string;
    options?: any;
  }): Promise<{
    success: boolean;
    contract?: string;
    error?: string;
  }> => {
    try {
      logger.info('Generating contract from prompt');
      return await aiContractService.generateContract(params);
    } catch (error: any) {
      logger.error('Failed to generate contract:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate contract'
      };
    }
  });

  // Analyze contract for security and optimizations
  handle('ai:analyze-contract', async (_event, params: {
    contract: string;
    checks: string[];
  }): Promise<{
    success: boolean;
    securityIssues?: any[];
    optimizations?: any[];
    error?: string;
  }> => {
    try {
      logger.info('Analyzing contract');
      return await aiContractService.analyzeContract(params);
    } catch (error: any) {
      logger.error('Failed to analyze contract:', error);
      return {
        success: false,
        error: error.message || 'Failed to analyze contract'
      };
    }
  });

  // Generate Web3 application
  handle('web3:generate-app', async (_event, config: any): Promise<{
    success: boolean;
    files?: string[];
    error?: string;
  }> => {
    try {
      logger.info('Generating Web3 app:', config.name);
      
      // Generate the app structure
      const result = await aiContractService.generateWeb3App(config);
      
      if (result.success) {
        // Create a directory for the app
        const userDataPath = require('electron').app.getPath('userData');
        const projectPath = path.join(userDataPath, 'generated-apps', config.name);
        await fs.ensureDir(projectPath);
        
        // Create basic project structure
        const packageJson = {
          name: config.name,
          version: '1.0.0',
          description: config.description,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            test: 'jest'
          },
          dependencies: {
            'react': '^18.2.0',
            'next': '^13.5.0',
            'ethers': '^6.7.0',
            '@rainbow-me/rainbowkit': '^1.0.0',
            'wagmi': '^1.3.0'
          }
        };
        
        await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
        
        // Create basic App component
        const appCode = generateAppComponent(config);
        await fs.ensureDir(path.join(projectPath, 'src'));
        await fs.writeFile(path.join(projectPath, 'src', 'App.tsx'), appCode);
        
        // Create README
        const readme = generateReadme(config);
        await fs.writeFile(path.join(projectPath, 'README.md'), readme);
      }
      
      return result;
    } catch (error: any) {
      logger.error('Failed to generate Web3 app:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate Web3 app'
      };
    }
  });

  // Deploy Web3 application
  handle('web3:deploy-app', async (_event, params: any): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> => {
    try {
      logger.info('Deploying Web3 app');
      return await aiContractService.deployWeb3App(params);
    } catch (error: any) {
      logger.error('Failed to deploy Web3 app:', error);
      return {
        success: false,
        error: error.message || 'Failed to deploy Web3 app'
      };
    }
  });

  // Download generated project
  handle('web3:download-project', async (_event, params: {
    config: any;
    files: string[];
  }): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> => {
    try {
      logger.info('Downloading project:', params.config.name);
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Web3 Project',
        defaultPath: params.config.name,
        buttonLabel: 'Save Project',
        properties: ['createDirectory']
      });
      
      if (!result.canceled && result.filePath) {
        const projectPath = result.filePath;
        await fs.ensureDir(projectPath);
        
        // Copy generated files to selected location
        const userDataPath = require('electron').app.getPath('userData');
        const sourcePath = path.join(userDataPath, 'generated-apps', params.config.name);
        
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, projectPath);
        }
        
        return {
          success: true,
          path: projectPath
        };
      }
      
      return {
        success: false,
        error: 'Download canceled'
      };
    } catch (error: any) {
      logger.error('Failed to download project:', error);
      return {
        success: false,
        error: error.message || 'Failed to download project'
      };
    }
  });

  // Open project in editor
  handle('web3:open-in-editor', async (_event, params: {
    config: any;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      logger.info('Opening project in editor');
      
      const userDataPath = require('electron').app.getPath('userData');
      const projectPath = path.join(userDataPath, 'generated-apps', params.config.name);
      
      if (await fs.pathExists(projectPath)) {
        // Try to open in VS Code first
        try {
          await shell.openPath(`vscode://file/${projectPath}`);
        } catch {
          // Fallback to opening the folder
          await shell.openPath(projectPath);
        }
        
        return { success: true };
      }
      
      return {
        success: false,
        error: 'Project not found'
      };
    } catch (error: any) {
      logger.error('Failed to open project in editor:', error);
      return {
        success: false,
        error: error.message || 'Failed to open project'
      };
    }
  });

  logger.info('AI Contract IPC handlers registered successfully');
}

// Helper function to generate App component
function generateAppComponent(config: any): string {
  return `import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useContract } from 'wagmi';

export default function App() {
  const { address, isConnected } = useAccount();
  
  return (
    <div className="app">
      <header>
        <h1>${config.name}</h1>
        <ConnectButton />
      </header>
      
      <main>
        ${config.features.wallet ? `
        {isConnected ? (
          <div>
            <p>Connected: {address}</p>
            {/* Your dApp content here */}
          </div>
        ) : (
          <p>Please connect your wallet to continue</p>
        )}` : ''}
        
        ${config.template === 'defi-dashboard' ? `
        <div className="dashboard">
          <h2>DeFi Dashboard</h2>
          {/* Add your DeFi components here */}
        </div>` : ''}
        
        ${config.template === 'nft-marketplace' ? `
        <div className="marketplace">
          <h2>NFT Marketplace</h2>
          {/* Add your NFT components here */}
        </div>` : ''}
      </main>
      
      <style jsx>{\`
        .app {
          min-height: 100vh;
          padding: 2rem;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        main {
          max-width: 1200px;
          margin: 0 auto;
        }
      \`}</style>
    </div>
  );
}`;
}

// Helper function to generate README
function generateReadme(config: any): string {
  return `# ${config.name}

${config.description || 'A Web3 application built with modern blockchain technologies.'}

## Features

${config.features.wallet ? '- ✅ Wallet Integration (MetaMask, WalletConnect, Coinbase)' : ''}
${config.features.ipfs ? '- ✅ IPFS Storage Integration' : ''}
${config.features.theGraph ? '- ✅ The Graph Protocol for blockchain indexing' : ''}
${config.features.notifications ? '- ✅ Push Notifications' : ''}
${config.features.analytics ? '- ✅ Analytics Dashboard' : ''}
${config.features.testing ? '- ✅ Testing Suite' : ''}

## Tech Stack

- Framework: ${config.ui.framework}
- Styling: ${config.ui.styling}
- Blockchain: ${config.blockchain.network}
- Deployment: ${config.deployment.hosting}

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- MetaMask or another Web3 wallet

### Installation

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev
\`\`\`

### Environment Variables

Create a \`.env.local\` file:

\`\`\`env
NEXT_PUBLIC_NETWORK=${config.blockchain.network}
${config.blockchain.contractAddress ? `NEXT_PUBLIC_CONTRACT_ADDRESS=${config.blockchain.contractAddress}` : ''}
${config.features.ipfs ? 'NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/' : ''}
\`\`\`

## Deployment

### Deploy to ${config.deployment.hosting}

${config.deployment.hosting === 'vercel' ? `
1. Push your code to GitHub
2. Connect your repo to Vercel
3. Deploy with one click
` : ''}

${config.deployment.hosting === 'netlify' ? `
1. Push your code to GitHub
2. Connect your repo to Netlify
3. Configure build settings
4. Deploy
` : ''}

${config.deployment.hosting === 'ipfs' ? `
1. Build the production bundle: \`npm run build\`
2. Upload to IPFS using Pinata or Infura
3. Access via IPFS gateway
` : ''}

## Smart Contracts

${config.blockchain.contractAddress ? `
Contract Address: \`${config.blockchain.contractAddress}\`
Network: ${config.blockchain.network}
` : 'Add your smart contract addresses in the .env file'}

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT
`;
}
