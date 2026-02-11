# TWO-CHAT WORKFLOW - Add This Section to CLAUDE.md

---

## 🔄 TWO-CHAT WORKFLOW (CRITICAL)

### Overview
Development uses TWO Claude instances working together:
1. **Claude Web Chat** (strategic planning, breaking down work)
2. **Claude Code Chat** (file operations, code execution)
3. **Malek** (bridge between the two)

### Role Definitions

**Claude Web Chat (Strategic) - This Chat:**
- Provides architectural guidance and planning
- Breaks complex tasks into small, executable steps
- **Provides ONE step at a time** (50-100 lines max)
- Waits for user confirmation ("done", "next") before providing next step
- **NEVER** provides multiple steps at once
- **NEVER** tells user to upload files to Code Chat
- Each step must be copy-paste ready for Code Chat

**Claude Code Chat (Execution):**
- Performs file operations (create, edit, move files)
- Executes code and commands
- Receives instructions FROM user (copied from Web Chat)
- Works on one step at a time

**Malek (Bridge):**
- Gets one step from Web Chat
- Copies step to Code Chat for execution
- Returns to Web Chat with "done" or "next"
- Repeats until task complete

### Workflow Pattern

```
WEB CHAT (Planning)
    ↓
Malek: "Ready for next step"
    ↓
Claude Web: Provides Step 1 (50-100 lines)
    ↓
Malek: Copies to Code Chat
    ↓
CODE CHAT (Execution)
    ↓
Executes Step 1
    ↓
Malek: Returns to Web Chat
    ↓
Malek: "Done, next"
    ↓
Claude Web: Provides Step 2
    ↓
REPEAT until task complete
```

### Critical Rules for Web Chat (Claude)

1. **ONE STEP ONLY** - Never provide Steps 1-5 in one response
2. **WAIT FOR CONFIRMATION** - User says "done" before next step
3. **SMALL CHUNKS** - Each step: 50-100 lines maximum
4. **COPY-PASTE READY** - Complete code/command, not references
5. **NO FILE UPLOAD INSTRUCTIONS** - Never tell user to upload docs to Code Chat

### Example Interaction

**CORRECT:**
```
User: "Ready for Phase 1 Step 1"
Claude Web: "Step 1: Create src/api-client.js with boilerplate
[50 lines of code]
Copy this to Code Chat. Tell me when done."

User: "Done"
Claude Web: "Step 2: Add client methods
[60 lines of code]
Copy this to Code Chat. Tell me when done."
```

**WRONG:**
```
User: "Ready for Phase 1"
Claude Web: "Here are Steps 1-10:
Step 1: [code]
Step 2: [code]
Step 3: [code]
..."
```

**WRONG:**
```
Claude Web: "Upload these files to Code Chat:
- file1.md
- file2.md
Then execute..."
```

### When to Use Each Chat

**Use Web Chat for:**
- Planning and strategy
- Breaking down complex features
- Architectural decisions
- Getting next step in a sequence
- Creating checkpoints

**Use Code Chat for:**
- Creating/editing files
- Running commands
- Batch file operations
- Executing the steps provided by Web Chat

### Checkpoint Workflow

**After major milestones:**
1. User completes several steps in Code Chat
2. Returns to Web Chat: "Phase X complete, create checkpoint"
3. Claude Web creates checkpoint document
4. User starts fresh Web Chat with checkpoint
5. Continue with next phase

### Integration with Project Files

This workflow is documented in:
- **CLAUDE.md** (this section - permanent reference)
- **Checkpoint files** (SESSION_X_CHECKPOINT.md - session-specific)
- **PATTERNS.md** (code patterns, separate from workflow)

Every new chat should start with this workflow understanding.

---

## Instructions for Adding to CLAUDE.md

**Location:** Add this section to `C:\Projects\qanuni\CLAUDE.md`

**Position:** Add after "Current Status" section, before "Approach & patterns"

**Then:** Commit to git so it's in project root

**Result:** Every new chat will load this and understand the workflow automatically

---
