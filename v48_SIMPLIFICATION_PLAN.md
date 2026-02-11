# Qanuni v48 - The Great Simplification: Remove Bilingual UI Architecture

**Created:** February 9, 2026  
**Priority:** HIGH  
**Timeline:** 1-2 sessions (4-6 hours)  
**Risk Level:** Low (systematic refactor with tests)

---

## Executive Summary

**Problem:** Qanuni's codebase implements a dual-language UI architecture (English/Arabic toggle) with dual data fields (`client_name` + `client_name_arabic`). This pattern is appropriate for e-commerce or government portals, but **wrong for legal practice management software**.

**Business Requirement:** 
- ✅ English UI (buttons, menus, labels)
- ✅ Unicode data entry (users can type Arabic anywhere)
- ✅ Custom lookups in any language (court types, regions in Arabic)
- ❌ NO need for UI language toggle

**Industry Standard:** Professional legal software (Clio, MyCase, PracticePanther) uses single-language UI with full Unicode data support. Names are legal entities, not translated strings.

**Solution:** Remove the bilingual UI architecture, keep Unicode data support. Align with industry best practices.

**Impact:** 
- -1,500 lines of code removed
- Simpler, more maintainable codebase
- Faster development velocity
- Professional architecture ready for scale

---

## What Gets Removed

### 1. Language State & Toggle (App.js)
**Current:**
```javascript
const [language, setLanguage] = useState('en');

// Header toggle button
<button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>
  {language === 'en' ? '🇱🇧 ع' : '🇬🇧 EN'}
</button>
```

**After:**
```javascript
// DELETE language state entirely
// DELETE language toggle from header
```

**Files affected:** `App.js` (line ~43, ~1020)

---

### 2. Translation Ternaries (~1,500 occurrences)
**Current:**
```javascript
<FormField label={language === 'ar' ? 'اسم العميل' : 'Client Name'}>
{language === 'ar' ? 'حفظ' : 'Save'}
{language === 'ar' ? 'إلغاء' : 'Cancel'}
```

**After:**
```javascript
<FormField label="Client Name">
Save
Cancel
```

**Files affected:** All 13 forms, all 11 lists, all module components (~40 files total)

**Script to generate list:**
```powershell
Select-String -Path "C:\Projects\qanuni\src\components\*\*.js" -Pattern "language === 'ar' \?" -Recurse | Select-Object -ExpandProperty Path -Unique
```

---

### 3. RTL Layout Logic
**Current:**
```javascript
const isRTL = language === 'ar';

<div className={isRTL ? 'rtl text-right' : ''}>
<div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
```

**After:**
```javascript
// DELETE isRTL entirely
<div>
<div className="flex">
```

**Why:** Browser handles RTL/LTR automatically for text inputs. UI layout stays LTR (English).

---

### 4. Language Prop Passing (~200 occurrences)
**Current:**
```javascript
<ClientForm
  language={language}
  isRTL={isRTL}
  // ... other props
/>
```

**After:**
```javascript
<ClientForm
  // language prop removed
  // isRTL prop removed
  // ... other props
/>
```

**Every component signature changes:**
```javascript
// Before
const ClientForm = ({ language, isRTL, clients, showToast, ... }) => {

// After  
const ClientForm = ({ clients, showToast, ... }) => {
```

---

### 5. Dual Arabic Columns (Database)
**Current Schema:**
```sql
CREATE TABLE clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_name_arabic TEXT,  -- DELETE THIS
  ...
);

CREATE TABLE matters (
  matter_id TEXT PRIMARY KEY,
  matter_name TEXT NOT NULL,
  matter_name_arabic TEXT,  -- DELETE THIS
  ...
);

CREATE TABLE lawyers (
  lawyer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_arabic TEXT,  -- DELETE THIS
  ...
);
```

