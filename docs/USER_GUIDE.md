# User Guide

Welcome to AI Test Manager. This guide covers how to use the core features of the platform.

## Getting Started
1. Log in with your email and password. 
2. Upon logging in, you will be taken to the **Dashboard**, which provides a high-level overview of your project's testing coverage and pass rates.

## Working with Requirements
- Navigate to **Requirements** via the sidebar.
- Click **New Requirement** to manually input a requirement.
- Alternatively, go to **Req Documents** to upload a PDF, DOCX, or TXT file. The system will parse your document and extract individual requirements for you to track.

## Generating AI Test Cases
1. Open any Requirement that is in the "Approved" state.
2. Click **Generate Test Cases (AI)**.
3. The AI will analyze the requirement's acceptance criteria and business rules and suggest test case candidates.
4. Review each candidate, then click **Accept** to save it to your database, or **Reject** to discard it.

## Managing Test Cases
- Navigate to **Test Cases** to view, search, and filter your entire test suite.
- Click on any Test Case to view its details, including **Test Steps** and **Expected Results**.
- **Quality Scoring**: Inside a Test Case, click **Evaluate Quality** to get an AI-generated score on how complete and clear your test steps are.
- **Version History**: The timeline tab inside a Test Case tracks all historical changes. You can always view or rollback to a previous version if a mistake was made.

## Test Execution
- Navigate to **Test Execution** (or directly from a Test Case).
- Click **Execute** to log a test run.
- Select `Passed`, `Failed`, or `Blocked`, and optionally leave a comment or actual result.
- Your execution results will instantly reflect on the **Dashboard** and **Analytics** pages.

## Analytics & Reports
- **Analytics**: Deep dive into test execution trends, duplicate metrics, and requirement coverage.
- **Reports**: Generate static CSV summaries of your entire project directly from the Reports tab.
