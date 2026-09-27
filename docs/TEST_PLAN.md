# Test Plan

This document outlines the testing strategy for the AI Test Manager application. 

## 1. Functional Testing

### Authentication & Authorization
- **AUTH-001**: Verify users can register with valid credentials.
- **AUTH-002**: Verify users cannot register with an existing email or weak password.
- **AUTH-003**: Verify login sets session token correctly.
- **AUTH-004**: Verify Testers cannot access Admin routes (`/admin/users`, `/admin/audit-logs`).

### Requirements Management
- **REQ-001**: Verify requirements can be manually created.
- **REQ-002**: Verify uploaded PDF requirements are properly parsed and chunked.
- **REQ-003**: Verify requirements can transition statuses (Draft -> Under Review -> Approved).

### AI Generation & Quality
- **AI-001**: Verify AI generates structured JSON test candidates for approved requirements.
- **AI-002**: Verify candidate acceptance maps the test case to the database correctly.
- **AI-003**: Verify Quality scoring returns scores out of 100 with clear suggestions.

### Duplicates & Imports
- **DUP-001**: Verify semantic similarities > 0.85 flag as potential duplicates.
- **IMP-001**: Verify valid CSV files bulk-create test cases.
- **IMP-002**: Verify invalid row formats abort imports securely.

## 2. Regression Testing
Before every deployment, a full regression suite spanning the `Dashboard -> Requirements -> Test Cases -> Execution -> Analytics -> Reports` pipeline must be completed manually.

## 3. End-to-End Acceptance (Demo Flow)
1. Login as Admin.
2. Upload Requirement Document.
3. Parse and extract requirements.
4. Generate AI Test Cases.
5. Review Candidates -> Accept.
6. Check Duplicates.
7. Execute Test (Mark Passed).
8. View Analytics.
9. Generate CSV Report.
10. Check Audit Logs for tracked actions.
