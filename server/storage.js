import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const DATA_DIR = config.dataDir;
const JSON_FILE = path.join(DATA_DIR, 'registrations.json');
const CSV_FILE = path.join(DATA_DIR, 'registrations.csv');
const SEQUENCE_FILE = path.join(DATA_DIR, 'sequence.json');

// In-process lock to serialize concurrent submissions
let writeLock = Promise.resolve();

export const CSV_HEADERS = [
  'Team ID',
  'Registration ID',
  'Submission Timestamp',
  'Team Name',
  'Team Size',
  'Lead Name',
  'Lead Reg No',
  'Lead Department',
  'Lead Academic Year',
  'Lead Email',
  'Lead Phone',
  'Member 2 Name',
  'Member 2 Reg No',
  'Member 2 Department',
  'Member 2 Academic Year',
  'Member 2 Email',
  'Member 2 Phone',
  'Member 3 Name',
  'Member 3 Reg No',
  'Member 3 Department',
  'Member 3 Academic Year',
  'Member 3 Email',
  'Member 3 Phone',
  'Member 4 Name',
  'Member 4 Reg No',
  'Member 4 Department',
  'Member 4 Academic Year',
  'Member 4 Email',
  'Member 4 Phone',
  'Status',
  'Email Sent',
];

export function formatTeamId(num) {
  return `TEAM-${String(num).padStart(3, '0')}`;
}

export function parseTeamNumber(id) {
  if (!id || typeof id !== 'string') return 0;
  const match = id.match(/^TEAM-(\d+)$/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(JSON_FILE)) {
    fs.writeFileSync(JSON_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(CSV_FILE)) {
    const csvHeaderLine = CSV_HEADERS.map((c) => `"${c}"`).join(',') + '\n';
    fs.writeFileSync(CSV_FILE, csvHeaderLine, 'utf-8');
  }

  if (!fs.existsSync(SEQUENCE_FILE)) {
    fs.writeFileSync(SEQUENCE_FILE, JSON.stringify({ lastTeamNumber: 0 }, null, 2), 'utf-8');
  }
}

export function getLastTeamNumber() {
  ensureDataFiles();
  let fileNum = 0;
  try {
    if (fs.existsSync(SEQUENCE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SEQUENCE_FILE, 'utf-8'));
      fileNum = parseInt(parsed.lastTeamNumber, 10) || 0;
    }
  } catch (err) {
    console.error('Error reading sequence.json:', err);
  }

  // Double check existing registrations in memory/file so we never regress
  const all = getAllRegistrations();
  let maxFromRecords = 0;
  for (const r of all) {
    const n1 = parseTeamNumber(r.teamId);
    const n2 = parseTeamNumber(r.registrationId);
    if (n1 > maxFromRecords) maxFromRecords = n1;
    if (n2 > maxFromRecords) maxFromRecords = n2;
  }

  return Math.max(fileNum, maxFromRecords);
}

export function setLastTeamNumber(num) {
  ensureDataFiles();
  fs.writeFileSync(SEQUENCE_FILE, JSON.stringify({ lastTeamNumber: num }, null, 2), 'utf-8');
}

export function allocateNextTeamId() {
  const nextNum = getLastTeamNumber() + 1;
  const teamId = formatTeamId(nextNum);
  setLastTeamNumber(nextNum);
  return teamId;
}

export function getAllRegistrations() {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(JSON_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading registrations.json:', err);
    return [];
  }
}

export function getRegistrationById(idOrRegId) {
  const all = getAllRegistrations();
  return (
    all.find(
      (r) =>
        r.registrationId === idOrRegId ||
        r.teamId === idOrRegId ||
        r.id === idOrRegId
    ) || null
  );
}

