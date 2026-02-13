# Qanuni License Key Generator - Internal Usage Guide

**FOR INTERNAL USE ONLY - DO NOT DISTRIBUTE TO CUSTOMERS**

This document explains how to generate and manage customer licenses for Qanuni v1.0.0+.

---

## Overview

Qanuni uses **machine-bound licenses** to prevent unauthorized sharing. Each license key is cryptographically tied to a specific computer's hardware fingerprint (Machine ID).

**Key Characteristics:**
- ✅ One license per machine (non-transferable)
- ✅ 7-day grace period after expiration
- ✅ Lifetime or annual subscription types
- ✅ License validation happens locally (no phone-home)

---

## Keygen Tool Location

The HTML-based license generator is located at:
```
C:\Projects\qanuni\licensing\keygen.html
```

**To Use:**
1. Open `keygen.html` in any web browser (Chrome, Firefox, Edge)
2. The tool runs entirely client-side (no server required)

**SECURITY NOTE:** This file is excluded from customer distributions. Only the validation code (`license-manager.js`) ships with the app.

---

## Generating a License Key

### Step 1: Get Customer's Machine ID

When a customer installs Qanuni, the License Activation screen displays their unique Machine ID.

**Machine ID Format:** `WIN-1a2b3c4d5e6f7g8h`

The customer should:
1. Click "Copy Machine ID" button
2. Send it via email with their purchase details

### Step 2: Open Keygen Tool

1. Open `licensing/keygen.html` in browser
2. The tool displays the license generation form

### Step 3: Enter License Details

| Field | Description | Example |
|-------|-------------|---------|
| **Machine ID** | Customer's hardware fingerprint | `WIN-1a2b3c4d5e6f7g8h` |
| **Licensee Name** | Firm or individual name | `Kallas & Associates Law Firm` |
| **License Type** | `lifetime` or `annual` | `annual` |
| **Expiry Date** | End date (annual only) | `2027-02-12` |

**For Lifetime Licenses:**
- Set License Type to `lifetime`
- Expiry Date will be auto-set to 2099-12-31

**For Annual Licenses:**
- Set License Type to `annual`
- Set Expiry Date to 1 year from purchase date

### Step 4: Generate Key

1. Click "Generate License Key"
2. The key appears in this format:
```
   QANU-1NI2-ABCD-EFGH-IJKL-MNOP-QRST-UVWX
```
3. The license is automatically saved to browser localStorage
4. Click "Copy" to copy key to clipboard

### Step 5: Send to Customer

Email template:
```
Subject: Your Qanuni License Key

Dear [Customer Name],

Thank you for your purchase of Qanuni Legal Practice Management System.

Your License Details:
- License Key: QANU-1NI2-ABCD-EFGH-IJKL-MNOP-QRST-UVWX
- Licensee: [Firm Name]
- Type: [Lifetime/Annual]
- Expires: [Date or "Never" for lifetime]
- Machine ID: [Their Machine ID]

Activation Instructions:
1. Launch Qanuni on your computer
2. Paste the license key in the activation field
3. Enter your firm name exactly as shown above
4. Click "Activate License"

If you encounter any issues, please contact support@qanuni.app with your Machine ID.

Best regards,
Qanuni Support Team
```

---

## License Management Features

### Search & Filter

The keygen tool includes a search bar to find licenses by:
- Licensee name
- Machine ID
- License key (partial match)

### Export/Import

**Export All Licenses:**
1. Click "Export All" button
2. JSON file downloads: `qanuni-licenses-YYYY-MM-DD.json`
3. Store in secure backup location

**Import Licenses:**
1. Click "Import" button
2. Select previously exported JSON file
3. Licenses merge with existing entries (no duplicates)

**Use Case:** Migrate license database to new computer

### License Statistics

The tool displays:
- Total licenses generated
- Active licenses (not expired)
- Expired licenses
- Lifetime vs Annual breakdown

### Delete License

To remove a license (e.g., refund, test key):
1. Find license in the list
2. Click "Delete" button
3. Confirm deletion

**Note:** Deletion only removes from keygen tool. The customer's activated license continues working until deactivated in the app.

---

## Customer Support Workflows

### Scenario 1: New Purchase

1. Receive purchase confirmation with customer email
2. Customer sends Machine ID
3. Generate license key (annual or lifetime based on purchase)
4. Email key to customer with activation instructions
5. License record saved automatically in keygen tool

### Scenario 2: License Renewal (Annual)

1. Customer reports expired license
2. Locate original license in keygen tool (search by name/Machine ID)
3. Generate new license with same Machine ID, new expiry date
4. Email new key to customer
5. Customer deactivates old key (Settings > License > Deactivate)
6. Customer activates new key

### Scenario 3: Machine Change Request

**Qanuni licenses are machine-bound and non-transferable by design.**

If customer legitimately needs to transfer (e.g., hardware upgrade):

**Option A - Courtesy Reset (One-Time):**
1. Verify customer legitimacy (purchase receipt, email verification)
2. Get new Machine ID from new computer
3. Generate new license with same licensee name, new Machine ID
4. Clearly communicate this is a one-time courtesy

**Option B - Paid Transfer:**
1. Charge transfer fee (50% of original price)
2. Generate new license for new machine
3. Old license remains in database but won't work on new machine

**Important:** Never delete the old license from keygen history for audit trail.

### Scenario 4: Lost License Key

1. Customer reports lost key
2. Search keygen tool by licensee name or Machine ID
3. Click "Copy" on existing license
4. Re-send key via email
5. Confirm it's the same Machine ID (no machine change)

