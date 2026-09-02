# Harmelo CRM

Internal web application for tracking institutional relationships, communications, and follow-ups across Harmelo's federal, provincial, U.S., investor, customer, and partner contacts. Built as a single source of truth for daily operational use by Bradley and a small set of internal users.

**Live:** [harmelo-crm.vercel.app](https://harmelo-crm.vercel.app)

---

## Tech Stack

* Framework: Next.js 16 (App Router, Turbopack)
* Language: TypeScript
* UI: React + Tailwind CSS
* Database: PostgreSQL (Supabase)
* ORM: Prisma 7
* Auth: JWT in httpOnly cookies
* Email: nodemailer (SMTP), Gmail App Passwords
* Scheduling: node-cron (background tasks)
* External APIs: Google Gmail API
* Hosting: Vercel (frontend & API)

---

## Features & Status

### Core Features

* Contact management (create, read, update, delete)
* Activity logging (calls, emails, meetings, notes)
* Follow-up tracking with automated reminders (every 30 mins, 1 hour before due)
* Tag-based contact organization
* CSV export & bulk import
* Contact merging/deduplication
* Soft-delete pattern (no permanent data loss)

### Authentication & Security

* JWT authentication in httpOnly cookies
* Self-service password reset with email verification (1-hour token expiry)
* Password reset via forgot-password flow
* Email-based account recovery

### Gmail Integration

* OAuth 2.0 authentication with Google
* Automatic email sync and activity logging
* Encrypted token storage
* Gmail sync disabled by default (per-contact toggle)

### Multi-User Workspaces

* Create and manage team workspaces
* Role-based access control (ADMIN, EDITOR, VIEWER)
* Invite users to workspaces
* Permission enforcement on all endpoints
* Workspace-scoped data isolation

### Recently Completed

* Password reset system with email verification
* Automated follow-up reminders (every 30 minutes)
* Workspace selection UI for Super Admin
* UI/UX consistency improvements

---

## Prerequisites

* Node.js 18+ — install via [nvm](https://github.com/nvm-sh/nvm)
* npm (ships with Node)
* PostgreSQL 15+ (or Supabase connection string)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/oomuh570/harmelo-crm.git
cd harmelo-crm

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in:
# - DATABASE_URL (PostgreSQL connection string)
# - DIRECT_URL (direct PostgreSQL URL for migrations)
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (Gmail OAuth)
# - SESSION_SECRET (session encryption)
# - EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_FROM (SMTP for emails)
# - GMAIL_USER, GMAIL_PASSWORD (Gmail app password for sending emails)
# - NEXT_PUBLIC_BASE_URL (base URL for email links)

# 4. Run database migrations
npx prisma migrate dev
npx prisma generate

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

---

## Scripts

* `npm run dev` — start the dev server (http://localhost:3000)
* `npm run build` — build for production
* `npm start` — run the production build
* `npm run lint` — run ESLint
* `npm run format` — format all files with Prettier
* `npm run format:check` — check formatting without writing changes

---

## Project Structure

```
app/
  api/              API routes (contacts, activities, workspaces, gmail, etc.)
  (routes)/         Page routes
  layout.tsx        Root layout

components/        React components
lib/               Utilities (Prisma, session, auth, reminders)
prisma/            Database schema & migrations
public/            Static assets
```

---

## Conventions

**Package manager:** npm only. Do not use Yarn or pnpm.

**Branching:**

* `main` is always deployable. No direct pushes.
* Feature branches: `ochihai/<short-description>` or `justin/<short-description>`
* Open a PR, request review, merge after approval

**Formatting:** Prettier on save (VS Code extension). Run `npm run format` before committing.

**Database:** Prisma ORM. All schema changes via migrations:

```bash
npx prisma migrate dev --name <description>
```

---

## Deployment

* **Live URL:** [harmelo-crm.vercel.app](https://harmelo-crm.vercel.app)
* **Platform:** Vercel (auto-deploy on `main` branch push)
* **Database:** PostgreSQL on Supabase
* **Status:** Production Ready

---

## Team

* **Ochihai Omuha** — Backend Lead
* **Justin Quan** — Frontend Lead
* **Bradley** — Founder, primary user, requirements

---

## Project Tracker

See `Harmelo_Operations_Tool_Project_Tracker.xlsx` (shared separately) for the 12-week task breakdown, owners, and priority order.

**Current Status:** Core features complete and deployed. Active development on workspace management and analytics.

---

## How To

### Create a Workspace (Super Admin)
1. Log in as Super Admin
2. Go to **Super Admin** → **Workspaces**
3. Enter workspace name and click **Create workspace**
4. Click **Enter** to access the workspace
5. Invite team members to the workspace

### Invite Users to a Workspace
1. Navigate to **Settings** → **Team Management**
2. Enter user email and select role (ADMIN, EDITOR, VIEWER)
3. Click **Send Invite**
4. User receives invitation email with link to accept
5. Once accepted, user can access the workspace

### Set Up Gmail Integration
1. Go to **Settings** → **Gmail Integration**
2. Click **Connect Gmail**
3. Authorize Harmelo to access your Gmail
4. Gmail will auto-sync every 10 minutes in the background
5. Emails are logged as activities for your contacts
6. Toggle Gmail sync per contact to enable/disable

### Create a Follow-Up
1. Go to **Contacts** → Select a contact
2. Click **+ Add Follow-Up**
3. Set due date/time and add notes
4. Click **Create**
5. Reminders will be sent 1 hour before due date (every 30 minutes check)

### Reset Your Password
1. Go to login page
2. Click **Forgot your password?**
3. Enter your email address
4. Check your email for reset link (valid for 1 hour)
5. Click link and set your new password
6. Log in with new password

### Import Contacts from CSV
1. Go to **Contacts** → Click **Import CSV**
2. Upload CSV file with columns: name, email, phone, organization, jobTitle, type, address, tags, notes
3. System validates and shows import summary
4. Duplicates are skipped automatically
5. View imported contacts in the contacts list

### Export Contacts
1. Go to **Contacts** → Click **Export** (top right)
2. Download CSV file with all contacts
3. File includes all contact details and tags

### Merge Duplicate Contacts
1. Go to **Contacts** → Select two contacts
2. Click **Merge** button
3. Choose which contact to keep
4. All activities and tags are merged
5. Duplicate contact is deleted

---

## Getting Help

* Check the API routes in `app/api/` for endpoint documentation
* See `prisma/schema.prisma` for database schema
* See `lib/session.ts` for authentication logic
