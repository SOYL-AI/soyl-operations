# SOYL Operations Dashboard (COD)

> Story of your life — one command center for the whole company.

A centralized internal platform that gives founders, managers and the team
real-time visibility into execution, performance, and finance. Built end-to-end
on **Next.js 15 (App Router) + Supabase + Tailwind**, deployed on **Vercel**.

This implements every module described in the PRD:

- Company Overview (KPIs, charts, recent work)
- Task Management (create, assign, status, comments, activity)
- Projects (CRUD + progress + per-project P&L)
- Team Tracking (who's doing what, role management)
- Timeline / Calendar (deadlines & milestones)
- Revenue & Expenses (live profit overview)
- Performance & Reviews (per-user stats + 1–5 ratings)
- Activity Log + Personal Notifications
- "My work" dashboard for employees/interns

Brand: dark `#030709` base, mint `#AFD0CC` accent, off-white `#F5F5FD` text,
display type `Space Grotesk` (Nevera/Groote stand-in until the brand fonts are
self-hosted), body type `Inter` (Century Gothic / Gadugi stand-in).

---

## 1. Local setup

```bash
# from the repo root
cd "C:/SOYL pvt Limited/soyl-operations-board"

npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

Open http://localhost:3000.

---

## 2. Supabase setup

1. Create a project at https://supabase.com (the free tier is plenty to start).
2. **Project Settings → API** — copy the URL and the `anon` public key into
   `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # optional, server-only
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Open the **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql)
   in one shot. This creates:
   - all enums and tables (profiles, projects, tasks, comments, updates,
     reviews, transactions, activity_log, notifications)
   - the `handle_new_user` trigger that auto-creates a `profiles` row on signup
   - RLS policies for every table (read-all for the team directory; writes
     gated by role / ownership / assignee)
   - realtime publication entries for live-updating tables

4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (and add your Vercel domain once deployed).
   - Add `http://localhost:3000/auth/callback` and your Vercel callback to
     "Redirect URLs".

5. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) after creating your
   first account, replacing `YOUR_EMAIL@example.com` with your email so you
   become CEO and get some demo data.

---

## 3. Accounts & roles

There is **no built-in superadmin password** — Supabase Auth is the source of
truth for identity, and the app layers a role on top of it via the
`public.profiles` table. The roles are:

| Role        | Can do                                                                    |
|-------------|---------------------------------------------------------------------------|
| `ceo`       | Everything. Sees finance, performance, can change anyone's role.          |
| `manager`   | Same as CEO functionally (create projects, transactions, reviews, reassign). |
| `employee`  | Sees overview/tasks/team/timeline. Creates tasks, updates own tasks, comments. |
| `intern`    | Same as employee.                                                         |

### 3.1 Bootstrap the very first CEO account

The first account you create is technically just an `employee`. To promote
yourself to CEO so you can manage everything from the UI:

**Option A — fastest, recommended once:**

1. Run the app locally (`npm run dev`) or open the deployed Vercel URL.
2. Go to `/signup`, fill in your details, pick any role (it'll be overridden).
3. Open the **Supabase dashboard → SQL editor** and run:
   ```sql
   update public.profiles
   set role = 'ceo'
   where email = 'you@example.com';
   ```
4. Sign out and back in (or just refresh) — the sidebar will now show
   **Finance** and **Performance**, and you'll be able to change other people's
   roles from the **Team** page.

**Option B — designate a CEO email up-front:**

Add a SQL function that auto-promotes a known email at signup. Run this once
in the Supabase SQL editor (replace the email):

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case
      when new.email = 'founder@soyl.ai' then 'ceo'::role
      else coalesce((new.raw_user_meta_data->>'role')::role, 'employee'::role)
    end
  )
  on conflict (id) do nothing;
  return new;
