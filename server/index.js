import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { config } from './config.js';
import { validateRegistrationPayload } from './validators.js';
import {
  saveTeamRegistration,
  getAllTeams,
  getTeamById,
  updateEmailStatus,
  isDatabaseHosted,
  getDatabaseEngine,
  getPgPool,
  clearAllTeams,
} from './db.js';
import { generateCsvString } from './storage.js';
import { syncToGoogleSheet } from './googleSheets.js';
import {
  sendTeamLeadConfirmationEmail,
  sendOrganizerNotificationEmail,
  sendSampleConfirmationEmail,
} from './emailService.js';

const app = express();

// ------------------------------------------------------------------------------
// RATE LIMITING HELPERS
// ------------------------------------------------------------------------------
const ipRequests = new Map();
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.max;

  const userRecord = ipRequests.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > userRecord.resetTime) {
    userRecord.count = 0;
    userRecord.resetTime = now + windowMs;
  }

  userRecord.count += 1;
  ipRequests.set(ip, userRecord);

  if (userRecord.count > max) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait a few moments before trying again.',
    });
  }

  next();
}

// Strict rate limiter for Admin Login attempts (max 5 failed attempts per 15 minutes)
const adminLoginAttempts = new Map();
function adminLoginLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 5;

  const record = adminLoginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  if (record.count >= max) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    });
  }

  req.adminRateRecord = record;
  req.adminIp = ip;
  next();
}

// Middleware
app.use(express.json({ limit: '100kb' }));
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed =
      config.allowedOrigins.some((allowed) => allowed === origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.endsWith('.vercel.app') ||
      (config.frontendUrl && origin === config.frontendUrl);

    if (isAllowed) {
      callback(null, true);
    } else {
      if (config.nodeEnv === 'production') {
        callback(new Error(`Access blocked by CORS policy: Origin "${origin}" not allowed.`));
      } else {
        callback(null, true); // Dev-friendly fallback
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Serve public directory statically for public assets and downloads
app.use(express.static(path.resolve(__dirname, '../public')));

// Public Abstract Template Download Endpoints (Zero login required)
const sendAbstractTemplateFile = (req, res) => {
  const filePath = path.resolve(__dirname, '../public/Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Abstract template file not found on server' });
  }
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx"'
  );
  return res.sendFile(filePath);
};

app.get('/api/download/abstract-template', sendAbstractTemplateFile);
app.get('/Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx', sendAbstractTemplateFile);

// ------------------------------------------------------------------------------
// ADMINISTRATOR AUTHENTICATION (HMAC-SHA256 Signed Session Tokens)
// ------------------------------------------------------------------------------
function createAdminSessionToken(email) {
  const payload = {
    email: email.toLowerCase().trim(),
    role: 'administrator',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.admin.jwtSecret)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', config.admin.jwtSecret)
    .update(payloadB64)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Verify admin email and password against server configuration
function verifyAdminCredentials(email, password) {
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  if (normalized !== config.admin.email.toLowerCase()) {
    return false;
  }

  // 1. Verify against BCrypt password hash
  if (config.admin.passwordHash) {
    try {
      if (bcrypt.compareSync(password, config.admin.passwordHash)) {
        return true;
      }
    } catch (e) {
      console.warn('[Admin Auth Warning] BCrypt hash comparison failed:', e.message);
    }
  }

  // 2. Direct fallback if plaintext password provided in .env
  if (config.admin.password && password === config.admin.password) {
    return true;
  }

  return false;
}

// Middleware: Restrict access strictly to authorized administrator account
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to the Admin Panel.',
    });
  }

  const token = authHeader.slice(7).trim();
  const session = verifyAdminSessionToken(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired administrator session. Please sign in again.',
    });
  }

  const isAuthorized = session.email.toLowerCase() === config.admin.email.toLowerCase();
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: account is not authorized.',
    });
  }

  req.admin = session;
  req.organizer = session; // Backwards compatibility
  next();
}

// Backwards-compatible aliases
const requireOrganizerAuth = requireAdminAuth;
const createSessionToken = createAdminSessionToken;
const verifySessionToken = verifyAdminSessionToken;

