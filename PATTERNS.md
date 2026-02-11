# Qanuni Code Patterns & Session Guide

## Ã°Å¸Å¡Â¨ CLAUDE: READ THIS FIRST

**At the start of each session, request these files if not provided:**
1. `CHECKPOINT_[latest].md` - Current state and what was built
2. `PATTERNS.md` (this file) - Code conventions
3. `CLAUDE.md` - Project overview and build commands
4. `preload.js` - If adding new IPC calls
5. `main.js` - If adding database queries or IPC handlers

**Before writing ANY new component:**
1. Check IPC pattern in preload.js
2. Check table schema in main.js (search: `CREATE TABLE.*tablename`)
3. Check similar existing component for prop names
4. Ask user to run verification commands if unsure

---

## Project Structure

```
C:\Projects\qanuni\
â”œâ”€â”€ main.js                 # Electron main process, IPC handlers, DB schema
â”œâ”€â”€ preload.js              # IPC bridge (electronAPI)
â”œâ”€â”€ package.json
â””â”€â”€ src\
    â”œâ”€â”€ App.js              # Main React app, state, routing
    â”œâ”€â”€ constants\          # translations.js
    â”œâ”€â”€ utils\              # validators, formatDate, generateID
    â””â”€â”€ components\
        â”œâ”€â”€ common\         # Shared components (FormField, TimeDropdown, etc.)
        â”œâ”€â”€ forms\          # ALL form components (13 forms, consolidated v46.56)
        â”œâ”€â”€ lists\          # List components (11 lists)
        â”œâ”€â”€ modules\        # Full modules (Dashboard, Calendar, Reports, etc.)
        â”œâ”€â”€ corporate\      # Corporate Secretary (EntitiesList, EntityForm)
        â””â”€â”€ reports\corporate\  # Corporate report modals
```

---

## IPC Pattern (CRITICAL)

### Frontend Call
```javascript
// Ã¢Å“â€¦ CORRECT - use electronAPI with named functions
const data = await window.electronAPI.getFunctionName(param);

// Ã¢ÂÅ’ WRONG - this pattern is NOT used
const data = await window.electron.invoke('channel-name', param);
```

### Adding New IPC

**Step 1: preload.js** - Add function
```javascript
  // Comment describing feature (vXX.XX)
  getFunctionName: (param) => ipcRenderer.invoke('channel-name', param),
```

**Step 2: main.js** - Add handler
```javascript
ipcMain.handle('channel-name', (event, param) => {
  return runQuery('SELECT * FROM table WHERE id = ?', [param]);
});
```

---

## Database Patterns

### Table Naming
- Main entities: `clients`, `matters`, `hearings`, `lawyers`, etc.
- Lookups: `lookup_court_types`, `lookup_regions`, `lookup_expense_categories`
- Junction/feature tables: `matter_diary`, `share_transfers`

### Column Naming (CRITICAL - Inconsistent! ALWAYS verify against CREATE TABLE!)

| Table Type | English Name | Arabic Name |
|------------|--------------|-------------|
| `lawyers` | `name` | `name_arabic` |
| `lookup_*` tables | `name_en` | `name_ar` |
| `clients` | `client_name` | `client_name_arabic` |
| `matters` | `matter_name` | `matter_name_arabic` |

> Ã¢Å¡Â Ã¯Â¸Â **NEVER trust this table alone.** Always run `Select-String -Path main.js -Pattern "CREATE TABLE.*tablename" -Context 0,15` to verify actual column names before writing queries.

### Lawyers Table (Special Case)
```sql
-- Actual columns
name TEXT NOT NULL,
name_arabic TEXT,

-- When queried, often aliased as:
SELECT name as full_name, name_arabic as full_name_arabic FROM lawyers

-- In components, use:
l.full_name        -- English
l.full_name_arabic -- Arabic (may be null, fallback to full_name)
```

### Standard Columns (All Tables)
```sql
created_at TEXT,   -- ISO timestamp
updated_at TEXT,   -- ISO timestamp  
deleted_at TEXT    -- Soft delete (NULL = active)
```

### ID Generation
```javascript
const id = generateId('PREFIX');  // e.g., 'CLT', 'MTR', 'HRG', 'DRY'
```

---

## Component Patterns

### Standard Props
```javascript
{
  language,        // 'en' | 'ar'
  lawyers,         // Array of { lawyer_id, full_name, full_name_arabic, ... }
  clients,         // Array of { client_id, client_name, ... }
  matters,         // Array of { matter_id, matter_name, ... }
  showToast,       // (message: string, type: 'success'|'error'|'info') => void
  onClose,         // () => void - for modals
  onSave,          // (data) => void - for forms
}
```

### RTL Support
```javascript
const isRTL = language === 'ar';

// Apply to containers
<div className={isRTL ? 'rtl text-right' : ''}>

// Flex direction
<div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
```

### Bilingual Display
```javascript
// For lawyers
{language === 'ar' ? (l.full_name_arabic || l.full_name) : l.full_name}

// For lookups
{language === 'ar' ? item.name_ar : item.name_en}

// For matters/clients
{language === 'ar' ? (m.matter_name_arabic || m.matter_name) : m.matter_name}
```

