-- Migration: Add Boards + Cycle Times + link Work Orders to Boards
-- Run this in your Supabase SQL Editor

-- 1) Create boards table
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asm_number TEXT NOT NULL UNIQUE,
  internal_g_number TEXT UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Create board_cycle_times table (multiple entries per board, keyed by free-text machine name)
CREATE TABLE public.board_cycle_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  machine_name TEXT NOT NULL,
  cycle_time_seconds NUMERIC NOT NULL CHECK (cycle_time_seconds > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_board_cycle_times_board_id ON public.board_cycle_times(board_id);

-- 3) Link work_orders to boards
ALTER TABLE public.work_orders
ADD COLUMN board_id UUID;

-- 4) Backfill boards from existing work orders (internal_g_number remains NULL for these)
INSERT INTO public.boards (asm_number, description)
SELECT DISTINCT wo.asm_number, wo.description
FROM public.work_orders wo
ON CONFLICT (asm_number) DO NOTHING;

-- Ensure any missing ASM numbers get a board row even if there are conflicts/partial data
INSERT INTO public.boards (asm_number, description)
SELECT DISTINCT wo.asm_number, wo.description
FROM public.work_orders wo
WHERE wo.board_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.boards b WHERE b.asm_number = wo.asm_number
  )
ON CONFLICT (asm_number) DO NOTHING;

-- 5) Backfill work_orders.board_id using asm_number
UPDATE public.work_orders wo
SET board_id = b.id
FROM public.boards b
WHERE wo.board_id IS NULL
  AND wo.asm_number = b.asm_number;

-- 6) Add FK + NOT NULL constraint now that existing rows are linked
ALTER TABLE public.work_orders
ADD CONSTRAINT work_orders_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id);

ALTER TABLE public.work_orders
ALTER COLUMN board_id SET NOT NULL;

CREATE INDEX idx_work_orders_board_id ON public.work_orders(board_id);

-- 7) Enable RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_cycle_times ENABLE ROW LEVEL SECURITY;

-- 8) RLS Policies for boards
CREATE POLICY "Anyone can view boards" ON public.boards
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert boards" ON public.boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update boards" ON public.boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete boards" ON public.boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 9) RLS Policies for board_cycle_times
CREATE POLICY "Anyone can view board cycle times" ON public.board_cycle_times
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert board cycle times" ON public.board_cycle_times
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update board cycle times" ON public.board_cycle_times
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete board cycle times" ON public.board_cycle_times
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );




