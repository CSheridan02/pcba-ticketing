# Deployment Guide

This guide covers deploying the PCBA Ticketing System to production.

## Architecture

- **Frontend**: Vercel (React/Vite)
- **Backend**: Railway (NestJS) - or Render/Fly.io
- **Database**: Supabase (already hosted)

---

## Step 1: Deploy Backend to Railway

Railway is the easiest option for NestJS backends.

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 1.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your repository
4. **Important**: Set the root directory to `backend`

### 1.3 Configure Environment Variables
In Railway dashboard, add these environment variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
PORT=3000
```

### 1.4 Configure Build Settings
Railway should auto-detect NestJS, but if needed:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

### 1.5 Get Your Backend URL
After deployment, Railway will give you a URL like:
`https://your-app-production.up.railway.app`

**Save this URL** - you'll need it for the frontend.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 2.2 Import Project
1. Click "Add New" → "Project"
2. Import your GitHub repository
3. **Important**: Set the root directory to `frontend`

### 2.3 Configure Build Settings
Vercel should auto-detect Vite, but verify:
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 2.4 Configure Environment Variables
Add these environment variables in Vercel:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend.up.railway.app
```

**Replace** `https://your-backend.up.railway.app` with your actual Railway backend URL from Step 1.

### 2.5 Deploy
Click "Deploy" and wait for the build to complete.

---

## Step 3: Update Supabase Settings

### 3.1 Add Redirect URLs
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to "Redirect URLs":
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/**`

### 3.2 Update CORS (if needed)
If you get CORS errors, add your domains to the allowed origins in your backend.

---

## Alternative: Deploy Backend to Render

If you prefer Render over Railway:

### Create Web Service
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Environment**: Node

### Add Environment Variables
Same as Railway (Step 1.3)

---

## Verifying Deployment

### Check Backend
Visit: `https://your-backend-url.railway.app`
Should return: `"Hello World!"`

### Check Frontend
Visit: `https://your-app.vercel.app`
Should show the login page.

### Test Login
1. Sign up with a new account
2. Verify you can create work orders (as admin)
3. Test ticket creation

---

## Troubleshooting

### "Cannot connect to backend"
- Verify `VITE_API_URL` is set correctly in Vercel
- Check Railway/Render logs for errors
- Ensure backend is running

### "CORS error"
Add this to your backend `main.ts` if not already present:
```typescript
app.enableCors({
  origin: ['https://your-app.vercel.app', 'http://localhost:5173'],
  credentials: true,
});
```

### "Auth not working"
- Check Supabase redirect URLs include your Vercel domain
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct

### "Database errors"
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in backend
- Check Supabase RLS policies are correct

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS as instructed

### Railway
1. Go to Service Settings → Networking → Domains
2. Add your domain
3. Update DNS as instructed

---

## Cost Estimates

- **Vercel**: Free tier is generous for small apps
- **Railway**: $5/month for hobby plan (includes $5 credit)
- **Render**: Free tier available (spins down after inactivity)
- **Supabase**: Free tier includes 500MB database

Total: **$0-10/month** for a small production app

