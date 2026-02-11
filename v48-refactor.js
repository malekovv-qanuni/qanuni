/**
 * v48-refactor.js - Qanuni v48 Language Removal Refactoring Script
 *
 * Removes bilingual UI architecture from React components:
 * - Replaces t[language].key with English string literals
 * - Replaces language === 'ar' ? ... : ... ternaries with English branch
 * - Removes isRTL definitions and conditionals
 * - Removes language/isRTL/t from component props
 * - Removes translations import when no longer needed
 *
 * Usage:
 *   node v48-refactor.js              # Process all component files
 *   node v48-refactor.js --test       # Process only 3 test files
 *   node v48-refactor.js --dry-run    # Show changes without writing
 *   node v48-refactor.js --test --dry-run  # Both
 */
const fs = require('fs');
const path = require('path');

// ============================================================
// Configuration
// ============================================================

const TRANSLATIONS = require('./v48-translations-map.json');

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

const args = process.argv.slice(2);
const testMode = args.includes('--test');
const dryRun = args.includes('--dry-run');

// ============================================================
// Transformation Functions
// ============================================================

/**
 * Step 1: Replace t[language].key with English string literal
 * Also handles: t[language].key || 'fallback'
 */
function replaceTLanguageKeys(content, stats) {
  let modified = content;

  // Pattern: t[language].key || 'fallback' or t[language].key || "fallback"
  // Replace with just the English string (drop the fallback)
  modified = modified.replace(
    /t\[language\]\.(\w+)\s*\|\|\s*(?:'[^']*'|"[^"]*"|`[^`]*`|\([^)]*\))/g,
    (match, key) => {
      const english = TRANSLATIONS[key];
      if (english !== undefined) {
        stats.tLanguageReplaced++;
        return `'${english.replace(/'/g, "\\'")}'`;
      }
      stats.warnings.push(`Key not found: ${key} (with fallback)`);
      return match;
    }
  );

  // Pattern: t[language].key (standalone)
  modified = modified.replace(
    /t\[language\]\.(\w+)/g,
    (match, key) => {
      const english = TRANSLATIONS[key];
      if (english !== undefined) {
        stats.tLanguageReplaced++;
        return `'${english.replace(/'/g, "\\'")}'`;
      }
      stats.warnings.push(`Key not found: ${key}`);
      return match;
    }
  );

  return modified;
}

/**
 * Step 2: Replace language === 'ar' ternaries with English branch
 * Handles both language === 'ar' and this.props.language === 'ar'
 */
