# Customer Download Simulation Results
**Date:** February 13, 2026
**Installer:** Qanuni Setup 1.0.0.exe (104.64 MB)
**Signature Status:** NotSigned (no code signing certificate)
**Test Method:** Copied installer to Downloads folder with Mark of the Web (ZoneId=3, Internet zone)

---

## Step 1: Windows SmartScreen

- **Appeared:** YES
- **Title:** "Windows protected your PC"
- **Message:** "Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk."
- **Background Color:** Blue (solid blue background, white text)
- **Link Shown:** "More info" (underlined hyperlink)
- **Button Shown:** "Don't run" (single button, bottom-right)
- **Bypass Method:** Must click "More info" first to reveal the "Run anyway" option

**Screenshot:** `screenshots/smartscreen-initial-warning.png`

### Initial Screen Layout:
```
+--------------------------------------------+
| (shield icon)                              |
| Windows protected your PC                  |
|                                            |
| Microsoft Defender SmartScreen prevented   |
| an unrecognized app from starting.         |
| Running this app might put your PC at risk.|
| More info  (underlined link)               |
|                                            |
|                                            |
|                           [ Don't run ]    |
+--------------------------------------------+
```

### After Clicking "More info":
The dialog expands to show additional details:

- **App:** Qanuni-Customer-Test.exe
- **Publisher:** Unknown publisher
- **Two buttons now visible:** "Run anyway" (left) and "Don't run" (right)

**Screenshot:** `screenshots/smartscreen-expanded-run-anyway.png`

### Expanded Screen Layout:
```
+--------------------------------------------+
| (shield icon)                              |
| Windows protected your PC                  |
|                                            |
| Microsoft Defender SmartScreen prevented   |
| an unrecognized app from starting.         |
| Running this app might put your PC at risk.|
|                                            |
| App:       Qanuni-Customer-Test.exe        |
| Publisher: Unknown publisher               |
|                                            |
|   [ Run anyway ]         [ Don't run ]     |
+--------------------------------------------+
```

---

## Step 2: User Account Control (UAC)

- **Appeared:** NO
- **Reason:** NSIS installer configured for per-user installation (`/currentuser`)
- **Install Location:** `%LOCALAPPDATA%\Programs\Qanuni` (user-writable, no elevation needed)
- **Registry:** HKCU (not HKLM), no admin rights required

This is actually a **significant UX advantage** - one fewer scary dialog for customers.

---

## Step 3: Installation

- **NSIS Installer Launched:** YES (immediately after SmartScreen bypass)
- **Installer Dialog:** Small window showing "Qanuni Setup" with "Installing, please wait..." and progress bar
- **Additional Warnings:** NONE
- **Installation Speed:** Very fast (< 10 seconds for 479 MB unpacked)
- **App Auto-Launch:** YES (app opened automatically after install)
- **Desktop Shortcut Created:** YES
- **Uninstaller Registered:** YES (accessible via Windows Settings > Apps)

**Screenshots:** `screenshots/nsis-installer-zoomed.png`, `screenshots/qanuni-installed-running.png`

### Installer Details:
- **Display Name in registry:** Qanuni 1.0.0
- **Publisher in registry:** Malek Kallas
- **Uninstall String:** `"...\Uninstall Qanuni.exe" /currentuser`
- **Silent Uninstall:** Works with `/S` flag

---

## Total Click Count to Install

| Step | Action | Clicks |
|------|--------|--------|
| 1 | Double-click installer in Downloads | 1 |
| 2 | SmartScreen: Click "More info" | 1 |
| 3 | SmartScreen: Click "Run anyway" | 1 |
| 4 | (No UAC prompt) | 0 |
| 5 | (NSIS auto-installs, no prompts) | 0 |
| **Total** | **From download to running app** | **3 clicks** |

---

## User Experience Assessment

### Scary Factor: 6/10

