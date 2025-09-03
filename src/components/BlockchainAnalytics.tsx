import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Zap,
  Shield,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Wallet,
  GitBranch,
  Globe,
  Hash
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface GasPrice {
  slow: number;
  standard: number;
  fast: number;
  instant: number;
}

interface NetworkStats {
  blockNumber: number;
  gasPrice: GasPrice;
  blockTime: number;
  tps: number;
  pendingTx: number;
  networkHash: string;
}

interface TokenMetrics {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  holders: number;
  transfers24h: number;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
}

interface ContractActivity {
  address: string;
  name: string;
  txCount24h: number;
  uniqueUsers24h: number;
  gasUsed24h: number;
  lastActivity: string;
}

export const BlockchainAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [searchAddress, setSearchAddress] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    blockNumber: 18500000,
    gasPrice: {
      slow: 15,
      standard: 20,
      fast: 30,
      instant: 45
    },
    blockTime: 12.1,
    tps: 15.2,
    pendingTx: 125432,
    networkHash: '15.2 TH/s'
  });

  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics[]>([
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      name: 'USD Coin',
      symbol: 'USDC',
      totalSupply: '25,123,456,789',
      holders: 1234567,
      transfers24h: 45678,
      price: 0.9998,
      marketCap: 25123456789,
      volume24h: 5234567890,
      priceChange24h: -0.02
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      totalSupply: '5,234,567,890',
      holders: 567890,
      transfers24h: 23456,
      price: 1.0001,
      marketCap: 5234567890,
      volume24h: 1234567890,
      priceChange24h: 0.01
    },
    {
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      name: 'Chainlink',
      symbol: 'LINK',
      totalSupply: '1,000,000,000',
      holders: 234567,
      transfers24h: 12345,
      price: 6.85,
      marketCap: 6850000000,
      volume24h: 234567890,
      priceChange24h: 2.45
    }
  ]);

  const [contractActivity, setContractActivity] = useState<ContractActivity[]>([
    {
      address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      name: 'Uniswap V2 Router',
      txCount24h: 12456,
      uniqueUsers24h: 3456,
      gasUsed24h: 234567890,
      lastActivity: '2 minutes ago'
    },
    {
      address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      name: 'Uniswap V3 Router',
      txCount24h: 8234,
      uniqueUsers24h: 2345,
      gasUsed24h: 156789012,
      lastActivity: '1 minute ago'
    },
    {
      address: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
      name: 'Compound Comptroller',
      txCount24h: 456,
      uniqueUsers24h: 123,
      gasUsed24h: 34567890,
      lastActivity: '5 minutes ago'
    }
  ]);

  // Mock data for charts
  const [gasPriceHistory] = useState([
    { time: '00:00', slow: 12, standard: 18, fast: 25 },
    { time: '04:00', slow: 10, standard: 15, fast: 22 },
    { time: '08:00', slow: 15, standard: 20, fast: 28 },
    { time: '12:00', slow: 18, standard: 25, fast: 35 },
    { time: '16:00', slow: 20, standard: 28, fast: 40 },
    { time: '20:00', slow: 16, standard: 22, fast: 32 },
    { time: 'Now', slow: 15, standard: 20, fast: 30 }
  ]);

  const [tpsHistory] = useState([
    { time: '00:00', tps: 12.5 },
    { time: '04:00', tps: 10.2 },
    { time: '08:00', tps: 14.8 },
    { time: '12:00', tps: 16.3 },
    { time: '16:00', tps: 18.7 },
    { time: '20:00', tps: 15.9 },
    { time: 'Now', tps: 15.2 }
  ]);

  const [networkDistribution] = useState([
    { name: 'DeFi', value: 45, color: '#8884d8' },
    { name: 'NFT', value: 25, color: '#82ca9d' },
    { name: 'Gaming', value: 15, color: '#ffc658' },
    { name: 'DAO', value: 10, color: '#ff7c7c' },
    { name: 'Other', value: 5, color: '#8dd1e1' }
  ]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const refreshData = async () => {
    setLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update with mock data changes
      setNetworkStats(prev => ({
        ...prev,
        blockNumber: prev.blockNumber + Math.floor(Math.random() * 5) + 1,
        gasPrice: {
          slow: Math.max(10, prev.gasPrice.slow + (Math.random() - 0.5) * 2),
          standard: Math.max(15, prev.gasPrice.standard + (Math.random() - 0.5) * 3),
          fast: Math.max(20, prev.gasPrice.fast + (Math.random() - 0.5) * 5),
          instant: Math.max(30, prev.gasPrice.instant + (Math.random() - 0.5) * 8)
        },
        tps: Math.max(10, prev.tps + (Math.random() - 0.5) * 2),
        pendingTx: Math.max(0, prev.pendingTx + Math.floor((Math.random() - 0.5) * 1000))
      }));
    } finally {
      setLoading(false);
    }
  };

  const searchContract = async () => {
    if (!searchAddress) return;
    
    setLoading(true);
    try {
      // Simulate contract search
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, this would fetch contract data
      console.log('Searching for contract:', searchAddress);
    } finally {
      setLoading(false);
    }
  };

  const getGasPriceColor = (speed: string) => {
    switch(speed) {
      case 'slow': return 'text-green-500';
      case 'standard': return 'text-yellow-500';
      case 'fast': return 'text-orange-500';
      case 'instant': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blockchain Analytics Dashboard</h2>
          <p className="text-muted-foreground">Real-time blockchain metrics and contract monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="bsc">BSC</SelectItem>
              <SelectItem value="arbitrum">Arbitrum</SelectItem>
              <SelectItem value="optimism">Optimism</SelectItem>
              <SelectItem value="avalanche">Avalanche</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Block Height</p>
              <p className="text-2xl font-bold">#{networkStats.blockNumber.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">~{networkStats.blockTime}s block time</p>
            </div>
            <Hash className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Network TPS</p>
              <p className="text-2xl font-bold">{networkStats.tps.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">{networkStats.pendingTx.toLocaleString()} pending</p>
            </div>
            <Activity className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gas Price (Gwei)</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={getGasPriceColor('slow')}>{networkStats.gasPrice.slow}</span>
                <span className="text-muted-foreground">/</span>
                <span className={getGasPriceColor('standard')}>{networkStats.gasPrice.standard}</span>
                <span className="text-muted-foreground">/</span>
                <span className={getGasPriceColor('fast')}>{networkStats.gasPrice.fast}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Slow / Standard / Fast</p>
            </div>
            <Zap className="h-8 w-8 text-yellow-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Network Hash</p>
              <p className="text-2xl font-bold">{networkStats.networkHash}</p>
              <p className="text-xs text-green-500 mt-1">Network Secure</p>
            </div>
            <Shield className="h-8 w-8 text-purple-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gas Price History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Gas Price Trends (24h)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={gasPriceHistory}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="slow" stroke="#10b981" strokeWidth={2} name="Slow" />
              <Line type="monotone" dataKey="standard" stroke="#f59e0b" strokeWidth={2} name="Standard" />
              <Line type="monotone" dataKey="fast" stroke="#ef4444" strokeWidth={2} name="Fast" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* TPS History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Network TPS (24h)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={tpsHistory}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="tps" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Contract Search */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Contract Lookup</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Enter contract address (0x...)"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={searchContract} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </Card>

      {/* Top Tokens */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Tokens by Activity</h3>
          <Button variant="ghost" size="sm">
            View All
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <div className="space-y-3">
          {tokenMetrics.map((token, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {token.symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold">{token.name}</p>
                  <p className="text-sm text-muted-foreground">{token.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">${token.price.toFixed(4)}</p>
                <p className={`text-sm flex items-center justify-end gap-1 ${
                  token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {token.priceChange24h >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {Math.abs(token.priceChange24h).toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="font-semibold">${formatNumber(token.marketCap)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="font-semibold">${formatNumber(token.volume24h)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Holders</p>
                <p className="font-semibold">{formatNumber(token.holders)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Active Contracts (24h)</h3>
          <div className="space-y-3">
            {contractActivity.map((contract, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <p className="font-semibold">{contract.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Txns</p>
                    <p className="font-semibold">{formatNumber(contract.txCount24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Users</p>
                    <p className="font-semibold">{formatNumber(contract.uniqueUsers24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gas</p>
                    <p className="font-semibold">{formatNumber(contract.gasUsed24h)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Network Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Network Activity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={networkDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {networkDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Auto Refresh Settings */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto Refresh
            </Label>
            {autoRefresh && (
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10000">10 seconds</SelectItem>
                  <SelectItem value="30000">30 seconds</SelectItem>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BlockchainAnalytics;
