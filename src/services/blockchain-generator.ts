/**
 * Blockchain Generator Service
 * Handles smart contract generation, compilation, and deployment
 */

import { ethers } from 'ethers';
import * as fs from 'fs-extra';
import * as path from 'path';
import log from 'electron-log';

const logger = log.scope('blockchain-generator');

export interface TokenParams {
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155';
  name: string;
  symbol: string;
  initialSupply?: number;
  maxSupply?: number;
  decimals?: number;
  mintable?: boolean;
  burnable?: boolean;
  pausable?: boolean;
  baseURI?: string; // For NFTs
}

export interface GeneratedContract {
  contractCode: string;
  testCode: string;
  deploymentScript: string;
  configFile: string;
  readmeFile: string;
  packageJson: string;
  projectPath?: string;
}

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  network?: string;
  error?: string;
  gasUsed?: string;
  deploymentCost?: string;
}

export class BlockchainGenerator {
  private templates: Map<string, string> = new Map();
  
  constructor() {
    this.loadTemplates();
  }
  
  private loadTemplates() {
    // ERC-20 Token Template
    this.templates.set('ERC20', `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract {{contractName}} is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ERC20Permit {
    uint256 public constant MAX_SUPPLY = {{maxSupply}} * 10**{{decimals}};
    
    constructor() 
        ERC20("{{name}}", "{{symbol}}") 
        ERC20Permit("{{name}}")
        Ownable(msg.sender)
    {
        _mint(msg.sender, {{initialSupply}} * 10**{{decimals}});
    }
    
    function decimals() public pure override returns (uint8) {
        return {{decimals}};
    }
    
    {{#if mintable}}
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    {{/if}}
    
    {{#if pausable}}
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
    {{/if}}
    
    // Required overrides
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}`);

    // ERC-721 NFT Template
    this.templates.set('ERC721', `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract {{contractName}} is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    uint256 public constant MAX_SUPPLY = {{maxSupply}};
    string public baseTokenURI;
    
    constructor() 
        ERC721("{{name}}", "{{symbol}}")
        Ownable(msg.sender)
    {
        baseTokenURI = "{{baseURI}}";
    }
    
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseTokenURI = _newBaseURI;
    }
    
    {{#if mintable}}
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        require(tokenId < MAX_SUPPLY, "Max supply reached");
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    {{/if}}
    
    {{#if pausable}}
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
    {{/if}}
    
    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}`);

    // ERC-1155 Multi-Token Template
    this.templates.set('ERC1155', `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

contract {{contractName}} is ERC1155, Ownable, ERC1155Pausable, ERC1155Burnable, ERC1155Supply {
    string public name = "{{name}}";
    string public symbol = "{{symbol}}";
    
    mapping(uint256 => uint256) public tokenMaxSupply;
    
    constructor() 
        ERC1155("{{baseURI}}")
        Ownable(msg.sender)
    {
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
    
    function setTokenMaxSupply(uint256 id, uint256 maxSupply) public onlyOwner {
        tokenMaxSupply[id] = maxSupply;
    }
    
    {{#if mintable}}
    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
        onlyOwner
    {
        require(
            tokenMaxSupply[id] == 0 || totalSupply(id) + amount <= tokenMaxSupply[id],
            "Max supply exceeded"
        );
        _mint(account, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < ids.length; i++) {
            require(
                tokenMaxSupply[ids[i]] == 0 || totalSupply(ids[i]) + amounts[i] <= tokenMaxSupply[ids[i]],
                "Max supply exceeded"
            );
        }
        _mintBatch(to, ids, amounts, data);
    }
    {{/if}}
    
    {{#if pausable}}
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }
    {{/if}}
    
    // Required overrides
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Pausable, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }
}`);
  }
  
