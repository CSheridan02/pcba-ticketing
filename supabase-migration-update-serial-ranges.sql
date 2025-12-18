-- Migration: Update serial numbers to support multiple ranges
-- Run this in your Supabase SQL Editor

-- 1. Add new JSONB column for multiple ranges
ALTER TABLE public.work_orders 
ADD COLUMN serial_ranges JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing data from old columns to new format
UPDATE public.work_orders
SET serial_ranges = jsonb_build_array(
  jsonb_build_object(
    'start', serial_number_start,
    'end', serial_number_end
  )
)
WHERE serial_number_start IS NOT NULL 
  AND serial_number_end IS NOT NULL;

-- 3. Drop old columns (after verifying migration worked)
-- IMPORTANT: Check your data first before running these!
-- ALTER TABLE public.work_orders DROP COLUMN serial_number_start;
-- ALTER TABLE public.work_orders DROP COLUMN serial_number_end;
-- DROP INDEX IF EXISTS idx_work_orders_serial_number_start;

-- 4. Add comment explaining the new format
COMMENT ON COLUMN public.work_orders.serial_ranges IS 
'Array of serial number ranges in format: [{"start": "1234567W", "end": "1234890W"}, ...]';

-- 5. Create index for searching in JSONB
CREATE INDEX idx_work_orders_serial_ranges ON public.work_orders USING GIN (serial_ranges);

-- Example data format:
-- serial_ranges = [
--   {"start": "1234567W", "end": "1234890W"},
--   {"start": "2345678W", "end": "2345900W"}
-- ]

