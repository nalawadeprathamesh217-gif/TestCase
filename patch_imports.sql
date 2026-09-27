-- Patch to fix test_case_imports schema

ALTER TABLE public.test_case_imports
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS worksheet_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS valid_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invalid_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS imported_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- We also need to fix the status constraint
ALTER TABLE public.test_case_imports DROP CONSTRAINT IF EXISTS test_case_imports_status_check;
ALTER TABLE public.test_case_imports ADD CONSTRAINT test_case_imports_status_check 
CHECK (status IN ('uploaded', 'processing', 'mapping', 'validating', 'ready', 'importing', 'completed', 'failed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_import_hash ON public.test_case_imports(file_hash);
