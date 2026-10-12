# Young Innovators Club — Ideathon 2.0

Official web platform and registration management system for **Young Innovators Club Ideathon 2.0** at Vignan's Foundation for Science, Technology and Research (VFSTR).

---

## 🎯 Event Overview & Eligibility Rules

- **Event:** Ideathon 2.0
- **Organizing Body:** Young Innovators Club (YIC), Department of Computer Science & Engineering, VFSTR
- **Eligible Departments:** **CSE, ACSE, IT** only (students from other branches cannot register)
- **Eligible Academic Years:** **2nd and 3rd years only** (1st year and 4th year students are strictly ineligible)
- **Permitted Team Size:** **2 to 4 members** per team (individual participation is prohibited)
- **Inter-Department Teams:** Permitted across eligible departments (CSE, ACSE, IT)
- **Official Participants WhatsApp Group:** Direct join link provided immediately upon confirmed registration

### Two-Round Evaluation Structure

1. **Round 1: Abstract & Proposal Submission (13–19 October 2026)**
   - Download the official Word document proposal template.
   - Submit proposal via the official Google Form before **19 October 2026**.
   - Round 1 results announced on **22 October 2026**.
2. **Round 2: Final Presentation & Working Prototype (24 October 2026)**
   - **No physical posters:** The event no longer requires A2/A3 physical poster presentations.
   - **Presentation Template:** Teams present their solution using the official slide deck template (released after Round 1 results).
   - **Working Prototype Demonstration:** Basic implementation demonstration is mandatory.
   - **Rapid-Fire Questioning:** Judges evaluate domain depth, feasibility, and architecture.
   - Immediate prize declaration and felicitation.

---

## 📄 Official Templates & Submissions

### 1. Abstract Submission Template (.docx)
- **Filename:** `Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx` (2 MB authentic Word document)
- **Public Assets Location:** [`public/Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx`](public/Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx)
- **Direct Download Link:** `/Ideathon_2.0_Idea_Abstract_Proposal_Template_Final.docx` or via backend API `/api/download/abstract-template`
- **Required Proposal Sections in Template:**
  1. Abstract (Executive Summary)
  2. Team Details & Contact Information
  3. Problem Statement & Background
  4. Proposed Technical Solution
  5. Objectives & Scope
  6. Methodology & System Architecture
  7. Technologies & Tools
  8. Feasibility & Novelty Factor
  9. Practical Impact & Scalability
  10. Conclusion & Future Scope
- **Submission Form Status:** Marked as **"Abstract Submission Form — Coming Soon"** on the landing page until the submission window opens.

### 2. Presentation Template (.pptx)
- **Status:** **Available after Round 1 results**
- The official PowerPoint slide deck template will be uploaded and made downloadable directly on the website once shortlisted teams are announced on **22 October 2026**. Qualified teams will use this template for their final presentation to the judges on **24 October 2026**.

---

## 🔐 Hidden Administrator Portal (`/admin`)

To maintain a clean public participant experience, **all administrative entry points are hidden from the public website**:
- Zero admin buttons, icons, or dashboard links exist on the navbar, mobile drawer, sidebar, or footer.
- Organizers navigate directly to:
  ```
  http://localhost:5173/admin
  ```
- **Authentication & Security:**
  - Protected by BCrypt password hashing and HMAC-SHA256 signed session tokens.
  - Strict single-account authorization (`ajayguptha710@gmail.com`).
  - All admin REST endpoints (`/api/admin/*`) require the `Authorization: Bearer <token>` header and return `HTTP 401 Unauthorized` to unauthorized callers.
- **Admin Dashboard Features:**
  - Real-time team and participant counts.
  - Demographics breakdown (team sizes 2/3/4; departments CSE/ACSE/IT; 2nd/3rd years).
  - Search by Team ID, team name, leader name, or registration number.
  - Custom dark dropdown filters for Department, Academic Year, Team Size, and Date.
  - Multi-criteria sorting (Newest, Oldest, Team Name A–Z, Team Size).
  - "View Details" modal with full member information, contact numbers, and emails.
  - **Export to Excel (.xlsx):** Dual-worksheet workbook generated using SheetJS with auto-filters, frozen header rows, formula injection protection, and leading-zero preservation:
    - *Worksheet 1:* `Registered Teams` (11 columns)
    - *Worksheet 2:* `All Team Members` (11 columns)
  - **Export CSV:** Fast comma-separated export.

---

## 🗄️ Database Architecture & PostgreSQL Setup

