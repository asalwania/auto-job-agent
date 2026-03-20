# Job Agent

Automated job scraping, AI resume tailoring, and application tracking system built with Next.js, Claude AI, and Playwright.

## What It Does

Job Agent runs a fully automated job hunt pipeline. It scrapes job listings from LinkedIn, Naukri, Greenhouse, Lever, and Wellfound, then uses Claude AI to analyze each job description, tailor your resume for maximum ATS score, generate a custom cover letter, and optionally auto-apply. A dark-themed dashboard lets you monitor everything, review tailored resumes before applying, and track application responses.

## Architecture

The system runs in 5 phases:

```
Scrape → Parse → Tailor → Apply → Track
```

1. **Scrape** — Playwright-based scrapers (LinkedIn, Naukri, Wellfound) and API-based scrapers (Greenhouse, Lever) collect job listings on a daily schedule via BullMQ
2. **Parse** — Claude AI analyzes each job description to extract required skills, keywords, role level, and ATS-relevant metadata
3. **Tailor** — Claude rewrites your resume bullets to mirror JD keywords, generates a tailored PDF, and scores it against the job (0–100 ATS score)
4. **Apply** — Playwright automates Easy Apply on LinkedIn and form submissions on Greenhouse/Lever portals (manual mode recommended)
5. **Track** — Dashboard tracks all applications, response statuses, and provides analytics on your job search pipeline

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | Required for Next.js 16 |
| Redis | BullMQ job queue backend |
| Supabase account | Free tier works — used for PostgreSQL database |
| Anthropic API key | Powers JD parsing, resume tailoring, and cover letters |
| Resend API key | Optional — for email notifications |

Start Redis with Docker:

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

## Setup

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Configure environment

Copy `.env.local` and fill in your keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_...            # optional
MY_EMAIL=you@example.com
MY_PHONE=+91XXXXXXXXXX
MY_LINKEDIN_EMAIL=               # optional, for Easy Apply
MY_LINKEDIN_PASSWORD=            # optional, for Easy Apply
CRON_SECRET=your-secret-here
```

### 3. Create the database

Open the Supabase SQL Editor and paste the contents of `src/lib/db/schema.sql`, then run it. This creates all tables, indexes, RLS policies, and the `updated_at` trigger.

### 4. Set up your resume

Edit `src/lib/resume/base-resume.ts` with your real data, then seed it into Supabase:

```bash
npm run seed
```

### 5. Run integration tests

```bash
npm run test:integration
```

This tests: database connection, Claude API, resume tailoring, PDF generation, BullMQ queue, and scraper initialization.

### 6. Start the app

```bash
# Start Next.js + BullMQ workers together
npm run dev:all

# Or run them separately
npm run dev        # Next.js on port 3000
npm run worker:dev # BullMQ workers + health check on port 3001
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Settings** — Configure job titles to search for, preferred locations, ATS score threshold, and which sources to scrape
2. **Settings — Run Scraper Now** or wait for the daily 8:00 AM IST cron
3. **Jobs Queue** — Review scraped jobs. Tailoring runs automatically for new jobs
4. **Jobs Queue** — Click any job to see the tailored resume preview, ATS keyword coverage, and cover letter
5. **Jobs Queue** — Click "Apply" for approved jobs (manual mode) or enable auto-apply in settings
6. **Applications** — Track responses, update statuses manually (viewed, interview, offer, rejected)
7. **Analytics** — View trends, ATS score distribution, top skills, and pipeline stats

## Important: Auto-Apply Warning

> **Auto-apply is OFF by default.** Enable it carefully in Settings — Automation.

- LinkedIn's Terms of Service prohibit automation. Use at your own risk.
- **Recommended approach:** Let the AI handle resume tailoring and cover letter generation, then apply manually through the dashboard's "Apply" button.
- When auto-apply is enabled, a confirmation dialog warns you before activation.
- The system takes screenshots of each application for audit purposes (stored in `./storage/screenshots/`).