export function escapeCsvField(val) {
  if (val === undefined || val === null) return '""';
  let str = String(val);
  // Neutralize spreadsheet formula injection (=, +, -, @, \t, \r)
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = "'" + str;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function generateCsvString(records) {
  const headerLine = CSV_HEADERS.map(escapeCsvField).join(',') + '\n';
  const rows = records.map((record) => {
    const m2 = (record.members && record.members[0]) || {};
    const m3 = (record.members && record.members[1]) || {};
    const m4 = (record.members && record.members[2]) || {};
    const teamId = record.teamId || record.registrationId;

    return [
      teamId,
      record.registrationId || teamId,
      record.timestamp,
      record.teamName,
      record.teamSize,
      record.lead?.name || '',
      record.lead?.regNo || '',
      record.lead?.department || '',
      record.lead?.academicYear || '',
      record.lead?.email || '',
      record.lead?.phone || '',
      m2.name || 'N/A',
      m2.regNo || 'N/A',
      m2.department || 'N/A',
      m2.academicYear || 'N/A',
      m2.email || 'N/A',
      m2.phone || 'N/A',
      m3.name || 'N/A',
      m3.regNo || 'N/A',
      m3.department || 'N/A',
      m3.academicYear || 'N/A',
      m3.email || 'N/A',
      m3.phone || 'N/A',
      m4.name || 'N/A',
      m4.regNo || 'N/A',
      m4.department || 'N/A',
      m4.academicYear || 'N/A',
      m4.email || 'N/A',
      m4.phone || 'N/A',
      record.status || 'CONFIRMED',
      record.emailSent ? 'Yes' : 'No',
    ]
      .map(escapeCsvField)
      .join(',');
  });

  return headerLine + rows.join('\n') + '\n';
}

/**
 * Check if any member or team name already registered across previous teams
 */
export function checkCrossTeamDuplicates(normalizedData) {
  const all = getAllRegistrations();
  const errors = {};

  // Check Team Name
  const lowerTeamName = (normalizedData.teamName || '').toLowerCase().trim();
  const existingTeam = all.find((r) => (r.teamName || '').toLowerCase().trim() === lowerTeamName);
  if (existingTeam) {
    errors.teamName = `A team named "${normalizedData.teamName}" has already registered. Please choose a unique team name.`;
  }

  // Gather all incoming students
  const incomingStudents = [
    { role: 'Team Lead', ...normalizedData.lead },
    ...(normalizedData.members || []).map((m, idx) => ({ role: `Member ${idx + 2}`, ...m })),
  ];

  for (const student of incomingStudents) {
    if (!student.regNo && !student.email) continue;
    for (const record of all) {
      const recordMembers = [record.lead, ...(record.members || [])].filter(Boolean);
      for (const existingMember of recordMembers) {
        if (student.regNo && existingMember.regNo && existingMember.regNo.toUpperCase() === student.regNo.toUpperCase()) {
          errors.crossDuplicate = `Registration number ${student.regNo} (${student.name}) is already registered with team "${record.teamName}".`;
          break;
        }
        if (student.email && existingMember.email && existingMember.email.toLowerCase() === student.email.toLowerCase()) {
          errors.crossDuplicate = `Email address ${student.email} is already registered with team "${record.teamName}".`;
          break;
        }
      }
      if (errors.crossDuplicate) break;
    }
    if (errors.crossDuplicate) break;
  }

  return {
    hasDuplicate: Object.keys(errors).length > 0,
    errors,
  };
}

/**
 * Atomic save function with concurrency protection and sequential team IDs
 */
export async function saveRegistration(normalizedData, customRegistrationId = null) {
  return new Promise((resolve, reject) => {
    writeLock = writeLock.then(async () => {
      try {
        ensureDataFiles();
        const all = getAllRegistrations();

        // 1. Cross-team duplicate check under write lock
        const dupCheck = checkCrossTeamDuplicates(normalizedData);
        if (dupCheck.hasDuplicate) {
          return resolve({ success: false, errors: dupCheck.errors });
        }

        // 2. Allocate sequential team ID (TEAM-001, TEAM-002...) ONLY when valid
        let teamId = customRegistrationId;
        if (!teamId) {
          const nextNumber = getLastTeamNumber() + 1;
          teamId = formatTeamId(nextNumber);
          setLastTeamNumber(nextNumber);
        }

        const registrationId = teamId;
        const timestamp = new Date().toISOString();
        const id = crypto.randomUUID();

        const record = {
          id,
          teamId,
          registrationId,
          timestamp,
          teamName: normalizedData.teamName,
          teamSize: normalizedData.teamSize,
          lead: normalizedData.lead,
          members: normalizedData.members,
          status: 'CONFIRMED',
          emailSent: false,
        };

        all.push(record);
        fs.writeFileSync(JSON_FILE, JSON.stringify(all, null, 2), 'utf-8');

        // Append to CSV
        const m2 = normalizedData.members[0] || {};
        const m3 = normalizedData.members[1] || {};
        const m4 = normalizedData.members[2] || {};
        const csvRow = [
          record.teamId,
          record.registrationId,
          record.timestamp,
          record.teamName,
          record.teamSize,
          record.lead.name,
          record.lead.regNo,
          record.lead.department,
          record.lead.academicYear,
          record.lead.email,
          record.lead.phone,
          m2.name || 'N/A',
          m2.regNo || 'N/A',
          m2.department || 'N/A',
          m2.academicYear || 'N/A',
          m2.email || 'N/A',
          m2.phone || 'N/A',
          m3.name || 'N/A',
          m3.regNo || 'N/A',
          m3.department || 'N/A',
          m3.academicYear || 'N/A',
          m3.email || 'N/A',
          m3.phone || 'N/A',
          m4.name || 'N/A',
          m4.regNo || 'N/A',
          m4.department || 'N/A',
          m4.academicYear || 'N/A',
          m4.email || 'N/A',
          m4.phone || 'N/A',
          record.status,
          record.emailSent ? 'Yes' : 'No',
        ]
          .map(escapeCsvField)
          .join(',') + '\n';

        fs.appendFileSync(CSV_FILE, csvRow, 'utf-8');

        resolve({ success: true, record });
      } catch (err) {
        console.error('Failed to save registration:', err);
        reject(err);
      }
    });
  });
}

export async function updateRegistrationEmailStatus(registrationId, statusUpdate) {
  return new Promise((resolve) => {
    writeLock = writeLock.then(() => {
      try {
        const all = getAllRegistrations();
        const item = all.find((r) => r.registrationId === registrationId || r.teamId === registrationId);
        if (item) {
          if (typeof statusUpdate === 'boolean') {
            item.emailSent = statusUpdate;
            item.leadConfirmationSent = statusUpdate;
          } else if (typeof statusUpdate === 'object' && statusUpdate !== null) {
            if (statusUpdate.leadSent !== undefined) {
              item.leadConfirmationSent = statusUpdate.leadSent;
              item.emailSent = statusUpdate.leadSent;
              item.leadConfirmationError = statusUpdate.leadError || null;
            }
            if (statusUpdate.organizerSent !== undefined) {
              item.organizerNotified = statusUpdate.organizerSent;
              item.organizerNotificationError = statusUpdate.organizerError || null;
            }
          }
          fs.writeFileSync(JSON_FILE, JSON.stringify(all, null, 2), 'utf-8');
        }
        resolve(true);
      } catch (err) {
        console.error('Failed to update email status:', err);
        resolve(false);
      }
    });
  });
}

/**
 * Clear all registration data and reset sequence counter to 0
 */
export function clearAllRegistrations() {
  ensureDataFiles();
  fs.writeFileSync(JSON_FILE, JSON.stringify([], null, 2), 'utf-8');
  const headerLine = CSV_HEADERS.map((c) => `"${c}"`).join(',') + '\n';
  fs.writeFileSync(CSV_FILE, headerLine, 'utf-8');
  setLastTeamNumber(0);
  console.log('[Storage] All registrations cleared and sequence reset to TEAM-001 baseline.');
}

/**
 * Delete a specific registration record without resetting the sequence
 * (Ensures deleted IDs are never reused during normal operation)
 */
export function deleteRegistration(idOrRegId) {
  ensureDataFiles();
  const all = getAllRegistrations();
  const filtered = all.filter((r) => r.registrationId !== idOrRegId && r.teamId !== idOrRegId && r.id !== idOrRegId);
  fs.writeFileSync(JSON_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  fs.writeFileSync(CSV_FILE, generateCsvString(filtered), 'utf-8');
  return all.length - filtered.length;
}
