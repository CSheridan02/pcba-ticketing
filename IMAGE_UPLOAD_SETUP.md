# Image Upload Feature - Setup Guide

## Overview
The ticket system now supports optional image uploads! Users can:
- Drag and drop images
- Use their phone camera to take pictures
- Select images from their gallery
- Upload up to 5 images per ticket (5MB each)
- View images by clicking thumbnails (opens in new tab)

## Database Migration

**IMPORTANT:** Run this SQL migration in your Supabase SQL Editor before deploying:

```sql
-- File: supabase-migration-add-images.sql

-- 1. Add images column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN images TEXT[] DEFAULT '{}';

-- 2. Create storage bucket for ticket images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-images',
  'ticket-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policies
CREATE POLICY "Authenticated users can upload ticket images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-images');

CREATE POLICY "Users can update their own ticket images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view ticket images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket-images');

CREATE POLICY "Users can delete their own ticket images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Deployment Steps

1. **Run the SQL migration** in Supabase SQL Editor (see above)

2. **Push your code:**
```bash
git push
```

3. **Verify in Supabase Dashboard:**
   - Go to Storage > Buckets
   - You should see a new `ticket-images` bucket
   - Check that it's marked as "Public"

## Features

### For Desktop Users:
- Drag and drop images into the upload area
- Click "Choose Files" to browse and select images
- Preview images before submitting
- Remove individual images before upload

### For Mobile Users:
- Click "Take Photo" to use the camera
- Click "Choose Files" to select from gallery
- Same preview and removal capabilities

### Image Display:
- Thumbnails appear on ticket cards
- Click any thumbnail to view full-size in new tab
- Print view shows count of images (not the actual images)

### Technical Details:
- Images stored in Supabase Storage
- URLs saved in tickets table as array
- File validation: type, size, count
- Secure: users can only manage their own images
- Public viewing (as images are for work orders)

## Supported Formats
- JPEG/JPG
- PNG
- WebP
- HEIC (iOS photos)

## Limits
- Maximum 5 images per ticket
- Maximum 5MB per image
- Recommended: compress images on mobile before upload

## Troubleshooting

**"Failed to upload images":**
- Check Supabase Storage bucket is created
- Verify RLS policies are set correctly
- Check file size and format
- Ensure user is authenticated

**Images not displaying:**
- Check bucket is set to "Public"
- Verify URL is accessible
- Check browser console for errors

**Camera not working on mobile:**
- Ensure HTTPS (required for camera access)
- Check browser permissions
- Try "Choose Files" as fallback


