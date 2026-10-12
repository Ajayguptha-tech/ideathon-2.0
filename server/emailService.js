import nodemailer from 'nodemailer';
import { config } from './config.js';

function getTransporter() {
  const { host, port, user, pass } = config.email;
  if (!pass) {
    return null;
  }

  const effectiveUser = user || config.organizer.emails[0] || 'ajayguptha710@gmail.com';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: effectiveUser,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/GFTQNtdirjTEtnRSnbIU7n?s=cl&p=a&mlu=4&ilr=4';
const ORGANIZER_PRIMARY_EMAIL = 'ajayguptha710@gmail.com';

// ------------------------------------------------------------------------------
// 1. TEAM LEADER CONFIRMATION EMAIL TEMPLATE
// ------------------------------------------------------------------------------
export function buildTeamLeadConfirmationEmailContent(record, isTest = false) {
  const leadName = record.lead?.name || 'Team Lead';
  const teamName = record.teamName;
  const regId = record.registrationId;
  const teamSize = record.teamSize;

  const subject = isTest
    ? 'TEST — Ideathon 2.0 Email Configuration'
    : 'Registration Confirmed — Ideathon 2.0';

  const testBannerText = isTest
    ? '*** [SAMPLE TEST EMAIL ONLY — NO DATABASE REGISTRATION WAS CREATED] ***\n\n'
    : '';

  const text = `${testBannerText}Hello ${leadName},

Your team has been successfully registered for Ideathon 2.0 organized by Young Innovators Club!

Registration Details:
==================================
Registration ID: ${regId}
Team Name: ${teamName}
Number of Members: ${teamSize}
Team Leader: ${leadName}
==================================

Official Participants WhatsApp Group:
Join our official participants WhatsApp group for schedules, round announcements, and venue updates:
${WHATSAPP_GROUP_URL}

Next Steps:
- Keep your Registration ID safe for check-in on event day.
- Teams advancing to Round 2 must present using the official presentation template and demonstrate their working basic prototype.
- Final Round will take place on 24 October 2026.

Thank you for registering!

Young Innovators Club
Ideathon 2.0 Coordination Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050816; color: #e2e8f0; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0c102c; border: 1px solid #22d3ee44; border-radius: 12px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    .header { text-align: center; border-bottom: 1px solid #22d3ee33; padding-bottom: 20px; margin-bottom: 24px; }
    .club-title { color: #22d3ee; font-size: 13px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin: 0; }
    .title { color: #ffffff; font-size: 26px; font-weight: 800; margin: 6px 0 0 0; }
    .test-badge { background: #f59e0b; color: #000; font-weight: 800; padding: 6px 12px; border-radius: 6px; display: inline-block; font-size: 12px; letter-spacing: 0.1em; margin-bottom: 12px; text-transform: uppercase; }
    .greeting { font-size: 17px; font-weight: 600; color: #ffffff; margin-bottom: 16px; }
    .card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 8px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 15px; }
    .row:last-child { border-bottom: none; }
    .label { color: #94a3b8; }
    .value { color: #67e8f9; font-weight: 700; }
    .reg-id { font-size: 20px; color: #a78bfa; letter-spacing: 0.05em; font-family: monospace; }
    .whatsapp-box { background: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.4); border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
    .whatsapp-btn { display: inline-block; background: #25D366; color: #050816; font-weight: 700; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 15px; margin-top: 10px; }
    .notice { background: rgba(124, 58, 237, 0.15); border-left: 4px solid #8b5cf6; padding: 14px 18px; border-radius: 4px; font-size: 14px; color: #cbd5e1; margin: 24px 0; }
    .footer { text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${isTest ? '<div class="test-badge">SAMPLE TEST EMAIL</div><br/>' : ''}
      <p class="club-title">Young Innovators Club</p>
      <h1 class="title">IDEATHON 2.0</h1>
    </div>
    
    <p class="greeting">Hello ${leadName},</p>
    <p>Your team has been successfully registered for <strong>Ideathon 2.0</strong> organized by Young Innovators Club.</p>
    
    <div class="card">
      <div class="row">
        <span class="label">Registration ID:</span>
        <span class="value reg-id">${regId}</span>
      </div>
      <div class="row">
        <span class="label">Team Name:</span>
        <span class="value">${teamName}</span>
      </div>
      <div class="row">
        <span class="label">Number of Members:</span>
        <span class="value">${teamSize}</span>
      </div>
      <div class="row">
        <span class="label">Team Leader:</span>
        <span class="value">${leadName}</span>
      </div>
    </div>
    
    <!-- WhatsApp Group CTA -->
    <div class="whatsapp-box">
      <div style="font-weight: 700; color: #4ade80; font-size: 16px;">Official Participants WhatsApp Group</div>
      <p style="margin: 6px 0 12px; font-size: 13px; color: #cbd5e1;">Stay updated with schedules, venue announcements, and round updates.</p>
      <a href="${WHATSAPP_GROUP_URL}" class="whatsapp-btn" target="_blank" rel="noopener noreferrer">Join WhatsApp Group</a>
    </div>

    <div class="notice">
      <strong>Important Event Details:</strong><br>
      Please save your Registration ID (<strong>${regId}</strong>). Qualified teams must present using the official presentation template and demonstrate a working basic prototype for the Final Round on <strong>24 October 2026</strong>.
    </div>
    
    <div class="footer">
      <strong>Young Innovators Club — Ideathon 2.0</strong><br>
      This is an automated confirmation. Please retain this email for your records.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// ------------------------------------------------------------------------------
// 2. ORGANIZER NOTIFICATION EMAIL TEMPLATE
// ------------------------------------------------------------------------------
export function buildOrganizerNotificationEmailContent(record) {
  const teamName = record.teamName;
  const regId = record.registrationId;
  const teamSize = record.teamSize;
  const timestamp = record.timestamp || new Date().toISOString();
  const leadName = record.lead?.name || 'N/A';
  const leadDept = record.lead?.department || 'N/A';
  const leadYear = record.lead?.academicYear || 'N/A';
  const portalUrl = `${config.frontendUrl}/organizer`;

  const subject = 'New Team Registration — Ideathon 2.0';

  const text = `New Team Registration — Ideathon 2.0

A new team has registered for Ideathon 2.0.

Team Details:
==================================
Registration ID: ${regId}
Team Name: ${teamName}
Number of Members: ${teamSize}
Team Leader: ${leadName} (${leadDept}, ${leadYear} Year)
Timestamp: ${timestamp}
==================================

Inspect full team and member details securely in the Organizer Portal:
${portalUrl}

Young Innovators Club — Ideathon 2.0 Server Notification`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050816; color: #e2e8f0; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0c102c; border: 1px solid #a78bfa44; border-radius: 12px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    .header { text-align: center; border-bottom: 1px solid #a78bfa33; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { background: #7c3aed; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
    .title { color: #ffffff; font-size: 22px; font-weight: 800; margin: 6px 0 0 0; }
    .card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(167, 139, 250, 0.25); border-radius: 8px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #94a3b8; }
    .value { color: #c4b5fd; font-weight: 700; }
    .reg-id { font-family: monospace; font-size: 17px; color: #22d3ee; }
    .btn { display: inline-block; background: #7c3aed; color: #ffffff; font-weight: 700; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; text-align: center; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 18px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Organizer Notification</div>
      <h2 class="title">New Team Registration Received</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Ideathon 2.0 — Young Innovators Club</p>
    </div>
    
    <p style="font-size: 15px; color: #e2e8f0;">A new team has registered on the platform:</p>
    
    <div class="card">
      <div class="row">
        <span class="label">Registration ID:</span>
        <span class="value reg-id">${regId}</span>
      </div>
      <div class="row">
        <span class="label">Team Name:</span>
        <span class="value">${teamName}</span>
      </div>
      <div class="row">
        <span class="label">Number of Members:</span>
        <span class="value">${teamSize}</span>
      </div>
      <div class="row">
        <span class="label">Team Leader:</span>
        <span class="value">${leadName} (${leadDept}, ${leadYear} Year)</span>
      </div>
      <div class="row">
        <span class="label">Timestamp:</span>
        <span class="value" style="font-size: 12px;">${timestamp}</span>
      </div>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${portalUrl}" class="btn" target="_blank" rel="noopener noreferrer">Open Organizer Portal</a>
    </div>

    <div class="footer">
      This is an automated notification dispatched to the designated organizer email.<br>
      Confidential — For Ideathon 2.0 Event Coordinators Only.
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// ------------------------------------------------------------------------------
// 3. LOW-LEVEL PROVIDER DISPATCH (SMTP & BREVO REST API)
// ------------------------------------------------------------------------------
async function sendViaBrevoApi({ to, subject, html, text }) {
  const apiKey = config.email.brevoApiKey || config.email.pass;
  if (!apiKey) throw new Error('No Brevo API key configured');

  const endpoint = 'https://api.brevo.com/v3/smtp/email';
  const payload = {
    sender: {
      name: config.email.fromName,
      email: config.email.fromEmail,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Brevo API error (${res.status}): ${errorData.message || res.statusText}`);
  }

  const result = await res.json();
  return { sent: true, messageId: result.messageId, provider: 'Brevo REST API' };
}

