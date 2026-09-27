import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { RefreshCw, BarChart2, CheckCircle, Target, Shield, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Execution');
  const [dateRange, setDateRange] = useState('30d');
  
  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const to = new Date().toISOString();
      const fromDate = new Date();
      if (dateRange === '7d') fromDate.setDate(fromDate.getDate() - 7);
      else if (dateRange === '30d') fromDate.setDate(fromDate.getDate() - 30);
      else if (dateRange === '90d') fromDate.setDate(fromDate.getDate() - 90);
      else fromDate.setFullYear(2000); // All time
      const from = fromDate.toISOString();

      const [overviewRes, execRes, qualRes, reqRes, dupRes] = await Promise.all([
        api.get('/analytics/overview', { params: { from, to } }),
        api.get('/analytics/execution', { params: { from, to } }),
        api.get('/analytics/quality', { params: { from, to } }),
        api.get('/analytics/requirements', { params: { from, to } }),
        api.get('/analytics/duplicates', { params: { from, to } })
      ]);
      setData({ 
        overview: overviewRes.data.data, 
        execution: execRes.data.data, 
        quality: qualRes.data.data,
        requirements: reqRes.data.data,
        duplicates: dupRes.data.data
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [dateRange]);

  if (loading) return <AppLayout><div className="flex items-center justify-center h-[60vh] text-slate-500">Loading Analytics...</div></AppLayout>;
  if (!data) return <AppLayout><div className="flex items-center justify-center h-[60vh] text-slate-500">No data available.</div></AppLayout>;

  const { overview, execution, quality, requirements, duplicates } = data;

  const execByType = Object.keys(execution.byType || {}).map(type => ({
    name: type,
    Passed: execution.byType[type].passed,
    Failed: execution.byType[type].failed,
    Blocked: execution.byType[type].blocked,
  }));

  const qualityDistData = [
    { name: 'Excellent (90-100)', value: quality.distribution.excellent, color: '#10b981' },
    { name: 'Good (75-89)', value: quality.distribution.good, color: '#3b82f6' },
    { name: 'Needs Improvement (50-74)', value: quality.distribution.needs_improvement, color: '#f59e0b' },
    { name: 'Poor (0-49)', value: quality.distribution.poor, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const qualityDimensions = [
    { name: 'Completeness', score: quality.average.completeness },
    { name: 'Clarity', score: quality.average.clarity },
    { name: 'Relevance', score: quality.average.relevance },
    { name: 'Consistency', score: quality.average.consistency },
  ];

  const reqStatusData = Object.keys(requirements.byStatus || {}).map(status => ({
    name: status,
    value: requirements.byStatus[status],
    color: status === 'Approved' ? '#10b981' : status === 'Draft' ? '#94a3b8' : status === 'Under Review' ? '#f59e0b' : '#ef4444'
  })).filter(d => d.value > 0);

  const reqPriorityData = Object.keys(requirements.byPriority || {}).map(prio => ({
    name: prio,
    Count: requirements.byPriority[prio]
  })).filter(d => d.Count > 0);

  const dupStatusData = Object.keys(duplicates.byStatus || {}).map(status => ({
    name: status.replace('_', ' '),
    value: duplicates.byStatus[status],
    color: status === 'confirmed' ? '#ef4444' : status === 'pending' ? '#f59e0b' : status === 'dismissed' ? '#94a3b8' : '#10b981'
  })).filter(d => d.value > 0);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto flex flex-col h-full min-h-screen">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
            <p className="text-slate-500 text-sm mt-1">Understand the current state of your requirements, test cases, execution results, quality, and duplicates.</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <button onClick={fetchAnalytics} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200 mb-6 overflow-x-auto">
          {['Execution', 'Quality', 'Requirements', 'Duplicates'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab} Analytics
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Execution' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-slate-500 mb-1">Passed Executions</p>
                <p className="text-3xl font-bold text-slate-800">{overview.execution.passed}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <XCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-sm font-medium text-slate-500 mb-1">Failed Executions</p>
                <p className="text-3xl font-bold text-slate-800">{overview.execution.failed}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <BarChart2 className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-500 mb-1">Not Executed</p>
                <p className="text-3xl font-bold text-slate-800">{overview.execution.notExecuted}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-700">Execution Results by Test Type</h3>
              <p className="text-xs text-slate-500 mb-6">Shows how many tests have Passed, Failed, or are Blocked.</p>
              {execByType.length > 0 ? (
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={execByType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend wrapperStyle={{paddingTop: '20px'}} />
                      <Bar dataKey="Passed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="Blocked" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">No execution data available for this period.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Quality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <h3 className="font-semibold text-slate-700 w-full mb-4">Average Quality Score</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-6xl font-bold text-indigo-600">{quality.average.overall || 0}</span>
                  <span className="text-xl text-slate-500 mb-2">/ 100</span>
                </div>
                <p className="text-sm text-slate-500">Based on {quality.evaluated_count} evaluated test cases</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-700">Quality Distribution</h3>
                <p className="text-xs text-slate-500 mb-4">Shows the quality distribution of evaluated test cases.</p>
                {qualityDistData.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={qualityDistData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {qualityDistData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400">No quality evaluations in this period.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-6">Quality Dimensions Breakdown</h3>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityDimensions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#475569', fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Requirements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <h3 className="font-semibold text-slate-700 w-full mb-4">Total Requirements</h3>
                <div className="text-6xl font-bold text-slate-800 mb-2">{requirements.total || 0}</div>
                <p className="text-sm text-slate-500">Tracked in this period</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-700">Status Distribution</h3>
                <p className="text-xs text-slate-500 mb-4">Shows how many requirements are in each review status.</p>
                {reqStatusData.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reqStatusData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {reqStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400">No data available.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-6">Requirements by Priority</h3>
              {reqPriorityData.length > 0 ? (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reqPriorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">No data available.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Duplicates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <h3 className="font-semibold text-slate-700 w-full mb-4">Total Duplicates Flagged</h3>
                <div className="text-6xl font-bold text-slate-800 mb-2">{duplicates.total || 0}</div>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">{duplicates.types?.exact || 0} Exact</span>
                  <span className="text-sm px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">{duplicates.types?.semantic || 0} Semantic</span>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-4">Review Status</h3>
                {dupStatusData.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dupStatusData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {dupStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" className="capitalize" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400">No duplicates found in this period.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
