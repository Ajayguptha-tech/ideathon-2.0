import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import {
  getAllRegistrations as getLocalRegistrations,
  saveRegistration as saveLocalRegistration,
  updateRegistrationEmailStatus as updateLocalEmailStatus,
  checkCrossTeamDuplicates as checkLocalDuplicates,
  getRegistrationById as getLocalRegistrationById,
  allocateNextTeamId,
  formatTeamId,
  clearAllRegistrations as clearLocalRegistrations,
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pg;

let supabase = null;
let pgPool = null;

// 1. Initialize Direct PostgreSQL Pool if DATABASE_URL is configured
const databaseUrl = (config.supabase?.databaseUrl || process.env.DATABASE_URL || '').trim();
if (databaseUrl) {
  try {
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    pgPool.query('SELECT NOW()', (err) => {
      if (err) {
        console.error('[PostgreSQL Error] Connection test failed:', err.message);
      } else {
        console.log('[Database] Native PostgreSQL pool connected successfully.');
        initPostgresSchema(pgPool);
      }
    });
  } catch (err) {
    console.error('[PostgreSQL Error] Failed to create pool:', err.message);
  }
}

// 2. Initialize Supabase if credentials are provided
if (config.supabase?.url && config.supabase?.serviceRoleKey) {
  try {
    supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Database] Supabase client initialized with hosted PostgreSQL.');
  } catch (err) {
    console.error('[Database Error] Failed to initialize Supabase client:', err.message);
  }
}

if (!pgPool && !supabase) {
  console.log('[Database] Notice: DATABASE_URL / SUPABASE_URL not configured yet.');
  console.log('[Database] Operating with local atomic ledger until PostgreSQL credentials are provided in .env.');
}

export async function initPostgresSchema(poolInstance = pgPool) {
  if (!poolInstance) return;
  try {
    const sqlPath = path.resolve(__dirname, 'migrations/init.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await poolInstance.query(sql);
      console.log('[PostgreSQL] Database schema synchronized with migrations/init.sql.');
    }
  } catch (err) {
    console.warn('[PostgreSQL Schema Warning]:', err.message);
  }
}

export function isDatabaseHosted() {
  return pgPool !== null || supabase !== null;
}

export function getDatabaseEngine() {
  if (pgPool) return 'PostgreSQL (Native Connection Pool)';
  if (supabase) return 'PostgreSQL (Supabase Hosted)';
  return 'Local Atomic Ledger (Pending PostgreSQL configuration in .env)';
}

export function getPgPool() {
  return pgPool;
}

export function getSupabaseClient() {
  return supabase;
}

/**
 * Check if a team name or any student registration number/email is already registered
 */
export async function checkTeamDuplicates(normalizedData) {
  // A. Native PostgreSQL Check
  if (pgPool) {
    try {
      const lowerTeamName = normalizedData.teamName.trim().toLowerCase();
      const allMembers = [
        { role: 'LEAD', ...normalizedData.lead },
        ...normalizedData.members.map((m) => ({ role: 'MEMBER', ...m })),
      ];

      // Check team name
      const teamRes = await pgPool.query(
        'SELECT team_name FROM teams WHERE LOWER(team_name) = $1 LIMIT 1',
        [lowerTeamName]
      );
      if (teamRes.rows.length > 0) {
        return {
          hasDuplicate: true,
          errors: { teamName: `A team named "${normalizedData.teamName}" has already registered.` },
        };
      }

      // Check registration numbers
      const regNos = allMembers.map((m) => m.regNo.trim().toUpperCase());
      const regRes = await pgPool.query(
        'SELECT reg_no, name FROM team_members WHERE UPPER(reg_no) = ANY($1::text[]) LIMIT 1',
        [regNos]
      );
      if (regRes.rows.length > 0) {
        const dup = regRes.rows[0];
        return {
          hasDuplicate: true,
          errors: {
            crossDuplicate: `Registration number ${dup.reg_no} (${dup.name}) is already registered with another team.`,
          },
        };
      }

      // Check emails
      const emails = allMembers.map((m) => m.email.trim().toLowerCase());
      const emailRes = await pgPool.query(
        'SELECT email, name FROM team_members WHERE LOWER(email) = ANY($1::text[]) LIMIT 1',
        [emails]
      );
      if (emailRes.rows.length > 0) {
        const dup = emailRes.rows[0];
        return {
          hasDuplicate: true,
          errors: {
            crossDuplicate: `Email address ${dup.email} is already registered with another team.`,
          },
        };
      }

      return { hasDuplicate: false, errors: {} };
    } catch (err) {
      console.warn('[PostgreSQL] Duplicate check error, falling back:', err.message);
    }
  }

  // B. Supabase PostgreSQL Check
  if (supabase) {
    try {
      const lowerTeamName = normalizedData.teamName.trim();
      const allMembers = [
        { role: 'LEAD', ...normalizedData.lead },
        ...normalizedData.members.map((m) => ({ role: 'MEMBER', ...m })),
      ];

      // Check team name
      const { data: existingTeam, error: teamErr } = await supabase
        .from('teams')
        .select('team_name')
        .ilike('team_name', lowerTeamName)
        .maybeSingle();

      if (teamErr && teamErr.code !== 'PGRST116') {
        console.warn('[Database] Team name check warning:', teamErr.message);
      }

      if (existingTeam) {
        return {
          hasDuplicate: true,
          errors: { teamName: `A team named "${normalizedData.teamName}" has already registered.` },
        };
      }

      // Check registration numbers
      const regNos = allMembers.map((m) => m.regNo);
      const { data: existingRegs, error: regErr } = await supabase
        .from('team_members')
        .select('reg_no, name')
        .in('reg_no', regNos);

      if (!regErr && existingRegs && existingRegs.length > 0) {
        const dup = existingRegs[0];
        return {
          hasDuplicate: true,
          errors: {
            crossDuplicate: `Registration number ${dup.reg_no} (${dup.name}) is already registered with another team.`,
          },
        };
      }

      // Check emails
      const emails = allMembers.map((m) => m.email.toLowerCase());
      const { data: existingEmails, error: emailErr } = await supabase
        .from('team_members')
        .select('email, name')
        .in('email', emails);

      if (!emailErr && existingEmails && existingEmails.length > 0) {
        const dup = existingEmails[0];
        return {
          hasDuplicate: true,
          errors: {
            crossDuplicate: `Email address ${dup.email} is already registered with another team.`,
          },
        };
      }

      return { hasDuplicate: false, errors: {} };
    } catch (err) {
      console.warn('[Database] Remote duplicate check failed, checking local ledger:', err.message);
    }
  }

  // C. Local storage check fallback
  return checkLocalDuplicates(normalizedData);
}

