# Admin Guide

This guide covers administrative capabilities in AI Test Manager. These features are strictly locked behind the `admin` role.

## User Management
- Navigate to **Admin > Users**.
- Here you can view a list of all registered users in the system.
- **Change Roles**: Elevate a user to `Test Manager` or `Admin`, or demote them to `Tester`. Be cautious giving out Admin access.
- **Manage Status**: Deactivate users who have left the project to instantly revoke their access without deleting their historical execution or test case data.

## Audit Logs
- Navigate to **Admin > Audit Logs**.
- The system automatically captures a read-only, immutable ledger of all critical actions.
- Use this ledger to trace back who changed a test case, executed a test, imported a document, or changed a user's role.

## System Health
- Navigate to **Admin > System Health**.
- Displays real-time operational status for:
  - **Backend API**: General node/express health.
  - **PostgreSQL Database**: Ability to successfully read/write to Supabase.
  - **File Storage**: Availability of the Supabase object storage buckets.
  - **AI Provider**: Verification that the Gemini/OpenAI integration keys are correctly configured on the server.
