#!/usr/bin/env tsx
/**
 * Script to fix remaining navigation syntax errors in pages directory
 */

import fs from "fs/promises";
import path from "path";

const files = [
  "src/pages/app-details.tsx",
  "src/pages/chat.tsx",
  "src/pages/home.tsx",
];

async function fixFile(filePath: string) {
  console.log(`Fixing ${filePath}...`);
  let content = await fs.readFile(filePath, "utf-8");

  // Fix pattern: search: (prev) => ({ ...prev,  someKey: value },
  // Should be: search: (prev) => ({ ...prev,  someKey: value })
  const pattern = /search:\s*\(([^)]+)\)\s*=>\s*\(\s*\{([^}]+)\}\s*,/g;
  content = content.replace(pattern, "search: ($1) => ({ $2 })");

  await fs.writeFile(filePath, content, "utf-8");
  console.log(`✓ Fixed ${filePath}`);
}

async function main() {
  for (const file of files) {
    await fixFile(file);
  }
  console.log("✅ All files fixed!");
}

main().catch(console.error);
