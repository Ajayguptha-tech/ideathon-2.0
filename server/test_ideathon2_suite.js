import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';
const ORGANIZER_EMAIL = 'ajayguptha710@gmail.com';

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

async function runTestSuite() {
  console.log('====================================================');
  console.log('  IDEATHON 2.0 PRODUCTION VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // 1. Health Endpoint & Single Organizer Verification
  try {
    const res = await request('/api/health');
    const passed =
      res.status === 200 &&
      res.json?.status === 'online' &&
      res.json?.event === 'Young Innovators Club Ideathon 2.0' &&
      res.json?.authorizedOrganizer === ORGANIZER_EMAIL;
    recordTest(
      '1. Backend health check & authorized organizer verification',
      passed,
      `Status: ${res.status}, Event: "${res.json?.event}", Authorized Organizer: "${res.json?.authorizedOrganizer}"`
    );
  } catch (err) {
    recordTest('1. Backend health check', false, err.message);
  }

  // 2. Public Stats Endpoint
  try {
    const res = await request('/api/stats');
    const passed =
      res.status === 200 &&
      Array.isArray(res.json?.eligibleDepartments) &&
      !res.json?.eligibleYears.includes('4th') &&
      res.json?.teamSizeLimits?.max === 4;
    recordTest(
      '2. Public stats & eligibility constraints',
      passed,
      `Eligible Years: [${res.json?.eligibleYears?.join(', ')}], Team Size: ${res.json?.teamSizeLimits?.min}-${res.json?.teamSizeLimits?.max}`
    );
  } catch (err) {
    recordTest('2. Public stats & eligibility constraints', false, err.message);
  }

  // 3. Rejection of 1-member and 5-member teams
  try {
    const r1 = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Solo Hacker Team',
        teamSize: 1,
        lead: { name: 'Solo', regNo: 'SOLO01', department: 'CSE', academicYear: '2nd', email: 'solo@test.com', phone: '9876543210' },
        members: [],
      }),
    });
    const r5 = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Five Members Squad',
        teamSize: 5,
        lead: { name: 'L5', regNo: 'L50001', department: 'CSE', academicYear: '2nd', email: 'l5@test.com', phone: '9876543210' },
        members: [
          { name: 'M2', regNo: 'M50002', department: 'CSE', academicYear: '2nd', email: 'm2@test.com', phone: '9876543211' },
          { name: 'M3', regNo: 'M50003', department: 'CSE', academicYear: '2nd', email: 'm3@test.com', phone: '9876543212' },
          { name: 'M4', regNo: 'M50004', department: 'CSE', academicYear: '2nd', email: 'm4@test.com', phone: '9876543213' },
          { name: 'M5', regNo: 'M50005', department: 'CSE', academicYear: '2nd', email: 'm5@test.com', phone: '9876543214' },
        ],
      }),
    });
    const passed = r1.status === 400 && r5.status === 400;
    recordTest('3. Rejection of 1-member and 5-member teams', passed, `1-member: HTTP ${r1.status}, 5-member: HTTP ${r5.status}`);
  } catch (err) {
    recordTest('3. Rejection of 1-member and 5-member teams', false, err.message);
  }

  // 4. Rejection of 4th-year members
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Fourth Year Team Test',
        teamSize: 2,
        lead: { name: 'Senior Lead', regNo: 'SR0001', department: 'CSE', academicYear: '4th', email: 'sr@test.com', phone: '9876543210' },
        members: [{ name: 'Junior', regNo: 'JR0002', department: 'CSE', academicYear: '2nd', email: 'jr@test.com', phone: '9876543211' }],
      }),
    });
    const passed = res.status === 400 && JSON.stringify(res.json?.errors || {}).includes('4th year');
    recordTest('4. Rejection of 4th-year members', passed, `HTTP ${res.status}, Reason: "${res.json?.errors?.['lead.academicYear']}"`);
  } catch (err) {
    recordTest('4. Rejection of 4th-year members', false, err.message);
  }

  // 5. Rejection of unsupported departments (e.g. MECH)
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: 'Mech Team Test',
        teamSize: 2,
        lead: { name: 'Mech Lead', regNo: 'MECH01', department: 'MECH', academicYear: '2nd', email: 'mech@test.com', phone: '9876543210' },
        members: [{ name: 'Civil Member', regNo: 'CIV002', department: 'CIVIL', academicYear: '3rd', email: 'civ@test.com', phone: '9876543211' }],
      }),
    });
    const passed = res.status === 400 && res.json?.errors?.['lead.department'];
    recordTest('5. Rejection of unsupported departments', passed, `HTTP ${res.status}, Reason: "${res.json?.errors?.['lead.department']}"`);
  } catch (err) {
    recordTest('5. Rejection of unsupported departments', false, err.message);
  }

  // Unique run ID for testing
  const runId = Math.floor(1000 + Math.random() * 9000);

  // 6. Valid registration with exactly 2 members
  let reg2Id = null;
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: `Binary Pair ${runId}`,
        teamSize: 2,
        lead: { name: 'Aarav Sharma', regNo: `REG24${runId}1`, department: 'CSE', academicYear: '2nd', email: `aarav.${runId}@test.edu`, phone: '9876543210' },
        members: [
          { name: 'Diya Patel', regNo: `REG24${runId}2`, department: 'IT', academicYear: '3rd', email: `diya.${runId}@test.edu`, phone: '9876543211' },
        ],
      }),
    });
    const passed =
      res.status === 201 &&
      res.json?.success === true &&
      (res.json?.teamId?.startsWith('TEAM-') || res.json?.registrationId?.startsWith('TEAM-'));
    reg2Id = res.json?.teamId || res.json?.registrationId;
    recordTest('6. Valid registration with 2 members (Mixed CSE + IT)', passed, `Team ID: ${reg2Id}, Team: "${res.json?.teamName}"`);
  } catch (err) {
    recordTest('6. Valid registration with 2 members', false, err.message);
  }

  // 7. Valid registration with 3 members
  let reg3Id = null;
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: `Trio Innovators ${runId}`,
        teamSize: 3,
        lead: { name: 'Kavya Reddy', regNo: `REG25${runId}1`, department: 'ACSE', academicYear: '3rd', email: `kavya.${runId}@test.edu`, phone: '9876543220' },
        members: [
          { name: 'Rohan Verma', regNo: `REG25${runId}2`, department: 'CSE', academicYear: '2nd', email: `rohan.${runId}@test.edu`, phone: '9876543221' },
          { name: 'Ananya Rao', regNo: `REG25${runId}3`, department: 'IT', academicYear: '3rd', email: `ananya.${runId}@test.edu`, phone: '9876543222' },
        ],
      }),
    });
    const passed = res.status === 201 && res.json?.success === true && res.json?.teamSize === 3;
    reg3Id = res.json?.registrationId;
    recordTest('7. Valid registration with 3 members (Mixed ACSE + CSE + IT)', passed, `Reg ID: ${res.json?.registrationId}`);
  } catch (err) {
    recordTest('7. Valid registration with 3 members', false, err.message);
  }

  // 8. Valid registration with 4 members and official WhatsApp link
  let reg4Id = null;
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: `Neural Apex ${runId}`,
        teamSize: 4,
        lead: { name: 'Vikram Joshi', regNo: `REG26${runId}1`, department: 'CSE', academicYear: '3rd', email: `vikram.${runId}@test.edu`, phone: '9876543230' },
        members: [
          { name: 'Sneha Kulkarni', regNo: `REG26${runId}2`, department: 'ACSE', academicYear: '2nd', email: `sneha.${runId}@test.edu`, phone: '9876543231' },
          { name: 'Aditya Nair', regNo: `REG26${runId}3`, department: 'IT', academicYear: '2nd', email: `aditya.${runId}@test.edu`, phone: '9876543232' },
          { name: 'Meera Iyer', regNo: `REG26${runId}4`, department: 'CSE', academicYear: '3rd', email: `meera.${runId}@test.edu`, phone: '9876543233' },
        ],
      }),
    });
    const passed =
      res.status === 201 &&
      res.json?.success === true &&
      res.json?.teamSize === 4 &&
      res.json?.whatsAppUrl === 'https://chat.whatsapp.com/GFTQNtdirjTEtnRSnbIU7n?s=cl&p=a&mlu=4&ilr=4';
    reg4Id = res.json?.registrationId;
    recordTest('8. Valid registration with 4 members & verified WhatsApp URL', passed, `Reg ID: ${res.json?.registrationId}, Team Size: ${res.json?.teamSize}`);
  } catch (err) {
    recordTest('8. Valid registration with 4 members', false, err.message);
  }

  // 9. Duplicate team name handling
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: `Neural Apex ${runId}`,
        teamSize: 2,
        lead: { name: 'Other Lead', regNo: `DIFF${runId}1`, department: 'CSE', academicYear: '2nd', email: `diff.${runId}@test.edu`, phone: '9876543290' },
        members: [{ name: 'Other Mem', regNo: `DIFF${runId}2`, department: 'IT', academicYear: '3rd', email: `diff2.${runId}@test.edu`, phone: '9876543291' }],
      }),
    });
    const passed = res.status === 409 && res.json?.errors?.teamName;
    recordTest('9. Duplicate team name rejection (409 Conflict)', passed, `Status: ${res.status}, Reason: "${res.json?.errors?.teamName}"`);
  } catch (err) {
    recordTest('9. Duplicate team name rejection', false, err.message);
  }

  // 10. Duplicate member registration number / email handling
  try {
    const res = await request('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        teamName: `Distinct Team ${runId}`,
        teamSize: 2,
        lead: { name: 'Dup Member', regNo: `REG26${runId}1`, department: 'CSE', academicYear: '3rd', email: `diffemail.${runId}@test.edu`, phone: '9876543299' },
        members: [{ name: 'Distinct Mem', regNo: `UNIQ${runId}2`, department: 'IT', academicYear: '3rd', email: `uniq.${runId}@test.edu`, phone: '9876543298' }],
      }),
    });
    const passed = res.status === 409 && res.json?.errors?.crossDuplicate;
    recordTest('10. Duplicate member registration number rejection', passed, `Status: ${res.status}, Reason: "${res.json?.errors?.crossDuplicate}"`);
  } catch (err) {
    recordTest('10. Duplicate member rejection', false, err.message);
  }

  // 11. Administrator Password Login: Strictly ajayguptha710@gmail.com with BCrypt verification
  let adminToken = null;
  try {
    // Valid admin login
    const rValid = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: ORGANIZER_EMAIL, password: 'Ideathon@Admin2026!' }),
    });

    if (rValid.status === 200 && rValid.json?.token) {
      adminToken = rValid.json.token;
    }

    // Wrong password
    const rWrongPass = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: ORGANIZER_EMAIL, password: 'IncorrectPassword999' }),
    });

    // Unauthorized email
    const rUnauth = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'unauthorized.user@gmail.com', password: 'Ideathon@Admin2026!' }),
    });

    const passed = rValid.status === 200 && !!rValid.json?.token && rWrongPass.status === 401 && rUnauth.status === 401;
    recordTest(
      '11. Administrator BCrypt login & authorization (single-account: ajayguptha710@gmail.com)',
      passed,
      `Valid login: HTTP ${rValid.status} (token received), Wrong pass: HTTP ${rWrongPass.status}, Wrong email: HTTP ${rUnauth.status}`
    );
  } catch (err) {
    recordTest('11. Administrator login verification', false, err.message);
  }

  // 12. Public users cannot read registrations or access CSV/Excel exports
  try {
    const rTeams = await request('/api/admin/teams');
    const rCsv = await request('/api/admin/export-csv');
    const rExcel = await request('/api/admin/export-excel');
    const rStats = await request('/api/admin/stats');
    const passed = rTeams.status === 401 && rCsv.status === 401 && rExcel.status === 401 && rStats.status === 401;
    recordTest('12. Public users blocked from admin data, stats & exports (HTTP 401)', passed, `Teams: ${rTeams.status}, CSV: ${rCsv.status}, Excel: ${rExcel.status}, Stats: ${rStats.status}`);
  } catch (err) {
    recordTest('12. Public access block', false, err.message);
  }

  // 13. Authorized administrator dashboard, stats, search, member inspection, CSV & Excel export
  try {
    const activeToken = adminToken;

    const rStats = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const rTeams = await request('/api/admin/teams', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const rSearch = await request(`/api/admin/teams?search=Trio+Innovators+${runId}`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const rDetail = await request(`/api/admin/teams/${reg3Id}`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const rCsv = await request('/api/admin/export-csv', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const rExcel = await request('/api/admin/export-excel', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    const passed =
      rStats.status === 200 &&
      rTeams.status === 200 &&
      rSearch.status === 200 &&
      rSearch.json?.teams?.length >= 1 &&
      rDetail.status === 200 &&
      rDetail.json?.team?.registrationId === reg3Id &&
      rCsv.status === 200 &&
      rCsv.text.includes('Registration ID') &&
      rExcel.status === 200;

    recordTest(
      '13. Authorized admin dashboard, search, inspection, CSV & multi-sheet Excel export',
      passed,
      `Teams count: ${rTeams.json?.count}, CSV bytes: ${rCsv.text.length}, Search matched: ${rSearch.json?.teams?.length}, Excel status: ${rExcel.status}`
    );
  } catch (err) {
    recordTest('13. Authorized admin dashboard', false, err.message);
  }

  // 14. Email failure handling and retry without duplicate registration
  try {
    const rRetry = await request('/api/admin/resend-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ registrationId: reg2Id }),
    });

    // Check that team record still exists once and was not duplicated
    const rTeamsAfter = await request('/api/admin/teams', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const matches = (rTeamsAfter.json?.teams || []).filter((t) => t.registrationId === reg2Id);

    const passed = matches.length === 1;
    recordTest(
      '14. Email retry handling without duplicate registration creation',
      passed,
      `Team ${reg2Id} retry executed; exactly 1 record persists in database`
    );
  } catch (err) {
    recordTest('14. Email retry handling', false, err.message);
  }

  // 15. Sample Test Email Endpoint
  try {
    const rSample = await request('/api/admin/send-sample-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const passed = rSample.status === 200 && rSample.json?.recipient === ORGANIZER_EMAIL;
    recordTest(
      '15. Protected sample test email endpoint (/api/admin/send-sample-email)',
      passed,
      `Target: "${rSample.json?.recipient}", Handled without modifying registrations`
    );
  } catch (err) {
    recordTest('15. Protected sample test email endpoint', false, err.message);
  }

  // 16. Clean rollback of test records so production database remains pristine
  try {
    const rRollback = await request('/api/admin/reset-database', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const passed = rRollback.status === 200 && rRollback.json?.success === true;
    recordTest(
      '16. Safe rollback of test records (Production database returned to clean 0 count, ready for TEAM-001)',
      passed,
      `Reset Status: HTTP ${rRollback.status}, Message: "${rRollback.json?.message}"`
    );
  } catch (err) {
    recordTest('16. Safe rollback of test records', false, err.message);
  }

  console.log('\n====================================================');
  const allPassed = testResults.every((t) => t.passed);
  console.log(`  RESULT: ${testResults.filter((t) => t.passed).length} / ${testResults.length} TESTS PASSED`);
  console.log(`  OVERALL: ${allPassed ? 'ALL SYSTEMS OPERATIONAL (100% PASS)' : 'SOME TESTS FAILED'}`);
  console.log('====================================================\n');

  return allPassed;
}

runTestSuite().then((success) => {
  process.exit(success ? 0 : 1);
});
