#!/usr/bin/env tsx
/**
 * Fix Router Navigation Type Issues
 * This script fixes all TypeScript errors related to router navigation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const FIXES: Array<{ file: string; search: string; replace: string }> = [
  // AppList.tsx
  {
    file: 'src/components/AppList.tsx',
    search: 'search: { appId: id }',
    replace: 'search: (prev) => ({ ...prev, appId: id })'
  },
  
  // AppGallery.tsx
  {
    file: 'src/components/AppGallery.tsx',
    search: 'navigate({ to: "/chat", search: {} })',
    replace: 'navigate({ to: "/chat" })'
  },
  
  // TitleBar.tsx
  {
    file: 'src/app/TitleBar.tsx',
    search: 'search: { appId: currentAppId }',
    replace: 'search: (prev) => ({ ...prev, appId: currentAppId })'
  },
  {
    file: 'src/app/TitleBar.tsx',
    search: 'params: { provider: modelProvider }',
    replace: 'params: { provider: modelProvider as any }'
  },
  
  // ChatHeader.tsx
  {
    file: 'src/components/chat/ChatHeader.tsx',
    search: 'search: { id: newThreadId }',
    replace: 'search: (prev) => ({ ...prev, id: newThreadId })'
  },
  
  // ChatInput.tsx
  {
    file: 'src/components/chat/ChatInput.tsx',
    search: 'search: { id: newThreadId }',
    replace: 'search: (prev) => ({ ...prev, id: newThreadId })'
  },
  
  // DyadAddIntegration.tsx
  {
    file: 'src/components/chat/DyadAddIntegration.tsx',
    search: 'search: { appId: app.id }',
    replace: 'search: (prev) => ({ ...prev, appId: app.id })'
  }
];

function fixFile(filePath: string, search: string, replace: string): boolean {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    if (content.includes(search)) {
      content = content.replace(new RegExp(escapeRegExp(search), 'g'), replace);
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  Pattern not found in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fix navigate() calls that are not callable
function fixNavigateCalls() {
  const files = glob.sync('src/**/*.{ts,tsx}');
  let fixedCount = 0;
  
  files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      
      
      // Fix patterns like: navigate() where navigate should be called with object
      content = content.replace(
        /navigate\(\s*\)/g,
        'navigate({ to: "/" })'
      );
      
      // Fix patterns with search params that aren't functions
      content = content.replace(
        /navigate\({([^}]*?)search:\s*{([^}]*?)}/g,
        (match, before, searchContent) => {
          if (!searchContent.trim()) {
            return `navigate({${before}}`;
          }
          return `navigate({${before}search: (prev) => ({ ...prev, ${searchContent}}`;
        }
      );
      
      // Write back if modified
      if (content !== fs.readFileSync(file, 'utf-8')) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`✅ Fixed navigate calls in: ${file}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });
  
  return fixedCount;
}

// Fix Error type issues in React components
function fixErrorRendering() {
  const files = glob.sync('src/**/*.{tsx}');
  let fixedCount = 0;
  
  files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      
      
      // Fix Error objects being rendered directly
      content = content.replace(
        /{error}/g,
        '{error?.message || String(error)}'
      );
      
      content = content.replace(
        /<div>{loading\.error}/g,
        '<div>{loading.error?.message || String(loading.error)}'
      );
      
      // Write back if modified
      if (content !== fs.readFileSync(file, 'utf-8')) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log(`✅ Fixed error rendering in: ${file}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  });
  
  return fixedCount;
}

// Main execution
console.log('🔧 Fixing TypeScript Router Issues...\n');

// Apply specific fixes
let totalFixed = 0;
FIXES.forEach(fix => {
  if (fixFile(fix.file, fix.search, fix.replace)) {
    totalFixed++;
  }
});

// Fix navigate calls
console.log('\n🔧 Fixing navigate() calls...');
const navigateFixed = fixNavigateCalls();
totalFixed += navigateFixed;

// Fix error rendering
console.log('\n🔧 Fixing error rendering...');
const errorFixed = fixErrorRendering();
totalFixed += errorFixed;

console.log(`\n✨ Fixed ${totalFixed} issues total`);
console.log('\n📝 Next steps:');
console.log('1. Run: npm run ts:main');
console.log('2. Check for remaining errors');
console.log('3. Run: npm test');
