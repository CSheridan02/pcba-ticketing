# PCBA Ticketing System - Backend

NestJS backend API for the PCBA Work Order Ticketing System.

## Tech Stack

- **NestJS** with TypeScript
- **Supabase** for database and authentication
- **Passport JWT** for authentication
- **Class Validator** for input validation

## Development

```bash
# Install dependencies
npm install

# Start development server with watch mode
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

## Environment Variables

Create a `.env` file with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
PORT=3000
```

## Project Structure

```
src/
├── auth/              # Authentication module
│   ├── guards/        # JWT and role guards
│   ├── decorators/    # Custom decorators
│   └── strategies/    # Passport strategies
├── users/             # Users module
├── work-orders/       # Work orders module
├── tickets/           # Tickets module
├── areas/             # Areas module
├── supabase/          # Supabase service
├── config/            # Configuration files
└── main.ts            # Application entry point
```

## API Endpoints

### Authentication
- `GET /auth/me` - Get current user profile

### Work Orders
- `GET /work-orders` - List all work orders (supports search and filters)
- `GET /work-orders/active` - Get active work orders
- `GET /work-orders/:id` - Get work order details
- `POST /work-orders` - Create work order
- `PATCH /work-orders/:id` - Update work order
- `DELETE /work-orders/:id` - Delete work order

### Tickets
- `GET /tickets` - List all tickets (can filter by work order)
- `GET /tickets/:id` - Get ticket details
- `POST /tickets` - Create ticket
- `PATCH /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket

### Areas
- `GET /areas` - List all areas
- `POST /areas` - Create area (admin only)
- `DELETE /areas/:id` - Delete area (admin only)

### Users
- `GET /users` - List all users
- `GET /users/:id` - Get user details
- `PATCH /users/:id/role` - Update user role (admin only)

## Authentication

All endpoints (except authentication) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The JWT token is obtained from Supabase authentication.

## Role-Based Access Control

Two roles are supported:
- `line_operator` - Default role, can create work orders and tickets
- `admin` - Can access all features including area management

Use the `@Roles()` decorator to protect endpoints:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
```

## Database Schema

The backend uses Supabase PostgreSQL with the following tables:
- `users` - User profiles
- `work_orders` - Work order records
- `tickets` - Issue tickets
- `areas` - Production areas

See `supabase-schema.sql` for full schema definition.
