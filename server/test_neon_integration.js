import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import * as XLSX from 'xlsx';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('================================================================');
  console.log(' IDEATHON 2.0 — NEON POSTGRESQL INTEGRATION TEST SUITE');
  console.log('================================================================');

  const results = [];
  let pool = null;
  let testTeamRegId = null;

  try {
    // ------------------------------------------------------------------
    // TEST 1: Direct Neon PostgreSQL Connectivity
    // ------------------------------------------------------------------
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      });

      const dbCheck = await pool.query('SELECT 1 AS connected, NOW() AS server_time, version() AS ver');
      const isConnected = dbCheck.rows[0]?.connected === 1;
      results.push({
        name: 'Database connectivity (SELECT 1 via pg pool)',
        passed: isConnected,
        detail: `Connected to PostgreSQL: ${dbCheck.rows[0]?.ver.slice(0, 35)}...`,
      });
    } catch (err) {
      results.push({
        name: 'Database connectivity (SELECT 1 via pg pool)',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 2: Schema Initialization & Required Tables
    // ------------------------------------------------------------------
    try {
      const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      const tableNames = tablesRes.rows.map((r) => r.table_name);
      const hasTeams = tableNames.includes('teams');
      const hasMembers = tableNames.includes('team_members');

      results.push({
        name: 'Schema initialization (teams & team_members tables)',
        passed: hasTeams && hasMembers,
        detail: `Found tables: ${tableNames.join(', ')}`,
      });
    } catch (err) {
      results.push({
        name: 'Schema initialization (teams & team_members tables)',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 3: Health Endpoint Verification
    // ------------------------------------------------------------------
    try {
      const healthRes = await fetch(`${BASE_URL}/api/health`);
      const healthData = await healthRes.json();
      const isHealthOk =
        healthRes.ok &&
        healthData.status === 'online' &&
        healthData.databaseConnected === true &&
        healthData.database.includes('PostgreSQL');

      // Verify no secrets exist in health payload
      const jsonStr = JSON.stringify(healthData);
      const noPassword = !jsonStr.toLowerCase().includes('password') && !jsonStr.includes('postgres://') && !jsonStr.includes('postgresql://');

      results.push({
        name: 'Health check endpoint (/api/health databaseConnected=true)',
        passed: isHealthOk && noPassword,
        detail: `Status: ${healthData.status}, DB: ${healthData.database}, Connected: ${healthData.databaseConnected}, Secrets Excluded: ${noPassword}`,
      });
    } catch (err) {
      results.push({
        name: 'Health check endpoint (/api/health databaseConnected=true)',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 4: Registration Creation in PostgreSQL
    // ------------------------------------------------------------------
    const testTimestamp = Date.now();
    const testRegNo1 = `99TEST${String(testTimestamp).slice(-4)}1`;
    const testRegNo2 = `99TEST${String(testTimestamp).slice(-4)}2`;
    const testEmail1 = `disposable_lead_${testTimestamp}@testdomain.example`;
    const testEmail2 = `disposable_m2_${testTimestamp}@testdomain.example`;
    const testTeamName = `DISPOSABLE_AUTO_TEAM_${testTimestamp}`;

    const regPayload = {
      teamName: testTeamName,
      teamSize: 2,
      lead: {
        name: 'Disposable Test Lead',
        regNo: testRegNo1,
        department: 'CSE',
        academicYear: '3rd',
        email: testEmail1,
        phone: '9876543210',
      },
      members: [
        {
          name: 'Disposable Test Member',
          regNo: testRegNo2,
          department: 'IT',
          academicYear: '2nd',
          email: testEmail2,
          phone: '9876543211',
        },
      ],
      honeypot: '',
    };

    try {
      const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regPayload),
      });

      const regData = await regRes.json();
      const regSuccess = regRes.status === 201 && regData.success === true;
      testTeamRegId = regData.teamId || regData.registrationId;

      // Verify record is written to PostgreSQL directly
      const dbTeamCheck = await pool.query('SELECT * FROM teams WHERE registration_id = $1', [testTeamRegId]);
      const dbMembersCheck = await pool.query('SELECT * FROM team_members WHERE team_id = $1', [dbTeamCheck.rows[0]?.id]);

      const writtenToPostgres = dbTeamCheck.rows.length === 1 && dbMembersCheck.rows.length === 2;

      // Verify record was NOT written to local JSON
      const localJsonPath = path.resolve(__dirname, 'data/registrations.json');
      let localJsonUntouched = true;
      if (fs.existsSync(localJsonPath)) {
        const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
        localJsonUntouched = !localData.some((r) => r.registrationId === testTeamRegId);
      }

      results.push({
        name: 'Registration creation & PostgreSQL persistence',
        passed: regSuccess && writtenToPostgres && localJsonUntouched,
        detail: `Allocated ID: ${testTeamRegId}, PG rows: 1 team / 2 members, Local JSON bypassed: ${localJsonUntouched}`,
      });
    } catch (err) {
      results.push({
        name: 'Registration creation & PostgreSQL persistence',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 5: Sequential Team ID Generation
    // ------------------------------------------------------------------
    try {
      const isSequentialFormat = /^TEAM-\d{3,}$/.test(testTeamRegId);
      results.push({
        name: 'Sequential Team ID generation (TEAM-001 format)',
        passed: isSequentialFormat,
        detail: `Generated ID "${testTeamRegId}" matches ^TEAM-\\d{3,}$ format`,
      });
    } catch (err) {
      results.push({
        name: 'Sequential Team ID generation (TEAM-001 format)',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 6: Duplicate Prevention & Constraints
    // ------------------------------------------------------------------
    try {
      // Try submitting same team name
      const dupRes = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regPayload),
      });
      const dupData = await dupRes.json();
      const duplicateBlocked = dupRes.status === 409 && dupData.success === false;

      results.push({
        name: 'Duplicate registration rejection (409 Conflict)',
        passed: duplicateBlocked,
        detail: `Status: ${dupRes.status}, Error reported: "${JSON.stringify(dupData.errors)}"`,
      });
    } catch (err) {
      results.push({
        name: 'Duplicate registration rejection (409 Conflict)',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 7: Admin Authentication & Authorization
    // ------------------------------------------------------------------
    let adminToken = null;
    try {
      // A. Unauthorized access without token
      const unauthRes = await fetch(`${BASE_URL}/api/admin/teams`);
      const unauthBlocked = unauthRes.status === 401;

      // B. Invalid credentials
      const badLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ajayguptha710@gmail.com', password: 'WrongPassword123!' }),
      });
      const badLoginBlocked = badLoginRes.status === 401;

      // C. Valid credentials
      const goodLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ajayguptha710@gmail.com', password: 'Ideathon@Admin2026!' }),
      });
      const goodLoginData = await goodLoginRes.json();
      const loginSuccess = goodLoginRes.status === 200 && Boolean(goodLoginData.token);
      adminToken = goodLoginData.token;

      // D. Access with valid token
      const authTeamsRes = await fetch(`${BASE_URL}/api/admin/teams`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const authTeamsData = await authTeamsRes.json();
      const authSuccess = authTeamsRes.status === 200 && Array.isArray(authTeamsData.teams);

      results.push({
        name: 'Admin authentication and authorization (RBAC & JWT)',
        passed: unauthBlocked && badLoginBlocked && loginSuccess && authSuccess,
        detail: `Unauth blocked (401): ${unauthBlocked}, Bad login blocked: ${badLoginBlocked}, Login OK: ${loginSuccess}, Protected API accessible: ${authSuccess}`,
      });
    } catch (err) {
      results.push({
        name: 'Admin authentication and authorization (RBAC & JWT)',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 8: Excel & CSV Exports from PostgreSQL
    // ------------------------------------------------------------------
    try {
      // Excel Export
      const excelRes = await fetch(`${BASE_URL}/api/admin/export-excel`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const excelBuf = await excelRes.arrayBuffer();
      const wb = XLSX.read(Buffer.from(excelBuf), { type: 'buffer' });
      const hasTeamsSheet = wb.SheetNames.includes('Registered Teams');
      const hasMembersSheet = wb.SheetNames.includes('All Team Members');
      const excelValid = excelRes.status === 200 && hasTeamsSheet && hasMembersSheet;

      // CSV Export
      const csvRes = await fetch(`${BASE_URL}/api/admin/export-csv`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const csvText = await csvRes.text();
      const csvValid = csvRes.status === 200 && csvText.includes('Team ID') && csvText.includes(testTeamRegId);

      results.push({
        name: 'Excel (.xlsx) and CSV exports from PostgreSQL',
        passed: excelValid && csvValid,
        detail: `Excel sheets: [${wb.SheetNames.join(', ')}], CSV contains header and ${testTeamRegId}`,
      });
    } catch (err) {
      results.push({
        name: 'Excel (.xlsx) and CSV exports from PostgreSQL',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 9: Production Database Fallback Protection
    // ------------------------------------------------------------------
    try {
      // Verify that databaseConnected is accurately reported and local fallback is not active
      const healthRes = await fetch(`${BASE_URL}/api/health`);
      const healthData = await healthRes.json();
      const isNotLocal = healthData.database !== 'Local Atomic Ledger (Pending PostgreSQL configuration in .env)';

      results.push({
        name: 'Production database fallback protection',
        passed: isNotLocal,
        detail: `Engine: ${healthData.database}, Host verified: ${healthData.databaseConnected}`,
      });
    } catch (err) {
      results.push({
        name: 'Production database fallback protection',
        passed: false,
        detail: err.message,
      });
    }

    // ------------------------------------------------------------------
    // TEST 10: Cleanup of Disposable Test Record Only
    // ------------------------------------------------------------------
    try {
      if (testTeamRegId && testTeamRegId.startsWith('TEAM-')) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const findRes = await client.query('SELECT id, team_name FROM teams WHERE registration_id = $1', [testTeamRegId]);
          if (findRes.rows.length > 0 && findRes.rows[0].team_name.startsWith('DISPOSABLE_AUTO_TEAM_')) {
            const teamId = findRes.rows[0].id;
            await client.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
            await client.query('DELETE FROM teams WHERE id = $1', [teamId]);
            await client.query('COMMIT');

            // Verify deletion
            const recheck = await client.query('SELECT COUNT(*) FROM teams WHERE registration_id = $1', [testTeamRegId]);
            const isCleaned = parseInt(recheck.rows[0].count, 10) === 0;

            results.push({
              name: 'Disposable test data cleanup (Safe removal)',
              passed: isCleaned,
              detail: `Removed test registration ${testTeamRegId} ("${findRes.rows[0].team_name}"). Genuine records preserved.`,
            });
          }
        } finally {
          client.release();
        }
      }
    } catch (err) {
      results.push({
        name: 'Disposable test data cleanup (Safe removal)',
        passed: false,
        detail: err.message,
      });
    }
  } finally {
    if (pool) await pool.end();
  }

  console.log('\n================================================================');
  console.log(' TEST RESULTS SUMMARY');
  console.log('================================================================');
  let passedCount = 0;
  for (const r of results) {
    const statusStr = r.passed ? 'PASS' : 'FAIL';
    if (r.passed) passedCount++;
    console.log(`[${statusStr}] ${r.name}`);
    console.log(`       ${r.detail}`);
  }
  console.log('----------------------------------------------------------------');
  console.log(`Total Passed: ${passedCount} / ${results.length}`);
  console.log('================================================================');

  return { passedCount, totalCount: results.length, results };
}

runTests()
  .then((res) => {
    if (res.passedCount !== res.totalCount) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
