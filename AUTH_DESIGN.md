# Authentication Design (T009)

## Approach
Hand-rolled authentication (no library). Continues the existing
server actions and session code already in the repo.

## Decisions
- Account creation: self-registration via a public signup page.

## Signup flow
1. User submits fullName, email, phoneNumber, password on signup page
2. Signup server action validates input format
3. Backend endpoint hashes the password with bcrypt
4. Backend creates a User row in the database
5. Backend returns the new user's id

## Login flow
1. User submits email + password on login page
2. Login server action validates input format
3. Backend endpoint looks up the user by email
4. Backend compares submitted password against the stored bcrypt hash
5. Match -> createSession(userId), redirect to /dashboard
6. No match -> return "Invalid email or password"

## Logout flow
1. User triggers logout
2. deleteSession() removes the session cookie
3. Redirect to login page

## Passwords
Hashed with bcrypt before storing. Raw passwords are never stored
and never logged.

## Sessions
JWT stored in an httpOnly, secure cookie. 7-day expiry.
Handled by lib/session.ts (createSession / deleteSession / decrypt).
Requires a SESSION_SECRET environment variable.

## User table fields
- id           auto-generated unique ID
- fullName     text, required
- email        text, required, unique
- phoneNumber  text, optional
- password     text (bcrypt hash), required
- createdAt    auto timestamp

## To do in T010 (build phase)
- Add SESSION_SECRET to .env.local, .env.example, and Vercel
- Create lib/prisma.ts (database client helper)
- Add the User model to prisma/schema.prisma and run the migration
- Build the signup backend endpoint
- Build the login backend endpoint
- Build the logout backend endpoint