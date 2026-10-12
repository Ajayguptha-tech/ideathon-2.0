# Young Innovators Club — Ideathon 2026

Official web platform for **Young Innovators Club Ideathon 2026** featuring:
- Futuristic 3D processor core animation with dynamic energy waves and particle field (Three.js + UnrealBloom).
- Smooth cinematic reveal transition from intro landing to the complete event experience.
- Complete official event information & timeline (CSE, ACSE, IT eligible; 2nd, 3rd, 4th years).
- Multi-step team registration portal with real-time validation, dynamic 2–3 member configuration, and review step.
- Private registration storage with duplicate detection (intra-team and cross-team), spam honeypot, and IP rate limiting.
- Dual storage engine: Private durable ledger (JSON & CSV export) + Google Sheets integration (Google Apps Script Webhook).
- Automated confirmation email dispatch exclusively to the team lead via Brevo SMTP with safe retry capability.

---

## 🚀 Quick Start on Windows (CMD)

### 1. Requirements
- Node.js LTS (v18 or higher, tested on v24.19)
- NPM (v9+)

### 2. Setup & Installation
Open Windows Command Prompt (`cmd.exe`) in the project directory:

```cmd
cd c:\Users\lenovo\Desktop\ideathon-2026\ideathon
npm install
```

### 3. Run Backend & Frontend

#### Terminal 1 — Start the Backend Server:
```cmd
npm run server
```
*Backend runs on: `http://localhost:5000`*

#### Terminal 2 — Start the Frontend Development Server:
```cmd
npm run dev
```
*Frontend runs on: `http://localhost:5174` (or `http://localhost:5173`)*

Open your browser and navigate to:
**`http://localhost:5174/`**

---

## 🛠 Project Architecture

```
ideathon/
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts                     # Proxies /api to http://localhost:5000
├── .env                               # Server environment variables & API keys
├── .env.example                       # Documented environment template
├── src/
│   ├── App.tsx                        # Main application flow
│   ├── main.tsx                       # React root entry
│   ├── index.css                      # Design tokens, glassmorphism, glowing buttons
│   ├── config/
│   │   └── eventConfig.ts             # Centralized event schedule, prizes & config
│   └── components/
│       ├── IntroExperience.tsx        # 3D landing screen & "GET STARTED" surge animation
│       ├── ThreeDScene.tsx            # Three.js 3D processor core, bloom, pins, energy waves
│       ├── SectionScene.tsx           # Subtle geometric canvas scenes for section accents
│       ├── Navbar.tsx                 # Glass sticky header with section navigation
│       ├── SideNav.tsx                # Floating indicator dots and reading progress bar
│       ├── Sections.tsx               # Hero, Schedule, Guidelines, Evaluation, Poster, Prizes, Announcements, FAQ, Footer
│       └── TeamRegistration.tsx      # Multi-step team registration experience & confirmation card
└── server/
    ├── index.js                       # Express API, rate limiter, CORS, error handling
    ├── config.js                      # Environment configuration parser
    ├── validators.js                  # Deep payload validation, eligibility rules & honeypot
    ├── storage.js                     # Local durable ledger (JSON + CSV) with write concurrency lock
    ├── googleSheets.js                # Google Sheet sync engine
    ├── googleAppsScript_Template.js   # Copy-paste Google Apps Script code for organizer sheet
    ├── emailService.js                # Brevo SMTP / Nodemailer email confirmation service
    └── data/
        ├── registrations.json         # Complete structured registration ledger
        └── registrations.csv          # Excel / Sheets compatible CSV export
```

---

## 🔒 Configuration & Environment Variables (`.env`)

Configure the `.env` file in the `ideathon/` root:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server host | `smtp-relay.brevo.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | Brevo account login email | *(Your Brevo login email)* |
| `SMTP_PASS` | Brevo SMTP Key (starts with `xsmtpsib-...`) | `xsmtpsib-a3a5e512...` |
| `SMTP_FROM_EMAIL` | Verified sender email address | `ideathon2026@yic-club.org` |
| `SMTP_FROM_NAME` | Sender display name | `"Young Innovators Club Ideathon 2026"` |
| `SIMULATE_EMAIL` | `true` logs emails to terminal without SMTP | `false` |
| `GOOGLE_SHEET_WEBHOOK_URL`| Private Google Apps Script Webhook URL | `https://script.google.com/macros/s/.../exec` |
| `RATE_LIMIT_WINDOW_MINUTES`| IP Rate limiting window | `15` |
| `RATE_LIMIT_MAX_REQUESTS` | Max registrations per window per IP | `20` |

---

## 📊 Google Sheets Integration Guide

Follow these steps to connect your private Google Sheet without Google Cloud Console complexity:

1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name the sheet (e.g., `Ideathon 2026 Private Registrations`).
3. Click **Extensions** > **Apps Script**.
4. Open the file `server/googleAppsScript_Template.js` from this project.
5. Copy its entire content and paste it into the Google Apps Script editor (`Code.gs`), replacing any existing code.
6. Click **Deploy** > **New deployment**.
7. In the configuration popup:
   - **Type**: Select *Web app* (gear icon).
   - **Description**: `Ideathon 2026 Registrations`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` (allows the backend server to POST data securely)
8. Click **Deploy**, review permissions, and authorize your Google account.
9. Copy the **Web App URL** generated (it ends with `/exec`).
10. In your `.env` file, set:
   ```env
   GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
11. Whenever a team registers, a new row is automatically appended with all lead and member details!
*(Note: Even if this is left blank, all registrations are safely stored locally in `server/data/registrations.csv` and `server/data/registrations.json`)*.

---

## ✉️ Email Confirmation Setup (Brevo)

The Brevo SMTP key provided (`xsmtpsib-...`) is pre-configured in `.env`.
To ensure live delivery:
1. Log in to [Brevo](https://app.brevo.com/).
2. Under **Transactional** > **Settings** > **Configuration**, find your SMTP User (your account email address).
3. Set `SMTP_USER=your_brevo_account_email@domain.com` in `.env`.
4. Ensure `SMTP_FROM_EMAIL` matches a verified sender in Brevo.
5. If SMTP credentials are incomplete or during testing, set `SIMULATE_EMAIL=true` to preview full email content in the backend console without throwing network errors.

---

## 🛡️ Security & Privacy Guarantees

- **No Public API Keys**: SMTP and database keys are strictly server-side in `.env`.
- **Zero Frontend Secrets**: No credentials are built into React or client source maps.
- **Private Registration Storage**: No public endpoints exist to list registered teams or student records.
- **Duplicate Prevention**: The backend independently validates registrations and rejects duplicate registration numbers, emails, or team names.
- **Bot Protection**: Hidden honeypot fields silently filter automated spam bots.
- **Resilience**: If email delivery fails, the team registration remains 100% saved in the durable ledger and Google Sheet. A safe `/api/resend-confirmation` route allows retrying delivery without creating duplicate teams.

---

## 👥 Credits
- **Young Innovators Club (YIC)**, VFSTR.
