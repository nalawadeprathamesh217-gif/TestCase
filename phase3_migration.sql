-- Phase 3 SQL Migration

-- 1. Modify test_cases table to include generation metadata
ALTER TABLE public.test_cases
ADD COLUMN IF NOT EXISTS generation_method TEXT DEFAULT 'Manual',
ADD COLUMN IF NOT EXISTS generation_run_id UUID,
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE;

-- 2. Create test_case_generation_runs table
CREATE TABLE IF NOT EXISTS public.test_case_generation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id),
    ai_provider TEXT,
    ai_model TEXT,
    prompt_version TEXT,
    requested_count INTEGER,
    generated_count INTEGER DEFAULT 0,
    accepted_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create test_case_generation_candidates table
CREATE TABLE IF NOT EXISTS public.test_case_generation_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_run_id UUID NOT NULL REFERENCES public.test_case_generation_runs(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    temporary_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    preconditions JSONB,
    test_steps JSONB,
    expected_result TEXT,
    test_type TEXT CHECK (test_type IN ('Functional', 'Negative', 'Validation', 'Boundary', 'Integration', 'Regression', 'Security', 'Performance', 'Other')),
    priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    risk TEXT CHECK (risk IN ('High', 'Medium', 'Low')),
    review_status TEXT DEFAULT 'Pending' CHECK (review_status IN ('Pending', 'Accepted', 'Rejected', 'Edited')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS and create policies
ALTER TABLE public.test_case_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_generation_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view generation_runs" ON public.test_case_generation_runs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert/update generation_runs" ON public.test_case_generation_runs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

CREATE POLICY "Authenticated users can view generation_candidates" ON public.test_case_generation_candidates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert/update generation_candidates" ON public.test_case_generation_candidates FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- 5. Add Indexes
CREATE INDEX IF NOT EXISTS idx_tc_genruns_req_id ON public.test_case_generation_runs(requirement_id);
CREATE INDEX IF NOT EXISTS idx_tc_genruns_req_by ON public.test_case_generation_runs(requested_by);
CREATE INDEX IF NOT EXISTS idx_tc_genruns_created ON public.test_case_generation_runs(created_at);

CREATE INDEX IF NOT EXISTS idx_tc_gencands_run_id ON public.test_case_generation_candidates(generation_run_id);
CREATE INDEX IF NOT EXISTS idx_tc_gencands_req_id ON public.test_case_generation_candidates(requirement_id);
CREATE INDEX IF NOT EXISTS idx_tc_gencands_status ON public.test_case_generation_candidates(review_status);

CREATE INDEX IF NOT EXISTS idx_testcases_gen_method ON public.test_cases(generation_method);

-- Trigger to update updated_at on candidates
CREATE TRIGGER update_test_case_generation_candidates_modtime 
BEFORE UPDATE ON test_case_generation_candidates 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
