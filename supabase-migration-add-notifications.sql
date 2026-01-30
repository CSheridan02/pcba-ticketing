-- Migration: In-app notifications (events + per-user deliveries)
-- Run this in your Supabase SQL Editor

-- 1) Event type enums (kept simple for v1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'notification_entity_type'
  ) THEN
    CREATE TYPE public.notification_entity_type AS ENUM (
      'work_order',
      'ticket',
      'quality_ticket',
      'review_request'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'notification_event_type'
  ) THEN
    CREATE TYPE public.notification_event_type AS ENUM (
      'work_order.updated',
      'work_order.status_changed',
      'work_order.quality_result_changed',
      'ticket.created',
      'ticket.status_changed',
      'ticket.comment_added',
      'quality_ticket.created',
      'quality_ticket.status_changed',
      'quality_ticket.comment_added',
      'rework.review_requested',
      'quality.reviewed'
    );
  END IF;
END $$;

-- 2) Events table (one row per action)
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.notification_event_type NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type public.notification_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON public.notification_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_entity ON public.notification_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(type);

-- 3) Deliveries table (one row per recipient)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.notification_events(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_event ON public.notifications(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications(user_id, created_at DESC);


