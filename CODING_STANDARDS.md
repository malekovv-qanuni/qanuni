# Qanuni Coding Standards & Patterns
**Purpose:** Prevent recurring bugs by documenting learned patterns  
**Updated:** January 24, 2026 (v42.2)

---

## 1. React Form Inputs - ALWAYS Use Fallbacks

### ❌ WRONG - Causes "value prop should not be null" warning
```javascript
<input value={formData.fieldName} onChange={...} />
<select value={formData.fieldName} onChange={...}>
```

### ✅ CORRECT - Always use fallback for potentially null/undefined values
```javascript
<input value={formData.fieldName || ''} onChange={...} />
<select value={formData.fieldName || ''} onChange={...}>
```

### Checklist for new forms:
- [ ] Every `<input value={}>` has `|| ''` fallback
- [ ] Every `<select value={}>` has `|| ''` fallback
- [ ] Every `<textarea value={}>` has `|| ''` fallback
- [ ] Number inputs: use `|| ''` not `|| 0` (allows empty field)

---

## 2. Context-Aware Filters - Switch Based on Active Tab/Type

### ❌ WRONG - Static filter regardless of context
```javascript
// Always shows "Client" filter even on Lawyer tab
<label>Client:</label>
<select value={clientFilter}>
  {clients.map(c => <option>...)}
</select>
```

### ✅ CORRECT - Filter changes based on context
```javascript
{activeTab === 'lawyer_advance' ? (
  <>
    <label>Lawyer:</label>
    <select value={lawyerFilter}>
      {lawyers.map(l => <option>...)}
    </select>
  </>
) : (
  <>
    <label>Client:</label>
    <select value={clientFilter}>
      {clients.map(c => <option>...)}
    </select>
  </>
)}
```

### Checklist for tabbed interfaces:
- [ ] Each tab's filters make sense for that tab's data
- [ ] Filter state resets or adapts when tab changes
- [ ] Labels match the filter type (not just "Filter by:")

---

## 3. Form Dirty State - Only Mark Dirty on USER Changes

### ❌ WRONG - Marks dirty during initialization
```javascript
const [formData, setFormData] = useState(editingItem || defaultValues);

const handleChange = (name, value) => {
  setFormData(prev => ({...prev, [name]: value}));
  markFormDirty(); // Called even during programmatic changes!
};

// In useEffect or during load:
handleChange('field', loadedValue); // Triggers dirty!
```

### ✅ CORRECT - Only mark dirty on actual user interaction
```javascript
const [formData, setFormData] = useState(editingItem || defaultValues);
const [isDirty, setIsDirty] = useState(false);

// Separate function for programmatic updates (no dirty)
const updateField = (name, value) => {
  setFormData(prev => ({...prev, [name]: value}));
};

// User interaction handler (marks dirty)
const handleUserChange = (name, value) => {
  setFormData(prev => ({...prev, [name]: value}));
  setIsDirty(true);
};

// In JSX - use handleUserChange for onChange
<input onChange={(e) => handleUserChange('field', e.target.value)} />
```

### Alternative: Use ref to track if form has been interacted with
```javascript
const userHasInteracted = useRef(false);

const handleChange = (name, value) => {
  setFormData(prev => ({...prev, [name]: value}));
  if (userHasInteracted.current) {
    markFormDirty();
  }
};

// On first user interaction:
const handleFocus = () => { userHasInteracted.current = true; };
```

### Checklist for form dirty tracking:
- [ ] Dirty state NOT set during initial load
- [ ] Dirty state NOT set during programmatic updates
- [ ] Dirty state ONLY set on user-initiated changes
- [ ] **clearFormDirty() called after successful save**
- [ ] Test: Open edit form → immediately close → should NOT warn
- [ ] Test: Save form → navigate away → should NOT warn

---

## 4. State Lifting for Nested Inputs (Double-Click Fix)

### ❌ WRONG - Local state in child causes sync issues
```javascript
// Child component
const ChildForm = ({ initialValue, onSave }) => {
  const [value, setValue] = useState(initialValue); // Local state
  // Problem: initialValue changes don't update local state
};
```

### ✅ CORRECT - State lives in parent, child receives via props
```javascript
// Parent
const [formData, setFormData] = useState({...});
<ChildForm 
  value={formData.field} 
  onChange={(v) => setFormData({...formData, field: v})} 
/>

// Child - no local state for the value
const ChildForm = ({ value, onChange }) => {
  return <input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
};
```

### Checklist for form components:
- [ ] Form values come from props, not local state
- [ ] Parent owns the state, child just displays/edits
- [ ] If local state needed, sync with useEffect on prop change

---

## 5. Database Fields - Handle NULL Gracefully

### ❌ WRONG - Assumes field always has value
```javascript
const displayName = record.client_name.toUpperCase(); // Crashes if null!
const amount = record.amount + 100; // NaN if null!
```

### ✅ CORRECT - Always handle potential null/undefined
```javascript
const displayName = (record.client_name || 'Unknown').toUpperCase();
const amount = (parseFloat(record.amount) || 0) + 100;
const date = record.date || new Date().toISOString().split('T')[0];
```

### Checklist for database queries:
- [ ] Optional fields handled with `|| defaultValue`
- [ ] Numbers parsed with `parseFloat(x) || 0`
- [ ] Strings handled with `x || ''`
- [ ] Dates have sensible defaults

---

## 6. List Filtering - Reset Filters on Context Change

### ❌ WRONG - Filters persist when they shouldn't
```javascript
// User filters Client list by "ABC Corp"
// User switches to Lawyer Advance tab
// Filter still shows "ABC Corp" (irrelevant!)
```

### ✅ CORRECT - Reset or adapt filters on tab/context change
```javascript
const handleTabChange = (newTab) => {
  setActiveTab(newTab);
  // Reset filters that don't apply to new context
  if (newTab === 'lawyer_advance') {
    setClientFilter(''); // Clear client filter
  } else {
    setLawyerFilter(''); // Clear lawyer filter
  }
};
```

---

## 7. Pre-Commit Checklist

Before committing any form-related changes:

### Forms
- [ ] All input `value={}` props have `|| ''` fallback
- [ ] Form dirty state only triggers on user action
- [ ] Edit mode loads all fields (test by editing existing record)
- [ ] Cancel doesn't trigger unsaved changes on fresh form

### Lists with Filters
- [ ] Filters match the current tab/context
- [ ] Filter labels are accurate
- [ ] Switching tabs resets irrelevant filters

### Database Operations
- [ ] NULL fields handled gracefully in display
- [ ] Number fields use parseFloat with fallback
- [ ] Save operation includes all required fields

### General
- [ ] No console warnings (check DevTools)
- [ ] Test both Add and Edit flows
- [ ] Test Cancel/Close without changes

---

## 8. Quick Reference - Common Fixes

| Issue | Fix |
|-------|-----|
| "value prop should not be null" | Add `\|\| ''` to input value |
| Double-click required | Lift state to parent component |
| Unsaved changes on fresh form | Don't call markDirty on init |
| Unsaved changes after save | Call `clearFormDirty()` after successful save |
| Wrong filter on tab | Make filter context-aware |
| NaN in calculations | Use `parseFloat(x) \|\| 0` |
| Crash on null field | Use optional chaining `x?.field` |

---

## Version History
- v42.2 (2026-01-24): Initial standards document created
