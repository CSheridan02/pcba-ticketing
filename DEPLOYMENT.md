# Deployment Guide - Vercel

Deploy both the frontend and backend to Vercel for free!

---

## Prerequisites

1. GitHub account with your code pushed
2. Vercel account (free at [vercel.com](https://vercel.com))
3. Supabase project already set up

---

## Step 1: Push Code to GitHub

If you haven't already:

```bash
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2: Deploy Backend API to Vercel

### 2.1 Create New Project
1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **"Add New"** → **"Project"**
3. Import your repository

### 2.2 Configure Project Settings
- **Project Name**: `pcba-api` (or your preferred name)
- **Framework Preset**: Other
- **Root Directory**: Click "Edit" → enter `backend`

### 2.3 Add Environment Variables
Click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `SUPABASE_JWT_SECRET` | Your Supabase JWT secret |

### 2.4 Deploy
Click **"Deploy"** and wait for the build.

### 2.5 Copy Your API URL
After deployment, copy your API URL. It will look like:
```
https://pcba-api.vercel.app
```

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Another New Project
1. Go to Vercel Dashboard
2. Click **"Add New"** → **"Project"**
3. Import the **same repository** again

### 3.2 Configure Project Settings
- **Project Name**: `pcba-tickets` (or your preferred name)
- **Framework Preset**: Vite
- **Root Directory**: Click "Edit" → enter `frontend`

### 3.3 Add Environment Variables
| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_API_URL` | Your backend URL from Step 2.5 (e.g., `https://pcba-api.vercel.app`) |

### 3.4 Deploy
Click **"Deploy"** and wait for the build.

---

## Step 4: Update Supabase Settings

### 4.1 Add Redirect URLs
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add to "Redirect URLs":
   - `https://your-frontend-url.vercel.app`
   - `https://your-frontend-url.vercel.app/**`

### 4.2 Add Site URL
Set the "Site URL" to your frontend URL:
```
https://your-frontend-url.vercel.app
```

---

## ✅ Verification Checklist

### Test Backend
Visit: `https://your-api-url.vercel.app`
- Should return: `"Hello World!"`

### Test Frontend
Visit: `https://your-frontend-url.vercel.app`
- Should show login page
- Try signing up/logging in
- Create a work order (as admin)
- Create a ticket

---

## Troubleshooting

### "Failed to fetch" or Network errors
1. Check that `VITE_API_URL` is correct in frontend env vars
2. Make sure it doesn't have a trailing slash
3. Redeploy after changing env vars

### "Invalid JWT" or Auth errors
1. Verify `SUPABASE_JWT_SECRET` in backend matches your Supabase project
2. Check that frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

### "CORS error"
The backend is configured to allow all origins. If issues persist:
1. Check browser console for the exact error
2. Make sure the API URL doesn't have a trailing slash

### Build fails
1. Check Vercel build logs
2. Ensure root directory is set correctly (`backend` or `frontend`)
3. Try deploying again - sometimes first deploy has caching issues

---

## Custom Domains (Optional)

For each project in Vercel:
1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

Example setup:
- `api.yourdomain.com` → Backend
- `tickets.yourdomain.com` → Frontend

---

## Cost Summary

| Service | Cost |
|---------|------|
| Vercel (Frontend) | Free |
| Vercel (Backend) | Free |
| Supabase | Free tier |
| **Total** | **$0/month** 🎉 |

Note: Free tier limits apply. For production apps with high traffic, you may need paid plans.

---

## Environment Variables Reference

### Backend (`backend` directory)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

### Frontend (`frontend` directory)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://your-backend.vercel.app
```
