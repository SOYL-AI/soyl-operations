# SOYL Operations Dashboard — Instruction Manual

This manual covers how the app is built, how it runs, what every page does, and the day-to-day flows for each role (CEO / Manager / Employee / Intern).

---

## 1. What this app is

A Next.js 15 + Supabase command-center for SOYL. One dashboard for execution, team performance, and finances, replacing scattered tracking across WhatsApp / Notion / Sheets.

**Stack:**
- **Frontend:** Next.js 15 App Router, React 19, Tailwind, Recharts, lucide icons
- **Backend:** Supabase (Postgres + Auth + Row-Level Security)
- **Hosting:** Vercel
- **Auth:** Email + password, with Supabase email confirmation
- **All authorization:** enforced at the database layer via RLS policies (defined in [supabase/schema.sql](supabase/schema.sql))

**Roles:** `super_admin`, `ceo`, `manager`, `employee`, `intern`. Sidebar navigation, page access, and DB row visibility all key off this role.

- **`super_admin`** ("System admin") — seeded via the `app.super_admin_email` Postgres setting. The first person who signs up with that exact email becomes super_admin automatically; everyone else lands as `employee`. Super admins see every page (including a special **Audit log** view at `/audit`) and have full read/write everywhere. The role cannot be granted, demoted, or transferred from the UI — to change who is super_admin, you change the seeded email and re-run the trigger.
- **`ceo`** — strategic / operational head. Can read everything except `/audit`, can change anyone's role except super_admin, can promote others to CEO.
- **`manager`** — task assignment, finance, performance, role changes for non-CEOs (cannot promote to CEO).
- **`employee` / `intern`** — standard team member access.

---

## 2. How the codebase is organized

```
app/
  page.tsx                    Landing / marketing page (public)
  login/                      /login — email + password sign-in
  signup/                     /signup — registers a new auth user
  auth/callback/              OAuth-style email confirmation redirect target
  auth/signout/               POST endpoint that signs the user out
  (app)/                      Auth-required route group (everything below requires login)
    layout.tsx                Loads profile, renders Sidebar + Topbar shell
    overview/                 /overview — KPIs, charts, recent tasks/projects
    tasks/                    /tasks, /tasks/[id], /tasks/new
    projects/                 /projects, /projects/[id], /projects/new
    team/                     /team — directory + role management
    timeline/                 /timeline — month-grid calendar of due dates
    finance/                  /finance — manager+ only, revenue/expenses
    performance/              /performance — manager+ only, ratings/reviews
    activity/                 /activity — system activity log + your notifications
    audit/                    /audit — super_admin only, security/admin events
    me/                       /me — your tasks, your reviews, profile editing

components/
  Sidebar.tsx                 Filters nav items by role
  Topbar.tsx                  Greeting, notification bell (live unread count), avatar, sign-out
  Avatar.tsx                  Image with dicebear fallback
  Logo.tsx                    Brand mark + lockup
  Kpi.tsx                     Big-number stat card
  PageHeader.tsx              Title / subtitle / action slot
  Empty.tsx                   Empty-state card
  StatusChip.tsx              Color-coded chips for task / project / priority
  charts/
    TrendChart.tsx            Area chart for completions
    StatusDonut.tsx           Donut for task status mix
    ProfitBars.tsx            Grouped bars for revenue vs expense

lib/
  supabase/
    client.ts                 Browser client (used by login/signup/client components)
    server.ts                 Server client (used by all RSCs and server actions)
    middleware.ts             Cookie-aware client used in middleware.ts to refresh sessions
  actions/
    tasks.ts                  Server actions: createTask, updateTaskStatus, addTaskComment, reassignTask, deleteTask
    projects.ts               createProject, updateProjectProgress
    finance.ts                createTransaction, deleteTransaction
    team.ts                   updateMemberRole, updateMyProfile
    reviews.ts                createReview
    notifications.ts          markAllRead
  auth.ts                     getSession, requireUser, getProfile, requireProfile, canManage, isCEO
  types.ts                    TypeScript shapes for Profile, Task, Project, Transaction, etc.
  utils.ts                    cn, formatCurrency, pct, initialsOf, avatarUrl

supabase/
  schema.sql                  Tables, enums, triggers, RLS policies — run this once in Supabase SQL editor
  seed.sql                    Optional sample projects/transactions

middleware.ts                 Wraps every request with session refresh + auth gate
next.config.ts                Server actions config + remote image hosts
tailwind.config.ts            Color palette + font tokens
```