end; $$;
```

After that, anyone signing up with that email is automatically a CEO.

### 3.2 Inviting other team members

Three ways, pick whichever fits your workflow:

1. **Self-serve signup** — share `/signup`. The user creates an account, you
   open **Team** in the dashboard and bump their role from `employee` →
   `manager` if needed.
2. **Pre-invite via Supabase** — Supabase dashboard → **Authentication →
   Users → Invite user**. Supabase emails them a magic link; once they set a
   password, the trigger creates their `profiles` row and they appear under
   **Team**.
3. **Bulk add via SQL** — useful for a batch of interns. Run in SQL editor:
   ```sql
   -- after they sign up, set roles in one shot
   update public.profiles set role = 'intern'
   where email in ('a@example.com','b@example.com','c@example.com');
   ```

### 3.3 Email confirmation (recommended for production)

By default, Supabase sends a confirmation email before a user can sign in. If
you want to disable it for internal-only use, go to **Authentication →
Providers → Email** and turn off "Confirm email". For production, leave it on
and configure your SMTP under **Project Settings → Auth → SMTP Settings**.

### 3.4 Forgot password

Supabase handles password resets out of the box — under **Auth → URL
Configuration**, ensure your reset URL points to your domain. The app already
exposes `/auth/callback`, which is where the magic link lands.

---

## 4. First run

1. Start the app: `npm run dev`.
2. Visit `/signup`, create your account (the first one — you'll promote
   yourself to CEO via section 3.1).
3. You'll land on `/overview`, the company command center.

---

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. **Import** in Vercel — pick the repo, framework auto-detects as Next.js.
3. Add the environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as Secret)
   - `NEXT_PUBLIC_SITE_URL` (your Vercel URL, e.g. `https://soyl-cod.vercel.app`)
4. **Deploy**.
5. Back in **Supabase → Authentication → URL Configuration** add:
   - Site URL: your Vercel URL
   - Redirect URL: `https://<your-vercel-domain>/auth/callback`

That's it — push to `main` and Vercel auto-deploys on every commit.

---

## 6. Architecture

```
app/
  (app)/                  ← authenticated app shell (sidebar + topbar)
    overview/             ← KPIs + charts
    tasks/                ← list / new / [id] detail
    projects/             ← list / new / [id] detail
    team/                 ← people directory + role mgmt
    timeline/             ← month calendar + upcoming
    finance/              ← revenue / expenses / profit (manager+)
    performance/          ← reviews + per-user stats (manager+)
    activity/             ← activity log + notifications
    me/                   ← personal dashboard
  login/  signup/  auth/  ← auth pages and callback
  page.tsx                ← public marketing landing
components/               ← Sidebar, Topbar, Kpi, Charts, StatusChip, …
lib/
  supabase/{client,server,middleware}.ts
  actions/                ← server actions (RLS-gated)
  auth.ts  utils.ts  types.ts
supabase/
  schema.sql              ← run this once
  seed.sql                ← optional demo data
middleware.ts             ← refreshes Supabase session, gates auth
tailwind.config.ts        ← SOYL brand palette + display fonts
```

### Role model

| Role     | Sees               | Can write                                                    |
|----------|--------------------|--------------------------------------------------------------|
| ceo      | everything         | everything (set via SQL or signup)                           |
| manager  | everything         | projects, tasks, transactions, reviews, role of others       |
| employee | everything except finance / reviews | own profile, own tasks, comments, status updates |
| intern   | same as employee   | same as employee                                             |

RLS enforces this on the database side — even a malicious client can't bypass.

### Realtime

`tasks`, `task_comments`, `activity_log` and `notifications` are added to
`supabase_realtime`. Drop in `supabase.channel(...).on('postgres_changes', ...)`
on any page if you want live updates without polling — the heavy lifting is
done.

---

## 7. Brand notes

The brand guidelines specify Nevera + Groote (display) and Century Gothic +
Gadugi (subtext). Those are not free webfonts, so the project ships with
`Space Grotesk` (display) and `Inter` (body) as faithful stand-ins. To swap in
the real fonts:

1. Place the licensed font files under `app/fonts/`.
2. Use `next/font/local` in `app/layout.tsx`:
   ```ts
   import localFont from "next/font/local";
   const display = localFont({ src: "./fonts/Nevera.woff2", variable: "--font-display" });
   ```
3. Tailwind already wires `font-display` and `font-sans` to those CSS variables.

The palette in `tailwind.config.ts` (`ink`, `bone`, `mint`, `slate2`) is
locked to the hex codes from the guidelines — no edits needed.

---

## 8. Useful commands

```bash
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run build        # production build
```

---

© SOYL AI Private Limited
