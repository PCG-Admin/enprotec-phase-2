-- ─── Open Actions table for closed-loop deviation tracking ───
-- Deviations from inspections are tracked as open actions until
-- a fleet controller resolves them with proof (photo/PDF).

CREATE TABLE IF NOT EXISTS public.open_actions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    UUID        NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  vehicle_id       UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  deviation_id     TEXT        NOT NULL,
  item             TEXT        NOT NULL,
  deviation        TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  proof_url        TEXT,
  proof_type       TEXT,
  resolved_by      UUID        REFERENCES public.en_users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER trg_open_actions_updated_at
  BEFORE UPDATE ON public.open_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.open_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY open_actions_select ON public.open_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY open_actions_insert ON public.open_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY open_actions_update ON public.open_actions FOR UPDATE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_open_actions_status     ON public.open_actions(status);
CREATE INDEX IF NOT EXISTS idx_open_actions_vehicle    ON public.open_actions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_open_actions_inspection ON public.open_actions(inspection_id);
