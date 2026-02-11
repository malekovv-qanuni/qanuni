/**
 * verify-all-queries.js
 *
 * Cross-references ALL SQL queries in electron/ipc/*.js against
 * the actual schema defined in electron/schema.js.
 *
 * Detects:
 *   - Column names used in queries that don't exist in the schema
 *   - Table alias resolution (e.g., t.minutes → timesheets.minutes)
 *   - Columns from migrations that may be missing from schema.js
 *   - Bare column references in single-table queries
 *
 * Usage: node verify-all-queries.js [--debug]
 */

const fs = require('fs');
const path = require('path');

const DEBUG = process.argv.includes('--debug');

const SQL_KEYWORDS = new Set([
  'on', 'where', 'and', 'or', 'left', 'right', 'inner', 'outer', 'cross',
  'natural', 'set', 'into', 'values', 'group', 'order', 'having', 'limit',
  'union', 'except', 'intersect', 'as', 'is', 'in', 'not', 'null', 'between',
  'like', 'exists', 'case', 'when', 'then', 'else', 'end', 'select', 'from',
  'join', 'using', 'asc', 'desc', 'by', 'distinct', 'all', 'any', 'some',
  'insert', 'update', 'delete', 'create', 'drop', 'alter', 'table', 'index',
  'if', 'with', 'replace', 'ignore', 'default', 'check', 'constraint',
  'primary', 'foreign', 'key', 'references', 'cascade', 'integer', 'text',
  'real', 'blob', 'null', 'autoincrement', 'unique', 'current_timestamp'
]);

const SQL_FUNCTIONS = new Set([
  'now', 'date', 'time', 'count', 'sum', 'avg', 'min', 'max', 'coalesce',
  'group_concat', 'replace', 'length', 'substr', 'trim', 'upper', 'lower',
  'ifnull', 'nullif', 'typeof', 'abs', 'round', 'julianday', 'strftime',
  'total', 'changes', 'last_insert_rowid', 'random', 'hex', 'unicode',
  'instr', 'ltrim', 'rtrim', 'zeroblob', 'printf', 'quote'
]);

// ==================== STEP 1: Parse schema.js ====================

function parseSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const tables = {};

  const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\)\s*(?:`|'|")/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = [];

    const lines = body.split(',');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^(FOREIGN\s+KEY|PRIMARY\s+KEY\s*\(|CHECK|UNIQUE\s*\()/i.test(trimmed)) continue;
      if (!trimmed) continue;

      const colMatch = trimmed.match(/^(\w+)\s+/);
      if (colMatch) {
        const colName = colMatch[1];
        if (/^(FOREIGN|PRIMARY|CHECK|UNIQUE|CONSTRAINT|INDEX|CREATE|ON|REFERENCES)$/i.test(colName)) continue;
        columns.push(colName);
      }
    }

    tables[tableName] = columns;
  }

  return tables;
}

// ==================== STEP 2: Parse migrations.js for extra columns ====================

function parseMigrations(migrationsPath) {
  const content = fs.readFileSync(migrationsPath, 'utf-8');
  const extras = {};

  const addColRegex = /addColumnIfMissing\s*\(\s*\w+\s*,\s*'(\w+)'\s*,\s*'(\w+)'/g;
  let match;
  while ((match = addColRegex.exec(content)) !== null) {
    const table = match[1];
    const column = match[2];
    if (!extras[table]) extras[table] = [];
    extras[table].push(column);
  }

  return extras;
}

// ==================== STEP 3: Extract SQL from backtick template literals ====================

function parseQueries(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const queries = [];
  const fileName = path.basename(filePath);

  let handlerName = '';
  const handlerRegex = /ipcMain\.handle\s*\(\s*'([^']+)'/;
  const caseRegex = /case\s+'([^']+)'/;

  let inBacktick = false;
  let backtickContent = '';
  let backtickStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const hMatch = line.match(handlerRegex);
    if (hMatch) handlerName = hMatch[1];
    const cMatch = line.match(caseRegex);
    if (cMatch) handlerName = cMatch[1];

    if (!inBacktick) {
      const backtickIdx = line.indexOf('`');
      if (backtickIdx !== -1) {
        const closingIdx = line.indexOf('`', backtickIdx + 1);
        if (closingIdx !== -1) {
          const sql = line.substring(backtickIdx + 1, closingIdx);
          if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) {
            queries.push({ sql, startLine: lineNum, endLine: lineNum, handler: handlerName, file: fileName });
          }
          // Handle second backtick pair on same line (after first closes)
          const secondOpenIdx = line.indexOf('`', closingIdx + 1);
          if (secondOpenIdx !== -1) {
            const secondCloseIdx = line.indexOf('`', secondOpenIdx + 1);
            if (secondCloseIdx !== -1) {
              const sql2 = line.substring(secondOpenIdx + 1, secondCloseIdx);
              if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql2)) {
                queries.push({ sql: sql2, startLine: lineNum, endLine: lineNum, handler: handlerName, file: fileName });
              }
            } else {
              inBacktick = true;
              backtickContent = line.substring(secondOpenIdx + 1);
              backtickStartLine = lineNum;
            }
          }
        } else {
          inBacktick = true;
          backtickContent = line.substring(backtickIdx + 1);
          backtickStartLine = lineNum;
        }
      }
    } else {
      const closingIdx = line.indexOf('`');
      if (closingIdx !== -1) {
        backtickContent += '\n' + line.substring(0, closingIdx);
        inBacktick = false;

        if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(backtickContent)) {
          queries.push({ sql: backtickContent, startLine: backtickStartLine, endLine: lineNum, handler: handlerName, file: fileName });
        }
        backtickContent = '';

        // Check if another backtick opens on the remainder of this line
        const remainderStart = closingIdx + 1;
        const nextOpenIdx = line.indexOf('`', remainderStart);
        if (nextOpenIdx !== -1) {
          const nextCloseIdx = line.indexOf('`', nextOpenIdx + 1);
          if (nextCloseIdx !== -1) {
            const sql2 = line.substring(nextOpenIdx + 1, nextCloseIdx);
            if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql2)) {
              queries.push({ sql: sql2, startLine: lineNum, endLine: lineNum, handler: handlerName, file: fileName });
            }
          } else {
            inBacktick = true;
            backtickContent = line.substring(nextOpenIdx + 1);
            backtickStartLine = lineNum;
          }
        }
      } else {
        backtickContent += '\n' + line;
      }
    }
  }

  return queries;
}