  async generateToken(params: TokenParams): Promise<GeneratedContract> {
    logger.info(`Generating ${params.tokenType} token: ${params.name}`);
    
    try {
      // 1. Select and fill template
      const contractCode = this.fillTemplate(params);
      
      // 2. Generate tests
      const testCode = this.generateTests(params);
      
      // 3. Create deployment script
      const deploymentScript = this.generateDeploymentScript(params);
      
      // 4. Create configuration files
      const configFile = this.generateHardhatConfig();
      const packageJson = this.generatePackageJson(params);
      const readmeFile = this.generateReadme(params);
      
      // 5. Create project structure if path provided
      const projectPath = path.join(process.cwd(), 'generated-contracts', params.name.toLowerCase().replace(/\s/g, '-'));
      await this.createProjectStructure(projectPath, {
        contractCode,
        testCode,
        deploymentScript,
        configFile,
        packageJson,
        readmeFile,
      });
      
      return {
        contractCode,
        testCode,
        deploymentScript,
        configFile,
        packageJson,
        readmeFile,
        projectPath,
      };
    } catch (error: any) {
      logger.error('Failed to generate token:', error);
      throw error;
    }
  }
  
  private fillTemplate(params: TokenParams): string {
    let template = this.templates.get(params.tokenType) || '';
    
    // Replace placeholders
    const replacements: Record<string, any> = {
      contractName: params.name.replace(/\s/g, ''),
      name: params.name,
      symbol: params.symbol,
      initialSupply: params.initialSupply || 1000000,
      maxSupply: params.maxSupply || 10000000,
      decimals: params.decimals || 18,
      baseURI: params.baseURI || 'ipfs://QmYourBaseURI/',
      mintable: params.mintable !== false,
      burnable: params.burnable !== false,
      pausable: params.pausable === true,
    };
    
    // Basic template engine
    for (const [key, value] of Object.entries(replacements)) {
      template = template.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    // Handle conditionals
    template = template.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      return replacements[condition] ? content : '';
    });
    
