-- Migration: Add revision field to boards
-- Run this in your Supabase SQL Editor

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS revision TEXT;
