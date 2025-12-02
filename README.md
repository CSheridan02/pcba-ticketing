# PCBA Work Order Ticketing System

A full-stack work order and ticketing system for PCBA manufacturing operations.

> 🚀 **Quick Start**: See [QUICK_FIX.md](QUICK_FIX.md) for setup instructions after the latest fixes!
> 
> 📚 **Full Guide**: See [GETTING_STARTED.md](GETTING_STARTED.md) for detailed walkthrough

## Tech Stack

- **Frontend**: React + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: NestJS + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Project Structure

```
├── frontend/          # React frontend application
├── backend/           # NestJS backend API
└── package.json       # Root workspace configuration
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Install dependencies:
```bash
npm install
npm run install:all
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in both `frontend/` and `backend/` directories
   - Fill in your Supabase credentials

3. Run the development servers:
```bash
npm run dev
```

This will start both the backend (http://localhost:3000) and frontend (http://localhost:5173).

## Features

- User authentication with role-based access control
- Work order management (create, view, update, search, filter)
- Ticket tracking system
- Configurable production areas
- Print functionality for work orders
- Real-time updates

## User Roles

- **Admin**: Full access including area management and settings
- **Line Operator**: Create and view work orders and tickets

