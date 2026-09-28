-- Phase 12 SQL Migration: AI Provider Fallback Architecture

-- 1. Extend test_case_generation_runs table
ALTER TABLE public.test_case_generation_runs
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2. Extend test_case_quality_evaluations table
-- (Adding ai_provider and ai_model if not already present, though qualityController seems to use them)
ALTER TABLE public.test_case_quality_evaluations
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false;

-- 3. Extend test_case_ai_explanations table (Coverage Analysis)
ALTER TABLE public.test_case_ai_explanations
ADD COLUMN IF NOT EXISTS ai_provider TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;
