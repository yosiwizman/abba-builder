const fs = require('fs-extra');
const path = require('path');
const https = require('https');

// GitHub API rate limit: 60 requests per hour for unauthenticated
// Set your GitHub token here for 5000 requests per hour
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function fetchGitHubStats(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Project-Library-Stats-Fetcher',
        ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({
              stars: json.stargazers_count,
              forks: json.forks_count,
              open_issues: json.open_issues_count,
              description: json.description,
              language: json.language,
              topics: json.topics || [],
              license: json.license?.spdx_id || null,
              created_at: json.created_at,
              updated_at: json.updated_at,
              homepage: json.homepage,
              size: json.size,
              watchers: json.watchers_count
            });
          } catch (e) {
            reject(e);
          }
        } else if (res.statusCode === 403) {
          console.log(`Rate limited for ${owner}/${repo}`);
          resolve(null);
        } else if (res.statusCode === 404) {
          console.log(`Not found: ${owner}/${repo}`);
          resolve(null);
        } else {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function updateProjectLibraryStats() {
  const libraryPath = path.join(__dirname, '..', 'project-library');
  
  if (!await fs.pathExists(libraryPath)) {
    console.error('Project library not found at:', libraryPath);
    return;
  }

  console.log('Fetching GitHub stats for all projects...');
  console.log('Using token:', GITHUB_TOKEN ? 'Yes' : 'No (limited to 60 requests/hour)');
  
  const owners = await fs.readdir(libraryPath);
  let processed = 0;
  let updated = 0;
  let rateLimited = false;

  for (const owner of owners) {
    const ownerPath = path.join(libraryPath, owner);
    const ownerStat = await fs.stat(ownerPath);
    
    if (!ownerStat.isDirectory()) continue;
    
    const repos = await fs.readdir(ownerPath);
    
    for (const repo of repos) {
      const repoPath = path.join(ownerPath, repo);
      const repoStat = await fs.stat(repoPath);
      
      if (!repoStat.isDirectory()) continue;
      
      const metadataPath = path.join(repoPath, '.github-metadata.json');
      
      // Check if we should update (don't update if file exists and is recent)
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        const lastUpdated = metadata._fetched_at ? new Date(metadata._fetched_at) : null;
        const hoursSinceUpdate = lastUpdated ? 
          (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60) : Infinity;
        
        if (hoursSinceUpdate < 24) {
          console.log(`Skipping ${owner}/${repo} (updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
          processed++;
          continue;
        }
      }
      
      if (rateLimited) {
        console.log(`Skipping ${owner}/${repo} due to rate limit`);
        continue;
      }
      
      console.log(`Fetching stats for ${owner}/${repo}...`);
      
      try {
        const stats = await fetchGitHubStats(owner, repo);
        
        if (stats === null) {
          if (!stats) rateLimited = true;
        } else if (stats) {
          stats._fetched_at = new Date().toISOString();
          await fs.writeJson(metadataPath, stats, { spaces: 2 });
          console.log(`  ✓ Updated: ${stats.stars} stars, ${stats.forks} forks`);
          updated++;
        }
        
        processed++;
        
        // Rate limiting delay (be nice to GitHub API)
        if (!GITHUB_TOKEN) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay without token
        } else {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay with token
        }
        
      } catch (error) {
        console.error(`  ✗ Error fetching ${owner}/${repo}:`, error.message);
      }
      
      // Limit to first 50 projects if no token (due to rate limits)
      if (!GITHUB_TOKEN && processed >= 50) {
        console.log('\nStopping at 50 projects due to GitHub rate limits.');
        console.log('Set GITHUB_TOKEN environment variable to fetch all projects.');
        return;
      }
    }
  }
  
  console.log(`\nCompleted! Processed ${processed} projects, updated ${updated}.`);
}

// Run the script
updateProjectLibraryStats().catch(console.error);
