import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { RefreshCw, BarChart2, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Execution');
  const [dateRange, setDateRange] = useState('30d');
  const [apiError, setApiError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setApiError(null);
      const to = new Date().toISOString();
      const fromDate = new Date();
      if (dateRange === '7d') fromDate.setDate(fromDate.getDate() - 7);
      else if (dateRange === '30d') fromDate.setDate(fromDate.getDate() - 30);
      else if (dateRange === '90d') fromDate.setDate(fromDate.getDate() - 90);
      else fromDate.setFullYear(2000);
      const from = fromDate.toISOString();

      const results = await Promise.allSettled([
        api.get('/analytics/overview', { params: { from, to } }),
        api.get('/analytics/execution', { params: { from, to } }),
        api.get('/analytics/quality', { params: { from, to } }),
        api.get('/analytics/requirements', { params: { from, to } }),
        api.get('/analytics/duplicates', { params: { from, to } }),
        api.get('/analytics/ai', { params: { from, to } })
      ]);

      const getData = (res) => res.status === 'fulfilled' ? res.value?.data?.data ?? null : null;

      const overviewData = getData(results[0]);
      if (!overviewData) throw new Error('Core analytics (overview) failed to load. Please check the server.');

      setData({
        overview: overviewData,
        execution: getData(results[1]),
        quality: getData(results[2]),
        requirements: getData(results[3]),
        duplicates: getData(results[4]),
        ai: getData(results[5])
      });
    } catch (err) {
      console.error('[Analytics] fetchAnalytics error:', err);
      setApiError(err.message || 'Unable to load analytics. Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Loading state ── */
  if (loading) return (
    <AppLayout>
      <div className="max-w-7xl mx-auto h-[60vh] flex flex-col justify-center items-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Loading analytics...</h2>
        <p className="text-slate-500 text-sm">Aggregating your test data, please wait.</p>
      </div>
    </AppLayout>
  );

  /* ── Full-page error state ── */
  if (apiError) return (
    <AppLayout>
      <div className="max-w-7xl mx-auto h-[60vh] flex flex-col justify-center items-center text-center px-4">
        <Shield className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to load analytics</h2>
        <p className="text-slate-500 mb-6 max-w-md">Some testing data could not be loaded. Please try again.</p>
        <div className="flex gap-4">
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <a
            href="/reports"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Go to Reports
          </a>
        </div>
      </div>
    </AppLayout>
  );

  if (!data) return (
    <AppLayout>
      <div className="flex items-center justify-center h-[60vh] text-slate-500">No analytics data available.</div>
    </AppLayout>
  );

  /* ── Safe destructure ── */
  const { overview, execution, quality, requirements, duplicates, ai } = data;

  /* ── Derived chart data (only computed when section data exists) ── */
  const execByType = execution
    ? Object.keys(execution.byType || {}).map(type => ({
        name: type,
        Passed: execution.byType[type]?.passed ?? 0,
        Failed: execution.byType[type]?.failed ?? 0,
        Blocked: execution.byType[type]?.blocked ?? 0,
      }))
    : [];

  const qualityDistData = quality
    ? [
        { name: 'Excellent (90–100)', value: quality.distribution?.excellent ?? 0, color: '#10b981' },
        { name: 'Good (75–89)',        value: quality.distribution?.good ?? 0,       color: '#3b82f6' },
        { name: 'Needs Work (50–74)', value: quality.distribution?.needs_improvement ?? 0, color: '#f59e0b' },
        { name: 'Poor (0–49)',         value: quality.distribution?.poor ?? 0,       color: '#ef4444' },
      ].filter(d => d.value > 0)
    : [];

  const qualityDimensions = quality
    ? [
        { name: 'Completeness', score: quality.average?.completeness ?? 0 },
        { name: 'Clarity',      score: quality.average?.clarity ?? 0 },
        { name: 'Relevance',    score: quality.average?.relevance ?? 0 },
        { name: 'Consistency',  score: quality.average?.consistency ?? 0 },
      ]
    : [];

  const reqStatusData = requirements
    ? Object.keys(requirements.byStatus || {}).map(status => ({
        name: status,
        value: requirements.byStatus[status],
        color: status === 'Approved' ? '#10b981' : status === 'Draft' ? '#94a3b8' : status === 'Under Review' ? '#f59e0b' : '#ef4444'
      })).filter(d => d.value > 0)
    : [];

  const reqPriorityData = requirements
    ? Object.keys(requirements.byPriority || {}).map(prio => ({
        name: prio,
        Count: requirements.byPriority[prio]
      })).filter(d => d.Count > 0)
    : [];

  const dupStatusData = duplicates
    ? Object.keys(duplicates.byStatus || {}).map(status => ({
        name: status.replace('_', ' '),
        value: duplicates.byStatus[status],
        color: status === 'confirmed' ? '#ef4444' : status === 'pending' ? '#f59e0b' : status === 'dismissed' ? '#94a3b8' : '#10b981'
      })).filter(d => d.value > 0)
    : [];

  const aiProviderData = ai
    ? Object.keys(ai.providers || {}).map(prov => ({
        name: prov,
        Count: ai.providers[prov]
      })).filter(d => d.Count > 0)
    : [];

  /* ── Per-tab error fallback ── */
  const renderTabError = (name) => (
    <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Could not load {name} analytics</h3>
      <p className="text-sm text-slate-500 mb-6">Something went wrong while fetching this data from the server.</p>
      <button
        onClick={fetchAnalytics}
        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
      >
        Retry
      </button>
    </div>
  );

  const TABS = ['Execution', 'Quality', 'Requirements', 'Duplicates', 'AI'];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
            <p className="text-slate-500 text-sm mt-1">
              Understand your testing progress, test quality, execution results, and requirement coverage.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <button
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab} Analytics
            </button>
          ))}
        </div>

        {/* ── EXECUTION TAB ── */}
        {activeTab === 'Execution' && (
          !overview ? renderTabError('Execution') : (
            <div className="space-y-6">
              <p className="text-sm text-slate-500">
                See how many tests passed, failed, were blocked, or are still waiting to be executed.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-slate-500 mb-1">Passed</p>
                  <p className="text-3xl font-bold text-slate-800">{overview.execution?.passed ?? 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <XCircle className="w-8 h-8 text-red-500 mb-2" />
                  <p className="text-sm font-medium text-slate-500 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-slate-800">{overview.execution?.failed ?? 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <BarChart2 className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-500 mb-1">Not Executed</p>
                  <p className="text-3xl font-bold text-slate-800">{overview.execution?.notExecuted ?? 0}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-700">Execution Results by Test Type</h3>
                <p className="text-xs text-slate-500 mb-6">Shows how many tests have Passed, Failed, or are Blocked per test type.</p>
                {(overview.execution?.passed ?? 0) === 0 && (overview.execution?.failed ?? 0) === 0 && (overview.execution?.blocked ?? 0) === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-200">
                      <CheckCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <h4 className="text-slate-700 font-semibold mb-1">No execution data yet.</h4>
                    <p className="text-sm text-slate-500 max-w-md">
                      Execute a test case to see execution analytics here.
                    </p>
                  </div>
                ) : execByType.length > 0 ? (
                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={execByType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
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
          )
        )}

        {/* ── QUALITY TAB ── */}
        {activeTab === 'Quality' && (
          !quality ? renderTabError('Quality') : (
            <div className="space-y-6">
              <p className="text-sm text-slate-500">
                See the quality of your test cases based on completeness, clarity, relevance, and consistency.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="font-semibold text-slate-700 w-full mb-4">Average Quality Score</h3>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-6xl font-bold text-indigo-600">{quality.average?.overall ?? 0}</span>
                    <span className="text-xl text-slate-500 mb-2">/ 100</span>
                  </div>
                  <p className="text-sm text-slate-500">Based on {quality.evaluated_count ?? 0} evaluated test cases</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-700">Quality Distribution</h3>
                  <p className="text-xs text-slate-500 mb-4">Shows the quality distribution of evaluated test cases.</p>
                  {(quality.evaluated_count ?? 0) === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center">
                      <h4 className="text-slate-700 font-semibold mb-1">No quality data available.</h4>
                      <p className="text-sm text-slate-500">Evaluate a test case using AI to see quality metrics here.</p>
                    </div>
                  ) : qualityDistData.length > 0 ? (
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
                {(quality.evaluated_count ?? 0) === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center">
                    <p className="text-slate-500 text-sm">No dimension data yet. Evaluate a test case to populate this chart.</p>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          )
        )}

        {/* ── REQUIREMENTS TAB ── */}
        {activeTab === 'Requirements' && (
          !requirements ? renderTabError('Requirements') : (
            <div className="space-y-6">
              <p className="text-sm text-slate-500">
                See how many requirements are covered by your test cases and their current status.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="font-semibold text-slate-700 w-full mb-4">Total Requirements</h3>
                  <div className="text-6xl font-bold text-slate-800 mb-2">{requirements.total ?? 0}</div>
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
                    <div className="h-48 flex flex-col items-center justify-center text-center">
                      <p className="text-slate-700 font-semibold mb-1">No requirements available yet.</p>
                      <p className="text-sm text-slate-500">Upload a requirement document or create a requirement to start.</p>
                    </div>
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
                  <div className="h-64 flex items-center justify-center text-slate-400">No priority data available.</div>
                )}
              </div>
            </div>
          )
        )}

        {/* ── DUPLICATES TAB ── */}
        {activeTab === 'Duplicates' && (
          !duplicates ? renderTabError('Duplicates') : (
            <div className="space-y-6">
              <p className="text-sm text-slate-500">
                See possible duplicate test cases that need review.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="font-semibold text-slate-700 w-full mb-4">Total Duplicates Flagged</h3>
                  <div className="text-6xl font-bold text-slate-800 mb-2">{duplicates.total ?? 0}</div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">{duplicates.types?.exact ?? 0} Exact</span>
                    <span className="text-sm px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">{duplicates.types?.semantic ?? 0} Semantic</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-700 mb-4">Review Status</h3>
                  {(duplicates.total ?? 0) === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center">
                      <h4 className="text-slate-700 font-semibold mb-1">No duplicate test cases found.</h4>
                      <p className="text-sm text-slate-500 max-w-sm">The system has not identified any potential duplicates for review.</p>
                    </div>
                  ) : dupStatusData.length > 0 ? (
                    <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dupStatusData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                            {dupStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="middle" align="right" layout="vertical" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400">No duplicates found in this period.</div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* ── AI TAB ── */}
        {activeTab === 'AI' && (
          !ai ? renderTabError('AI Generation') : (
            <div className="space-y-6">
              <p className="text-sm text-slate-500">
                See how many test cases were generated by AI and how many were accepted after review.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Generation Runs</p>
                  <p className="text-3xl font-bold text-slate-800">{ai.overview?.runs ?? 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Candidates Generated</p>
                  <p className="text-3xl font-bold text-slate-800">{ai.overview?.candidates ?? 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Accepted</p>
                  <p className="text-3xl font-bold text-green-600">{ai.overview?.accepted ?? 0}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Edited</p>
                  <p className="text-3xl font-bold text-blue-600">{ai.overview?.edited ?? 0}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-4">Provider Usage</h3>
                <p className="text-xs text-slate-500 mb-4">Shows which AI providers were used to generate test cases.</p>
                {(ai.overview?.runs ?? 0) === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center">
                    <h4 className="text-slate-700 font-semibold mb-1">No AI generation activity yet.</h4>
                    <p className="text-sm text-slate-500 max-w-sm">
                      Use the AI test case generation feature on a requirement to see metrics here.
                    </p>
                  </div>
                ) : aiProviderData.length > 0 ? (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aiProviderData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">No provider data available for this period.</div>
                )}
              </div>
            </div>
          )
        )}

      </div>
    </AppLayout>
  );
}