// ==================== STEP 4: Extract column references from SQL ====================

function extractColumnRefs(sql) {
  const refs = [];

  let cleanSql = sql
    .replace(/\$\{[^}]*\}/g, '?')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const aliasMap = buildAliasMap(cleanSql);

  // Pattern: alias.column_name (e.g., t.minutes, c.client_name)
  const aliasColRegex = /\b([a-z]\w{0,3})\.(\w+)\b/gi;
  let match;
  while ((match = aliasColRegex.exec(cleanSql)) !== null) {
    const alias = match[1].toLowerCase();
    const column = match[2];

    if (/^\d/.test(column)) continue;
    if (SQL_FUNCTIONS.has(column.toLowerCase())) continue;

    refs.push({ alias, column, fullRef: `${alias}.${column}` });
  }

  return { refs, aliasMap, cleanSql };
}

function buildAliasMap(sql) {
  const aliasMap = {};

  // Match: FROM/JOIN tablename alias
  const fromJoinRegex = /\b(?:FROM|JOIN)\s+(\w+)\s+(?:AS\s+)?(\w+)/gi;
  let match;
  while ((match = fromJoinRegex.exec(sql)) !== null) {
    const table = match[1].toLowerCase();
    const alias = match[2].toLowerCase();

    if (SQL_KEYWORDS.has(alias)) continue;
    if (SQL_KEYWORDS.has(table)) continue;

    aliasMap[alias] = table;
  }

  // Handle subquery aliases: ) alias ON/WHERE/GROUP/ORDER
  const subqueryPatterns = [
    /\)\s*(\w{1,4})\s+ON\b/gi,
    /\)\s*(\w{1,4})\s+(?:WHERE|GROUP|ORDER|HAVING|LEFT|RIGHT|INNER)\b/gi,
  ];
  for (const re of subqueryPatterns) {
    while ((match = re.exec(sql)) !== null) {
      const alias = match[1].toLowerCase();
      if (SQL_KEYWORDS.has(alias)) continue;
      if (!aliasMap[alias]) {
        aliasMap[alias] = '__subquery__';
      }
    }
  }

  if (DEBUG) {
    console.log('  Alias map:', JSON.stringify(aliasMap));
  }

  return aliasMap;
}

