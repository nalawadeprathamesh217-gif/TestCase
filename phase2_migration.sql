-- Phase 2 SQL Migration

-- 1. Modify requirement_documents table to add necessary fields
ALTER TABLE public.requirement_documents 
ADD COLUMN IF NOT EXISTS original_file_name TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add a CHECK constraint for processing_status if not already present
-- Assuming it was already added in Phase 1 as ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED')
-- Let's update it to support the new flow: UPLOADED, PROCESSING, PARSING, CHUNKING, EXTRACTION, PROCESSED, FAILED
ALTER TABLE public.requirement_documents DROP CONSTRAINT IF EXISTS requirement_documents_processing_status_check;
ALTER TABLE public.requirement_documents ADD CONSTRAINT requirement_documents_processing_status_check 
CHECK (processing_status IN ('UPLOADED', 'PROCESSING', 'PARSING', 'CHUNKING', 'EXTRACTION', 'PROCESSED', 'FAILED'));

-- 2. Create document_text_chunks table
CREATE TABLE IF NOT EXISTS public.document_text_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.requirement_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    paragraph_number INTEGER,
    content TEXT NOT NULL,
    character_start INTEGER,
    character_end INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create document_processing_logs table
CREATE TABLE IF NOT EXISTS public.document_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.requirement_documents(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Modify requirements table for traceability
ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS source_chunk_id UUID REFERENCES public.document_text_chunks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_page_number INTEGER,
ADD COLUMN IF NOT EXISTS source_reference TEXT;


-- 5. Enable RLS and create policies for new tables
ALTER TABLE public.document_text_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select from chunks and logs
CREATE POLICY "Authenticated users can view document_text_chunks" ON public.document_text_chunks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert/update document_text_chunks" ON public.document_text_chunks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

CREATE POLICY "Authenticated users can view document_processing_logs" ON public.document_processing_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert/update document_processing_logs" ON public.document_processing_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_req_docs_status ON public.requirement_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_req_docs_hash ON public.requirement_documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_req_docs_uploaded_by ON public.requirement_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_id ON public.document_text_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_page ON public.document_text_chunks(page_number);

CREATE INDEX IF NOT EXISTS idx_reqs_doc_id ON public.requirements(source_document_id);
CREATE INDEX IF NOT EXISTS idx_reqs_chunk_id ON public.requirements(source_chunk_id);
