import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { getSupabaseClient } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('====================================================');
  console.log(' IDEATHON 2.0 — DATA MIGRATION UTILITY');
  console.log('====================================================');

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[Migration Error] Supabase is not connected.');
    console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running migration.');
    process.exit(1);
  }

  const jsonFilePath = path.join(config.dataDir, 'registrations.json');
  if (!fs.existsSync(jsonFilePath)) {
    console.log(`[Migration] No legacy JSON file found at ${jsonFilePath}. Nothing to migrate.`);
    return;
  }

  let legacyData = [];
  try {
    const raw = fs.readFileSync(jsonFilePath, 'utf-8');
    legacyData = JSON.parse(raw);
  } catch (err) {
    console.error('[Migration Error] Failed to parse registrations.json:', err.message);
    process.exit(1);
  }

  console.log(`[Migration] Found ${legacyData.length} records in legacy JSON storage.`);

  let importedCount = 0;
  let skippedCount = 0;
  const duplicateDetails = [];

  for (const record of legacyData) {
    const regId = record.registrationId;
    const teamName = record.teamName;

    // Check if team already exists in Supabase
    const { data: existingTeam, error: checkErr } = await supabase
      .from('teams')
      .select('registration_id, team_name')
      .or(`registration_id.eq.${regId},team_name.ilike.${teamName}`)
      .maybeSingle();

    if (existingTeam) {
      skippedCount++;
      duplicateDetails.push({
        registrationId: regId,
        teamName,
        reason: `Already exists in Supabase as ${existingTeam.registration_id} ("${existingTeam.team_name}")`,
      });
      continue;
    }

    // Insert team
    const { data: insertedTeam, error: teamInsertErr } = await supabase
      .from('teams')
      .insert({
        registration_id: regId,
        team_name: teamName,
        team_size: record.teamSize,
        status: record.status || 'CONFIRMED',
        email_sent: Boolean(record.emailSent),
        created_at: record.timestamp || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (teamInsertErr) {
      skippedCount++;
      duplicateDetails.push({
        registrationId: regId,
        teamName,
        reason: `Insert error: ${teamInsertErr.message}`,
      });
      continue;
    }

    // Prepare members
    const membersToInsert = [
      {
        team_id: insertedTeam.id,
        role: 'LEAD',
        member_index: 1,
        name: record.lead.name,
        reg_no: record.lead.regNo,
        department: record.lead.department,
        academic_year: record.lead.academicYear,
        email: record.lead.email.toLowerCase(),
        phone: record.lead.phone,
      },
      ...(record.members || []).map((m, idx) => ({
        team_id: insertedTeam.id,
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

    const { error: memberInsertErr } = await supabase.from('team_members').insert(membersToInsert);

    if (memberInsertErr) {
      // Rollback team
      await supabase.from('teams').delete().eq('id', insertedTeam.id);
      skippedCount++;
      duplicateDetails.push({
        registrationId: regId,
        teamName,
        reason: `Member insert failed (duplicate reg_no or email): ${memberInsertErr.message}`,
      });
    } else {
      importedCount++;
    }
  }

  console.log('----------------------------------------------------');
  console.log(`[Migration Summary]`);
  console.log(`  Total Legacy Records: ${legacyData.length}`);
  console.log(`  Successfully Imported: ${importedCount}`);
  console.log(`  Skipped (Duplicate/Error): ${skippedCount}`);
  if (duplicateDetails.length > 0) {
    console.log('\n[Skipped Details]:');
    duplicateDetails.forEach((d) => {
      console.log(`  - [${d.registrationId}] "${d.teamName}": ${d.reason}`);
    });
  }
  console.log('====================================================');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { runMigration };
