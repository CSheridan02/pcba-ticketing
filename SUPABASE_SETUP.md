# Supabase Setup Instructions

Follow these steps to set up your Supabase project for the PCBA Ticketing System.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the project details:
   - Project name: `pcba-ticketing`
   - Database password: (choose a strong password)
   - Region: (select closest to your location)
5. Click "Create new project"

## Step 2: Run the Database Schema

1. Once your project is created, go to the SQL Editor in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste it into the SQL Editor
5. Click "Run" to execute the script

This will create:
- All necessary tables (users, work_orders, tickets, areas)
- Row Level Security (RLS) policies
- Indexes for performance
- Helper functions for generating IDs
- Default areas (Assembly, Quality Control, Packaging)

## Step 3: Get Your API Keys

1. Go to "Settings" → "API" in your Supabase dashboard
2. Copy the following values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **anon public key**: This is your `SUPABASE_ANON_KEY`
   - **service_role key**: This is your `SUPABASE_SERVICE_KEY` (keep this secret!)

## Step 4: Configure Environment Variables

### Frontend (.env file in `frontend/` directory)

Create a file named `.env` in the `frontend/` directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3000
```

### Backend (.env file in `backend/` directory)

Create a file named `.env` in the `backend/` directory:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
JWT_SECRET=your-jwt-secret-here
PORT=3000
```

**Note**: For `JWT_SECRET`, you can use your Supabase JWT secret found in Settings → API → JWT Settings.

## Step 5: Create Test Users

After the system is running, you can create test users:

### Option 1: Through Supabase Dashboard
1. Go to "Authentication" → "Users" in your Supabase dashboard
2. Click "Add user"
3. Enter email and password
4. After creating, go to SQL Editor and run:

```sql
-- Make a user an admin
UPDATE public.users 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

### Option 2: Through the Application
1. Use the signup/login interface in the application
2. All new users are created as 'line_operator' by default
3. Use SQL Editor to promote a user to admin role

## Step 6: Verify Setup

1. Go to "Table Editor" in Supabase dashboard
2. You should see tables: users, work_orders, tickets, areas
3. Check the "areas" table - it should have 3 default areas

## Troubleshooting

### Issue: RLS Policies blocking access
- Check that you're authenticated
- Verify your user exists in the `public.users` table
- Check the RLS policies in the Table Editor

### Issue: Functions not working
- Make sure all SQL was executed successfully
- Check for any error messages in the SQL Editor

### Issue: Can't create records
- Verify RLS policies are correct
- Check that your user role has the necessary permissions

## Security Notes

- **Never commit `.env` files to version control**
- Keep your service role key secure - it bypasses RLS
- Use the anon key in the frontend
- Use the service role key only in the backend

