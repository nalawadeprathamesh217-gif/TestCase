-- Phase 4 SQL Migration

-- Drop placeholder tables from initial schema
DROP TABLE IF EXISTS public.test_case_quality_scores CASCADE;
DROP TABLE IF EXISTS public.test_case_quality_evaluations CASCADE;
DROP TABLE IF EXISTS public.test_case_ai_explanations CASCADE;
DROP TABLE IF EXISTS public.test_case_requirement_coverage CASCADE;

-- 1. Create test_case_quality_evaluations table
CREATE TABLE IF NOT EXISTS public.test_case_quality_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    version_reference TEXT,
    completeness_score INTEGER CHECK (completeness_score >= 0 AND completeness_score <= 100),
    clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
    consistency_score INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 100),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    evaluation_method TEXT,
    ai_provider TEXT,
    ai_model TEXT,
    prompt_version TEXT,
    suggestions JSONB,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create test_case_ai_explanations table
CREATE TABLE IF NOT EXISTS public.test_case_ai_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    requirement_text TEXT,
    business_rule TEXT,
    condition TEXT,
    covered_behavior JSONB,
    reason TEXT,
    unsupported_assumptions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create test_case_requirement_coverage table
CREATE TABLE IF NOT EXISTS public.test_case_requirement_coverage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    coverage_type TEXT CHECK (coverage_type IN ('Full', 'Partial', 'None')),
    covered_behavior TEXT,
    coverage_reason TEXT,
    coverage_score INTEGER CHECK (coverage_score >= 0 AND coverage_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS and create policies
ALTER TABLE public.test_case_quality_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_ai_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_requirement_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quality_evaluations" ON public.test_case_quality_evaluations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert quality_evaluations" ON public.test_case_quality_evaluations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

CREATE POLICY "Authenticated users can view ai_explanations" ON public.test_case_ai_explanations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert ai_explanations" ON public.test_case_ai_explanations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

CREATE POLICY "Authenticated users can view requirement_coverage" ON public.test_case_requirement_coverage FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert requirement_coverage" ON public.test_case_requirement_coverage FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- 5. Add Indexes
CREATE INDEX IF NOT EXISTS idx_tc_quality_tc_id ON public.test_case_quality_evaluations(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_quality_evaluated ON public.test_case_quality_evaluations(evaluated_at);

CREATE INDEX IF NOT EXISTS idx_tc_aiexpl_tc_id ON public.test_case_ai_explanations(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_aiexpl_req_id ON public.test_case_ai_explanations(requirement_id);

CREATE INDEX IF NOT EXISTS idx_tc_cov_tc_id ON public.test_case_requirement_coverage(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_cov_req_id ON public.test_case_requirement_coverage(requirement_id);
