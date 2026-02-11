# Qanuni - Known Fixes Registry
> **Purpose:** Document critical fixes that have been applied multiple times or are prone to regression. Check this before refactoring any component.

---

## CRITICAL – Arabic Text Encoding Corruption
**Version:** v46.57  
**Issue:** Arabic text in JS files gets double-encoded (appears as `Ø·Â§Ø¸â€ž` instead of `Ø§Ù„`) or symbols corrupt (`âœ"` becomes `Ã¢Å""`, `â€"` becomes `Ã¢â‚¬"`)  
**Root cause:** Multiple encoding-unsafe operations:
1. Claude's file delivery system double-encodes UTF-8 Arabic text
2. PowerShell `Set-Content` / `-replace` mangles multi-byte characters
3. Linux `sed -i` corrupts non-ASCII text

**MANDATORY RULES:**
1. **NEVER deliver full files containing Arabic text** through Claude outputs – use targeted Node.js fix scripts instead
2. **NEVER use PowerShell for file modifications** – always use `node -e` or a `.js` script with `fs.readFileSync/writeFileSync` using `'utf8'` encoding
3. **After ANY batch file operation**, run the Arabic integrity scan before proceeding:
```powershell
node -e "const fs=require('fs'),p=require('path');['src/components/forms','src/components/lists','src/components/modules','src/components/common'].forEach(d=>{try{fs.readdirSync(d).filter(f=>f.endsWith('.js')).forEach(f=>{const c=fs.readFileSync(p.join(d,f),'utf8');const bad=c.match(/\u00e2\u20ac[\u201c\u201d\u0153]|Ã¢Å""|Ã¢â‚¬"|Ã¢Å¡â€"/g);if(bad)console.log('CORRUPTED: '+d+'/'+f+' ('+[...new Set(bad)].join(', ')+')')})}catch(e){}});console.log('Scan complete')"
```
4. **When fixing corrupted Arabic**, use Unicode escapes in the fix script (e.g., `'\u0627\u0644\u0639\u0645\u064a\u0644'` not `'Ø§Ù„Ø¹Ù…ÙŠÙ„'`) to prevent re-corruption
5. **Files with Arabic that are safe to deliver**: Only if Arabic text was NOT modified in the delivery

**Test:** Switch app to Arabic → check all forms for garbled text, broken checkmarks, or mojibake

---

## Pre-Session Baseline Verification Process (NEW - Feb 10, 2026)

**Version:** v48.2  
**Issue:** Bugs found during refactoring are often pre-existing from weeks/months prior, causing confusion about bug origin  
**Root cause:** No systematic baseline verification before starting new work

**Examples of delayed bug discovery:**
- Wrong modal routing: Introduced Phase 3c.4c (or earlier), found Phase 3c.7a (weeks later)
- Corrupted emoji: Introduced v46.56 (Feb 8), found Phase 3c.7a (Feb 10)
- 11 Client 360 bugs: Unknown origin, found Phase 3c.6
- Excel export bugs: Unknown origin, found Phase 3c.6

**Problem:** When bugs are found during migration work, unclear if:
- Bug is from current work (regression)
- Bug pre-existed for weeks/months (delayed discovery)

**Solution: Mandatory Pre-Session Audit (3 steps, ~5 minutes)**

Before ANY major refactoring, migration, or new feature work:

```bash
# Step 1: Backend integration tests (30 seconds)
node test-integration.js
# Must show: ✅ All tests passed (116/116)

# Step 2: Column name verification (30 seconds)
node verify-all-queries.js
# Must show: ✅ All column references verified, 0 issues

# Step 3: Encoding integrity check (5 seconds)
node arabic-scan.js
# Must show: Scan complete (no CORRUPTED: messages)
```

**Only proceed if all 3 audits pass.**

**If audits fail:**
1. Fix issues found
2. Commit separately: "Pre-session bugfix: [description]"
3. Re-run audits until clean
4. Document baseline: "Baseline verified clean at [version] on [date]"
5. THEN proceed with planned work

**When bugs found during work:**
1. Check git blame to determine when introduced
2. If pre-existing (>1 week old): Fix separately, different commit
3. If new (from current work): Fix as part of current work
4. Always update KNOWN_FIXES.md with root cause and test case

**Benefits:**
- ✅ Clear attribution: know if bug is new or old
- ✅ Systematic: repeatable, not ad-hoc
- ✅ Fast: 5 minutes vs hours of confusion
- ✅ Preventive: catches issues before they compound
- ✅ Documented: baseline state recorded

