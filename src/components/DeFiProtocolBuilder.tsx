import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap,
  ArrowRightLeft,
  Droplets,
  Percent,
  Vote,
  Code,
  AlertTriangle
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DeFiProtocol {
  type: 'AMM' | 'LENDING' | 'YIELD' | 'DAO';
  name: string;
  features: string[];
  parameters: any;
}

interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  gasEstimate: string;
  audited: boolean;
}

export const DeFiProtocolBuilder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolTemplate | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [config, setConfig] = useState({
    protocolName: '',
    tokenA: '',
    tokenB: '',
    swapFee: 0.3,
    liquidityIncentive: 1,
    collateralFactor: 75,
    liquidationPenalty: 10,
    borrowRate: 5,
    supplyRate: 2,
    proposalThreshold: 100,
    votingPeriod: 3,
    quorum: 4
  });

  const protocolTemplates: ProtocolTemplate[] = [
    {
      id: 'uniswap-amm',
      name: 'Uniswap-Style AMM',
      description: 'Automated Market Maker with constant product formula (x*y=k)',
      icon: <ArrowRightLeft className="h-5 w-5" />,
      features: ['Token Swapping', 'Liquidity Pools', 'LP Tokens', 'Price Oracles'],
      complexity: 'Intermediate',
      gasEstimate: '~3M gas',
      audited: true
    },
    {
      id: 'compound-lending',
      name: 'Compound-Style Lending',
      description: 'Decentralized lending protocol with algorithmic interest rates',
      icon: <Percent className="h-5 w-5" />,
      features: ['Supply & Borrow', 'cTokens', 'Interest Models', 'Liquidations'],
      complexity: 'Advanced',
      gasEstimate: '~5M gas',
      audited: true
    },
    {
      id: 'curve-stable',
      name: 'Curve-Style StableSwap',
      description: 'Optimized AMM for stable assets with low slippage',
      icon: <TrendingUp className="h-5 w-5" />,
      features: ['Stable Swaps', 'Low Slippage', 'Multi-Asset Pools', 'Amplification'],
      complexity: 'Advanced',
      gasEstimate: '~4M gas',
      audited: true
    },
    {
      id: 'yearn-vault',
      name: 'Yearn-Style Vault',
      description: 'Automated yield farming strategies',
      icon: <Droplets className="h-5 w-5" />,
      features: ['Auto-Compounding', 'Strategy Rotation', 'Vault Shares', 'Performance Fees'],
      complexity: 'Advanced',
      gasEstimate: '~4M gas',
      audited: false
    },
    {
      id: 'aave-flash',
      name: 'Flash Loan Protocol',
      description: 'Uncollateralized loans within single transaction',
      icon: <Zap className="h-5 w-5" />,
      features: ['Flash Loans', 'Zero Collateral', 'Arbitrage', 'Liquidations'],
      complexity: 'Intermediate',
      gasEstimate: '~2M gas',
      audited: true
    },
    {
      id: 'maker-dao',
      name: 'MakerDAO-Style CDP',
      description: 'Collateralized Debt Positions for stablecoin minting',
      icon: <DollarSign className="h-5 w-5" />,
      features: ['CDP Creation', 'Stablecoin Minting', 'Liquidations', 'Governance'],
      complexity: 'Advanced',
      gasEstimate: '~6M gas',
      audited: true
    },
    {
      id: 'governance-dao',
      name: 'Governor DAO',
      description: 'On-chain governance with proposals and voting',
      icon: <Vote className="h-5 w-5" />,
      features: ['Proposals', 'Voting', 'Timelock', 'Delegation'],
      complexity: 'Intermediate',
      gasEstimate: '~3M gas',
      audited: true
    },
    {
      id: 'staking-rewards',
      name: 'Staking Rewards',
      description: 'Token staking with reward distribution',
      icon: <Users className="h-5 w-5" />,
      features: ['Staking', 'Rewards', 'Lock Periods', 'Boost Multipliers'],
      complexity: 'Beginner',
      gasEstimate: '~1.5M gas',
      audited: false
    }
  ];

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const generateProtocol = async () => {
    if (!selectedProtocol) {
      showNotification('Please select a protocol template', 'error');
      return;
    }

    if (!config.protocolName) {
      showNotification('Please provide a protocol name', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electron.invoke('blockchain:generate-defi', {
        template: selectedProtocol.id,
        config: config
      });

      setGeneratedCode(result.contractCode);
      showNotification(`${selectedProtocol.name} protocol generated successfully!`, 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to generate protocol', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deployProtocol = async () => {
    if (!generatedCode) {
      showNotification('Please generate a protocol first', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electron.invoke('blockchain:deploy-contract', {
        contractCode: generatedCode,
        network: 'localhost',
        type: 'defi'
      });

      showNotification(`Protocol deployed! Address: ${result.contractAddress}`, 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to deploy protocol', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProtocolIcon = (type: string) => {
    switch(type) {
      case 'uniswap-amm': return <ArrowRightLeft className="h-8 w-8" />;
      case 'compound-lending': return <Percent className="h-8 w-8" />;
      case 'curve-stable': return <TrendingUp className="h-8 w-8" />;
      case 'yearn-vault': return <Droplets className="h-8 w-8" />;
      case 'aave-flash': return <Zap className="h-8 w-8" />;
      case 'maker-dao': return <DollarSign className="h-8 w-8" />;
      case 'governance-dao': return <Vote className="h-8 w-8" />;
      case 'staking-rewards': return <Users className="h-8 w-8" />;
      default: return <Shield className="h-8 w-8" />;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch(complexity) {
      case 'Beginner': return 'text-green-500';
      case 'Intermediate': return 'text-yellow-500';
      case 'Advanced': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-opacity ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
          DeFi Protocol Builder
        </h2>
        <p className="text-muted-foreground">
          Build production-ready DeFi protocols with battle-tested templates
        </p>
      </div>

      {/* Protocol Templates Grid */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Select Protocol Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {protocolTemplates.map((template) => (
            <Card
              key={template.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                selectedProtocol?.id === template.id ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => setSelectedProtocol(template)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900">
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium ${getComplexityColor(template.complexity)}`}>
                      {template.complexity}
                    </span>
                    {template.audited && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                        Audited
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{template.gasEstimate}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedProtocol && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protocol Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <Label>Protocol Name</Label>
                <Input
                  placeholder="e.g., MyDeFi Protocol"
                  value={config.protocolName}
                  onChange={(e) => setConfig({...config, protocolName: e.target.value})}
                />
              </div>

              {/* Protocol-specific configuration */}
              {(selectedProtocol.id === 'uniswap-amm' || selectedProtocol.id === 'curve-stable') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Token A Symbol</Label>
                      <Input
                        placeholder="e.g., USDC"
                        value={config.tokenA}
                        onChange={(e) => setConfig({...config, tokenA: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Token B Symbol</Label>
                      <Input
                        placeholder="e.g., DAI"
                        value={config.tokenB}
                        onChange={(e) => setConfig({...config, tokenB: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Swap Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.swapFee}
                      onChange={(e) => setConfig({...config, swapFee: parseFloat(e.target.value)})}
                    />
                  </div>
                </>
              )}

              {selectedProtocol.id === 'compound-lending' && (
                <>
                  <div>
                    <Label>Collateral Factor (%)</Label>
                    <Input
                      type="number"
                      value={config.collateralFactor}
                      onChange={(e) => setConfig({...config, collateralFactor: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Borrow Rate (%)</Label>
                      <Input
                        type="number"
                        value={config.borrowRate}
                        onChange={(e) => setConfig({...config, borrowRate: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>Supply Rate (%)</Label>
                      <Input
                        type="number"
                        value={config.supplyRate}
                        onChange={(e) => setConfig({...config, supplyRate: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Liquidation Penalty (%)</Label>
                    <Input
                      type="number"
                      value={config.liquidationPenalty}
                      onChange={(e) => setConfig({...config, liquidationPenalty: parseInt(e.target.value)})}
                    />
                  </div>
                </>
              )}

              {selectedProtocol.id === 'governance-dao' && (
                <>
                  <div>
                    <Label>Proposal Threshold (tokens)</Label>
                    <Input
                      type="number"
                      value={config.proposalThreshold}
                      onChange={(e) => setConfig({...config, proposalThreshold: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Voting Period (days)</Label>
                    <Input
                      type="number"
                      value={config.votingPeriod}
                      onChange={(e) => setConfig({...config, votingPeriod: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Quorum (%)</Label>
                    <Input
                      type="number"
                      value={config.quorum}
                      onChange={(e) => setConfig({...config, quorum: parseInt(e.target.value)})}
                    />
                  </div>
                </>
              )}

              {/* Features */}
              <div>
                <Label>Key Features</Label>
                <div className="mt-2 space-y-1">
                  {selectedProtocol.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Warning */}
              {!selectedProtocol.audited && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This template has not been audited. Use with caution in production.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={generateProtocol}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Code className="mr-2 h-4 w-4" />
                      Generate Protocol
                    </>
                  )}
                </Button>

                {generatedCode && (
                  <Button 
                    onClick={deployProtocol}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Deploy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Code Preview Panel */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Code className="h-5 w-5" />
              Generated Protocol
            </h3>

            {generatedCode ? (
              <div className="max-h-[600px] overflow-auto rounded-lg">
                <SyntaxHighlighter
                  language="solidity"
                  style={vscDarkPlus}
                  showLineNumbers
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {generatedCode}
                </SyntaxHighlighter>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                {getProtocolIcon(selectedProtocol.id)}
                <p className="mt-4">Configure and generate your {selectedProtocol.name}</p>
                <p className="text-sm mt-2">The contract code will appear here</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default DeFiProtocolBuilder;
