/**
 * v48-extract-translations.js
 * Extracts English translation keys from src/constants/translations.js
 * Outputs: v48-translations-map.json
 */
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'src/constants/translations.js'), 'utf8');

// Extract the 'en' section
const enStart = content.indexOf('en: {');
const arStart = content.indexOf('ar: {');

if (enStart === -1 || arStart === -1) {
  console.error('Could not find en: or ar: sections');
  process.exit(1);
}

// Get text between 'en: {' and the line before 'ar: {'
const enSection = content.substring(enStart + 4, arStart);

// Find the last closing brace of the en section
const lastBrace = enSection.lastIndexOf('}');
const enContent = enSection.substring(1, lastBrace); // skip the opening {

const translations = {};

// Match key: 'value' patterns (single-quoted)
// Also handle key: "value" (double-quoted)
// Also handle escaped quotes inside strings
const lines = enContent.split('\n');
for (const line of lines) {
  const trimmed = line.trim();

  // Skip comments and empty lines
  if (trimmed.startsWith('//') || trimmed === '' || trimmed === ',') continue;

  // Match multiple key-value pairs per line (comma-separated)
  // Pattern: key: 'value' or key: "value"
  const pairRegex = /(\w+):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  let match;
  while ((match = pairRegex.exec(trimmed)) !== null) {
    const key = match[1];
    let value = match[2] !== undefined ? match[2] : match[3];
    if (value !== undefined) {
      // Unescape
      value = value.replace(/\\'/g, "'").replace(/\\"/g, '"');
      translations[key] = value;
    }
  }
}

const keyCount = Object.keys(translations).length;
console.log(`Total keys extracted: ${keyCount}`);

// Write the map
fs.writeFileSync(
  path.join(__dirname, 'v48-translations-map.json'),
  JSON.stringify(translations, null, 2),
  'utf8'
);
console.log('Written to v48-translations-map.json');

// Show some samples
const keys = Object.keys(translations);
console.log('\nFirst 10 keys:');
keys.slice(0, 10).forEach(k => console.log(`  ${k}: ${JSON.stringify(translations[k])}`));
console.log('\nLast 10 keys:');
keys.slice(-10).forEach(k => console.log(`  ${k}: ${JSON.stringify(translations[k])}`));

// Check for some expected keys
const expected = ['save', 'cancel', 'clientName', 'matterName', 'edit', 'delete', 'required'];
console.log('\nExpected keys check:');
expected.forEach(k => {
  if (translations[k]) {
    console.log(`  OK: ${k} = "${translations[k]}"`);
  } else {
    console.log(`  MISSING: ${k}`);
  }
});
