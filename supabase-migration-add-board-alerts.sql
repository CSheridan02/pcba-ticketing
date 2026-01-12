-- Migration: Add Board Alerts + Work Order Alerts (copied from board on WO create)
-- Run this in your Supabase SQL Editor

-- 1) Board alerts (configured per board)
CREATE TABLE IF NOT EXISTS public.board_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_alerts_board_id ON public.board_alerts(board_id);

-- 2) Work order alerts (snapshot copied from board alerts at work order creation time)
CREATE TABLE IF NOT EXISTS public.work_order_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  board_alert_id UUID REFERENCES public.board_alerts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_alerts_work_order_id ON public.work_order_alerts(work_order_id);

-- 3) Enable RLS
ALTER TABLE public.board_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_alerts ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies for board_alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'board_alerts'
      AND policyname = 'Anyone can view board alerts'
  ) THEN
    CREATE POLICY "Anyone can view board alerts" ON public.board_alerts
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'board_alerts'
      AND policyname = 'Only admins can insert board alerts'
  ) THEN
    CREATE POLICY "Only admins can insert board alerts" ON public.board_alerts
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'board_alerts'
      AND policyname = 'Only admins can update board alerts'
  ) THEN
    CREATE POLICY "Only admins can update board alerts" ON public.board_alerts
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'board_alerts'
      AND policyname = 'Only admins can delete board alerts'
  ) THEN
    CREATE POLICY "Only admins can delete board alerts" ON public.board_alerts
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 5) RLS Policies for work_order_alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'work_order_alerts'
      AND policyname = 'Anyone can view work order alerts'
  ) THEN
    CREATE POLICY "Anyone can view work order alerts" ON public.work_order_alerts
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'work_order_alerts'
      AND policyname = 'Only admins can insert work order alerts'
  ) THEN
    CREATE POLICY "Only admins can insert work order alerts" ON public.work_order_alerts
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'work_order_alerts'
      AND policyname = 'Only admins can delete work order alerts'
  ) THEN
    CREATE POLICY "Only admins can delete work order alerts" ON public.work_order_alerts
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;


