-- PCBA Work Order Ticketing System Database Schema
-- Run this script in your Supabase SQL Editor

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'line_operator');
CREATE TYPE work_order_status AS ENUM ('Not Started', 'Active', 'Completed');
CREATE TYPE ticket_priority AS ENUM ('Low', 'Medium', 'High');

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'line_operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create areas table
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create work_orders table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT NOT NULL UNIQUE,
  asm_number TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status work_order_status NOT NULL DEFAULT 'Not Started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.users(id)
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  priority ticket_priority NOT NULL DEFAULT 'Medium',
  area_id UUID NOT NULL REFERENCES public.areas(id),
  description TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_created_by ON public.work_orders(created_by);
CREATE INDEX idx_work_orders_created_at ON public.work_orders(created_at DESC);
CREATE INDEX idx_tickets_work_order_id ON public.tickets(work_order_id);
CREATE INDEX idx_tickets_area_id ON public.tickets(area_id);
CREATE INDEX idx_tickets_submitted_by ON public.tickets(submitted_by);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for areas table
CREATE POLICY "Anyone can view areas" ON public.areas
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert areas" ON public.areas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete areas" ON public.areas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for work_orders table
CREATE POLICY "Anyone can view work orders" ON public.work_orders
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create work orders" ON public.work_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own work orders" ON public.work_orders
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any work order" ON public.work_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for tickets table
CREATE POLICY "Anyone can view tickets" ON public.tickets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own tickets" ON public.tickets
  FOR UPDATE USING (submitted_by = auth.uid());

CREATE POLICY "Admins can update any ticket" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default areas
INSERT INTO public.areas (name) VALUES
  ('Assembly'),
  ('Quality Control'),
  ('Packaging');

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'line_operator'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate work order number
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  -- Generate a 7-digit number
  new_number := LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  -- Generate ticket number with format TKT-{timestamp}
  RETURN 'TKT-' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

