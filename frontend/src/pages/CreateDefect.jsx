import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import api from '../services/api';

export default function CreateDefect() {
  const [searchParams] = useSearchParams();
  const test_case_id = searchParams.get('test_case_id');
  const execution_id = searchParams.get('execution_id');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [testCase, setTestCase] = useState(null);
  const [execution, setExecution] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'High',
    priority: 'High',
    steps_to_reproduce: '',
    expected_result: '',
    actual_result: '',
    environment: '',
    browser: '',
  });

  useEffect(() => {
    const fetchContext = async () => {
      if (test_case_id) {
        try {
          const tcRes = await api.get(`/test-cases/${test_case_id}`);
          setTestCase(tcRes.data.data);
          setForm(f => ({
            ...f,
            title: `Failed: ${tcRes.data.data.title}`,
            expected_result: tcRes.data.data.expected_result || '',
            steps_to_reproduce: tcRes.data.data.test_steps || ''
          }));
        } catch (e) {}
      }
      
      // In a real app we'd fetch execution details here if needed, or get them from history
      // For now, let's keep it simple.
    };
    fetchContext();
  }, [test_case_id, execution_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        test_case_id: test_case_id || null,
        execution_id: execution_id || null,
        requirement_id: testCase?.requirement_id || null,
      };
      const res = await api.post('/defects', payload);
      alert(`${res.data.data.defect_key} created successfully.`);
      navigate(`/defects/${res.data.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create defect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Create Defect</h1>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {testCase && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm">
              <span className="font-semibold text-slate-700">Linking to: </span>
              <span className="text-blue-600">{testCase.test_case_key} {testCase.title}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Steps to Reproduce</label>
              <textarea value={form.steps_to_reproduce} onChange={e => setForm({...form, steps_to_reproduce: e.target.value})} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Result</label>
                <textarea value={form.expected_result} onChange={e => setForm({...form, expected_result: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Actual Result</label>
                <textarea value={form.actual_result} onChange={e => setForm({...form, actual_result: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Environment</label>
                <input value={form.environment} onChange={e => setForm({...form, environment: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Staging" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Browser</label>
                <input value={form.browser} onChange={e => setForm({...form, browser: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Chrome" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg text-sm font-medium">
                {loading ? 'Creating...' : 'Create Defect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