**Test:** Before starting Session 1 (REST API), run all 3 audits to establish clean baseline.

---

## HearingForm.js – Matter Inheritance
**Version:** v46.50  
**Issue:** Hearing doesn't inherit court type and region from selected matter  
**Root cause:** Missing useEffect, or wrong field name (`region_id` vs `court_region_id`)

**Correct implementation:**
```javascript
useEffect(() => {
  if (formData.matter_id && !editingHearing) {
    const selectedMatterData = matters.find(m => m.matter_id == formData.matter_id);
    if (selectedMatterData) {
      setFormData(prev => ({
        ...prev,
        court_type_id: selectedMatterData.court_type_id || prev.court_type_id,
        court_region_id: selectedMatterData.court_region_id || prev.court_region_id  // NOT region_id!
      }));
    }
  }
}, [formData.matter_id, matters, editingHearing]);
```

**Test:** Create matter with court/region → Create hearing for that matter → Court and region auto-fill

---

## main.js & ClientForm.js – service_type Removed from Clients
**Version:** v46.52  
**Issue:** Legal entity clients with certain service_type values don't appear in Companies section  
**Root cause:** `service_type` was a client-level field that made no sense – same client can have litigation matters, advisory matters, and corporate secretary work simultaneously. The field caused repeated filtering bugs (v46.49, v46.52).

**Fix (v46.52 – definitive):**
1. Removed service_type field from ClientForm entirely
2. Removed service_type column from ClientsList table and filters
3. Removed service_type from INSERT/UPDATE client handlers in main.js
4. Removed service_type filter from all 3 corporate entity queries in main.js
5. Removed from CREATE TABLE schema and migration
6. Removed from Excel import template, validation, and import handler
7. DB column physically remains (SQLite limitation) but nothing reads or writes it

**Correct query pattern:**
```sql
WHERE c.client_type = 'legal_entity'
AND c.deleted_at IS NULL
```

**Test:** Add client with client_type=legal_entity → Should appear in Companies regardless of any other field

---

## main.js – Fresh Database Schema
**Version:** v46.49  
**Issue:** "table X has no column named Y" error on fresh install  
**Root cause:** CREATE TABLE statements missing columns added via migrations

**Columns that MUST be in CREATE TABLE (not just migrations):**
- `clients`: entity_type, deleted_at, client_reference
- `matters`: parent_matter_id, appeal_type, adverse_parties, deleted_at, various fee fields
- `hearings`: deleted_at, adjourned_to_hearing_id
- `invoices`: invoice_content_type, deleted_at
- `expenses`: attachment_note, deleted_at
- All tables with soft delete: `deleted_at` column

**Test:** Delete .db file → Launch app → Add client → Should work without errors

---

## ClientForm.js – Textarea Null Values
**Version:** v46.49  
**Issue:** Console warning about null textarea value  
**Root cause:** address/notes fields can be null from DB

**Correct implementation:**
```javascript
<textarea value={formData.address || ''} .../>
<textarea value={formData.notes || ''} .../>
```

---