**Breakdown:**
- The blue SmartScreen with "Windows protected your PC" is intimidating
- "Running this app might put your PC at risk" is a strong negative message
- "Unknown publisher" on the expanded screen adds to distrust
- The "Run anyway" button is hidden behind "More info" (not immediately visible)
- Only showing "Don't run" initially guides users toward NOT running it
- However: Blue background is less alarming than red/yellow would be
- No UAC prompt is a plus (one fewer barrier)

### Would a non-technical lawyer install this? MAYBE (with instructions)

**Factors against:**
- Lebanese lawyers may be more cautious about software from "Unknown publisher"
- The SmartScreen warning is designed to scare users away from unsigned software
- Some users will click "Don't run" reflexively and give up
- IT-managed corporate PCs may block unsigned software entirely via Group Policy

**Factors in favor:**
- If the lawyer trusts the person who recommended/sold the software
- If clear installation instructions are provided (e.g., "Click 'More info' then 'Run anyway'")
- Only 3 clicks total is reasonable
- No admin password required (per-user install)
- The app launches and works immediately after install

---

## Recommendation: Code Signing Needed for Commercial Launch

### Priority: HIGH (before selling to customers outside your direct network)

**For beta/early adopters (trusted circle):** Can proceed WITHOUT code signing
- Provide written install instructions with screenshots showing SmartScreen bypass
- Include steps in README.txt or email
- Personal relationship compensates for "Unknown publisher"

**For commercial launch (paid customers):** Code signing is ESSENTIAL
- $200-500/year for a standard code signing certificate (DigiCert, Sectigo, SSL.com)
- $400-900/year for Extended Validation (EV) which has better SmartScreen reputation
- EV certificates build SmartScreen reputation faster (fewer false positives after ~50 installs)

### Why Code Signing Matters:
1. **Eliminates SmartScreen warning entirely** (after reputation builds)
2. **Shows publisher name** instead of "Unknown publisher"
3. **Professional appearance** - lawyers expect polished software for $199/year
4. **Corporate IT policies** - many firms block unsigned executables
5. **Antivirus false positives** - unsigned EXEs trigger more AV alerts

### Recommended Timeline:
| Phase | Signing | Audience |
|-------|---------|----------|
| Beta (now) | Unsigned + install guide | 5-10 trusted contacts |
| Soft Launch | Standard certificate ($200-300/yr) | First 50 customers |
| Full Launch | EV certificate ($400-900/yr) | General market |

### Certificate Options:
| Provider | Standard | EV | Notes |
|----------|----------|-----|-------|
| Sectigo (Comodo) | ~$200/yr | ~$400/yr | Good value, widely trusted |
| DigiCert | ~$500/yr | ~$900/yr | Premium, fastest reputation |
| SSL.com | ~$200/yr | ~$320/yr | Budget-friendly EV |
| SignPath.io | Free (OSS) | N/A | Open-source only |

---

## Screenshots Saved

All screenshots preserved in `C:\Projects\qanuni\screenshots\`:
1. `smartscreen-initial-warning.png` - Initial SmartScreen warning (Step 1)
2. `smartscreen-expanded-run-anyway.png` - Expanded with "Run anyway" (Step 1b)
3. `nsis-installer-running.png` - NSIS installer in progress
4. `nsis-installer-zoomed.png` - Zoomed view of NSIS installer dialog
5. `qanuni-installed-running.png` - App running successfully after install

---

## Test Environment
- **OS:** Windows 10/11 (DPI: 96, no scaling)
- **Resolution:** 1920x1080
- **SmartScreen:** Enabled (default settings)
- **Antivirus:** Windows Defender (default)
- **User Account:** Standard user with admin access
- **Previous installs:** Qanuni was previously installed (from dev builds)

## Cleanup Status
- Test file removed from Downloads: YES
- Qanuni uninstalled: YES (silent uninstall via /S flag worked)
- Desktop shortcut removed: YES
- Install directory removed: YES
- Registry entry cleaned: YES (by uninstaller)
