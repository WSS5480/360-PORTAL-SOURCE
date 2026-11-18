-- Sales Command: tasks, activity timeline, closed-lost reason (common CRM rep features)

ALTER TABLE public.sales_opportunities
  ADD COLUMN IF NOT EXISTS closed_lost_reason text;

COMMENT ON COLUMN public.sales_opportunities.closed_lost_reason IS
  'Optional reason when stage is closed_lost (e.g. no_budget, chose_competitor).';

CREATE TABLE IF NOT EXISTS public.sales_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.sales_opportunities (id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  due_date date NOT NULL,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_tasks_opportunity ON public.sales_tasks (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_owner_due ON public.sales_tasks (owner_user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_open ON public.sales_tasks (owner_user_id) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.sales_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.sales_opportunities (id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (
    activity_type IN ('call', 'email', 'meeting', 'note', 'other')
  ),
  summary text NOT NULL,
  activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_activities_opportunity ON public.sales_activities (opportunity_id, activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_activities_owner_at ON public.sales_activities (owner_user_id, activity_at DESC);

ALTER TABLE public.sales_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_tasks TO authenticated;
GRANT ALL ON public.sales_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_activities TO authenticated;
GRANT ALL ON public.sales_activities TO service_role;

-- RLS: same access as parent opportunity (owner or internal portal admin)
DROP POLICY IF EXISTS sales_tasks_select ON public.sales_tasks;
CREATE POLICY sales_tasks_select ON public.sales_tasks FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_tasks_insert ON public.sales_tasks;
CREATE POLICY sales_tasks_insert ON public.sales_tasks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
  AND owner_user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS sales_tasks_update ON public.sales_tasks;
CREATE POLICY sales_tasks_update ON public.sales_tasks FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_tasks_delete ON public.sales_tasks;
CREATE POLICY sales_tasks_delete ON public.sales_tasks FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_tasks.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_activities_select ON public.sales_activities;
CREATE POLICY sales_activities_select ON public.sales_activities FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_activities_insert ON public.sales_activities;
CREATE POLICY sales_activities_insert ON public.sales_activities FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
  AND owner_user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS sales_activities_update ON public.sales_activities;
CREATE POLICY sales_activities_update ON public.sales_activities FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);

DROP POLICY IF EXISTS sales_activities_delete ON public.sales_activities;
CREATE POLICY sales_activities_delete ON public.sales_activities FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.sales_opportunities o
    WHERE o.id = sales_activities.opportunity_id
      AND (
        o.owner_user_id = (SELECT auth.uid())
        OR EXISTS (SELECT 1 FROM public.internal_users i WHERE i.user_id = (SELECT auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.user_profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin = true
        )
      )
  )
);
