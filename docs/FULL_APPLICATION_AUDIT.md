# AI Test Manager - Full Application Audit

## 1. Scope and Architecture
The AI Test Manager is a full-stack application leveraging modern cloud, AI, and frontend technologies to facilitate software requirement parsing, test case generation, execution, and duplicate detection.

**Frontend:** React, Vite, Tailwind CSS, React Router  
**Backend:** Node.js, Express.js, REST APIs  
**Database/Auth/Storage:** Supabase (PostgreSQL), Supabase Auth, Row Level Security (RLS)  
**AI:** Gemini (Primary), OpenAI (Fallback)

**Roles Implemented:** Admin, Test Manager, Tester

## 2. Test Inventory

### 2.1 Frontend Pages & Routes
- `/login` - Login
- `/register` - Registration
- `/forgot-password` - Password Recovery
- `/dashboard` - Overview & KPIs
- `/requirements` - Requirement List & Filtering
- `/requirements/new` - Manual Creation
- `/requirements/:id` - Detailed View & Linking
- `/requirements/:id/edit` - Edit Form
- `/requirements/:id/generate` - AI Generation Interface
- `/requirement-documents` - Document Upload & Processing
- `/requirement-documents/:documentId` - Document Details & Extraction Results
- `/test-cases` - Test Case List
- `/test-cases/new` - Manual Creation
- `/test-cases/:id` - Details, Versions, Quality Checks
- `/execution` - Bulk Test Execution View
- `/imports` - CSV/XLSX Bulk Import
- `/analytics` - Data Visualization (Charts/KPIs)
- `/reports` - CSV/Summary Exports
- `/settings` - Profile & AI Config View

### 2.2 Backend Routes & APIs
- **Auth/User:** Handled primarily by Supabase Auth; Admin `/admin/users`
- **Requirements:** CRUD operations, Status transitions
- **AI Generation:** `/requirements/:id/generate-test-cases`
- **Documents:** `/documents/upload`, processing webhooks
- **Test Cases:** CRUD, `/test-cases/:id/quality`, `/test-cases/:id/coverage`
- **Duplicates:** `/test-cases/duplicates` (Exact & Semantic)
- **Execution:** `/test-cases/:id/executions`
- **Imports:** `/imports/upload`
- **Analytics:** `/analytics/*`
- **Admin:** `/admin/ai-config`, `/admin/audit-logs`

### 2.3 Database & Storage
- **Tables:** `users`, `requirements`, `test_cases`, `test_case_executions`, `requirement_documents`, `test_case_versions`, `test_case_duplicates`, `test_case_generation_runs`, `test_case_quality_evaluations`
- **Storage Buckets:** `requirement-documents`
- **Extensions:** `pgvector`

### 2.4 Application Features
- **AI Integration:** Test Case generation, quality score explanations, coverage mapping, duplicate classification.
- **Algorithms:** SHA-256 for exact duplicate detection, Cosine Similarity for semantic matching.
- **Traceability:** Bidirectional linking (Requirement <-> Test Case).
- **Execution:** Logging actual results against expected results.
- **Versioning:** Immutable test case snapshots.

## 3. Pre-Audit Findings & Security Validations
- Environment Variables correctly segregate frontend API URLs from backend API Keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- No secrets exposed to the React frontend.
- `Math.random` is used strictly for safe UI/temporary IDs (`temporary_id: TC-AI-1234`), **not** for AI scoring or execution results.
- No dummy or mock data functions were found in core domain logic. Analytics fetches live data via `supabase`.
