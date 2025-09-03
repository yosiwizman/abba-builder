import React, { useState, useCallback } from 'react';
import {
  Brain,
  Send,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  Loader,
  Code,
  FileText,
  Zap,
  Bug,
  TrendingUp,
  Lock,
  Eye,
  Settings,
  Sparkles,
  AlertCircle,
  Info,
  Rocket
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  example: string;
}

interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  line?: number;
  suggestion: string;
}

interface OptimizationSuggestion {
  title: string;
  description: string;
  gasImpact: string;
  code?: string;
}

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'token',
    name: 'Token Contract',
    description: 'ERC-20, ERC-721, or ERC-1155 tokens',
    icon: <Coins className="h-5 w-5" />,
    example: 'Create a token called "MyToken" with symbol "MTK", 1 million supply, mintable and burnable'
  },
  {
    id: 'dao',
    name: 'DAO Contract',
    description: 'Decentralized Autonomous Organization',
    icon: <Users className="h-5 w-5" />,
    example: 'Build a DAO with voting mechanism, proposal system, and treasury management'
  },
  {
    id: 'defi',
    name: 'DeFi Protocol',
    description: 'Lending, staking, or AMM protocols',
    icon: <TrendingUp className="h-5 w-5" />,
    example: 'Create a staking pool that rewards users 10% APY for locking tokens'
  },
  {
    id: 'nft',
    name: 'NFT Collection',
    description: 'NFT minting and marketplace contracts',
    icon: <Image className="h-5 w-5" />,
    example: 'Generate an NFT collection with 10,000 items, whitelist, and reveal mechanism'
  },
  {
    id: 'multisig',
    name: 'Multi-Signature Wallet',
    description: 'Secure multi-sig wallet contracts',
    icon: <Lock className="h-5 w-5" />,
    example: 'Create a 3-of-5 multisig wallet with time-locked transactions'
  },
  {
    id: 'escrow',
    name: 'Escrow Service',
    description: 'Trustless escrow contracts',
    icon: <Shield className="h-5 w-5" />,
    example: 'Build an escrow that releases funds when both parties confirm delivery'
  }
];

// Import necessary UI components
import { Coins, Users, Image } from 'lucide-react';

