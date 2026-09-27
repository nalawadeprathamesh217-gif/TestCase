-- Phase 11 SQL Migration: Defect Management

-- 1. Extend test_case_executions table
ALTER TABLE public.test_case_executions
ADD COLUMN IF NOT EXISTS environment TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS execution_comment TEXT,
ADD COLUMN IF NOT EXISTS actual_result TEXT;

-- executed_by typically maps to executed_by_user_id or created_by. We'll use the existing executed_by field if it exists, else add it.
-- Let's check what exists. Typically we have executed_by or created_by. Assuming executed_by exists or we add it.
ALTER TABLE public.test_case_executions
ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES public.profiles(id);

-- 2. Create defects table
CREATE SEQUENCE IF NOT EXISTS defect_key_seq;

CREATE TABLE IF NOT EXISTS public.defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    defect_key TEXT UNIQUE NOT NULL DEFAULT ('BUG-' || nextval('defect_key_seq')),
    title TEXT NOT NULL,
    description TEXT,
    test_case_id UUID REFERENCES public.test_cases(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
    execution_id UUID REFERENCES public.test_case_executions(id) ON DELETE SET NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    priority TEXT NOT NULL CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Reopened', 'Closed', 'Rejected')),
    assigned_to UUID REFERENCES public.profiles(id),
    reported_by UUID NOT NULL REFERENCES public.profiles(id),
    environment TEXT,
    browser TEXT,
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for defects
CREATE INDEX IF NOT EXISTS idx_defects_defect_key ON public.defects(defect_key);
CREATE INDEX IF NOT EXISTS idx_defects_status ON public.defects(status);
CREATE INDEX IF NOT EXISTS idx_defects_severity ON public.defects(severity);
CREATE INDEX IF NOT EXISTS idx_defects_priority ON public.defects(priority);
CREATE INDEX IF NOT EXISTS idx_defects_test_case_id ON public.defects(test_case_id);
CREATE INDEX IF NOT EXISTS idx_defects_requirement_id ON public.defects(requirement_id);
CREATE INDEX IF NOT EXISTS idx_defects_execution_id ON public.defects(execution_id);
CREATE INDEX IF NOT EXISTS idx_defects_assigned_to ON public.defects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_defects_reported_by ON public.defects(reported_by);

-- RLS for defects
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;

-- Admins and Test Managers can do everything. Testers can read all, create, update assigned to them or reported by them.
CREATE POLICY "Users can view all defects"
    ON public.defects FOR SELECT
    USING (true);

CREATE POLICY "Users can insert defects"
    ON public.defects FOR INSERT
    WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can update defects"
    ON public.defects FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'test_manager')
        )
        OR auth.uid() = assigned_to
        OR auth.uid() = reported_by
    );

CREATE POLICY "Admins and test managers can delete defects"
    ON public.defects FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role IN ('admin', 'test_manager')
        )
    );
