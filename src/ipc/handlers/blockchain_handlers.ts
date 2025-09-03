/**
 * Blockchain IPC Handlers
 * Handles blockchain and smart contract generation requests
 */

import { ipcMain } from 'electron';
import log from 'electron-log';
import { createLoggedHandler } from './safe_handle';
import BlockchainGenerator, { TokenParams, GeneratedContract, DeploymentResult } from '../../services/blockchain-generator';
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
  
  // Get gas prices
  handle('blockchain:get-gas-prices', async (): Promise<{
    success: boolean;
    data?: {
      slow: string;
      standard: string;
      fast: string;
      instant: string;
    };
    error?: string;
  }> => {
    try {
      // In production, this would fetch from gas oracle
      return {
        success: true,
        data: {
          slow: '10 gwei',
          standard: '20 gwei',
          fast: '30 gwei',
          instant: '50 gwei'
        }
      };
    } catch (error: any) {
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
  
  logger.info('Blockchain IPC handlers registered successfully');
}
