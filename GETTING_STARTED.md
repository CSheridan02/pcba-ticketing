# Getting Started with PCBA Work Order Ticketing System

This guide will walk you through setting up and running the PCBA Work Order Ticketing System.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works fine)

## Step 1: Install Dependencies

From the root directory, run:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

## Step 2: Set Up Supabase

Follow the instructions in `SUPABASE_SETUP.md` to:

1. Create your Supabase project
2. Run the database schema SQL script
3. Get your API keys

## Step 3: Configure Environment Variables

### Frontend Environment Variables

Create a file `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3000
```

### Backend Environment Variables

Create a file `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
JWT_SECRET=your-jwt-secret-from-supabase
PORT=3000
```

**Important:** 
- Get the JWT secret from Supabase Dashboard → Settings → API → JWT Settings
- Never commit `.env` files to version control

## Step 4: Start the Application

From the root directory, run:

```bash
npm run dev
```

This will start both the backend (port 3000) and frontend (port 5173) servers.

Alternatively, you can start them separately:

```bash
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Frontend
npm run frontend
```

## Step 5: Create Your First User

1. Open your browser to http://localhost:5173
2. Click "Sign up" on the login page
3. Enter your email, password, and full name
4. Check your email for the verification link (if email is configured in Supabase)
5. Sign in with your credentials

## Step 6: Make Your First User an Admin

By default, all users are created as "line_operator". To make yourself an admin:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this query (replace with your user's email):

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

## Step 7: Set Up Areas

As an admin:

1. Click on "Settings" in the navigation
2. Add the production areas your team needs:
   - Assembly
   - Quality Control
   - Packaging
   - (or any custom areas)

## Step 8: Create Your First Work Order

1. Go to "Work Orders" page
2. Click "Create Work Order"
3. Fill in:
   - ASM # (Assembly number)
   - Description
   - Quantity
   - Status
4. Click "Create"

## Step 9: Create a Ticket

1. Click on a work order to view its details
2. Click "Create Ticket"
3. Fill in:
   - Description of the issue
   - Priority (Low, Medium, High)
   - Area where the issue occurred
4. Click "Create"

## Features Overview

### For All Users:
- **View Work Orders**: See all work orders in the system
- **Search**: Search by work order number, ASM number, or description
- **Create Work Orders**: Create new work orders
- **View Details**: See detailed information about each work order
- **Create Tickets**: Report issues on work orders
- **Update Status**: Change work order status
- **Print**: Print work order details for physical records

### For Admins Only:
- **Area Management**: Add or remove production areas
- **Settings Access**: Configure system settings

## User Roles

### Line Operator (Default)
- Create and view work orders
- Create and view tickets
- Update work order status

### Admin
- All Line Operator permissions
- Access to Settings page
- Manage production areas
- (Future: User management, reports, etc.)

## Troubleshooting

### Can't log in
- Verify your Supabase URL and keys in `.env` files
- Check that you confirmed your email
- Make sure both backend and frontend are running

### Backend errors
- Check that your Supabase service key is correct
- Verify the database schema was applied correctly
- Check backend console for error messages

### Frontend not loading data
- Verify `VITE_API_URL` is set to `http://localhost:3000`
- Check browser console for errors
- Ensure backend is running

### Permission denied errors
- Check your user role in the `public.users` table
- Verify RLS policies are set up correctly

## Development Tips

### Backend API Endpoints

- **Auth**: `GET /auth/me`
- **Work Orders**: `GET /work-orders`, `POST /work-orders`, `GET /work-orders/:id`, `PATCH /work-orders/:id`
- **Tickets**: `GET /tickets`, `POST /tickets`, `GET /tickets/:id`
- **Areas**: `GET /areas`, `POST /areas`, `DELETE /areas/:id`
- **Users**: `GET /users`, `GET /users/:id`

### Database Tables

- `users` - User profiles with roles
- `work_orders` - Work order records
- `tickets` - Issue tickets
- `areas` - Production areas

### Key Features
- JWT authentication via Supabase
- Role-based access control
- Real-time updates with React Query
- Print-optimized work order details
- Mobile-responsive design

## Next Steps

1. Customize the system for your workflow
2. Add more users to your team
3. Configure email settings in Supabase for notifications
4. Consider deploying to production (Vercel, Railway, etc.)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Supabase setup guide
3. Check browser/backend console for error messages
4. Review the SQL schema for database structure

Enjoy using your PCBA Work Order Ticketing System!