/**
 * Save team and all team members in a transaction
 */
export async function saveTeamRegistration(normalizedData) {
  // Verify duplicates first
  const dupCheck = await checkTeamDuplicates(normalizedData);
  if (dupCheck.hasDuplicate) {
    return { success: false, errors: dupCheck.errors };
  }

  // 1. Try Native PostgreSQL Pool with Database Transaction
  if (pgPool) {
    let client = null;
    try {
      client = await pgPool.connect();
      await client.query('BEGIN');

      // Sequential Team ID generation synchronized from PostgreSQL records
      const seqRes = await client.query(`
        SELECT registration_id FROM teams 
        WHERE registration_id ~ '^TEAM-[0-9]+$' 
        ORDER BY created_at DESC LIMIT 1
      `);
      let nextNum = 1;
      if (seqRes.rows.length > 0) {
        const lastId = seqRes.rows[0].registration_id;
        const match = lastId.match(/TEAM-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      const teamId = formatTeamId(nextNum);
      const registrationId = teamId;
      const timestamp = new Date().toISOString();

      // Insert master team row
      const teamInsertRes = await client.query(
        `INSERT INTO teams (registration_id, team_name, team_size, status, email_sent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, registration_id, team_name, team_size, created_at`,
        [registrationId, normalizedData.teamName.trim(), normalizedData.teamSize, 'CONFIRMED', false, timestamp]
      );
      const internalId = teamInsertRes.rows[0].id;

      // Insert team members
      const allMembers = [
        { role: 'LEAD', member_index: 1, ...normalizedData.lead },
        ...normalizedData.members.map((m, idx) => ({ role: 'MEMBER', member_index: idx + 2, ...m })),
      ];

      for (const m of allMembers) {
        await client.query(
          `INSERT INTO team_members (team_id, role, member_index, name, reg_no, department, academic_year, email, phone, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            internalId,
            m.role,
            m.member_index,
            m.name.trim(),
            m.regNo.trim().toUpperCase(),
            m.department,
            m.academicYear,
            m.email.toLowerCase().trim(),
            m.phone.trim(),
            timestamp,
          ]
        );
      }

      await client.query('COMMIT');

      const record = {
        id: internalId,
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

      // Also persist to secondary local ledger for audit backup
      try {
        await saveLocalRegistration(normalizedData, teamId);
      } catch (localErr) {
        console.warn('[Storage] Secondary local save note:', localErr.message);
      }

      return { success: true, record, hosted: true, engine: 'postgresql' };
    } catch (dbErr) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      if (dbErr.code === '23505') {
        return {
          success: false,
          errors: { duplicate: 'Team name, registration number, or email conflict detected in PostgreSQL.' },
        };
      }
      console.error('[PostgreSQL Error] Transaction failed, falling back:', dbErr.message);
    } finally {
      if (client) client.release();
    }
  }

  // 2. Try Supabase if connected
  if (supabase) {
    try {
      const teamId = allocateNextTeamId();
      const registrationId = teamId;
      const timestamp = new Date().toISOString();

      // 1. Insert master team row
      const { data: teamRow, error: teamErr } = await supabase
        .from('teams')
        .insert({
          registration_id: registrationId,
          team_name: normalizedData.teamName,
          team_size: normalizedData.teamSize,
          status: 'CONFIRMED',
          email_sent: false,
        })
        .select('id, registration_id, team_name, team_size, created_at')
        .single();

      if (teamErr) {
        if (teamErr.code === '23505') {
          return {
            success: false,
            errors: { duplicate: 'Team name or registration ID conflict in database.' },
          };
        }
        throw teamErr;
      }

      const internalId = teamRow.id;

      // 2. Prepare member rows
      const memberRows = [
        {
          team_id: internalId,
          role: 'LEAD',
          member_index: 1,
          name: normalizedData.lead.name,
          reg_no: normalizedData.lead.regNo,
          department: normalizedData.lead.department,
          academic_year: normalizedData.lead.academicYear,
          email: normalizedData.lead.email.toLowerCase(),
          phone: normalizedData.lead.phone,
        },
        ...normalizedData.members.map((m, idx) => ({
          team_id: internalId,
          role: 'MEMBER',
          member_index: idx + 2,
          name: m.name,
          reg_no: m.regNo,
          department: m.department,
          academic_year: m.academicYear,
          email: m.email.toLowerCase(),
          phone: m.phone,
        })),
      ];

      // 3. Insert team members
      const { error: membersErr } = await supabase.from('team_members').insert(memberRows);

      if (membersErr) {
        console.error('[Database Transaction Error] Member insert failed, rolling back team:', membersErr);
        await supabase.from('teams').delete().eq('id', internalId);
        return {
          success: false,
          errors: {
            memberInsert: `Database constraint violation: ${membersErr.message || 'Duplicate member details'}`,
          },
        };
      }

      // Record successfully saved in Supabase
      const record = {
        id: internalId,
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

      // Also persist to secondary local ledger for audit trail
      try {
        await saveLocalRegistration(normalizedData, teamId);
      } catch (localErr) {
        console.warn('[Storage] Notice: secondary local save note:', localErr.message);
      }

      return { success: true, record, hosted: true, engine: 'supabase-postgresql' };
    } catch (dbErr) {
      console.error('[Database Error] Hosted database insert failed, falling back to local ledger:', dbErr);
    }
  }

  // 3. Fallback save to local storage ledger (allocates sequential teamId)
  const localRes = await saveLocalRegistration(normalizedData);
  return { ...localRes, hosted: false };
}

/**
 * Update email delivery status in database
 */
export async function updateEmailStatus(registrationId, statusUpdate, legacyError = null) {
  let updateObj = {};
  if (typeof statusUpdate === 'boolean') {
    updateObj = {
      email_sent: statusUpdate,
      lead_confirmation_sent: statusUpdate,
      email_error: legacyError || null,
      lead_confirmation_error: legacyError || null,
    };
  } else if (typeof statusUpdate === 'object' && statusUpdate !== null) {
    if (statusUpdate.leadSent !== undefined) {
      updateObj.lead_confirmation_sent = statusUpdate.leadSent;
      updateObj.email_sent = statusUpdate.leadSent;
      updateObj.lead_confirmation_error = statusUpdate.leadError || null;
      updateObj.email_error = statusUpdate.leadError || null;
    }
    if (statusUpdate.organizerSent !== undefined) {
      updateObj.organizer_notified = statusUpdate.organizerSent;
      updateObj.organizer_notification_error = statusUpdate.organizerError || null;
    }
  }

  if (pgPool) {
    try {
      await pgPool.query(
        'UPDATE teams SET email_sent = COALESCE($1, email_sent), email_error = COALESCE($2, email_error) WHERE registration_id = $3',
        [updateObj.email_sent, updateObj.email_error, registrationId]
      );
    } catch (err) {
      console.warn('[PostgreSQL] Update email status warning:', err.message);
    }
  }

  if (supabase) {
    try {
      await supabase
        .from('teams')
        .update(updateObj)
        .eq('registration_id', registrationId);
    } catch (err) {
      console.warn('[Database] Failed to update email status in Supabase:', err.message);
    }
  }

  await updateLocalEmailStatus(registrationId, statusUpdate);
}

/**
 * Fetch all teams with their complete member records
 */
export async function getAllTeams() {
  // A. Native PostgreSQL Pool Query
  if (pgPool) {
    try {
      const res = await pgPool.query(`
        SELECT 
          t.id,
          t.registration_id,
          t.team_name,
          t.team_size,
          t.status,
          t.email_sent,
          t.email_error,
          t.created_at,
          json_agg(
            json_build_object(
              'id', m.id,
              'role', m.role,
              'member_index', m.member_index,
              'name', m.name,
              'reg_no', m.reg_no,
              'department', m.department,
              'academic_year', m.academic_year,
              'email', m.email,
              'phone', m.phone
            ) ORDER BY m.member_index ASC
          ) AS members
        FROM teams t
        LEFT JOIN team_members m ON t.id = m.team_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);

      if (res && res.rows) {
        return res.rows.map((t) => {
          const membersList = (t.members || []).filter(Boolean);
          const leadMember = membersList.find((m) => m.role === 'LEAD') || membersList[0] || {};
          const otherMembers = membersList.filter((m) => m.role !== 'LEAD');

          return {
            id: t.id,
            teamId: t.registration_id,
            registrationId: t.registration_id,
            timestamp: t.created_at,
            teamName: t.team_name,
            teamSize: t.team_size,
            lead: {
              name: leadMember.name || 'N/A',
              regNo: leadMember.reg_no || '',
              department: leadMember.department || '',
              academicYear: leadMember.academic_year || '',
              email: leadMember.email || '',
              phone: leadMember.phone || '',
            },
            members: otherMembers.map((m) => ({
              name: m.name,
              regNo: m.reg_no,
              department: m.department,
              academicYear: m.academic_year,
              email: m.email,
              phone: m.phone,
            })),
            status: t.status,
            emailSent: t.email_sent,
            emailError: t.email_error,
          };
        });
      }
    } catch (err) {
      console.warn('[PostgreSQL] Failed to fetch teams, falling back:', err.message);
    }
  }

  // B. Supabase PostgreSQL Query
  if (supabase) {
    try {
      const { data: teams, error: teamErr } = await supabase
        .from('teams')
        .select(
          `
          id,
          registration_id,
          team_name,
          team_size,
          status,
          email_sent,
          email_error,
          created_at,
          team_members (
            id,
            role,
            member_index,
            name,
            reg_no,
            department,
            academic_year,
            email,
            phone
          )
        `
        )
        .order('created_at', { ascending: false });

      if (!teamErr && teams) {
        return teams.map((t) => {
          const membersList = t.team_members || [];
          membersList.sort((a, b) => a.member_index - b.member_index);
          const leadMember = membersList.find((m) => m.role === 'LEAD') || membersList[0] || {};
          const otherMembers = membersList.filter((m) => m.role !== 'LEAD');

          return {
            id: t.id,
            teamId: t.registration_id,
            registrationId: t.registration_id,
            timestamp: t.created_at,
            teamName: t.team_name,
            teamSize: t.team_size,
            lead: {
              name: leadMember.name || 'N/A',
              regNo: leadMember.regNo || leadMember.reg_no || '',
              department: leadMember.department || '',
              academicYear: leadMember.academicYear || leadMember.academic_year || '',
              email: leadMember.email || '',
              phone: leadMember.phone || '',
            },
            members: otherMembers.map((m) => ({
              name: m.name,
              regNo: m.regNo || m.reg_no,
              department: m.department,
              academicYear: m.academicYear || m.academic_year,
              email: m.email,
              phone: m.phone,
            })),
            status: t.status,
            emailSent: t.email_sent,
            emailError: t.email_error,
          };
        });
      }
    } catch (err) {
      console.warn('[Database] Failed to fetch teams from Supabase, falling back:', err.message);
    }
  }

  // C. Fallback to local
  return getLocalRegistrations();
}

/**
 * Get single team by registration ID or team ID
 */
export async function getTeamById(idOrRegId) {
  const all = await getAllTeams();
  return (
    all.find(
      (t) =>
        t.registrationId === idOrRegId ||
        t.teamId === idOrRegId ||
        t.id === idOrRegId
    ) || null
  );
}

/**
 * Clear all teams and reset sequence baseline to 0
 */
export async function clearAllTeams() {
  if (pgPool) {
    try {
      await pgPool.query('DELETE FROM team_members');
      await pgPool.query('DELETE FROM teams');
      console.log('[PostgreSQL] Native database teams and team_members cleared.');
    } catch (err) {
      console.warn('[PostgreSQL Clear Warning]', err.message);
    }
  }
  if (supabase) {
    try {
      await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('[Database] Hosted Supabase teams and team_members tables cleared.');
    } catch (err) {
      console.warn('[Database] Note on Supabase clear:', err.message);
    }
  }
  clearLocalRegistrations();
}
