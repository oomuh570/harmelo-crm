# Harmelo CRM — Technical Documentation

**Last Updated:** July 14, 2026
**Version:** 1.0 (Feature Complete, QA Phase)
**Maintainers:** Ochihai (Backend), Justin (Frontend)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Authentication &amp; Authorization](#authentication--authorization)
6. [Deployment &amp; DevOps](#deployment--devops)
7. [Development Setup](#development-setup)
8. [Project Structure](#project-structure)
9. [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React)                       │
│  (/contacts, /activities, /tags, /dashboard)            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON
                         ↓
┌─────────────────────────────────────────────────────────┐
│           Next.js 16 App Router + API Routes            │
│  ├─ app/api/auth/* (signup, login, logout)             │
│  ├─ app/api/contacts/* (CRUD + tags)                   │
│  ├─ app/api/activities/* (logging)                     │
│  ├─ app/api/followups/* (reminders)                    │
│  ├─ app/api/tags/* (management)                        │
│  └─ app/api/exports/* (CSV)                            │
└────────────────────────┬────────────────────────────────┘
                         │ Prisma ORM
                         ↓
┌─────────────────────────────────────────────────────────┐
│         PostgreSQL Database (Supabase)                   │
│  ├─ User (auth)                                         │
│  ├─ Contact (core entity)                               │
│  ├─ Activity (logging)                                  │
│  ├─ Tag (organization)                                  │
│  ├─ ContactTag (many-to-many)                           │
│  └─ FollowUp (reminders, stored in Activity)            │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Single Responsibility:** API routes handle one entity type (contacts, activities, etc.)
2. **Stateless APIs:** No server-side state beyond the database; authentication via JWT cookies
3. **Soft Delete Pattern:** All deletes are logical (set `deletedAt` timestamp) for recovery and audit trails
4. **Session-Based Auth:** JWT encrypted in secure httpOnly cookies, validated on protected endpoints
5. **Pagination:** Backend handles pagination; frontend requests one page at a time
6. **Optimistic Updates:** Frontend refetches data after mutations instead of relying on response bodies

---

## Technology Stack

### Backend

- **Framework:** Next.js 16 (App Router, API Routes)
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **ORM:** Prisma 7 with PostgreSQL adapter
- **Database:** PostgreSQL 14+ (Supabase managed)
- **Auth:** JWT in secure httpOnly cookies (hand-rolled, no library)
- **Password Hashing:** bcrypt

### Frontend

- **Framework:** React 18 (via Next.js)
- **Styling:** Tailwind CSS
- **UI Components:** Custom (Radix UI primitives where needed)
- **Tables:** TanStack React Table
- **Icons:** Lucide React
- **Toasts:** Sonner
- **Rich Text:** Custom HTML editor (contentEditable)
- **State:** React hooks (useState, useEffect, useRef, useReducer)

### DevOps & Deployment

- **Hosting:** Vercel (serverless)
- **Database:** Supabase PostgreSQL (managed)
- **VCS:** GitHub
- **CI/CD:** Vercel auto-deploy on push to main
- **Monitoring:** Vercel dashboard, Supabase studio

### Development Tools

- **Package Manager:** npm
- **Linting:** ESLint
- **Code Formatting:** Prettier
- **Database CLI:** Prisma Studio, Supabase CLI

---

## Database Schema

### Core Tables

#### User

```sql
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hash
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:** email (unique)
**Notes:** No soft delete for users (accounts are final)

#### Contact

```sql
CREATE TABLE "Contact" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  jobTitle TEXT,
  type TEXT NOT NULL,  -- enum: FEDERAL, PROVINCIAL, US, INVESTOR, CUSTOMER, PARTNER, OTHER
  address TEXT,
  notes TEXT,  -- HTML content
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP  -- soft delete
);
```

**Indexes:** type, organization, deletedAt
**Relations:** activities[], tags[], followUps[]

#### Activity

```sql
CREATE TABLE "Activity" (
  id TEXT PRIMARY KEY,
  contactId TEXT NOT NULL REFERENCES "Contact"(id),
  type TEXT NOT NULL,  -- enum: CALL, EMAIL, MEETING, NOTE
  notes TEXT,  -- HTML content
  occurredAt TIMESTAMP NOT NULL,
  followUpAt TIMESTAMP,  -- when to follow up (if set)
  followUpStatus TEXT,  -- enum: PENDING, COMPLETED, CANCELLED (null if not a follow-up)
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP  -- soft delete
);
```

**Indexes:** contactId, deletedAt, followUpAt
**Relations:** contact, userId (from session)

#### Tag

```sql
CREATE TABLE "Tag" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,  -- hex color (e.g., "#6b7280")
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP  -- soft delete
);
```

**Constraints:** (name, deletedAt) UNIQUE (so you can reuse tag names after deletion)
**Indexes:** deletedAt
**Relations:** contacts[]

#### ContactTag (Junction)

```sql
CREATE TABLE "ContactTag" (
  contactId TEXT NOT NULL REFERENCES "Contact"(id) ON DELETE CASCADE,
  tagId TEXT NOT NULL REFERENCES "Tag"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contactId, tagId)
);
```

**Indexes:** contactId, tagId
**Notes:** Junction table enables many-to-many; ON DELETE CASCADE keeps data consistent

### Relationships Diagram

```
User
  └─ (implicit) ← Activities (stored in session, not FK)

Contact
  ├─ 1:N ─→ Activity
  ├─ M:N ─→ Tag (via ContactTag)
  └─ (soft delete) ─→ deletedAt

Tag
  ├─ M:N ─→ Contact (via ContactTag)
  └─ (soft delete) ─→ deletedAt

ContactTag
  ├─ FK ─→ Contact (on delete cascade)
  ├─ FK ─→ Tag (on delete cascade)
  └─ (junction) ─→ enables many-to-many
```

---

## API Documentation

### Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://harmelo-crm.vercel.app` (TBD)

### Authentication

All endpoints except `/auth/signup` and `/auth/login` require a valid session cookie. The session is a JWT encrypted and stored in a secure httpOnly cookie named `session`.

**How it works:**

1. User logs in → `POST /api/auth/login` → receives `session` cookie
2. Browser automatically sends cookie with every request
3. Protected endpoints read the `session` cookie and decrypt it
4. If valid, the endpoint proceeds; if invalid, returns 401

### Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Status codes:

- `400` — Bad request (validation failed)
- `401` — Unauthorized (not logged in)
- `404` — Not found (resource doesn't exist)
- `500` — Server error (bug in the code)

---

### Authentication Endpoints

#### POST /api/auth/signup

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response (201):**

```json
{
  "id": "user_123",
  "email": "user@example.com"
}
```

**Errors:**

- `400` — Email invalid or duplicate
- `500` — Password hashing failed

---

#### POST /api/auth/login

Log in and receive a session cookie.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response (200):**

```json
{
  "email": "user@example.com"
}
```

**Headers:** Sets `Set-Cookie: session=<JWT>`

**Errors:**

- `400` — Email or password incorrect (generic message to avoid leaking account existence)

---

#### POST /api/auth/logout

Destroy the session cookie.

**Request:** (empty body)

**Response (200):**

```json
{
  "success": true
}
```

**Headers:** Clears `session` cookie

---

### Contact Endpoints

#### GET /api/contacts

List contacts with pagination, search, and filtering.

**Query Parameters:**

```
?page=1
&limit=20
&search=john              // searches name, email, organization
&type=FEDERAL             // filter by contact type (comma-separated)
&tagIds=tag1,tag2         // filter by tags (comma-separated IDs)
```

**Response (200):**

```json
{
  "contacts": [
    {
      "id": "contact_1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "123-456-7890",
      "organization": "Acme Inc.",
      "jobTitle": "VP Sales",
      "type": "FEDERAL",
      "address": "123 Main St",
      "notes": "<p>Good contact</p>",
      "createdAt": "2026-07-01T10:00:00Z",
      "tags": [
        { "id": "tag_1", "name": "VIP" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

**Requires:** Session (authenticated)

---

#### GET /api/contacts/:id

Get a single contact by ID.

**Response (200):**

```json
{
  "id": "contact_1",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "organization": "Acme Inc.",
  "jobTitle": "VP Sales",
  "type": "FEDERAL",
  "address": "123 Main St",
  "notes": "<p>Good contact</p>",
  "createdAt": "2026-07-01T10:00:00Z",
  "tags": [
    { "id": "tag_1", "name": "VIP" }
  ]
}
```

**Errors:**

- `404` — Contact not found or soft-deleted

**Requires:** Session (authenticated)

---

#### POST /api/contacts

Create a new contact with optional tags.

**Request:**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-123-4567",
  "organization": "XYZ Corp",
  "jobTitle": "Director",
  "type": "PROVINCIAL",
  "address": "456 Oak St",
  "notes": "<p>Initial notes</p>",
  "tagIds": ["tag_1", "tag_2"]
}
```

**Response (201):**

```json
{
  "id": "contact_2",
  "name": "Jane Smith",
  "email": "jane@example.com",
  ...
  "tags": [
    { "id": "tag_1", "name": "VIP" },
    { "id": "tag_2", "name": "Lead" }
  ]
}
```

**Errors:**

- `400` — Missing required fields (name, email, type)
- `400` — Invalid contact type

**Requires:** Session (authenticated)

---

#### PUT /api/contacts/:id

Update a contact. Only fields sent in the request are updated.

**Request:**

```json
{
  "name": "Jane Smith Updated",
  "tagIds": ["tag_1", "tag_3"]
}
```

**Response (200):** Updated contact object (same as POST response)

**Errors:**

- `404` — Contact not found

**Requires:** Session (authenticated)

---

#### DELETE /api/contacts/:id

Soft-delete a contact (sets `deletedAt` timestamp).

**Response (200):**

```json
{
  "success": true
}
```

**Errors:**

- `404` — Contact not found

**Requires:** Session (authenticated)

---

### Tag Endpoints

#### GET /api/tags

List all tags with contact counts.

**Response (200):**

```json
{
  "tags": [
    {
      "id": "tag_1",
      "name": "VIP",
      "color": "#6b7280",
      "createdAt": "2026-07-01T10:00:00Z",
      "contactCount": 5
    },
    {
      "id": "tag_2",
      "name": "Lead",
      "color": "#dc2626",
      "createdAt": "2026-07-02T11:00:00Z",
      "contactCount": 12
    }
  ]
}
```

**Requires:** Session (authenticated)

---

#### POST /api/tags

Create a new tag.

**Request:**

```json
{
  "name": "Prospect",
  "color": "#3b82f6"
}
```

**Response (201):**

```json
{
  "id": "tag_3",
  "name": "Prospect",
  "color": "#3b82f6",
  "createdAt": "2026-07-03T12:00:00Z",
  "contactCount": 0
}
```

**Errors:**

- `400` — Tag name already exists
- `400` — Invalid color format

**Requires:** Session (authenticated)

---

#### DELETE /api/tags/:id

Delete a tag and remove from all contacts (cascade delete).

**Response (200):**

```json
{
  "success": true
}
```

**Errors:**

- `404` — Tag not found

**Requires:** Session (authenticated)

---

### Activity Endpoints

#### POST /api/activities

Log an activity on a contact.

**Request:**

```json
{
  "contactId": "contact_1",
  "type": "CALL",
  "notes": "<p>Had a great conversation</p>",
  "occurredAt": "2026-07-10T15:00:00Z",
  "followUpAt": "2026-07-17T10:00:00Z",
  "followUpStatus": "PENDING"
}
```

**Response (201):** Activity object with contact and user details

**Errors:**

- `400` — Missing required fields
- `404` — Contact not found

**Requires:** Session (authenticated)

---

#### DELETE /api/activities/:id

Delete an activity.

**Response (200):**

```json
{
  "success": true
}
```

**Requires:** Session (authenticated)

---

### Follow-up Endpoints

#### GET /api/followups

Get pending follow-ups (for dashboard).

**Query Parameters:**

```
?from=2026-07-01T00:00:00Z
&to=2026-07-31T23:59:59Z
```

**Response (200):**

```json
{
  "followups": [
    {
      "id": "activity_1",
      "contactId": "contact_1",
      "contact": {
        "id": "contact_1",
        "name": "John Doe",
        "organization": "Acme Inc.",
        "type": "FEDERAL"
      },
      "type": "CALL",
      "notes": "<p>Follow up on proposal</p>",
      "followUpAt": "2026-07-15T10:00:00Z",
      "followUpStatus": "PENDING"
    }
  ]
}
```

**Requires:** Session (authenticated)

---

### Export Endpoints

#### GET /api/exports/contacts

Export contacts to CSV.

**Query Parameters:**

```
?search=john
&type=FEDERAL
&tagIds=tag_1,tag_2
```

**Response (200):** CSV file with `Content-Disposition: attachment`

**CSV Format:**

```
Name,Email,Phone,Organization,Job Title,Type,Address,Tags,Notes,Created At
John Doe,john@example.com,123-456-7890,Acme Inc.,VP Sales,FEDERAL,123 Main St,"VIP; Lead","<p>Notes</p>",2026-07-01T10:00:00Z
```

**Requires:** Session (authenticated)

---

#### GET /api/exports/activities

Export activities to CSV.

**Response (200):** CSV file with `Content-Disposition: attachment`

**CSV Format:**

```
Contact Name,Activity Type,Notes,Occurred At,Follow-up At,Follow-up Status,Created At
John Doe,CALL,"<p>Good call</p>",2026-07-10T15:00:00Z,2026-07-17T10:00:00Z,PENDING,2026-07-10T15:00:00Z
```

**Requires:** Session (authenticated)

---

## Authentication & Authorization

### Session Flow

1. **Signup**

   - User enters email + password
   - Backend hashes password with bcrypt (10 rounds)
   - Creates user in database
   - Returns success (user must log in separately)
2. **Login**

   - User enters email + password
   - Backend fetches user by email
   - Compares password against stored hash
   - On success: creates JWT with `{ userId, email }` and signs it
   - Encrypts JWT and stores in secure httpOnly cookie named `session`
   - Cookie has 7-day expiration (set in `lib/session.ts`)
3. **Authenticated Request**

   - Browser automatically sends `session` cookie
   - Endpoint reads `cookies()` and extracts `session`
   - Decrypts JWT and validates signature
   - Confirms user still exists in database
   - Proceeds with operation
4. **Logout**

   - Clear the `session` cookie
   - Cookie deletion causes browser to stop sending it

### Security Practices

- **Passwords:** Never stored in plaintext; always bcrypt with 10 rounds
- **Sessions:** JWT signed and encrypted; secure httpOnly (not accessible from JavaScript)
- **Errors:** Login errors are generic ("Email or password incorrect") to avoid leaking account existence
- **CORS:** Not needed (same-origin requests only)
- **HTTPS:** Enforced on production (Vercel auto-redirects)

### Authorization

Currently, a simple role model: **authenticated = authorized**. Once logged in, users can see/edit/delete all data. No per-resource ACLs.

**Future:** If multi-user teams are added, would need role-based access (e.g., admin vs. viewer).

---

## Deployment & DevOps

### Vercel Deployment

**Current Setup:**

- GitHub repository connected to Vercel
- Auto-deploy on push to `main` branch
- Environment variables configured in Vercel dashboard

**Environment Variables (Required):**

```
DATABASE_URL=postgresql://user:password@host.supabase.co:5432/postgres
NEXTAUTH_SECRET=<random 32+ character string>
```

**Build & Deploy:**

1. Push to `main` → GitHub notifies Vercel
2. Vercel clones repo, runs `npm install` and `npm run build`
3. TypeScript compiled, Next.js optimized
4. Deployed to Vercel's edge network
5. Deployed URL: https://harmelo-crm.vercel.app (TBD)

### Database (Supabase)

**Setup:**

- PostgreSQL 14+ hosted on Supabase
- Uses both pooled connection (for app) and direct connection (for migrations)

**Migrations:**

```bash
npx prisma migrate deploy  # Applies pending migrations
npx prisma migrate dev --name migration_name  # Creates new migration
npx prisma db push  # Syncs schema to database (dev only)
```

**Backup & Recovery:**

- Supabase handles automated daily backups (14-day retention)
- Manual backup available via Supabase dashboard
- To restore: request from Supabase dashboard

### Monitoring

**Vercel Dashboard:**

- Build logs (success/failure)
- Function execution time
- Edge network performance

**Supabase Dashboard:**

- Database performance metrics
- Connection pool status
- Slow query log

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- A code editor (VS Code recommended)

### Local Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/oomuh570/harmelo-crm.git
   cd harmelo-crm
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Create .env.local**

   ```bash
   cp .env.example .env.local
   ```

   Fill in (ask team lead):

   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=<generate random string>
   ```
4. **Set up database**

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
5. **Start dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000

### Available Scripts

```bash
npm run dev          # Start dev server (with hot reload)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npx prisma studio   # Open Prisma Studio (database GUI)
npx prisma migrate  # Database migration tools
```

### Testing Locally

**Create test user:**

1. Go to http://localhost:3000/signup
2. Enter email + password
3. Click "Sign Up"
4. Go to http://localhost:3000/login
5. Log in with credentials
6. You're in the app

**Test API directly:**

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login
curl -i -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Authenticated request (uses saved cookies)
curl -b /tmp/cookies.txt http://localhost:3000/api/contacts
```

---

## Project Structure

```
harmelo-crm/
├── app/                           # Next.js App Router
│   ├── api/                       # API routes (backend)
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   ├── contacts/
│   │   │   ├── route.ts           # GET (list), POST (create)
│   │   │   └── [id]/route.ts      # GET, PUT, DELETE
│   │   ├── activities/
│   │   │   ├── route.ts           # GET, POST
│   │   │   └── [id]/route.ts      # DELETE
│   │   ├── followups/
│   │   │   ├── route.ts           # GET
│   │   │   └── [id]/route.ts      # PUT
│   │   ├── tags/
│   │   │   ├── route.ts           # GET, POST
│   │   │   └── [id]/route.ts      # DELETE
│   │   └── exports/
│   │       ├── contacts/route.ts
│   │       └── activities/route.ts
│   │
│   ├── (auth)/                    # Route group for auth pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── _dashboard/                # Dashboard & shared components
│   │   ├── page.tsx
│   │   └── export-activities-button.tsx
│   │
│   ├── contacts/                  # Contacts feature
│   │   ├── page.tsx               # List page
│   │   ├── contacts-table.tsx     # Table + filters + search
│   │   ├── columns.tsx            # Table column definitions
│   │   ├── add-contact-form.tsx
│   │   ├── edit-contact-form.tsx
│   │   ├── tag-picker.tsx
│   │   ├── contacts-filter.tsx
│   │   ├── contact.ts             # Type definitions
│   │   └── export-contacts-button.tsx
│   │
│   ├── activities/                # Activities feature
│   │   ├── page.tsx
│   │   ├── activities-table.tsx
│   │   └── columns.tsx
│   │
│   ├── tags/                      # Tags management
│   │   ├── page.tsx
│   │   └── tags-manager.tsx
│   │
│   └── components/                # Shared UI components
│       ├── sidebar.tsx
│       ├── data-table.tsx         # Generic table component
│       └── ...
│
├── lib/                           # Utility functions & config
│   ├── prisma.ts                  # Prisma client
│   ├── session.ts                 # JWT encryption/decryption
│   └── generated/prisma/          # Prisma generated types
│
├── prisma/                        # Database
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration history
│
├── public/                        # Static assets
│   └── favicon.ico
│
├── .env.example                   # Example env vars
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── next.config.js                 # Next.js config
├── tailwind.config.js             # Tailwind CSS config
└── README.md                      # Project overview

Design Docs (at project root):
└── TECHNICAL_DOCUMENTATION.md     # This file
```

---

## Key Design Decisions

### 1. Soft Delete Pattern

**Decision:** All deletes are logical (set `deletedAt` timestamp) rather than hard deletes.

**Rationale:**

- Allows recovery if user deletes by mistake
- Preserves audit trail for compliance
- Maintains referential integrity (activities still point to contact)

**Implementation:**

- Every table has `deletedAt TIMESTAMP` column
- Queries filter `where: { deletedAt: null }`
- Unique constraints include `deletedAt` (allows reusing deleted names)

---

### 2. Custom Tag System with Junction Table

**Decision:** Custom tags in Tag table + ContactTag junction (not hardcoded enum, not JSON array).

**Rationale:**

- Scalable: Adding tags doesn't require migrations
- Queryable: `tags: { some: { tagId: { in: [ids] } } }` is efficient
- Reusable: One tag used across many contacts
- Taggable: Can add tag counts, colors, metadata later

**Compared to alternatives:**

- Enum: Would require migration to add/remove tags
- JSON array: Can't filter efficiently, can't count, denormalized

---

### 3. Activities for Follow-ups (Not Separate Table)

**Decision:** Follow-ups stored as activities with `followUpAt` + `followUpStatus` fields (not separate FollowUp table).

**Rationale:**

- Follow-up is just an activity with a date and status
- Reduces table count and complexity
- Avoids duplicate logging (activity + follow-up)

**Schema:**

- `Activity.followUpAt` — when the follow-up should happen
- `Activity.followUpStatus` — PENDING, COMPLETED, CANCELLED (null if not a follow-up)

---

### 4. Hand-Rolled Authentication (No Library)

**Decision:** Build auth from scratch with bcrypt + JWT (not Auth0, Supabase Auth, next-auth, etc.).

**Rationale:**

- Full control over flow and data storage
- Simpler for this project's single-user scope
- Easier to debug and audit
- No vendor lock-in

**Trade-off:** Responsible for security (password hashing, CSRF protection, session invalidation)

---

### 5. Pagination on Backend (Not Frontend Caching)

**Decision:** Backend handles pagination; frontend requests one page at a time.

**Rationale:**

- Respects data freshness (always current)
- Handles large datasets (1000+ records) efficiently
- Simpler state management (no need to cache all pages)

**Trade-off:** Navigation feels slightly slower (HTTP request per page), but cache could be added if needed.

---

### 6. CSV Export with HTML Stripping

**Decision:** Store notes as HTML but strip tags on export for CSV.

**Rationale:**

- Rich text is useful in app (bold, italic, links)
- CSV can't render HTML; stripped plain text is cleaner
- Regex stripping is simple and fast

---

---

**Document Version:** 1.0
**Last Updated:** July 14, 2026
**Maintained by:** Ochihai (Backend)
