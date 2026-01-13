-- Migration: Add Quality role, Quality Tickets, Work Order post-production statuses, and Work Order quality result
-- Run this in your Supabase SQL Editor

-- 1) Add new user role: quality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
      AND e.enumlabel = 'quality'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'quality';
  END IF;
END $$;

-- 2) Extend work_order_status enum with production/quality workflow states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'work_order_status'
      AND e.enumlabel = 'Production Done'
  ) THEN
    ALTER TYPE public.work_order_status ADD VALUE 'Production Done';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'work_order_status'
      AND e.enumlabel = 'Quality Received'
  ) THEN
    ALTER TYPE public.work_order_status ADD VALUE 'Quality Received';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'work_order_status'
      AND e.enumlabel = 'Quality Done'
  ) THEN
    ALTER TYPE public.work_order_status ADD VALUE 'Quality Done';
  END IF;

  -- Keep Completed in the enum; no-op if already present.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'work_order_status'
      AND e.enumlabel = 'Completed'
  ) THEN
    ALTER TYPE public.work_order_status ADD VALUE 'Completed';
  END IF;
END $$;

-- 3) Add Work Order quality result (Hold/Pass/Fail)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'work_order_quality_result'
  ) THEN
    CREATE TYPE public.work_order_quality_result AS ENUM ('Hold', 'Pass', 'Fail');
  END IF;
END $$;

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS quality_result public.work_order_quality_result NOT NULL DEFAULT 'Hold';

CREATE INDEX IF NOT EXISTS idx_work_orders_quality_result ON public.work_orders(quality_result);

-- 4) Quality Tickets: number generator
CREATE OR REPLACE FUNCTION public.generate_quality_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'QT-' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 5) Quality tickets table
CREATE TABLE IF NOT EXISTS public.quality_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_ticket_number TEXT NOT NULL UNIQUE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  serial_numbers TEXT[] NOT NULL,
  images TEXT[] DEFAULT '{}',
  submitted_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_tickets_work_order_id ON public.quality_tickets(work_order_id);
CREATE INDEX IF NOT EXISTS idx_quality_tickets_submitted_by ON public.quality_tickets(submitted_by);
CREATE INDEX IF NOT EXISTS idx_quality_tickets_created_at ON public.quality_tickets(created_at DESC);

-- 6) Quality ticket comments table (parity with operator tickets)
CREATE TABLE IF NOT EXISTS public.quality_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_ticket_id UUID NOT NULL REFERENCES public.quality_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_ticket_comments_ticket_id ON public.quality_ticket_comments(quality_ticket_id);
CREATE INDEX IF NOT EXISTS idx_quality_ticket_comments_created_at ON public.quality_ticket_comments(created_at ASC);

-- 7) RLS enablement
ALTER TABLE public.quality_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_ticket_comments ENABLE ROW LEVEL SECURITY;

-- 8) RLS policies for quality_tickets (mirrors tickets patterns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_tickets'
      AND policyname = 'Anyone can view quality tickets'
  ) THEN
    CREATE POLICY "Anyone can view quality tickets" ON public.quality_tickets
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_tickets'
      AND policyname = 'Authenticated users can create quality tickets'
  ) THEN
    CREATE POLICY "Authenticated users can create quality tickets" ON public.quality_tickets
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_tickets'
      AND policyname = 'Users can update own quality tickets'
  ) THEN
    CREATE POLICY "Users can update own quality tickets" ON public.quality_tickets
      FOR UPDATE USING (submitted_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_tickets'
      AND policyname = 'Admins can update any quality ticket'
  ) THEN
    CREATE POLICY "Admins can update any quality ticket" ON public.quality_tickets
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_tickets'
      AND policyname = 'Users can delete own quality tickets'
  ) THEN
    CREATE POLICY "Users can delete own quality tickets" ON public.quality_tickets
      FOR DELETE USING (submitted_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_tickets'
      AND policyname = 'Admins can delete any quality ticket'
  ) THEN
    CREATE POLICY "Admins can delete any quality ticket" ON public.quality_tickets
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 9) RLS policies for quality_ticket_comments (mirrors ticket_comments patterns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_ticket_comments'
      AND policyname = 'Anyone can view quality ticket comments'
  ) THEN
    CREATE POLICY "Anyone can view quality ticket comments" ON public.quality_ticket_comments
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_ticket_comments'
      AND policyname = 'Authenticated users can create quality ticket comments'
  ) THEN
    CREATE POLICY "Authenticated users can create quality ticket comments" ON public.quality_ticket_comments
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_ticket_comments'
      AND policyname = 'Users can update own quality ticket comments'
  ) THEN
    CREATE POLICY "Users can update own quality ticket comments" ON public.quality_ticket_comments
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_ticket_comments'
      AND policyname = 'Admins can update any quality ticket comment'
  ) THEN
    CREATE POLICY "Admins can update any quality ticket comment" ON public.quality_ticket_comments
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_ticket_comments'
      AND policyname = 'Users can delete own quality ticket comments'
  ) THEN
    CREATE POLICY "Users can delete own quality ticket comments" ON public.quality_ticket_comments
      FOR DELETE USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quality_ticket_comments'
      AND policyname = 'Admins can delete any quality ticket comment'
  ) THEN
    CREATE POLICY "Admins can delete any quality ticket comment" ON public.quality_ticket_comments
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;