### Scenario 5: Grace Period Expiry

When annual license expires:
- Customer gets 7-day grace period warning banner
- If not renewed within 7 days, app locks out
- Generate renewal license (same process as Scenario 2)

---

## Troubleshooting

### Issue: "Invalid license key"

**Causes:**
1. **Typo in key** - License keys are case-insensitive but must be exact
   - **Fix:** Copy-paste instead of manual typing
   
2. **Wrong Machine ID** - Key was generated for different computer
   - **Fix:** Verify customer's Machine ID matches license record
   
3. **Corrupted key** - Missing characters or extra spaces
   - **Fix:** Regenerate key from keygen tool

4. **Firm name mismatch** - Customer entered different firm name
   - **Fix:** Tell customer to enter exact licensee name from email

### Issue: "License expired" (Annual)

**Causes:**
1. **Expiry date passed** - Annual license term ended
   - **Fix:** Generate renewal license with new expiry date

2. **System date manipulation** - Customer set clock backward
   - **Fix:** Explain license checks system date, cannot be bypassed

### Issue: Customer claims "keygen.html doesn't work"

**CRITICAL:** Customers should NEVER have access to keygen.html!

If customer somehow obtained it:
1. Explain this is internal tooling, not for customer use
2. Confirm their license is activated properly
3. Investigate how they obtained the file (security breach?)

### Issue: Machine ID changed after Windows reinstall

**Expected Behavior:** Machine ID is based on hardware fingerprint, not OS.

If Machine ID changed:
1. **Likely cause:** Major hardware change (motherboard, CPU replacement)
2. **Treat as:** Machine change request (see Scenario 3)
3. **Policy decision:** Courtesy reset or paid transfer

---

## Security Best Practices

### DO:
- ✅ Store `keygen.html` and `issued-licenses.json` securely (not in public repos)
- ✅ Export license database weekly to encrypted backup
- ✅ Verify customer identity before issuing replacement keys
- ✅ Keep audit trail of all license operations (export history)
- ✅ Use strong passwords for computer storing keygen tool

### DON'T:
- ❌ Share keygen tool with customers or third parties
- ❌ Generate test licenses with real customer names
- ❌ Delete old licenses from database (keep for audit trail)
- ❌ Store license database in cloud storage (Dropbox, Google Drive)
- ❌ Email keygen.html file (send keys only, never tool)

---

## Technical Details

### License Key Format
```
QANU-1NI2-ABCD-EFGH-IJKL-MNOP-QRST-UVWX
 │    │    └─────────┬─────────────┘
 │    │              │
 │    │              └─ 28-character cryptographic hash
 │    │
 │    └─ Version identifier (1N = v1.0, I2 = checksum)
 │
 └─ Product prefix (QANU = Qanuni)
```

### Validation Algorithm

1. **Parse key** - Split by hyphens, extract components
2. **Verify checksum** - I2 digit validates key integrity
3. **Decrypt payload** - Extract Machine ID, licensee, type, expiry
4. **Hash verification** - MD5(salt + Machine ID + licensee + expiry)
5. **Machine ID match** - Compare against current computer's fingerprint
6. **Expiry check** - Compare expiry date against current date
7. **Grace period** - Allow 7 days past expiry before lockout

### Cryptographic Salt

The `LICENSE_SALT` is hardcoded in three files (must match):
- `licensing/license-manager.js` (runtime validation)
- `licensing/key-generator.js` (CLI keygen - deprecated)
- `licensing/keygen.html` (HTML keygen - active)

**⚠️ CRITICAL:** If salt changes, ALL previously issued keys become invalid!

Current salt was set in v49.8 (production-ready). Do not change unless:
- Security breach requiring key invalidation
- Version 2.0+ with backwards compatibility layer

---

## FAQ

**Q: Can one license key work on multiple computers?**  
A: No. Each key is bound to a specific Machine ID (hardware fingerprint).

**Q: What happens if customer buys a new computer?**  
A: They need a new license. Treat as machine change request (see Scenario 3).

**Q: Can we issue temporary trial licenses?**  
A: Yes. Generate annual license with 30-day expiry date. Use licensee name "TRIAL - [Company Name]" for easy identification.

**Q: How do we handle refunds?**  
A: Delete license from keygen tool database. The customer's app will continue working until they deactivate manually (we can't remotely revoke). For audit trail, export database before deletion.

**Q: What if the keygen tool crashes or browser cache is cleared?**  
A: Licenses are stored in browser localStorage. Always export regularly. If lost, regenerate keys from purchase records (you'll need customer Machine IDs again).

**Q: Can customers extend their annual license before it expires?**  
A: Yes. Generate new key with expiry +1 year from original expiry (not current date). Customer deactivates old, activates new.

**Q: Is there an API for automated license generation?**  
A: Not currently. The HTML tool is designed for manual, verified issuance to prevent automated abuse.

---

## Changelog

**v1.0.0 (Feb 2026)**
- Initial HTML keygen tool
- Machine-bound licensing with MD5 hashing
- Export/import functionality
- Search and statistics dashboard
- 7-day grace period implementation

---

## Support Escalation

For issues not covered in this guide:

1. Check application logs: `%APPDATA%\Qanuni\logs\`
2. Review license validation errors in `qanuni-licenses-YYYY-MM-DD.json`
3. Contact development team: dev@qanuni.app

**Never share LICENSE_SALT or keygen.html with external parties.**

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Maintainer:** Malek Kallas