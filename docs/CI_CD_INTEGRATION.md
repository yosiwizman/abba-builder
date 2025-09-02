# CI/CD Integration Documentation

## Overview

This document describes the newly implemented CI/CD integration system that replaces mock data with real CI/CD provider connections.

## Architecture

### Core Components

1. **Provider Manager** (`src/lib/ci-cd/provider-manager.ts`)

   - Singleton pattern for managing multiple CI/CD providers
   - Handles provider registration, authentication, and switching
   - Provides unified interface for all CI operations

2. **Provider Interface** (`src/lib/ci-cd/types.ts`)

   - Defines standard contract for all CI providers
   - Includes types for builds, deployments, statistics, and real-time updates
   - Supports authentication (token, OAuth, basic auth)

3. **Provider Implementations**

   - **GitHub Actions** (`src/lib/ci-cd/providers/github-actions.ts`)
     - Full implementation using Octokit REST client
     - Supports workflows, deployments, and repository statistics
     - Real-time updates via polling (WebSocket support ready)

4. **IPC Handlers** (`src/ipc/handlers/ci_handlers_v2.ts`)
   - Enhanced handlers that integrate with provider manager
   - Graceful fallback to mock data when no provider configured
   - Support for real-time updates via IPC events

## Features Implemented

### ✅ Completed

- Pluggable CI/CD provider architecture
- GitHub Actions connector with full API integration
- Provider authentication and configuration management
- Build fetching and status tracking
- Deployment management (list, trigger, rollback)
- Statistics and metrics calculation
- Real-time update subscription mechanism
- Mock data fallback for development/demo
- Error handling and retry logic
- IPC integration with Electron main process

### 🚧 Ready for UI Integration

- Build triggering from dashboard
- Deployment triggers with environment selection
- Real-time WebSocket updates (polling available as fallback)
- Provider switching in settings
- CI status badges for project library

## Usage

### Configuring a Provider

```typescript
// From renderer process via IPC
await window.electron.invoke("ci:configure-provider", {
  providerId: "github-main",
  type: "github-actions",
  auth: {
    type: "token",
    token: "ghp_your_github_token",
  },
  owner: "your-org",
  repo: "your-repo",
});
```

### Fetching Builds

```typescript
// Get recent builds
const builds = await window.electron.invoke("ci:get-builds", {
  branch: "main",
  limit: 30,
});
```

### Triggering a Build

```typescript
// Trigger a new build
const result = await window.electron.invoke("ci:trigger-build", {
  project: "my-project",
  branch: "main",
});
```

### Real-time Updates

```typescript
// Subscribe to updates
await window.electron.invoke("ci:subscribe-updates");

// Listen for updates
window.electron.on("ci:update", (event, update) => {
  console.log("CI Update:", update);
  // Update UI accordingly
});
```

## Configuration

### Environment Variables

- No special environment variables required
- Provider tokens stored securely in app settings

### Provider Authentication

#### GitHub Actions

1. Generate a Personal Access Token (PAT) with repo scope
2. Configure in app settings or via UI
3. Token is stored securely and used for all API calls

## Testing

### Integration Test

Run the integration test to verify the setup:

```bash
npx tsx test-ci-integration.js
```

### Manual Testing

1. Start the application: `npm start`
2. Navigate to CI/CD dashboard
3. Configure a GitHub token in settings
4. Dashboard should display real build data

## Error Handling

The system implements multiple levels of error handling:

1. **Provider Level**: Each provider handles API errors gracefully
2. **Manager Level**: Falls back to other providers or mock data
3. **IPC Level**: Returns structured error responses
4. **UI Level**: Shows user-friendly error messages

## Security Considerations

- Tokens are never logged or exposed in error messages
- All sensitive data is redacted in logs
- Tokens stored using Electron's secure storage mechanisms
- OAuth flow ready for implementation (GitHub OAuth app required)

## Future Enhancements

### Immediate Next Steps

1. **UI Configuration Panel**: Add settings UI for provider configuration
2. **Status Badges**: Integrate build status into project cards
3. **Notifications**: Add desktop notifications for build events
4. **Multiple Providers**: Support multiple providers simultaneously

### Planned Features

1. **Jenkins Integration**: Add Jenkins provider connector
2. **CircleCI Integration**: Add CircleCI provider connector
3. **GitLab CI Integration**: Add GitLab CI provider connector
4. **WebSocket Gateway**: Implement real-time WebSocket server
5. **Build Logs Streaming**: Stream build logs in real-time
6. **Metrics Dashboard**: Advanced analytics and trends
7. **Pipeline Visualization**: Visual pipeline editor
8. **RBAC Integration**: Role-based access control for CI operations

## Troubleshooting

### Common Issues

1. **"No active CI provider" error**

   - Solution: Configure a provider with valid credentials

2. **"Bad credentials" error**

   - Solution: Verify GitHub token has correct permissions

3. **Rate limiting**

   - Solution: Implement caching or use webhook updates

4. **Build not triggering**
   - Solution: Check workflow permissions and branch protection rules

## API Reference

See `src/lib/ci-cd/types.ts` for complete TypeScript definitions of all interfaces and types.

## Contributing

To add a new CI/CD provider:

1. Create a new provider class implementing `CIProvider` interface
2. Add provider type to `CIProviderType` enum
3. Register provider factory in provider manager
4. Add provider-specific configuration UI
5. Write unit tests for the new provider
6. Update this documentation

## Support

For issues or questions:

1. Check existing GitHub issues
2. Review error logs in developer console
3. Contact the development team

---

_Last Updated: September 2025_
_Version: 1.0.0_