---

## 3. How auth flows

```
visitor → /signup → Supabase auth.signUp()
                  → confirmation email sent
                  → user clicks link → GET /auth/callback?code=…
                  → exchangeCodeForSession()
                  → DB trigger handle_new_user() inserts row in public.profiles
                  → redirect to /overview

visitor → /login → Supabase auth.signInWithPassword()
                  → cookie set
                  → redirect to ?next= or /overview

every request → middleware.ts → updateSession() refreshes the cookie
                              → if no user and not public path: redirect /login?next=<original>
                              → if user on /login or /signup: redirect /overview
```

The `(app)/layout.tsx` does a final guard: it loads the `profiles` row matching the auth user, and if missing (race on first signup), upserts it.

---

## 4. Page-by-page guide

### Public pages

| Path | What it does |
|---|---|
| `/` | Marketing landing. Modules grid, sign-in / sign-up CTAs. |
| `/login` | Email + password sign in. After success, navigates to `?next=` or `/overview`. |
| `/signup` | Creates a Supabase user. **Note:** the role dropdown here is a known security hole — see AUDIT.md §1.2. |
| `/auth/callback` | Receives the `code` from Supabase confirmation emails, exchanges it for a session, redirects to `/overview`. |
| `/auth/signout` (POST) | Signs out and redirects to `/login`. The Topbar's logout button posts to it. |

### Authenticated pages

#### `/overview` (everyone)
The CEO-readable-in-10-seconds view.
- **KPI row:** active projects, total tasks (with done/overdue split), lifetime completion rate, headcount (interns broken out).
- **Daily completions** area chart, last 14 days.
- **Task mix** donut by status.
- **Finance section** (manager+ only): revenue / expense / profit for last 30 days, plus a 6-bucket bar chart.
- **Recent tasks** — last 6 tasks with assignee avatars and due dates.
- **Active projects** — top 5 cards with progress bars.

#### `/tasks` (everyone)
List of all tasks with filters: search by title, filter by status, "Assigned to me". Table view with title / project / assignee / status / priority / due. Click a row to open the detail.

#### `/tasks/new` (everyone)
Create form. Title (required), description, project, assignee, priority, due date. Anyone can create a task; on save you're redirected to the new task's detail. The assignee gets a notification automatically.

#### `/tasks/[id]` (everyone, edit-permission varies)
Three columns:
- Status / priority / due chips and description
- **Comments** — anyone can post; rendered with author avatar and timestamp
- **Activity** — list of status changes and updates on this task
Sidebar:
- Assignee + creator
- **Actions:** status dropdown (any assignee or manager can change), assignee dropdown (managers only), delete button (managers only)

If you're not the assignee or a manager, you see "Read-only" instead of the actions panel.

#### `/projects` (everyone)
Card grid of all projects. Each card: name / client / description / progress bar / due date / owner. Manager+ sees a "New project" button.

#### `/projects/new` (manager+ only — non-managers redirected away)
Form for name, description, status, client name, owner, budget, start/due dates.

#### `/projects/[id]` (everyone)
- Description, three stats (progress %, tasks done/total, completion %)
- **ProgressEditor** (manager+ only): a slider to update the project's % complete
- **Tasks in this project** — list with status chips
- Sidebar: owner card, dates, budget
- **Finance card** (manager+ only): total revenue / expense / profit for transactions tagged to this project

#### `/team` (everyone)
Card per teammate. For each:
- Avatar + name + title/email
- Role chip (read-only) — or **role dropdown** if you're a manager+ viewing someone other than yourself
- Open / done task counts
- "Active work" — top 4 active tasks with status

#### `/timeline` (everyone)
Month grid with tasks (mint chips) and project deadlines (violet chips) on their due-date cells. Today is ringed in mint. Prev/next month controls. Below the grid: "Upcoming deadlines" — open tasks due today or later, max 8.

#### `/finance` (manager+ only — non-managers redirected to overview)
- Three KPIs: revenue (all-time), expenses (all-time), profit
- Revenue-vs-expense bar chart
- Transactions table with delete buttons
- "New transaction" modal: type, date, amount, currency (INR/USD/EUR/GBP), category, project, description

