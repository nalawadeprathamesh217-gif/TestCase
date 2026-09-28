ALTER TABLE public.test_case_quality_evaluations
ADD COLUMN IF NOT EXISTS completeness_reason TEXT,
ADD COLUMN IF NOT EXISTS clarity_reason TEXT,
ADD COLUMN IF NOT EXISTS relevance_reason TEXT,
ADD COLUMN IF NOT EXISTS consistency_reason TEXT,
ADD COLUMN IF NOT EXISTS covered_requirement_behavior JSONB,
ADD COLUMN IF NOT EXISTS unsupported_assumptions JSONB;
