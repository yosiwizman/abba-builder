import React, { useState, useCallback } from 'react';
import {
  Rocket,
  Globe,
  Wallet,
  Database,
  Layout,
  Code,
  Shield,
  Package,
  CheckCircle,
  Loader,
  Download,
  Eye,
  Settings,
  Cloud,
  Link,
  Server,
  Layers,
  Palette,
  GitBranch,
  Terminal,
  FolderOpen,
  Play,
  AlertTriangle
} from 'lucide-react';

interface AppTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  stack: string[];
}

interface AppConfig {
  name: string;
  description: string;
  template: string;
  features: {
    wallet: boolean;
    ipfs: boolean;
    theGraph: boolean;
    notifications: boolean;
    analytics: boolean;
    testing: boolean;
  };
  ui: {
    framework: 'react' | 'vue' | 'angular' | 'svelte';
    styling: 'tailwind' | 'chakra' | 'material' | 'bootstrap';
    theme: 'light' | 'dark' | 'auto';
  };
  blockchain: {
    network: string;
    contractAddress?: string;
    abi?: string;
  };
  deployment: {
    hosting: 'vercel' | 'netlify' | 'ipfs' | 'fleek';
    domain?: string;
  };
}

const APP_TEMPLATES: AppTemplate[] = [
  {
    id: 'defi-dashboard',
    name: 'DeFi Dashboard',
    description: 'Analytics dashboard for DeFi protocols',
    icon: <TrendingUp className="h-5 w-5" />,
    features: ['Portfolio tracking', 'Yield farming', 'Liquidity pools', 'Price charts'],
    stack: ['React', 'ethers.js', 'TailwindCSS', 'Chart.js']
  },
  {
    id: 'nft-marketplace',
    name: 'NFT Marketplace',
    description: 'Full-featured NFT trading platform',
    icon: <Image className="h-5 w-5" />,
    features: ['Minting', 'Listing', 'Bidding', 'Collections'],
    stack: ['Next.js', 'IPFS', 'Web3.js', 'Chakra UI']
  },
  {
    id: 'dao-platform',
    name: 'DAO Platform',
    description: 'Governance and voting application',
    icon: <Users className="h-5 w-5" />,
    features: ['Proposals', 'Voting', 'Treasury', 'Delegation'],
    stack: ['React', 'Snapshot', 'ethers.js', 'Material UI']
  },
  {
    id: 'token-launchpad',
    name: 'Token Launchpad',
    description: 'ICO/IDO launch platform',
    icon: <Rocket className="h-5 w-5" />,
    features: ['Token sales', 'Vesting', 'Staking', 'KYC'],
    stack: ['Vue.js', 'Web3Modal', 'Vuetify', 'Node.js']
  },
  {
    id: 'dex-interface',
    name: 'DEX Interface',
    description: 'Decentralized exchange frontend',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    features: ['Swap', 'Liquidity', 'Farming', 'Analytics'],
    stack: ['React', 'Uniswap SDK', 'styled-components']
  },
  {
    id: 'web3-game',
    name: 'Web3 Game',
    description: 'Blockchain-based gaming platform',
    icon: <Gamepad2 className="h-5 w-5" />,
    features: ['NFT items', 'P2E mechanics', 'Tournaments', 'Marketplace'],
    stack: ['Unity WebGL', 'Moralis', 'React', 'Socket.io']
  }
];

// Import additional icons
import { TrendingUp, Image, Users, ArrowLeftRight, Gamepad2 } from 'lucide-react';

