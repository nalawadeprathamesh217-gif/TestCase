-- Phase 6 SQL Migration: Excel & CSV Import

-- 1. Create test_case_imports table
CREATE TABLE IF NOT EXISTS public.test_case_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT,
    worksheet_name TEXT,
    file_size BIGINT,
    file_hash TEXT,
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    invalid_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    imported_records INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'mapping', 'validating', 'ready', 'importing', 'completed', 'failed', 'cancelled')),
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 2. Create test_case_import_rows table
CREATE TABLE IF NOT EXISTS public.test_case_import_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID NOT NULL REFERENCES public.test_case_imports(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    raw_data JSONB,
    mapped_data JSONB,
    validation_status TEXT CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    validation_errors JSONB,
    duplicate_status TEXT DEFAULT 'not_checked' CHECK (duplicate_status IN ('not_checked', 'no_duplicate', 'possible_duplicate', 'exact_duplicate', 'confirmed_duplicate')),
    duplicate_test_case_id UUID REFERENCES public.test_cases(id) ON DELETE SET NULL,
    created_test_case_id UUID REFERENCES public.test_cases(id) ON DELETE SET NULL,
    import_decision TEXT CHECK (import_decision IN ('import', 'skip', 'review')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create test_case_import_mappings table
CREATE TABLE IF NOT EXISTS public.test_case_import_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID NOT NULL REFERENCES public.test_case_imports(id) ON DELETE CASCADE,
    source_column TEXT NOT NULL,
    target_field TEXT,
    mapping_type TEXT CHECK (mapping_type IN ('auto', 'manual', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Extend test_cases table for import metadata
ALTER TABLE public.test_cases
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'ai', 'import')),
ADD COLUMN IF NOT EXISTS source_import_id UUID REFERENCES public.test_case_imports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- 5. Enable RLS
ALTER TABLE public.test_case_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_import_mappings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
CREATE POLICY "Authenticated users can view test_case_imports" ON public.test_case_imports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can manage test_case_imports" ON public.test_case_imports FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester', 'test_manager')));

CREATE POLICY "Authenticated users can view test_case_import_rows" ON public.test_case_import_rows FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can manage test_case_import_rows" ON public.test_case_import_rows FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester', 'test_manager')));

CREATE POLICY "Authenticated users can view test_case_import_mappings" ON public.test_case_import_mappings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can manage test_case_import_mappings" ON public.test_case_import_mappings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester', 'test_manager')));

-- 7. Add Indexes
CREATE INDEX IF NOT EXISTS idx_import_status ON public.test_case_imports(status);
CREATE INDEX IF NOT EXISTS idx_import_uploaded_by ON public.test_case_imports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_import_hash ON public.test_case_imports(file_hash);

CREATE INDEX IF NOT EXISTS idx_import_rows_import_id ON public.test_case_import_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_validation ON public.test_case_import_rows(validation_status);
CREATE INDEX IF NOT EXISTS idx_import_rows_duplicate ON public.test_case_import_rows(duplicate_status);

CREATE INDEX IF NOT EXISTS idx_import_mappings_import_id ON public.test_case_import_mappings(import_id);

-- 8. Supabase Storage Bucket Configuration
-- Ensure a bucket named 'test-case-imports' exists. 
-- In Supabase, you'll need to create this bucket manually in the dashboard or via API, and set it as private.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('test-case-imports', 'test-case-imports', false) ON CONFLICT DO NOTHING;
-- (Assuming the postgres role has access to storage schema, otherwise do it from the Supabase Studio).
