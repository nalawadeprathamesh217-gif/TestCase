-- Phase 7 SQL Migration: Version History & Advanced Search

-- 1. Create test_case_versions table
CREATE TABLE IF NOT EXISTS public.test_case_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot fields
    title TEXT NOT NULL,
    description TEXT,
    preconditions JSONB,
    test_steps JSONB,
    expected_result TEXT,
    test_type TEXT,
    priority TEXT,
    risk TEXT,
    status TEXT,
    execution_result TEXT,
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
    
    -- Version metadata
    change_type TEXT NOT NULL CHECK (change_type IN ('Created', 'Edited', 'Imported', 'Restored', 'Requirement Changed', 'Status Changed', 'Execution Updated', 'Bulk Updated', 'Legacy Snapshot')),
    change_summary TEXT,
    changed_fields JSONB,
    
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Ensure sequential versions per test case
    UNIQUE (test_case_id, version_number)
);

-- 2. Create saved_filters table
CREATE TABLE IF NOT EXISTS public.saved_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('test_cases', 'requirements')),
    filter_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Modify test_cases to track stale quality/duplicates
ALTER TABLE public.test_cases
ADD COLUMN IF NOT EXISTS quality_stale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicates_stale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version_count INTEGER DEFAULT 1;

-- 4. Enable RLS
ALTER TABLE public.test_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Authenticated users can view test_case_versions" ON public.test_case_versions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert test_case_versions" ON public.test_case_versions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester', 'test_manager')));

CREATE POLICY "Users can manage their own saved filters" ON public.saved_filters FOR ALL USING (user_id = auth.uid());

-- 6. Add Search Indexes
CREATE INDEX IF NOT EXISTS idx_versions_tc_id ON public.test_case_versions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON public.test_case_versions(created_at);

CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON public.saved_filters(user_id);

-- 7. Add Full Text Search Vectors (PostgreSQL native search)
ALTER TABLE public.test_cases ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(expected_result, '')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS idx_test_cases_search ON public.test_cases USING GIN(search_vector);

ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(acceptance_criteria, '')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS idx_requirements_search ON public.requirements USING GIN(search_vector);
