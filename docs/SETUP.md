# Enhanced Dyad (Abba) Setup Guide

This document explains how to set up the Enhanced Dyad (Abba) development environment with the Python validation engine and the Claude Opus integration.

## Prerequisites

- Node.js 20+ (as defined in package.json)
- npm (or pnpm/yarn if you prefer)
- Python 3.9+ available on PATH (one of: python, python3, or py on Windows)
- Git (optional, for development workflows)

On Windows, ensure Developer Mode is enabled (optional) and close any antivirus tools that may lock compiled node_modules binaries during install.

## Installation

1) Install Node dependencies

- Recommended clean install (keeps package-lock in place):
  - npm ci

- If you need a full clean reinstall (removes node_modules, lockfile, and .vite cache):
  - npm run clean:full

If you see EPERM unlink errors on Windows (e.g. tailwindcss-oxide.win32-x64-msvc.node locked):
- Close any running Electron/Vite/Node processes
- Restart your terminal/editor if it holds file handles
- Temporarily pause antivirus for the project folder and retry

2) Verify Python

- Run one of the following to confirm Python is available:
  - python --version
  - python3 --version
  - py --version (Windows)

The app will auto-detect Python by trying python3, python, then py.

3) Environment variables

Create a .env file (or set environment variables via your shell/OS):

- ANTHROPIC_API_KEY={{YOUR_ANTHROPIC_API_KEY}}
- (Optional) CLAUDE_MODEL=claude-4.1-opus
- (Optional) DYAD_ENGINE_URL, DYAD_GATEWAY_URL if using Dyad Pro

Important: Never hardcode secrets in code. Use environment variables or the in-app encrypted settings.

## Running the App (Development)

- Start Electron (with Vite):
  - npm start

- Run type-check:
  - npm run ts:main

- Run unit tests:
  - npm test

- Build packages:
  - npm run build

## Integration Test Suite

A high-level integration runner is included at test-integration.ts. It leverages the orchestrator to generate and (optionally) validate outputs.

Run:
- npm run test:integration

Ensure ANTHROPIC_API_KEY is set to enable Claude-powered generation. Without it, the orchestrator will run in fallback mode.

## Python Validation Engine

The Python validator (src/services/enhanced/validation_engine.py) is invoked automatically through the Node bridge when validating generated code. It requires no extra Python packages by default.

If you want to extend validation using Open Interpreter or other tools, see docs/VALIDATION.md.

## Troubleshooting

- Stuck install on Windows (EPERM): Close all processes using the repo, end Node/Electron background tasks from Task Manager, pause antivirus temporarily, and retry npm ci.
- Missing Python: Install Python 3 and add it to PATH. On Windows, you can install from Microsoft Store or python.org.
- Anthropic errors: Validate ANTHROPIC_API_KEY and ensure your model name is correct. The app falls back to a supported Sonnet model if the preferred one fails.

