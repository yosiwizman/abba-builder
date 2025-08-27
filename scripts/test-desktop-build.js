import { spawn } from "child_process";
import { setTimeout } from "timers/promises";

async function testDesktopBuild() {
  console.log("🚀 Testing desktop build...");
  console.log("Starting Electron app...");

  // Start Electron app
  const electron = spawn("npm", ["run", "start"], {
    stdio: "pipe",
    shell: true,
    env: { ...process.env, NODE_ENV: "production" },
  });

  let output = "";
  let errorOutput = "";

  electron.stdout.on("data", (data) => {
    const text = data.toString();
    output += text;
    console.log("📝", text.trim());
  });

  electron.stderr.on("data", (data) => {
    const text = data.toString();
    errorOutput += text;

    // Ignore known non-critical errors
    if (
      text.includes("ruby") ||
      text.includes("oxide") ||
      text.includes("extractor")
    ) {
      console.log("⚠️ Known issue (ignoring):", text.substring(0, 100));
      return;
    }

    console.error("❌ Error:", text.trim());
  });

  // Wait for app to start
  await setTimeout(10000);

  console.log("\n=== Test Results ===");

  // Check if app started successfully
  const checks = {
    "IPC handlers registered":
      output.includes("Enhanced IPC handlers registered") ||
      output.includes("Knowledge Hub IPC handlers registered"),
    "Electron app launched":
      output.includes("Launched Electron app") ||
      output.includes("Electron app started"),
    "Database initialized":
      output.includes("Initializing database") ||
      output.includes("database at:"),
    "Window created":
      output.includes("Registering window control handlers") ||
      output.includes("window-handlers"),
    "No critical errors":
      !errorOutput.includes("FATAL") &&
      !errorOutput.includes("crashed") &&
      !errorOutput.includes("TypeError"),
  };

  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`${passed ? "✅" : "❌"} ${check}`);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log("\n🎉 All checks passed! The desktop app is working.");
  } else {
    console.log("\n⚠️ Some checks failed. Review the output above.");
  }

  // Clean up
  console.log("\nStopping app...");
  electron.kill("SIGTERM");

  await setTimeout(2000);

  if (!electron.killed) {
    electron.kill("SIGKILL");
  }

  process.exit(allPassed ? 0 : 1);
}

testDesktopBuild().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
