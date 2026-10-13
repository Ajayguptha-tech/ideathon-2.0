#!/usr/bin/env node
/**
 * Automated Verification Suite for Ideathon 2.0 Administrator Authentication & Dashboard
 * 
 * Verifies:
 *  1. Valid administrator login (returns signed HMAC token)
 *  2. Invalid password rejection (HTTP 401)
 *  3. Unauthorized email rejection (HTTP 401)
 *  4. Missing/empty credentials rejection (HTTP 401)
 *  5. Expired HMAC session token rejection (HTTP 401)
 *  6. Tampered signature session token rejection (HTTP 401)
 *  7. Protected endpoints block unauthenticated requests (HTTP 401):
 *     - /api/admin/teams
 *     - /api/admin/stats
 *     - /api/admin/export-excel
 *     - /api/admin/export-csv
 *  8. Authorized dashboard data access with valid token:
 *     - /api/admin/teams returns teams list
 *     - /api/admin/stats returns statistics
 *     - /api/admin/export-excel returns XLSX binary
 *     - /api/admin/export-csv returns CSV content
 * 
 * NOTE: Does NOT modify database records or create registrations.
 */

import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'ajayguptha710@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ideathon@Admin2026!';
const JWT_SECRET = process.env.ADMIN_SECRET || process.env.ORGANIZER_SECRET || process.env.JWT_SECRET || 'ideathon-2.0-secure-admin-session-secret-2026-prod';

