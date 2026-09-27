# Database Schema

The system uses PostgreSQL hosted via Supabase, employing `pgvector` for advanced AI similarity searches.

## Core Tables

### 1. `profiles`
Manages User access, mapped directly to Supabase Auth.
- `role`: (`admin`, `test_manager`, `tester`)
- `status`: (`Active`, `Inactive`)

### 2. `requirements`
Tracks business and functional requirements.
- Linked to `profiles` (created_by) and `requirement_documents`.
- Includes fields for `priority`, `status`, `actor`, and `business_rules`.

### 3. `test_cases`
The central entity for all QA testing.
- Tracks `test_type`, `priority`, `risk`, `status`, and `execution_result`.
- Linked to `requirements` (many-to-one).

### 4. `test_case_versions`
An immutable snapshot of a test case at a point in time, enabling rollbacks.

### 5. `test_case_executions`
Logs historical execution passes (`Passed`, `Failed`, `Blocked`) including actual results and comments.

### 6. `test_case_quality_evaluations`
Stores AI-generated scores (1-100) across `completeness`, `clarity`, `relevance`, and `consistency`.

### 7. `test_case_duplicates`
Tracks identified duplicates mapping a `new_test_case_id` to an `existing_test_case_id` along with a semantic `similarity_score`.

### 8. `notifications` & `audit_logs`
- `notifications`: Unread/Read alerts for specific users.
- `audit_logs`: Immutable, system-wide trail of important events (CRUD actions, role changes), visible only to admins.
