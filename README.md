# FaithWellness

Connects people with pastoral and Christian counselors from local churches. Next.js 15 + Tailwind v4, built for Vercel and Supabase.

See `CLAUDE.md` for the brief and `START-HERE.md` for the build phases.

> **Prototype.** The client journey runs on fake data kept in each visitor's browser. Nothing is booked, sent or stored on a server. The six counselors, five churches and all accreditation requirements are fictional samples. Replace them before launch.

## Put it on GitHub and Vercel

1. **Create a repository** on github.com (New repository). Private is a sensible default.
2. **Upload the files.** Unzip `faithwellness-github.zip`, then on the new repository's page choose **uploading an existing file** and drag in everything from the unzipped folder. Or, with Git installed:
   ```bash
   git init && git add . && git commit -m "FaithWellness prototype" && git branch -M main && git remote add origin https://github.com/YOUR-NAME/faithwellness.git && git push -u origin main
   ```
3. **Deploy on Vercel.** At vercel.com choose **Add New → Project**, import the repository, keep the defaults (Framework: Next.js) and click **Deploy**. Every push to `main` then updates the live link.

No environment variables are needed yet. Without Supabase keys the app reads `supabase/seed-data.json`.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Other scripts: `npm run build`, `npm run typecheck`, `npm run seed:sql` (rebuilds `supabase/seed.sql` from `supabase/seed-data.json`).

### On an iCloud-synced Desktop

iCloud stalls the dev server when it syncs `node_modules`. Keep the real folders as `node_modules.nosync` and `.next.nosync` (iCloud skips names ending in `.nosync`) with `node_modules` and `.next` as links to them. `npm install` replaces the link with a real folder, so after installing run:

```bash
rm -rf node_modules.nosync && mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules
```

## What's in the prototype

- **Find a counselor:** directory with search and filters, profiles with a booking panel (times in the viewer's zone, 15-minute rest between sessions).
- **Onboarding:** five questions after first sign-in, matched counselors, optional sharing of answers with counselors.
- **Booking:** sign-in (fake Google or email link), confirm, "You're booked", reschedule, cancel. Licensed counselors offer **Use insurance** (plan, member ID, group number), which the counselor verifies and bills.
- **Church member care:** request membership with a code or link, church approval, yearly re-confirmation, free sessions with that church's counselors.
- **My sessions, Messages, Your profile** (name, email, time zone, delete account).
- **Accreditation, For churches, For counselors** pages.

A dark banner on every page has **Reset prototype**. Dashed "Prototype" boxes let you play the church's or counselor's part.

## Supabase (later phases)

`supabase/migrations/0001_directory.sql` has the directory schema with Row Level Security. The app switches to Supabase once `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see `.env.example`).

## Layout

- `app/(public)/` — every page: directory, profiles, booking, sessions, messages, account, onboarding, membership, accreditation, for churches, for counselors
- `app/styleguide/` — component reference
- `components/` — shared UI (`ui/`), directory controls, prototype helpers
- `lib/` — data access, filtering, time zones, sample slots, accreditation data, prototype store
- `public/counselors/` — sample counselor photos
- `supabase/` — schema, seed data and generated seed SQL
- `design/` — approved screens and `tokens.css`
