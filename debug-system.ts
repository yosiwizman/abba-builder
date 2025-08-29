#!/usr/bin/env node

/**
 * Abba AI Builder System Debugger CLI
 * Run diagnostics and auto-fix common issues
 */

import SystemDebugger from './src/utils/system-debugger';
import { program } from 'commander';
import chalk from 'chalk';

// Parse command line arguments
program
  .name('debug-system')
  .description('Abba AI Builder System Debugger')
  .version('1.0.0')
  .option('-f, --fix', 'Auto-fix common issues')
  .option('-c, --check', 'Run health check only')
  .option('-v, --verbose', 'Verbose output')
  .parse();

const options = program.opts();

async function main() {
  console.log(chalk.cyan.bold('\n🚀 Abba AI Builder - Enterprise System Debugger\n'));
  
  const systemDebugger = new SystemDebugger();
  
  // Run auto-fix if requested
  if (options.fix) {
    console.log(chalk.yellow('Running auto-fix...\n'));
    const { fixed, failed } = await systemDebugger.autoFix();
    
    if (fixed.length > 0) {
      console.log(chalk.green('\n✅ Fixed issues:'));
      fixed.forEach(f => console.log(`  - ${f}`));
    }
    
    if (failed.length > 0) {
      console.log(chalk.red('\n❌ Failed to fix:'));
      failed.forEach(f => console.log(`  - ${f}`));
    }
    
    console.log('\n' + chalk.gray('-'.repeat(60)) + '\n');
  }
  
  // Run diagnostics
  const health = await systemDebugger.runDiagnostics();
  
  // Enterprise readiness assessment
  console.log(chalk.cyan.bold('\n📊 ENTERPRISE READINESS ASSESSMENT'));
  console.log('='.repeat(60));
  
  const readiness = calculateEnterpriseReadiness(health);
  
  // Display readiness score with color coding
  let scoreColor = chalk.red;
  if (readiness.score >= 90) scoreColor = chalk.green;
  else if (readiness.score >= 70) scoreColor = chalk.yellow;
  
  console.log(`\n${chalk.bold('Overall Readiness Score:')} ${scoreColor.bold(readiness.score + '%')}`);
  console.log(`${chalk.bold('Target Score:')} 95%`);
  
  // Display category scores
  console.log('\n📈 Category Breakdown:');
  Object.entries(readiness.categories).forEach(([category, score]) => {
    const bar = createProgressBar(score as number);
    console.log(`  ${category.padEnd(20)} ${bar} ${score}%`);
  });
  
  // Action items
  if (readiness.actionItems.length > 0) {
    console.log(chalk.yellow.bold('\n⚡ Action Items for Enterprise Readiness:'));
    readiness.actionItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item}`);
    });
  }
  
  // Success message if ready
  if (readiness.score >= 95) {
    console.log(chalk.green.bold('\n🎉 System is ENTERPRISE READY!'));
    console.log(chalk.green('Your Abba AI Builder is configured for 95%+ success rate.'));
  } else {
    const gap = 95 - readiness.score;
    console.log(chalk.yellow(`\n📍 ${gap}% improvement needed to reach enterprise readiness.`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(health.status === 'healthy' ? 0 : 1);
}

/**
 * Calculate enterprise readiness score
 */
function calculateEnterpriseReadiness(health: any) {
  const categories = {
    'Infrastructure': 0,
    'Code Quality': 0,
    'AI Integration': 0,
    'Testing': 0,
    'Performance': 0
  };
  
  // Calculate category scores based on health checks
  health.checks.forEach((check: any) => {
    let category = 'Infrastructure';
    
    if (check.name.includes('TypeScript') || check.name.includes('Dependencies')) {
      category = 'Code Quality';
    } else if (check.name.includes('API') || check.name.includes('Services')) {
      category = 'AI Integration';
    } else if (check.name.includes('Database') || check.name.includes('Build')) {
      category = 'Testing';
    } else if (check.name.includes('Memory')) {
      category = 'Performance';
    }
    
    const score = check.status === 'pass' ? 100 : check.status === 'warning' ? 60 : 0;
    categories[category as keyof typeof categories] = Math.max(
      categories[category as keyof typeof categories],
      score
    );
  });
  
  // Calculate overall score
  const scores = Object.values(categories);
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // Generate action items
  const actionItems: string[] = [];
  
  if (categories['AI Integration'] < 100) {
    actionItems.push('Configure Claude Opus API key for full AI capabilities');
  }
  if (categories['Code Quality'] < 100) {
    actionItems.push('Fix TypeScript compilation errors');
  }
  if (categories['Testing'] < 100) {
    actionItems.push('Run integration tests to verify functionality');
  }
  if (categories['Performance'] < 100) {
    actionItems.push('Optimize memory usage and build performance');
  }
  
  return {
    score: overallScore,
    categories,
    actionItems
  };
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage: number): string {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let color = chalk.red;
  if (percentage >= 90) color = chalk.green;
  else if (percentage >= 60) color = chalk.yellow;
  
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

// Run the debugger
main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});