#### `/performance` (manager+ only — non-managers redirected to /me)
- Card per teammate showing: avatar, average rating, total tasks, done count + %, on-time count + %
- "Latest reviews" table
- "New review" modal: reviewee, period (e.g. `2026-04` or `2026-Q1`), 1-5 rating, free-text feedback
- Submitting a review notifies the reviewee

#### `/activity` (everyone)
- **Your notifications** at the top, with "Mark all read"
- **Company activity** — last 100 actions across the system, with actor + action + entity type

#### `/audit` (super_admin only)
- Filtered view of `activity_log` showing only security-relevant events (role changes, transactions, deletes, project creates)
- KPI cards for each event class
- Configuration warnings if there's no CEO assigned or no super_admin row exists
- Filter chips by event type
- Each row shows actor → action → target → before/after diff for role changes

#### `/me` (everyone — this is the intern/employee dashboard)
- 4 KPIs: open tasks (with overdue), completed (with on-time %), avg rating (with review count), 14-day active streak
- Daily completions chart for **your** tasks
- Profile editor: full name, title
- "Today & upcoming" — your open tasks sorted by due date
- "Recent feedback" — your latest reviews

---

## 5. Database schema cheat sheet

Tables (all in `public`):

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user. Created automatically by the `handle_new_user` trigger on Supabase signup. |
| `projects` | Initiatives / engagements. |
| `tasks` | The atomic unit of work. `completed_at` is set automatically when `status = 'done'`. |
| `task_comments` | Conversation thread on a task. |
| `task_updates` | Status-change history (also used as a place to attach progress notes). |
| `reviews` | Performance reviews — manager-only writes. |
| `transactions` | Revenue + expense entries — manager-only read+write. |
| `activity_log` | Append-only system event stream — everyone reads, anyone authenticated writes. |
| `notifications` | Per-user inbox. |

**RLS at a glance** (full policies in [supabase/schema.sql](supabase/schema.sql)):

| Table | Read | Write |
|---|---|---|
| `profiles` | All authenticated | Self, or any manager+ (super_admin included) |
| `projects` | All authenticated | Manager+ only |
| `tasks` | All authenticated | Manager+ or self-create / self-assigned-update |
| `task_comments` | All authenticated | Self only |
| `task_updates` | All authenticated | Self only |
| `reviews` | Reviewee on own rows + manager+ on all | Manager+ only |
| `transactions` | Manager+ only | Manager+ only |
| `activity_log` | All authenticated | Anyone authenticated |
| `notifications` | Self only | Self update; anyone insert |

**Realtime publication:** `tasks`, `task_comments`, `activity_log`, and `notifications` are added to the `supabase_realtime` publication, so the data layer is ready for live subscriptions, even though the client UI doesn't subscribe yet.

---

## 6. Running locally

Prerequisites: Node 20+, npm.

```bash
# 1. install
npm install

# 2. confirm .env has all four vars (the audit's §1.1 fix)
#    NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
#    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable / anon key>
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<same value>
#    NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 3. one-time: paste supabase/schema.sql into Supabase SQL editor and run
#    optional: customize and run supabase/seed.sql for demo data

# 4. dev
npm run dev
# open http://localhost:3000

# other useful scripts
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run build         # next build (production bundle)
npm start             # serve the production build
```

---

## 7. Deploying to Vercel

The repo is already configured for Vercel (Next.js auto-detected, no `vercel.json` needed).

1. **Push to GitHub** and connect the repo to Vercel, or run `vercel` from the project directory.
2. **Set env vars** (Settings → Environment Variables, all three scopes):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (Optional) `NEXT_PUBLIC_SITE_URL` — set to your Vercel URL so signup confirmation emails point at the right host.
3. **Configure Supabase auth URLs** (Supabase dashboard → Authentication → URL Configuration):
   - Site URL: `https://<your-domain>.vercel.app`
   - Redirect URLs: add `https://<your-domain>.vercel.app/auth/callback`. If you also want previews to work, add a wildcard like `https://*-yourteam.vercel.app/auth/callback`.
