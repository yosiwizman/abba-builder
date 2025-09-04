import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Clock,
  Repeat,
  Plus,
  Minus,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  Info,
  ExternalLink,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Star,
  Trophy,
  Flame,
  Droplets,
  Battery,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter
} from 'recharts';

interface Pool {
  id: string;
  name: string;
  token0: string;
  token1: string;
  tvl: number;
  apr: number;
  volume24h: number;
  fees24h: number;
  myLiquidity?: number;
  rewards?: number;
  risk: 'low' | 'medium' | 'high';
  chain: string;
  protocol: string;
}

interface Farm {
  id: string;
  name: string;
  stakingToken: string;
  rewardToken: string;
  apr: number;
  tvl: number;
  myStake?: number;
  earned?: number;
  lockPeriod?: number;
  multiplier: number;
  endDate?: Date;
  chain: string;
}

interface Vault {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: number;
  strategy: string;
  risk: 'low' | 'medium' | 'high';
  performanceFee: number;
  withdrawalFee: number;
  myBalance?: number;
  chain: string;
}

interface Position {
  id: string;
  type: 'liquidity' | 'farming' | 'vault' | 'lending' | 'borrowing';
  protocol: string;
  asset: string;
  value: number;
  pnl: number;
  pnlPercent: number;
  apy: number;
  health?: number;
}

const MOCK_POOLS: Pool[] = [
  {
    id: '1',
    name: 'ETH/USDC',
    token0: 'ETH',
    token1: 'USDC',
    tvl: 125000000,
    apr: 24.5,
    volume24h: 8500000,
    fees24h: 25500,
    myLiquidity: 5000,
    rewards: 125,
    risk: 'low',
    chain: 'Ethereum',
    protocol: 'Uniswap V3'
  },
  {
    id: '2',
    name: 'WBTC/ETH',
    token0: 'WBTC',
    token1: 'ETH',
    tvl: 89000000,
    apr: 18.2,
    volume24h: 6200000,
    fees24h: 18600,
    myLiquidity: 3000,
    rewards: 85,
    risk: 'medium',
    chain: 'Ethereum',
    protocol: 'SushiSwap'
  },
  {
    id: '3',
    name: 'MATIC/USDC',
    token0: 'MATIC',
    token1: 'USDC',
    tvl: 45000000,
    apr: 32.8,
    volume24h: 3100000,
    fees24h: 9300,
    risk: 'medium',
    chain: 'Polygon',
    protocol: 'QuickSwap'
  }
];

const MOCK_FARMS: Farm[] = [
  {
    id: '1',
    name: 'CAKE Pool',
    stakingToken: 'CAKE',
    rewardToken: 'CAKE',
    apr: 45.2,
    tvl: 250000000,
    myStake: 1000,
    earned: 45.2,
    multiplier: 2.5,
    chain: 'BSC'
  },
  {
    id: '2',
    name: 'ETH Staking',
    stakingToken: 'ETH',
    rewardToken: 'stETH',
    apr: 4.8,
    tvl: 8900000000,
    myStake: 32,
    earned: 1.536,
    lockPeriod: 0,
    multiplier: 1,
    chain: 'Ethereum'
  }
];

const MOCK_VAULTS: Vault[] = [
  {
    id: '1',
    name: 'USDC Vault',
    asset: 'USDC',
    apy: 8.5,
    tvl: 125000000,
    strategy: 'Lending Optimizer',
    risk: 'low',
    performanceFee: 10,
    withdrawalFee: 0.1,
    myBalance: 10000,
    chain: 'Ethereum'
  },
  {
    id: '2',
    name: 'ETH Vault',
    asset: 'ETH',
    apy: 12.3,
    tvl: 89000000,
    strategy: 'Delta Neutral',
    risk: 'medium',
    performanceFee: 20,
    withdrawalFee: 0.5,
    myBalance: 5,
    chain: 'Ethereum'
  }
];

