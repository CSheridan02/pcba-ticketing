-- Migration: Add serial number range to work orders
-- Run this in your Supabase SQL Editor

-- Add serial number columns to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN serial_number_start TEXT,
ADD COLUMN serial_number_end TEXT;

-- Add comment to explain format
COMMENT ON COLUMN public.work_orders.serial_number_start IS 'Start of serial number range (format: #######W)';
COMMENT ON COLUMN public.work_orders.serial_number_end IS 'End of serial number range (format: #######W)';

-- Create index for better sorting performance
CREATE INDEX idx_work_orders_serial_number_start ON public.work_orders(serial_number_start) WHERE serial_number_start IS NOT NULL;