// ==================== STEP 5: Cross-reference ====================

function crossReference(queries, schema) {
  const issues = [];
  const warnings = [];
  const stats = { totalQueries: 0, totalColumnRefs: 0, totalIssues: 0, totalWarnings: 0 };
  const fileStats = {}; // { fileName: { queries, refs, bugs } }

  for (const query of queries) {
    stats.totalQueries++;
    if (!fileStats[query.file]) fileStats[query.file] = { queries: 0, refs: 0, bugs: 0 };
    fileStats[query.file].queries++;

    const { refs, aliasMap, cleanSql } = extractColumnRefs(query.sql);

    if (DEBUG) {
      console.log(`\n--- ${query.file}:${query.startLine} [${query.handler}] ---`);
      console.log('  SQL:', cleanSql.substring(0, 120) + (cleanSql.length > 120 ? '...' : ''));
      console.log('  Aliases:', JSON.stringify(aliasMap));
      console.log('  Refs:', refs.map(r => r.fullRef).join(', '));
    }

    for (const ref of refs) {
      stats.totalColumnRefs++;
      fileStats[query.file].refs++;

      const tableName = aliasMap[ref.alias];

      if (!tableName) {
        warnings.push({
          line: query.startLine,
          handler: query.handler,
          file: query.file,
          ref: ref.fullRef,
          message: `Unknown alias '${ref.alias}' — could not resolve to a table`
        });
        continue;
      }

      if (tableName === '__subquery__') continue;

      const tableColumns = schema[tableName];
      if (!tableColumns) {
        issues.push({
          line: query.startLine,
          handler: query.handler,
          file: query.file,
          ref: ref.fullRef,
          message: `Table '${tableName}' (alias '${ref.alias}') not found in schema`,
          severity: 'ERROR'
        });
        stats.totalIssues++;
        fileStats[query.file].bugs++;
        continue;
      }

      if (ref.column === '*') continue;

      if (!tableColumns.includes(ref.column)) {
        if (isComputedAlias(ref.column, cleanSql)) continue;

        const similar = findSimilar(ref.column, tableColumns);
        issues.push({
          line: query.startLine,
          handler: query.handler,
          file: query.file,
          ref: ref.fullRef,
          table: tableName,
          column: ref.column,
          message: `Column '${ref.column}' does not exist in table '${tableName}'`,
          suggestion: similar ? `Did you mean: ${similar}?` : null,
          availableColumns: tableColumns,
          severity: 'BUG'
        });
        stats.totalIssues++;
        fileStats[query.file].bugs++;
      }
    }
  }

  stats.totalWarnings = warnings.length;
  return { issues, warnings, stats, fileStats };
}