// ------------------------------------------------------------------------------
// PUBLIC API ENDPOINTS
// ------------------------------------------------------------------------------

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    let dbConnected = false;
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('SELECT 1');
        dbConnected = true;
      } catch (poolErr) {
        dbConnected = false;
        console.error('[Health Check DB Error]', poolErr.message);
      }
    } else if (isDatabaseHosted()) {
      dbConnected = true;
    }

    const all = await getAllTeams().catch(() => []);
    res.json({
      status: 'online',
      event: config.event.name,
      environment: config.nodeEnv,
      database: getDatabaseEngine(),
      databaseConnected: dbConnected,
      totalRegistrations: all.length,
      authorizedOrganizer: config.organizer.emails[0] || 'ajayguptha710@gmail.com',
      emailService: config.email.pass || config.email.brevoApiKey ? 'Configured' : 'Pending Config',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Public stats endpoint (Safe aggregate summary only)
app.get('/api/stats', async (req, res) => {
  try {
    const all = await getAllTeams();
    const totalMembers = all.reduce((sum, t) => sum + (t.teamSize || 0), 0);
    res.json({
      totalRegisteredTeams: all.length,
      totalRegisteredMembers: totalMembers,
      eligibleDepartments: config.event.eligibleDepartments,
      eligibleYears: config.event.eligibleYears,
      teamSizeLimits: { min: config.event.minTeamSize, max: config.event.maxTeamSize },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Registration submission endpoint
app.post('/api/register', rateLimiter, async (req, res) => {
  try {
    const payload = req.body;

    // 1. Validation
    const validation = validateRegistrationPayload(payload);
    if (!validation.valid) {
      if (validation.isSpam) {
        return res.status(400).json({ success: false, message: 'Invalid submission' });
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please correct the highlighted errors.',
        errors: validation.errors,
      });
    }

    // 2. Storage & Database Transaction (Database is source of truth - saved first!)
    const saveResult = await saveTeamRegistration(validation.normalized);
    if (!saveResult.success) {
      const isDbError = Boolean(saveResult.errors?.database);
      return res.status(isDbError ? 500 : 409).json({
        success: false,
        message: isDbError
          ? 'Database transaction failed. Registration was not recorded.'
          : 'Registration conflict detected.',
        errors: saveResult.errors,
      });
    }

    const record = saveResult.record;

    // 3. Sync to Google Sheets asynchronously (secondary backup)
    syncToGoogleSheet(record).catch((err) => {
      console.warn('[Google Sheets Sync Note]', err.message);
    });

    // 4. Dispatch Email Workflows Asynchronously after Database Save Succeeds
    // A. Team Leader Confirmation
    let leadEmailRes = { sent: false };
    try {
      leadEmailRes = await sendTeamLeadConfirmationEmail(record);
    } catch (err) {
      leadEmailRes = { sent: false, error: err.message };
    }

    // B. Organizer Notification Email (Sent to ajayguptha710@gmail.com)
    let organizerEmailRes = { sent: false };
    try {
      organizerEmailRes = await sendOrganizerNotificationEmail(record);
    } catch (err) {
      organizerEmailRes = { sent: false, error: err.message };
    }

    // Update both statuses in the database
    await updateEmailStatus(record.registrationId, {
      leadSent: leadEmailRes.sent,
      leadError: leadEmailRes.error || null,
      organizerSent: organizerEmailRes.sent,
      organizerError: organizerEmailRes.error || null,
    });

    // 5. Response
    return res.status(201).json({
      success: true,
      message: 'Your team has been successfully registered!',
      teamId: record.teamId || record.registrationId,
      registrationId: record.registrationId || record.teamId,
      teamName: record.teamName,
      teamSize: record.teamSize,
      leadEmail: record.lead.email,
      leadName: record.lead.name,
      emailSent: leadEmailRes.sent,
      organizerNotified: organizerEmailRes.sent,
      emailMessage: leadEmailRes.sent
        ? `A confirmation email has been dispatched to ${record.lead.email}.`
        : `Registration saved successfully in database. Confirmation email could not be delivered immediately.`,
      whatsAppUrl: 'https://chat.whatsapp.com/GFTQNtdirjTEtnRSnbIU7n?s=cl&p=a&mlu=4&ilr=4',
    });
  } catch (error) {
    console.error('Registration processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred while processing registration. Please try again.',
    });
  }
});

// Public resend confirmation email (matches reg ID and lead email)
app.post('/api/resend-confirmation', rateLimiter, async (req, res) => {
  const { registrationId, leadEmail } = req.body;
  if (!registrationId || !leadEmail) {
    return res.status(400).json({ success: false, message: 'Registration ID and Lead Email are required.' });
  }

  const record = await getTeamById(registrationId);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Registration record not found.' });
  }

  if (record.lead.email.toLowerCase() !== leadEmail.trim().toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Email does not match team leader record.' });
  }

  const result = await sendTeamLeadConfirmationEmail(record);
  if (result.sent) {
    await updateEmailStatus(record.registrationId, { leadSent: true });
    return res.json({ success: true, message: `Confirmation email re-sent to ${record.lead.email}.` });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Failed to send email. Please check server email settings.',
      diagnostic: result.error,
    });
  }
});

// ------------------------------------------------------------------------------
// ADMINISTRATOR API ENDPOINTS (PROTECTED & RATE-LIMITED)
// ------------------------------------------------------------------------------

// Helper to sanitize spreadsheet cells against CSV/Excel formula injection
function sanitizeSpreadsheetCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// 1. Admin Login (Strict single account: ajayguptha710@gmail.com with BCrypt verification)
app.post(['/api/admin/login', '/api/organizer/login'], adminLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const isValid = verifyAdminCredentials(email, password);

    if (!isValid) {
      if (req.adminRateRecord) {
        req.adminRateRecord.count = (req.adminRateRecord.count || 0) + 1;
        adminLoginAttempts.set(req.adminIp, req.adminRateRecord);
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator email or password.',
      });
    }

    // Reset rate limiter on successful login
    if (req.adminIp) {
      adminLoginAttempts.delete(req.adminIp);
    }

    // Generate signed session token (24-hour expiration)
    const token = createAdminSessionToken(config.admin.email);

    return res.json({
      success: true,
      token,
      admin: {
        email: config.admin.email,
        role: 'administrator',
      },
    });
  } catch (err) {
    console.error('[Admin Login Error]', err.message);
    return res.status(500).json({ success: false, message: 'Internal login processing error.' });
  }
});