export const DeFiDashboard: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState('all');
  const [selectedProtocol, setSelectedProtocol] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMyPositions, setShowOnlyMyPositions] = useState(false);
  const [sortBy, setSortBy] = useState<'apr' | 'tvl' | 'volume'>('apr');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Portfolio metrics
  const [totalValue, setTotalValue] = useState(25842.50);
  const [totalPnL, setTotalPnL] = useState(3842.50);
  const [totalAPY, setTotalAPY] = useState(18.5);
  const [gasSpent, setGasSpent] = useState(842.30);

  // Add liquidity dialog state
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [token0Amount, setToken0Amount] = useState('');
  const [token1Amount, setToken1Amount] = useState('');

  // Stake dialog state
  const [isStakeOpen, setIsStakeOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');

  const portfolioData = [
    { name: 'Jan', value: 18000 },
    { name: 'Feb', value: 19500 },
    { name: 'Mar', value: 21000 },
    { name: 'Apr', value: 22800 },
    { name: 'May', value: 24200 },
    { name: 'Jun', value: 25842 }
  ];

  const allocationData = [
    { name: 'Liquidity', value: 12000, color: '#8884d8' },
    { name: 'Farming', value: 8000, color: '#82ca9d' },
    { name: 'Vaults', value: 4000, color: '#ffc658' },
    { name: 'Lending', value: 1842, color: '#ff7c7c' }
  ];

  const handleAddLiquidity = () => {
     console.log('Adding liquidity:', { pool: selectedPool, token0Amount, token1Amount });
    setIsAddLiquidityOpen(false);
  };

  const handleStake = () => {
     console.log('Staking:', { farm: selectedFarm, amount: stakeAmount });
    setIsStakeOpen(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="defi-dashboard p-6 space-y-6">
      {/* Header */}
      <div className="header flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">DeFi Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your DeFi positions across multiple protocols
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatNumber(totalValue)}</span>
              <Badge variant="outline" className="text-green-500">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {((totalPnL / (totalValue - totalPnL)) * 100).toFixed(2)}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              +{formatNumber(totalPnL)} all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{totalAPY}%</span>
              <Badge variant="outline" className="text-blue-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                Earning
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ~{formatNumber((totalValue * totalAPY) / 100 / 365)} daily
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">12</span>
              <Badge variant="outline">
                <Activity className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Across 5 protocols
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gas Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatNumber(gasSpent)}</span>
              <Badge variant="outline" className="text-orange-500">
                <Flame className="h-3 w-3 mr-1" />
                Fees
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pools">Liquidity Pools</TabsTrigger>
          <TabsTrigger value="farms">Yield Farms</TabsTrigger>
          <TabsTrigger value="vaults">Vaults</TabsTrigger>
          <TabsTrigger value="positions">My Positions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>Track your portfolio value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={portfolioData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Distribution across DeFi protocols</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsePieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RechartsePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Top Opportunities</CardTitle>
              <CardDescription>High yield opportunities based on your risk profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_POOLS.slice(0, 3).map((pool) => (
                  <div key={pool.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                          {pool.token0[0]}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">
                          {pool.token1[0]}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        <p className="text-sm text-muted-foreground">{pool.protocol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500">{pool.apr}% APR</p>
                      <p className="text-sm text-muted-foreground">TVL: {formatNumber(pool.tvl)}</p>
                    </div>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Liquidity
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquidity Pools Tab */}
        <TabsContent value="pools" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chains</SelectItem>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="bsc">BSC</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Protocols</SelectItem>
                    <SelectItem value="uniswap">Uniswap</SelectItem>
                    <SelectItem value="sushiswap">SushiSwap</SelectItem>
                    <SelectItem value="curve">Curve</SelectItem>
                    <SelectItem value="balancer">Balancer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apr">Highest APR</SelectItem>
                    <SelectItem value="tvl">Highest TVL</SelectItem>
                    <SelectItem value="volume">Highest Volume</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={showOnlyMyPositions} 
                    onCheckedChange={setShowOnlyMyPositions} 
                  />
                  <Label>My Positions Only</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pools List */}
          <div className="grid gap-4">
            {MOCK_POOLS.map((pool) => (
              <Card key={pool.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex -space-x-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          {pool.token0[0]}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                          {pool.token1[0]}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{pool.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary">{pool.protocol}</Badge>
                          <Badge variant="outline">{pool.chain}</Badge>
                          <span className={`text-sm ${getRiskColor(pool.risk)}`}>
                            {pool.risk} risk
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">TVL</p>
                        <p className="font-semibold">{formatNumber(pool.tvl)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">APR</p>
                        <p className="font-semibold text-green-500">{pool.apr}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">24h Volume</p>
                        <p className="font-semibold">{formatNumber(pool.volume24h)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">24h Fees</p>
                        <p className="font-semibold">{formatNumber(pool.fees24h)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pool.myLiquidity && (
                        <div className="text-right mr-4">
                          <p className="text-sm text-muted-foreground">My Liquidity</p>
                          <p className="font-semibold">{formatNumber(pool.myLiquidity)}</p>
                        </div>
                      )}
                      <Dialog open={isAddLiquidityOpen} onOpenChange={setIsAddLiquidityOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => setSelectedPool(pool)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Liquidity
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Liquidity to {pool.name}</DialogTitle>
                            <DialogDescription>
                              Provide liquidity to earn fees and rewards
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>{pool.token0} Amount</Label>
                              <Input
                                placeholder="0.0"
                                value={token0Amount}
                                onChange={(e) => setToken0Amount(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{pool.token1} Amount</Label>
                              <Input
                                placeholder="0.0"
                                value={token1Amount}
                                onChange={(e) => setToken1Amount(e.target.value)}
                              />
                            </div>
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Price Impact</AlertTitle>
                              <AlertDescription>
                                Estimated price impact: 0.05%
                              </AlertDescription>
                            </Alert>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddLiquidityOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddLiquidity}>
                              Add Liquidity
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {pool.myLiquidity && (
                        <Button variant="outline" size="sm">
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Yield Farms Tab */}
        <TabsContent value="farms" className="space-y-4">
          <div className="grid gap-4">
            {MOCK_FARMS.map((farm) => (
              <Card key={farm.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white">
                        {farm.stakingToken[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{farm.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary">{farm.chain}</Badge>
                          <Badge variant="outline">
                            {farm.multiplier}x Rewards
                          </Badge>
                          {farm.lockPeriod && (
                            <span className="text-sm text-muted-foreground">
                              <Lock className="h-3 w-3 inline mr-1" />
                              {farm.lockPeriod} days lock
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">APR</p>
                        <p className="font-semibold text-green-500">{farm.apr}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">TVL</p>
                        <p className="font-semibold">{formatNumber(farm.tvl)}</p>
                      </div>
                      {farm.myStake && (
                        <div>
                          <p className="text-sm text-muted-foreground">Earned</p>
                          <p className="font-semibold">{farm.earned} {farm.rewardToken}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {farm.myStake && (
                        <div className="text-right mr-4">
                          <p className="text-sm text-muted-foreground">Staked</p>
                          <p className="font-semibold">{farm.myStake} {farm.stakingToken}</p>
                        </div>
                      )}
                      <Dialog open={isStakeOpen} onOpenChange={setIsStakeOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedFarm(farm)}>
                            <Coins className="h-4 w-4 mr-2" />
                            Stake
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Stake in {farm.name}</DialogTitle>
                            <DialogDescription>
                              Stake your tokens to earn rewards
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Amount to Stake</Label>
                              <Input
                                placeholder="0.0"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                              />
                              <p className="text-sm text-muted-foreground">
                                Available: 100 {farm.stakingToken}
                              </p>
                            </div>
                            <Alert>
                              <Trophy className="h-4 w-4" />
                              <AlertTitle>Estimated Rewards</AlertTitle>
                              <AlertDescription>
                                ~{((parseFloat(stakeAmount) || 0) * farm.apr / 100 / 365).toFixed(4)} {farm.rewardToken} daily
                              </AlertDescription>
                            </Alert>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsStakeOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleStake}>
                              Stake Tokens
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {farm.myStake && farm.earned && farm.earned > 0 && (
                        <Button variant="outline">
                          Harvest
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Vaults Tab */}
        <TabsContent value="vaults" className="space-y-4">
          <div className="grid gap-4">
            {MOCK_VAULTS.map((vault) => (
              <Card key={vault.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{vault.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary">{vault.strategy}</Badge>
                          <Badge variant="outline">{vault.chain}</Badge>
                          <span className={`text-sm ${getRiskColor(vault.risk)}`}>
                            {vault.risk} risk
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">APY</p>
                        <p className="font-semibold text-green-500">{vault.apy}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">TVL</p>
                        <p className="font-semibold">{formatNumber(vault.tvl)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Performance Fee</p>
                        <p className="font-semibold">{vault.performanceFee}%</p>
                      </div>
                      {vault.myBalance && (
                        <div>
                          <p className="text-sm text-muted-foreground">My Balance</p>
                          <p className="font-semibold">{vault.myBalance} {vault.asset}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Deposit
                      </Button>
                      {vault.myBalance && (
                        <Button variant="outline">
                          <Minus className="h-4 w-4 mr-2" />
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>
                Monitor and manage all your DeFi positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge>Liquidity</Badge>
                      <span className="font-medium">ETH/USDC Pool</span>
                      <span className="text-sm text-muted-foreground">Uniswap V3</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Value</p>
                        <p className="font-semibold">$5,000</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PnL</p>
                        <p className="font-semibold text-green-500">+$450 (9%)</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">APR</p>
                        <p className="font-semibold">24.5%</p>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>
                  <Progress value={65} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">65% of total liquidity range</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge>Farming</Badge>
                      <span className="font-medium">CAKE Pool</span>
                      <span className="text-sm text-muted-foreground">PancakeSwap</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Staked</p>
                        <p className="font-semibold">1,000 CAKE</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Earned</p>
                        <p className="font-semibold text-green-500">45.2 CAKE</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">APR</p>
                        <p className="font-semibold">45.2%</p>
                      </div>
                      <Button variant="outline" size="sm">Harvest</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
