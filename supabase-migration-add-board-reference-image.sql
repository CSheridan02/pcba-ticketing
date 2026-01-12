-- Migration: Add optional reference image URL to boards
-- Run this in your Supabase SQL Editor

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS reference_image_url TEXT;