function replaceLanguageTernaries(content, stats) {
  let modified = content;

  // --- Sub-pattern A: Lookup ternary with parenthesized fallback ---
  // language === 'ar' ? (item.name_ar || item.name_en) : item.name_en
  modified = modified.replace(
    /(?:this\.props\.)?language\s*===\s*['"]ar['"]\s*\?\s*\([^)]+\)\s*:\s*([^,;)\]}\n]+)/g,
    (match, englishBranch) => {
      stats.ternaryReplaced++;
      return englishBranch.trim();
    }
  );

  // --- Sub-pattern B: Simple string ternary ---
  // language === 'ar' ? 'Arabic text' : 'English text'
  // language === 'ar' ? "Arabic text" : "English text"
  modified = modified.replace(
    /(?:this\.props\.)?language\s*===\s*['"]ar['"]\s*\?\s*'[^']*'\s*:\s*('[^']*')/g,
    (match, englishBranch) => {
      stats.ternaryReplaced++;
      return englishBranch;
    }
  );
  modified = modified.replace(
    /(?:this\.props\.)?language\s*===\s*['"]ar['"]\s*\?\s*"[^"]*"\s*:\s*("[^"]*")/g,
    (match, englishBranch) => {
      stats.ternaryReplaced++;
      return englishBranch;
    }
  );

  // --- Sub-pattern C: Variable/expression ternary ---
  // language === 'ar' ? varAr : varEn
  // This catches remaining ternaries where both branches are identifiers/expressions
  modified = modified.replace(
    /(?:this\.props\.)?language\s*===\s*['"]ar['"]\s*\?\s*(?:[^:?]+)\s*:\s*([^,;)\]}\n]+)/g,
    (match, englishBranch) => {
      // Avoid replacing things that look like nested ternaries or complex expressions
      const trimmed = englishBranch.trim();
      // Don't replace if we'd leave an incomplete expression
      if (trimmed.includes('?') || trimmed === '') return match;
      stats.ternaryReplaced++;
      return trimmed;
    }
  );

  return modified;
}

/**
 * Step 3: Remove isRTL definitions
 */
function removeIsRTLDefinitions(content, stats) {
  let modified = content;

  // const isRTL = language === 'ar';
  const before = modified;
  modified = modified.replace(
    /^\s*const\s+isRTL\s*=\s*(?:this\.props\.)?language\s*===\s*['"]ar['"];?\s*\n/gm,
    ''
  );
  if (modified !== before) stats.isRTLDefsRemoved++;

  return modified;
}

/**
 * Step 4: Replace isRTL conditionals
 */
function replaceIsRTLConditionals(content, stats) {
  let modified = content;

  // Pattern: ${isRTL ? 'classA' : 'classB'} in template literals
  // Keep classB (LTR value)
  modified = modified.replace(
    /\$\{isRTL\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\}/g,
    (match, rtlClass, ltrClass) => {
      stats.isRTLCondReplaced++;
      return ltrClass;
    }
  );

  // Pattern: ${isRTL ? "classA" : "classB"}
  modified = modified.replace(
    /\$\{isRTL\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\}/g,
    (match, rtlClass, ltrClass) => {
      stats.isRTLCondReplaced++;
      return ltrClass;
    }
  );

  // Pattern: ${isRTL ? 'classA' : ''} in template literals
  // Replace with empty string
  modified = modified.replace(
    /\$\{isRTL\s*\?\s*'[^']*'\s*:\s*''\}/g,
    (match) => {
      stats.isRTLCondReplaced++;
      return '';
    }
  );

  // Pattern: ${isRTL ? "classA" : ""}
  modified = modified.replace(
    /\$\{isRTL\s*\?\s*"[^"]*"\s*:\s*""\}/g,
    (match) => {
      stats.isRTLCondReplaced++;
      return '';
    }
  );

  // Pattern: isRTL ? 'flex-row-reverse' : '' (standalone, e.g., in JSX expression)
  modified = modified.replace(
    /isRTL\s*\?\s*'[^']*'\s*:\s*''/g,
    (match) => {
      stats.isRTLCondReplaced++;
      return "''";
    }
  );
  modified = modified.replace(
    /isRTL\s*\?\s*"[^"]*"\s*:\s*""/g,
    (match) => {
      stats.isRTLCondReplaced++;
      return "''";
    }
  );

  // Pattern: isRTL ? 'classA' : 'classB' (standalone)
  modified = modified.replace(
    /isRTL\s*\?\s*'[^']*'\s*:\s*('[^']*')/g,
    (match, ltrValue) => {
      stats.isRTLCondReplaced++;
      return ltrValue;
    }
  );

  return modified;
}

/**
 * Step 5: Remove language/isRTL/t from component props
 */
function removeLanguageProps(content, stats) {
  let modified = content;

  // Remove 'language, ' or 'language,' from destructured params
  const beforeLang = modified;
  modified = modified.replace(/\blanguage\s*,\s*/g, (match) => {
    // Only replace if it looks like it's in a destructuring context
    // Check if we're inside ({ ... })
    return '';
  });

  // Remove ', language' (at end of param list)
  modified = modified.replace(/,\s*language\b(?!\s*[=:])/g, '');

  // Remove 'isRTL, ' or 'isRTL,'
  modified = modified.replace(/\bisRTL\s*,\s*/g, '');
  // Remove ', isRTL'
  modified = modified.replace(/,\s*isRTL\b(?!\s*[=:])/g, '');

  // Remove 't, ' (the translations prop) - be careful, 't' is common
  // Only remove 't' that's followed by comma or is a standalone param
  // Pattern: in destructuring like ({ t, ...}) or ({ ..., t })
  // We look for 't' as a standalone word in destructured params
  // This is tricky - only remove if preceded by { or , and followed by , or }
  modified = modified.replace(/(\{[^}]*?)\bt\s*,\s*/g, (match, before) => {
    stats.propsRemoved++;
    return before;
  });
  modified = modified.replace(/,\s*t\s*(\})/g, (match, after) => {
    stats.propsRemoved++;
    return after;
  });

  if (modified !== beforeLang) stats.propsRemoved++;

  return modified;
}

/**
 * Step 6: Remove translations import
 */
function removeTranslationsImport(content, stats) {
  // Only remove if no remaining t[ or t. references
  if (/\bt\[/.test(content) || /\bt\.(?:en|ar)/.test(content)) {
    return content;
  }

  const before = content;
  const modified = content.replace(
    /^import\s*\{\s*translations\s+as\s+t\s*\}\s*from\s*['"][^'"]*translations['"];?\s*\r?\n/gm,
    ''
  );

  if (modified !== before) stats.importsRemoved++;
  return modified;
}

/**
 * Step 7: Clean up artifacts
 */
function cleanupArtifacts(content, stats) {
  let modified = content;

  // Clean up template literals that are now just static strings with no expressions
  // e.g., className={`flex `} → className="flex "
  // But only simple cases

  // Clean up multiple spaces in className strings
  modified = modified.replace(/className="([^"]*?)"/g, (match, classes) => {
    const cleaned = classes.replace(/\s{2,}/g, ' ').trim();
    return `className="${cleaned}"`;
  });

  // Clean up template literals with only static content (no ${} left)
  modified = modified.replace(/className=\{`([^`$]*)`\}/g, (match, classes) => {
    const cleaned = classes.replace(/\s{2,}/g, ' ').trim();
    stats.cleanups++;
    return `className="${cleaned}"`;
  });

  // Clean up empty className=""
  // Leave these as-is for now (harmless)

  // Clean up orphaned 'language' references in useMemo dependency arrays
  // e.g., [clients, language, t] → [clients]
  modified = modified.replace(/,\s*language\b/g, (match, offset) => {
    // Check context - only remove from dependency arrays
    const before = modified.substring(Math.max(0, offset - 20), offset);
    if (before.includes('[') || before.includes(',')) {
      stats.cleanups++;
      return '';
    }
    return match;
  });
  modified = modified.replace(/\blanguage\s*,/g, (match, offset) => {
    const before = modified.substring(Math.max(0, offset - 20), offset);
    if (before.includes('[')) {
      stats.cleanups++;
      return '';
    }
    return match;
  });

  // Remove ', t' from dependency arrays (but not 't,' at start)
  modified = modified.replace(/,\s*t\b(?=\s*[\],])/g, (match, offset) => {
    const before = modified.substring(Math.max(0, offset - 20), offset);
    if (before.includes('[')) {
      stats.cleanups++;
      return '';
    }
    return match;
  });

  return modified;
}

// ============================================================
// Main Processing
// ============================================================

function refactorFile(filePath) {
  const stats = {
    tLanguageReplaced: 0,
    ternaryReplaced: 0,
    isRTLDefsRemoved: 0,
    isRTLCondReplaced: 0,
    propsRemoved: 0,
    importsRemoved: 0,
    cleanups: 0,
    warnings: []
  };

  const original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  // Apply transformations in order
  content = replaceTLanguageKeys(content, stats);
  content = replaceLanguageTernaries(content, stats);
  content = removeIsRTLDefinitions(content, stats);
  content = replaceIsRTLConditionals(content, stats);
  content = removeLanguageProps(content, stats);
  content = removeTranslationsImport(content, stats);
  content = cleanupArtifacts(content, stats);

  const totalChanges = stats.tLanguageReplaced + stats.ternaryReplaced +
    stats.isRTLDefsRemoved + stats.isRTLCondReplaced +
    stats.propsRemoved + stats.importsRemoved + stats.cleanups;

  if (totalChanges === 0) {
    return { success: false, file: filePath, reason: 'No changes needed', stats };
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return {
    success: true,
    file: filePath,
    stats,
    original: dryRun ? original : null,
    modified: dryRun ? content : null
  };
}

function getFilesToProcess() {
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

function main() {
  console.log('=== Qanuni v48 Refactoring Script ===');
  console.log(`Mode: ${testMode ? 'TEST (3 files)' : 'FULL'} ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`Translations map: ${Object.keys(TRANSLATIONS).length} keys loaded\n`);

  const files = getFilesToProcess();
  const results = { success: [], failed: [], skipped: [] };

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      results.failed.push({ file: filePath, reason: 'File not found' });
      continue;
    }

    try {
      const result = refactorFile(filePath);
      const relPath = path.relative(__dirname, filePath);

      if (result.success) {
        results.success.push(result);
        const s = result.stats;
        console.log(`  OK: ${relPath}`);
        console.log(`      t[language]: ${s.tLanguageReplaced}, ternaries: ${s.ternaryReplaced}, isRTL defs: ${s.isRTLDefsRemoved}, isRTL cond: ${s.isRTLCondReplaced}, props: ${s.propsRemoved}, imports: ${s.importsRemoved}, cleanup: ${s.cleanups}`);
        if (s.warnings.length > 0) {
          s.warnings.forEach(w => console.log(`      WARN: ${w}`));
        }
      } else {
        results.skipped.push(result);
        console.log(`  SKIP: ${relPath} (${result.reason})`);
      }
    } catch (error) {
      results.failed.push({ file: filePath, reason: error.message });
      console.log(`  FAIL: ${path.relative(__dirname, filePath)} (${error.message})`);
    }
  }

  // Summary
  console.log('\n=== REFACTORING RESULTS ===');
  console.log(`  Success: ${results.success.length}`);
  console.log(`  Failed:  ${results.failed.length}`);
  console.log(`  Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed files:');
    results.failed.forEach(f => console.log(`  - ${path.relative(__dirname, f.file)}: ${f.reason}`));
  }

  if (dryRun) {
    console.log('\n(DRY RUN - no files were modified)');
  }

  // Total stats
  let totalTLang = 0, totalTern = 0, totalRTL = 0;
  results.success.forEach(r => {
    totalTLang += r.stats.tLanguageReplaced;
    totalTern += r.stats.ternaryReplaced;
    totalRTL += r.stats.isRTLDefsRemoved + r.stats.isRTLCondReplaced;
  });
  console.log(`\nTotal: ${totalTLang} t[language] replaced, ${totalTern} ternaries replaced, ${totalRTL} isRTL removed`);
}

main();
