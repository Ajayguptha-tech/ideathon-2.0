import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'ajayguptha710@gmail.com';
const ADMIN_PASS = 'Ideathon@Admin2026!';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const jsonPath = path.join(projectRoot, 'server', 'data', 'registrations.json');
const csvPath = path.join(projectRoot, 'server', 'data', 'registrations.csv');
const seqPath = path.join(projectRoot, 'server', 'data', 'sequence.json');

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, json, text, headers: res.headers };
}

const testResults = [];

function recordTest(name, passed, detail) {
  testResults.push({ name, passed, detail });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} | ${name}`);
  if (detail) console.log(`       ${detail}`);
}

async function runVerification() {
  console.log('====================================================');
  console.log('  IDEATHON 2.0 CLEANUP & SEQUENTIAL TEAM ID TEST');
  console.log('====================================================\n');

  let adminToken = null;

  // Login as admin first
  try {
    const loginRes = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
    });
    if (loginRes.status === 200 && loginRes.json?.token) {
      adminToken = loginRes.json.token;
    }
  } catch (err) {
    console.error('Admin login error:', err.message);
  }

  // 1. Verify database contains 0 fake or demo registrations
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const records = JSON.parse(raw);
    const passed = Array.isArray(records) && records.length === 0;
    recordTest(
      '1. Database contains no fake, demo, or test registrations',
      passed,
      `registrations.json records count: ${records.length}`
    );
  } catch (err) {
    recordTest('1. Database contains no fake registrations', false, err.message);
  }

  // 2. Dashboard initially shows zero teams and zero members when database is empty
  try {
    const res = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const stats = res.json?.stats;
    const passed =
      res.status === 200 &&
      stats?.totalTeams === 0 &&
      stats?.totalStudents === 0 &&
      stats?.teamSizes?.['2'] === 0 &&
      stats?.teamSizes?.['3'] === 0 &&
      stats?.teamSizes?.['4'] === 0;
    recordTest(
      '2. Dashboard initially displays zero teams and zero members',
      passed,
      `Total Teams: ${stats?.totalTeams}, Total Students: ${stats?.totalStudents}, 2/3/4 Sizes: ${stats?.teamSizes?.['2']}/${stats?.teamSizes?.['3']}/${stats?.teamSizes?.['4']}`
    );
  } catch (err) {
    recordTest('2. Dashboard zero counts', false, err.message);
  }

  // 3. Registration table and exports contain no fake entries
  try {
    const rTeams = await request('/api/admin/teams', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rCsv = await request('/api/admin/export-csv', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rExcel = await request('/api/admin/export-excel', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const csvLines = rCsv.text.trim().split('\n').filter(Boolean);
    const passed =
      rTeams.status === 200 &&
      rTeams.json?.count === 0 &&
      rTeams.json?.teams?.length === 0 &&
      rCsv.status === 200 &&
      csvLines.length === 1 && // Header only
      rExcel.status === 200;

    recordTest(
      '3. Registrations table, CSV export, and Excel export contain 0 fake entries',
      passed,
      `Teams API count: ${rTeams.json?.count}, CSV line count: ${csvLines.length} (header only), Excel HTTP: ${rExcel.status}`
    );
  } catch (err) {
    recordTest('3. Empty exports verification', false, err.message);
  }

  // 4. First test registration receives TEAM-001
  let team1Res = null;
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Pioneer Team Alpha',
        teamSize: 2,
        lead: {
          name: 'Aarav Sharma',
          regNo: 'REG24001',
          department: 'CSE',
          academicYear: '2nd',
          email: 'aarav.pioneer@vignan.ac.in',
          phone: '9876543210',
        },
        members: [
          {
            name: 'Diya Patel',
            regNo: 'REG24002',
            department: 'IT',
            academicYear: '3rd',
            email: 'diya.pioneer@vignan.ac.in',
            phone: '9876543211',
          },
        ],
      }),
    });
    team1Res = res;
    const passed =
      res.status === 201 &&
      res.json?.success === true &&
      res.json?.teamId === 'TEAM-001' &&
      res.json?.registrationId === 'TEAM-001';
    recordTest(
      '4. First genuine registration receives TEAM-001',
      passed,
      `Team ID: "${res.json?.teamId}", Registration ID: "${res.json?.registrationId}", Team: "${res.json?.teamName}"`
    );
  } catch (err) {
    recordTest('4. First registration receives TEAM-001', false, err.message);
  }

  // 5. Next real test registration receives TEAM-002
  let team2Res = null;
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Pioneer Team Beta',
        teamSize: 3,
        lead: {
          name: 'Kavya Reddy',
          regNo: 'REG24003',
          department: 'ACSE',
          academicYear: '3rd',
          email: 'kavya.pioneer@vignan.ac.in',
          phone: '9876543220',
        },
        members: [
          {
            name: 'Rohan Verma',
            regNo: 'REG24004',
            department: 'CSE',
            academicYear: '2nd',
            email: 'rohan.pioneer@vignan.ac.in',
            phone: '9876543221',
          },
          {
            name: 'Ananya Rao',
            regNo: 'REG24005',
            department: 'IT',
            academicYear: '3rd',
            email: 'ananya.pioneer@vignan.ac.in',
            phone: '9876543222',
          },
        ],
      }),
    });
    team2Res = res;
    const passed =
      res.status === 201 &&
      res.json?.success === true &&
      res.json?.teamId === 'TEAM-002' &&
      res.json?.registrationId === 'TEAM-002';
    recordTest(
      '5. Second genuine registration receives TEAM-002',
      passed,
      `Team ID: "${res.json?.teamId}", Registration ID: "${res.json?.registrationId}", Team: "${res.json?.teamName}"`
    );
  } catch (err) {
    recordTest('5. Second registration receives TEAM-002', false, err.message);
  }

  // 6. Invalid registrations do not consume team IDs
  try {
    // Attempt invalid registration with 5 members and 4th year member
    const rInvalid1 = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Invalid Squad 5',
        teamSize: 5,
        lead: { name: 'Bad', regNo: 'BAD001', department: 'CSE', academicYear: '4th', email: 'bad@test.com', phone: '9876543210' },
        members: [
          { name: 'M2', regNo: 'BAD002', department: 'CSE', academicYear: '2nd', email: 'm2@test.com', phone: '9876543211' },
          { name: 'M3', regNo: 'BAD003', department: 'CSE', academicYear: '2nd', email: 'm3@test.com', phone: '9876543212' },
          { name: 'M4', regNo: 'BAD004', department: 'CSE', academicYear: '2nd', email: 'm4@test.com', phone: '9876543213' },
          { name: 'M5', regNo: 'BAD005', department: 'CSE', academicYear: '2nd', email: 'm5@test.com', phone: '9876543214' },
        ],
      }),
    });

    // Attempt invalid department (MECH)
    const rInvalid2 = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Invalid Dept',
        teamSize: 2,
        lead: { name: 'Mech Lead', regNo: 'MECH01', department: 'MECH', academicYear: '2nd', email: 'mech@test.com', phone: '9876543210' },
        members: [{ name: 'Civil', regNo: 'CIV01', department: 'CIVIL', academicYear: '3rd', email: 'civ@test.com', phone: '9876543211' }],
      }),
    });

    // Now submit a valid registration. It MUST receive TEAM-003, NOT TEAM-005!
    const rValidAfter = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Pioneer Team Gamma',
        teamSize: 2,
        lead: {
          name: 'Vikram Joshi',
          regNo: 'REG24006',
          department: 'CSE',
          academicYear: '3rd',
          email: 'vikram.pioneer@vignan.ac.in',
          phone: '9876543230',
        },
        members: [
          {
            name: 'Sneha Kulkarni',
            regNo: 'REG24007',
            department: 'ACSE',
            academicYear: '2nd',
            email: 'sneha.pioneer@vignan.ac.in',
            phone: '9876543231',
          },
        ],
      }),
    });

    const passed =
      rInvalid1.status === 400 &&
      rInvalid2.status === 400 &&
      rValidAfter.status === 201 &&
      rValidAfter.json?.teamId === 'TEAM-003';

    recordTest(
      '6. Invalid registrations do not consume team IDs (Next ID is strictly TEAM-003)',
      passed,
      `Rejected 1: HTTP ${rInvalid1.status}, Rejected 2: HTTP ${rInvalid2.status}, Subsequent Valid ID: "${rValidAfter.json?.teamId}"`
    );
  } catch (err) {
    recordTest('6. Invalid registrations do not consume IDs', false, err.message);
  }

  // 7. Concurrent registrations cannot generate duplicate IDs
  try {
    const concurrentPayloads = [
      {
        teamName: 'Concurrent Delta 1',
        teamSize: 2,
        lead: { name: 'Delta Lead 1', regNo: 'DEL24001', department: 'CSE', academicYear: '2nd', email: 'delta1@test.com', phone: '9876543241' },
        members: [{ name: 'Delta Mem 1', regNo: 'DEL24002', department: 'IT', academicYear: '3rd', email: 'delta1m@test.com', phone: '9876543242' }],
      },
      {
        teamName: 'Concurrent Delta 2',
        teamSize: 2,
        lead: { name: 'Delta Lead 2', regNo: 'DEL24003', department: 'ACSE', academicYear: '3rd', email: 'delta2@test.com', phone: '9876543243' },
        members: [{ name: 'Delta Mem 2', regNo: 'DEL24004', department: 'CSE', academicYear: '2nd', email: 'delta2m@test.com', phone: '9876543244' }],
      },
      {
        teamName: 'Concurrent Delta 3',
        teamSize: 2,
        lead: { name: 'Delta Lead 3', regNo: 'DEL24005', department: 'IT', academicYear: '2nd', email: 'delta3@test.com', phone: '9876543245' },
        members: [{ name: 'Delta Mem 3', regNo: 'DEL24006', department: 'ACSE', academicYear: '3rd', email: 'delta3m@test.com', phone: '9876543246' }],
      },
    ];

    const concurrentResults = await Promise.all(
      concurrentPayloads.map((payload) =>
        request('/api/register', { method: 'POST', body: JSON.stringify(payload) })
      )
    );

    const ids = concurrentResults.map((r) => r.json?.teamId);
    const uniqueIds = new Set(ids);
    const all201 = concurrentResults.every((r) => r.status === 201);
    const hasDuplicates = uniqueIds.size !== ids.length;

    const passed = all201 && !hasDuplicates && ids.includes('TEAM-004') && ids.includes('TEAM-005') && ids.includes('TEAM-006');
    recordTest(
      '7. Concurrent registrations cannot generate duplicate IDs',
      passed,
      `Allocated IDs: [${ids.join(', ')}], Unique Count: ${uniqueIds.size} / ${ids.length}`
    );
  } catch (err) {
    recordTest('7. Concurrent registrations verification', false, err.message);
  }

  // 8. IDs and Sequence remain stable and permanent on disk
  try {
    const rawSeq = fs.readFileSync(seqPath, 'utf-8');
    const seqData = JSON.parse(rawSeq);
    const rawRegs = fs.readFileSync(jsonPath, 'utf-8');
    const diskRegs = JSON.parse(rawRegs);

    const passed =
      seqData.lastTeamNumber === 6 &&
      diskRegs.length === 6 &&
      diskRegs[0].teamId === 'TEAM-001' &&
      diskRegs[1].teamId === 'TEAM-002' &&
      diskRegs[2].teamId === 'TEAM-003';

    recordTest(
      '8. Permanent disk ledger and sequence stability',
      passed,
      `sequence.json lastTeamNumber: ${seqData.lastTeamNumber}, disk records: ${diskRegs.length}`
    );
  } catch (err) {
    recordTest('8. Disk ledger stability', false, err.message);
  }

  // 9. Existing registration form, admin login, and WhatsApp success URL work
  try {
    const lastTeam = team1Res?.json;
    const passed =
      lastTeam?.whatsAppUrl === 'https://chat.whatsapp.com/GFTQNtdirjTEtnRSnbIU7n?s=cl&p=a&mlu=4&ilr=4' &&
      !!adminToken;
    recordTest(
      '9. Registration rules, Admin Authentication, and Official WhatsApp Group intact',
      passed,
      `WhatsApp URL: "${lastTeam?.whatsAppUrl}"`
    );
  } catch (err) {
    recordTest('9. Form and WhatsApp intact', false, err.message);
  }

  // 10. Rollback test records so production database is left with 0 teams, 0 members
  try {
    const resetRes = await request('/api/admin/reset-database', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const finalRaw = fs.readFileSync(jsonPath, 'utf-8');
    const finalRecords = JSON.parse(finalRaw);
    const finalSeq = JSON.parse(fs.readFileSync(seqPath, 'utf-8'));

    const passed =
      resetRes.status === 200 &&
      finalRecords.length === 0 &&
      finalSeq.lastTeamNumber === 0;

    recordTest(
      '10. Test record rollback: Production database returned to clean slate (0 teams, ready for TEAM-001)',
      passed,
      `Final Database Count: ${finalRecords.length}, Final sequence: ${finalSeq.lastTeamNumber}`
    );
  } catch (err) {
    recordTest('10. Test record rollback', false, err.message);
  }

  console.log('\n====================================================');
  const allPassed = testResults.every((t) => t.passed);
  console.log(`  RESULT: ${testResults.filter((t) => t.passed).length} / ${testResults.length} TESTS PASSED`);
  console.log(`  OVERALL: ${allPassed ? 'ALL VERIFICATIONS SUCCESSFUL (100% PASS)' : 'SOME TESTS FAILED'}`);
  console.log('====================================================\n');

  return allPassed;
}

runVerification().then((success) => {
  process.exit(success ? 0 : 1);
});
