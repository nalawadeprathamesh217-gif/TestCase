import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Plus, Search, Eye, Edit, Trash2, Filter, Save, X, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';

const TEST_TYPES = ['Functional', 'Negative', 'Validation', 'Boundary', 'Integration', 'Regression', 'Security', 'Performance', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const RISKS = ['High', 'Medium', 'Low'];
const STATUSES = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Archived'];

export default function TestCases() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [savedFilters, setSavedFilters] = useState([]);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
  const [filterName, setFilterName] = useState('');

  // Read filters from URL
  const q = searchParams.get('q') || '';
  const filterType = searchParams.get('test_type') || '';
  const filterPriority = searchParams.get('priority') || '';
  const filterRisk = searchParams.get('risk') || '';
  const filterStatus = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  const fetchTestCases = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (q) params.q = q;
      if (filterType) params.test_type = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (filterRisk) params.risk = filterRisk;
      if (filterStatus) params.status = filterStatus;

      const res = await api.get('/search/advanced', { params });
      setTestCases(res.data.data.items || []);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedFilters = async () => {
    try {
      const res = await api.get('/saved-filters');
      setSavedFilters(res.data.data.filter(f => f.entity_type === 'test_cases'));
    } catch (err) {}
  };

  useEffect(() => {
    fetchTestCases();
  }, [q, filterType, filterPriority, filterRisk, filterStatus, page]);

  useEffect(() => {
    fetchSavedFilters();
  }, []);

  const updateFilters = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    
    if (key !== 'page') newParams.set('page', '1'); // reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const saveFilter = async () => {
    if (!filterName.trim()) return;
    const config = {};
    if (q) config.q = q;
    if (filterType) config.test_type = filterType;
    if (filterPriority) config.priority = filterPriority;
    if (filterRisk) config.risk = filterRisk;
    if (filterStatus) config.status = filterStatus;

    try {
      await api.post('/saved-filters', { name: filterName, entity_type: 'test_cases', filter_config: config });
      setShowSaveFilterModal(false);
      setFilterName('');
      fetchSavedFilters();
    } catch (err) {
      alert('Failed to save filter');
    }
  };

  const applySavedFilter = (config) => {
    const newParams = new URLSearchParams();
    Object.keys(config).forEach(k => newParams.set(k, config[k]));
    setSearchParams(newParams);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Test Cases</h1>
            <p className="text-slate-500 text-sm mt-1">Advanced Search & Filtering</p>
          </div>
          <button onClick={() => navigate('/test-cases/new')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Test Case
          </button>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex-shrink-0 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                value={q} 
                onChange={e => updateFilters('q', e.target.value)} 
                placeholder="Search by keyword..." 
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              />
            </div>
            
            <select value={filterType} onChange={e => updateFilters('test_type', e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Types</option>
              {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            <select value={filterPriority} onChange={e => updateFilters('priority', e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <select value={filterRisk} onChange={e => updateFilters('risk', e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Risks</option>
              {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            
            <select value={filterStatus} onChange={e => updateFilters('status', e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button onClick={clearFilters} className="text-sm font-medium text-slate-500 hover:text-slate-700 px-2 flex items-center gap-1">
              <X className="w-4 h-4" /> Clear
            </button>
          </div>

          {/* Saved Filters Row */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> Saved Filters:
            </span>
            {savedFilters.map(sf => (
              <button 
                key={sf.id}
                onClick={() => applySavedFilter(sf.filter_config)}
                className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full transition-colors"
              >
                {sf.name}
              </button>
            ))}
            {(q || filterType || filterPriority || filterRisk || filterStatus) && (
              <button 
                onClick={() => setShowSaveFilterModal(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors border border-blue-200"
              >
                + Save Current View
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400">Loading test cases...</div>
            ) : testCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Search className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium mb-1">No test cases found</p>
                <p className="text-slate-400 text-sm mb-4">Try removing some filters or searching a different keyword.</p>
                <button onClick={clearFilters} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">Clear All Filters</button>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">ID</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Priority</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testCases.map(tc => (
                    <tr key={tc.id} onClick={() => navigate(`/test-cases/${tc.id}`)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                      <td className="px-5 py-3.5 font-mono text-blue-600 font-medium whitespace-nowrap">{tc.test_case_id}</td>
                      <td className="px-5 py-3.5 text-slate-800 font-medium max-w-md truncate group-hover:text-blue-700">{tc.title}</td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{tc.test_type}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tc.priority === 'Critical' ? 'bg-red-100 text-red-700' : tc.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{tc.priority}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tc.status === 'Approved' ? 'bg-green-100 text-green-700' : tc.status === 'Under Review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{tc.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && testCases.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
              <span className="text-sm text-slate-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of <span className="font-semibold text-slate-700">{pagination.total}</span> test cases
              </span>
              <div className="flex items-center gap-2">
                <button 
                  disabled={pagination.page === 1}
                  onClick={() => updateFilters('page', pagination.page - 1)}
                  className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-700 px-2">Page {pagination.page} of {pagination.totalPages || 1}</span>
                <button 
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => updateFilters('page', pagination.page + 1)}
                  className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Filter Modal */}
      {showSaveFilterModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Save Search Filter</h3>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Name</label>
              <input 
                autoFocus
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., High Priority Regression"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200">
              <button onClick={() => setShowSaveFilterModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={saveFilter} disabled={!filterName.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save Filter</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
