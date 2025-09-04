import { BlockchainGenerator } from './blockchain-generator';

interface AIContractRequest {
  description: string;
  examples?: string[];
  securityLevel?: 'basic' | 'standard' | 'high';
  gasOptimization?: boolean;
}

interface AIContractResponse {
  recommendation: {
    tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'DEFI' | 'DAO';
    parameters: any;
    reasoning: string;
    securityConsiderations: string[];
    gasEstimate: number;
  };
  alternativeOptions: Array<{
    tokenType: string;
    parameters: any;
    pros: string[];
    cons: string[];
  }>;
  contractCode?: string;
  warnings?: string[];
}

export class AIBlockchainService {
  private generator: BlockchainGenerator;
  private knowledgeBase: Map<string, any>;

  constructor() {
    this.generator = new BlockchainGenerator();
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): Map<string, any> {
    const kb = new Map();
    
    // Token patterns
    kb.set('patterns', {
      currency: ['currency', 'coin', 'token', 'payment', 'money', 'stable'],
      collectible: ['nft', 'collectible', 'art', 'unique', 'rare', 'collection'],
      gaming: ['game', 'item', 'weapon', 'armor', 'resource', 'multi-token'],
      defi: ['swap', 'liquidity', 'yield', 'farm', 'stake', 'lend', 'borrow'],
      dao: ['governance', 'vote', 'proposal', 'community', 'dao', 'organization']
    });

    // Security recommendations
    kb.set('security', {
      basic: ['ownable', 'pausable'],
      standard: ['ownable', 'pausable', 'reentrancy-guard', 'access-control'],
      high: ['ownable', 'pausable', 'reentrancy-guard', 'access-control', 'upgradeable', 'timelock']
    });

    // Gas optimization strategies
    kb.set('gasOptimization', {
      storage: ['pack structs', 'use uint256', 'minimize storage writes'],
      loops: ['avoid unbounded loops', 'batch operations', 'use events'],
      external: ['mark view/pure', 'use calldata', 'optimize function visibility']
    });

    return kb;
  }

  /**
   * Analyze user description and generate contract recommendations
   */
  async analyzeRequest(request: AIContractRequest): Promise<AIContractResponse> {
    const { description, securityLevel = 'standard', gasOptimization = true } = request;
    
    // Extract intent from description
    const intent = this.extractIntent(description);
    
    // Generate recommendations
    const recommendation = this.generateRecommendation(intent, securityLevel);
    
    // Generate alternative options
    const alternatives = this.generateAlternatives(intent);
    
    // Perform security analysis
    const securityAnalysis = await this.analyzeSecurityRequirements(
      recommendation.tokenType,
      recommendation.parameters,
      securityLevel
    );
    
    // Gas optimization recommendations
    const gasRecommendations = gasOptimization 
      ? this.generateGasOptimizations(recommendation.tokenType)
      : [];

    // Generate contract if parameters are complete
    let contractCode: string | undefined;
    try {
      if (this.hasCompleteParameters(recommendation)) {
        const result = await this.generator.generateToken(recommendation.parameters);
        contractCode = result.contractCode;
      }
    } catch (error) {
      console.error('Error generating contract:', error);
    }

    return {
      recommendation: {
        ...recommendation,
        securityConsiderations: securityAnalysis.considerations,
        gasEstimate: await this.estimateGas(recommendation)
      },
      alternativeOptions: alternatives,
      contractCode,
      warnings: [...securityAnalysis.warnings, ...gasRecommendations]
    };
  }

