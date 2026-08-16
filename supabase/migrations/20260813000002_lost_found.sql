-- ============================================================
-- Migration: Lost & Found feature
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lost_found (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('lost', 'found')),
  title       TEXT        NOT NULL,
  description TEXT,
  image_url   TEXT,
  location    TEXT,
  contact     TEXT,
  status      TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_found TO authenticated;
GRANT ALL ON public.lost_found TO service_role;

-- Row Level Security
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all items
CREATE POLICY "Lost found readable by authenticated"
  ON public.lost_found FOR SELECT TO authenticated
  USING (true);

-- Only owner can insert
CREATE POLICY "Users insert own lost found"
  ON public.lost_found FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only owner can update (e.g., mark as resolved)
CREATE POLICY "Users update own lost found"
  ON public.lost_found FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only owner can delete
CREATE POLICY "Users delete own lost found"
  ON public.lost_found FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable Realtime so the UI updates when new items are posted
ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_found;
