/**
 * Blockchain IPC Handlers
 * Handles blockchain and smart contract generation requests
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { createLoggedHandler } from './safe_handle';
import BlockchainGenerator, { TokenParams, GeneratedContract, DeploymentResult } from '../../services/blockchain-generator';
import blockchainAPIService from '../../services/blockchain-api-service';
import * as path from 'path';
import * as fs from 'fs-extra';

const logger = log.scope('blockchain_handlers');
const handle = createLoggedHandler(logger);

// Singleton blockchain generator
let blockchainGenerator: BlockchainGenerator | null = null;

function getBlockchainGenerator(): BlockchainGenerator {
  if (!blockchainGenerator) {
    blockchainGenerator = new BlockchainGenerator();
  }
  return blockchainGenerator;
}

export function registerBlockchainHandlers() {
  logger.info('Registering blockchain IPC handlers');
  
  // Generate token contract
  handle('blockchain:generate-token', async (_event, params: TokenParams): Promise<{
    success: boolean;
    data?: GeneratedContract;
    error?: string;
  }> => {
    try {
      // Validate params
      if (!params.name || !params.symbol || !params.tokenType) {
        return {
          success: false,
          error: 'Missing required parameters: name, symbol, and tokenType are required'
        };
      }
      
      // Validate token type
      if (!['ERC20', 'ERC721', 'ERC1155'].includes(params.tokenType)) {
        return {
          success: false,
          error: 'Invalid token type. Must be ERC20, ERC721, or ERC1155'
        };
      }
      
      const generator = getBlockchainGenerator();
      const result = await generator.generateToken(params);
      
      logger.info(`Successfully generated ${params.tokenType} token: ${params.name}`);
      
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      logger.error('Failed to generate token:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate token'
      };
    }
  });
  
  // Deploy contract to network
  handle('blockchain:deploy-contract', async (_event, params: {
    contractPath: string;
    network: string;
  }): Promise<DeploymentResult> => {
    try {
      const generator = getBlockchainGenerator();
      const result = await generator.deployToNetwork(params.contractPath, params.network);
      
      if (result.success) {
        logger.info(`Contract deployed to ${params.network}: ${result.contractAddress}`);
      }
      
      return result;
    } catch (error: any) {
      logger.error('Failed to deploy contract:', error);
      return {
        success: false,
        error: error.message || 'Failed to deploy contract'
      };
    }
  });
  
  // Get blockchain templates
  handle('blockchain:get-templates', async (): Promise<{
    success: boolean;
    templates: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      tokenType: string;
      features: string[];
    }>;
  }> => {
    const templates = [
      {
        id: 'erc20-basic',
        name: 'Basic ERC-20 Token',
        description: 'Standard fungible token with configurable supply',
        category: 'Cryptocurrency',
        tokenType: 'ERC20',
        features: ['Mintable', 'Burnable', 'Pausable', 'Fixed Supply']
      },
      {
        id: 'erc20-governance',
        name: 'Governance Token',
        description: 'ERC-20 token with voting capabilities',
        category: 'DAO',
        tokenType: 'ERC20',
        features: ['Voting', 'Delegation', 'Timelock', 'Snapshot']
      },
      {
        id: 'erc20-staking',
        name: 'Staking Token',
        description: 'Token with built-in staking rewards',
        category: 'DeFi',
        tokenType: 'ERC20',
        features: ['Staking', 'Rewards', 'APY', 'Compound Interest']
      },
      {
        id: 'erc721-nft',
        name: 'NFT Collection',
        description: 'Standard NFT collection with metadata',
        category: 'NFT',
        tokenType: 'ERC721',
        features: ['Metadata', 'IPFS', 'Royalties', 'Enumerable']
      },
      {
        id: 'erc721-generative',
        name: 'Generative Art NFT',
        description: 'On-chain generated NFT art',
        category: 'NFT',
        tokenType: 'ERC721',
        features: ['On-chain Art', 'Randomization', 'Reveal', 'Whitelist']
      },
      {
        id: 'erc1155-gaming',
        name: 'Gaming Items',
        description: 'Multi-token for in-game items',
        category: 'Gaming',
        tokenType: 'ERC1155',
        features: ['Fungible & Non-fungible', 'Batch Transfer', 'Crafting', 'Trading']
      },
      {
        id: 'defi-dex',
        name: 'DEX AMM Pool',
        description: 'Automated Market Maker for token swaps',
        category: 'DeFi',
        tokenType: 'ERC20',
        features: ['Liquidity Pools', 'Swaps', 'LP Tokens', 'Fees']
      },
      {
        id: 'defi-lending',
        name: 'Lending Protocol',
        description: 'Lending and borrowing platform',
        category: 'DeFi',
        tokenType: 'ERC20',
        features: ['Lending', 'Borrowing', 'Collateral', 'Interest Rates']
      }
    ];
    
    return {
      success: true,
      templates
    };
  });
  
  // Validate contract code
  handle('blockchain:validate-contract', async (_event, params: {
    contractCode: string;
  }): Promise<{
    success: boolean;
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> => {
    try {
      // Basic Solidity validation
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check for pragma
      if (!params.contractCode.includes('pragma solidity')) {
        errors.push('Missing pragma solidity statement');
      }
      
      // Check for license
      if (!params.contractCode.includes('SPDX-License-Identifier')) {
        warnings.push('Missing SPDX license identifier');
      }
      
      // Check for contract declaration
      if (!params.contractCode.includes('contract ')) {
        errors.push('No contract declaration found');
      }
      
      // Check for constructor
      if (!params.contractCode.includes('constructor')) {
        warnings.push('No constructor defined');
      }
      
      // Check for common vulnerabilities
      if (params.contractCode.includes('tx.origin')) {
        warnings.push('Use of tx.origin detected - consider using msg.sender instead');
      }
      
      if (params.contractCode.includes('block.timestamp')) {
        warnings.push('Use of block.timestamp - be aware of miner manipulation');
      }
      
      if (params.contractCode.includes('delegatecall')) {
        warnings.push('Use of delegatecall - ensure proper security checks');
      }
      
      const valid = errors.length === 0;
      
      return {
        success: true,
        valid,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error: any) {
      logger.error('Failed to validate contract:', error);
      return {
        success: false,
        valid: false,
        errors: [error.message || 'Validation failed']
      };
    }
  });
  
  // Generate DeFi protocol
  handle('blockchain:generate-defi', async (_event, params: {
    protocolType: 'dex' | 'lending' | 'staking' | 'yield';
    name: string;
    features?: string[];
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      // For now, return a structured response
      // This would generate complex DeFi protocols
      return {
        success: true,
        data: {
          message: `DeFi protocol ${params.name} of type ${params.protocolType} would be generated here`,
          contracts: ['Token.sol', 'Pool.sol', 'Router.sol', 'Factory.sol'],
          estimatedGas: '500000',
          complexity: 'high'
        }
      };
    } catch (error: any) {
      logger.error('Failed to generate DeFi protocol:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Get gas prices with real blockchain data
  handle('blockchain:get-gas-prices', async (_event, network = 'ethereum'): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const gasPrice = await blockchainAPIService.getGasPrice(network);
      return {
        success: true,
        data: {
          slow: `${gasPrice.slow} gwei`,
          standard: `${gasPrice.standard} gwei`,
          fast: `${gasPrice.fast} gwei`,
          instant: `${gasPrice.instant || gasPrice.fast} gwei`,
          baseFee: gasPrice.baseFee ? `${gasPrice.baseFee} gwei` : undefined,
          priority: gasPrice.priority ? `${gasPrice.priority} gwei` : undefined
        }
      };
    } catch (error: any) {
      logger.error(`Failed to get gas prices for ${network}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Estimate deployment cost
  handle('blockchain:estimate-cost', async (_event, params: {
    contractSize: number;
    network: string;
  }): Promise<{
    success: boolean;
    data?: {
      gasEstimate: string;
      costInEth: string;
      costInUsd: string;
    };
    error?: string;
  }> => {
    try {
      // Rough estimates
      const gasPerByte = 200;
      const gasEstimate = params.contractSize * gasPerByte + 21000; // base tx cost
      const gasPrice = 20; // gwei
      const ethPrice = 2000; // USD
      
      const costInEth = (gasEstimate * gasPrice) / 1e9;
      const costInUsd = costInEth * ethPrice;
      
      return {
        success: true,
        data: {
          gasEstimate: gasEstimate.toString(),
          costInEth: costInEth.toFixed(4),
          costInUsd: costInUsd.toFixed(2)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Estimate gas for transactions
  handle('blockchain:estimate-gas', async (_event, params: {
    network: string;
    transaction?: {
      from?: string;
      to?: string;
      value?: string;
      data?: string;
    };
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      logger.info(`Estimating gas for network: ${params.network}`);
      
      // Get current gas prices
      const gasPrice = await blockchainAPIService.getGasPrice(params.network);
      
      // Estimate gas for transaction if provided
      let estimatedGas = '21000'; // Default for simple transfer
      if (params.transaction) {
        estimatedGas = await blockchainAPIService.estimateGas(
          params.network,
          params.transaction
        );
      }
      
      return {
        success: true,
        data: {
          gasPrice: gasPrice.standard,
          estimatedGas,
          maxFeePerGas: gasPrice.fast,
          maxPriorityFeePerGas: gasPrice.priority || '2',
          baseFee: gasPrice.baseFee,
          network: params.network,
          timestamp: Date.now()
        }
      };
    } catch (error: any) {
      logger.error('Failed to estimate gas:', error);
      return {
        success: false,
        error: error.message || 'Failed to estimate gas'
      };
    }
  });

  // Get blockchain statistics
  handle('blockchain:get-stats', async (_event, network = 'ethereum'): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const stats = await blockchainAPIService.getBlockchainStats(network);
      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      logger.error(`Failed to get blockchain stats for ${network}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get token metrics
  handle('blockchain:get-token-metrics', async (_event, params: {
    network: string;
    addresses: string[];
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const metrics = await blockchainAPIService.getTokenMetrics(
        params.network,
        params.addresses
      );
      return {
        success: true,
        data: metrics
      };
    } catch (error: any) {
      logger.error('Failed to get token metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get contract activity
  handle('blockchain:get-contract-activity', async (_event, params: {
    network: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const activity = await blockchainAPIService.getContractActivity(
        params.network,
        params.limit
      );
      return {
        success: true,
        data: activity
      };
    } catch (error: any) {
      logger.error('Failed to get contract activity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get whale transactions
  handle('blockchain:get-whale-transactions', async (_event, params: {
    network: string;
    minValue?: number;
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const whales = await blockchainAPIService.getWhaleTransactions(
        params.network,
        params.minValue
      );
      return {
        success: true,
        data: whales
      };
    } catch (error: any) {
      logger.error('Failed to get whale transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get DeFi metrics
  handle('blockchain:get-defi-metrics', async (_event, network = 'ethereum'): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const metrics = await blockchainAPIService.getDeFiMetrics(network);
      return {
        success: true,
        data: metrics
      };
    } catch (error: any) {
      logger.error('Failed to get DeFi metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get MEV data
  handle('blockchain:get-mev-data', async (_event, params: {
    network: string;
    blockRange?: { start: number; end: number };
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const mevData = await blockchainAPIService.getMEVData(
        params.network,
        params.blockRange
      );
      return {
        success: true,
        data: mevData
      };
    } catch (error: any) {
      logger.error('Failed to get MEV data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get historical data
  handle('blockchain:get-historical-data', async (_event, params: {
    network: string;
    metric: 'gasPrice' | 'tps' | 'tvl' | 'volume';
    timeRange: { start: string; end: string; interval: 'hour' | 'day' | 'week' };
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const data = await blockchainAPIService.getHistoricalData(
        params.network,
        params.metric,
        {
          start: new Date(params.timeRange.start),
          end: new Date(params.timeRange.end),
          interval: params.timeRange.interval
        }
      );
      return {
        success: true,
        data
      };
    } catch (error: any) {
      logger.error('Failed to get historical data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Export analytics data
  handle('blockchain:export-data', async (_event, params: {
    data: any;
    format: 'csv' | 'json';
    filename: string;
  }): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> => {
    try {
      const content = await blockchainAPIService.exportData(
        params.data,
        params.format,
        params.filename
      );
      return {
        success: true,
        content
      };
    } catch (error: any) {
      logger.error('Failed to export data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  logger.info('Blockchain IPC handlers registered successfully with real API connections');
}