## Folder Structure

```
src/
├── app/
│   ├── (dashboard)/           # Dashboard pages (route group)
│   │   ├── page.tsx           # Overview / home
│   │   ├── jobs/              # Job queue management
│   │   ├── applications/      # Application tracker
│   │   ├── analytics/         # Charts and stats
│   │   └── settings/          # Configuration
│   ├── api/
│   │   ├── cron/scrape/       # Cron-triggered scraping
│   │   ├── jobs/              # Job CRUD + tailor/apply actions
│   │   ├── resume/            # Base resume + tailored preview
│   │   └── stats/             # Dashboard statistics
│   └── layout.tsx             # Root layout with fonts
├── components/
│   ├── ui/                    # Stat cards, badges, tag input, etc.
│   ├── jobs/                  # Job detail modal
│   └── applications/
├── lib/
│   ├── scrapers/              # LinkedIn, Naukri, Greenhouse, Lever, Wellfound
│   ├── ai/                    # JD parser, resume tailor, cover letter generator
│   ├── queue/                 # BullMQ queues, workers, scheduler, Redis config
│   ├── apply/                 # Auto-apply: LinkedIn Easy Apply, direct portal
│   ├── db/                    # Supabase client, CRUD for jobs/resumes/applications
│   ├── resume/                # PDF builder, base resume, seeder, storage
│   ├── notifications/         # Email notifications via Resend
│   └── utils/                 # cn() helper
├── hooks/                     # useJobs, useSettings
├── types/                     # TypeScript types + Supabase database types
├── server/
│   ├── worker.ts              # Standalone BullMQ worker process
│   └── health.ts              # Health check HTTP server (port 3001)
└── tests/
    └── integration.ts         # Full pipeline integration tests
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| AI | Claude claude-sonnet-4-20250514 via @anthropic-ai/sdk |
| Database | Supabase (PostgreSQL) |
| Job Queue | BullMQ + Redis |
| Scraping | Playwright (Chromium) |
| PDF | pdf-lib |
| Email | Resend |
| Charts | Recharts |
| Icons | Lucide React |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `REDIS_URL` | Yes | Redis connection string (default: `redis://localhost:6379`) |
| `RESEND_API_KEY` | No | Resend API key for email notifications |
| `MY_EMAIL` | No | Your email for notifications |
| `MY_PHONE` | No | Phone number for job application forms |
| `MY_LINKEDIN_EMAIL` | No | LinkedIn login for Easy Apply automation |
| `MY_LINKEDIN_PASSWORD` | No | LinkedIn password for Easy Apply automation |
| `CRON_SECRET` | No | Secret header for cron endpoint authentication |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run worker` | Start BullMQ workers |
| `npm run worker:dev` | Start workers with auto-reload |
| `npm run dev:all` | Start Next.js + workers concurrently |
| `npm run seed` | Seed base resume into Supabase |
| `npm run test:integration` | Run integration tests |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

## Known Limitations

- **CAPTCHA handling is basic** — scrapers detect CAPTCHAs and skip, but cannot solve them. Manual intervention may be needed for LinkedIn/Naukri.
- **LinkedIn login required** — Easy Apply and full JD extraction require LinkedIn authentication. Without credentials, the scraper falls back to public data.
- **Anti-bot detection** — Some job boards block headless browsers. The scrapers use random user agents, viewports, and delays, but persistent scraping from one IP may trigger blocks.
- **Greenhouse/Lever company lists are static** — The API scrapers use a hardcoded list of companies. Add or remove companies in the respective scraper files.
- **No resume format customization** — The PDF builder generates a fixed layout. For different designs, modify `src/lib/resume/pdf-builder.ts`.
- **Email sending requires Resend** — Notifications are a no-op without a valid `RESEND_API_KEY`. The app works fine without it.
- **Queue requires Redis** — BullMQ needs a running Redis instance. The Next.js dashboard works without Redis, but scraping/tailoring/applying won't process.
