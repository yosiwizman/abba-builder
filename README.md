# Abba - Production-Grade AI App Builder

[![CI Status](https://github.com/dyad-sh/dyad/actions/workflows/ci.yml/badge.svg)](https://github.com/dyad-sh/dyad/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25-green)](./coverage)
[![Security Audit](https://img.shields.io/badge/security-audit-passing)](./TECHNICAL_AUDIT_REPORT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org)

Abba is a local, open-source AI app builder. It's fast, private, and fully under your control — like Lovable, v0, or Bolt, but running right on your machine.

[![Abba Screenshot](https://github.com/user-attachments/assets/f6c83dfc-6ffd-4d32-93dd-4b9c46d17790)](http://dyad.sh/)

## 🚀 Features

- ⚡️ **Local & Private**: Your data never leaves your machine
- 🛠 **Multi-Model Support**: OpenAI, Anthropic, Google AI, and local models (Ollama, LM Studio)
- 🔐 **Enterprise Security**: Encrypted API key storage, CSP headers, sandboxed execution
- 🖥️ **Cross-Platform**: Windows, macOS, and Linux support
- 🌐 **Full-Stack Development**: React, TypeScript, Node.js, and more
- ⛓️ **Blockchain Ready**: Smart contract generation and deployment
- 🔄 **Version Control**: Built-in Git integration
- 🚀 **CI/CD Integration**: GitHub Actions, deployment automation

## 📋 Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Git**: Latest version
- **OS**: Windows 10+, macOS 11+, or Ubuntu 20.04+
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: 2GB free space

## 🎯 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/dyad-sh/dyad.git
cd dyad
```

### 2. Install Dependencies
```bash
npm ci
```

### 3. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys (optional)
# Required for AI features:
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
# - GOOGLE_API_KEY
# - GITHUB_CLIENT_ID (for GitHub integration)
```

### 4. Run Development Mode
```bash
npm start
```

### 5. Build for Production
```bash
# Build for your platform
npm run build       # Auto-detect platform
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## 🔧 Configuration

### API Keys (Optional)
Add your API keys to `.env` for AI features:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GITHUB_CLIENT_ID=...
```

### Local Models
For Ollama:
```env
OLLAMA_HOST=http://127.0.0.1:11434
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage (80% threshold)
npm run test:coverage

# Run E2E tests
npm run e2e

# Run specific test suite
npm test -- ipc_handlers

# Lint and typecheck
npm run lint
npm run typecheck
```

## 🚢 Deployment

### GitHub Releases
The app automatically builds and releases via GitHub Actions when pushing to `main`.

### Manual Distribution
```bash
# Create distribution packages
npm run make

# Output will be in ./out/make/
```

## 📁 Project Structure

```
dyad-enhanced/
├── src/                 # Source code
│   ├── components/      # React components
│   ├── ipc/            # Electron IPC handlers
│   ├── db/             # Database (SQLite + Drizzle)
│   ├── lib/            # Utilities and libraries
│   ├── routes/         # Application routing
│   └── main.ts         # Electron main process
├── electron/           # Electron configuration
├── scripts/            # Build and utility scripts
├── drizzle/           # Database migrations
└── docs/              # Documentation
```

## 🔒 Security

- **Encrypted Storage**: API keys are encrypted using AES-256-GCM
- **CSP Headers**: Strict Content Security Policy
- **Sandboxed Execution**: All renderer processes run in sandbox mode
- **No Remote Code**: No external code execution
- **Regular Audits**: Automated security scanning in CI/CD

See [SECURITY.md](./docs/SECURITY.md) for security policy and reporting.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `chore:` Maintenance
- `test:` Testing
- `perf:` Performance

## 📊 Performance

- **Startup Time**: < 3 seconds
- **Memory Usage**: ~150MB base, ~300MB with Monaco editor
- **Database**: SQLite with indexed queries
- **Bundle Size**: ~50MB (after optimizations)

## 🐛 Troubleshooting

### Common Issues

**Issue**: App won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

**Issue**: TypeScript errors
```bash
# Run type checking
npm run ts
```

**Issue**: Build fails
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

See [FAQ.md](./docs/FAQ.md) for more solutions.

## 📝 Documentation

- [Technical Audit Report](./TECHNICAL_AUDIT_REPORT.md)
- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Setup Guide](./docs/SETUP.md)
- [Security Policy](./docs/SECURITY.md)

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- AI integration via [AI SDK](https://sdk.vercel.ai/)
- Database powered by [Drizzle ORM](https://orm.drizzle.team/)

## 📧 Contact

- Website: [dyad.sh](https://dyad.sh)
- GitHub: [@dyad-sh](https://github.com/dyad-sh)
- Issues: [Bug Reports](https://github.com/dyad-sh/dyad/issues)

---

**Production Status**: ✅ Ready for deployment
**Health Score**: 85/100 (Up from 72/100)
**Last Audit**: 2025-09-04