// 2. Verify Session
app.get(['/api/admin/verify-session', '/api/organizer/verify-session'], requireAdminAuth, (req, res) => {
  return res.json({
    success: true,
    admin: req.admin,
  });
});

// 3. Admin Logout
app.post(['/api/admin/logout', '/api/organizer/logout'], (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// 4. Admin Statistics (Total teams, students, size distribution, departments, years, dates)
app.get(['/api/admin/stats', '/api/organizer/stats'], requireAdminAuth, async (req, res) => {
  try {
    const teams = await getAllTeams();
    const totalTeams = teams.length;
    let totalStudents = 0;
    const teamSizes = { '2': 0, '3': 0, '4': 0 };
    const departments = { CSE: 0, ACSE: 0, IT: 0 };
    const years = { '2nd': 0, '3rd': 0 };
    const dateCounts = {};

    teams.forEach((t) => {
      const size = t.teamSize || ((t.members?.length || 0) + 1);
      if (teamSizes[size] !== undefined) {
        teamSizes[size] += 1;
      } else {
        teamSizes[size] = 1;
      }

      // Date breakdown
      const dateKey = new Date(t.timestamp).toISOString().slice(0, 10);
      if (!dateCounts[dateKey]) {
        dateCounts[dateKey] = { date: dateKey, teams: 0, students: 0 };
      }
      dateCounts[dateKey].teams += 1;

      const allMembers = [t.lead, ...(t.members || [])].filter(Boolean);
      totalStudents += allMembers.length;
      dateCounts[dateKey].students += allMembers.length;

      allMembers.forEach((m) => {
        const dept = (m.department || '').toUpperCase();
        if (departments[dept] !== undefined) {
          departments[dept] += 1;
        } else if (dept) {
          departments[dept] = (departments[dept] || 0) + 1;
        }

        const yr = m.academicYear || m.academic_year || '';
        if (years[yr] !== undefined) {
          years[yr] += 1;
        } else if (yr) {
          years[yr] = (years[yr] || 0) + 1;
        }
      });
    });

    const registrationsByDate = Object.values(dateCounts).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      stats: {
        totalTeams,
        totalStudents,
        totalMembers: totalStudents, // backwards compatibility
        teamSizes,
        departments,
        years,
        registrationsByDate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Admin Teams with Search, Filtering, Sorting, and Pagination
app.get(['/api/admin/teams', '/api/organizer/teams'], requireAdminAuth, async (req, res) => {
  try {
    let teams = await getAllTeams();
    const {
      search,
      department,
      academicYear,
      teamSize,
      date,
      status,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    // Search filter across team name, team ID, reg ID, member names, and registration numbers
    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      teams = teams.filter((t) => {
        const matchTeamName = (t.teamName || '').toLowerCase().includes(q);
        const matchRegId =
          (t.registrationId || '').toLowerCase().includes(q) ||
          (t.teamId || '').toLowerCase().includes(q);
        const allMembers = [t.lead, ...(t.members || [])].filter(Boolean);
        const matchMember = allMembers.some(
          (m) =>
            (m.name || '').toLowerCase().includes(q) ||
            (m.regNo || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q)
        );
        return matchTeamName || matchRegId || matchMember;
      });
    }

    // Department filter
    if (department && department !== 'ALL') {
      const d = String(department).trim().toUpperCase();
      teams = teams.filter((t) => {
        const allMembers = [t.lead, ...(t.members || [])].filter(Boolean);
        return allMembers.some((m) => (m.department || '').toUpperCase() === d);
      });
    }

    // Academic Year filter
    if (academicYear && academicYear !== 'ALL') {
      const y = String(academicYear).trim();
      teams = teams.filter((t) => {
        const allMembers = [t.lead, ...(t.members || [])].filter(Boolean);
        return allMembers.some((m) => (m.academicYear || m.academic_year) === y);
      });
    }

    // Team Size filter
    if (teamSize && teamSize !== 'ALL') {
      const s = parseInt(teamSize, 10);
      teams = teams.filter((t) => t.teamSize === s || (t.members?.length || 0) + 1 === s);
    }

    // Date filter (YYYY-MM-DD)
    if (date && date !== 'ALL') {
      teams = teams.filter((t) => new Date(t.timestamp).toISOString().slice(0, 10) === date);
    }

    // Status filter
    if (status && status !== 'ALL') {
      teams = teams.filter((t) => (t.status || 'CONFIRMED').toUpperCase() === String(status).toUpperCase());
    }

    // Sorting
    teams.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'teamName') {
        cmp = (a.teamName || '').localeCompare(b.teamName || '');
      } else if (sortBy === 'teamSize') {
        cmp = (a.teamSize || 0) - (b.teamSize || 0);
      } else {
        // default: date
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const totalFiltered = teams.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize =
      limit === 'all' || parseInt(limit, 10) === -1
        ? totalFiltered
        : Math.max(1, parseInt(limit, 10) || 20);
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedTeams = teams.slice(startIndex, startIndex + pageSize);

    res.json({
      success: true,
      count: totalFiltered,
      total: totalFiltered,
      page: pageNum,
      limit: pageSize,
      totalPages,
      teams: paginatedTeams,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Single Team Detail
app.get(['/api/admin/teams/:registrationId', '/api/organizer/teams/:registrationId'], requireAdminAuth, async (req, res) => {
  try {
    const team = await getTeamById(req.params.registrationId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team record not found.' });
    }
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Export to Excel (.xlsx) (Professional dual-worksheet format for college organizers)
app.get(['/api/admin/export-excel', '/api/organizer/export-excel'], requireAdminAuth, async (req, res) => {
  try {
    const teams = await getAllTeams();

    // Sort teams consistently (by teamId / timestamp)
    teams.sort((a, b) => {
      const idA = a.teamId || a.registrationId || '';
      const idB = b.teamId || b.registrationId || '';
      return idA.localeCompare(idB, undefined, { numeric: true });
    });

    // Helper to build worksheet with formatting, auto-filters, text cell types, and frozen header
    function buildStyledWorksheet(aoa, colWidths, textColIndices = []) {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

      // Ensure phone numbers and registration numbers are formatted strictly as text
      for (let R = 1; R <= range.e.r; ++R) {
        textColIndices.forEach((C) => {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[cellAddress] && ws[cellAddress].v !== undefined) {
            ws[cellAddress].t = 's';
            ws[cellAddress].v = String(ws[cellAddress].v);
            ws[cellAddress].z = '@'; // Force Excel plain text format
          }
        });
      }

      // Explicit column widths for readability
      ws['!cols'] = colWidths.map((wch) => ({ wch }));

      // Row height for header
      ws['!rows'] = [{ hpt: 26 }];

      // Freeze header row
      ws['!views'] = [{ state: 'frozen', ySplit: 1 }];

      // Auto-filter on header row
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(range.e.r, 1), c: range.e.c },
        }),
      };

      return ws;
    }

    // 1. Worksheet 1: Registered Teams
    const teamsHeader = [
      'Serial Number',
      'Team ID',
      'Team Name',
      'Team Size',
      'Team Leader Name',
      'Team Leader Registration Number',
      'Team Leader Department',
      'Team Leader Academic Year',
      'Team Leader Email',
      'Team Leader Phone',
      'Registration Date and Time',
    ];

    const teamsAoa = [teamsHeader];

    teams.forEach((t, idx) => {
      const lead = t.lead || {};
      const regDate = t.timestamp
        ? new Date(t.timestamp).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : 'N/A';

      teamsAoa.push([
        idx + 1,
        sanitizeSpreadsheetCell(t.teamId || t.registrationId || `TEAM-${String(idx + 1).padStart(3, '0')}`),
        sanitizeSpreadsheetCell(t.teamName || ''),
        t.teamSize || (t.members?.length || 0) + 1,
        sanitizeSpreadsheetCell(lead.name || ''),
        sanitizeSpreadsheetCell(lead.regNo || ''),
        sanitizeSpreadsheetCell(lead.department || ''),
        sanitizeSpreadsheetCell(lead.academicYear || ''),
        sanitizeSpreadsheetCell(lead.email || ''),
        sanitizeSpreadsheetCell(lead.phone || ''),
        regDate,
      ]);
    });

    // 2. Worksheet 2: All Team Members
    const membersHeader = [
      'Serial Number',
      'Team ID',
      'Team Name',
      'Member Number',
      'Member Role',
      'Student Name',
      'Registration Number',
      'Department',
      'Academic Year',
      'Email',
      'Phone Number',
    ];

    const membersAoa = [membersHeader];
    let memberCounter = 1;

    teams.forEach((t) => {
      const teamId = t.teamId || t.registrationId || '';
      const teamName = t.teamName || '';
      const lead = t.lead || {};
      const members = t.members || [];

      // Leader (Member 1)
      membersAoa.push([
        memberCounter++,
        sanitizeSpreadsheetCell(teamId),
        sanitizeSpreadsheetCell(teamName),
        1,
        'Team Leader',
        sanitizeSpreadsheetCell(lead.name || ''),
        sanitizeSpreadsheetCell(lead.regNo || ''),
        sanitizeSpreadsheetCell(lead.department || ''),
        sanitizeSpreadsheetCell(lead.academicYear || ''),
        sanitizeSpreadsheetCell(lead.email || ''),
        sanitizeSpreadsheetCell(lead.phone || ''),
      ]);

      // Additional Members (Members 2, 3, 4)
      members.forEach((m, mIdx) => {
        membersAoa.push([
          memberCounter++,
          sanitizeSpreadsheetCell(teamId),
          sanitizeSpreadsheetCell(teamName),
          mIdx + 2,
          m.role || `Member ${mIdx + 2}`,
          sanitizeSpreadsheetCell(m.name || ''),
          sanitizeSpreadsheetCell(m.regNo || ''),
          sanitizeSpreadsheetCell(m.department || ''),
          sanitizeSpreadsheetCell(m.academicYear || ''),
          sanitizeSpreadsheetCell(m.email || ''),
          sanitizeSpreadsheetCell(m.phone || ''),
        ]);
      });
    });

    // Column widths:
    // S.No, Team ID, Team Name, Size, Leader Name, Reg No, Dept, Year, Email, Phone, Timestamp
    const teamsWidths = [14, 14, 26, 12, 24, 22, 16, 16, 30, 18, 24];
    const wsTeams = buildStyledWorksheet(teamsAoa, teamsWidths, [1, 5, 9]); // Team ID, Reg No, Phone

    // S.No, Team ID, Team Name, Member No, Role, Student Name, Reg No, Dept, Year, Email, Phone
    const membersWidths = [14, 14, 26, 16, 16, 24, 22, 16, 16, 30, 18];
    const wsMembers = buildStyledWorksheet(membersAoa, membersWidths, [1, 6, 10]); // Team ID, Reg No, Phone

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsTeams, 'Registered Teams');
    XLSX.utils.book_append_sheet(wb, wsMembers, 'All Team Members');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ideathon_2.0_registrations_${dateStr}.xlsx"`
    );
    return res.status(200).send(buf);
  } catch (err) {
    console.error('[Excel Export Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate Excel export.' });
  }
});

// 8. Export CSV Endpoint (Authorized only, formula-safe)
app.get(['/api/admin/export-csv', '/api/organizer/export-csv'], requireAdminAuth, async (req, res) => {
  try {
    const teams = await getAllTeams();
    const csvContent = generateCsvString(teams);

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ideathon_2.0_registrations_${dateStr}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('[CSV Export Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate CSV export.' });
  }
});

// 9. Admin Resend Confirmation Email Endpoint
app.post(['/api/admin/resend-email', '/api/organizer/resend-email'], requireAdminAuth, async (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID required.' });
    }

    const team = await getTeamById(registrationId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team record not found.' });
    }

    // Retry sending confirmation email
    const emailRes = await sendTeamLeadConfirmationEmail(team);
    if (emailRes.sent) {
      await updateEmailStatus(registrationId, { leadSent: true, leadError: null });
      return res.json({
        success: true,
        message: `Confirmation email dispatched to ${team.lead?.email}.`,
      });
    } else {
      await updateEmailStatus(registrationId, { leadSent: false, leadError: emailRes.error || 'Failed' });
      return res.status(500).json({
        success: false,
        message: `Delivery failed: ${emailRes.error || 'Unknown error'}`,
        diagnostic: emailRes.providerResponse || emailRes.error,
      });
    }
  } catch (err) {
    console.error('[Resend Email Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Sample Test Email Endpoint
app.post(['/api/admin/send-sample-email', '/api/organizer/send-sample-email', '/api/admin/test-email', '/api/organizer/test-email'], requireAdminAuth, async (req, res) => {
  try {
    const targetEmail = req.admin?.email || config.admin.email;
    const testRes = await sendSampleConfirmationEmail(targetEmail);
    return res.json({
      success: testRes.sent,
      recipient: targetEmail,
      messageId: testRes.messageId || null,
      accepted: testRes.accepted || null,
      simulated: testRes.simulated || false,
      error: testRes.error || null,
      providerResponse: testRes.providerResponse || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Admin Reset Database Endpoint (Protected, wipes test data and resets sequence to TEAM-001)
app.post(['/api/admin/reset-database', '/api/organizer/reset-database'], requireAdminAuth, async (req, res) => {
  try {
    await clearAllTeams();
    return res.json({
      success: true,
      message: 'All registrations cleared. Public team sequence has been reset to TEAM-001 baseline.',
    });
  } catch (err) {
    console.error('[Reset Database Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start Server
app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` Ideathon 2.0 Backend Server running on port ${config.port}`);
  console.log(` Database: ${getDatabaseEngine()}`);
  console.log(` Organizer Portal API: /api/organizer/*`);
  console.log(` Authorized Organizer: ${config.organizer.emails[0]}`);
  console.log(` Email Provider: ${config.email.pass || config.email.brevoApiKey ? 'Configured' : 'Pending configuration'}`);
  console.log(`====================================================`);
});
