# QANUNI v40.5 → v41 - NEXT SESSION INSTRUCTIONS
**Prepared:** January 21, 2026  
**Goal:** Build Corporate Secretary Module

---

## RESUME INSTRUCTIONS

### 1. Load Context
Say to Claude:
> "Resume Qanuni development from v40.5. Read CHECKPOINT_v40.5.md in project files. We're starting the Corporate Secretary module."

### 2. Current State
- App.js: 8,513 lines
- main.js: 2,181 lines  
- All forms have validation
- 29 automated tests passing

---

## CORPORATE SECRETARY MODULE - PHASE 1

### Goal: Entity Management for Corporate Clients

When a client is a **company** (not individual), we need to track:
- Company registration details
- Shareholders
- Board members
- Meetings & resolutions

### Design Decision: Client Type Field

**Current Client Form has:**
- client_type: individual | company

**Enhancement needed:**
When client_type = "company", show additional field:
- **entity_type** (legal form of the company)

---

## LEBANESE ENTITY TYPES TO ADD

| Code | English | Arabic | French |
|------|---------|--------|--------|
| SAL | Joint Stock Company | شركة مساهمة لبنانية | Société Anonyme Libanaise |
| SARL | Limited Liability Company | شركة محدودة المسؤولية | SARL |
| HOLDING | Holding Company | شركة قابضة | Société Holding |
| OFFSHORE | Offshore Company | شركة أوفشور | Société Offshore |
| PARTNERSHIP | General Partnership | شركة تضامن | Société en Nom Collectif |
| LIMITED_PARTNER | Limited Partnership | شركة توصية بسيطة | Société en Commandite Simple |
| BRANCH | Foreign Branch | فرع شركة أجنبية | Succursale Étrangère |
| REP_OFFICE | Representative Office | مكتب تمثيلي | Bureau de Représentation |
| SOLE_PROP | Sole Proprietorship | مؤسسة فردية | Entreprise Individuelle |
| NGO | Non-Profit Organization | جمعية | Association |
| COOP | Cooperative | تعاونية | Coopérative |

---

## DATABASE CHANGES NEEDED

### 1. Add entity_type to clients table
```sql
ALTER TABLE clients ADD COLUMN entity_type TEXT;
```

### 2. New lookup table
```sql
CREATE TABLE lookup_entity_types (
  entity_type_id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,
  name_en TEXT,
  name_ar TEXT,
  name_fr TEXT,
  is_system INTEGER DEFAULT 1,
  sort_order INTEGER
);
```

### 3. New Corporate tables (Phase 1)
```sql
CREATE TABLE corporate_entities (
  entity_id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL,  -- Links to clients table
  registration_number TEXT,
  registration_date TEXT,
  registered_address TEXT,
  share_capital REAL,
  share_capital_currency TEXT DEFAULT 'USD',
  authorized_capital REAL,
  fiscal_year_end TEXT,  -- MM-DD format
  tax_id TEXT,
  commercial_register TEXT,
  status TEXT DEFAULT 'active',  -- active/dormant/liquidating/struck_off
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(client_id)
);
```

---

## UI CHANGES NEEDED

### 1. Client Form Enhancement
When client_type = "company":
- Show entity_type dropdown (SAL, SARL, etc.)
- Show "Manage Corporate Details" button (opens Corporate module)

### 2. New Sidebar Section
```
⚖️ LITIGATION
   └─ Matters
   └─ Hearings
   └─ Judgments
   └─ Deadlines

🏢 CORPORATE (NEW)
   └─ Entities
   └─ Shareholders (Phase 2)
   └─ Board (Phase 2)
   └─ Meetings (Phase 3)
```

### 3. Entities List View
- Show all corporate clients with their entity details
- Filter by entity_type, status
- Quick view of key info (reg number, capital, status)

### 4. Entity Detail View
- Registration info
- Capital structure
- Link to client record
- Future: shareholders, board, meetings tabs

---

## IMPLEMENTATION ORDER

### Session 1 (v41): Foundation
1. Add `entity_type` to clients table + migration
2. Create `lookup_entity_types` with Lebanese types
3. Update ClientForm to show entity_type when company
4. Create `corporate_entities` table
5. Basic Entity CRUD in main.js

### Session 2 (v41.1): UI
6. Add Corporate section to sidebar
7. Entities list view
8. Entity form (create/edit)
9. Link from Client → Entity

### Session 3 (v41.2): Shareholders
10. Shareholders table
11. Share transfers table
12. Shareholder register UI

### Session 4 (v41.3): Board & Meetings
13. Directors table
14. Meetings table
15. Resolutions table
16. Meeting minutes UI

---

## QUESTIONS TO DECIDE

1. **One entity per client or multiple?**
   - Recommendation: One-to-one for now (client IS the entity)
   - Future: Support holding structures (one client = multiple entities)

2. **Should entity_type be required for company clients?**
   - Recommendation: Yes, helps with document templates later

3. **Link corporate work to Matters?**
   - Recommendation: Optional matter_id for billing purposes
   - Corporate retainer work can have a "General Corporate" matter

---

## COURT TYPES (STILL PENDING)

User to provide final list of court types to add:
- Religious courts (8 types)
- Special courts (Military, Press, etc.)
- Commercial, Real Estate

Can be done in parallel with Corporate module.

---

## FILES TO MODIFY

| File | Changes |
|------|---------|
| main.js | Migration, new tables, CRUD handlers |
| preload.js | Expose new IPC methods |
| App.js | ClientForm entity_type, Corporate sidebar, Entity views |

---

## START COMMAND

Tell Claude:
> "Let's start v41. First, add the entity_type field to clients and create the lookup_entity_types table with Lebanese company types. Then update ClientForm to show entity_type dropdown when client_type is 'company'."
