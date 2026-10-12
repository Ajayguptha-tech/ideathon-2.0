async function runTests() {
  console.log('=== STARTING BACKEND VALIDATION & REGISTRATION TESTS ===\n');

  // Test 1: Invalid payload (empty)
  console.log('--- Test 1: Empty Payload ---');
  let res = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  let data = await res.json();
  console.log('Status:', res.status, 'Errors:', Object.keys(data.errors || {}));
  if (res.status === 400 && data.errors?.teamName) {
    console.log('✔ Test 1 PASSED: Empty payload properly rejected with validation errors.\n');
  } else {
    console.error('❌ Test 1 FAILED');
  }

  // Test 2: Ineligible department and year
  console.log('--- Test 2: Ineligible Department and Year ---');
  res = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamName: 'InvalidDeptTeam',
      teamSize: 2,
      lead: {
        name: 'John Doe',
        regNo: '221FA04001',
        department: 'MECH', // Ineligible!
        academicYear: '1st', // Ineligible!
        email: 'john@example.com',
        phone: '9876543210',
      },
      members: [
        {
          name: 'Jane Smith',
          regNo: '221FA04002',
          department: 'CIVIL', // Ineligible!
          academicYear: '5th', // Ineligible!
          email: 'jane@example.com',
          phone: '9876543211',
        },
      ],
    }),
  });
  data = await res.json();
  console.log('Status:', res.status, 'Errors:', data.errors);
  if (data.errors['lead.department'] && data.errors['lead.academicYear']) {
    console.log('✔ Test 2 PASSED: Ineligible department and year properly rejected.\n');
  } else {
    console.error('❌ Test 2 FAILED');
  }

  // Test 3: Duplicate student within the same team
  console.log('--- Test 3: Intra-team duplicate check ---');
  res = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamName: 'DuplicateTestTeam',
      teamSize: 2,
      lead: {
        name: 'Same Person',
        regNo: '221FA04099',
        department: 'CSE',
        academicYear: '3rd',
        email: 'same@example.com',
        phone: '9876543210',
      },
      members: [
        {
          name: 'Same Person Again',
          regNo: '221FA04099', // Duplicate!
          department: 'CSE',
          academicYear: '3rd',
          email: 'same@example.com', // Duplicate!
          phone: '9876543210', // Duplicate!
        },
      ],
    }),
  });
  data = await res.json();
  console.log('Status:', res.status, 'Errors:', data.errors);
  if (data.errors?.duplicateReg) {
    console.log('✔ Test 3 PASSED: Intra-team duplicate detected and rejected.\n');
  } else {
    console.error('❌ Test 3 FAILED');
  }

  // Test 4: Honeypot spam bot detection
  console.log('--- Test 4: Bot Honeypot rejection ---');
  res = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamName: 'SpamBotTeam',
      teamSize: 2,
      honeypot: 'http://spam-link.com',
      lead: {
        name: 'Spam Bot',
        regNo: '221FA04999',
        department: 'CSE',
        academicYear: '3rd',
        email: 'spam@bot.com',
        phone: '9876543210',
      },
      members: [
        {
          name: 'Spam Bot 2',
          regNo: '221FA04998',
          department: 'CSE',
          academicYear: '3rd',
          email: 'spam2@bot.com',
          phone: '9876543211',
        },
      ],
    }),
  });
  data = await res.json();
  console.log('Status:', res.status, 'Message:', data.message);
  if (res.status === 400 && data.message === 'Invalid submission') {
    console.log('✔ Test 4 PASSED: Honeypot bot submission successfully caught and blocked.\n');
  } else {
    console.error('❌ Test 4 FAILED');
  }

  // Test 5: Valid registration (Team of 3)
  console.log('--- Test 5: Valid Team of 3 Registration ---');
  res = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamName: 'Quantum Coders',
      teamSize: 3,
      lead: {
        name: 'Arjun Verma',
        regNo: '221FA04101',
        department: 'CSE',
        academicYear: '3rd',
        email: 'arjun.test@gmail.com',
        phone: '9876501234',
      },
      members: [
        {
          name: 'Pooja Reddy',
          regNo: '221FA04102',
          department: 'ACSE',
          academicYear: '3rd',
          email: 'pooja.test@gmail.com',
          phone: '9876501235',
        },
        {
          name: 'Kiran Kumar',
          regNo: '231FA04201',
          department: 'IT',
          academicYear: '2nd',
          email: 'kiran.test@gmail.com',
          phone: '9876501236',
        },
      ],
    }),
  });
  data = await res.json();
  console.log('Status:', res.status, 'Response:', data);
  if (res.status === 201 && data.success && data.registrationId) {
    console.log(`✔ Test 5 PASSED: Team registered successfully with ID: ${data.registrationId}\n`);
  } else {
    console.error('❌ Test 5 FAILED');
  }

  // Test 6: Cross-team duplicate check (attempt to register Pooja again in a new team)
  console.log('--- Test 6: Cross-team duplicate student rejection ---');
  res = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamName: 'Another New Team',
      teamSize: 2,
      lead: {
        name: 'Pooja Reddy',
        regNo: '221FA04102', // Already registered in Quantum Coders!
        department: 'ACSE',
        academicYear: '3rd',
        email: 'pooja.test@gmail.com',
        phone: '9876501235',
      },
      members: [
        {
          name: 'New Student',
          regNo: '221FA04300',
          department: 'CSE',
          academicYear: '4th',
          email: 'newstudent@gmail.com',
          phone: '9876509999',
        },
      ],
    }),
  });
  data = await res.json();
  console.log('Status:', res.status, 'Errors:', data.errors);
  if (res.status === 409 && data.errors?.crossDuplicate) {
    console.log('✔ Test 6 PASSED: Cross-team student duplicate detected and rejected with message:', data.errors.crossDuplicate, '\n');
  } else {
    console.error('❌ Test 6 FAILED');
  }

  console.log('=== ALL BACKEND TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch(console.error);
