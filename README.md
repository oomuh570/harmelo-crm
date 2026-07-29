
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
* External APIs: Google Gmail API, nodemailer
* Hosting: Vercel (frontend & API)

---

## Features & Status

### Core Features 

* Contact management (create, read, update, delete)
* Activity logging (calls, emails, meetings, notes)
* Follow-up tracking with reminders
* Tag-based contact organization
* CSV export & bulk import
* Contact merging/deduplication
* Soft-delete pattern (no permanent data loss)

### Gmail Integration 

* OAuth 2.0 authentication with Google
* Automatic email sync and activity logging
* Daily email reminders for follow-ups (9 AM)
* Encrypted token storage

### Multi-User Workspaces

* Create and manage team workspaces
* Role-based access control (ADMIN, EDITOR, VIEWER)
* Invite users to workspaces
* Permission enforcement on all endpoints
* Workspace-scoped data isolation

### In Progress 

* Frontend UI for workspace management (Justin)
* Frontend UI for team collaboration

### Planned 

* Analytics dashboard
* Advanced reporting

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
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (Gmail OAuth)
# - NEXTAUTH_SECRET (session encryption)
# - GMAIL_USER, GMAIL_PASSWORD (for reminders)

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
* **Status:** ✅ Production Ready

---

## Team

* **Ochihai Omuha** — Backend Lead 
* **Justin Quan** — Frontend Lead
* **Bradley** — Founder, primary user, requirements

---

## Project Tracker

See `Harmelo_Operations_Tool_Project_Tracker.xlsx` (shared separately) for the 12-week task breakdown, owners, and priority order.

**Current Status:** Backend complete and deployed. Frontend UI in progress.

---

## Getting Help

* Check the API routes in `app/api/` for endpoint documentation
* See `prisma/schema.prisma` for database schema
* See `lib/session.ts` for authentication logic