export const Web3AppGenerator: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>({
    name: '',
    description: '',
    template: '',
    features: {
      wallet: true,
      ipfs: false,
      theGraph: false,
      notifications: false,
      analytics: false,
      testing: false
    },
    ui: {
      framework: 'react',
      styling: 'tailwind',
      theme: 'dark'
    },
    blockchain: {
      network: 'ethereum'
    },
    deployment: {
      hosting: 'vercel'
    }
  });

  const [generationStep, setGenerationStep] = useState<
    'config' | 'generating' | 'generated' | 'deploying' | 'deployed'
  >('config');
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const generateApp = useCallback(async () => {
    setGenerationStep('generating');
    setCurrentProgress(0);
    setLogs([]);

    // Simulate generation process
    const steps = [
      'Initializing project structure...',
      'Setting up blockchain connections...',
      'Configuring wallet integration...',
      'Creating UI components...',
      'Adding smart contract ABIs...',
      'Setting up routing...',
      'Configuring build tools...',
      'Creating deployment scripts...',
      'Generating documentation...',
      'Finalizing project...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setLogs(prev => [...prev, steps[i]]);
      setCurrentProgress((i + 1) / steps.length * 100);
      
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const result = await window.api.invoke('web3:generate-app', config);
      
      if (result.success) {
        setGeneratedFiles(result.files || []);
        setGenerationStep('generated');
      }
    } catch (error) {
      console.error('Error generating app:', error);
      setLogs(prev => [...prev, '❌ Error generating app']);
    }
  }, [config]);

  const deployApp = useCallback(async () => {
    setGenerationStep('deploying');
    setLogs([`Deploying to ${config.deployment.hosting}...`]);

    try {
      const result = await window.api.invoke('web3:deploy-app', {
        ...config,
        files: generatedFiles
      });

      if (result.success) {
        setDeploymentUrl(result.url);
        setGenerationStep('deployed');
        setLogs(prev => [...prev, '✅ Deployment successful!']);
      }
    } catch (error) {
      console.error('Error deploying app:', error);
      setLogs(prev => [...prev, '❌ Deployment failed']);
    }
  }, [config, generatedFiles]);

  const downloadProject = useCallback(() => {
    // Trigger download of generated project
    window.api.invoke('web3:download-project', { config, files: generatedFiles });
  }, [config, generatedFiles]);

  const openInEditor = useCallback(() => {
    // Open project in VS Code or preferred editor
    window.api.invoke('web3:open-in-editor', { config });
  }, [config]);

  return (
    <div className="web3-app-generator">
      <div className="generator-container">
        {/* Header */}
        <div className="generator-header">
          <div className="header-content">
            <Rocket className="header-icon" />
            <div>
              <h2>Web3 App Generator</h2>
              <p className="header-subtitle">
                Build production-ready Web3 applications with pre-configured features
              </p>
            </div>
          </div>
        </div>

        {generationStep === 'config' && (
          <>
            {/* Template Selection */}
            <div className="section">
              <h3>Choose a Template</h3>
              <div className="templates-grid">
                {APP_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    className={`template-card ${config.template === template.id ? 'selected' : ''}`}
                    onClick={() => setConfig({ ...config, template: template.id })}
                  >
                    <div className="template-header">
                      <div className="template-icon">{template.icon}</div>
                      <h4>{template.name}</h4>
                    </div>
                    <p className="template-description">{template.description}</p>
                    <div className="template-features">
                      {template.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="feature-tag">{feature}</span>
                      ))}
                    </div>
                    <div className="template-stack">
                      {template.stack.map((tech, idx) => (
                        <span key={idx} className="stack-tag">{tech}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* App Configuration */}
            <div className="section">
              <h3>App Configuration</h3>
              <div className="config-grid">
                <div className="config-group">
                  <label htmlFor="app-name">App Name</label>
                  <input
                    id="app-name"
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="My Web3 App"
                  />
                </div>
                <div className="config-group">
                  <label htmlFor="description">Description</label>
                  <input
                    id="description"
                    type="text"
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    placeholder="A decentralized application for..."
                  />
                </div>
              </div>
            </div>

            {/* Features Selection */}
            <div className="section">
              <h3>Features</h3>
              <div className="features-grid">
                <label className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={config.features.wallet}
                    onChange={(e) => setConfig({
                      ...config,
                      features: { ...config.features, wallet: e.target.checked }
                    })}
                  />
                  <Wallet className="feature-icon" />
                  <div>
                    <span className="feature-name">Wallet Connect</span>
                    <span className="feature-desc">MetaMask, WalletConnect, Coinbase</span>
                  </div>
                </label>
                <label className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={config.features.ipfs}
                    onChange={(e) => setConfig({
                      ...config,
                      features: { ...config.features, ipfs: e.target.checked }
                    })}
                  />
                  <Cloud className="feature-icon" />
                  <div>
                    <span className="feature-name">IPFS Storage</span>
                    <span className="feature-desc">Decentralized file storage</span>
                  </div>
                </label>
                <label className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={config.features.theGraph}
                    onChange={(e) => setConfig({
                      ...config,
                      features: { ...config.features, theGraph: e.target.checked }
                    })}
                  />
                  <Database className="feature-icon" />
                  <div>
                    <span className="feature-name">The Graph</span>
                    <span className="feature-desc">Blockchain data indexing</span>
                  </div>
                </label>
                <label className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={config.features.notifications}
                    onChange={(e) => setConfig({
                      ...config,
                      features: { ...config.features, notifications: e.target.checked }
                    })}
                  />
                  <Bell className="feature-icon" />
                  <div>
                    <span className="feature-name">Push Notifications</span>
                    <span className="feature-desc">Real-time alerts</span>
                  </div>
                </label>
                <label className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={config.features.analytics}
                    onChange={(e) => setConfig({
                      ...config,
                      features: { ...config.features, analytics: e.target.checked }
                    })}
                  />
                  <BarChart3 className="feature-icon" />
                  <div>
                    <span className="feature-name">Analytics</span>
                    <span className="feature-desc">Usage tracking & insights</span>
                  </div>
                </label>
                <label className="feature-checkbox">
                  <input
                    type="checkbox"
                    checked={config.features.testing}
                    onChange={(e) => setConfig({
                      ...config,
                      features: { ...config.features, testing: e.target.checked }
                    })}
                  />
                  <Shield className="feature-icon" />
                  <div>
                    <span className="feature-name">Testing Suite</span>
                    <span className="feature-desc">Unit & integration tests</span>
                  </div>
                </label>
              </div>
            </div>

            {/* UI Configuration */}
            <div className="section">
              <h3>UI Configuration</h3>
              <div className="ui-config">
                <div className="config-group">
                  <label>Framework</label>
                  <select
                    value={config.ui.framework}
                    onChange={(e) => setConfig({
                      ...config,
                      ui: { ...config.ui, framework: e.target.value as any }
                    })}
                  >
                    <option value="react">React</option>
                    <option value="vue">Vue.js</option>
                    <option value="angular">Angular</option>
                    <option value="svelte">Svelte</option>
                  </select>
                </div>
                <div className="config-group">
                  <label>Styling</label>
                  <select
                    value={config.ui.styling}
                    onChange={(e) => setConfig({
                      ...config,
                      ui: { ...config.ui, styling: e.target.value as any }
                    })}
                  >
                    <option value="tailwind">Tailwind CSS</option>
                    <option value="chakra">Chakra UI</option>
                    <option value="material">Material UI</option>
                    <option value="bootstrap">Bootstrap</option>
                  </select>
                </div>
                <div className="config-group">
                  <label>Theme</label>
                  <select
                    value={config.ui.theme}
                    onChange={(e) => setConfig({
                      ...config,
                      ui: { ...config.ui, theme: e.target.value as any }
                    })}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Blockchain Configuration */}
            <div className="section">
              <h3>Blockchain Configuration</h3>
              <div className="blockchain-config">
                <div className="config-group">
                  <label>Network</label>
                  <select
                    value={config.blockchain.network}
                    onChange={(e) => setConfig({
                      ...config,
                      blockchain: { ...config.blockchain, network: e.target.value }
                    })}
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                    <option value="bsc">BSC</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                    <option value="avalanche">Avalanche</option>
                  </select>
                </div>
                <div className="config-group">
                  <label>Contract Address (Optional)</label>
                  <input
                    type="text"
                    value={config.blockchain.contractAddress || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      blockchain: { ...config.blockchain, contractAddress: e.target.value }
                    })}
                    placeholder="0x..."
                  />
                </div>
              </div>
            </div>

            {/* Deployment Options */}
            <div className="section">
              <h3>Deployment</h3>
              <div className="deployment-options">
                <label className={`deployment-option ${config.deployment.hosting === 'vercel' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="hosting"
                    value="vercel"
                    checked={config.deployment.hosting === 'vercel'}
                    onChange={(e) => setConfig({
                      ...config,
                      deployment: { ...config.deployment, hosting: e.target.value as any }
                    })}
                  />
                  <img src="/vercel-logo.svg" alt="Vercel" />
                  <span>Vercel</span>
                </label>
                <label className={`deployment-option ${config.deployment.hosting === 'netlify' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="hosting"
                    value="netlify"
                    checked={config.deployment.hosting === 'netlify'}
                    onChange={(e) => setConfig({
                      ...config,
                      deployment: { ...config.deployment, hosting: e.target.value as any }
                    })}
                  />
                  <img src="/netlify-logo.svg" alt="Netlify" />
                  <span>Netlify</span>
                </label>
                <label className={`deployment-option ${config.deployment.hosting === 'ipfs' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="hosting"
                    value="ipfs"
                    checked={config.deployment.hosting === 'ipfs'}
                    onChange={(e) => setConfig({
                      ...config,
                      deployment: { ...config.deployment, hosting: e.target.value as any }
                    })}
                  />
                  <Cloud className="h-8 w-8" />
                  <span>IPFS</span>
                </label>
                <label className={`deployment-option ${config.deployment.hosting === 'fleek' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="hosting"
                    value="fleek"
                    checked={config.deployment.hosting === 'fleek'}
                    onChange={(e) => setConfig({
                      ...config,
                      deployment: { ...config.deployment, hosting: e.target.value as any }
                    })}
                  />
                  <img src="/fleek-logo.svg" alt="Fleek" />
                  <span>Fleek</span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <div className="generate-section">
              <button
                className="generate-btn"
                onClick={generateApp}
                disabled={!config.name || !config.template}
              >
                <Rocket className="h-5 w-5" />
                Generate Web3 App
              </button>
            </div>
          </>
        )}

        {/* Generation Progress */}
        {generationStep === 'generating' && (
          <div className="generation-progress">
            <div className="progress-header">
              <Loader className="h-8 w-8 animate-spin" />
              <h3>Generating Your Web3 App...</h3>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${currentProgress}%` }} />
            </div>
            <div className="progress-percentage">{Math.round(currentProgress)}%</div>
            <div className="generation-logs">
              {logs.map((log, idx) => (
                <div key={idx} className="log-entry">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated App */}
        {generationStep === 'generated' && (
          <div className="generated-app">
            <div className="success-header">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h3>App Generated Successfully!</h3>
              <p>Your Web3 application is ready to deploy</p>
            </div>

            <div className="generated-info">
              <div className="info-card">
                <h4>Project Structure</h4>
                <div className="file-tree">
                  <div className="file-item">
                    <FolderOpen className="h-4 w-4" />
                    <span>{config.name}/</span>
                  </div>
                  <div className="file-item indent">
                    <FolderOpen className="h-4 w-4" />
                    <span>src/</span>
                  </div>
                  <div className="file-item indent-2">
                    <Code className="h-4 w-4" />
                    <span>App.{config.ui.framework === 'react' ? 'tsx' : 'vue'}</span>
                  </div>
                  <div className="file-item indent-2">
                    <Code className="h-4 w-4" />
                    <span>web3.config.ts</span>
                  </div>
                  <div className="file-item indent">
                    <FolderOpen className="h-4 w-4" />
                    <span>contracts/</span>
                  </div>
                  <div className="file-item indent">
                    <Code className="h-4 w-4" />
                    <span>package.json</span>
                  </div>
                  <div className="file-item indent">
                    <Code className="h-4 w-4" />
                    <span>.env.example</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h4>Next Steps</h4>
                <ol className="next-steps">
                  <li>Install dependencies: <code>npm install</code></li>
                  <li>Configure environment variables</li>
                  <li>Run development server: <code>npm run dev</code></li>
                  <li>Deploy to {config.deployment.hosting}</li>
                </ol>
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={downloadProject} className="action-btn">
                <Download className="h-4 w-4" />
                Download Project
              </button>
              <button onClick={openInEditor} className="action-btn">
                <Code className="h-4 w-4" />
                Open in Editor
              </button>
              <button onClick={deployApp} className="action-btn primary">
                <Cloud className="h-4 w-4" />
                Deploy Now
              </button>
            </div>
          </div>
        )}

        {/* Deployment Progress */}
        {generationStep === 'deploying' && (
          <div className="deployment-progress">
            <Loader className="h-8 w-8 animate-spin" />
            <h3>Deploying to {config.deployment.hosting}...</h3>
            <div className="deployment-logs">
              {logs.map((log, idx) => (
                <div key={idx} className="log-entry">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Deployment Success */}
        {generationStep === 'deployed' && (
          <div className="deployment-success">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3>Deployment Successful!</h3>
            <p>Your Web3 app is now live</p>
            <div className="deployment-url">
              <Link className="h-5 w-5" />
              <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                {deploymentUrl}
              </a>
            </div>
            <div className="deployment-actions">
              <button onClick={() => window.open(deploymentUrl, '_blank')} className="action-btn">
                <Eye className="h-4 w-4" />
                View Live App
              </button>
              <button onClick={() => navigator.clipboard.writeText(deploymentUrl)} className="action-btn">
                <Copy className="h-4 w-4" />
                Copy URL
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .web3-app-generator {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }

        .generator-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .generator-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          color: white;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
        }

        .generator-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 4px 0 0 0;
          opacity: 0.9;
        }

        .section {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .section h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .template-card {
          padding: 20px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .template-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
        }

        .template-card.selected {
          border-color: var(--accent-primary);
          background: var(--accent-primary-light);
        }

        .template-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .template-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-primary-light);
          border-radius: 10px;
        }

        .template-card h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .template-description {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .template-features {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .feature-tag {
          padding: 4px 8px;
          background: var(--bg-secondary);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .template-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .stack-tag {
          padding: 4px 8px;
          background: var(--accent-primary-light);
          color: var(--accent-primary);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .config-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .config-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .config-group input,
        .config-group select {
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
        }

        .feature-checkbox {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .feature-checkbox:hover {
          border-color: var(--accent-primary);
        }

        .feature-checkbox input[type="checkbox"] {
          width: 20px;
          height: 20px;
        }

        .feature-icon {
          width: 32px;
          height: 32px;
          color: var(--accent-primary);
        }

        .feature-checkbox div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .feature-name {
          font-size: 14px;
          font-weight: 500;
        }

        .feature-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .ui-config,
        .blockchain-config {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .deployment-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .deployment-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .deployment-option:hover {
          border-color: var(--accent-primary);
        }

        .deployment-option.selected {
          border-color: var(--accent-primary);
          background: var(--accent-primary-light);
        }

        .deployment-option input {
          display: none;
        }

        .deployment-option img {
          width: 32px;
          height: 32px;
        }

        .generate-section {
          display: flex;
          justify-content: center;
          padding: 32px 0;
        }

        .generate-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generation-progress,
        .deployment-progress {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 40px;
          text-align: center;
        }

        .progress-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .progress-header h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--bg-primary);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }

        .progress-percentage {
          font-size: 18px;
          font-weight: 600;
          color: var(--accent-primary);
          margin-bottom: 32px;
        }

        .generation-logs,
        .deployment-logs {
          text-align: left;
          max-width: 600px;
          margin: 0 auto;
        }

        .log-entry {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .generated-app,
        .deployment-success {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 40px;
        }

        .success-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .success-header h3 {
          margin: 16px 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .success-header p {
          margin: 0;
          color: var(--text-secondary);
        }

        .generated-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .info-card {
          background: var(--bg-primary);
          border-radius: 8px;
          padding: 24px;
        }

        .info-card h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .file-tree {
          font-family: monospace;
          font-size: 14px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          color: var(--text-secondary);
        }

        .file-item.indent {
          padding-left: 20px;
        }

        .file-item.indent-2 {
          padding-left: 40px;
        }

        .next-steps {
          margin: 0;
          padding-left: 20px;
        }

        .next-steps li {
          margin-bottom: 8px;
          color: var(--text-secondary);
        }

        .next-steps code {
          padding: 2px 6px;
          background: var(--bg-secondary);
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .action-btn.primary {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .deployment-url {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-primary);
          border-radius: 8px;
          margin: 24px 0;
        }

        .deployment-url a {
          color: var(--accent-primary);
          text-decoration: none;
          font-size: 16px;
        }

        .deployment-url a:hover {
          text-decoration: underline;
        }

        .deployment-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};

// Import additional icons
import { Bell, BarChart3, Copy } from 'lucide-react';

export default Web3AppGenerator;
