import { config } from './config.js';

/**
 * Format registration record into Google Sheet columns
 */
export function formatSheetRow(record) {
  const m2 = record.members[0] || {};
  const m3 = record.members[1] || {};

  return {
    registrationId: record.registrationId,
    timestamp: record.timestamp,
    teamName: record.teamName,
    teamSize: record.teamSize,
    leadName: record.lead.name,
    leadRegNo: record.lead.regNo,
    leadDepartment: record.lead.department,
    leadAcademicYear: record.lead.academicYear,
    leadEmail: record.lead.email,
    leadPhone: record.lead.phone,
    member2Name: m2.name || 'N/A',
    member2RegNo: m2.regNo || 'N/A',
    member2Department: m2.department || 'N/A',
    member2AcademicYear: m2.academicYear || 'N/A',
    member2Email: m2.email || 'N/A',
    member2Phone: m2.phone || 'N/A',
    member3Name: m3.name || 'N/A',
    member3RegNo: m3.regNo || 'N/A',
    member3Department: m3.department || 'N/A',
    member3AcademicYear: m3.academicYear || 'N/A',
    member3Email: m3.email || 'N/A',
    member3Phone: m3.phone || 'N/A',
    status: record.status || 'CONFIRMED',
  };
}

/**
 * Sync record to private Google Sheet via Webhook or Service Account
 */
export async function syncToGoogleSheet(record) {
  const webhookUrl = config.googleSheets.webhookUrl;

  if (!webhookUrl) {
    console.log('[Google Sheets] Webhook URL not configured. Record securely saved in local durable CSV & JSON ledger.');
    return {
      synced: false,
      reason: 'GOOGLE_SHEET_WEBHOOK_URL not configured in .env',
    };
  }

  try {
    const payload = formatSheetRow(record);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[Google Sheets] Webhook responded with status: ${response.status}`);
      return {
        synced: false,
        reason: `Webhook HTTP error ${response.status}`,
      };
    }

    console.log(`[Google Sheets] Record ${record.registrationId} successfully synced to Google Sheet.`);
    return { synced: true };
  } catch (error) {
    console.error('[Google Sheets] Network error syncing to Google Sheet:', error.message);
    return {
      synced: false,
      reason: error.message,
    };
  }
}
