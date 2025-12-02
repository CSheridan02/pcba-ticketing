# PCBA Ticketing System - Frontend

React + TypeScript + Vite frontend for the PCBA Work Order Ticketing System.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **React Router** for navigation
- **React Query** for server state management
- **Supabase** for authentication
- **shadcn/ui** + **Tailwind CSS** for UI components
- **Lucide React** for icons

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
```

## Project Structure

```
src/
├── components/        # Reusable components
│   ├── ui/           # shadcn/ui components
│   ├── Layout.tsx    # Main layout wrapper
│   └── ProtectedRoute.tsx
├── contexts/         # React contexts
│   └── AuthContext.tsx
├── lib/             # Utilities and configs
│   ├── api.ts       # API client
│   ├── supabase.ts  # Supabase client
│   └── utils.ts     # Helper functions
├── pages/           # Page components
│   ├── LoginPage.tsx
│   ├── WorkOrdersPage.tsx
│   ├── WorkOrderDetailsPage.tsx
│   └── SettingsPage.tsx
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Features

- Authentication with Supabase
- Role-based access control
- Work order management
- Ticket creation and tracking
- Area management (admin)
- Search and filtering
- Print functionality
- Responsive design

## Available Routes

- `/login` - Authentication page
- `/work-orders` - Work orders list
- `/work-orders/:id` - Work order details
- `/settings` - Area management (admin only)
