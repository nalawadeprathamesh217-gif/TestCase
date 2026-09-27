import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { RefreshCw, FileText, CheckCircle, XCircle, Shield, AlertTriangle, Layers, BarChart2, Bug } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
        const [overviewRes, execRes, qualRes, defectRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/execution'),
        api.get('/analytics/quality'),
        api.get('/defects?status=Open&limit=100')
      ]);
      const openDefects = defectRes.data.data || [];
      const criticalDefects = openDefects.filter(d => d.severity === 'Critical').length;
      
      setData({
        overview: overviewRes.data.data,
        execution: execRes.data.data,
        quality: qualRes.data.data,
        defects: { open: openDefects.length, critical: criticalDefects }
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-[60vh] text-slate-500">Loading Dashboard...</div></AppLayout>;
  
  if (!data || (data.overview.testCases.total === 0 && data.overview.requirements.total === 0)) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto mt-10 bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart2 className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Welcome to AI Test Manager</h1>
          <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto">Your QA analytics will appear here once you start adding requirements, test cases, and execution results.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => navigate('/requirements/new')} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">Create Requirement</button>
            <button onClick={() => navigate('/test-cases/new')} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200">Create Test Case</button>
            <button onClick={() => navigate('/imports')} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200">Import Data</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { overview, execution, quality } = data;
  const passRate = overview.execution.passed + overview.execution.failed + overview.execution.blocked > 0 
    ? ((overview.execution.passed / (overview.execution.passed + overview.execution.failed + overview.execution.blocked)) * 100).toFixed(1) 
    : 0;

  const executionData = [
    { name: 'Passed', value: overview.execution.passed, color: '#10b981' },
    { name: 'Failed', value: overview.execution.failed, color: '#ef4444' },
    { name: 'Blocked', value: overview.execution.blocked, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  const coverageData = [
    { name: 'Covered', value: overview.coverage.covered, color: '#3b82f6' },
    { name: 'Not Covered', value: overview.coverage.uncovered, color: '#cbd5e1' }
  ];

  const execByType = Object.keys(execution.byType || {}).map(type => ({
    name: type,
    Passed: execution.byType[type].passed,
    Failed: execution.byType[type].failed,
    Blocked: execution.byType[type].blocked,
  }));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">QA Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">High-level view of your testing progress and quality.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Last updated: {lastUpdated.toLocaleTimeString()}</span>
            <button onClick={fetchDashboard} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Requirements</p>
              <p className="text-3xl font-bold text-slate-800">{overview.requirements.total}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><FileText className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Test Cases</p>
              <p className="text-3xl font-bold text-slate-800">{overview.testCases.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Layers className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Coverage</p>
              <p className="text-3xl font-bold text-slate-800">{overview.coverage.percentage}%</p>
            </div>
            <div className="w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600"><Shield className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pass Rate</p>
              <p className="text-3xl font-bold text-slate-800">{passRate}%</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600"><CheckCircle className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Open Defects</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-slate-800">{data.defects.open}</p>
                {data.defects.critical > 0 && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full mb-1">{data.defects.critical} Critical</span>}
              </div>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600"><Bug className="w-6 h-6" /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Requirement Coverage Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
            <h3 className="font-semibold text-slate-700 w-full mb-4">Requirement Coverage</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={coverageData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {coverageData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Requirements']} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <p className="text-3xl font-bold text-blue-600">{overview.coverage.percentage}%</p>
              <p className="text-sm text-slate-500">Covered</p>
            </div>
          </div>

          {/* Execution Status Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
            <h3 className="font-semibold text-slate-700 w-full mb-4">Execution Status</h3>
            {executionData.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={executionData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {executionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Tests']} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-slate-400">No execution data available</div>
            )}
            <div className="text-center mt-2">
              <p className="text-3xl font-bold text-green-600">{passRate}%</p>
              <p className="text-sm text-slate-500">Pass Rate</p>
            </div>
          </div>
        </div>

        {/* Execution by Type Bar Chart */}
        {execByType.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
            <h3 className="font-semibold text-slate-700 mb-6">Execution by Test Type</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execByType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Legend />
                  <Bar dataKey="Passed" stackId="a" fill="#10b981" />
                  <Bar dataKey="Failed" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Blocked" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
