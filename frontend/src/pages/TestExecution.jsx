import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { TestTube, Search, ChevronRight, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

const statusColors = {
  'Passed': 'bg-green-100 text-green-700 border-green-200',
  'Failed': 'bg-red-100 text-red-700 border-red-200',
  'Blocked': 'bg-orange-100 text-orange-700 border-orange-200',
  'Not Executed': 'bg-slate-100 text-slate-500 border-slate-200',
};

const statusIcons = {
  'Passed': CheckCircle,
  'Failed': XCircle,
  'Blocked': AlertTriangle,
  'Not Executed': Clock,
};

export default function TestExecution() {
  const navigate = useNavigate();
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requirementFilter, setRequirementFilter] = useState('');
  const [requirements, setRequirements] = useState([]);

  // Execution modal state
  const [selected, setSelected] = useState(null);
  const [execForm, setExecForm] = useState({ execution_result: 'Passed', actual_result: '', comments: '', environment: '', browser: '' });
  const [executing, setExecuting] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [loadingExec, setLoadingExec] = useState(false);

  useEffect(() => {
    fetchTestCases();
    fetchRequirements();
  }, []);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const res = await api.get('/test-cases');
      setTestCases(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirements = async () => {
    try {
      const res = await api.get('/requirements');
      setRequirements(res.data.data || []);
    } catch (err) {}
  };

  const fetchExecutions = async (testCaseId) => {
    try {
      setLoadingExec(true);
      const res = await api.get(`/test-cases/${testCaseId}/executions`);
      setExecutions(res.data.data || []);
    } catch (err) {
      setExecutions([]);
    } finally {
      setLoadingExec(false);
    }
  };

  const handleSelect = (tc) => {
    setSelected(tc);
    setExecForm({ execution_result: 'Passed', actual_result: '', comments: '', environment: '', browser: '' });
    fetchExecutions(tc.id);
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setExecuting(true);
    try {
      await api.post(`/test-cases/${selected.id}/executions`, execForm);
      setExecForm({ execution_result: 'Passed', actual_result: '', comments: '', environment: '', browser: '' });
      fetchExecutions(selected.id);
      fetchTestCases();
    } catch (err) {
      alert(err.response?.data?.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const filtered = testCases.filter(tc => {
    const matchSearch = !search || tc.title?.toLowerCase().includes(search.toLowerCase()) || tc.test_case_id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || tc.execution_result === statusFilter;
    const matchReq = !requirementFilter || tc.requirement_id === requirementFilter;
    return matchSearch && matchStatus && matchReq;
  });

  if (loading) return <AppLayout><div className="flex items-center justify-center h-[60vh] text-slate-500">Loading test cases...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TestTube className="w-6 h-6 text-blue-600" />
            Test Execution
          </h1>
          <p className="text-slate-500 text-sm mt-1">Execute and track test case results</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search test cases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Not Executed">Not Executed</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Blocked">Blocked</option>
            </select>
            <select
              value={requirementFilter}
              onChange={(e) => setRequirementFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Requirements</option>
              {requirements.map(r => (
                <option key={r.id} value={r.id}>{r.requirement_id} — {r.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Case List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Cases ({filtered.length})</p>
              </div>
              <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">No test cases found</div>
                ) : (
                  filtered.map(tc => {
                    const execResult = tc.execution_result || 'Not Executed';
                    const StatusIcon = statusIcons[execResult] || Clock;
                    return (
                      <button
                        key={tc.id}
                        onClick={() => handleSelect(tc)}
                        className={`w-full text-left p-3 hover:bg-blue-50/50 transition-colors flex items-center gap-3 ${selected?.id === tc.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
                      >
                        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${execResult === 'Passed' ? 'text-green-500' : execResult === 'Failed' ? 'text-red-500' : execResult === 'Blocked' ? 'text-orange-500' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{tc.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{tc.test_case_id}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[execResult] || statusColors['Not Executed']}`}>
                          {execResult}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Execution Panel */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-[65vh] text-slate-400">
                <TestTube className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm">Select a test case to execute</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Test Case Details */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">{selected.test_case_id}</p>
                      <h2 className="text-lg font-bold text-slate-800 mt-1">{selected.title}</h2>
                    </div>
                    <button
                      onClick={() => navigate(`/test-cases/${selected.id}`)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Full Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {selected.description && (
                    <p className="text-sm text-slate-600 mb-3">{selected.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Preconditions</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{selected.preconditions || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Expected Result</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{selected.expected_result || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Test Steps</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.test_steps || 'No steps defined'}</p>
                  </div>
                </div>

                {/* Execute Form */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Record Execution</h3>
                  <form onSubmit={handleExecute} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Result</label>
                        <select
                          value={execForm.execution_result}
                          onChange={(e) => setExecForm({...execForm, execution_result: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Passed">Passed</option>
                          <option value="Failed">Failed</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Environment</label>
                        <select
                          value={execForm.environment}
                          onChange={(e) => setExecForm({...execForm, environment: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="Development">Development</option>
                          <option value="Staging">Staging</option>
                          <option value="Production">Production</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Browser</label>
                        <select
                          value={execForm.browser}
                          onChange={(e) => setExecForm({...execForm, browser: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="Chrome">Chrome</option>
                          <option value="Firefox">Firefox</option>
                          <option value="Safari">Safari</option>
                          <option value="Edge">Edge</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Actual Result</label>
                      <textarea
                        value={execForm.actual_result}
                        onChange={(e) => setExecForm({...execForm, actual_result: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Describe the actual result observed..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
                      <textarea
                        value={execForm.comments}
                        onChange={(e) => setExecForm({...execForm, comments: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Additional notes..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={executing}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {executing ? 'Saving...' : 'Save Execution'}
                    </button>
                  </form>
                </div>

                {/* Execution History */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Execution History</h3>
                  {loadingExec ? (
                    <p className="text-sm text-slate-400">Loading...</p>
                  ) : executions.length === 0 ? (
                    <p className="text-sm text-slate-400">No executions recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {executions.map((ex, i) => {
                        const StatusIcon = statusIcons[ex.execution_result] || Clock;
                        return (
                          <div key={ex.id || i} className="border border-slate-100 rounded-lg p-3 flex items-start gap-3">
                            <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ex.execution_result === 'Passed' ? 'text-green-500' : ex.execution_result === 'Failed' ? 'text-red-500' : 'text-orange-500'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[ex.execution_result] || statusColors['Not Executed']}`}>
                                  {ex.execution_result}
                                </span>
                                <span className="text-[10px] text-slate-400">{new Date(ex.created_at).toLocaleString()}</span>
                              </div>
                              {ex.actual_result && <p className="text-xs text-slate-600 mt-1">{ex.actual_result}</p>}
                              {ex.comments && <p className="text-xs text-slate-400 mt-0.5 italic">{ex.comments}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