4. **Deploy.** Vercel will run `next build` and serve.
5. **Seed the system administrator** (one-time, in Supabase SQL editor):
   ```sql
   alter database postgres set app.super_admin_email = 'ryangomez9965@gmail.com';
   ```
   Replace the email with whichever address you control. The first time anyone signs up with that exact email, they're auto-promoted to `super_admin`. Re-running [supabase/schema.sql](supabase/schema.sql) is idempotent and sets a default value for you.

6. **Sign up as the system admin:**
   - Sign up at `https://<your-domain>.vercel.app/signup` using the seeded email
   - Confirm email
   - You land in `/overview` already as System admin — no SQL editor step needed
   - Promote a CEO from the Team page (System admin can promote anyone, including to CEO)

---

## 8. Day-to-day flows

### Intern / Employee
1. Log in → land on `/overview` (read-only insight on company KPIs)
2. Open `/me` → see today's tasks and overdue items
3. Click a task → update status to `in_progress` → write a comment with progress
4. Mark `done` when complete (`completed_at` is set automatically)
5. Read feedback in `/me` after manager posts a review

### Manager
1. `/tasks/new` to scope and assign work
2. `/projects/new` to spin up an initiative; set owner, budget, dates
3. `/projects/[id]` → drag the progress slider as the project advances
4. `/team` → adjust roles, see who has open work piling up
5. `/finance` → log revenue / expenses; tag transactions to projects to get per-project P&L
6. `/performance` → write monthly/quarterly reviews; reviewee gets notified

### CEO
1. `/overview` for the 10-second read of the company
2. `/finance` for revenue / expense / profit
3. `/performance` for ratings calibration
4. `/activity` for end-to-end audit trail of who changed what

---

## 9. Notable implementation choices

- **Server-first.** All pages are Server Components by default. Mutations go through Next.js Server Actions in `lib/actions/*`. The browser only sees rendered HTML + a thin sprinkle of client islands for forms and the role select.
- **Authorization is in two places.** Server actions guard with `requireProfile()` + `canManage()`; the database guards independently with RLS. Either layer alone is enough for the happy path, but both are present for defense in depth.
- **Notifications and activity are written inline** with the action that caused them (e.g., creating a task inserts an activity row + a notification for the assignee). There's no async worker.
- **Revalidation.** Server actions call `revalidatePath('/tasks')` etc., so the next navigation reloads fresh data. This is why you don't see changes on the same page until a navigation or refresh — there are no client-side realtime subscriptions yet, even though the publication is set up server-side.
- **Roles are sticky.** Once set in `public.profiles.role`, they stay. The auth user metadata is only used at signup creation time.
- **Currency.** Defaults to INR with `Intl.NumberFormat("en-IN")`, but transactions can be tagged USD / EUR / GBP. There's no FX conversion on the dashboard — totals mix currencies if you have multiple.

---

## 10. What's missing vs the PRD

Tracked in detail in [AUDIT.md §4](AUDIT.md). Short list:
- Real-time UI (DB realtime is on, but no `supabase.channel(...)` in the client)
- Comment @mentions
- Email reminders
- Global "Search anything…" in the topbar
- Slack / email integrations
- Per-project budget burn-rate chart
- Composite "personal performance score" KPI
- Mobile sidebar drawer (the hamburger button is currently a no-op)

---

## 11. Where to look when something breaks

| Symptom | First place to check |
|---|---|
| Every route returns 500 | Env vars — see AUDIT.md §1.1. The middleware needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| Login succeeds but you're stuck on /login | Supabase Site URL / Redirect URLs not set, or cookie blocked by browser. |
| Signup confirmation email points at localhost in production | Set `NEXT_PUBLIC_SITE_URL` (currently the code uses `location.origin`, so this is auto-correct in the browser; the issue is only relevant if you start sending email from server code). |
| "Forbidden" errors on actions | The actor's role isn't `ceo` or `manager`. Check `public.profiles.role` for that user. |
| Tasks page is empty even though you created some | RLS — almost never the cause here since tasks are read-all. More likely the filter is set; clear `?status=` and `?assignee=`. |
| Activity feed missing entries | The action that fired didn't insert a log row, or RLS blocked it. Check the server action — they all call `supabase.from('activity_log').insert(...)`. |
| Transactions invisible to non-managers | By design — `tx_read` policy restricts to `is_manager()`. |

---

For security gaps and the deployment-readiness call, read [AUDIT.md](AUDIT.md).
