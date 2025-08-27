import fetch from "node-fetch";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "..", ".env") });

async function testToken() {
  if (!process.env.GITHUB_TOKEN) {
    console.error("❌ GITHUB_TOKEN not found in .env file");
    console.log("Please add: GITHUB_TOKEN=your_token_here to .env file");
    process.exit(1);
  }

  console.log("🔑 Testing GitHub token...");
  console.log(
    "Token starts with:",
    process.env.GITHUB_TOKEN.substring(0, 10) + "...",
  );

  try {
    // Test user endpoint
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (response.ok) {
      const user = await response.json();
      console.log("✅ Token valid for user:", user.login || "API access");

      // Check rate limit
      const rateResponse = await fetch("https://api.github.com/rate_limit", {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (rateResponse.ok) {
        const rates = await rateResponse.json();
        console.log("\n📊 Rate Limit Status:");
        console.log(
          `   Core API: ${rates.rate.remaining}/${rates.rate.limit} requests remaining`,
        );
        if (rates.search) {
          console.log(
            `   Search API: ${rates.search.remaining}/${rates.search.limit} requests remaining`,
          );
        }

        const resetTime = new Date(rates.rate.reset * 1000);
        console.log(`   Resets at: ${resetTime.toLocaleTimeString()}`);

        if (rates.rate.remaining > 1000) {
          console.log("\n✅ Sufficient API calls available for population!");
        } else {
          console.log(
            "\n⚠️  Low on API calls. Wait for reset or use a different token.",
          );
        }
      }
    } else {
      console.error("❌ Invalid token:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("❌ Failed to test token:", error.message);
  }
}

testToken().catch(console.error);
