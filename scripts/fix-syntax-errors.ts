#!/usr/bin/env tsx
/**
 * Fix Syntax Errors from Router Fixes
 * This script fixes syntax errors introduced by the router fix
 */

import * as fs from 'fs';
import * as path from 'path';

const FILES_TO_FIX = [
  'src/app/TitleBar.tsx',
  'src/components/chat/ChatHeader.tsx',
  'src/components/chat/ChatInput.tsx',
  'src/components/chat/DyadAddIntegration.tsx',
  'src/components/ChatList.tsx',
  'src/components/CreateAppDialog.tsx',
  'src/components/ImportAppDialog.tsx',
  'src/components/preview_panel/ConfigurePanel.tsx',
  'src/pages/app-details.tsx',
  'src/pages/chat.tsx',
  'src/pages/home.tsx'
];

function fixSyntaxErrors(filePath: string): boolean {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    let originalContent = content;
    
    // Fix broken search param replacements - missing closing braces
    content = content.replace(
      /search: \(prev\) => \(\{ \.\.\.prev, ([^}]+)$/gm,
      'search: (prev) => ({ ...prev, $1 })'
    );
    
    // Fix broken search param with double closing
    content = content.replace(
      /search: \(prev\) => \(\{ \.\.\.prev, ([^}]+)\}\}/g,
      'search: (prev) => ({ ...prev, $1 })'
    );
    
    // Fix broken navigate calls with incomplete replacements
    content = content.replace(
      /navigate\(\{([^}]*?)search: \(prev\) => \(\{ \.\.\.prev, ([^}]*?)([,\s])/g,
      'navigate({$1search: (prev) => ({ ...prev, $2 })$3'
    );
    
    // Fix cases where closing parentheses are missing
    content = content.replace(
      /navigate\(\{([^}]*)\}\)(?!\))/g,
      (match) => {
        const openCount = (match.match(/\(/g) || []).length;
        const closeCount = (match.match(/\)/g) || []).length;
        if (openCount > closeCount) {
          return match + ')'.repeat(openCount - closeCount);
        }
        return match;
      }
    );
    
    // Fix specific pattern in chat files
    content = content.replace(
      /search: \(prev\) => \(\{ \.\.\.prev, id: ([^}]+)\s*$/gm,
      'search: (prev) => ({ ...prev, id: $1 })'
    );
    
    // Fix specific pattern in app-details
    content = content.replace(
      /search: \(prev\) => \(\{ \.\.\.prev, appId: ([^}]+)\s*$/gm,
      'search: (prev) => ({ ...prev, appId: $1 })'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Fixed syntax in: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No syntax issues found in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Main execution
console.log('🔧 Fixing Syntax Errors...\n');

let totalFixed = 0;
FILES_TO_FIX.forEach(file => {
  if (fixSyntaxErrors(file)) {
    totalFixed++;
  }
});

console.log(`\n✨ Fixed ${totalFixed} files`);
console.log('\n📝 Next steps:');
console.log('1. Run: npm run ts:main');
console.log('2. Check for remaining errors');
console.log('3. Commit fixes');
