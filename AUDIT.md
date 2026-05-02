# SOYL Operations Dashboard — Functionality & Security Audit

**Date:** 2026-05-02
**Branch:** main
**Verdict:** ❌ **Not deployment-ready** until the items in §1 (Critical) are fixed. Code itself is well-structured; the blockers are configuration and one privilege-escalation bug at signup.

What I ran:
- `npm run typecheck` → ✅ pass (no errors)
- `npm run lint` → ✅ pass (2 warnings about `<img>` vs `<Image />`)
- `npm run build` → ✅ pass (clean prod build, 19 routes)
- `npm run dev` + smoke test on `/`, `/login`, `/signup`, `/overview`
- Direct REST call to your Supabase project to verify schema applied + key works

---

## 1. Critical — must fix before deploy

### 1.1 Environment variable name mismatch (currently makes every page 500)
Your [.env](.env) defined the key as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, but the code in [lib/supabase/middleware.ts:11](lib/supabase/middleware.ts#L11), [lib/supabase/server.ts:11](lib/supabase/server.ts#L11), and [lib/supabase/client.ts:8](lib/supabase/client.ts#L8) all read `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Result: middleware crashed on **every** request with `Your project's URL and Key are required to create a Supabase client!`.

**Fix already applied locally:** I added an alias line `NEXT_PUBLIC_SUPABASE_ANON_KEY=<same value>` to your `.env`. After the fix, `/`, `/login`, `/signup` returned `200`, and `/overview` correctly redirected unauthenticated requests to `/login?next=%2Foverview`.

**You still need to do this on Vercel:**
1. Vercel project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the **same value** as your publishable key, for **Production, Preview, and Development** scopes.
3. Add `NEXT_PUBLIC_SUPABASE_URL` (same value as locally) for the same scopes.
4. Redeploy (`vercel --prod` or push a commit).

### 1.2 Privilege escalation at signup (anyone can self-promote to CEO)
[app/signup/SignupForm.tsx:65-70](app/signup/SignupForm.tsx#L65-L70) renders a public role dropdown including `manager` and `ceo`, and writes the chosen role into Supabase auth user metadata. The DB trigger [supabase/schema.sql:43-55](supabase/schema.sql#L43-L55) (`handle_new_user`) then trusts that metadata and inserts `profiles.role = (raw_user_meta_data->>'role')::role`.

**Impact:** Anyone visiting `/signup` can register as CEO, which gives them full read on all transactions, write on all roles, write on all reviews, and the ability to demote the real CEO. Combined with the team page's `RoleSelect` (§2.1), this is full takeover.

**Fix (recommended):** Remove the role selector from the signup form entirely and force `'employee'` server-side; promote real managers/CEO from the team page after onboarding. Specifically:
- In [app/signup/SignupForm.tsx](app/signup/SignupForm.tsx) drop the `<select>` and the `role` state, and pass `data: { full_name: name }` only.
- Harden the DB trigger so it ignores `raw_user_meta_data->>'role'` and always inserts `'employee'`. Then promote your own user to `'ceo'` once via the SQL editor.

---

## 2. High severity

### 2.1 Any manager can demote the CEO and lock the CEO out
[lib/actions/team.ts:8-25](lib/actions/team.ts#L8-L25) (`updateMemberRole`) lets `canManage()` (CEO or manager) change any other user's role to anything — including downgrading the CEO. There is no check that there must remain at least one CEO, or that managers cannot demote a CEO.
**Fix:** in `updateMemberRole`, refuse to change a target whose current role is `ceo` unless the actor is also `ceo`; and refuse to remove the last `ceo` (count CEOs first).

### 2.2 CSRF on sign-out
[app/auth/signout/route.ts](app/auth/signout/route.ts) accepts any `POST` and signs the user out. No SameSite check on the request. An attacker page can force-log a user out (denial-of-service, not data theft).
**Fix:** check `request.headers.get("origin")` matches `request.nextUrl.origin` before signing out, or use a Server Action instead of a route handler (Server Actions get CSRF protection from Next.js automatically).

### 2.3 Activity-log spoofing
[supabase/schema.sql:286-288](supabase/schema.sql#L286-L288) — `activity_write` allows `actor_id = auth.uid() OR actor_id is null`. The server actions are well-behaved, but with the anon key, a logged-in user calling `from('activity_log').insert(...)` directly can post any `action`/`entity_type`/`metadata` they want as themselves, or spoof a "system" event with `actor_id = null`. The activity log is read-all, so this can be used to fake a paper trail.
**Fix:** drop the `or actor_id is null` clause and route all activity writes exclusively through `SECURITY DEFINER` functions or server actions (server actions still hit RLS, so a stored procedure is cleaner here).

### 2.4 Notification spam
[supabase/schema.sql:296](supabase/schema.sql#L296) — `notif_insert with check (true)` means any authenticated user can write notifications to any other user. A bored intern can spam the CEO's notifications.
**Fix:** restrict to managers, or move notification creation behind a stored procedure.

### 2.5 No rate limiting / brute force protection
Login, signup, comment posting, transaction creation — all are unrate-limited. Supabase's hosted auth has some built-in throttling, but app-level endpoints don't. Acceptable for an internal tool that's not exposed to the open internet, but flag if you ever publish the URL.

---

## 3. Medium severity

| # | Issue | Location | Fix |
|---|---|---|---|
| 3.1 | Activity-log preview leaks comment body to everyone (any authenticated user reads `activity_log`, which contains the first 80 chars of every comment via `metadata.preview`) | [lib/actions/tasks.ts:96](lib/actions/tasks.ts#L96) | Remove the preview metadata, or restrict `activity_read` to managers |
| 3.2 | `createServiceClient` is dead code that hands out service-role privileges with no caller | [lib/supabase/server.ts:32-40](lib/supabase/server.ts#L32-L40) | Delete it (you can re-add when you actually need it) |
| 3.3 | Mobile menu button has no `onClick` — sidebar is `hidden md:flex`, so on mobile there's no nav | [components/Topbar.tsx:19-21](components/Topbar.tsx#L19-L21) | Wire up an open/close drawer state |
| 3.4 | No cap on transactions list query — scales linearly with all transactions ever created | [app/(app)/finance/page.tsx:19-22](<app/(app)/finance/page.tsx#L19-L22>) | Paginate or filter by date window |
| 3.5 | No unique constraint on `(reviewee_id, period)` — duplicate reviews possible | [supabase/schema.sql:147-155](supabase/schema.sql#L147-L155) | `unique(reviewee_id, period)` if PRD intent is one review per period |
| 3.6 | `dicebear.com` avatar source is third-party (loads on every page) | [lib/utils.ts:32-34](lib/utils.ts#L32-L34) | Either accept it (tiny, public, no PII) or render initials in an SVG |
| 3.7 | Topbar `<img>` and Avatar `<img>` should be `next/image` | [components/Topbar.tsx:44](components/Topbar.tsx#L44), [components/Avatar.tsx:15](components/Avatar.tsx#L15) | Cosmetic; fixes lint warnings |
| 3.8 | `app/page.tsx:38` link to `/login` from landing page works fine, but middleware never lets logged-in users *see* `/` (it's `isPublic`, no redirect-back) — minor UX | [lib/supabase/middleware.ts:37-49](lib/supabase/middleware.ts#L37-L49) | Optional: redirect logged-in users from `/` to `/overview` |

---

## 4. PRD gap analysis

Mapping the implementation to [SOYL_COD_PRD_V2](SOYL_COD_PRD_V2 (1).pdf):

| PRD section | Status | Notes |
|---|---|---|
| §5.1 Company Overview Dashboard | ✅ Done | KPIs, charts, recent tasks, project list — [app/(app)/overview/page.tsx](<app/(app)/overview/page.tsx>) |
| §5.2 Team Tracking | ✅ Done | [app/(app)/team/page.tsx](<app/(app)/team/page.tsx>) |
| §5.3 Task Management | ✅ Done | Create/assign/update/comment/delete |
| §5.4 Progress Tracking (daily/weekly **updates**) | ⚠️ Partial | `task_updates` exists in schema, but UI only writes them as a side-effect of status changes. No standalone "post a daily update" form. |
| §5.5 Performance & Reviews | ✅ Done | Manager-only `/performance`; reviewees see their own at `/me` |
| §5.6 Activity Log | ✅ Done | But see §2.3 about spoofing |
| §5.7 Timeline/Calendar | ✅ Done | Month grid + upcoming list at `/timeline` |
| §6 Revenue & Expense | ⚠️ Partial | Revenue/expense/profit ✅. Per-project P&L ✅. **Budget tracking** missing — schema has `projects.budget` but no burn-rate / budget-vs-actual chart. |
| §7 Intern / Employee Dashboard | ⚠️ Partial | `/me` covers tasks, deadlines, feedback. **Personal performance score** is implicit (avg rating + on-time %) but not shown as a single composite KPI. |
| §8 Team Coordination — task comments | ✅ Done | |
| §8 Team Coordination — **@mentions** | ❌ Missing | Comments are plain text; no tag-a-teammate semantics, no notification on mention |
| §8 Team Coordination — **real-time notifications** | ⚠️ Partial | DB realtime publication is configured ([schema.sql:301-309](supabase/schema.sql#L301-L309)), but **no client-side subscriptions** — nothing in the UI calls `supabase.channel(...).subscribe()`. Notifications appear after manual refresh / navigation. |
| §9 Real-time updates | ❌ Missing | Same root cause as above |
| §9 Role-based access control | ⚠️ Partial | RLS + sidebar filtering both work, but signup hole (§1.2) makes the whole RBAC story moot until fixed |
| §9 Notifications & **reminders** | ⚠️ Partial | Notifications table works; no reminder engine (e.g., "deadline in 24h"). No email delivery. |
| §9 **Search** and filtering | ⚠️ Partial | Tasks page has filter+search. The mock shows a global "Search anything…" input in the topbar — not implemented. |
| §9 Dashboard widgets | ✅ Done | |
| §9 **Integration ready** (Slack, email) | ❌ Missing | No integrations or webhooks |
| §13 Mobile-friendly | ⚠️ Partial | Layout adapts, but the mobile hamburger button (Topbar.tsx:19) does nothing |

---

## 5. Code quality / hygiene

- **Dead imports:** `isBefore` imported but unused in [app/(app)/timeline/page.tsx:5](<app/(app)/timeline/page.tsx#L5>).
- **Documentation drift:** [.env.example](.env.example) lists `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SITE_URL`. Neither is read by any code; the README still references both. Either delete from docs or actually use them (e.g., `NEXT_PUBLIC_SITE_URL` for the email confirmation `emailRedirectTo`, replacing `location.origin` in [SignupForm.tsx:30](app/signup/SignupForm.tsx#L30) so confirmation emails point to the right host in preview deploys).
- **`whitespace-pre-wrap` rendering** of all user-supplied text fields (descriptions, comments, feedback) — React already escapes; no XSS via dangerouslySetInnerHTML anywhere. ✅ This is good.
- **Search:** `query.ilike("title", \`%${q}%\`)` is parameterized through PostgREST so it's not SQL-injectable, but a `%` or `_` in user input becomes a wildcard. Low impact.

---

## 6. Deployment readiness checklist for Vercel

After fixing §1, before pushing to prod:

1. **Environment variables on Vercel** (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://rktrzacsrwrjbpsdolod.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_hxk36M3Oaz6HWkreD3QErw_3-qp7T75`
   - (Do **not** set `SUPABASE_SERVICE_ROLE_KEY` unless you keep `createServiceClient` and actually use it.)
   - Apply to Production, Preview, Development.
2. **Supabase dashboard → Auth → URL Configuration**:
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: add `https://<your-vercel-domain>/auth/callback` and any preview domain pattern `https://*-yourteam.vercel.app/auth/callback`
   - Without this, the email confirmation links from signup point at `localhost:3000` and break.
3. **Schema** is already applied to your Supabase project (`/rest/v1/profiles` returned 200 with empty array, confirming the table exists and RLS is on).
4. **Promote yourself to CEO** once after first signup, by running in the SQL editor:
   ```sql
   update public.profiles set role = 'ceo' where email = 'you@soyl.ai';
   ```
   (After you patch §1.2 the signup form will no longer let users self-pick `ceo`, so this is the only way to get the first CEO seat.)
5. **Smoke test prod**:
   - Land on `/` → see marketing page
   - `/signup` → create account → click email confirmation → land in `/overview`
   - `/overview`, `/tasks/new`, `/projects` (if manager), `/finance` (if manager)
   - Sign out → `/overview` redirects to `/login`

---

## 6.b Super-admin / audit-log model (added after initial audit)

The role enum now includes `super_admin`, seeded via the `app.super_admin_email` Postgres setting. The seed value in [supabase/schema.sql](supabase/schema.sql) is `ryangomez9965@gmail.com` — change in the SQL file or run `alter database postgres set app.super_admin_email = '<email>';` manually. The first sign-up matching that email is auto-promoted; everyone else lands as `employee`. The role is invisible in the role dropdown and cannot be assigned, demoted, or transferred via the UI; it can only be changed by updating the seeded email and re-running the trigger or by a direct SQL update.

A separate `/audit` page (super_admin only) shows security-relevant events (role changes with before/after, transactions, deletions, project creates), with configuration warnings if no CEO or no super_admin exists.

---

## 7. Verdict

| Area | State |
|---|---|
| Build | ✅ Passes |
| Typecheck | ✅ Passes |
| Lint | ✅ Passes (2 warnings) |
| Runtime (after env fix) | ✅ Public + auth pages render |
| Schema applied | ✅ Yes |
| Auth wiring | ✅ Works once env is right |
| **Privilege escalation at signup** | ❌ **Blocker** — patch §1.2 |
| Real-time / mentions / search / integrations | ❌ Missing per PRD, not blockers but worth knowing |
| Mobile nav | ⚠️ Hamburger has no handler |

**Ship recommendation:** Do **not** deploy as-is. Fix §1.1 (env var on Vercel) and §1.2 (signup role hole) first. Everything else in §2-§5 is fair game for a post-launch sprint.
