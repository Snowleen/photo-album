# Photo Album

A private, multi-tenant photo album. A superadmin creates **album spaces** in one of three modes:

| Mode | Max users | Theme |
|---|---|---|
| Individual | 1 | Clean & simple |
| Couple | 2 | Pink with floating hearts 💕 |
| Family | 10 | Sky blue with drifting clouds ☁️ |

Users can upload photos (upload date is automatic; capture date and remark are optional), organise them into albums, export (JPG / PNG / PDF for one photo, PDF only for several), and delete. Deleted photos go to the **Recycle bin** and are permanently removed after 30 days unless restored or force-deleted first.

**Stack (all free tiers):** Next.js on **Vercel** · Postgres database + photo storage on **Supabase** · code on **GitHub**.

---

## 1. Create the Supabase project (database + photo storage)

1. Sign up at https://supabase.com → **New project** (pick a region near you, e.g. Singapore).
2. Open **SQL Editor** → **New query** → paste everything from [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (secret — never share or commit it)

## 2. Push the code to GitHub

1. Create a new **empty** repository at https://github.com/new (Private is recommended).
2. In this folder run:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

## 3. Deploy on Vercel (gives you the public URL)

1. Sign up at https://vercel.com with your GitHub account → **Add New → Project** → import the repo.
2. Before clicking Deploy, open **Environment Variables** and add all of these:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `SUPERADMIN_USERNAME` | your superadmin username |
   | `SUPERADMIN_PASSWORD` | your superadmin password |
   | `SESSION_SECRET` | any long random text (32+ characters) |
   | `CRON_SECRET` | any random text |

3. Click **Deploy**. You get a URL like `https://your-album.vercel.app` — open it on your phone and log in. (Tip: “Add to Home Screen” to use it like an app.)

Every `git push` to `main` redeploys automatically. If you change environment variables later, redeploy from the Vercel dashboard (Deployments → ⋯ → Redeploy).

## Run locally (optional)

```bash
npm install
# fill in .env.local (see .env.example)
npm run dev      # http://localhost:3000
```

## How it works

- **Superadmin** (`/admin`): create spaces, switch mode (blocked if the space has more users than the new mode allows), add / disable / remove users, reset passwords, delete spaces.
- **Users** (`/album`): everyone in a space shares the same photos and albums; each photo shows who uploaded it.
- **Uploads** go straight from the browser to Supabase Storage (no size issues with big phone photos). Photos are private — links expire after a few hours.
- **Recycle bin**: cleaned automatically when a user opens the app and by a daily Vercel cron job (`vercel.json`). The daily job also keeps the free Supabase project from being paused for inactivity.

## Free-tier limits to know

- Supabase free: 1 GB photo storage, 500 MB database. Plenty for a few thousand phone photos; upgrade later if needed.
- To change the max users per mode, edit `MODE_LIMITS` in `lib/db.js` and the labels in `app/admin/page.js`.
