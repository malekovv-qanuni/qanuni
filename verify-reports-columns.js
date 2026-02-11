/**
 * verify-reports-columns.js
 *
 * Cross-references SQL queries in electron/ipc/reports.js against
 * the actual schema defined in electron/schema.js.
 *
 * Detects:
 *   - Column names used in queries that don't exist in the schema
 *   - Table alias resolution (e.g., t.minutes → timesheets.minutes)
 *   - Columns from migrations that may be missing from schema.js
 *
 * Usage: node verify-reports-columns.js [--debug]
 */

const fs = require('fs');
const path = require('path');

const DEBUG = process.argv.includes('--debug');

// ==================== STEP 1: Parse schema.js ====================

function parseSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const tables = {};

  // Match CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\)\s*(?:`|'|")/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = [];

    // Parse each line for column definitions
    const lines = body.split(',');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip constraints
      if (/^(FOREIGN\s+KEY|PRIMARY\s+KEY\s*\(|CHECK|UNIQUE\s*\()/i.test(trimmed)) continue;
      if (!trimmed) continue;

      // Extract column name (first word)
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

function parseQueries(reportsPath) {
  const content = fs.readFileSync(reportsPath, 'utf-8');
  const lines = content.split('\n');
  const queries = [];

  let handlerName = '';
  const handlerRegex = /ipcMain\.handle\s*\(\s*'([^']+)'/;
  const caseRegex = /case\s+'([^']+)'/;

  // Strategy: find all backtick-delimited strings containing SQL keywords
  // Track backtick state line by line
  let inBacktick = false;
  let backtickContent = '';
  let backtickStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Track handler/case context
    const hMatch = line.match(handlerRegex);
    if (hMatch) handlerName = hMatch[1];
    const cMatch = line.match(caseRegex);
    if (cMatch) handlerName = cMatch[1];

    if (!inBacktick) {
      // Look for opening backtick
      const backtickIdx = line.indexOf('`');
      if (backtickIdx !== -1) {
        // Check if there's a closing backtick on the same line
        const closingIdx = line.indexOf('`', backtickIdx + 1);
        if (closingIdx !== -1) {
          // Single-line backtick string
          const sql = line.substring(backtickIdx + 1, closingIdx);
          if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) {
            queries.push({ sql, startLine: lineNum, endLine: lineNum, handler: handlerName });
          }
          // Check for another backtick pair on the same line after this one
          // (rare but possible — skip for simplicity)
        } else {
          // Multi-line backtick string starts
          inBacktick = true;
          backtickContent = line.substring(backtickIdx + 1);
          backtickStartLine = lineNum;
        }
      }
    } else {
      // Inside a backtick string — look for closing backtick
      const closingIdx = line.indexOf('`');
      if (closingIdx !== -1) {
        backtickContent += '\n' + line.substring(0, closingIdx);
        inBacktick = false;

        if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(backtickContent)) {
          queries.push({ sql: backtickContent, startLine: backtickStartLine, endLine: lineNum, handler: handlerName });
        }
        backtickContent = '';
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

  // Normalize SQL for parsing
  let cleanSql = sql
    .replace(/\$\{[^}]*\}/g, '?')  // Remove template expressions
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Build alias map from FROM/JOIN clauses
  const aliasMap = buildAliasMap(cleanSql);

  // Extract alias.column_name patterns
  const aliasColRegex = /\b([a-z]\w{0,3})\.(\w+)\b/gi;
  let match;
  while ((match = aliasColRegex.exec(cleanSql)) !== null) {
    const alias = match[1].toLowerCase();
    const column = match[2];

    // Skip SQL functions, numbers
    if (/^\d/.test(column)) continue;
    if (/^(now|date|time|count|sum|avg|min|max|coalesce|group_concat|replace|length|substr|trim|upper|lower|ifnull|nullif|typeof|abs|round|julianday|strftime)$/i.test(column)) continue;

    refs.push({ alias, column, fullRef: `${alias}.${column}` });
  }

  return { refs, aliasMap, cleanSql };
}

