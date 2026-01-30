-- Migration: Add Quality review outcome (Pass/Fail) + review notes + rework completion timestamp
-- Run this in your Supabase SQL Editor

-- 1) Review outcome enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'quality_review_outcome'
  ) THEN
    CREATE TYPE public.quality_review_outcome AS ENUM ('Pass', 'Fail');
  END IF;
END $$;

-- 2) Add columns to review requests table
ALTER TABLE public.quality_ticket_review_requests
  ADD COLUMN IF NOT EXISTS rework_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS review_outcome public.quality_review_outcome,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_qtrr_review_outcome ON public.quality_ticket_review_requests(review_outcome);


