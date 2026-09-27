-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE 1: profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'tester' CHECK (role IN ('admin', 'tester', 'test_manager')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 2: requirement_documents (Placeholder for Phase 2)
CREATE TABLE requirement_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    file_type TEXT,
    storage_path TEXT,
    file_size BIGINT,
    processing_status TEXT DEFAULT 'UPLOADED' CHECK (processing_status IN ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED')),
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 3: requirements
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    actor TEXT,
    preconditions TEXT,
    business_rules TEXT,
    acceptance_criteria TEXT,
    priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Rejected', 'Archived')),
    source_document_id UUID REFERENCES requirement_documents(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 4: test_cases
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id TEXT UNIQUE NOT NULL,
    requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    preconditions TEXT,
    test_steps TEXT,
    expected_result TEXT,
    test_type TEXT CHECK (test_type IN ('Functional', 'Negative', 'Validation', 'Boundary', 'Integration', 'Regression', 'Security', 'Performance', 'Other')),
    priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    risk TEXT CHECK (risk IN ('High', 'Medium', 'Low')),
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Rejected', 'Archived')),
    execution_result TEXT DEFAULT 'Not Executed' CHECK (execution_result IN ('Not Executed', 'Passed', 'Failed', 'Blocked')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 5: test_case_versions (Placeholder)
CREATE TABLE test_case_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    change_summary TEXT,
    changed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 6: test_case_executions
CREATE TABLE test_case_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES profiles(id),
    execution_result TEXT CHECK (execution_result IN ('Passed', 'Failed', 'Blocked', 'Not Executed')),
    actual_result TEXT,
    comments TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 7: test_case_quality_scores (Placeholder)
CREATE TABLE test_case_quality_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    completeness NUMERIC,
    clarity NUMERIC,
    relevance NUMERIC,
    consistency NUMERIC,
    overall_score NUMERIC,
    suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 8: test_case_ai_explanations (Placeholder)
CREATE TABLE test_case_ai_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    requirement_text TEXT,
    business_rule TEXT,
    condition TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 9: test_case_duplicates (Placeholder)
CREATE TABLE test_case_duplicates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    new_test_case_id UUID REFERENCES test_cases(id),
    existing_test_case_id UUID REFERENCES test_cases(id),
    similarity_score NUMERIC,
    duplicate_type TEXT,
    review_status TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- TABLE 10: test_case_imports (Placeholder)
CREATE TABLE test_case_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT,
    file_type TEXT,
    total_records INTEGER,
    successful_records INTEGER,
    duplicate_records INTEGER,
    failed_records INTEGER,
    status TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_ai_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_imports ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles (needed for displays) but update only their own, unless admin.
CREATE POLICY "Public profiles are viewable by authenticated users." ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Requirements: Authenticated users can view. Admins and testers can insert/update.
CREATE POLICY "Authenticated users can view requirements" ON requirements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert requirements" ON requirements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));
CREATE POLICY "Testers and admins can update requirements" ON requirements FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- Test Cases: Authenticated users can view. Testers and admins can insert/update.
CREATE POLICY "Authenticated users can view test_cases" ON test_cases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert test_cases" ON test_cases FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));
CREATE POLICY "Testers and admins can update test_cases" ON test_cases FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- Test Case Executions: Authenticated users can view. Testers and admins can insert/update.
CREATE POLICY "Authenticated users can view test_case_executions" ON test_case_executions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Testers and admins can insert test_case_executions" ON test_case_executions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));
CREATE POLICY "Testers and admins can update test_case_executions" ON test_case_executions FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')));

-- Placeholder tables: Allow read for now
CREATE POLICY "Authenticated users can view placeholders" ON requirement_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view placeholders" ON test_case_versions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view placeholders" ON test_case_quality_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view placeholders" ON test_case_ai_explanations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view placeholders" ON test_case_duplicates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view placeholders" ON test_case_imports FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'tester');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_requirements_modtime BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_test_cases_modtime BEFORE UPDATE ON test_cases FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
