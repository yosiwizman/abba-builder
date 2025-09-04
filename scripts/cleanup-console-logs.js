#!/usr/bin/env node
/**
 * Script to remove console.log statements from TypeScript/JavaScript files
 * Preserves important error logging (logger.*, log.*)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'out/**',
  '.vite/**',
  'project-library/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx'
];

const PRESERVE_PATTERNS = [
  /logger\.\w+/,  // Preserve logger.info, logger.error, etc.
  /log\.\w+/,     // Preserve electron-log statements
  /console\.error/,  // Keep error logging for now
  /console\.warn/    // Keep warnings for now
];

function shouldPreserveLine(line) {
  return PRESERVE_PATTERNS.some(pattern => pattern.test(line));
}

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  
  const cleanedLines = lines.map(line => {
    // Skip if it's a preserved pattern
    if (shouldPreserveLine(line)) {
      return line;
    }
    
    // Remove console.log statements
    if (line.includes('console.log')) {
      // Handle multi-line console.log
      if (line.trim().startsWith('console.log')) {
        modified = true;
        return '// ' + line; // Comment out instead of removing
      }
      // Handle inline console.log
      const cleanedLine = line.replace(/console\.log\([^)]*\);?/g, '');
      if (cleanedLine !== line) {
        modified = true;
        return cleanedLine;
      }
    }
    
    // Remove debugger statements
    if (line.includes('debugger')) {
      modified = true;
      return line.replace(/\s*debugger;?/g, '');
    }
    
    return line;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, cleanedLines.join('\n'));
    return true;
  }
  return false;
}

function main() {
  console.log('🧹 Starting cleanup of console.log and debugger statements...\n');
  
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: EXCLUDE_PATTERNS,
    nodir: true
  });
  
  console.log(`Found ${files.length} files to process\n`);
  
  let modifiedCount = 0;
  files.forEach((file, index) => {
    if (cleanFile(file)) {
      modifiedCount++;
      console.log(`  ✓ Cleaned: ${path.relative(process.cwd(), file)}`);
    }
    
    // Progress indicator
    if ((index + 1) % 50 === 0) {
      console.log(`  ... processed ${index + 1}/${files.length} files`);
    }
  });
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Modified ${modifiedCount} files`);
  console.log(`   Total files processed: ${files.length}`);
}

// Run the script
main();
