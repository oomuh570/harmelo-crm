# Harmelo CRM

Internal web application for tracking institutional relationships, communications, and follow-ups across Harmelo's federal, provincial, U.S., investor, customer, and partner contacts. Built as a single source of truth for daily operational use by Bradley and a small set of internal users.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI:** React + Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (planned)
- **Hosting:** Vercel (frontend); database TBD

## Prerequisites

- Node.js 20+ — install via [nvm](https://github.com/nvm-sh/nvm)
- npm (ships with Node)
- PostgreSQL 15+ running locally, or a remote connection string

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd harmelo-crm

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Open .env.local and fill in your DATABASE_URL and NEXTAUTH_SECRET

# 4. Run database migrations (once a database is wired up)
npx prisma migrate dev

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — build for production
- `npm start` — run the production build
- `npm run lint` — run ESLint
- `npm run format` — format all files with Prettier
- `npm run format:check` — check formatting without writing changes

## Project Structure

```
src/
  app/         Next.js App Router pages and API routes
  components/  Shared React components
  lib/         Utilities, database client, auth helpers
  types/       Shared TypeScript types

prisma/
  schema.prisma   Database schema
```

## Conventions

**Package manager:** This project uses **npm**. Do not use Yarn or pnpm — mixing package managers creates conflicting lockfiles.

**Branching:**

- `main` is always deployable. No direct pushes.
- Feature branches: `ochihai/<short-description>` or `justin/<short-description>`.
- Open a pull request into `main`, request review from the other lead, merge after approval.

**Formatting:** Prettier runs on save (if you have the VS Code extension installed). Run `npm run format` before committing if you skipped that.

## Team

- **Ochihai Omuha** — Backend Lead
- **Justin Quan** — Frontend Lead
- **Bradley** — Founder, primary user, weekly check-ins

## Project Tracker

See `Harmelo_Operations_Tool_Project_Tracker.xlsx` (shared separately) for the 12-week task breakdown, owners, and priority order.