export const AISmartContractAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'security' | 'optimize' | 'deploy'>('code');
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'deployed' | 'error'>('idle');
  const [contractAddress, setContractAddress] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced options
  const [advancedOptions, setAdvancedOptions] = useState({
    solVersion: '0.8.19',
    optimizer: true,
    runs: 200,
    evmVersion: 'paris',
    license: 'MIT',
    upgradeable: false,
    accessControl: 'ownable'
  });

  const generateContract = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setDeploymentStatus('idle');
    
    try {
      // Send prompt to AI service
      const result = await window.electron.invoke('ai-contract:generate', {
        prompt,
        template: selectedTemplate,
        options: advancedOptions
      });

      if (result.success) {
        setGeneratedContract(result.contract);
        
        // Automatically analyze for security
        analyzeContract(result.contract);
      } else {
        console.error('Failed to generate contract:', result.error);
      }
    } catch (error) {
      console.error('Error generating contract:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedTemplate, advancedOptions]);

  const analyzeContract = useCallback(async (contract: string) => {
    setIsAnalyzing(true);
    
    try {
      const result = await window.electron.invoke('ai-contract:analyze', {
        contract,
        checks: ['security', 'gas', 'best-practices']
      });

      if (result.success) {
        setSecurityIssues(result.securityIssues || []);
        setOptimizations(result.optimizations || []);
      }
    } catch (error) {
      console.error('Error analyzing contract:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const deployContract = useCallback(async () => {
    if (!generatedContract) return;

    setDeploymentStatus('deploying');
    
    try {
      const result = await window.electron.invoke('blockchain:deploy-contract', {
        contract: generatedContract,
        network: 'testnet' // For safety, default to testnet
      });

      if (result.success) {
        setDeploymentStatus('deployed');
        setContractAddress(result.address);
      } else {
        setDeploymentStatus('error');
      }
    } catch (error) {
      console.error('Error deploying contract:', error);
      setDeploymentStatus('error');
    }
  }, [generatedContract]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generatedContract);
  }, [generatedContract]);

  const downloadContract = useCallback(() => {
    const blob = new Blob([generatedContract], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartContract.sol';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedContract]);

  const getSeverityColor = (severity: SecurityIssue['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="ai-contract-assistant">
      <div className="assistant-container">
        {/* Header */}
        <div className="assistant-header">
          <div className="header-content">
            <Brain className="header-icon" />
            <div>
              <h2>AI Smart Contract Assistant</h2>
              <p className="header-subtitle">
                Describe your smart contract in plain English and let AI generate secure, optimized code
              </p>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="template-section">
          <h3>Quick Templates</h3>
          <div className="template-grid">
            {CONTRACT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  setPrompt(template.example);
                }}
              >
                <div className="template-icon">{template.icon}</div>
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                </div>
                {selectedTemplate === template.id && (
                  <CheckCircle className="check-icon" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="prompt-section">
          <label htmlFor="prompt">Describe Your Contract</label>
          <div className="prompt-input-container">
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a token with 1 billion supply, 18 decimals, with burn and mint functions controlled by owner..."
              rows={4}
            />
            <div className="prompt-actions">
              <button
                className="advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4" />
                Advanced Options
              </button>
              <button
                className="generate-btn"
                onClick={generateContract}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Contract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="advanced-options">
            <h3>Advanced Options</h3>
            <div className="options-grid">
              <div className="option">
                <label>Solidity Version</label>
                <select
                  value={advancedOptions.solVersion}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, solVersion: e.target.value})}
                >
                  <option value="0.8.19">0.8.19 (Latest Stable)</option>
                  <option value="0.8.17">0.8.17</option>
                  <option value="0.8.0">0.8.0</option>
                </select>
              </div>
              <div className="option">
                <label>Access Control</label>
                <select
                  value={advancedOptions.accessControl}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, accessControl: e.target.value})}
                >
                  <option value="ownable">Ownable</option>
                  <option value="roles">Role-Based</option>
                  <option value="multisig">Multi-Sig</option>
                </select>
              </div>
              <div className="option">
                <label>License</label>
                <select
                  value={advancedOptions.license}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, license: e.target.value})}
                >
                  <option value="MIT">MIT</option>
                  <option value="GPL-3.0">GPL-3.0</option>
                  <option value="Apache-2.0">Apache-2.0</option>
                  <option value="UNLICENSED">Unlicensed</option>
                </select>
              </div>
              <div className="option">
                <label>
                  <input
                    type="checkbox"
                    checked={advancedOptions.optimizer}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, optimizer: e.target.checked})}
                  />
                  Enable Optimizer
                </label>
              </div>
              <div className="option">
                <label>
                  <input
                    type="checkbox"
                    checked={advancedOptions.upgradeable}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, upgradeable: e.target.checked})}
                  />
                  Upgradeable (Proxy)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Generated Contract Display */}
        {generatedContract && (
          <div className="contract-display">
            <div className="display-tabs">
              <button
                className={`tab ${activeTab === 'code' ? 'active' : ''}`}
                onClick={() => setActiveTab('code')}
              >
                <Code className="h-4 w-4" />
                Contract Code
              </button>
              <button
                className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <Shield className="h-4 w-4" />
                Security Analysis
                {securityIssues.length > 0 && (
                  <span className="badge">{securityIssues.length}</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === 'optimize' ? 'active' : ''}`}
                onClick={() => setActiveTab('optimize')}
              >
                <Zap className="h-4 w-4" />
                Optimizations
                {optimizations.length > 0 && (
                  <span className="badge">{optimizations.length}</span>
                )}
              </button>
              <button
                className={`tab ${activeTab === 'deploy' ? 'active' : ''}`}
                onClick={() => setActiveTab('deploy')}
              >
                <Rocket className="h-4 w-4" />
                Deploy
              </button>
            </div>

            <div className="display-content">
              {activeTab === 'code' && (
                <div className="code-tab">
                  <div className="code-actions">
                    <button onClick={copyToClipboard} className="action-btn">
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <button onClick={downloadContract} className="action-btn">
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                  <div className="code-container">
                    <SyntaxHighlighter
                      language="solidity"
                      style={vscDarkPlus}
                      showLineNumbers
                      customStyle={{
                        margin: 0,
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      {generatedContract}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="security-tab">
                  {isAnalyzing ? (
                    <div className="loading-state">
                      <Loader className="h-6 w-6 animate-spin" />
                      <p>Analyzing contract security...</p>
                    </div>
                  ) : securityIssues.length > 0 ? (
                    <div className="issues-list">
                      {securityIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`issue-card ${getSeverityColor(issue.severity)}`}
                        >
                          <div className="issue-header">
                            <div className="issue-title">
                              {issue.severity === 'critical' && <AlertCircle className="h-5 w-5" />}
                              {issue.severity === 'high' && <AlertTriangle className="h-5 w-5" />}
                              {issue.severity === 'medium' && <Info className="h-5 w-5" />}
                              {issue.severity === 'low' && <Info className="h-5 w-5" />}
                              <span>{issue.title}</span>
                            </div>
                            <span className="severity-badge">{issue.severity}</span>
                          </div>
                          <p className="issue-description">{issue.description}</p>
                          {issue.line && (
                            <p className="issue-line">Line {issue.line}</p>
                          )}
                          <div className="issue-suggestion">
                            <strong>Suggestion:</strong> {issue.suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-issues">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                      <h3>No Security Issues Found</h3>
                      <p>Your contract passed all security checks!</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'optimize' && (
                <div className="optimize-tab">
                  {optimizations.length > 0 ? (
                    <div className="optimizations-list">
                      {optimizations.map((opt, idx) => (
                        <div key={idx} className="optimization-card">
                          <div className="opt-header">
                            <h4>{opt.title}</h4>
                            <span className="gas-impact">{opt.gasImpact}</span>
                          </div>
                          <p>{opt.description}</p>
                          {opt.code && (
                            <div className="opt-code">
                              <SyntaxHighlighter
                                language="solidity"
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}
                              >
                                {opt.code}
                              </SyntaxHighlighter>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-optimizations">
                      <Zap className="h-12 w-12 text-purple-500" />
                      <h3>Contract is Well Optimized</h3>
                      <p>No additional optimizations recommended</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'deploy' && (
                <div className="deploy-tab">
                  <div className="deploy-container">
                    {deploymentStatus === 'idle' && (
                      <>
                        <h3>Deploy Your Contract</h3>
                        <p>Deploy to testnet first to ensure everything works correctly</p>
                        <div className="network-selection">
                          <label>Select Network</label>
                          <select>
                            <option>Ethereum Goerli Testnet</option>
                            <option>Polygon Mumbai Testnet</option>
                            <option>BSC Testnet</option>
                            <option disabled>Ethereum Mainnet (Coming Soon)</option>
                          </select>
                        </div>
                        <button
                          className="deploy-btn"
                          onClick={deployContract}
                        >
                          <Rocket className="h-5 w-5" />
                          Deploy Contract
                        </button>
                      </>
                    )}
                    
                    {deploymentStatus === 'deploying' && (
                      <div className="deploying-state">
                        <Loader className="h-8 w-8 animate-spin" />
                        <h3>Deploying Contract...</h3>
                        <p>This may take a few moments</p>
                      </div>
                    )}
                    
                    {deploymentStatus === 'deployed' && (
                      <div className="deployed-state">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <h3>Contract Deployed Successfully!</h3>
                        <div className="contract-address">
                          <label>Contract Address:</label>
                          <code>{contractAddress}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(contractAddress)}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <a
                          href={`https://goerli.etherscan.io/address/${contractAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-explorer"
                        >
                          View on Explorer
                          <Eye className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                    
                    {deploymentStatus === 'error' && (
                      <div className="error-state">
                        <AlertTriangle className="h-12 w-12 text-red-500" />
                        <h3>Deployment Failed</h3>
                        <p>Please check your configuration and try again</p>
                        <button
                          className="retry-btn"
                          onClick={() => setDeploymentStatus('idle')}
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .ai-contract-assistant {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }

        .assistant-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .assistant-header {
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

        .assistant-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 4px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }

        .template-section {
          margin-bottom: 32px;
        }

        .template-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .template-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-secondary);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          position: relative;
        }

        .template-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .template-card.selected {
          border-color: var(--accent-primary);
          background: var(--accent-primary-light);
        }

        .template-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-primary-light);
          border-radius: 10px;
          flex-shrink: 0;
        }

        .template-info h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .template-info p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .check-icon {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 20px;
          height: 20px;
          color: var(--success-color);
        }

        .prompt-section {
          margin-bottom: 32px;
        }

        .prompt-section label {
          display: block;
          margin-bottom: 8px;
          font-size: 16px;
          font-weight: 600;
        }

        .prompt-input-container {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid var(--border-color);
        }

        .prompt-input-container textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 16px;
        }

        .prompt-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .advanced-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .advanced-toggle:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .generate-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
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

        .advanced-options {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
          border: 1px solid var(--border-color);
        }

        .advanced-options h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .option label {
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .option select {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .option input[type="checkbox"] {
          margin-right: 8px;
        }

        .contract-display {
          background: var(--bg-secondary);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .display-tabs {
          display: flex;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
        }

        .display-tabs .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 20px;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .display-tabs .tab:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .display-tabs .tab.active {
          color: var(--accent-primary);
          background: var(--bg-secondary);
        }

        .display-tabs .tab.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-primary);
        }

        .badge {
          margin-left: 4px;
          padding: 2px 6px;
          background: var(--accent-primary);
          color: white;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .display-content {
          padding: 24px;
          min-height: 400px;
        }

        .code-tab {
          position: relative;
        }

        .code-actions {
          position: absolute;
          top: -20px;
          right: 0;
          display: flex;
          gap: 8px;
          z-index: 10;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .code-container {
          border-radius: 8px;
          overflow: hidden;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 16px;
          color: var(--text-secondary);
        }

        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .issue-card {
          padding: 16px;
          border-radius: 8px;
          border: 1px solid;
        }

        .issue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .issue-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .severity-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .issue-description {
          margin: 8px 0;
          font-size: 14px;
        }

        .issue-line {
          margin: 4px 0;
          font-size: 12px;
          font-family: monospace;
          opacity: 0.8;
        }

        .issue-suggestion {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid currentColor;
          opacity: 0.3;
          font-size: 13px;
        }

        .no-issues,
        .no-optimizations {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
        }

        .no-issues h3,
        .no-optimizations h3 {
          margin: 16px 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .no-issues p,
        .no-optimizations p {
          margin: 0;
          color: var(--text-secondary);
        }

        .optimizations-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .optimization-card {
          padding: 16px;
          background: var(--bg-primary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .opt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .opt-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .gas-impact {
          padding: 4px 8px;
          background: var(--success-light);
          color: var(--success-color);
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .optimization-card p {
          margin: 8px 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .opt-code {
          margin-top: 12px;
          border-radius: 4px;
          overflow: hidden;
        }

        .deploy-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
        }

        .deploy-container h3 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .deploy-container p {
          margin: 0 0 24px 0;
          color: var(--text-secondary);
        }

        .network-selection {
          width: 100%;
          max-width: 400px;
          margin-bottom: 24px;
        }

        .network-selection label {
          display: block;
          margin-bottom: 8px;
          text-align: left;
          font-weight: 500;
        }

        .network-selection select {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .deploy-btn {
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

        .deploy-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .deploying-state,
        .deployed-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .contract-address {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin: 16px 0;
        }

        .contract-address label {
          font-weight: 500;
        }

        .contract-address code {
          font-family: monospace;
          font-size: 14px;
        }

        .contract-address button {
          padding: 4px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .contract-address button:hover {
          color: var(--text-primary);
        }

        .view-explorer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: var(--accent-primary);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .view-explorer:hover {
          transform: translateY(-2px);
        }

        .retry-btn {
          padding: 10px 24px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
};

// Import Rocket icon
import { Rocket } from 'lucide-react';

export default AISmartContractAssistant;