The backend features a unified data access layer in [`server/db.js`](server/db.js) engineered for enterprise-grade persistence, sequential IDs, and atomic transactions.

### Database Capabilities

1. **Native PostgreSQL (`pg.Pool`)**:
   - Connects using standard connection strings (`DATABASE_URL=postgresql://user:password@host:5432/dbname`).
   - Automatically executes relational migrations from [`server/migrations/init.sql`](server/migrations/init.sql) on startup.
   - Enforces ACID transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) across master `teams` and child `team_members` tables.
   - Prevents duplicate registrations with `UNIQUE` constraints on `team_name`, `team_members.reg_no`, and `team_members.email`.
   - Recovers and tracks the sequential `TEAM-001`, `TEAM-002`, `TEAM-003` sequence directly from PostgreSQL records, guaranteeing zero gaps or collisions across container redeployments.
2. **Hosted PostgreSQL via Supabase**:
   - Connects using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   - Utilizes Supabase Row Level Security (RLS) policies defined in `init.sql`.
3. **Local Atomic Ledger (Offline Development Fallback)**:
   - When neither `DATABASE_URL` nor `SUPABASE_URL` is configured in `.env`, the server automatically operates on an atomic local file ledger in `server/data/`.
   - **Current Status:** Unless valid PostgreSQL credentials are added to `.env`, the backend operates in this atomic ledger mode so that local development and test runs never crash.

### How to Connect a Real PostgreSQL Database

To connect your PostgreSQL instance (local PostgreSQL, Neon, Supabase, Render, Railway, or AWS RDS):

1. **Step 1:** Open or create your `.env` file in the project root:
   ```env
   # Option A — Direct PostgreSQL connection string:
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ideathon

   # Option B — Supabase hosted PostgreSQL:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
2. **Step 2:** Start or restart the backend server:
   ```cmd
   npm run server
   ```
3. **Step 3:** Verify the database connection status:
   Open [http://localhost:5000/api/health](http://localhost:5000/api/health). When successfully connected, the response reports:
   ```json
   {
     "status": "online",
     "database": "PostgreSQL (Native Connection Pool)",
     "databaseConnected": true,
     "totalRegistrations": 0
   }
   ```
4. **Step 4 (Optional): Migrate existing local JSON registrations to PostgreSQL**:
   ```cmd
   npm run migrate
   ```

---

## 🚀 Running the Project Locally

### 1. Prerequisites
- **Node.js:** v18 or higher (tested on Node v24 LTS)
- **NPM:** v9 or higher

### 2. Installation
Open Command Prompt or PowerShell in the project directory:
```cmd
cd c:\Users\lenovo\Desktop\ideathon-2026\ideathon
npm install
```

### 3. Start Servers

#### Terminal 1 — Backend API Server
```cmd
npm run server
```
*Backend URL: `http://localhost:5000`*  
*Health Check: `http://localhost:5000/api/health`*

#### Terminal 2 — Frontend Development Server
```cmd
npm run dev
```
*Frontend URL: `http://localhost:5173/`*  
*Admin Portal: `http://localhost:5173/admin`*

### 4. Running Production Build & Verification Tests
```cmd
# Run production TypeScript check & Vite build
npm run build

# Run complete 16-point regression test suite
npm run test:suite
```

---

## 🛡️ Security & Privacy Guarantees

- **No Public API Keys or Secrets Committed:** All secrets are kept in `.env` (strictly ignored by `.gitignore`).
- **No Client-Side Secrets:** Client bundles contain zero database keys or SMTP passwords.
- **Formula Injection Mitigation:** Spreadsheet exports sanitize user-submitted strings starting with `=`, `+`, `-`, `@`, `\t`, or `\r`.
- **IP Rate Limiting:** Built-in sliding window rate limiter prevents automated abuse.
- **Honeypot Anti-Spam:** Hidden honeypot inputs silently trap automated spam scripts.

---

## 👥 Credits & Organization
- **Organized by:** Young Innovators Club (YIC), Department of Computer Science & Engineering, VFSTR
- **Core Student Organizers:**
  - Sriram Gurram (CSE) — Contact: `8688150840`
  - Ajay Guptha (CSE) — Contact: `63046134594`
  - SK. Reshma (CSE) — Contact: `98853 66384`
- **Official GitHub Repository:** [https://github.com/Ajayguptha-tech/ideathon-2.0](https://github.com/Ajayguptha-tech/ideathon-2.0)
