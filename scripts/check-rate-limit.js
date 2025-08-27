async function checkRateLimit() {
  try {
    const headers = {};
    
    // Add token if available
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      console.log('✓ Using GitHub token for higher rate limits\n');
    } else {
      console.log('⚠️ No GitHub token found. Using unauthenticated API (60 requests/hour)\n');
      console.log('   Set GITHUB_TOKEN environment variable for 5000 requests/hour\n');
    }
    
    headers['User-Agent'] = 'Abba-Project-Library';
    
    const response = await fetch('https://api.github.com/rate_limit', { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to check rate limit: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 GitHub API Rate Limit Status:');
    console.log('================================\n');
    
    // Core API (search and repository endpoints)
    console.log('🔍 Search API:');
    console.log(`   Limit: ${data.resources.search.limit} requests/hour`);
    console.log(`   Remaining: ${data.resources.search.remaining} requests`);
    console.log(`   Used: ${data.resources.search.limit - data.resources.search.remaining} requests`);
    
    const searchReset = new Date(data.resources.search.reset * 1000);
    console.log(`   Resets at: ${searchReset.toLocaleString()}`);
    
    if (data.resources.search.remaining === 0) {
      const waitMinutes = Math.ceil((searchReset - Date.now()) / 1000 / 60);
      console.log(`   ⏳ RATE LIMITED! Wait ${waitMinutes} minutes before continuing.`);
    } else {
      const percentUsed = Math.round((data.resources.search.limit - data.resources.search.remaining) / data.resources.search.limit * 100);
      console.log(`   ✅ ${percentUsed}% used, ${data.resources.search.remaining} requests available`);
    }
    
    console.log('\n📦 Core API:');
    console.log(`   Limit: ${data.resources.core.limit} requests/hour`);
    console.log(`   Remaining: ${data.resources.core.remaining} requests`);
    console.log(`   Used: ${data.resources.core.limit - data.resources.core.remaining} requests`);
    
    const coreReset = new Date(data.resources.core.reset * 1000);
    console.log(`   Resets at: ${coreReset.toLocaleString()}`);
    
    if (data.resources.core.remaining === 0) {
      const waitMinutes = Math.ceil((coreReset - Date.now()) / 1000 / 60);
      console.log(`   ⏳ RATE LIMITED! Wait ${waitMinutes} minutes before continuing.`);
    } else {
      const percentUsed = Math.round((data.resources.core.limit - data.resources.core.remaining) / data.resources.core.limit * 100);
      console.log(`   ✅ ${percentUsed}% used, ${data.resources.core.remaining} requests available`);
    }
    
    // Recommendation
    console.log('\n💡 Recommendations:');
    if (data.resources.search.remaining < 10 || data.resources.core.remaining < 100) {
      console.log('   ⚠️ Rate limit is low. Consider waiting before running population script.');
      
      const maxReset = Math.max(data.resources.search.reset, data.resources.core.reset);
      const waitTime = Math.ceil((maxReset * 1000 - Date.now()) / 1000 / 60);
      console.log(`   ⏱️ Full reset in ${waitTime} minutes`);
    } else {
      console.log('   ✅ You have enough requests to run the population script!');
      console.log('   Run: node scripts/populate-library-now.js');
    }
    
  } catch (error) {
    console.error('❌ Error checking rate limit:', error.message);
    console.error('   Make sure you have internet connection');
  }
}

checkRateLimit();
