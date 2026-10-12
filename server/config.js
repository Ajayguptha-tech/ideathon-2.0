import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function sanitizeEnv(val) {
  if (!val || typeof val !== 'string') return '';
  let str = val.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowedOrigins: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    process.env.FRONTEND_URL,
  ].filter(Boolean),

  // Database (Supabase PostgreSQL / Hosted)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    databaseUrl: process.env.DATABASE_URL || '',
  },

  // Administrator Access (Strict single-account authentication)
  admin: {
    email: (sanitizeEnv(process.env.ADMIN_EMAIL) || 'ajayguptha710@gmail.com').toLowerCase(),
    passwordHash: sanitizeEnv(process.env.ADMIN_PASSWORD_HASH),
    jwtSecret:
      sanitizeEnv(process.env.ADMIN_SECRET) ||
      sanitizeEnv(process.env.ORGANIZER_SECRET) ||
      sanitizeEnv(process.env.JWT_SECRET) ||
      'ideathon-2.0-secure-admin-session-secret-2026-prod',
  },

  // Authorized Organizers & Session Security (Backwards compatible alias)
  organizer: {
    emails: [
      (sanitizeEnv(process.env.ADMIN_EMAIL) || sanitizeEnv(process.env.ORGANIZER_EMAILS) || 'ajayguptha710@gmail.com').toLowerCase(),
    ],
    jwtSecret:
      sanitizeEnv(process.env.ADMIN_SECRET) ||
      sanitizeEnv(process.env.ORGANIZER_SECRET) ||
      sanitizeEnv(process.env.JWT_SECRET) ||
      'ideathon-2.0-secure-admin-session-secret-2026-prod',
  },

  // Email settings
  email: {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || process.env.ORGANIZER_EMAILS || 'ajayguptha710@gmail.com',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'ajayguptha710@gmail.com',
    fromName: process.env.SMTP_FROM_NAME || 'Young Innovators Club Ideathon 2.0',
    simulate: process.env.SIMULATE_EMAIL === 'true',
    brevoApiKey: process.env.BREVO_API_KEY || '',
  },

  // Google Sheets settings (optional secondary sync)
  googleSheets: {
    webhookUrl: process.env.GOOGLE_SHEET_WEBHOOK_URL || '',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    sheetId: process.env.GOOGLE_SHEET_ID || '',
  },

  // Event Constraints
  event: {
    name: 'Young Innovators Club Ideathon 2.0',
    eligibleDepartments: ['CSE', 'ACSE', 'IT'],
    eligibleYears: ['2nd', '3rd'],
    minTeamSize: 2,
    maxTeamSize: 4,
  },

  // Security & Throttling
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
  },

  dataDir: path.resolve(__dirname, 'data'),
};
