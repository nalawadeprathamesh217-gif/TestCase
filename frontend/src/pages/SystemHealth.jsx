import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Activity, Database, Server, Cpu } from 'lucide-react';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await api.get('/admin/system-health');
      setHealth(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const StatusCard = ({ title, status, icon: Icon }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${status === 'Healthy' || status === 'Configured' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
          <p className="text-slate-500 text-sm mt-1">Component Status</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status === 'Healthy' || status === 'Configured' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <div className={`w-2 h-2 rounded-full ${status === 'Healthy' || status === 'Configured' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {status}
        </span>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">System Health</h1>
            <p className="text-slate-500 text-sm mt-1">Infrastructure status (Admin Only)</p>
          </div>
          <button onClick={fetchHealth} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            Refresh Status
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Checking system health...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatusCard title="Backend API" status={health?.api || 'Unknown'} icon={Server} />
            <StatusCard title="PostgreSQL Database" status={health?.database || 'Unknown'} icon={Database} />
            <StatusCard title="File Storage" status={health?.storage || 'Unknown'} icon={Server} />
            <StatusCard title="AI Provider (Gemini)" status={health?.ai_provider || 'Unknown'} icon={Cpu} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
