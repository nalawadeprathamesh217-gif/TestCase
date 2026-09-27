import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import RequirementCreate from './pages/RequirementCreate';
import RequirementDetail from './pages/RequirementDetail';
import RequirementEdit from './pages/RequirementEdit';
import TestCases from './pages/TestCases';
import TestCaseCreate from './pages/TestCaseCreate';
import TestExecution from './pages/TestExecution';
import TestCaseDetail from './pages/TestCaseDetail';
import RequirementDocuments from './pages/RequirementDocuments';
import RequirementDocumentDetail from './pages/RequirementDocumentDetail';
import AiGeneration from './pages/AiGeneration';
import Imports from './pages/Imports';
import ImportDetail from './pages/ImportDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Duplicates from './pages/Duplicates';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import SystemHealth from './pages/SystemHealth';
import Defects from './pages/Defects';
import CreateDefect from './pages/CreateDefect';
import DefectDetail from './pages/DefectDetail';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/requirements" element={<ProtectedRoute><Requirements /></ProtectedRoute>} />
        <Route path="/requirements/new" element={<ProtectedRoute><RequirementCreate /></ProtectedRoute>} />
        <Route path="/requirements/:id" element={<ProtectedRoute><RequirementDetail /></ProtectedRoute>} />
        <Route path="/requirements/:id/edit" element={<ProtectedRoute><RequirementEdit /></ProtectedRoute>} />
        <Route path="/requirements/:id/generate" element={<ProtectedRoute><AiGeneration /></ProtectedRoute>} />
        <Route path="/test-cases" element={<ProtectedRoute><TestCases /></ProtectedRoute>} />
        <Route path="/test-cases/new" element={<ProtectedRoute><TestCaseCreate /></ProtectedRoute>} />
        <Route path="/test-cases/:id" element={<ProtectedRoute><TestCaseDetail /></ProtectedRoute>} />
        <Route path="/requirement-documents" element={<ProtectedRoute><RequirementDocuments /></ProtectedRoute>} />
        <Route path="/requirement-documents/:id" element={<ProtectedRoute><RequirementDocumentDetail /></ProtectedRoute>} />
        <Route path="/execution" element={<ProtectedRoute><TestExecution /></ProtectedRoute>} />
        <Route path="/duplicates" element={<ProtectedRoute><Duplicates /></ProtectedRoute>} />
        <Route path="/imports" element={<ProtectedRoute><Imports /></ProtectedRoute>} />
        <Route path="/imports/:id" element={<ProtectedRoute><ImportDetail /></ProtectedRoute>} />
        <Route path="/defects" element={<ProtectedRoute><Defects /></ProtectedRoute>} />
        <Route path="/defects/create" element={<ProtectedRoute><CreateDefect /></ProtectedRoute>} />
        <Route path="/defects/:id" element={<ProtectedRoute><DefectDetail /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute><AdminAuditLogs /></ProtectedRoute>} />
        <Route path="/admin/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
