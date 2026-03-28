# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GOODHR is a Thai-language HRMS (Human Resource Management System) built with **Next.js 14** and **Supabase** (PostgreSQL + Auth + Storage). It manages employees, attendance (GPS-verified), leave, payroll, KPIs, and chat across multiple companies and branches. Deployed on Netlify.

## Commands

```bash
npm run dev      # Dev server on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals)
npm start        # Start production server
```

No test framework is configured.

## Architecture

### Route Groups (Next.js App Router)

- `src/app/(auth)/login/` — Public login (email + Google OAuth)
- `src/app/(app)/` — Employee mobile-first UI (checkin, leave, payslip, chat, etc.)
- `src/app/(manager)/` — Manager UI (team management, approvals, calendar)
- `src/app/(admin)/` — HR admin web dashboard (employees, payroll, shifts, KPI, org)
- `src/app/api/` — 42 API routes organized by feature

### Role-Based Access (4 roles)

Enforced in `src/middleware.ts`:
- `super_admin` / `hr_admin` → `/admin/*`
- `manager` → `/manager/*` + `/app/*`
- `employee` → `/app/*` only

### Key Libraries

- `src/lib/supabase/client.ts` — Browser Supabase client (PKCE auth flow)
- `src/lib/supabase/server.ts` — Server Supabase client + service role client for admin ops
- `src/lib/hooks/useAuth.ts` — Auth state, user role, and employee profile
- `src/lib/hooks/useAttendance.ts` / `useLeave.ts` — Data fetching hooks
- `src/lib/utils/attendance.ts` — Geo distance (Haversine), late/work minute calculations, Thai date formatting
- `src/lib/utils/payroll.ts` — Salary, tax, deduction calculations
- `src/lib/resend.ts` — Email service (Resend)

### Types

`src/types/database.ts` contains the complete DB schema types (100+ types covering employees, attendance, shifts, leave, payroll, chat, KPI, transport claims, etc.).

### Database

All data lives in Supabase (PostgreSQL). SQL migration files are in the project root (`supabase_migration.sql` is the main schema). Migration scripts in `scripts/` handle bulk user creation and employee imports.

## Important Patterns

- **Multi-company scoping**: Data is isolated by company_id. Branches, departments, leave types, and payroll rules are company-specific.
- **GPS check-in**: Attendance uses Haversine formula to verify employee location against branch geo-radius. Off-site checkin requires separate approval.
- **Overnight shifts**: Work dates spanning midnight are mapped to the previous calendar day via `calcWorkDate()`.
- **Thai locale**: Dates use `th-TH` locale and Buddhist calendar. Status labels and UI text are primarily in Thai.
- **Admin sidebar badges**: Refresh every 30 seconds showing pending approval counts (leave, OT, time adjustments).
- **ESLint is ignored during build** (`next.config.js` sets `eslint.ignoreDuringBuilds: true`).

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
