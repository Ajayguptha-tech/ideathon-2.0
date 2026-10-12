import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllRegistrations,
  clearAllRegistrations,
  getLastTeamNumber,
  formatTeamId,
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'server', 'data');
const jsonPath = path.join(dataDir, 'registrations.json');
const csvPath = path.join(dataDir, 'registrations.csv');
const seqPath = path.join(dataDir, 'sequence.json');

console.log('====================================================');
console.log('  IDEATHON 2.0 DATA INSPECTION AND CLEANUP UTILITY');
console.log('====================================================\n');

// 1. Inspect existing records
const records = getAllRegistrations();
console.log(`[Inspection] Total records found in database: ${records.length}`);

const fakeRecords = [];
const genuineRecords = [];

for (const r of records) {
  const isFakeOrTest =
    r.teamName?.includes('Cyber Duet') ||
    r.teamName?.includes('Quantum Trio') ||
    r.teamName?.includes('Neural Squad') ||
    r.teamName?.includes('Binary Pair') ||
    r.teamName?.includes('Trio Innovators') ||
    r.teamName?.includes('Neural Apex') ||
    r.teamName?.includes('Demo Innovators') ||
    r.teamName?.toLowerCase().includes('vignanite') ||
    r.teamName?.toLowerCase().includes('vignaite') ||
    r.lead?.email?.includes('@test.') ||
    r.lead?.name?.toLowerCase() === 'solo' ||
    r.registrationId?.startsWith('YIC26-');

  if (isFakeOrTest) {
    fakeRecords.push(r);
  } else {
    genuineRecords.push(r);
  }
}

console.log(`[Classification] Fake / Test / Seed Registrations: ${fakeRecords.length}`);
console.log(`[Classification] Genuine Student Registrations: ${genuineRecords.length}\n`);

console.log('--- Identifed Fake/Test Entries to Remove ---');
fakeRecords.forEach((r, idx) => {
  const lead = r.lead || {};
  console.log(
    ` ${idx + 1}. [${r.registrationId || r.teamId}] "${r.teamName}" | Size: ${r.teamSize} | Lead: ${lead.name} (${lead.email}, ${lead.regNo})`
  );
});
console.log('---------------------------------------------\n');

if (genuineRecords.length > 0) {
  console.log('⚠️ Genuine Registrations Detected to Preserve:');
  genuineRecords.forEach((r, idx) => {
    console.log(` ${idx + 1}. [${r.registrationId || r.teamId}] "${r.teamName}" | Lead: ${r.lead?.name}`);
  });
} else {
  console.log('ℹ️ No genuine external student registrations exist yet. Complete clean slate.');
}

// 2. Perform cleanup
console.log('\n[Action] Executing database cleanup and sequence reset...');
clearAllRegistrations();

// 3. Verify files after cleanup
const remainingRecords = getAllRegistrations();
const nextNumber = getLastTeamNumber() + 1;
const nextTeamId = formatTeamId(nextNumber);

console.log('\n====================================================');
console.log('  CLEANUP AND SEQUENCE RESET VERIFICATION');
console.log('====================================================');
console.log(`  Teams Remaining in Database:    ${remainingRecords.length}`);
console.log(`  Members Remaining in Database:  ${remainingRecords.reduce((acc, t) => acc + (t.teamSize || t.members?.length + 1), 0)}`);
console.log(`  Next Allocated Public Team ID:  ${nextTeamId}`);
console.log(`  registrations.json Size:        ${fs.statSync(jsonPath).size} bytes`);
console.log(`  registrations.csv Size:         ${fs.statSync(csvPath).size} bytes`);
console.log(`  sequence.json:                  ${fs.readFileSync(seqPath, 'utf-8').trim()}`);
console.log('====================================================\n');
