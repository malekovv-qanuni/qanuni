/**
 * Fix MatterForm.js - Replace missing translation keys with English labels
 * Run with: node fix-matterform-labels.js
 */
const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Projects\\qanuni\\src\\components\\forms\\MatterForm.js';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define all the replacements
const replacements = [
  // Fee Arrangement section
  { old: '{t[language].feeArrangement}', new: 'Fee Arrangement' },
  { old: '{t[language].notSet}', new: 'Not Set' },
  { old: '{t[language].hourlyFee}', new: 'Hourly Fee' },
  { old: '{t[language].fixedFeeType}', new: 'Fixed Fee' },
  { old: '{t[language].recurrentFee}', new: 'Recurrent Fee' },
  { old: '{t[language].successFeeType}', new: 'Success Fee' },
  { old: '{t[language].fixedPlusSuccessFee}', new: 'Fixed + Success Fee' },
  
  // Fee-related labels
  { old: '{t[language].customHourlyRateOptional}', new: 'Custom Hourly Rate (Optional)' },
  { old: '{t[language].leaveEmptyForDefault}', new: 'Leave empty to use default rate' },
  { old: '{t[language].currencyLabel}', new: 'Currency' },
  { old: '{t[language].hourlyRateHint}', new: 'If set, this rate applies only to this matter. Otherwise, default firm rate is used.' },
  { old: '{t[language].agreedFeeAmount}', new: 'Agreed Fee Amount' },
  { old: '{t[language].enterAmountPlaceholder}', new: 'Enter amount' },
  { old: '{t[language].percentage}', new: 'Percentage' },
  { old: '{t[language].fixedAmount}', new: 'Fixed Amount' },
  { old: '{t[language].feeAmount}', new: 'Fee Amount' },
  { old: '{t[language].feePercentage}', new: 'Fee Percentage (%)' },
  { old: '{t[language].percentagePlaceholder}', new: 'e.g., 20' },
  { old: '{t[language].fixedFeeUpfront}', new: 'Fixed Fee (Upfront)' },
  { old: '{t[language].amountLabel}', new: 'Amount' },
  { old: '{t[language].successFeeOnWin}', new: 'Success Fee (On Win)' },
  { old: '{t[language].successAmount}', new: 'Success Amount' },
  
  // Office File No. / Court Case No.
  { old: '{t[language].officeFileNo}', new: 'Office File No.' },
  { old: '{t[language].fileNumberPlaceholder}', new: 'e.g., 2026-001' },
  { old: '{t[language].courtCaseNo}', new: 'Court Case No.' },
  
  // Adverse Parties
  { old: '{t[language].adverseParties}', new: 'Adverse Parties' },
  { old: '{t[language].warningPotentialMatches}', new: 'Warning: Potential conflict matches found' },
  { old: '{t[language].existingClient}', new: 'Existing Client' },
  { old: '{t[language].shareholderConflict}', new: 'Shareholder in our client company' },
  { old: '{t[language].directorConflict}', new: 'Director in our client company' },
  { old: '{t[language].adversePartyInMatter}', new: 'Adverse party in another matter' },
  { old: '{t[language].reviewConflictMatches}', new: 'Please review these matches before proceeding.' },
  { old: '{t[language].acknowledgeConflictCheckbox}', new: 'I acknowledge the conflict and have reviewed it with the client' },
  { old: '{t[language].reasonForProceeding}', new: 'Reason for proceeding despite conflict *' },
  { old: '{t[language].enterReasonPlaceholder}', new: 'e.g., Client waived conflict, different parties, etc.' },
  
  // Court Type / Region
  { old: '{t[language].courtType}', new: 'Court Type' },
  { old: '{t[language].select}', new: 'Select' },
  { old: '{t[language].custom}', new: 'Custom' },
  { old: '{t[language].customType}', new: 'Custom Court Type' },
  { old: '{t[language].enterCourtTypePlaceholder}', new: 'Enter custom court type' },
  { old: '{t[language].region}', new: 'Region' },
  { old: '{t[language].customRegion}', new: 'Custom Region' },
  { old: '{t[language].enterRegionPlaceholder}', new: 'Enter custom region' },
  { old: '{t[language].judgeName}', new: 'Judge Name' },
  { old: '{t[language].responsibleLawyer}', new: 'Responsible Lawyer' },
  { old: '{t[language].openingDate}', new: 'Opening Date' },
  { old: '{t[language].notes}', new: 'Notes' },
  { old: '{t[language].cancel}', new: 'Cancel' },
  { old: '{t[language].save}', new: 'Save' },
  
  // Matter Name, Type, Status
  { old: '{t[language].matterName}', new: 'Matter Name' },
  { old: '{t[language].matterType}', new: 'Matter Type' },
  { old: '{t[language].litigation}', new: 'Litigation' },
  { old: '{t[language].arbitration}', new: 'Arbitration' },
  { old: '{t[language].advisory}', new: 'Advisory' },
  { old: '{t[language].transactional}', new: 'Transactional' },
  { old: '{t[language].enterMatterTypePlaceholder}', new: 'Enter custom matter type' },
  { old: '{t[language].status}', new: 'Status' },
  { old: '{t[language].consultation}', new: 'Consultation' },
  { old: '{t[language].engaged}', new: 'Engaged' },
  { old: '{t[language].active}', new: 'Active' },
  { old: '{t[language].onHold}', new: 'On Hold' },
  { old: '{t[language].closed}', new: 'Closed' },
  { old: '{t[language].archived}', new: 'Archived' },
];

// Apply all replacements
replacements.forEach(({ old, new: newVal }) => {
  // Escape special regex characters in the old string
  const escaped = old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'g');
  content = content.replace(regex, newVal);
});

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ MatterForm.js labels fixed!');
console.log('   Replaced ' + replacements.length + ' translation keys with English labels');
console.log('   File: ' + filePath);
