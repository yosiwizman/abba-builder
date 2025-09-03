import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Coins, Image, Package, Copy, Download, Rocket, Shield, Eye } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TokenConfig {
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
  name: string;
  symbol: string;
  initialSupply?: number;
  maxSupply?: number;
  decimals?: number;
  baseURI?: string;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  ownable: boolean;
  upgradeable: boolean;
}

interface GeneratedContract {
  contractCode: string;
  testCode: string;
  deploymentScript: string;
  projectPath: string;
  gasEstimate?: number;
}

interface BlockchainTokenGeneratorProps {
  embedded?: boolean;
}

export const BlockchainTokenGenerator: React.FC<BlockchainTokenGeneratorProps> = ({ embedded = false }) => {
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia');
  const [gasPrice, setGasPrice] = useState<number | null>(null);
  
  const [config, setConfig] = useState<TokenConfig>({
    tokenType: 'ERC20',
    name: '',
    symbol: '',
    initialSupply: 1000000,
    maxSupply: 10000000,
    decimals: 18,
    baseURI: '',
    mintable: true,
    burnable: true,
    pausable: false,
    ownable: true,
    upgradeable: false
  });

  // Fetch current gas prices
  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        const result = await window.electron.invoke('blockchain:estimate-gas', {
          network: selectedNetwork,
          contractType: config.tokenType
        });
        setGasPrice(result.estimatedGas);
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
      }
    };

    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [selectedNetwork, config.tokenType]);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleGenerateContract = async () => {
    if (!config.name || !config.symbol) {
      showNotification('Please provide a token name and symbol', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electron.invoke('blockchain:generate-token', config);
      setGeneratedContract(result);
      showNotification(`Your ${config.tokenType} contract has been generated successfully`, 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to generate contract', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployContract = async () => {
    if (!generatedContract) return;

    setDeploying(true);
    try {
      const result = await window.electron.invoke('blockchain:deploy-contract', {
        contractCode: generatedContract.contractCode,
        network: selectedNetwork,
        constructorArgs: {
          name: config.name,
          symbol: config.symbol,
          initialSupply: config.initialSupply,
          maxSupply: config.maxSupply
        }
      });

      showNotification(`Contract deployed to ${selectedNetwork}! Address: ${result.contractAddress}`, 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to deploy contract', 'error');
    } finally {
      setDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('Contract code copied to clipboard', 'success');
  };

  const downloadContract = () => {
    if (!generatedContract) return;
    
    const blob = new Blob([generatedContract.contractCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'Token'}.sol`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={embedded ? "" : "p-6 max-w-7xl mx-auto relative"}>
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
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          Blockchain Token Generator
        </h2>
        <p className="text-muted-foreground">
          Generate and deploy smart contracts for tokens, NFTs, and multi-tokens
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token Configuration
          </h3>

          <div className="space-y-4">
            {/* Token Type Selection */}
            <div>
              <Label>Token Type</Label>
              <Select 
                value={config.tokenType} 
                onValueChange={(value: 'ERC20' | 'ERC721' | 'ERC1155') => 
                  setConfig({...config, tokenType: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ERC20">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      ERC-20 (Fungible Token)
                    </div>
                  </SelectItem>
                  <SelectItem value="ERC721">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      ERC-721 (NFT Collection)
                    </div>
                  </SelectItem>
                  <SelectItem value="ERC1155">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      ERC-1155 (Multi-Token)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Token Name & Symbol */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Token Name</Label>
                <Input
                  placeholder="e.g., My Token"
                  value={config.name}
                  onChange={(e) => setConfig({...config, name: e.target.value})}
                />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input
                  placeholder="e.g., MTK"
                  value={config.symbol}
                  onChange={(e) => setConfig({...config, symbol: e.target.value})}
                />
              </div>
            </div>

            {/* Token-specific fields */}
            {config.tokenType === 'ERC20' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Initial Supply</Label>
                    <Input
                      type="number"
                      value={config.initialSupply}
                      onChange={(e) => setConfig({...config, initialSupply: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Max Supply</Label>
                    <Input
                      type="number"
                      value={config.maxSupply}
                      onChange={(e) => setConfig({...config, maxSupply: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Decimals</Label>
                  <Input
                    type="number"
                    value={config.decimals}
                    onChange={(e) => setConfig({...config, decimals: parseInt(e.target.value)})}
                  />
                </div>
              </>
            )}

            {(config.tokenType === 'ERC721' || config.tokenType === 'ERC1155') && (
              <>
                <div>
                  <Label>Base URI</Label>
                  <Input
                    placeholder="e.g., ipfs://QmXxx/ or https://api.example.com/"
                    value={config.baseURI}
                    onChange={(e) => setConfig({...config, baseURI: e.target.value})}
                  />
                </div>
                {config.tokenType === 'ERC721' && (
                  <div>
                    <Label>Max Supply</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 10000"
                      value={config.maxSupply}
                      onChange={(e) => setConfig({...config, maxSupply: parseInt(e.target.value)})}
                    />
                  </div>
                )}
              </>
            )}

            {/* Features */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Features</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Mintable</Label>
                  <Switch
                    checked={config.mintable}
                    onCheckedChange={(checked) => setConfig({...config, mintable: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Burnable</Label>
                  <Switch
                    checked={config.burnable}
                    onCheckedChange={(checked) => setConfig({...config, burnable: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Pausable</Label>
                  <Switch
                    checked={config.pausable}
                    onCheckedChange={(checked) => setConfig({...config, pausable: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Ownable</Label>
                  <Switch
                    checked={config.ownable}
                    onCheckedChange={(checked) => setConfig({...config, ownable: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Upgradeable</Label>
                  <Switch
                    checked={config.upgradeable}
                    onCheckedChange={(checked) => setConfig({...config, upgradeable: checked})}
                  />
                </div>
              </div>
            </div>

            {/* Network Selection */}
            <div>
              <Label>Deployment Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet">Ethereum Mainnet</SelectItem>
                  <SelectItem value="sepolia">Sepolia Testnet</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="bsc">Binance Smart Chain</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                  <SelectItem value="localhost">Local Hardhat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gas Estimate */}
            {gasPrice && (
              <Alert>
                <AlertDescription>
                  Estimated deployment cost: {gasPrice} GWEI
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleGenerateContract}
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
                    <Shield className="mr-2 h-4 w-4" />
                    Generate Contract
                  </>
                )}
              </Button>

              {generatedContract && (
                <Button 
                  onClick={handleDeployContract}
                  disabled={deploying}
                  variant="outline"
                  className="flex-1"
                >
                  {deploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy to {selectedNetwork}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Preview Panel */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Contract Preview
            </h3>
            {generatedContract && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedContract.contractCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadContract}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {generatedContract ? (
            <Tabs defaultValue="contract">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contract">Contract</TabsTrigger>
                <TabsTrigger value="tests">Tests</TabsTrigger>
                <TabsTrigger value="deploy">Deploy Script</TabsTrigger>
              </TabsList>
              <TabsContent value="contract" className="mt-4">
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
                    {generatedContract.contractCode}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
              <TabsContent value="tests" className="mt-4">
                <div className="max-h-[600px] overflow-auto rounded-lg">
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    {generatedContract.testCode}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
              <TabsContent value="deploy" className="mt-4">
                <div className="max-h-[600px] overflow-auto rounded-lg">
                  <SyntaxHighlighter
                    language="javascript"
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    {generatedContract.deploymentScript}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
              <Shield className="h-16 w-16 mb-4 opacity-20" />
              <p>Configure your token and generate the smart contract</p>
              <p className="text-sm mt-2">Preview will appear here</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BlockchainTokenGenerator;
