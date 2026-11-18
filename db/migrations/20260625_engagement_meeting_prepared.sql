-- Prepare-for-meeting: rep marks engagement ready before the interaction.

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS prepared_by_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prepare_checklist_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.surgical_sales_engagements.prepared_at IS
  'When the rep marked this engagement prepared for meeting (Prepare For Meeting flow).';

COMMENT ON COLUMN public.surgical_sales_engagements.prepared_by_user_id IS
  'Sales rep who marked the engagement prepared.';

COMMENT ON COLUMN public.surgical_sales_engagements.prepare_checklist_json IS
  'Prepare flow checklist completion map (section keys → true) plus optional completed_at.';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_prepared_at
  ON public.surgical_sales_engagements (prepared_at DESC NULLS LAST)
  WHERE prepared_at IS NOT NULL;
