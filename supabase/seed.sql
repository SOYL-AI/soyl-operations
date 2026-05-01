-- Optional sample data — run AFTER you have created at least one user via the
-- Supabase Auth dashboard or your app's signup page. Replace the email below
-- with your own to make yourself CEO.

update public.profiles set role = 'ceo' where email = 'YOUR_EMAIL@example.com';

-- A couple of demo projects
insert into public.projects (name, description, status, client_name, budget, start_date, due_date, progress)
values
  ('Voice Pipeline v2', 'Real-time TTS + STT pipeline rebuild', 'active', 'Internal R&D', 1500000, current_date - 14, current_date + 30, 35),
  ('PMS Product Launch', 'Property management system go-to-market', 'active', 'SOYL', 800000, current_date - 7, current_date + 60, 18),
  ('JEPA R&D', 'Research initiative on world models', 'planning', 'Internal R&D', 600000, current_date, current_date + 90, 5)
on conflict do nothing;

-- A few sample transactions
insert into public.transactions (type, category, amount, currency, description, occurred_on)
values
  ('revenue', 'Consulting', 350000, 'INR', 'Initial retainer — Client A', current_date - 5),
  ('expense', 'Salaries',    220000, 'INR', 'April salaries',              current_date - 2),
  ('expense', 'Tools',        18000, 'INR', 'Cloud + SaaS subscriptions', current_date - 1),
  ('revenue', 'Product',     120000, 'INR', 'PMS pilot fee',              current_date - 10);
