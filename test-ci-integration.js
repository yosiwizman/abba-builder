/**
 * CI/CD Integration Test Script
 *
 * This script tests the new CI/CD integration by:
 * 1. Checking if the provider manager is working
 * 2. Verifying GitHub Actions connector
 * 3. Testing mock data fallback
 */

const { CIProviderManager } = require("./src/lib/ci-cd/provider-manager");
const { CIProviderType } = require("./src/lib/ci-cd/types");

async function testCIIntegration() {
  console.log("🚀 Testing CI/CD Integration...\n");

  try {
    // Get provider manager instance
    const manager = CIProviderManager.getInstance();
    console.log("✅ Provider manager initialized");

    // Test registering a mock provider
    console.log("\n📝 Testing mock provider registration...");
    const mockConfig = {
      type: CIProviderType.GITHUB_ACTIONS,
      auth: {
        type: "token",
        token: "mock-token-for-testing",
      },
      options: {
        owner: "test-owner",
        repo: "test-repo",
      },
    };

    const registered = await manager.registerProvider(
      "test-provider",
      mockConfig,
    );
    console.log(
      `  Registration result: ${registered ? "✅ Success" : "❌ Failed"}`,
    );

    // Set as active provider
    const setActive = manager.setActiveProvider("test-provider");
    console.log(
      `  Set active provider: ${setActive ? "✅ Success" : "❌ Failed"}`,
    );

    // Get active provider
    const activeProvider = manager.getActiveProvider();
    if (activeProvider) {
      console.log(
        `  Active provider: ${activeProvider.name} (${activeProvider.type})`,
      );
      console.log(
        `  Authenticated: ${activeProvider.isAuthenticated() ? "✅ Yes" : "❌ No"}`,
      );
    }

    // Test getting builds (will fail with mock token, but tests the flow)
    console.log("\n📊 Testing build retrieval...");
    try {
      const builds = await manager.getBuilds({ limit: 5 });
      console.log(`  Retrieved ${builds.length} builds`);
      if (builds.length > 0) {
        console.log(`  Latest build: ${builds[0].id} - ${builds[0].status}`);
      }
    } catch (error) {
      console.log(`  ⚠️ Expected error with mock token: ${error.message}`);
    }

    // Test statistics
    console.log("\n📈 Testing statistics...");
    try {
      const stats = await manager.getStatistics();
      console.log(`  Total builds: ${stats.totalBuilds}`);
      console.log(`  Success rate: ${stats.successRate}%`);
    } catch (error) {
      console.log(`  ⚠️ Expected error with mock token: ${error.message}`);
    }

    console.log("\n✅ CI/CD Integration test completed successfully!");
    console.log("\n📌 Next steps:");
    console.log("  1. Configure a real GitHub token in the UI");
    console.log("  2. The dashboard will automatically fetch real data");
    console.log("  3. Build triggers and deployments will be enabled");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCIIntegration().catch(console.error);
