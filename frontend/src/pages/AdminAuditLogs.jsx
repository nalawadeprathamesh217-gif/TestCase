import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
            <p className="text-slate-500 text-sm mt-1">System-wide activity trail (Admin Only)</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">User</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Entity</th>
                    <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-800 font-medium">{log.profiles?.full_name || 'System'}</td>
                      <td className="px-5 py-3"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold uppercase">{log.action}</span></td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{log.entity_id || '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
