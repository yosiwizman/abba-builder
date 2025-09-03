/**
 * AI Contract Service
 * Handles AI-powered smart contract generation and analysis
 */

import log from 'electron-log';

const logger = log.scope('ai-contract-service');

// Contract templates with optimized patterns
const CONTRACT_TEMPLATES = {
  token: {
    erc20: `// SPDX-License-Identifier: {{LICENSE}}
pragma solidity ^{{SOL_VERSION}};

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
{{#if BURNABLE}}import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";{{/if}}
{{#if MINTABLE}}import "@openzeppelin/contracts/access/Ownable.sol";{{/if}}
{{#if PAUSABLE}}import "@openzeppelin/contracts/security/Pausable.sol";{{/if}}

contract {{CONTRACT_NAME}} is ERC20{{#if BURNABLE}}, ERC20Burnable{{/if}}{{#if MINTABLE}}, Ownable{{/if}}{{#if PAUSABLE}}, Pausable{{/if}} {
    {{#if MAX_SUPPLY}}uint256 public constant MAX_SUPPLY = {{MAX_SUPPLY}};{{/if}}
    
    constructor(uint256 _initialSupply) ERC20("{{TOKEN_NAME}}", "{{TOKEN_SYMBOL}}") {
        _mint(msg.sender, _initialSupply);
    }
    
    {{#if MINTABLE}}
    function mint(address to, uint256 amount) public onlyOwner {
        {{#if MAX_SUPPLY}}require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");{{/if}}
        _mint(to, amount);
    }
    {{/if}}
    
    {{#if PAUSABLE}}
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
    {{/if}}
}`,
    erc721: `// SPDX-License-Identifier: {{LICENSE}}
pragma solidity ^{{SOL_VERSION}};

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract {{CONTRACT_NAME}} is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    {{#if MAX_SUPPLY}}uint256 public constant MAX_SUPPLY = {{MAX_SUPPLY}};{{/if}}
    {{#if BASE_URI}}string public baseTokenURI = "{{BASE_URI}}";{{/if}}
    
    constructor() ERC721("{{TOKEN_NAME}}", "{{TOKEN_SYMBOL}}") {}
    
    function safeMint(address to, string memory uri) public onlyOwner {
        {{#if MAX_SUPPLY}}require(_tokenIdCounter.current() < MAX_SUPPLY, "Max supply reached");{{/if}}
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}`
  },
  dao: {
    basic: `// SPDX-License-Identifier: {{LICENSE}}
pragma solidity ^{{SOL_VERSION}};

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";

contract {{CONTRACT_NAME}} is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes {
    constructor(IVotes _token)
        Governor("{{DAO_NAME}}")
        GovernorSettings({{VOTING_DELAY}}, {{VOTING_PERIOD}}, {{PROPOSAL_THRESHOLD}})
        GovernorVotes(_token)
    {}
    
    function quorum(uint256 blockNumber) public pure override returns (uint256) {
        return {{QUORUM}};
    }
    
    // Required overrides
    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }
    
    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }
    
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }
}`
  },
  defi: {
    staking: `// SPDX-License-Identifier: {{LICENSE}}
pragma solidity ^{{SOL_VERSION}};

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {{CONTRACT_NAME}} is ReentrancyGuard, Ownable {
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    uint256 public rewardRate = {{REWARD_RATE}};
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) private _balances;
    uint256 private _totalSupply;
    
    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }
    
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }
    
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
    }
    
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
        }
    }
    
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
    
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRate * 1e18 / _totalSupply);
    }
    
    function earned(address account) public view returns (uint256) {
        return _balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18 + rewards[account];
    }
}`
  }
};