function isComputedAlias(column, sql) {
  const regex = new RegExp(`\\bas\\s+${escapeRegex(column)}\\b`, 'i');
  return regex.test(sql);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSimilar(column, available) {
  const candidates = [];
  for (const col of available) {
    if (col.includes(column) || column.includes(col)) {
      candidates.push(col);
      continue;
    }
    const colWords = column.split('_');
    const availWords = col.split('_');
    const shared = colWords.filter(w => availWords.includes(w));
    if (shared.length > 0 && shared.length >= Math.min(colWords.length, availWords.length) * 0.5) {
      candidates.push(col);
    }
  }
  return candidates.length > 0 ? candidates.join(', ') : null;
}

// ==================== STEP 6: Report ====================

function generateReport(issues, warnings, stats, fileStats, schema, ipcFiles) {
  const lines = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('  QANUNI — Full SQL Column Audit');
  lines.push('  Scope: electron/ipc/*.js (all 21 IPC modules)');
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');

  // Per-file breakdown
  lines.push('FILE BREAKDOWN');
  lines.push('───────────────────────────────────────────────────────────────');
  const sortedFiles = Object.entries(fileStats).sort((a, b) => b[1].bugs - a[1].bugs);
  for (const [file, fs] of sortedFiles) {
    const bugTag = fs.bugs > 0 ? ` *** ${fs.bugs} BUG(S) ***` : '';
    lines.push(`  ${file.padEnd(28)} ${String(fs.queries).padStart(3)} queries  ${String(fs.refs).padStart(4)} refs${bugTag}`);
  }
  // Files with 0 queries
  for (const f of ipcFiles) {
    const name = path.basename(f);
    if (!fileStats[name]) {
      lines.push(`  ${name.padEnd(28)}   0 queries     0 refs`);
    }
  }
  lines.push('');

  // Overall summary
  lines.push('TOTALS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`  Files scanned:       ${ipcFiles.length}`);
  lines.push(`  Queries scanned:     ${stats.totalQueries}`);
  lines.push(`  Column refs checked: ${stats.totalColumnRefs}`);
  lines.push(`  BUGS found:          ${stats.totalIssues}`);
  lines.push(`  Warnings:            ${stats.totalWarnings}`);
  lines.push('');

  // Bugs detail
  if (issues.length > 0) {
    lines.push('');
    lines.push('BUGS — Column Name Mismatches');
    lines.push('═══════════════════════════════════════════════════════════════════');

    // Group by file
    const byFile = {};
    for (const issue of issues) {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    }

    for (const [file, fileIssues] of Object.entries(byFile)) {
      lines.push('');
      lines.push(`  ┌─ ${file} (${fileIssues.length} bug${fileIssues.length > 1 ? 's' : ''})`);
      for (const issue of fileIssues) {
        lines.push(`  │`);
        lines.push(`  │  [${issue.severity}] Line ${issue.line}: ${issue.ref}`);
        lines.push(`  │  Handler: ${issue.handler}`);
        lines.push(`  │  ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`  │  FIX: ${issue.suggestion}`);
        }
        if (issue.availableColumns) {
          lines.push(`  │  Table '${issue.table}' has: ${issue.availableColumns.join(', ')}`);
        }
      }
      lines.push(`  └─`);
    }
  } else {
    lines.push('No column name bugs found across all modules.');
  }

  // Warnings
  if (warnings.length > 0) {
    lines.push('');
    lines.push('');
    lines.push('WARNINGS — Unresolved Aliases');
    lines.push('═══════════════════════════════════════════════════════════════════');

    const seen = new Set();
    for (const warn of warnings) {
      const key = `${warn.file}:${warn.handler}:${warn.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`  ${warn.file}:${warn.line} — ${warn.ref} — ${warn.message} [${warn.handler}]`);
    }
  }

  // Result
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════');
  if (issues.length > 0) {
    lines.push(`  RESULT: ${issues.length} BUG(S) FOUND across ${Object.keys(fileStats).filter(f => fileStats[f].bugs > 0).length} file(s)`);
  } else {
    lines.push('  RESULT: ALL CLEAR — no column mismatches detected');
  }
  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ==================== MAIN ====================

function main() {
  const schemaPath = path.join(__dirname, 'electron', 'schema.js');
  const migrationsPath = path.join(__dirname, 'electron', 'migrations.js');
  const ipcDir = path.join(__dirname, 'electron', 'ipc');

  for (const [name, p] of [['schema.js', schemaPath], ['migrations.js', migrationsPath]]) {
    if (!fs.existsSync(p)) {
      console.error(`ERROR: ${name} not found at ${p}`);
      process.exit(1);
    }
  }

  console.log('Parsing schema.js...');
  const schema = parseSchema(schemaPath);
  console.log(`  Found ${Object.keys(schema).length} tables`);

  console.log('Parsing migrations.js for extra columns...');
  const migrationExtras = parseMigrations(migrationsPath);
  let extraCount = 0;
  for (const [table, cols] of Object.entries(migrationExtras)) {
    if (schema[table]) {
      for (const col of cols) {
        if (!schema[table].includes(col)) {
          schema[table].push(col);
          extraCount++;
        }
      }
    }
  }
  console.log(`  Added ${extraCount} columns from migrations`);

  // Discover all IPC files
  const ipcFiles = fs.readdirSync(ipcDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(ipcDir, f))
    .sort();

  console.log(`\nScanning ${ipcFiles.length} IPC modules...`);

  let allQueries = [];
  for (const filePath of ipcFiles) {
    const fileName = path.basename(filePath);
    const queries = parseQueries(filePath);
    if (queries.length > 0) {
      console.log(`  ${fileName}: ${queries.length} queries`);
    }
    allQueries = allQueries.concat(queries);
  }
  console.log(`  Total: ${allQueries.length} queries`);

  console.log('\nCross-referencing columns against schema...');
  const { issues, warnings, stats, fileStats } = crossReference(allQueries, schema);

  const report = generateReport(issues, warnings, stats, fileStats, schema, ipcFiles);
  console.log(report);

  if (issues.length > 0) {
    process.exit(1);
  }
}

main();