function buildAliasMap(sql) {
  const aliasMap = {};

  // Strategy: Find FROM/JOIN followed by table name and alias
  // Must handle: FROM invoices i, LEFT JOIN clients c, JOIN matters m ON ...
  // The alias is the word after the table name, before ON/WHERE/LEFT/JOIN/GROUP/ORDER etc.

  const SQL_KEYWORDS = new Set([
    'on', 'where', 'and', 'or', 'left', 'right', 'inner', 'outer', 'cross',
    'natural', 'set', 'into', 'values', 'group', 'order', 'having', 'limit',
    'union', 'except', 'intersect', 'as', 'is', 'in', 'not', 'null', 'between',
    'like', 'exists', 'case', 'when', 'then', 'else', 'end', 'select', 'from',
    'join', 'using', 'asc', 'desc', 'by', 'distinct', 'all', 'any', 'some',
    'insert', 'update', 'delete', 'create', 'drop', 'alter', 'table', 'index',
    'if', 'with'
  ]);

  // Match: FROM/JOIN tablename alias
  // Allow optional AS keyword
  const fromJoinRegex = /\b(?:FROM|JOIN)\s+(\w+)\s+(?:AS\s+)?(\w+)/gi;
  let match;
  while ((match = fromJoinRegex.exec(sql)) !== null) {
    const table = match[1].toLowerCase();
    const alias = match[2].toLowerCase();

    // Skip if alias is a SQL keyword
    if (SQL_KEYWORDS.has(alias)) continue;
    // Skip if table name looks like a keyword (shouldn't happen, but safety)
    if (SQL_KEYWORDS.has(table)) continue;

    aliasMap[alias] = table;
  }

  // Handle subquery aliases: ) alias ON ... or ) inv ON ...
  // These appear in revenue-by-client, revenue-by-matter queries
  const subqueryAliasRegex = /\)\s*(\w{1,4})\s+ON\b/gi;
  while ((match = subqueryAliasRegex.exec(sql)) !== null) {
    const alias = match[1].toLowerCase();
    if (SQL_KEYWORDS.has(alias)) continue;
    if (!aliasMap[alias]) {
      aliasMap[alias] = '__subquery__';
    }
  }

  // Also handle: ) adv GROUP BY or ) inv WHERE (less common but possible)
  const subqueryAlias2 = /\)\s*(\w{1,4})\s+(?:WHERE|GROUP|ORDER|HAVING|LEFT|RIGHT|INNER)\b/gi;
  while ((match = subqueryAlias2.exec(sql)) !== null) {
    const alias = match[1].toLowerCase();
    if (SQL_KEYWORDS.has(alias)) continue;
    if (!aliasMap[alias]) {
      aliasMap[alias] = '__subquery__';
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

  for (const query of queries) {
    stats.totalQueries++;
    const { refs, aliasMap, cleanSql } = extractColumnRefs(query.sql);

    if (DEBUG) {
      console.log(`\n--- Query at line ${query.startLine} [${query.handler}] ---`);
      console.log('  SQL:', cleanSql.substring(0, 120) + '...');
      console.log('  Aliases:', JSON.stringify(aliasMap));
      console.log('  Refs:', refs.map(r => r.fullRef).join(', '));
    }

    for (const ref of refs) {
      stats.totalColumnRefs++;

      const tableName = aliasMap[ref.alias];

      if (!tableName) {
        warnings.push({
          line: query.startLine,
          handler: query.handler,
          ref: ref.fullRef,
          message: `Unknown alias '${ref.alias}' — could not resolve to a table`
        });
        continue;
      }

      if (tableName === '__subquery__') {
        // Subquery alias — columns are computed, skip
        continue;
      }

      const tableColumns = schema[tableName];
      if (!tableColumns) {
        issues.push({
          line: query.startLine,
          handler: query.handler,
          ref: ref.fullRef,
          message: `Table '${tableName}' (alias '${ref.alias}') not found in schema`,
          severity: 'ERROR'
        });
        stats.totalIssues++;
        continue;
      }

      // Check if column exists (including wildcard *)
      if (ref.column === '*') continue;

      if (!tableColumns.includes(ref.column)) {
        // Check if it's a computed alias (e.g., "SUM(...) as total_minutes")
        if (isComputedAlias(ref.column, cleanSql)) continue;

        // Real column mismatch
        const similar = findSimilar(ref.column, tableColumns);
        issues.push({
          line: query.startLine,
          handler: query.handler,
          ref: ref.fullRef,
          table: tableName,
          column: ref.column,
          message: `Column '${ref.column}' does not exist in table '${tableName}'`,
          suggestion: similar ? `Did you mean: ${similar}?` : null,
          availableColumns: tableColumns,
          severity: 'BUG'
        });
        stats.totalIssues++;
      }
    }
  }

  stats.totalWarnings = warnings.length;
  return { issues, warnings, stats };
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

function generateReport(issues, warnings, stats, schema) {
  const lines = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  QANUNI — SQL Column Verification Report');
  lines.push('  File: electron/ipc/reports.js');
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  lines.push('SUMMARY');
  lines.push('───────────────────────────────────────');
  lines.push(`  Queries scanned:     ${stats.totalQueries}`);
  lines.push(`  Column refs checked: ${stats.totalColumnRefs}`);
  lines.push(`  BUGS found:          ${stats.totalIssues}`);
  lines.push(`  Warnings:            ${stats.totalWarnings}`);
  lines.push('');

  if (issues.length > 0) {
    lines.push('');
    lines.push('BUGS — Column Name Mismatches');
    lines.push('═══════════════════════════════════════════════════════════════');

    for (const issue of issues) {
      lines.push('');
      lines.push(`  [${issue.severity}] Line ${issue.line}: ${issue.ref}`);
      lines.push(`  Handler: ${issue.handler}`);
      lines.push(`  ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`  → ${issue.suggestion}`);
      }
      if (issue.availableColumns) {
        lines.push(`  Available columns in '${issue.table}': ${issue.availableColumns.join(', ')}`);
      }
    }
  } else {
    lines.push('No column name bugs found.');
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('');
    lines.push('WARNINGS — Unresolved Aliases');
    lines.push('═══════════════════════════════════════════════════════════════');

    const seen = new Set();
    for (const warn of warnings) {
      const key = `${warn.handler}:${warn.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`  Line ${warn.line}: ${warn.ref} — ${warn.message} [handler: ${warn.handler}]`);
    }
  }

  lines.push('');
  lines.push('');
  lines.push('SCHEMA REFERENCE');
  lines.push('═══════════════════════════════════════════════════════════════');
  const tableNames = Object.keys(schema).sort();
  for (const table of tableNames) {
    lines.push(`  ${table} (${schema[table].length} cols): ${schema[table].join(', ')}`);
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  if (issues.length > 0) {
    lines.push(`  RESULT: ${issues.length} BUG(S) FOUND — fix before testing!`);
  } else {
    lines.push('  RESULT: ALL CLEAR — no column mismatches detected');
  }
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ==================== MAIN ====================

function main() {
  const schemaPath = path.join(__dirname, 'electron', 'schema.js');
  const migrationsPath = path.join(__dirname, 'electron', 'migrations.js');
  const reportsPath = path.join(__dirname, 'electron', 'ipc', 'reports.js');

  for (const [name, p] of [['schema.js', schemaPath], ['migrations.js', migrationsPath], ['reports.js', reportsPath]]) {
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

  console.log('Parsing reports.js for SQL queries...');
  const queries = parseQueries(reportsPath);
  console.log(`  Found ${queries.length} queries`);

  console.log('Cross-referencing columns against schema...');
  const { issues, warnings, stats } = crossReference(queries, schema);

  const report = generateReport(issues, warnings, stats, schema);
  console.log(report);

  if (issues.length > 0) {
    process.exit(1);
  }
}

main();
