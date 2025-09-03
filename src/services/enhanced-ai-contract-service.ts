import { ethers } from 'ethers';
import * as parser from '@solidity-parser/parser';
// Langchain imports commented out until properly configured
// import { ChatOpenAI } from '@langchain/openai';
// import { PromptTemplate } from 'langchain/prompts';
// import { LLMChain } from 'langchain/chains';

// Import OpenZeppelin contract templates
const OPENZEPPELIN_TEMPLATES = {
  ERC20: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {{contractName}} is ERC20, ERC20Burnable, Ownable {
    constructor() ERC20("{{tokenName}}", "{{tokenSymbol}}") {
        _mint(msg.sender, {{initialSupply}} * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`,
  
  ERC721: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract {{contractName}} is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 public maxSupply = {{maxSupply}};
    uint256 public mintPrice = {{mintPrice}} ether;

    constructor() ERC721("{{nftName}}", "{{nftSymbol}}") {}

    function safeMint(address to, string memory uri) public payable {
        require(totalSupply() < maxSupply, "Max supply reached");
        require(msg.value >= mintPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Required overrides
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`,

  MULTISIG: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract {{contractName}} {
    event Deposit(address indexed sender, uint amount, uint balance);
    event SubmitTransaction(uint indexed txIndex);
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(uint indexed txIndex);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }

    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public isConfirmed;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "owners required");
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            "invalid number of required confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");
            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(address _to, uint _value, bytes memory _data) public onlyOwner {
        uint txIndex = transactions.length;
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0
        }));

        emit SubmitTransaction(txIndex);
    }

    function confirmTransaction(uint _txIndex)
        public onlyOwner txExists(_txIndex) notExecuted(_txIndex) notConfirmed(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        require(transaction.numConfirmations >= numConfirmationsRequired, "cannot execute tx");

        transaction.executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "tx failed");

        emit ExecuteTransaction(_txIndex);
    }

    function revokeConfirmation(uint _txIndex) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }
}`
};

export class EnhancedAIContractService {
  private llm: any | null = null;

  constructor() {
    // Initialize LLM if API key is available (disabled for now)
    // const openaiApiKey = process.env.OPENAI_API_KEY;
    // if (openaiApiKey) {
    //   this.llm = new ChatOpenAI({
    //     openAIApiKey: openaiApiKey,
    //     modelName: 'gpt-4',
    //     temperature: 0.3,
    //   });
    // }
  }

  async generateContract(params: {
    prompt: string;
    template?: string;
    options?: any;
  }): Promise<{ success: boolean; contract?: string; error?: string }> {
    try {
      // Use template if specified
      if (params.template && OPENZEPPELIN_TEMPLATES[params.template.toUpperCase()]) {
        const template = OPENZEPPELIN_TEMPLATES[params.template.toUpperCase()];
        const filledContract = this.fillTemplate(template, params.prompt, params.options);
        return { success: true, contract: filledContract };
      }

      // Generate custom contract using AI if available (disabled for now)
      // if (this.llm) {
      //   const prompt = PromptTemplate.fromTemplate(`
      //     Generate a secure Solidity smart contract based on the following requirements:
      //     {requirements}
      //     
      //     Use OpenZeppelin contracts where appropriate.
      //     Include proper security patterns and gas optimizations.
      //     Add comprehensive comments.
      //     
      //     Contract:
      //   `);

      //   const chain = new LLMChain({ llm: this.llm, prompt });
      //   const result = await chain.call({ requirements: params.prompt });
      //   
      //   return { success: true, contract: result.text };
      // }

      // Fallback to simple template
      return this.generateSimpleContract(params.prompt);
    } catch (error) {
      console.error('Error generating contract:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

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
      const issues: any[] = [];
      const optimizations: any[] = [];

      // Parse the contract
      const ast = parser.parse(params.contract, { loc: true, range: true });

      // Security checks
      parser.visit(ast, {
        FunctionDefinition: (node: any) => {
          // Check for missing access control
          if (node.name === 'withdraw' || node.name === 'transfer') {
            if (!node.modifiers || node.modifiers.length === 0) {
              issues.push({
                severity: 'high',
                title: 'Missing Access Control',
                description: `Function ${node.name} lacks access control modifiers`,
                line: node.loc?.start.line,
                suggestion: 'Add onlyOwner or appropriate access control modifier'
              });
            }
          }

          // Check for reentrancy vulnerabilities
          if (node.body) {
            const hasExternalCall = this.checkForExternalCall(node.body);
            const hasStateChange = this.checkForStateChange(node.body);
            
            if (hasExternalCall && hasStateChange) {
              issues.push({
                severity: 'critical',
                title: 'Potential Reentrancy',
                description: `Function ${node.name} may be vulnerable to reentrancy attacks`,
                line: node.loc?.start.line,
                suggestion: 'Use ReentrancyGuard or checks-effects-interactions pattern'
              });
            }
          }
        },

        StateVariableDeclaration: (node: any) => {
          // Check for uninitialized state variables
          if (!node.variables[0].expression) {
            optimizations.push({
              title: 'Uninitialized State Variable',
              description: `Variable ${node.variables[0].name} could be initialized at declaration`,
              gasImpact: 'Low',
              code: `${node.variables[0].typeName.type} ${node.variables[0].name} = <initial_value>;`
            });
          }
        }
      });

      // Gas optimization checks
      if (params.checks.includes('gas')) {
        // Check for storage optimization opportunities
        const storageVars = this.findStorageVariables(ast);
        if (storageVars.length > 8) {
          optimizations.push({
            title: 'Storage Packing Opportunity',
            description: 'Consider packing storage variables to save gas',
            gasImpact: 'Medium',
            code: '// Pack variables of the same size together'
          });
        }
      }

      return {
        success: true,
        securityIssues: issues,
        optimizations: optimizations
      };
    } catch (error) {
      console.error('Error analyzing contract:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async compileContract(contract: string): Promise<{
    success: boolean;
    bytecode?: string;
    abi?: any[];
    error?: string;
  }> {
    try {
      // Dynamic import of solc
      const solc = await import('solc');
      
      const input = {
        language: 'Solidity',
        sources: {
          'Contract.sol': {
            content: contract
          }
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode']
            }
          }
        }
      };

      const output = JSON.parse(solc.default.compile(JSON.stringify(input)));
      
      if (output.errors) {
        const errors = output.errors.filter((e: any) => e.severity === 'error');
        if (errors.length > 0) {
          return {
            success: false,
            error: errors.map((e: any) => e.formattedMessage).join('\n')
          };
        }
      }

      const contractName = Object.keys(output.contracts['Contract.sol'])[0];
      const compiledContract = output.contracts['Contract.sol'][contractName];

      return {
        success: true,
        bytecode: compiledContract.evm.bytecode.object,
        abi: compiledContract.abi
      };
    } catch (error) {
      console.error('Error compiling contract:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private fillTemplate(template: string, prompt: string, options: any): string {
    // Extract parameters from prompt using simple regex patterns
    const params: any = {
      contractName: 'MyContract',
      tokenName: 'MyToken',
      tokenSymbol: 'MTK',
      initialSupply: '1000000',
      nftName: 'MyNFT',
      nftSymbol: 'MNFT',
      maxSupply: '10000',
      mintPrice: '0.01'
    };

    // Try to extract values from prompt
    const nameMatch = prompt.match(/called\s+"?(\w+)"?/i);
    if (nameMatch) params.tokenName = nameMatch[1];

    const symbolMatch = prompt.match(/symbol\s+"?(\w+)"?/i);
    if (symbolMatch) params.tokenSymbol = symbolMatch[1];

    const supplyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:million|k|thousand)?\s+supply/i);
    if (supplyMatch) {
      let supply = parseFloat(supplyMatch[1]);
      if (prompt.toLowerCase().includes('million')) supply *= 1000000;
      if (prompt.toLowerCase().includes('k') || prompt.toLowerCase().includes('thousand')) supply *= 1000;
      params.initialSupply = supply.toString();
    }

    // Replace template variables
    let filledContract = template;
    Object.keys(params).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      filledContract = filledContract.replace(regex, params[key]);
    });

    // Apply advanced options if provided
    if (options) {
      if (options.solVersion) {
        filledContract = filledContract.replace(/pragma solidity \^[\d.]+;/, `pragma solidity ^${options.solVersion};`);
      }
      if (options.license) {
        filledContract = filledContract.replace(/SPDX-License-Identifier: \w+/, `SPDX-License-Identifier: ${options.license}`);
      }
    }

    return filledContract;
  }

  private generateSimpleContract(prompt: string): { success: boolean; contract: string } {
    // Generate a simple contract based on keywords in the prompt
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('token') || lowerPrompt.includes('erc20')) {
      return {
        success: true,
        contract: this.fillTemplate(OPENZEPPELIN_TEMPLATES.ERC20, prompt, {})
      };
    } else if (lowerPrompt.includes('nft') || lowerPrompt.includes('erc721')) {
      return {
        success: true,
        contract: this.fillTemplate(OPENZEPPELIN_TEMPLATES.ERC721, prompt, {})
      };
    } else if (lowerPrompt.includes('multisig') || lowerPrompt.includes('multi-sig')) {
      return {
        success: true,
        contract: this.fillTemplate(OPENZEPPELIN_TEMPLATES.MULTISIG, prompt, {})
      };
    }

    // Default simple contract
    return {
      success: true,
      contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleContract {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    // Add your custom logic here based on: ${prompt}
}`
    };
  }

  private checkForExternalCall(node: any): boolean {
    let hasCall = false;
    parser.visit(node, {
      MemberAccess: (n: any) => {
        if (n.memberName === 'call' || n.memberName === 'transfer' || n.memberName === 'send') {
          hasCall = true;
        }
      }
    });
    return hasCall;
  }

  private checkForStateChange(node: any): boolean {
    let hasStateChange = false;
    parser.visit(node, {
      BinaryOperation: (n: any) => {
        if (n.operator === '=') {
          hasStateChange = true;
        }
      }
    });
    return hasStateChange;
  }

  private findStorageVariables(ast: any): any[] {
    const vars: any[] = [];
    parser.visit(ast, {
      StateVariableDeclaration: (node: any) => {
        vars.push(node);
      }
    });
    return vars;
  }
}
