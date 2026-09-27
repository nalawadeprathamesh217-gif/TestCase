import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Users, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (id, role) => {
    if (!window.confirm('Change this user\'s role?')) return;
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Change this user's status to ${status}?`)) return;
    try {
      await api.put(`/admin/users/${id}/status`, { status });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage roles and access for AI Test Manager</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading users...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-800 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {u.full_name ? u.full_name[0].toUpperCase() : 'U'}
                      </div>
                      {u.full_name || 'Unknown User'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <select 
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded text-xs px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="test_manager">Test Manager</option>
                        <option value="tester">Tester</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select 
                        value={u.status || 'Active'}
                        onChange={(e) => handleStatusChange(u.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded font-medium border ${u.status === 'Inactive' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
