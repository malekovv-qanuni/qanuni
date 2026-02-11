/**
 * v48-verify.js - Qanuni v48 Verification Script
 *
 * Checks all component files for remaining language references
 * that should have been removed by v48-refactor.js.
 *
 * Usage:
 *   node v48-verify.js           # Check all component files
 *   node v48-verify.js --test    # Check only 3 test files
 */
const fs = require('fs');
const path = require('path');

const COMPONENT_DIRS = [
  'src/components/forms',
  'src/components/lists',
  'src/components/modules',
  'src/components/corporate',
  'src/components/common',
  'src/components/reports/corporate'
];

const TEST_FILES = [
  'src/components/modules/TimerWidget.js',
  'src/components/forms/ClientForm.js',
  'src/components/lists/ClientsList.js'
];

const testMode = process.argv.includes('--test');

const CHECKS = [
  {
    name: 't[language] references',
    pattern: /t\[language\]/g,
    severity: 'ERROR'
  },
  {
    name: 'language === \'ar\' ternaries',
    pattern: /language\s*===\s*['"]ar['"]/g,
    severity: 'ERROR'
  },
  {
    name: 'isRTL references',
    pattern: /\bisRTL\b/g,
    severity: 'ERROR',
    // Ignore comments
    ignoreInComments: true
  },
  {
    name: 'language prop/variable',
    pattern: /\blanguage\b/g,
    severity: 'WARN',
    // Only flag if not in a comment or string about 'language'
    contextCheck: (line) => {
      const trimmed = line.trim();
      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
      // Skip strings that mention 'language' as a concept
      if (trimmed.includes("'language'") || trimmed.includes('"language"')) return false;
      return true;
    }
  },
  {
    name: 'translations import',
    pattern: /import\s*\{.*translations.*\}\s*from/g,
    severity: 'WARN'
  }
];

function getFilesToCheck() {
  if (testMode) {
    return TEST_FILES.map(f => path.join(__dirname, f));
  }

  const files = [];
  for (const dir of COMPONENT_DIRS) {
    const fullDir = path.join(__dirname, dir);
    if (!fs.existsSync(fullDir)) continue;

    const dirFiles = fs.readdirSync(fullDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(fullDir, f));
    files.push(...dirFiles);
  }
  return files;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  for (const check of CHECKS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comment lines for certain checks
      if (check.ignoreInComments) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      }

      // Apply context check if present
      if (check.contextCheck && !check.contextCheck(line)) continue;

      const matches = line.match(check.pattern);
      if (matches) {
        issues.push({
          check: check.name,
          severity: check.severity,
          line: lineNum,
          content: line.trim().substring(0, 120),
          count: matches.length
        });
      }
    }
  }

  return issues;
}

function main() {
  console.log('=== Qanuni v48 Verification ===');
  console.log(`Mode: ${testMode ? 'TEST (3 files)' : 'FULL'}\n`);

  const files = getFilesToCheck();
  let totalErrors = 0;
  let totalWarnings = 0;
  let cleanFiles = 0;

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;

    const relPath = path.relative(__dirname, filePath);
    const issues = checkFile(filePath);

    if (issues.length === 0) {
      cleanFiles++;
      continue;
    }

    const errors = issues.filter(i => i.severity === 'ERROR');
    const warnings = issues.filter(i => i.severity === 'WARN');

    console.log(`${errors.length > 0 ? 'X' : '!'} ${relPath}:`);
    for (const issue of issues) {
      const icon = issue.severity === 'ERROR' ? 'X' : '!';
      console.log(`  ${icon} Line ${issue.line}: ${issue.check} (${issue.count}x)`);
      console.log(`    ${issue.content}`);
    }
    console.log('');

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }

  console.log('=== VERIFICATION SUMMARY ===');
  console.log(`  Clean files: ${cleanFiles}`);
  console.log(`  Files with errors: ${totalErrors > 0 ? totalErrors : 0}`);
  console.log(`  Files with warnings: ${totalWarnings > 0 ? totalWarnings : 0}`);
  console.log(`  Total files checked: ${files.length}`);

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\nAll files are clean! v48 refactoring is complete.');
  } else if (totalErrors === 0) {
    console.log('\nNo errors! Warnings may need manual review.');
  } else {
    console.log('\nErrors found! These files still have language references to fix.');
  }
}

main();