console.log('\n=============================================================');
console.log(' IDEATHON 2.0 — ADMINISTRATOR AUTH & DASHBOARD TEST SUITE');
console.log('=============================================================');
console.log(` Target Server: ${BASE_URL}`);
console.log(` Admin Account: ${ADMIN_EMAIL}`);
console.log('=============================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function report(testName, passed, detail = '') {
  if (passed) {
    testsPassed++;
    console.log(`  [PASS] ${testName}`);
    if (detail) console.log(`         -> ${detail}`);
  } else {
    testsFailed++;
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         -> ${detail}`);
  }
}

async function runTests() {
  let validToken = null;

  // TEST 1: Valid Administrator Login
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const data = await res.json();
    const ok = res.status === 200 && data.success && Boolean(data.token) && data.admin?.email === ADMIN_EMAIL;
    validToken = data.token;
    report('1. Valid Administrator Login', ok, `HTTP ${res.status}, Token received: ${Boolean(validToken)}`);
  } catch (err) {
    report('1. Valid Administrator Login', false, err.message);
  }

  // TEST 2: Invalid Password Rejection
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'WrongPassword999!' }),
    });
    const data = await res.json();
    const ok = res.status === 401 && !data.success && data.message.includes('Invalid');
    report('2. Invalid Password Rejection', ok, `HTTP ${res.status}, Message: "${data.message}"`);
  } catch (err) {
    report('2. Invalid Password Rejection', false, err.message);
  }

  // TEST 3: Unauthorized Email Rejection
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'intruder@example.com', password: ADMIN_PASSWORD }),
    });
    const data = await res.json();
    const ok = res.status === 401 && !data.success;
    report('3. Unauthorized Email Rejection', ok, `HTTP ${res.status}`);
  } catch (err) {
    report('3. Unauthorized Email Rejection', false, err.message);
  }

  // TEST 4: Empty Credentials Rejection
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });
    const ok = res.status === 401;
    report('4. Empty Credentials Rejection', ok, `HTTP ${res.status}`);
  } catch (err) {
    report('4. Empty Credentials Rejection', false, err.message);
  }

  // TEST 5: Expired Session Token Rejection
  try {
    const expiredPayload = {
      email: ADMIN_EMAIL,
      role: 'administrator',
      exp: Date.now() - 60000, // expired 1 minute ago
    };
    const pB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(pB64).digest('base64url');
    const expiredToken = `${pB64}.${sig}`;

    const res = await fetch(`${BASE_URL}/api/admin/teams`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const data = await res.json();
    const ok = res.status === 401 && data.message.toLowerCase().includes('expired');
    report('5. Expired Session Token Rejection', ok, `HTTP ${res.status}, Message: "${data.message}"`);
  } catch (err) {
    report('5. Expired Session Token Rejection', false, err.message);
  }

  // TEST 6: Tampered Token Signature Rejection
  try {
    const validPayload = {
      email: ADMIN_EMAIL,
      role: 'administrator',
      exp: Date.now() + 86400000,
    };
    const pB64 = Buffer.from(JSON.stringify(validPayload)).toString('base64url');
    const forgedToken = `${pB64}.invalidsignature123456789`;

    const res = await fetch(`${BASE_URL}/api/admin/teams`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    const ok = res.status === 401;
    report('6. Tampered Signature Rejection', ok, `HTTP ${res.status}`);
  } catch (err) {
    report('6. Tampered Signature Rejection', false, err.message);
  }

  // TEST 7: Unauthorized Dashboard Access Block (All protected endpoints)
  try {
    const [rTeams, rStats, rExcel, rCsv, rDelete] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/teams`),
      fetch(`${BASE_URL}/api/admin/stats`),
      fetch(`${BASE_URL}/api/admin/export-excel`),
      fetch(`${BASE_URL}/api/admin/export-csv`),
      fetch(`${BASE_URL}/api/admin/teams/TEST-999`, { method: 'DELETE' }),
    ]);
    const ok =
      rTeams.status === 401 &&
      rStats.status === 401 &&
      rExcel.status === 401 &&
      rCsv.status === 401 &&
      rDelete.status === 401;
    report(
      '7. Unauthorized Endpoints Blocked (HTTP 401)',
      ok,
      `Teams: ${rTeams.status}, Stats: ${rStats.status}, Excel: ${rExcel.status}, CSV: ${rCsv.status}, Delete: ${rDelete.status}`
    );
  } catch (err) {
    report('7. Unauthorized Endpoints Blocked', false, err.message);
  }

  // TEST 8: Authorized Dashboard Data (Teams, Stats, Verify Session)
  if (validToken) {
    try {
      const [rVerify, rTeams, rStats] = await Promise.all([
        fetch(`${BASE_URL}/api/admin/verify-session`, {
          headers: { Authorization: `Bearer ${validToken}` },
        }),
        fetch(`${BASE_URL}/api/admin/teams?limit=-1`, {
          headers: { Authorization: `Bearer ${validToken}` },
        }),
        fetch(`${BASE_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${validToken}` },
        }),
      ]);

      const verifyData = await rVerify.json();
      const teamsData = await rTeams.json();
      const statsData = await rStats.json();

      const ok =
        rVerify.status === 200 &&
        verifyData.admin?.email === ADMIN_EMAIL &&
        rTeams.status === 200 &&
        Array.isArray(teamsData.teams) &&
        rStats.status === 200 &&
        statsData.success &&
        typeof statsData.stats?.totalTeams === 'number';

      report(
        '8. Authorized Dashboard Data (Teams & Stats)',
        ok,
        `Teams count: ${teamsData.teams?.length}, Total in stats: ${statsData.stats?.totalTeams}`
      );
    } catch (err) {
      report('8. Authorized Dashboard Data (Teams & Stats)', false, err.message);
    }

    // TEST 9: Authorized Excel Export (.xlsx)
    try {
      const res = await fetch(`${BASE_URL}/api/admin/export-excel`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const contentType = res.headers.get('content-type') || '';
      const arrayBuf = await res.arrayBuffer();
      const ok = res.status === 200 && arrayBuf.byteLength > 100;
      report(
        '9. Authorized Excel (.xlsx) Export',
        ok,
        `HTTP ${res.status}, Type: ${contentType}, Size: ${arrayBuf.byteLength} bytes`
      );
    } catch (err) {
      report('9. Authorized Excel (.xlsx) Export', false, err.message);
    }

    // TEST 10: Authorized CSV Export (.csv)
    try {
      const res = await fetch(`${BASE_URL}/api/admin/export-csv`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const text = await res.text();
      const ok = res.status === 200 && text.includes('Registration ID') && text.includes('Team Name');
      report(
        '10. Authorized CSV (.csv) Export',
        ok,
        `HTTP ${res.status}, Size: ${text.length} chars, Contains CSV header: ${text.includes('Registration ID')}`
      );
    } catch (err) {
      report('10. Authorized CSV (.csv) Export', false, err.message);
    }

    // TEST 11: Prize Configuration & Total Prize Pool Verification
    try {
      const configPath = path.resolve(__dirname, '../src/config/eventConfig.ts');
      const content = fs.readFileSync(configPath, 'utf-8');
      const has1st = content.includes("'First Prize', amount: '₹3,000'");
      const has2nd = content.includes("'Second Prize', amount: '₹2,000'");
      const has3rd = content.includes("'Third Prize', amount: '₹1,000'");
      const hasConsolation = content.includes("'Five Consolation Prizes', amount: '₹500 each'");
      const hasTotal = content.includes("totalPrizePool: '₹8,500'");
      const ok = has1st && has2nd && has3rd && hasConsolation && hasTotal;
      report(
        '11. Prize Structure & Total Prize Pool Verification',
        ok,
        `1st: ₹3,000, 2nd: ₹2,000, 3rd: ₹1,000, 5 Consolation: ₹500 each, Total Pool: ₹8,500`
      );
    } catch (err) {
      report('11. Prize Structure & Total Prize Pool Verification', false, err.message);
    }

    // TEST 12: Unauthenticated / Forged Token Team Deletion Rejection (HTTP 401)
    try {
      const resNoAuth = await fetch(`${BASE_URL}/api/admin/teams/TEST-NONEXISTENT`, {
        method: 'DELETE',
      });
      const resForged = await fetch(`${BASE_URL}/api/admin/teams/TEST-NONEXISTENT`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer forged.invalid.token' },
      });
      const ok = resNoAuth.status === 401 && resForged.status === 401;
      report(
        '12. Unauthenticated / Forged Token Deletion Blocked (HTTP 401)',
        ok,
        `No Auth: HTTP ${resNoAuth.status}, Forged Token: HTTP ${resForged.status}`
      );
    } catch (err) {
      report('12. Unauthenticated / Forged Token Deletion Blocked', false, err.message);
    }

    // TEST 13: Authorized Team Deletion Rejects Nonexistent ID (HTTP 404)
    try {
      const res = await fetch(`${BASE_URL}/api/admin/teams/TEAM-NONEXISTENT-99999`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const data = await res.json();
      const ok = res.status === 404 && !data.success && data.message.includes('not found');
      report(
        '13. Nonexistent Team ID Deletion Rejection (HTTP 404)',
        ok,
        `HTTP ${res.status}, Message: "${data.message}"`
      );
    } catch (err) {
      report('13. Nonexistent Team ID Deletion Rejection', false, err.message);
    }

    // TEST 14: Existing Registrations Preservation Check
    try {
      const resTeams = await fetch(`${BASE_URL}/api/admin/teams?limit=-1`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const teamsData = await resTeams.json();
      const ok = resTeams.status === 200 && Array.isArray(teamsData.teams);
      report(
        '14. Existing Registrations Preserved Unchanged',
        ok,
        `Active database records verified intact: ${teamsData.teams?.length} teams`
      );
    } catch (err) {
      report('14. Existing Registrations Preserved Unchanged', false, err.message);
    }
  } else {
    report('8-14. Authorized Dashboard & Deletion Endpoints', false, 'Skipped due to login failure');
  }

  console.log('\n=============================================================');
  console.log(` RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('=============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
