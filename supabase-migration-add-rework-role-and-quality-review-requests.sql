-- Migration: Add Rework role + Quality Ticket status + per-serial Quality Review Requests
-- Run this in your Supabase SQL Editor

-- 1) Add new user role: rework
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
      AND e.enumlabel = 'rework'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'rework';
  END IF;
END $$;

-- 2) Quality Ticket status: (Rework Needed / Closed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'quality_ticket_status'
  ) THEN
    CREATE TYPE public.quality_ticket_status AS ENUM ('Rework Needed', 'Closed');
  END IF;
END $$;

ALTER TABLE public.quality_tickets
  ADD COLUMN IF NOT EXISTS status public.quality_ticket_status NOT NULL DEFAULT 'Rework Needed';

CREATE INDEX IF NOT EXISTS idx_quality_tickets_status ON public.quality_tickets(status);

-- 3) Per-serial Quality Review Request (created by Rework, consumed by Quality)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'quality_review_request_status'
  ) THEN
    CREATE TYPE public.quality_review_request_status AS ENUM ('Pending', 'Reviewed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quality_ticket_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_ticket_id UUID NOT NULL REFERENCES public.quality_tickets(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  rework_notes TEXT,
  status public.quality_review_request_status NOT NULL DEFAULT 'Pending',
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Backfill/forward-compat if the table existed before adding rework_notes
ALTER TABLE public.quality_ticket_review_requests
  ADD COLUMN IF NOT EXISTS rework_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_qtrr_ticket_id ON public.quality_ticket_review_requests(quality_ticket_id);
CREATE INDEX IF NOT EXISTS idx_qtrr_status ON public.quality_ticket_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_qtrr_requested_at ON public.quality_ticket_review_requests(requested_at DESC);

-- One pending request per (ticket, serial) at a time; allows re-requesting after Reviewed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_qtrr_pending_ticket_serial
  ON public.quality_ticket_review_requests(quality_ticket_id, serial_number)
  WHERE status = 'Pending';