## ClientForm.js – Website Field Type
**Version:** v46.49  
**Issue:** Website field rejects `www.example.com` (no https://)  
**Root cause:** Input type was `url` which requires protocol

**Correct implementation:**
```javascript
<input type="text" .../>  // NOT type="url"
```

---

## GuidedTour.js – First-Run Dialog Focus Issue
**Version:** v46.50  
**Issue:** Inputs freeze after skipping tour on fresh install  
**Root cause:** `window.confirm()` causes focus issues in Electron

**Correct implementation:** Use React modal instead of window.confirm()

---

## Excel Import – Client Type Mapping
**Version:** v46.49  
**Issue:** "Company" in Excel doesn't map to legal_entity  
**Root cause:** Mapping only checked lowercase 'company'

**Correct implementation:**
```javascript
// Map various inputs to entity_type
const typeMap = {
  'individual': 'individual',
  'company': 'legal_entity',
  'legal entity': 'legal_entity',
  'ÙØ±Ø¯': 'individual',
  'Ø´Ø±ÙƒØ©': 'legal_entity'
};
const normalized = String(value).toLowerCase().trim();
return typeMap[normalized] || 'individual';
```

---

## Pre-Release Checklist

Before running `npm run dist`, verify:

- [ ] Fresh DB: Delete .db → launch → add client → no errors
- [ ] Hearing inheritance: Create hearing → court type AND region auto-fill from matter
- [ ] Companies filter: Any client with client_type "legal_entity" appears in Companies
- [ ] Excel import: "Company" type maps to legal_entity
- [ ] Website field: Accepts `www.example.com` without protocol
- [ ] Tour skip: Skip welcome tour → inputs still work
- [ ] Textarea fields: No console warnings about null values
- [ ] Matter dropdowns: Show `[custom_matter_number] matter_name – case_number – court_name` in all forms/filters
- [ ] Matter Timeline: Add/edit/delete diary notes works
- [ ] **Arabic integrity: Switch to Arabic → check all forms for garbled text or broken symbols**
- [ ] **Encoding scan: Run Arabic integrity scan script (see top of this file) → zero CORRUPTED results**
- [ ] **Pre-session audit: Run all 3 baseline verification steps → all pass**

---

## main.js – Client Arabic Column Name is `client_name_arabic` NOT `client_name_ar`
**Version:** v46.53  
**Issue:** Matters list shows 0 items despite dashboard showing 8 active matters  
**Root cause:** `get-all-matters` query referenced `c.client_name_ar` which doesn't exist. SQLite silently fails the entire query. The actual column is `client_name_arabic` (with full word, not abbreviation).

**PATTERNS.md was wrong** – it listed the column as `client_name_ar`, which caused Claude to use the wrong name. Documentation has been corrected.

**The 4 naming patterns:**
| Table | English | Arabic | Pattern |
|-------|---------|--------|---------|
| `lawyers` | `name` | `name_arabic` | short + `_arabic` |
| `lookup_*` | `name_en` | `name_ar` | `_en` / `_ar` |
| `clients` | `client_name` | `client_name_arabic` | prefixed + `_arabic` |
| `matters` | `matter_name` | `matter_name_arabic` | prefixed + `_arabic` |

**Rule:** ALWAYS verify column names against `CREATE TABLE` in electron/schema.js before writing queries. Never rely on documentation or memory alone.

**Test:** Open Matters list → all matters should appear with client names

---

## main.js – Matter Timeline Backend Lost After git checkout
**Version:** v46.53  
**Issue:** Matter Timeline "Error saving" when adding diary notes  
**Root cause:** v46.51 added Matter Timeline frontend (MatterTimeline.js) but backend (diary table + 4 IPC handlers in main.js/preload.js) was never committed. Running `git checkout main.js preload.js` after dist wiped the uncommitted backend code.

**Fix:** Recreated `matter_diary` table, 4 IPC handlers, and 4 preload functions in v46.53.

**Prevention:** Always `git commit` before `npm run dist`. After `git checkout main.js preload.js`, run integrity check comparing frontend electronAPI calls vs preload functions.

**Test:** Open matter → Timeline → Add note → Should save successfully

---

## SettingsModule.js – Wrong Modal on "+ Add Lawyer"
**Version:** v48.2 (Phase 3c.7a)  
**Issue:** Clicking "+ Add Lawyer" button in Settings > Lawyers tab opens Expense Categories form instead of Lawyer form  
**Root cause:** Button called `openForm('lookup')` without setting `currentLookupType` state first. UIContext migration in Phase 3c.4c created this pattern but didn't handle the lawyers edge case.

**Correct implementation:**
```javascript
// Before opening form, set the lookup type
setCurrentLookupType('lawyers');
openForm('lookup');
```

**Test:** Settings > Lawyers tab > "+ Add Lawyer" → Should open lawyer form, not expense categories form

---

## LookupForm.js – Corrupted Icon Emoji
**Version:** v48.2 (Phase 3c.7a)  
**Issue:** Icon field in lookup forms shows `‹úº"â€¹` instead of 📋 emoji  
**Root cause:** UTF-8 corruption during v46.56 form consolidation (Feb 8) when forms were moved to `src/components/forms/`. File was edited with encoding-unsafe tool.

**Correct implementation:**
```javascript
icon: '📋',  // Line 18
placeholder="📋"  // Line 156
```

**Prevention:** Follow encoding rules at top of this file. Never edit JS files with Arabic/emoji using PowerShell or unsafe tools.

**Test:** Settings > Lookup Tables > Any table > Add entry → Icon field shows 📋 correctly

---

## How to Use This File

1. **Before refactoring:** Check if the component has known fixes listed here
2. **After fixing a recurring bug:** Add it to this file with version, cause, and test case
3. **Before release:** Run through the pre-release checklist
4. **In code reviews:** Reference this file when touching sensitive areas
5. **After any batch file operation:** Run Arabic integrity scan
6. **Before starting new work:** Run pre-session baseline verification (3 audits)

---

*Last updated: v48.2 – February 10, 2026 - Added Pre-Session Baseline Verification process*