**Migration Required:**
```sql
-- Step 1: Migrate any data from Arabic columns to main columns
UPDATE clients 
SET client_name = client_name_arabic 
WHERE client_name IS NULL AND client_name_arabic IS NOT NULL;

UPDATE matters 
SET matter_name = matter_name_arabic 
WHERE matter_name IS NULL AND matter_name_arabic IS NOT NULL;

UPDATE lawyers 
SET name = name_arabic 
WHERE name IS NULL AND name_arabic IS NOT NULL;

-- Step 2: Drop the columns
ALTER TABLE clients DROP COLUMN client_name_arabic;
ALTER TABLE matters DROP COLUMN matter_name_arabic;
ALTER TABLE lawyers DROP COLUMN name_arabic;
```

**Files affected:**
- `electron/schema.js` (CREATE TABLE statements)
- `electron/migrations.js` (add new migration)
- `electron/ipc/clients.js` (remove client_name_arabic from queries)
- `electron/ipc/matters.js` (remove matter_name_arabic from queries)
- `electron/ipc/lawyers.js` (remove name_arabic from queries)

---

### 6. Bilingual Display Logic
**Current:**
```javascript
{language === 'ar' ? (client.client_name_arabic || client.client_name) : client.client_name}
{language === 'ar' ? (lawyer.full_name_arabic || lawyer.full_name) : lawyer.full_name}
```

**After:**
```javascript
{client.client_name}
{lawyer.full_name}
```

**Why:** Single source of truth. Display whatever is stored.

---