---

## React Hooks Rules

**All hooks MUST be called before any early return:**

```javascript
// Ã¢Å“â€¦ CORRECT
const MyComponent = ({ isOpen }) => {
  const [state, setState] = useState([]);
  const computed = useMemo(() => ..., [deps]);
  
  useEffect(() => { ... }, [deps]);
  
  if (!isOpen) return null;  // Early return AFTER hooks
  
  return <div>...</div>;
};

// Ã¢ÂÅ’ WRONG - hooks after conditional
const MyComponent = ({ isOpen }) => {
  if (!isOpen) return null;  // Early return BEFORE hooks
  
  const [state, setState] = useState([]);  // WILL CRASH
};
```

---

## Common Query Patterns

### Get with Joins (Timeline example)
```javascript
const data = runQuery(`
  SELECT t.*, 
    l.name as lawyer_name, 
    l.name_arabic as lawyer_name_ar
  FROM timesheets t
  LEFT JOIN lawyers l ON t.lawyer_id = l.lawyer_id
  WHERE t.matter_id = ? AND t.deleted_at IS NULL
`, [matterId]);
```

### Insert with ID Generation
```javascript
const id = generateId('DRY');
const now = new Date().toISOString();
return runInsert(`INSERT INTO table_name
  (id_column, field1, field2, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)`,
  [id, value1, value2, now, now]);
```

### Soft Delete
```javascript
const now = new Date().toISOString();
return runInsert('UPDATE table_name SET deleted_at = ? WHERE id = ?', [now, id]);
```

---

## File Locations for Common Tasks

| Task | File(s) to Modify |
|------|-------------------|
| New IPC channel | `preload.js` + `main.js` |
| New database table | `main.js` (schema section ~line 600-900) |
| New modal/dialog | `src/components/common/` + `App.js` (import + state) |
| New form | `src/components/forms/` |
| New list view | `src/components/lists/` |
| New full module | `src/components/modules/` |

---

## Build & Test Commands

```powershell
# Development (uses production DB)
npm run dev

# Development with test DB
npm run dev:test

# Build for distribution (clean)
npm run dist:clean

# Build for release
npm run dist

# After dist, restore main files
git checkout main.js preload.js
```

---

## Known Inconsistencies (Be Careful!)

1. **Lawyer names**: `name`/`name_arabic` in DB, but `full_name`/`full_name_arabic` when queried
2. **Lookup names**: `name_en`/`name_ar` (different from lawyers!)
3. **Matter names**: `matter_name`/`matter_name_arabic` (with 'ic' suffix)
4. **Client names**: `client_name`/`client_name_arabic` (full word 'arabic', NOT 'ar')
5. **service_type**: REMOVED in v46.52 Ã¢â‚¬â€ do NOT use. Column exists in DB but is inert. Companies section filters only on `client_type = 'legal_entity'`
6. **Matter dropdowns**: v46.53+ show `matter_name Ã¢â‚¬â€ case_number Ã¢â‚¬â€ court_name`. All form/filter dropdowns use this enriched label pattern.
7. **Matter list cells**: v46.54+ show subtitle `case_number Ã¢â‚¬Â¢ court_name Ã¢â‚¬Â¢ region_name` below matter name in all list table rows.
8. **Region filter in TasksList**: v46.54 Ã¢â‚¬â€ tasks filtered by matter's `court_region_id` via `regions` prop from App.js. `taskFilters` includes `regionId`.
9. **Matter enrichment audit**: All 9 forms with matter dropdowns are enriched. All 6 lists with matter columns show subtitle. No plain `m.matter_name` in any dropdown or table cell.
10. **Form locations**: v46.56 consolidated ALL forms into `src/components/forms/`. The old `src/forms/` directory no longer exists. All form imports use `../common/` for shared components.

---

## Verification Commands

Before writing code, ask user to run:

```powershell
# Check IPC pattern
Select-String -Path "C:\Projects\qanuni\preload.js" -Pattern "functionName"

# Check table schema (MANDATORY before any query changes)
Select-String -Path "C:\Projects\qanuni\main.js" -Pattern "CREATE TABLE.*tablename" -Context 0,15

# Check how a prop is used
Select-String -Path "C:\Projects\qanuni\src\components\*\*.js" -Pattern "lawyers.map" 

# Check column names in queries
Select-String -Path "C:\Projects\qanuni\main.js" -Pattern "FROM lawyers" -Context 2,2
```

---

## Session Checklist

At start of session:
- [ ] Checkpoint file uploaded?
- [ ] PATTERNS.md (this file) uploaded?
- [ ] Clear on what feature to build?

Before writing new code:
- [ ] Verified IPC pattern?
- [ ] Verified table/column names **against CREATE TABLE in main.js**?
- [ ] Checked similar existing component?

After implementation:
- [ ] Tested basic functionality?
- [ ] Added to KNOWN_FIXES.md if bug fix?
- [ ] Created checkpoint if major feature?

---

*Last updated: v46.56 - Forms consolidated into src/components/forms/, src/forms/ removed*