async function dispatchEmail({ to, subject, text, html }) {
  // If simulation is enabled
  if (config.email.simulate) {
    console.log(`[Email Simulated] To: ${to} | Subject: ${subject}`);
    return { sent: true, simulated: true, message: 'Email simulated in server logs.' };
  }

  // 1. Try Brevo REST API if API key provided or key starts with xkeysib-
  const keyCandidate = config.email.brevoApiKey || config.email.pass;
  if (keyCandidate && keyCandidate.startsWith('xkeysib-')) {
    try {
      return await sendViaBrevoApi({ to, subject, html, text });
    } catch (apiErr) {
      console.warn(`[Email Warning] Brevo REST API attempt failed: ${apiErr.message}. Falling back to SMTP...`);
    }
  }

  // 2. Try SMTP Transport
  const transport = getTransporter();
  if (!transport) {
    return {
      sent: false,
      error: 'SMTP credentials (SMTP_PASS) not configured on server.',
    };
  }

  try {
    const senderEmail = config.email.fromEmail || config.email.user || 'ajayguptha710@gmail.com';
    const fromAddress = `"${config.email.fromName}" <${senderEmail}>`;
    const info = await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    return {
      sent: true,
      messageId: info.messageId,
      accepted: info.accepted,
      provider: `${config.email.host}:${config.email.port}`,
    };
  } catch (err) {
    return {
      sent: false,
      error: err.message,
      providerResponse: err.response || err.message,
    };
  }
}