### 7. Translation Utilities
**Files to delete:**
- `src/constants/translations.js` (if it exists and isn't used for anything else)

**Files to simplify:**
- Remove `import { translations as t }` from components
- Remove `t[language].fieldName` pattern

---

## What Stays Exactly The Same

### ✅ Unicode Data Entry
All text fields continue to accept Arabic (or any Unicode):
```javascript
<input type="text" value={formData.client_name} />
// User can type: "محمد الخطيب" or "John Smith" or "Jean-Pierre Dubois"
```

### ✅ Lookup Customization
Users can add custom entries in Arabic:
```javascript
// Pre-seeded Lebanese court types in Arabic (in schema.js seed data)
INSERT INTO lookup_court_types (name_en, name_ar) VALUES 
  ('Single Judge Criminal', 'محكمة الجنايات الفردية'),
  ('Civil Court of First Instance', 'محكمة البداية المدنية');

// User can add more in Settings > Lookups
```

### ✅ Arabic Text Display
Lists, reports, PDFs continue to show Arabic text correctly:
```javascript
<td>{client.client_name}</td>  // Shows Arabic if that's what was entered
```

### ✅ UTF-8 Encoding Safety
All KNOWN_FIXES.md encoding rules remain in place:
- Never deliver full JS files with Arabic text
- Always use Node.js scripts with `\uXXXX` escapes
- Run `node arabic-scan.js` after batch operations

---

## Implementation Plan

### Session 1: Backend + Data Migration (2-3 hours)

**Step 1: Database Migration**
```javascript
// electron/migrations.js - Add new migration v17
{
  version: 17,
  description: 'Migrate Arabic columns to main columns and drop dual fields',
  up: (db) => {
    // Migrate data
    db.exec(`
      UPDATE clients SET client_name = client_name_arabic 
      WHERE client_name IS NULL AND client_name_arabic IS NOT NULL
    `);
    db.exec(`
      UPDATE matters SET matter_name = matter_name_arabic 
      WHERE matter_name IS NULL AND matter_name_arabic IS NOT NULL
    `);
    db.exec(`
      UPDATE lawyers SET name = name_arabic 
      WHERE name IS NULL AND name_arabic IS NOT NULL
    `);
    
    // Drop columns (SQLite requires recreate table)
    // See full migration script in implementation
  }
}
```

**Step 2: Update Schema (electron/schema.js)**
- Remove `client_name_arabic TEXT` from clients table
- Remove `matter_name_arabic TEXT` from matters table
- Remove `name_arabic TEXT` from lawyers table

**Step 3: Update IPC Handlers**
- `electron/ipc/clients.js` - Remove client_name_arabic from INSERT/UPDATE/SELECT
- `electron/ipc/matters.js` - Remove matter_name_arabic from INSERT/UPDATE/SELECT
- `electron/ipc/lawyers.js` - Remove name_arabic from INSERT/UPDATE/SELECT

**Step 4: Update Validation Schemas**
- `electron/validation.js` - Remove *_arabic field validators

**Step 5: Update Tests**
- `test-integration.js` - Remove assertions on *_arabic fields

**Checkpoint: Run tests**
```powershell
node test-integration.js  # Must pass 116/116
```

---

### Session 2: Frontend Cleanup (2-3 hours)

**Step 1: App.js Core Changes**
```javascript
// DELETE:
const [language, setLanguage] = useState('en');
const isRTL = language === 'ar';

// FIND & REPLACE GLOBALLY IN APP.JS:
language === 'ar' ? 'ARABIC_TEXT' : 'ENGLISH_TEXT'
→ ENGLISH_TEXT

// Example:
{language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
→ Dashboard
```

**Step 2: Remove Language Prop from All Components**

Generate list of files:
```powershell
Select-String -Path "C:\Projects\qanuni\src\components\*\*.js" -Pattern "language," -Recurse | Select-Object -ExpandProperty Path -Unique > files_to_update.txt
```

For each file:
1. Remove `language` and `isRTL` from function parameters
2. Replace all `{language === 'ar' ? '...' : '...'}` with English string
3. Remove `const isRTL = language === 'ar'` if defined locally
4. Remove RTL className conditionals

**Step 3: Forms (13 files in src/components/forms/)**
Systematic pattern:
```javascript
// BEFORE
const ClientForm = ({ language, isRTL, clients, showToast, ... }) => {
  return (
    <div className={isRTL ? 'rtl' : ''}>
      <h2>{language === 'ar' ? 'عميل جديد' : 'New Client'}</h2>
      <FormField label={language === 'ar' ? 'الاسم' : 'Name'}>
      ...

// AFTER
const ClientForm = ({ clients, showToast, ... }) => {
  return (
    <div>
      <h2>New Client</h2>
      <FormField label="Name">
      ...
```

**Step 4: Lists (11 files in src/components/lists/)**
Same pattern - remove language/isRTL, replace ternaries with English.

**Step 5: Modules (Dashboard, Calendar, Reports, Settings, etc.)**
Same pattern.

**Step 6: Common Components**
- FormField, Toast, ConfirmDialog, etc.
- Remove language props if present

**Step 7: Remove Language Toggle from Header**
In App.js around line 1020:
```javascript
// DELETE this button:
<button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>
  {language === 'en' ? '🇱🇧 ع' : '🇬🇧 EN'}
</button>
```

**Checkpoint: Test UI**
```powershell
npm run dev
```
- All modules load
- All forms open/close
- Arabic text entry still works
- No console errors

---

## Testing Checklist

### Backend Tests
```powershell
node test-integration.js  # Must pass 116/116
```

### Manual UI Tests
- [ ] Dashboard loads
- [ ] All modules accessible (Clients, Matters, Hearings, etc.)
- [ ] All forms open (Ctrl+N shortcuts work)
- [ ] Can type Arabic in text fields (client name, matter name, notes)
- [ ] Arabic text displays correctly in lists
- [ ] Custom lookups: can add Arabic court type in Settings
- [ ] Reports generate with Arabic text
- [ ] No console errors (F12)

### Data Migration Tests
- [ ] Open app with existing data
- [ ] Check clients that had client_name_arabic → now show in client_name
- [ ] Check matters that had matter_name_arabic → now show in matter_name
- [ ] Check lawyers that had name_arabic → now show in name
- [ ] No data loss

---

## Estimated Line Changes

| Category | Files | Lines Removed | Lines Added |
|----------|-------|---------------|-------------|
| Translation ternaries | ~40 | -1,200 | +400 (English) |
| Language prop passing | ~40 | -200 | 0 |
| RTL logic | ~20 | -80 | 0 |
| Database schema | 3 | -10 | +20 (migration) |
| IPC handlers | 3 | -30 | 0 |
| Tests | 1 | -10 | 0 |
| **TOTAL** | **~50** | **-1,530** | **+420** |
| **NET REDUCTION** | | **-1,110 lines** | |

---

## Risk Mitigation

### Low Risk Because:
1. ✅ Backend fully tested (116 integration tests)
2. ✅ Unicode data entry already works - not changing
3. ✅ Systematic pattern: find/replace ternaries → English strings
4. ✅ Git history preserved - can revert if needed
5. ✅ Database migration is additive (doesn't delete data, just moves it)

### Backup Strategy:
```powershell
# Before starting v48
git tag v47.1-pre-simplification
git commit -am "Checkpoint before v48 simplification"

# Create database backup
Copy-Item qanuni.db qanuni_v47.1_backup.db
```

---

## Post-Simplification Benefits

### For Development:
- ✅ Faster feature development (no ternaries to maintain)
- ✅ Easier onboarding (simpler codebase)
- ✅ Less test surface area
- ✅ Clearer architecture

### For Product:
- ✅ Professional single-language UI
- ✅ Industry-standard architecture
- ✅ Ready for scale
- ✅ Proper i18n can be added later if needed

### For Users:
- ✅ Same functionality (Arabic data entry works)
- ✅ Faster app (less rendering logic)
- ✅ Cleaner UI (no half-translated strings)

---

## Future: Adding Proper i18n (If Needed)

If you later expand to Francophone Africa and need French UI:

**DO THIS (Professional i18n):**
```javascript
// 1. Add react-i18next framework
npm install react-i18next i18next

// 2. Professional translation files
en.json: { "clientName": "Client Name", "save": "Save" }
fr.json: { "clientName": "Nom du Client", "save": "Enregistrer" }

// 3. Use translation keys
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<FormField label={t('clientName')}>

// 4. Language toggle works properly
<button onClick={() => i18n.changeLanguage('fr')}>FR</button>
```

**DO NOT DO (Current approach):**
```javascript
{language === 'fr' ? 'Nom du Client' : 'Client Name'}  // NO - same mistake again
```

**STILL KEEP single data fields:**
```javascript
client_name: "Jean-Pierre Dubois"  // ONE field, not client_name + client_name_french
```

---

## Execution Timeline

**v47.1 (Today - Feb 9):**
- Ship critical fixes: ErrorBoundary, license fail-closed, API wrapper
- MatterForm reverted (no Arabic field)

**v48 Session 1 (Next session - Feb 10-11):**
- Backend: migration, schema, IPC handlers, tests
- Verify: 116/116 tests pass

**v48 Session 2 (Same day or next):**
- Frontend: remove language state, ternaries, RTL logic
- Test: manual UI verification
- Commit: v48.0

**Total Time:** 4-6 hours across 1-2 sessions

---

## Decision Log

**Why now?**
- Architecture debt compounds over time
- Harder to fix after more features built on wrong abstraction
- v47 hardening reveals the complexity cost
- Better to clean before Phase 3b (context state)

**Why not full rewrite?**
- Would lose hardened backend (Phase 1-2 work)
- Would lose 161 IPC handlers, complex workflows
- 2-3 months vs 1-2 sessions
- Systematic refactor is lower risk

**Why industry matters?**
- Legal software has established patterns
- Clio/MyCase/PracticePanther are proven at scale
- Lebanese legal practice needs Unicode, not UI translation
- Professional architecture attracts investors/acquirers

---

*Plan created: February 9, 2026*  
*Target: v48.0 - The Great Simplification*  
*Status: Ready to execute after v47.1 ships*
