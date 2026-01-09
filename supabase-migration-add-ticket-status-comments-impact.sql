-- Migration: Add ticket status + ticket comments, and rename Priority -> Impact
-- Run this script in Supabase SQL Editor AFTER your initial schema is already applied.

-- 1) Rename ticket priority enum + column to "impact"
DO $$
BEGIN
  -- Rename enum type if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'ticket_priority'
  ) THEN
    ALTER TYPE public.ticket_priority RENAME TO ticket_impact;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- If ticket_impact already exists, ignore
    NULL;
END $$;

DO $$
BEGIN
  -- Rename column if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.tickets RENAME COLUMN priority TO impact;
  END IF;
END $$;

-- Ensure default + type on the renamed column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'impact'
  ) THEN
    ALTER TABLE public.tickets
      ALTER COLUMN impact TYPE public.ticket_impact USING impact::text::public.ticket_impact,
      ALTER COLUMN impact SET DEFAULT 'Medium';
  END IF;
END $$;

-- 2) Add ticket status enum + column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'ticket_status'
  ) THEN
    CREATE TYPE public.ticket_status AS ENUM (
      'Unresolved',
      'Under Investigation',
      'In Progress',
      'Blocked',
      'Resolved'
    );
  END IF;
END $$;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS status public.ticket_status NOT NULL DEFAULT 'Unresolved';

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

-- 3) Ticket comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON public.ticket_comments(created_at ASC);

-- 4) RLS for comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ticket_comments'
      AND policyname = 'Anyone can view ticket comments'
  ) THEN
    CREATE POLICY "Anyone can view ticket comments" ON public.ticket_comments
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ticket_comments'
      AND policyname = 'Authenticated users can create ticket comments'
  ) THEN
    CREATE POLICY "Authenticated users can create ticket comments" ON public.ticket_comments
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ticket_comments'
      AND policyname = 'Users can update own ticket comments'
  ) THEN
    CREATE POLICY "Users can update own ticket comments" ON public.ticket_comments
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ticket_comments'
      AND policyname = 'Admins can update any ticket comment'
  ) THEN
    CREATE POLICY "Admins can update any ticket comment" ON public.ticket_comments
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
      AND tablename = 'ticket_comments'
      AND policyname = 'Users can delete own ticket comments'
  ) THEN
    CREATE POLICY "Users can delete own ticket comments" ON public.ticket_comments
      FOR DELETE USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ticket_comments'
      AND policyname = 'Admins can delete any ticket comment'
  ) THEN
    CREATE POLICY "Admins can delete any ticket comment" ON public.ticket_comments
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;


