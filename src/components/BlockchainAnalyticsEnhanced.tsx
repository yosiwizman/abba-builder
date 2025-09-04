import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign,
  Database, Users, AlertTriangle, Download, Calendar,
  RefreshCw, Settings, Eye, Shield, Zap, Link,
  BarChart3, PieChart as PieChartIcon, Clock,
  FileDown, Filter, ChevronDown, Search
} from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface NetworkStats {
  blockHeight: number;
  gasPrice: {
    slow: string;
    standard: string;
    fast: string;
    baseFee?: string;
  };
  tps: number;
  pendingTxCount: number;
  blockTime: number;
  lastBlock: {
    number: number;
    timestamp: number;
    transactions: number;
    gasUsed: string;
    gasLimit: string;
  };
}

interface TokenMetrics {
  address: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  holders?: number;
}

interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  token?: {
    name: string;
    symbol: string;
  };
  timestamp: number;
  usdValue?: number;
}

interface DeFiProtocol {
  protocol: string;
  tvl: number;
  tvlChange24h: number;
  volume24h: number;
  fees24h: number;
  apy?: number;
  users24h?: number;
}

interface MEVData {
  blockNumber: number;
  mevReward: string;
  bundleCount: number;
  profitableArbs: number;
  sandwichAttacks: number;
  liquidations: number;
  totalProfit: string;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
const NETWORKS = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche'];

// Time range presets
const TIME_RANGES = [
  { label: '1H', value: 'hour', duration: 3600000 },
  { label: '24H', value: 'day', duration: 86400000 },
  { label: '7D', value: 'week', duration: 604800000 },
  { label: '30D', value: 'month', duration: 2592000000 },
  { label: 'Custom', value: 'custom', duration: 0 }
];

export const BlockchainAnalyticsEnhanced: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [gasPriceHistory, setGasPriceHistory] = useState<any[]>([]);
  const [tpsHistory, setTpsHistory] = useState<any[]>([]);
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics[]>([]);
  const [whaleTransactions, setWhaleTransactions] = useState<WhaleTransaction[]>([]);
  const [defiProtocols, setDefiProtocols] = useState<DeFiProtocol[]>([]);
  const [mevData, setMevData] = useState<MEVData[]>([]);
  const [contractActivity, setContractActivity] = useState<any[]>([]);
  
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [selectedTimeRange, setSelectedTimeRange] = useState('day');
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch network statistics
  const fetchNetworkStats = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-stats', selectedNetwork);
      if (result?.success) {
        setNetworkStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch network stats:', err);
    }
  }, [selectedNetwork]);

  // Fetch gas price history
  const fetchGasPriceHistory = useCallback(async () => {
    try {
      const timeRange = getTimeRange();
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-historical-data', {
        network: selectedNetwork,
        metric: 'gasPrice',
        timeRange
      });
      if (result?.success) {
        setGasPriceHistory(result.data.map((d: any) => ({
          time: new Date(d.timestamp).toLocaleTimeString(),
          value: d.value
        })));
      }
    } catch (err) {
      console.error('Failed to fetch gas price history:', err);
    }
  }, [selectedNetwork, selectedTimeRange, customDateRange]);

  // Fetch TPS history
  const fetchTpsHistory = useCallback(async () => {
    try {
      const timeRange = getTimeRange();
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-historical-data', {
        network: selectedNetwork,
        metric: 'tps',
        timeRange
      });
      if (result?.success) {
        setTpsHistory(result.data.map((d: any) => ({
          time: new Date(d.timestamp).toLocaleTimeString(),
          value: d.value
        })));
      }
    } catch (err) {
      console.error('Failed to fetch TPS history:', err);
    }
  }, [selectedNetwork, selectedTimeRange, customDateRange]);

  // Fetch token metrics
  const fetchTokenMetrics = useCallback(async () => {
    try {
      const addresses = [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'  // WBTC
      ];
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-token-metrics', {
        network: selectedNetwork,
        addresses
      });
      if (result?.success) {
        setTokenMetrics(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch token metrics:', err);
    }
  }, [selectedNetwork]);

  // Fetch whale transactions
  const fetchWhaleTransactions = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-whale-transactions', {
        network: selectedNetwork,
        minValue: 1000000
      });
      if (result?.success) {
        setWhaleTransactions(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch whale transactions:', err);
    }
  }, [selectedNetwork]);

  // Fetch DeFi protocols
  const fetchDeFiProtocols = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-defi-metrics', selectedNetwork);
      if (result.success) {
        setDefiProtocols(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch DeFi metrics:', err);
    }
  }, [selectedNetwork]);

  // Fetch MEV data
  const fetchMEVData = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-mev-data', {
        network: selectedNetwork
      });
      if (result.success) {
        setMevData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch MEV data:', err);
    }
  }, [selectedNetwork]);

  // Fetch contract activity
  const fetchContractActivity = useCallback(async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:get-contract-activity', {
        network: selectedNetwork,
        limit: 10
      });
      if (result.success) {
        setContractActivity(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch contract activity:', err);
    }
  }, [selectedNetwork]);

  // Get time range for API calls
  const getTimeRange = () => {
    if (selectedTimeRange === 'custom') {
      return {
        start: customDateRange.start,
        end: customDateRange.end,
        interval: 'hour' as const
      };
    }
    
    const range = TIME_RANGES.find(r => r.value === selectedTimeRange);
    const end = new Date().toISOString();
    const start = new Date(Date.now() - (range?.duration || 86400000)).toISOString();
    
    return {
      start,
      end,
      interval: selectedTimeRange === 'hour' ? 'hour' as const : 
                selectedTimeRange === 'week' ? 'day' as const : 'hour' as const
    };
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchNetworkStats(),
        fetchGasPriceHistory(),
        fetchTpsHistory(),
        fetchTokenMetrics(),
        fetchWhaleTransactions(),
        fetchDeFiProtocols(),
        fetchMEVData(),
        fetchContractActivity()
      ]);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    fetchNetworkStats,
    fetchGasPriceHistory,
    fetchTpsHistory,
    fetchTokenMetrics,
    fetchWhaleTransactions,
    fetchDeFiProtocols,
    fetchMEVData,
    fetchContractActivity
  ]);

  // Export data
  const exportData = async (format: 'csv' | 'json') => {
    try {
      const dataToExport = {
        networkStats,
        gasPriceHistory,
        tpsHistory,
        tokenMetrics,
        whaleTransactions,
        defiProtocols,
        mevData,
        contractActivity,
        metadata: {
          network: selectedNetwork,
          timeRange: selectedTimeRange,
          exportedAt: new Date().toISOString()
        }
      };

      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.invoke('blockchain:export-data', {
        data: dataToExport,
        format,
        filename: `blockchain-analytics-${selectedNetwork}-${Date.now()}.${format}`
      });

      if (result.success && result.content) {
        // Create download link
        const blob = new Blob([result.content], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blockchain-analytics-${selectedNetwork}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      fetchAllData();
      refreshIntervalRef.current = setInterval(fetchAllData, refreshInterval);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchAllData]);

  // Fetch data on network or time range change
  useEffect(() => {
    fetchAllData();
  }, [selectedNetwork, selectedTimeRange, customDateRange]);

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="blockchain-analytics-enhanced">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-left">
          <h2>
            <Activity className="inline-icon" />
            Blockchain Analytics
          </h2>
          <select 
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="network-selector"
          >
            {NETWORKS.map(network => (
              <option key={network} value={network}>
                {network.charAt(0).toUpperCase() + network.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="header-controls">
          {/* Time Range Selector */}
          <div className="time-range-selector">
            {TIME_RANGES.map(range => (
              <button
                key={range.value}
                className={`time-range-btn ${selectedTimeRange === range.value ? 'active' : ''}`}
                onClick={() => setSelectedTimeRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {selectedTimeRange === 'custom' && (
            <div className="custom-date-range">
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
              />
              <span>to</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
              />
            </div>
          )}

          {/* Export Buttons */}
          <div className="export-controls">
            <button onClick={() => exportData('json')} className="export-btn">
              <FileDown size={16} />
              JSON
            </button>
            <button onClick={() => exportData('csv')} className="export-btn">
              <FileDown size={16} />
              CSV
            </button>
          </div>

          {/* Auto Refresh */}
          <div className="refresh-controls">
            <button
              className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw size={16} className={autoRefresh ? 'spinning' : ''} />
              Auto Refresh
            </button>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="refresh-interval"
              >
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            )}
          </div>

          <button onClick={fetchAllData} className="refresh-btn" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} />
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'whale' ? 'active' : ''}`}
          onClick={() => setActiveTab('whale')}
        >
          <Eye size={16} />
          Whale Tracking
        </button>
        <button
          className={`tab ${activeTab === 'defi' ? 'active' : ''}`}
          onClick={() => setActiveTab('defi')}
        >
          <DollarSign size={16} />
          DeFi Analytics
        </button>
        <button
          className={`tab ${activeTab === 'mev' ? 'active' : ''}`}
          onClick={() => setActiveTab('mev')}
        >
          <Zap size={16} />
          MEV Analysis
        </button>
        <button
          className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          <Database size={16} />
          Token Metrics
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Network Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Block Height</span>
                  <Database className="stat-icon" />
                </div>
                <div className="stat-value">
                  {networkStats ? `#${networkStats.blockHeight.toLocaleString()}` : '-'}
                </div>
                <div className="stat-change positive">
                  Block Time: {networkStats?.blockTime}s
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Gas Price (Gwei)</span>
                  <Activity className="stat-icon" />
                </div>
                <div className="stat-value">
                  {networkStats?.gasPrice.standard || '-'}
                </div>
                <div className="stat-subvalues">
                  <span className="slow">Slow: {networkStats?.gasPrice.slow}</span>
                  <span className="fast">Fast: {networkStats?.gasPrice.fast}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">TPS</span>
                  <Zap className="stat-icon" />
                </div>
                <div className="stat-value">
                  {networkStats?.tps || '-'}
                </div>
                <div className="stat-change">
                  Pending: {networkStats?.pendingTxCount.toLocaleString()}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Last Block</span>
                  <Clock className="stat-icon" />
                </div>
                <div className="stat-value">
                  {networkStats?.lastBlock.transactions || 0} txs
                </div>
                <div className="stat-change">
                  Gas: {networkStats && 
                    Math.round((parseInt(networkStats.lastBlock.gasUsed) / parseInt(networkStats.lastBlock.gasLimit)) * 100)}%
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Gas Price Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={gasPriceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" name="Gas Price (Gwei)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>TPS History</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={tpsHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} name="TPS" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Contract Activity */}
            <div className="activity-section">
              <h3>Top Contract Activity</h3>
              <div className="activity-table">
                <table>
                  <thead>
                    <tr>
                      <th>Contract</th>
                      <th>Name</th>
                      <th>24h Txs</th>
                      <th>Users</th>
                      <th>Volume</th>
                      <th>Gas Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractActivity.map((contract, idx) => (
                      <tr key={idx}>
                        <td>{formatAddress(contract.address)}</td>
                        <td>{contract.name || 'Unknown'}</td>
                        <td>{formatNumber(contract.txCount24h)}</td>
                        <td>{formatNumber(contract.uniqueUsers24h)}</td>
                        <td>${formatNumber(parseFloat(contract.volume24h))}</td>
                        <td>{formatNumber(parseFloat(contract.gasUsed24h))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whale' && (
          <div className="whale-tab">
            <h3>Whale Transactions</h3>
            <div className="whale-transactions">
              {whaleTransactions.map((tx, idx) => (
                <div key={idx} className="whale-tx-card">
                  <div className="whale-tx-header">
                    <span className="whale-amount">
                      ${formatNumber(tx.usdValue || 0)}
                    </span>
                    <span className="whale-token">
                      {tx.token?.symbol || 'ETH'}
                    </span>
                  </div>
                  <div className="whale-tx-details">
                    <div className="whale-addresses">
                      <span className="from">From: {formatAddress(tx.from)}</span>
                      <span className="arrow">→</span>
                      <span className="to">To: {formatAddress(tx.to)}</span>
                    </div>
                    <div className="whale-meta">
                      <span className="tx-hash">{formatAddress(tx.hash)}</span>
                      <span className="tx-time">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Whale Activity Chart */}
            <div className="chart-container">
              <h3>Whale Activity Distribution</h3>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={whaleTransactions.map(tx => ({
                    name: formatAddress(tx.from),
                    size: tx.usdValue || 0,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)]
                  }))}
                  dataKey="size"
                  ratio={4 / 3}
                  stroke="#fff"
                  fill="#8b5cf6"
                >
                  <Tooltip />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'defi' && (
          <div className="defi-tab">
            <h3>DeFi Protocol Metrics</h3>
            
            {/* DeFi Stats Cards */}
            <div className="defi-cards">
              {defiProtocols.map((protocol, idx) => (
                <div key={idx} className="defi-card">
                  <div className="defi-header">
                    <h4>{protocol.protocol}</h4>
                    <span className={`tvl-change ${protocol.tvlChange24h > 0 ? 'positive' : 'negative'}`}>
                      {protocol.tvlChange24h > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {Math.abs(protocol.tvlChange24h)}%
                    </span>
                  </div>
                  <div className="defi-metrics">
                    <div className="metric">
                      <span className="label">TVL</span>
                      <span className="value">${formatNumber(protocol.tvl)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Volume 24h</span>
                      <span className="value">${formatNumber(protocol.volume24h)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Fees 24h</span>
                      <span className="value">${formatNumber(protocol.fees24h)}</span>
                    </div>
                    {protocol.apy && (
                      <div className="metric">
                        <span className="label">APY</span>
                        <span className="value">{protocol.apy}%</span>
                      </div>
                    )}
                    {protocol.users24h && (
                      <div className="metric">
                        <span className="label">Users 24h</span>
                        <span className="value">{formatNumber(protocol.users24h)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DeFi Charts */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>TVL Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={defiProtocols.map((p, i) => ({
                        name: p.protocol,
                        value: p.tvl
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {defiProtocols.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${formatNumber(value)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Protocol Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={defiProtocols.map(p => ({
                    protocol: p.protocol,
                    tvl: p.tvl / 1e9,
                    volume: p.volume24h / 1e9,
                    fees: p.fees24h / 1e6,
                    apy: p.apy || 0,
                    users: (p.users24h || 0) / 1000
                  }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="protocol" />
                    <PolarRadiusAxis angle={90} domain={[0, 'auto']} />
                    <Radar name="TVL (B)" dataKey="tvl" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <Radar name="Volume (B)" dataKey="volume" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mev' && (
          <div className="mev-tab">
            <h3>MEV Analysis</h3>
            
            {/* MEV Stats */}
            <div className="mev-stats">
              {mevData.map((mev, idx) => (
                <div key={idx} className="mev-card">
                  <div className="mev-header">
                    <span className="block-number">Block #{mev.blockNumber}</span>
                    <span className="mev-profit">
                      {parseFloat(mev.totalProfit) / 1e18} ETH
                    </span>
                  </div>
                  <div className="mev-details">
                    <div className="mev-metric">
                      <Shield size={16} />
                      <span>{mev.bundleCount} Bundles</span>
                    </div>
                    <div className="mev-metric">
                      <TrendingUp size={16} />
                      <span>{mev.profitableArbs} Arbs</span>
                    </div>
                    <div className="mev-metric">
                      <AlertTriangle size={16} />
                      <span>{mev.sandwichAttacks} Sandwiches</span>
                    </div>
                    <div className="mev-metric">
                      <Zap size={16} />
                      <span>{mev.liquidations} Liquidations</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MEV Charts */}
            <div className="chart-container">
              <h3>MEV Activity Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={mevData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="blockNumber" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="bundleCount" fill="#8b5cf6" name="Bundles" />
                  <Bar yAxisId="left" dataKey="profitableArbs" fill="#06b6d4" name="Arbitrage" />
                  <Bar yAxisId="left" dataKey="sandwichAttacks" fill="#f59e0b" name="Sandwiches" />
                  <Line yAxisId="right" type="monotone" dataKey="mevReward" stroke="#10b981" name="MEV Reward" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="tokens-tab">
            <h3>Token Metrics</h3>
            <div className="tokens-table">
              <table>
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>24h Change</th>
                    <th>Market Cap</th>
                    <th>Volume 24h</th>
                    <th>Holders</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenMetrics.map((token, idx) => (
                    <tr key={idx}>
                      <td>{token.name}</td>
                      <td>{token.symbol}</td>
                      <td>${token.price.toFixed(token.price < 10 ? 4 : 2)}</td>
                      <td className={token.priceChange24h > 0 ? 'positive' : 'negative'}>
                        {token.priceChange24h > 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                      </td>
                      <td>${formatNumber(token.marketCap)}</td>
                      <td>${formatNumber(token.volume24h)}</td>
                      <td>{token.holders ? formatNumber(token.holders) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Token Charts */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Market Cap Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tokenMetrics.map((t, i) => ({
                        name: t.symbol,
                        value: t.marketCap
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tokenMetrics.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${formatNumber(value)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Volume Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tokenMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${formatNumber(value)}`} />
                    <Legend />
                    <Bar dataKey="volume24h" fill="#06b6d4" name="24h Volume" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .blockchain-analytics-enhanced {
          padding: 20px;
          height: 100%;
          overflow-y: auto;
          background: var(--bg-primary);
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .header-left h2 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
        }

        .network-selector {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .time-range-selector {
          display: flex;
          gap: 5px;
          background: var(--bg-secondary);
          padding: 4px;
          border-radius: 8px;
        }

        .time-range-btn {
          padding: 6px 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .time-range-btn.active {
          background: var(--accent-primary);
          color: white;
        }

        .custom-date-range {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .custom-date-range input {
          padding: 4px 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
        }

        .export-controls {
          display: flex;
          gap: 8px;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .refresh-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .auto-refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .auto-refresh-btn.active {
          background: var(--success-color);
          color: white;
          border-color: var(--success-color);
        }

        .refresh-interval {
          padding: 6px 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 13px;
        }

        .refresh-btn {
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .analytics-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          border-radius: 6px 6px 0 0;
        }

        .tab:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--accent-primary);
          color: white;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--error-bg);
          color: var(--error-color);
          border: 1px solid var(--error-border);
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .analytics-content {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stat-title {
          font-size: 13px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-icon {
          color: var(--accent-primary);
          opacity: 0.7;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .stat-change {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .stat-change.positive {
          color: var(--success-color);
        }

        .stat-change.negative {
          color: var(--error-color);
        }

        .stat-subvalues {
          display: flex;
          gap: 15px;
          font-size: 13px;
        }

        .stat-subvalues .slow {
          color: var(--success-color);
        }

        .stat-subvalues .fast {
          color: var(--error-color);
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-container {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .chart-container h3 {
          margin: 0 0 20px 0;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
        }

        .activity-section {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .activity-section h3 {
          margin: 0 0 20px 0;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
        }

        .activity-table {
          overflow-x: auto;
        }

        .activity-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .activity-table th {
          text-align: left;
          padding: 12px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .activity-table td {
          padding: 12px;
          border-top: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 14px;
        }

        .whale-transactions {
          display: grid;
          gap: 15px;
          margin-bottom: 30px;
        }

        .whale-tx-card {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .whale-tx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .whale-amount {
          font-size: 24px;
          font-weight: 600;
          color: var(--success-color);
        }

        .whale-token {
          padding: 6px 12px;
          background: var(--accent-primary);
          color: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .whale-addresses {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-family: monospace;
          font-size: 13px;
        }

        .whale-addresses .from {
          color: var(--text-secondary);
        }

        .whale-addresses .arrow {
          color: var(--accent-primary);
        }

        .whale-addresses .to {
          color: var(--text-secondary);
        }

        .whale-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .tx-hash {
          font-family: monospace;
        }

        .defi-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .defi-card {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .defi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .defi-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 18px;
          font-weight: 600;
        }

        .tvl-change {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          font-weight: 500;
        }

        .tvl-change.positive {
          color: var(--success-color);
        }

        .tvl-change.negative {
          color: var(--error-color);
        }

        .defi-metrics {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .metric .label {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric .value {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .mev-stats {
          display: grid;
          gap: 15px;
          margin-bottom: 30px;
        }

        .mev-card {
          background: var(--bg-primary);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .mev-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .block-number {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .mev-profit {
          font-size: 18px;
          font-weight: 600;
          color: var(--success-color);
        }

        .mev-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .mev-metric {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-primary);
        }

        .tokens-table {
          overflow-x: auto;
          margin-bottom: 30px;
        }

        .tokens-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .tokens-table th {
          text-align: left;
          padding: 12px;
          background: var(--bg-primary);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tokens-table td {
          padding: 12px;
          border-top: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 14px;
        }

        .tokens-table td.positive {
          color: var(--success-color);
        }

        .tokens-table td.negative {
          color: var(--error-color);
        }

        .inline-icon {
          width: 20px;
          height: 20px;
        }
      `}</style>
    </div>
  );
};