// Security patterns to check
const SECURITY_PATTERNS = [
  {
    pattern: /tx\.origin/g,
    severity: 'high' as const,
    title: 'tx.origin Usage',
    description: 'Using tx.origin for authorization is vulnerable to phishing attacks',
    suggestion: 'Use msg.sender instead of tx.origin for authorization checks'
  },
  {
    pattern: /block\.timestamp/g,
    severity: 'medium' as const,
    title: 'Timestamp Dependence',
    description: 'Block timestamps can be manipulated by miners within a certain range',
    suggestion: 'Avoid using block.timestamp for critical logic or use block numbers instead'
  },
  {
    pattern: /delegatecall/g,
    severity: 'high' as const,
    title: 'Delegatecall Usage',
    description: 'Delegatecall can be dangerous if not properly secured',
    suggestion: 'Ensure delegatecall targets are trusted and implement proper access controls'
  },
  {
    pattern: /selfdestruct/g,
    severity: 'critical' as const,
    title: 'Selfdestruct Usage',
    description: 'Selfdestruct can permanently destroy the contract',
    suggestion: 'Consider using pausable pattern instead of selfdestruct'
  },
  {
    pattern: /\.call\(/g,
    severity: 'medium' as const,
    title: 'Low-level Call',
    description: 'Low-level calls can fail silently',
    suggestion: 'Check return values of low-level calls and consider using high-level functions'
  },
  {
    pattern: /pragma solidity \^0\.[0-7]\./g,
    severity: 'low' as const,
    title: 'Outdated Solidity Version',
    description: 'Using an outdated Solidity version may have known vulnerabilities',
    suggestion: 'Update to Solidity 0.8.x or later for built-in overflow protection'
  },
  {
    pattern: /transfer\(/g,
    severity: 'low' as const,
    title: 'Transfer Usage',
    description: 'transfer() has a fixed gas limit that may cause issues',
    suggestion: 'Consider using call() with proper checks for ETH transfers'
  }
];

// Gas optimization patterns
const OPTIMIZATION_PATTERNS = [
  {
    pattern: /storage.*=.*storage/g,
    title: 'Storage to Storage Copy',
    description: 'Copying between storage variables is expensive',
    gasImpact: 'High gas cost',
    suggestion: 'Use memory as intermediate storage when possible'
  },
  {
    pattern: /for\s*\([^)]*\.length/g,
    title: 'Array Length in Loop',
    description: 'Reading array length in loop condition wastes gas',
    gasImpact: 'Save ~3 gas per iteration',
    suggestion: 'Cache array length in a variable before the loop'
  },
  {
    pattern: /\+\+i/g,
    title: 'Pre-increment Usage',
    description: '++i is slightly more efficient than i++',
    gasImpact: 'Save ~5 gas per operation',
    suggestion: 'Already optimized with pre-increment'
  },
  {
    pattern: /public\s+\w+\s*=/g,
    title: 'Public State Variables',
    description: 'Public state variables auto-generate getters',
    gasImpact: 'Deployment gas cost',
    suggestion: 'Use private/internal if external access not needed'
  },
  {
    pattern: /require\([^,]*,[^)]*\)/g,
    title: 'Require with Message',
    description: 'Error messages increase deployment size',
    gasImpact: 'Higher deployment cost',
    suggestion: 'Consider using custom errors in Solidity 0.8.4+'
  }
];

export class AIContractService {
  /**
   * Generate a smart contract based on natural language prompt
   */
  async generateContract(params: {
    prompt: string;
    template?: string;
    options?: any;
  }): Promise<{ success: boolean; contract?: string; error?: string }> {
    try {
      logger.info('Generating contract from prompt:', params.prompt);

      // Parse the prompt to extract requirements
      const requirements = this.parsePrompt(params.prompt);
      
      // Select appropriate template
      const template = this.selectTemplate(requirements, params.template);
      
      // Generate contract code
      const contract = this.generateFromTemplate(template, requirements, params.options);
      
      logger.info('Contract generated successfully');
      return {
        success: true,
        contract
      };
    } catch (error: any) {
      logger.error('Failed to generate contract:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze contract for security issues and optimizations
   */
  async analyzeContract(params: {
    contract: string;
    checks: string[];
  }): Promise<{
    success: boolean;
    securityIssues?: any[];
    optimizations?: any[];
    error?: string;
  }> {
    try {
      logger.info('Analyzing contract...');

      const securityIssues: any[] = [];
      const optimizations: any[] = [];

      if (params.checks.includes('security')) {
        // Check for security patterns
        for (const pattern of SECURITY_PATTERNS) {
          const matches = params.contract.match(pattern.pattern);
          if (matches) {
            const lines = this.findLineNumbers(params.contract, pattern.pattern);
            securityIssues.push({
              severity: pattern.severity,
              title: pattern.title,
              description: pattern.description,
              suggestion: pattern.suggestion,
              line: lines[0]
            });
          }
        }
      }

      if (params.checks.includes('gas')) {
        // Check for optimization opportunities
        for (const pattern of OPTIMIZATION_PATTERNS) {
          const matches = params.contract.match(pattern.pattern);
          if (matches) {
            optimizations.push({
              title: pattern.title,
              description: pattern.description,
              gasImpact: pattern.gasImpact,
              code: matches[0]
            });
          }
        }
      }

      if (params.checks.includes('best-practices')) {
        // Check for best practices
        if (!params.contract.includes('SPDX-License-Identifier')) {
          securityIssues.push({
            severity: 'low',
            title: 'Missing License Identifier',
            description: 'Contract should include SPDX license identifier',
            suggestion: 'Add // SPDX-License-Identifier: MIT at the top'
          });
        }

        if (!params.contract.includes('pragma solidity')) {
          securityIssues.push({
            severity: 'high',
            title: 'Missing Pragma Statement',
            description: 'Contract must specify Solidity version',
            suggestion: 'Add pragma solidity ^0.8.0; statement'
          });
        }
      }

      logger.info(`Analysis complete: ${securityIssues.length} issues, ${optimizations.length} optimizations`);

      return {
        success: true,
        securityIssues,
        optimizations
      };
    } catch (error: any) {
      logger.error('Failed to analyze contract:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse natural language prompt to extract requirements
   */
  private parsePrompt(prompt: string): any {
    const requirements: any = {};
    const promptLower = prompt.toLowerCase();

    // Extract token details
    const nameMatch = prompt.match(/called\s+"([^"]+)"/i) || prompt.match(/named\s+"([^"]+)"/i);
    if (nameMatch) requirements.TOKEN_NAME = nameMatch[1];

    const symbolMatch = prompt.match(/symbol\s+"([^"]+)"/i) || prompt.match(/ticker\s+"([^"]+)"/i);
    if (symbolMatch) requirements.TOKEN_SYMBOL = symbolMatch[1];

    const supplyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:million|billion|thousand)?\s+(?:supply|tokens)/i);
    if (supplyMatch) {
      let supply = parseFloat(supplyMatch[1]);
      if (promptLower.includes('million')) supply *= 1e6;
      if (promptLower.includes('billion')) supply *= 1e9;
      if (promptLower.includes('thousand')) supply *= 1e3;
      requirements.INITIAL_SUPPLY = supply.toString();
    }

    // Extract features
    requirements.MINTABLE = promptLower.includes('mint');
    requirements.BURNABLE = promptLower.includes('burn');
    requirements.PAUSABLE = promptLower.includes('pause') || promptLower.includes('pausable');
    
    // Extract contract type
    if (promptLower.includes('nft') || promptLower.includes('721')) {
      requirements.CONTRACT_TYPE = 'erc721';
    } else if (promptLower.includes('multi-token') || promptLower.includes('1155')) {
      requirements.CONTRACT_TYPE = 'erc1155';
    } else if (promptLower.includes('dao') || promptLower.includes('governance')) {
      requirements.CONTRACT_TYPE = 'dao';
    } else if (promptLower.includes('staking') || promptLower.includes('yield')) {
      requirements.CONTRACT_TYPE = 'staking';
    } else {
      requirements.CONTRACT_TYPE = 'erc20';
    }

    return requirements;
  }

  /**
   * Select appropriate template based on requirements
   */
  private selectTemplate(requirements: any, templateHint?: string): string {
    if (templateHint === 'token') {
      if (requirements.CONTRACT_TYPE === 'erc721') {
        return CONTRACT_TEMPLATES.token.erc721;
      }
      return CONTRACT_TEMPLATES.token.erc20;
    }

    if (templateHint === 'dao') {
      return CONTRACT_TEMPLATES.dao.basic;
    }

    if (templateHint === 'defi' || requirements.CONTRACT_TYPE === 'staking') {
      return CONTRACT_TEMPLATES.defi.staking;
    }

    // Default to ERC20
    return CONTRACT_TEMPLATES.token.erc20;
  }

  /**
   * Generate contract from template
   */
  private generateFromTemplate(template: string, requirements: any, options: any = {}): string {
    let contract = template;

    // Replace placeholders
    contract = contract.replace(/\{\{CONTRACT_NAME\}\}/g, requirements.CONTRACT_NAME || 'MyContract');
    contract = contract.replace(/\{\{TOKEN_NAME\}\}/g, requirements.TOKEN_NAME || 'MyToken');
    contract = contract.replace(/\{\{TOKEN_SYMBOL\}\}/g, requirements.TOKEN_SYMBOL || 'MTK');
    contract = contract.replace(/\{\{LICENSE\}\}/g, options.license || 'MIT');
    contract = contract.replace(/\{\{SOL_VERSION\}\}/g, options.solVersion || '0.8.19');
    contract = contract.replace(/\{\{INITIAL_SUPPLY\}\}/g, requirements.INITIAL_SUPPLY || '1000000');
    contract = contract.replace(/\{\{MAX_SUPPLY\}\}/g, requirements.MAX_SUPPLY || '');
    
    // Handle conditional sections
    contract = this.processConditionals(contract, requirements);

    // Clean up empty lines
    contract = contract.replace(/\n\s*\n\s*\n/g, '\n\n');

    return contract;
  }

  /**
   * Process conditional template sections
   */
  private processConditionals(template: string, conditions: any): string {
    // Simple conditional processing
    return template.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      return conditions[condition] ? content : '';
    });
  }

  /**
   * Find line numbers for pattern matches
   */
  private findLineNumbers(code: string, pattern: RegExp): number[] {
    const lines = code.split('\n');
    const lineNumbers: number[] = [];
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        lineNumbers.push(index + 1);
      }
    });

    return lineNumbers;
  }

  /**
   * Generate Web3 application code
   */
  async generateWeb3App(config: any): Promise<{
    success: boolean;
    files?: string[];
    error?: string;
  }> {
    try {
      logger.info('Generating Web3 app:', config.name);

      // This would generate a complete Web3 application structure
      // For now, return a mock response
      const files = [
        'package.json',
        'src/App.tsx',
        'src/web3/config.ts',
        'src/components/WalletConnect.tsx',
        'src/hooks/useContract.ts',
        'contracts/Token.sol',
        'hardhat.config.js',
        '.env.example',
        'README.md'
      ];

      return {
        success: true,
        files
      };
    } catch (error: any) {
      logger.error('Failed to generate Web3 app:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deploy Web3 application
   */
  async deployWeb3App(params: any): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      logger.info('Deploying Web3 app to:', params.deployment.hosting);

      // Mock deployment URL
      const url = `https://${params.name}.${params.deployment.hosting}.app`;

      return {
        success: true,
        url
      };
    } catch (error: any) {
      logger.error('Failed to deploy Web3 app:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const aiContractService = new AIContractService();
export default aiContractService;
