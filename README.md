# AI Test Manager

AI Test Manager is an AI-assisted software testing platform that converts software requirements into structured test cases, evaluates test-case quality, explains requirement coverage, detects potential duplicates, imports existing test cases, maintains version history, manages test execution, and provides QA analytics and reporting.

## 🌟 Features
- **Requirements Management**: Upload PDF, DOCX, or TXT documents to automatically extract structured requirements.
- **AI Test Generation**: Uses Gemini/OpenAI to generate highly accurate test cases mapped directly to your business requirements.
- **Quality Scoring & Explainable AI**: AI evaluates test cases on completeness, clarity, relevance, and consistency.
- **Duplicate Detection**: Uses vector embeddings (`pgvector`) to find semantically similar test cases before they clutter your database.
- **Test Execution**: Log test runs, track actual results, and seamlessly view historical executions.
- **Excel/CSV Imports**: Import existing test suites with AI-assisted mapping and duplicate prevention.
- **Version History**: Track every edit to a test case and safely restore prior versions.
- **Analytics & Reporting**: Server-side dashboard providing real-time requirement coverage, pass rates, and interactive metric charts.
- **Role-Based Access Control**: Securely partition data and features across Admin, Test Manager, and Tester roles.

## 🛠 Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts, React Router
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Supabase), `pgvector`
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Provider**: Google Gemini API

## 🚀 Running Locally
1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Install backend dependencies: `cd backend && npm install`
4. Set up Supabase and run all SQL migrations sequentially (`supabase_schema.sql`, `phase2_migration.sql`, etc.)
5. Configure `.env` in the backend and `.env.local` in the frontend (use `.env.example` as a template).
6. Start backend: `npm start` in the `backend` directory.
7. Start frontend: `npm run dev` in the `frontend` directory.

## 📚 Documentation
Please refer to the `/docs` folder for detailed guides:
- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)

## 🔐 Security
- Backend endpoints are protected by robust JWT authorization and custom RBAC middleware.
- Row-Level Security (RLS) is strictly enabled across all PostgreSQL tables.
- Database access and AI interactions occur exclusively server-side.
