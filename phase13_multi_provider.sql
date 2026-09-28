ALTER TABLE public.test_case_generation_runs
ADD COLUMN IF NOT EXISTS primary_provider TEXT,
ADD COLUMN IF NOT EXISTS attempted_providers JSONB,
ADD COLUMN IF NOT EXISTS final_provider TEXT,
ADD COLUMN IF NOT EXISTS final_model TEXT,
ADD COLUMN IF NOT EXISTS fallback_level INTEGER,
ADD COLUMN IF NOT EXISTS provider_status JSONB,
ADD COLUMN IF NOT EXISTS generated_count INTEGER;

ALTER TABLE public.test_case_quality_evaluations
ADD COLUMN IF NOT EXISTS primary_provider TEXT,
ADD COLUMN IF NOT EXISTS attempted_providers JSONB,
ADD COLUMN IF NOT EXISTS final_provider TEXT,
ADD COLUMN IF NOT EXISTS final_model TEXT,
ADD COLUMN IF NOT EXISTS fallback_level INTEGER,
ADD COLUMN IF NOT EXISTS provider_status JSONB;

ALTER TABLE public.test_case_ai_explanations
ADD COLUMN IF NOT EXISTS primary_provider TEXT,
ADD COLUMN IF NOT EXISTS attempted_providers JSONB,
ADD COLUMN IF NOT EXISTS final_provider TEXT,
ADD COLUMN IF NOT EXISTS final_model TEXT,
ADD COLUMN IF NOT EXISTS fallback_level INTEGER,
ADD COLUMN IF NOT EXISTS provider_status JSONB;
