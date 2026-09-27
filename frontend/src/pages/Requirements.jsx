import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Plus, Search, Eye, Edit, Trash2, AlertCircle, Filter } from 'lucide-react';

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Archived'];

const StatusBadge = ({ status }) => {
  const colors = {
    'Draft': 'bg-slate-100 text-slate-600',
    'Under Review': 'bg-amber-100 text-amber-700',
    'Approved': 'bg-green-100 text-green-700',
    'Rejected': 'bg-red-100 text-red-700',
    'Archived': 'bg-slate-100 text-slate-400',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
};

const PriorityBadge = ({ priority }) => {
  const colors = {
    'Critical': 'bg-red-100 text-red-700',
    'High': 'bg-orange-100 text-orange-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'Low': 'bg-blue-100 text-blue-700',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || 'bg-slate-100 text-slate-600'}`}>{priority}</span>;
};

function RequirementModal({ open, onClose, onSaved, editData }) {
  const [form, setForm] = useState({ requirement_id: '', title: '', description: '', actor: '', preconditions: '', business_rules: '', acceptance_criteria: '', priority: 'High', status: 'Draft' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editData) setForm(editData);
    else setForm({ requirement_id: '', title: '', description: '', actor: '', preconditions: '', business_rules: '', acceptance_criteria: '', priority: 'High', status: 'Draft' });
  }, [editData, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requirement_id || !form.title) return setError('Requirement ID and Title are required.');
    setLoading(true);
    setError('');
    try {
      if (editData?.id) {
        await api.put(`/requirements/${editData.id}`, form);
      } else {
        await api.post('/requirements', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{editData ? 'Edit Requirement' : 'Add Requirement'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requirement ID *</label>
              <input value={form.requirement_id} onChange={e => setForm({ ...form, requirement_id: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="REQ-001" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Actor</label>
              <input value={form.actor} onChange={e => setForm({ ...form, actor: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preconditions</label>
              <input value={form.preconditions} onChange={e => setForm({ ...form, preconditions: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Rules</label>
            <textarea value={form.business_rules} onChange={e => setForm({ ...form, business_rules: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Acceptance Criteria</label>
            <textarea value={form.acceptance_criteria} onChange={e => setForm({ ...form, acceptance_criteria: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
              {loading ? 'Saving...' : editData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Requirements() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requirements');
      setRequirements(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequirements(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this requirement?')) return;
    try {
      await api.delete(`/requirements/${id}`);
      fetchRequirements();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = requirements.filter(r => {
    const matchSearch = !search || r.requirement_id?.toLowerCase().includes(search.toLowerCase()) || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchPriority = !filterPriority || r.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Requirements</h1>
            <p className="text-slate-500 text-sm mt-1">Manage software requirements</p>
          </div>
          <button onClick={() => { setEditData(null); setModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Requirement
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requirements..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading requirements...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-2">No requirements found.</p>
              <button onClick={() => { setEditData(null); setModalOpen(true); }} className="text-blue-600 text-sm font-medium hover:underline">+ Add your first requirement</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['ID', 'Title', 'Priority', 'Status', 'Updated', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-600 font-medium">{req.requirement_id}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">{req.title}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={req.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                      <td className="px-4 py-3 text-slate-400">{new Date(req.updated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/requirements/${req.id}`} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Eye className="w-4 h-4" /></Link>
                          <button onClick={() => { setEditData(req); setModalOpen(true); }} className="p-1 text-slate-400 hover:text-green-600 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(req.id)} className="p-1 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <RequirementModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchRequirements} editData={editData} />
    </AppLayout>
  );
}
