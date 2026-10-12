import { config } from './config.js';
import {
  sendSampleConfirmationEmail,
  buildTeamLeadConfirmationEmailContent,
} from './emailService.js';

const TARGET_EMAIL = 'ajayguptha710@gmail.com';

async function runSampleEmailTest() {
  console.log('====================================================');
  console.log(' IDEATHON 2.0 — SAMPLE TEST EMAIL DISPATCH');
  console.log('====================================================');

  const sampleRecord = {
    registrationId: 'DEMO-TEST-001',
    teamName: 'Demo Innovators',
    teamSize: 3,
    timestamp: new Date().toISOString(),
    lead: {
      name: 'Ajay Guptha',
      email: TARGET_EMAIL,
      department: 'CSE',
      academicYear: '3rd',
      regNo: 'DEMO101',
      phone: '63046134594',
    },
  };

  const preview = buildTeamLeadConfirmationEmailContent(sampleRecord, true);

  console.log('\n--- EMAIL PREVIEW ---');
  console.log(`To: ${TARGET_EMAIL}`);
  console.log(`From: "${config.email.fromName}" <${config.email.fromEmail}>`);
  console.log(`Subject: ${preview.subject}`);
  console.log('\n--- BODY PREVIEW (PLAIN TEXT) ---');
  console.log(preview.text);
  console.log('---------------------------------\n');

  console.log(`[Config Check] SMTP Host: ${config.email.host}:${config.email.port}`);
  console.log(`[Config Check] SMTP User: ${config.email.user ? config.email.user : '(empty - requires Brevo account email)'}`);
  console.log(`[Config Check] SMTP Pass: ${config.email.pass ? 'Configured (hidden)' : '(not set)'}`);
  console.log(`[Config Check] Simulate Email: ${config.email.simulate}`);

  console.log('\n[Dispatch] Attempting delivery through configured provider to:', TARGET_EMAIL);
  const result = await sendSampleConfirmationEmail(TARGET_EMAIL);

  console.log('\n====================================================');
  console.log(' PROVIDER EXECUTION RESULT');
  console.log('====================================================');

  if (result.sent) {
    if (result.simulated) {
      console.log('🟡 Result: SIMULATED (SIMULATE_EMAIL=true)');
      console.log('The email body was logged above. No live SMTP call made.');
    } else {
      console.log('✅ Result: ACCEPTED BY PROVIDER');
      console.log(`Message ID: ${result.messageId}`);
      if (result.accepted) console.log(`Accepted Recipients: ${JSON.stringify(result.accepted)}`);
      console.log('\n📌 ACTION FOR USER:');
      console.log(`Please check your email (${TARGET_EMAIL}):`);
      console.log('  1. Inbox');
      console.log('  2. Spam / Junk folder');
      console.log('  3. Promotions tab (in Gmail)');
      console.log('\nNote: Provider acceptance confirms Brevo SMTP queued the message. External inbox arrival depends on recipient spam filters.');
    }
  } else {
    console.log('❌ Result: REJECTED BY PROVIDER');
    console.log(`Error Message: ${result.error}`);
    if (result.providerResponse) {
      console.log(`Provider Response Details: ${result.providerResponse}`);
    }
    console.log('\n📌 DIAGNOSTIC & REQUIRED ACTION:');
    if (result.error?.includes('535') || result.error?.includes('Authentication failed')) {
      console.log('Root Cause: Brevo SMTP rejected authentication.');
      console.log('Remedy: Set `SMTP_USER=your_brevo_account_email` in `.env` matching your Brevo registered login email.');
    } else {
      console.log(`Remedy: Check your SMTP credentials in .env: ${result.error}`);
    }
  }
  console.log('====================================================\n');

  return result;
}

runSampleEmailTest().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