// ------------------------------------------------------------------------------
// 4. WORKFLOW DISPATCHERS
// ------------------------------------------------------------------------------

/**
 * Workflow B: Team-leader confirmation email
 */
export async function sendTeamLeadConfirmationEmail(record) {
  const recipient = record.lead?.email;
  if (!recipient) {
    return { sent: false, error: 'Recipient team leader email is missing.' };
  }

  const { subject, text, html } = buildTeamLeadConfirmationEmailContent(record, false);
  console.log(`[Email] Dispatching Team-Leader Confirmation to ${recipient} (Reg ID: ${record.registrationId})`);
  return dispatchEmail({ to: recipient, subject, text, html });
}

/**
 * Workflow A: Organizer notification email
 */
export async function sendOrganizerNotificationEmail(record) {
  const targetOrganizer = config.organizer.emails[0] || ORGANIZER_PRIMARY_EMAIL;
  const { subject, text, html } = buildOrganizerNotificationEmailContent(record);
  console.log(`[Email] Dispatching Organizer Notification to ${targetOrganizer} (Reg ID: ${record.registrationId})`);
  return dispatchEmail({ to: targetOrganizer, subject, text, html });
}

/**
 * Sample Test Email to ajayguptha710@gmail.com
 */
export async function sendSampleConfirmationEmail(targetEmail = ORGANIZER_PRIMARY_EMAIL) {
  const sampleRecord = {
    registrationId: 'DEMO-TEST-001',
    teamName: 'Demo Innovators',
    teamSize: 3,
    timestamp: new Date().toISOString(),
    lead: {
      name: 'Ajay Guptha',
      email: targetEmail,
      department: 'CSE',
      academicYear: '3rd',
      regNo: 'DEMO101',
      phone: '63046134594',
    },
  };

  const { subject, text, html } = buildTeamLeadConfirmationEmailContent(sampleRecord, true);
  console.log(`[Email Test] Dispatching Sample Confirmation Email to ${targetEmail}`);
  return dispatchEmail({ to: targetEmail, subject, text, html });
}

// Backwards-compatible alias for existing imports
export const sendConfirmationEmail = sendTeamLeadConfirmationEmail;
export const testEmailConnection = sendSampleConfirmationEmail;