  /**
   * Extract intent from natural language description
   */
  private extractIntent(description: string): any {
    const lower = description.toLowerCase();
    const patterns = this.knowledgeBase.get('patterns');
    
    const intent = {
      type: 'unknown',
      features: [],
      requirements: []
    };

    // Detect token type
    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some((k: string) => lower.includes(k))) {
        intent.type = type;
        break;
      }
    }

    // Extract features
    if (lower.includes('burn')) intent.features.push('burnable');
    if (lower.includes('mint')) intent.features.push('mintable');
    if (lower.includes('pause') || lower.includes('emergency')) intent.features.push('pausable');
    if (lower.includes('upgrade')) intent.features.push('upgradeable');
    if (lower.includes('vote') || lower.includes('govern')) intent.features.push('votes');
    if (lower.includes('snapshot')) intent.features.push('snapshot');
    if (lower.includes('permit')) intent.features.push('permit');
    
    // Extract numerical values
    const supplyMatch = lower.match(/(\\d+)\\s*(million|billion|thousand)?\\s*(tokens?|supply)/);
    if (supplyMatch) {
      const value = parseInt(supplyMatch[1]);
      const multiplier = supplyMatch[2] === 'million' ? 1000000 : 
                        supplyMatch[2] === 'billion' ? 1000000000 : 
                        supplyMatch[2] === 'thousand' ? 1000 : 1;
      intent.requirements.push({ type: 'supply', value: value * multiplier });
    }

    // Extract name and symbol
    const nameMatch = description.match(/called\\s+(["']?)([^"']+)\\1|named\\s+(["']?)([^"']+)\\3/i);
    if (nameMatch) {
      intent.requirements.push({ type: 'name', value: nameMatch[2] || nameMatch[4] });
    }

    return intent;
  }

  /**
   * Generate recommendation based on intent
   */
  private generateRecommendation(intent: any, securityLevel: string): any {
    let tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'DEFI' | 'DAO';
    let parameters: any = {};
    let reasoning = '';

    switch (intent.type) {
      case 'currency':
        tokenType = 'ERC20';
        parameters = {
          tokenType: 'ERC20',
          name: 'My Token',
          symbol: 'MTK',
          initialSupply: 1000000,
          decimals: 18,
          mintable: intent.features.includes('mintable'),
          burnable: intent.features.includes('burnable'),
          pausable: intent.features.includes('pausable') || securityLevel !== 'basic',
          ownable: true,
          upgradeable: intent.features.includes('upgradeable')
        };
        reasoning = 'ERC-20 is the standard for fungible tokens, perfect for currencies and utility tokens.';
        break;

      case 'collectible':
        tokenType = 'ERC721';
        parameters = {
          tokenType: 'ERC721',
          name: 'My NFT Collection',
          symbol: 'MNFT',
          maxSupply: 10000,
          baseURI: 'ipfs://',
          mintable: true,
          burnable: intent.features.includes('burnable'),
          pausable: intent.features.includes('pausable') || securityLevel !== 'basic',
          ownable: true
        };
        reasoning = 'ERC-721 is ideal for unique, non-fungible collectibles where each token is distinct.';
        break;

      case 'gaming':
        tokenType = 'ERC1155';
        parameters = {
          tokenType: 'ERC1155',
          name: 'Game Items',
          symbol: 'GAME',
          baseURI: 'https://api.game.com/metadata/',
          mintable: true,
          burnable: true,
          pausable: intent.features.includes('pausable') || securityLevel === 'high',
          ownable: true
        };
        reasoning = 'ERC-1155 allows both fungible and non-fungible tokens in one contract, perfect for gaming.';
        break;

      case 'defi':
        tokenType = 'DEFI';
        parameters = {
          protocol: 'amm',
          features: ['swap', 'liquidity', 'farming']
        };
        reasoning = 'DeFi protocols require specialized contracts for automated market making and yield generation.';
        break;

      case 'dao':
        tokenType = 'DAO';
        parameters = {
          governanceToken: true,
          voting: 'token-weighted',
          proposal: {
            threshold: 1000,
            quorum: 10,
            votingPeriod: 3 * 24 * 60 * 60 // 3 days
          }
        };
        reasoning = 'DAO requires governance tokens with voting mechanisms for decentralized decision-making.';
        break;

      default:
        tokenType = 'ERC20';
        parameters = {
          tokenType: 'ERC20',
          name: 'Custom Token',
          symbol: 'CTK',
          initialSupply: 1000000,
          decimals: 18,
          mintable: true,
          burnable: true,
          pausable: true,
          ownable: true
        };
        reasoning = 'Based on your description, a flexible ERC-20 token with multiple features is recommended.';
    }

    // Apply extracted requirements
    intent.requirements.forEach((req: any) => {
      if (req.type === 'supply') {
        if (tokenType === 'ERC20') parameters.initialSupply = req.value;
        if (tokenType === 'ERC721') parameters.maxSupply = req.value;
      }
      if (req.type === 'name') {
        parameters.name = req.value;
        parameters.symbol = req.value.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 4);
      }
    });

    return { tokenType, parameters, reasoning };
  }

  /**
   * Generate alternative contract options
   */
  private generateAlternatives(intent: any): any[] {
    const alternatives = [];

    if (intent.type !== 'currency') {
      alternatives.push({
        tokenType: 'ERC20',
        parameters: { tokenType: 'ERC20', mintable: true, burnable: true },
        pros: ['Simple implementation', 'Wide compatibility', 'Lower gas costs'],
        cons: ['Not suitable for unique items', 'Limited functionality for complex use cases']
      });
    }

    if (intent.type !== 'collectible') {
      alternatives.push({
        tokenType: 'ERC721',
        parameters: { tokenType: 'ERC721', mintable: true },
        pros: ['Each token is unique', 'Perfect for collectibles', 'Built-in metadata support'],
        cons: ['Higher gas costs', 'Not suitable for currencies']
      });
    }

    if (intent.type !== 'gaming') {
      alternatives.push({
        tokenType: 'ERC1155',
        parameters: { tokenType: 'ERC1155', mintable: true, burnable: true },
        pros: ['Supports both fungible and non-fungible', 'Batch transfers', 'Gas efficient'],
        cons: ['More complex implementation', 'Less tooling support']
      });
    }

    return alternatives;
  }

  /**
   * Analyze security requirements
   */
  private async analyzeSecurityRequirements(
    tokenType: string,
    parameters: any,
    securityLevel: string
  ): Promise<{ considerations: string[]; warnings: string[] }> {
    const considerations = [];
    const warnings = [];

    // Basic security considerations
    if (!parameters.ownable) {
      warnings.push('⚠️ Contract lacks ownership control - consider adding Ownable');
    }

    if (!parameters.pausable && securityLevel !== 'basic') {
      warnings.push('⚠️ No emergency pause mechanism - recommended for production');
    }

    // Token-specific security
    if (tokenType === 'ERC20' || tokenType === 'ERC721' || tokenType === 'ERC1155') {
      if (parameters.mintable && !parameters.ownable) {
        warnings.push('🔴 CRITICAL: Mintable without access control - anyone can mint!');
      }

      considerations.push('✓ Implements standard interface for compatibility');
      
      if (parameters.pausable) {
        considerations.push('✓ Emergency pause mechanism included');
      }
      
      if (parameters.upgradeable) {
        considerations.push('✓ Upgradeable proxy pattern for future improvements');
        warnings.push('⚠️ Upgradeable contracts require careful migration planning');
      }
    }

    // DeFi-specific security
    if (tokenType === 'DEFI') {
      considerations.push('✓ Reentrancy protection required');
      considerations.push('✓ Oracle manipulation protection needed');
      considerations.push('✓ Flash loan attack mitigation recommended');
      warnings.push('⚠️ DeFi protocols require professional audit before mainnet');
    }

    return { considerations, warnings };
  }

  /**
   * Generate gas optimization recommendations
   */
  private generateGasOptimizations(tokenType: string): string[] {
    const optimizations = [];
    const gasStrategies = this.knowledgeBase.get('gasOptimization');

    if (tokenType === 'ERC721') {
      optimizations.push('💡 Consider ERC721A for batch minting optimization');
      optimizations.push('💡 Use tokenId auto-increment instead of random generation');
    }

    if (tokenType === 'ERC20') {
      optimizations.push('💡 Pack storage variables to use fewer slots');
      optimizations.push('💡 Use unchecked blocks for safe arithmetic where appropriate');
    }

    if (tokenType === 'ERC1155') {
      optimizations.push('💡 Batch operations significantly reduce gas for multiple transfers');
      optimizations.push('💡 Use URI templates instead of storing individual URIs');
    }

    return optimizations;
  }

  /**
   * Check if parameters are complete for generation
   */
  private hasCompleteParameters(recommendation: any): boolean {
    const { tokenType, parameters } = recommendation;
    
    if (!parameters.name || !parameters.symbol) return false;
    
    switch (tokenType) {
      case 'ERC20':
        return parameters.initialSupply !== undefined && parameters.decimals !== undefined;
      case 'ERC721':
        return parameters.baseURI !== undefined;
      case 'ERC1155':
        return parameters.baseURI !== undefined;
      default:
        return false;
    }
  }

  /**
   * Estimate gas costs
   */
  private async estimateGas(recommendation: any): Promise<number> {
    const { tokenType } = recommendation;
    
    // Base estimates (in gas units)
    const baseGas = {
      ERC20: 1500000,
      ERC721: 2000000,
      ERC1155: 2500000,
      DEFI: 5000000,
      DAO: 3000000
    };

    let estimate = baseGas[tokenType] || 2000000;

    // Add features cost
    if (recommendation.parameters.upgradeable) estimate += 500000;
    if (recommendation.parameters.pausable) estimate += 200000;
    if (recommendation.parameters.snapshot) estimate += 300000;
    if (recommendation.parameters.votes) estimate += 400000;

    return estimate;
  }

  /**
   * Generate optimized contract from AI analysis
   */
  async generateOptimizedContract(request: AIContractRequest): Promise<{
    success: boolean;
    contract?: any;
    analysis: AIContractResponse;
    error?: string;
  }> {
    try {
      // Analyze the request
      const analysis = await this.analyzeRequest(request);
      
      // Generate the contract if we have complete parameters
      if (analysis.contractCode) {
        return {
          success: true,
          contract: {
            code: analysis.contractCode,
            type: analysis.recommendation.tokenType,
            parameters: analysis.recommendation.parameters
          },
          analysis
        };
      }

      return {
        success: false,
        analysis,
        error: 'Incomplete parameters for contract generation. Please provide more details.'
      };
    } catch (error: any) {
      return {
        success: false,
        analysis: {} as AIContractResponse,
        error: error.message || 'Failed to generate contract'
      };
    }
  }
}
