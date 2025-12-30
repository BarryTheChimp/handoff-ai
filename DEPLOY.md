# Deployment Guide

Deploy Handoff AI using **Vercel** (frontend) + **Render** (backend) + **Supabase** (database).

---

## Prerequisites

You need accounts on:
- [GitHub](https://github.com) (you have this)
- [Supabase](https://supabase.com) (you have this)
- [Vercel](https://vercel.com) - sign up with GitHub
- [Render](https://render.com) - sign up with GitHub

---

## Step 1: Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Add deployment config"
git push origin main
```

---

## Step 2: Set Up Supabase Database

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project (or use existing)
3. Go to **Settings** > **Database**
4. Copy the **Connection string** (URI format)
   - It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
5. Save this - you'll need it for Render

---

## Step 3: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `handoff-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && node dist/index.js`

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `DATABASE_URL` | Your Supabase connection string |
   | `JWT_SECRET` | Click "Generate" for a random value |
   | `CLAUDE_API_KEY` | Your Anthropic API key |

6. Click **Create Web Service**
7. Wait for deploy (~3-5 minutes)
8. Copy your Render URL (e.g., `https://handoff-backend.onrender.com`)

---

## Step 4: Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** > **Project**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`

5. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `BACKEND_URL` | Your Render URL (e.g., `https://handoff-backend.onrender.com`) |

6. Click **Deploy**
7. Wait for deploy (~1-2 minutes)

---

## Step 5: Test Your Deployment

1. Open your Vercel URL (e.g., `https://handoff-ai.vercel.app`)
2. You should see the login page
3. Log in with: `admin` / `admin123`
4. Try uploading a spec!

---

## Troubleshooting

### "Cannot connect to database"
- Check your Supabase connection string is correct
- Make sure you included the password in the URL
- Supabase may require SSL: add `?sslmode=require` to the end of the URL

### "API errors" or "Failed to fetch"
- Check Render logs: Dashboard > Your Service > Logs
- Make sure `BACKEND_URL` in Vercel matches your Render URL exactly
- The Render URL must include `https://`

### Backend is slow on first request
- Render's free tier "spins down" after inactivity
- First request takes ~30 seconds to "wake up"
- This is normal for free tier

### "Unauthorized" errors
- Clear your browser's localStorage
- Try logging in again

---

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing auth tokens |
| `CLAUDE_API_KEY` | Yes | Anthropic API key for AI features |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Set to `3001` |
| `JIRA_CLIENT_ID` | No | For Jira integration |
| `JIRA_CLIENT_SECRET` | No | For Jira integration |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | Yes | Full URL of your Render backend |

---

## Updating Your App

After making changes:

1. Push to GitHub: `git push origin main`
2. Render and Vercel will auto-deploy!

---

## Cost

| Service | Cost |
|---------|------|
| Supabase | Free (500MB database) |
| Render | Free (spins down after 15min inactivity) |
| Vercel | Free (100GB bandwidth/month) |

**Total: $0/month** for light usage

---

## Upgrading (Optional)

If you need better performance:

- **Render Starter** ($7/mo): No spin-down, always fast
- **Supabase Pro** ($25/mo): More database space, daily backups
- **Vercel Pro** ($20/mo): More bandwidth, team features
