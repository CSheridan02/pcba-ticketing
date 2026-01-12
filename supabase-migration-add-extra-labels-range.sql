-- Migration: Add extra label range support to work orders
-- Run this in your Supabase SQL Editor

-- Adds support for an optional "extra labels" range (typically +4) used for printed labels.
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS has_extra_labels BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extra_label_range JSONB;

COMMENT ON COLUMN public.work_orders.has_extra_labels IS
'Whether the work order includes an extra labels range for printed labels.';

COMMENT ON COLUMN public.work_orders.extra_label_range IS
'Optional extra labels range in format: {"start": "1234567W", "end": "1234570W"}';

-- Optional: index for JSONB queries (not required for current UI, but safe to have)
CREATE INDEX IF NOT EXISTS idx_work_orders_extra_label_range ON public.work_orders USING GIN (extra_label_range);


