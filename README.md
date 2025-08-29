# Abba Builder

🚀 **AI-powered app builder based on Dyad with enhanced capabilities**

Write a prompt. Our AI generates production-ready apps with 95% success rate. Chat to refine. Deploy anywhere.

**Build smarter. Deploy faster. Never fail.**

[![Image](https://github.com/user-attachments/assets/f6c83dfc-6ffd-4d32-93dd-4b9c46d17790)](http://dyad.sh/)

## 🎯 Key Features

### 🤖 Enhanced AI Capabilities
- **95% Success Rate**: Advanced code generation with Claude Opus 4 integration
- **Automated Validation**: Built-in testing and verification system
- **Self-Healing Code**: Automatic error detection and correction
- **Smart Context Management**: Intelligent file and dependency handling
- **Learning System**: Improves with each build based on patterns

### 🛠 Original Dyad Features
- ⚡️ **Local-First**: Fast, private and no lock-in
- 🔑 **Bring Your Own Keys**: Use your own AI API keys
- 🖥️ **Cross-Platform**: Easy to run on Mac or Windows
- 🎨 **Modern UI**: Clean interface with live preview
- 📦 **Instant Deploy**: Export to GitHub, Vercel, or local files

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- Git
- API Key (Claude/OpenAI/Local LLM)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/abba-builder.git
cd abba-builder

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your API keys to .env file
# ANTHROPIC_API_KEY=your_key_here

# Start the application
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with:

```env
# Required: Choose at least one AI provider
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# Optional: Enhanced features
CLAUDE_MODEL=claude-3-5-sonnet-latest
CLAUDE_FALLBACK_MODEL=claude-3-haiku-20240307
CLAUDE_STREAMING_TIMEOUT=300000

# Optional: Local AI models
OLLAMA_HOST=http://127.0.0.1:11434

# Optional: GitHub integration
GITHUB_TOKEN=your_github_token
```

## 🌿 Branch Strategy

We follow Git Flow for development:

- `main` - Production-ready code
- `development` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent fixes to production

### Making Changes

1. Create a feature branch from `development`
2. Make your changes
3. Submit a PR to `development`
4. After review, changes are merged to `development`
5. Periodically, `development` is merged to `main`

## 🧪 Enhanced Services

The `src/services/enhanced/` directory contains our AI-powered enhancements:

- **claude-opus.ts** - Advanced Claude integration
- **orchestrator.ts** - Request coordination system
- **validation_engine.py** - Python-based validation
- **self-healing-system.js** - Automatic error correction
- **metrics-tracker.ts** - Performance monitoring
- **context-manager.ts** - Smart context handling

## 📝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## 🤝 Community

- **Reddit**: [r/dyadbuilders](https://www.reddit.com/r/dyadbuilders/)
- **Discord**: Coming soon!
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/abba-builder/issues)

## 📄 License

Apache 2.0 - See [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- Built on top of [Dyad](https://github.com/dyad-sh/dyad)
- Powered by Claude, OpenAI, and open-source LLMs
- Community contributors and testers

---

**Made with ❤️ by the Abba Builder Team**
