# Parish Hall

*Modern church management software (ChMS) — built to compete with Planning Center, Breeze, and Church Community Builder*

---

## What It Is

**Parish Hall** is a multi-tenant SaaS church management platform built for growing congregations. It handles everything a church staff needs: member directories, group management, service planning, event scheduling, online giving, communications, and visitor follow-up.

### Value Proposition
- **Beautiful, intuitive UI** — Not clunky enterprise software
- **Flat pricing** — Pay for church size, not per-module
- **Modern tech stack** — Fast, reliable, mobile-first
- **Designed for ACNA/Christian contexts** — Built by someone who understands liturgical churches

---

## Current Status

**Phase:** MVP built, actively iterating  
**Go-to-market:** Design partner program (churches using it in production for feedback)  
**Live URL:** https://app.parishhall.org  
**Marketing:** https://parishhall.org (Astro site)

---

## Architecture

### Frontend (React SPA)
| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript (strict) |
| Router | TanStack Router (file-based routing) |
| State/Query | TanStack Query + TanStack Virtual |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| Forms | React Hook Form + Zod |
| Auth | Clerk (authentication) |
| UI | shadcn/ui-style components (CVA) |
| Icons | Lucide React |
| Testing | Vitest + Testing Library (unit), Playwright (e2e) |

### Backend (Convex Cloud)
| Layer | Technology |
|-------|------------|
| Database | Convex (reactive, real-time) |
| Auth | Clerk integration |
| Payments | Stripe (subscriptions + giving) |
| Email | Resend |
| Functions | Convex queries/mutations/actions |

### Deployment
- **App:** Cloudflare Workers (edge deployment)
- **Backend:** Convex Cloud
- **Marketing:** Cloudflare Workers (Astro static site)

### Repos
- **App:** `/repos/parish-hall` — Main application codebase
- **Marketing:** `/repos/parish-hall-marketing` — Landing page, pricing, docs

---

## Feature Modules

### Core Platform
- **Multi-tenancy:** Each church is an isolated organization
- **RBAC:** 10 role levels (superadmin → member) with granular permissions
- **Branding:** Custom logos, colors, favicons per church
- **Import:** Planning Center OAuth integration, Breeze API import

### Congregation
- People profiles with custom fields
- Households/family connections
- Directory with privacy controls (tiered visibility)
- Profile timeline & activity history
- Visitor journey workflows (automated follow-up)

### Groups
- Small groups, classes, ministries
- Recurring meeting schedules
- Attendance tracking
- Member RSVP system
- Leader management

### Services & Scheduling
- Service templates (plans)
- Team scheduling (worship teams, volunteers)
- Song library with CCLI integration
- Role assignments
- Check-in via kiosk or app

### Events
- Calendar management
- Room booking
- Recurring events
- Attendance tracking

### Giving
- Online giving (Stripe-powered)
- Recurring donations
- Batch entry for offline gifts
- Tax statements
- Multiple funds

### Communications
- Email campaigns (segment-based)
- Automated workflows (visitor journeys)
- Email templates with branding

### Pastoral Care
- Private notes (pastoral team only)
- Prayer requests
- Follow-up reminders
- Visibility levels (private → public)

### Member Portal
- Member-facing app access
- Profile editing
- Group participation
- Giving history
- Directory opt-in

---

## Database Schema Overview

**Core Tables:**
- `organizations` — Tenants (churches)
- `users` — Clerk-synced user accounts
- `orgMembers` — User-org relationship + role
- `people` — Congregation members
- `households` — Family units

**Feature Tables:**
- `groups`, `groupMembers`, `groupMeetings`, `groupScheduleExceptions`
- `events`, `eventOccurrences`, `attendance`, `checkInSessions`
- `funds`, `donations`, `givingBatches`, `recurringDonations`
- `campaigns`, `segments`, `emailRecipients`
- `notes` (pastoral care)
- `songs`, `scheduling` tables, `servicePlanner` tables