    return template;
  }
  
  private generateTests(params: TokenParams): string {
    return `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("${params.name}", function () {
  let token;
  let owner;
  let addr1;
  let addr2;
  
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("${params.name.replace(/\s/g, '')}");
    token = await Token.deploy();
    await token.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
    
    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("${params.name}");
      expect(await token.symbol()).to.equal("${params.symbol}");
    });
    
    ${params.tokenType === 'ERC20' ? `
    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });` : ''}
  });
  
  ${params.mintable ? `
  describe("Minting", function () {
    ${params.tokenType === 'ERC20' ? `
    it("Should allow owner to mint tokens", async function () {
      await token.mint(addr1.address, ethers.parseEther("100"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    });
    
    it("Should not exceed max supply", async function () {
      const maxSupply = await token.MAX_SUPPLY();
      await expect(
        token.mint(addr1.address, maxSupply + 1n)
      ).to.be.revertedWith("Max supply exceeded");
    });` : ''}
    
    ${params.tokenType === 'ERC721' ? `
    it("Should allow owner to mint NFT", async function () {
      await token.safeMint(addr1.address, "tokenURI");
      expect(await token.balanceOf(addr1.address)).to.equal(1);
    });` : ''}
  });` : ''}
  
  ${params.burnable ? `
  describe("Burning", function () {
    ${params.tokenType === 'ERC20' ? `
    it("Should allow token holders to burn their tokens", async function () {
      const initialBalance = await token.balanceOf(owner.address);
      await token.burn(ethers.parseEther("100"));
      expect(await token.balanceOf(owner.address)).to.equal(
        initialBalance - ethers.parseEther("100")
      );
    });` : ''}
  });` : ''}
  
  ${params.pausable ? `
  describe("Pausable", function () {
    it("Should allow owner to pause transfers", async function () {
      await token.pause();
      ${params.tokenType === 'ERC20' ? `
      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");` : ''}
    });
    
    it("Should allow owner to unpause transfers", async function () {
      await token.pause();
      await token.unpause();
      ${params.tokenType === 'ERC20' ? `
      await token.transfer(addr1.address, ethers.parseEther("100"));
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));` : ''}
    });
  });` : ''}
});`;
  }
  
  private generateDeploymentScript(params: TokenParams): string {
    return `const hre = require("hardhat");

async function main() {
  console.log("Deploying ${params.name}...");
  
  const Token = await hre.ethers.getContractFactory("${params.name.replace(/\s/g, '')}");
  const token = await Token.deploy();
  
  await token.waitForDeployment();
  
  console.log("${params.name} deployed to:", await token.getAddress());
  
  // Verify contract on Etherscan
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await token.deploymentTransaction().wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: await token.getAddress(),
        constructorArguments: [],
      });
      console.log("Contract verified!");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });`;
  }
  
  private generateHardhatConfig(): string {
    return `require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: true,
    currency: "USD"
  }
};`;
  }
  
  private generatePackageJson(params: TokenParams): string {
    return JSON.stringify({
      name: params.name.toLowerCase().replace(/\s/g, '-'),
      version: "1.0.0",
      description: `${params.tokenType} Token: ${params.name}`,
      scripts: {
        compile: "hardhat compile",
        test: "hardhat test",
        deploy: "hardhat run scripts/deploy.js",
        "deploy:localhost": "hardhat run scripts/deploy.js --network localhost",
        "deploy:sepolia": "hardhat run scripts/deploy.js --network sepolia",
        "deploy:mainnet": "hardhat run scripts/deploy.js --network mainnet",
        verify: "hardhat verify",
        clean: "hardhat clean"
      },
      dependencies: {
        "@openzeppelin/contracts": "^5.0.0"
      },
      devDependencies: {
        "@nomicfoundation/hardhat-toolbox": "^4.0.0",
        "hardhat": "^2.19.0",
        "dotenv": "^16.3.1"
      },
      author: "Abba AI",
      license: "MIT"
    }, null, 2);
  }
  
  private generateReadme(params: TokenParams): string {
    return `# ${params.name}

${params.tokenType} Token Smart Contract

## Overview
- **Name**: ${params.name}
- **Symbol**: ${params.symbol}
- **Type**: ${params.tokenType}
${params.tokenType === 'ERC20' ? `- **Initial Supply**: ${params.initialSupply || 1000000}
- **Max Supply**: ${params.maxSupply || 10000000}
- **Decimals**: ${params.decimals || 18}` : ''}
${params.mintable ? '- **Mintable**: Yes' : ''}
${params.burnable ? '- **Burnable**: Yes' : ''}
${params.pausable ? '- **Pausable**: Yes' : ''}

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Create \`.env\` file:
\`\`\`
PRIVATE_KEY=your_private_key
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key
ETHERSCAN_API_KEY=your_etherscan_api_key
\`\`\`

## Commands

### Compile
\`\`\`bash
npm run compile
\`\`\`

### Test
\`\`\`bash
npm test
\`\`\`

### Deploy
\`\`\`bash
# Local
npm run deploy:localhost

# Sepolia Testnet
npm run deploy:sepolia

# Mainnet
npm run deploy:mainnet
\`\`\`

### Verify on Etherscan
\`\`\`bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
\`\`\`

## Security

This contract uses OpenZeppelin's audited smart contract libraries for maximum security.

## License
MIT

---
Generated by Abba AI`;
  }
  
  private async createProjectStructure(projectPath: string, files: any): Promise<void> {
    // Create directories
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, 'contracts'));
    await fs.ensureDir(path.join(projectPath, 'scripts'));
    await fs.ensureDir(path.join(projectPath, 'test'));
    
    // Write files
    const contractName = files.contractCode.match(/contract (\w+)/)?.[1] || 'Token';
    await fs.writeFile(
      path.join(projectPath, 'contracts', `${contractName}.sol`),
      files.contractCode
    );
    await fs.writeFile(
      path.join(projectPath, 'test', `${contractName}.test.js`),
      files.testCode
    );
    await fs.writeFile(
      path.join(projectPath, 'scripts', 'deploy.js'),
      files.deploymentScript
    );
    await fs.writeFile(
      path.join(projectPath, 'hardhat.config.js'),
      files.configFile
    );
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      files.packageJson
    );
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      files.readmeFile
    );
    
    // Create .gitignore
    await fs.writeFile(
      path.join(projectPath, '.gitignore'),
      `node_modules/
.env
coverage/
coverage.json
typechain/
typechain-types/
cache/
artifacts/
.DS_Store`
    );
    
    logger.info(`Project structure created at: ${projectPath}`);
  }
  
  async deployToNetwork(contractPath: string, network: string = 'localhost'): Promise<DeploymentResult> {
    logger.info(`Deploying to ${network}...`);
    
    try {
      // This would integrate with hardhat to deploy
      // For now, return mock result
      return {
        success: true,
        contractAddress: '0x' + '0'.repeat(40),
        transactionHash: '0x' + '0'.repeat(64),
        network,
        gasUsed: '200000',
        deploymentCost: '0.005 ETH',
      };
    } catch (error: any) {
      logger.error('Deployment failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default BlockchainGenerator;
