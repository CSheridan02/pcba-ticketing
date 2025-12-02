-- Migration: Add image support to tickets
-- Run this in your Supabase SQL Editor

-- 1. Add images column to tickets table (stores array of image URLs)
ALTER TABLE public.tickets 
ADD COLUMN images TEXT[] DEFAULT '{}';

-- 2. Create storage bucket for ticket images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-images',
  'ticket-images',
  true,  -- Make bucket public so images can be viewed
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policies for ticket-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload ticket images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own ticket images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow everyone to view ticket images (since bucket is public)
CREATE POLICY "Anyone can view ticket images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own ticket images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-images' AND auth.uid()::text = (storage.foldername(name))[1]);