**System Tables:**
- `integrations` — OAuth connections (Planning Center, etc.)
- `importJobs` — Data migration tracking
- `auditLogs` — Activity logging
- `subscriptions`, `invoices` — Billing
- `joinCodes` — Member onboarding
- `portalInvites`, `profileClaims` — Member portal access

---

## Pricing Model

| Plan | Price | Members | Key Features |
|------|-------|---------|--------------|
| **Free** | $0 | Up to 50 | People, Groups, Basic check-in |
| **Starter** | $49/mo | Up to 200 | + Services, Online giving, Email, Reporting |
| **Growth** | $99/mo | Up to 500 | + Automation, API access, Priority support |
| **Enterprise** | Custom | 500+ | Dedicated support, custom integrations |

**Giving fees:** 2.2% + $0.30 per transaction (nonprofit Stripe rates)

---

## Key Technical Decisions

### Why Convex?
- Real-time reactive database (no polling needed)
- Built-in auth integration
- Automatic caching and invalidation
- Type-safe queries
- Good fit for multi-tenant SaaS

### Why TanStack Router?
- File-based routing (cleaner than React Router)
- Type-safe routing
- Built-in data loading
- Works well with TanStack Query

### Why Clerk?
- Handles auth complexity (OAuth, MFA, sessions)
- User management UI out of the box
- Easy integration with Convex
- Good DX

### Multi-tenancy Strategy
- Every query/mutation scoped by `orgId`
- Org membership verified on every request
- Indexed queries by org for performance
- Soft delete with `deletedAt` for recoverability

### Role Hierarchy
```
superadmin (110) > owner (100) > admin (90) > pastor (70) > 
finance (60) > staff (50) > group_leader (30) > volunteer (20) > member (10)
```

---

## Development Workflow

### Commands
```bash
# Development
bun run dev              # Start web + convex dev servers
bun run dev:web          # Vite dev only
bun run dev:convex       # Convex dev only

# Build & Deploy
bun run build            # Production build
bun run deploy           # Build + wrangler deploy

# Testing
bun run test             # Unit tests (Vitest)
bun run test:e2e         # E2E tests (Playwright)
bun run lint             # TypeScript + ESLint
bun run format           # Prettier
```

### Environment Variables
- `VITE_CONVEX_URL` — Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend key
- Backend secrets managed in Convex dashboard

---

## Current Development Focus

Based on recent commits and CLAUDE.md:

1. **Visitor Journey workflows** — Automated follow-up sequences
2. **Service planning** — Song management, team scheduling
3. **Check-in system** — Kiosk and mobile check-in
4. **Communications** — Email campaigns, segments
5. **Import tools** — Planning Center OAuth, Breeze API
6. **Mobile responsiveness** — Member portal on phones

---

## Competitive Position

**vs Planning Center:**
- Pros: Flat pricing (not per-module), modern UI, easier setup
- Cons: Less mature, smaller ecosystem

**vs Breeze:**
- Pros: More features (service planning, giving), better UX
- Cons: More expensive at scale

**vs Church Community Builder:**
- Pros: Modern tech, better mobile experience
- Cons: Smaller customer base, less proven

---

## Risks & Challenges

1. **Market saturation** — Established players have deep moats
2. **Feature breadth** — ChMS needs many features; hard to compete on breadth
3. **Church buying cycles** — Slow sales, committee decisions
4. **Data migration** — Churches locked into existing platforms
5. **Support burden** — Churches need hand-holding

---

## Opportunities

1. **ACNA niche** — Uniquely positioned for Anglican/Anglo-Catholic churches
2. **Modern UX** — Significant differentiator against legacy platforms
3. **AI integration** — Natural fit for writing communications, analyzing data
4. **Design partner feedback** — Building with real churches, not in vacuum

---

## Notes

- **Tech stack choices are modern and solid** — Convex + React 19 + TanStack is a strong foundation
- **Pricing is aggressive** — Free tier and flat pricing will attract smaller churches
- **Import tools are critical** — Making it easy to switch from Planning Center/Breeze reduces friction
- **Member portal needs polish** — This is what members see; first impression matters
- **Mobile experience is essential** — Church staff work on phones/tablets on Sundays

---

*Last updated: February 2026*
