-- Phase 5 SQL Migration

-- Drop placeholder tables from initial schema
DROP TABLE IF EXISTS public.test_case_duplicates CASCADE;

-- 1. Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create test_case_embeddings table
CREATE TABLE IF NOT EXISTS public.test_case_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    -- 768 is a standard dimension for models like text-embedding-004 (Gemini).
    -- Alternatively, 1536 for OpenAI. We'll set it flexibly, but pgvector usually requires a fixed dimension. 
    -- We will use 768 as the default for Gemini in this phase.
    embedding vector(768), 
    embedding_model TEXT,
    embedding_provider TEXT,
    content_hash TEXT,
    embedding_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create test_case_duplicates table
CREATE TABLE IF NOT EXISTS public.test_case_duplicates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    new_test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    existing_test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
    similarity_score NUMERIC CHECK (similarity_score >= 0 AND similarity_score <= 1),
    duplicate_type TEXT CHECK (duplicate_type IN ('exact', 'semantic')),
    ai_classification TEXT CHECK (ai_classification IN ('likely_duplicate', 'possibly_duplicate', 'related_but_distinct', 'not_duplicate')),
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    ai_reason TEXT,
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'confirmed_duplicate', 'not_duplicate', 'dismissed')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create vector matching function (RPC)
CREATE OR REPLACE FUNCTION match_test_cases (
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    test_case_id UUID,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tce.id,
        tce.test_case_id,
        1 - (tce.embedding <=> query_embedding) AS similarity
    FROM test_case_embeddings tce
    WHERE 
        (exclude_id IS NULL OR tce.test_case_id != exclude_id)
        AND 1 - (tce.embedding <=> query_embedding) > match_threshold
    ORDER BY tce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Enable RLS and create policies
ALTER TABLE public.test_case_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_duplicates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view embeddings" ON public.test_case_embeddings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can manage embeddings" ON public.test_case_embeddings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

CREATE POLICY "Authenticated users can view duplicates" ON public.test_case_duplicates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can manage duplicates" ON public.test_case_duplicates FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_tc_embed_tc_id ON public.test_case_embeddings(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_embed_hash ON public.test_case_embeddings(content_hash);
CREATE INDEX IF NOT EXISTS idx_tc_embed_vector ON public.test_case_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_tc_dupes_new_id ON public.test_case_duplicates(new_test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_dupes_ext_id ON public.test_case_duplicates(existing_test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_dupes_status ON public.test_case_duplicates(review_status);

-- Trigger to update updated_at on embeddings
CREATE TRIGGER update_test_case_embeddings_modtime 
BEFORE UPDATE ON test_case_embeddings 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
