import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Bug, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DefectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [defect, setDefect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  
  // Edit state
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [priority, setPriority] = useState('');
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');

  const fetchDefect = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/defects/${id}`);
      setDefect(res.data.data);
      setStatus(res.data.data.status);
      setSeverity(res.data.data.severity);
      setPriority(res.data.data.priority);
      setAssignedTo(res.data.data.assigned_to || '');
      
      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.data || []);
    } catch (err) {
      setError('Failed to load defect.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDefect(); }, [id]);

  const handleUpdate = async () => {
    try {
      await api.put(`/defects/${id}`, {
        status,
        severity,
        priority,
        assigned_to: assignedTo || null
      });
      setEditing(false);
      fetchDefect();
    } catch (err) {
      alert('Failed to update defect');
    }
  };

  const handleRetest = async () => {
    navigate(`/test-cases/${defect.test_case_id}`);
  };

  if (loading) return <AppLayout><div className="p-8 text-center text-slate-500">Loading defect...</div></AppLayout>;
  if (error || !defect) return <AppLayout><div className="p-8 text-center text-red-500">{error}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/defects')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Defects
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-sm font-bold flex items-center gap-1.5">
                  <Bug className="w-4 h-4" />
                  {defect.defect_key}
                </span>
                <span className="text-sm text-slate-500">
                  Reported by {defect.reported_profile?.full_name} on {new Date(defect.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {defect.status === 'Resolved' && (
                  <button onClick={handleRetest} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4" /> Retest
                  </button>
                )}
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
                    Edit Properties
                  </button>
                ) : (
                  <>
                    <button onClick={() => setEditing(false)} className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                      Cancel
                    </button>
                    <button onClick={handleUpdate} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">{defect.title}</h1>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 border-b border-slate-200 bg-slate-50">
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
              {editing ? (
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border-slate-300 rounded text-sm p-1">
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Reopened">Reopened</option>
                  <option value="Closed">Closed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              ) : (
                <span className="font-medium text-slate-800">{defect.status}</span>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Severity</p>
              {editing ? (
                <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full border-slate-300 rounded text-sm p-1">
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <span className="font-medium text-slate-800">{defect.severity}</span>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Priority</p>
              {editing ? (
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full border-slate-300 rounded text-sm p-1">
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <span className="font-medium text-slate-800">{defect.priority}</span>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned To</p>
              {editing ? (
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full border-slate-300 rounded text-sm p-1">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              ) : (
                <span className="font-medium text-slate-800">{defect.assigned_profile?.full_name || 'Unassigned'}</span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Description</h3>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                {defect.description || 'No description provided.'}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">Steps to Reproduce</h3>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                {defect.steps_to_reproduce || 'N/A'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Expected Result</h3>
                <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800 whitespace-pre-wrap border border-green-100">
                  {defect.expected_result || 'N/A'}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2">Actual Result</h3>
                <div className="bg-red-50 rounded-lg p-4 text-sm text-red-800 whitespace-pre-wrap border border-red-100">
                  {defect.actual_result || 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Environment</p>
                <p className="text-sm text-slate-800 font-medium">{defect.environment || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Browser</p>
                <p className="text-sm text-slate-800 font-medium">{defect.browser || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Linked Test Case</p>
                <p className="text-sm font-medium">
                  {defect.test_case ? (
                    <button onClick={() => navigate(`/test-cases/${defect.test_case_id}`)} className="text-blue-600 hover:underline">
                      {defect.test_case.test_case_key}: {defect.test_case.title}
                    </button>
                  ) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Linked Requirement</p>
                <p className="text-sm font-medium">
                  {defect.requirement ? (
                    <button onClick={() => navigate(`/requirements/${defect.requirement_id}`)} className="text-blue-600 hover:underline">
                      {defect.requirement.requirement_key}: {defect.requirement.title}
                    </button>
                  ) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
