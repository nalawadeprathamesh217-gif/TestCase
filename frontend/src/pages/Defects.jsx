import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import api from '../services/api';
import { Bug, Search, Filter } from 'lucide-react';

export default function Defects() {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchDefects = async () => {
    setLoading(true);
    try {
      let url = `/defects?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await api.get(url);
      setDefects(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch defects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [search, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-slate-100 text-slate-800';
      case 'Reopened': return 'bg-orange-100 text-orange-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 font-bold';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'Low': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Defects</h1>
          <p className="text-slate-500 text-sm mt-1">Track system bugs and link them to failing test cases.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search defects by key or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Reopened">Reopened</option>
                <option value="Closed">Closed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Defect Key</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Title</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Severity</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Assigned To</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Test Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500">Loading defects...</td></tr>
              ) : defects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                    {!search && !statusFilter ? (
                      <div>
                        <p className="font-semibold text-slate-700 mb-1">No defects have been reported yet.</p>
                        <p className="text-sm">Defects linked to failed test executions will appear here.</p>
                      </div>
                    ) : (
                      <p>No defects match your current filters.</p>
                    )}
                  </td>
                </tr>
              ) : (
                defects.map(defect => (
                  <tr key={defect.id} onClick={() => navigate(`/defects/${defect.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3 font-medium text-blue-600">{defect.defect_key}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium truncate max-w-[200px]">{defect.title}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(defect.status)}`}>
                        {defect.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(defect.severity)}`}>
                        {defect.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{defect.assigned_profile?.full_name || 'Unassigned'}</td>
                    <td className="px-5 py-3 text-slate-500">{defect.test_case?.test_case_key || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
