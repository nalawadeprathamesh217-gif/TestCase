import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import InfoTooltip from '../components/InfoTooltip';
import { ArrowLeft, History, FileText, CheckCircle, Search, RefreshCw, AlertCircle, Clock, Sparkles } from 'lucide-react';

const ExecBadge = ({ result }) => {
  const colors = { 'Passed': 'bg-green-100 text-green-700', 'Failed': 'bg-red-100 text-red-700', 'Blocked': 'bg-orange-100 text-orange-700', 'Not Executed': 'bg-slate-100 text-slate-500' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[result] || 'bg-slate-100 text-slate-500'}`}>{result}</span>;
};

export default function TestCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [testCase, setTestCase] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [executions, setExecutions] = useState([]);
  const [quality, setQuality] = useState(null);
  const [versions, setVersions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  const [execForm, setExecForm] = useState({ execution_result: 'Passed', actual_result: '', comments: '', environment: '', browser: '' });
  const [executing, setExecuting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  
  const [compareVersions, setCompareVersions] = useState({ from: '', to: '' });
  const [diff, setDiff] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('AI is reviewing this test case...');

  useEffect(() => {
    let interval;
    if (evaluating) {
      const messages = [
        'AI is reviewing this test case...',
        'Checking completeness...',
        'Checking clarity...',
        'Checking relevance...',
        'Checking consistency...'
      ];
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMsg(messages[i]);
      }, 2000);
    } else {
      setLoadingMsg('AI is reviewing this test case...');
    }
    return () => clearInterval(interval);
  }, [evaluating]);

  const fetchData = async () => {
    try {
      const tcRes = await api.get(`/test-cases/${id}`);
      setTestCase(tcRes.data.data);
      
      try {
        const execRes = await api.get(`/test-cases/${id}/executions`);
        setExecutions(execRes.data.data || []);
      } catch (e) {}
      
      try {
        const qRes = await api.get(`/test-cases/${id}/quality`);
        if (qRes.data.data) setQuality(qRes.data.data);
      } catch (e) {}
      
      try {
        const vRes = await api.get(`/test-cases/${id}/versions`);
        setVersions(vRes.data.data || []);
      } catch (e) {}

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleExecute = async (e) => {
    e.preventDefault();
    setExecuting(true);
    try {
      await api.post(`/test-cases/${id}/executions`, execForm);
      setExecForm({ execution_result: 'Passed', actual_result: '', comments: '', environment: '', browser: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await api.post(`/test-cases/${id}/quality/evaluate`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  const handleCompare = async () => {
    if (!compareVersions.from || !compareVersions.to) return;
    try {
      const res = await api.get(`/test-cases/${id}/versions/compare?from=${compareVersions.from}&to=${compareVersions.to}`);
      setDiff(res.data.data.differences);
    } catch (err) {
      alert(err.response?.data?.message || 'Comparison failed');
    }
  };

  const handleRestore = async (versionNumber) => {
    if (!window.confirm(`Restore Version ${versionNumber} as the current version?`)) return;
    setRestoring(true);
    try {
      await api.post(`/test-cases/${id}/versions/${versionNumber}/restore`);
      await fetchData();
      setActiveTab('Overview');
      alert(`Version ${versionNumber} restored successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <AppLayout><div className="text-center py-20 text-slate-400">Loading...</div></AppLayout>;
  if (!testCase) return <AppLayout><div className="text-center py-20 text-slate-500">Test case not found.</div></AppLayout>;

  let steps = [];
  if (testCase.test_steps) {
    if (typeof testCase.test_steps === 'string') {
      try {
        const parsed = JSON.parse(testCase.test_steps);
        if (Array.isArray(parsed)) {
          steps = parsed;
        } else {
          steps = testCase.test_steps.split('\n');
        }
      } catch (e) {
        steps = testCase.test_steps.split('\n');
      }
    } else if (Array.isArray(testCase.test_steps)) {
      steps = testCase.test_steps;
    }
  }
  steps = steps.filter(s => typeof s === 'string' && s.trim());
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/test-cases')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
              {testCase.test_case_id} 
              <span className="text-sm font-normal text-slate-400 ml-2">v{testCase.version_count}</span>
            </h1>
            <p className="text-slate-500 text-sm">{testCase.title}</p>
          </div>
        </div>
        
        {testCase.quality_stale && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Quality evaluation may be outdated</p>
              <p className="text-sm opacity-80">This test case was modified after the last evaluation.</p>
            </div>
            <button onClick={() => { setActiveTab('Quality'); handleEvaluate(); }} className="ml-auto text-sm font-medium bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded">Evaluate Again</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-col mb-6 border-b border-slate-200">
          <div className="flex gap-6">
            {['Overview', 'Versions', 'Execution', 'Quality'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 py-2">
            {activeTab === 'Overview' && 'View the complete test case.'}
            {activeTab === 'Versions' && 'See how this test case has changed over time.'}
            {activeTab === 'Execution' && 'Run this test and record the result.'}
            {activeTab === 'Quality' && 'Ask AI to review the quality of this test case.'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {activeTab === 'Overview' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{testCase.test_type}</span>
                  <ExecBadge result={testCase.execution_result} />
                </div>
                {[ 
                  { label: 'Description', value: testCase.description },
                  { label: 'Preconditions', value: testCase.preconditions, helper: 'What needs to be ready before you start this test.' },
                ].map(f => (
                  <div key={f.label} className="mb-6">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">{f.label}</h3>
                    {f.helper && <p className="text-xs text-slate-500 mb-2">{f.helper}</p>}
                    {f.value ? (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{f.value}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No {f.label.toLowerCase()} provided.</p>
                    )}
                  </div>
                ))}
                
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Test Steps</h3>
                  <p className="text-xs text-slate-500 mb-3">Follow these steps to perform the test.</p>
                  {steps.length > 0 ? (
                    <div className="space-y-3">
                      {steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center justify-center font-bold">
                            {i + 1}
                          </div>
                          <div className="pt-1.5 text-sm text-slate-700">
                            {step.replace(/^\d+\.\s*/, '')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl text-center">
                      <p className="text-sm text-slate-500 italic">No test steps have been added yet.</p>
                    </div>
                  )}
                </div>
                
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Expected Result</h3>
                  <p className="text-xs text-slate-500 mb-2">What should happen when the test passes.</p>
                  {testCase.expected_result ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                      {testCase.expected_result}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No expected result provided.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Versions' && (
              <div className="space-y-6">
                
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 mb-2">
                  <p className="font-semibold mb-1">How version history works:</p>
                  <p>Every meaningful change creates a new version so you never lose the previous test case. Version 1 is the original. Later changes create Version 2, Version 3, and so on.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Compare From</label>
                    <select value={compareVersions.from} onChange={e => setCompareVersions(c => ({...c, from: e.target.value}))} className="w-full border-slate-300 rounded text-sm p-2">
                      <option value="">Select version</option>
                      {versions.map(v => <option key={`from-${v.version_number}`} value={v.version_number}>v{v.version_number} - {new Date(v.created_at).toLocaleDateString()}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Compare To</label>
                    <select value={compareVersions.to} onChange={e => setCompareVersions(c => ({...c, to: e.target.value}))} className="w-full border-slate-300 rounded text-sm p-2">
                      <option value="">Select version</option>
                      {versions.map(v => <option key={`to-${v.version_number}`} value={v.version_number}>v{v.version_number} - {new Date(v.created_at).toLocaleDateString()}</option>)}
                    </select>
                  </div>
                  <button onClick={handleCompare} disabled={!compareVersions.from || !compareVersions.to} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Compare</button>
                </div>

                {diff && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex justify-between">
                      <span>Comparison (v{compareVersions.from} vs v{compareVersions.to})</span>
                      <button onClick={() => setDiff(null)} className="text-sm text-slate-500 font-normal hover:text-slate-800">Clear</button>
                    </div>
                    <div className="p-4 space-y-4">
                      {diff.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No changes detected between these versions.</p> : diff.map(d => (
                        <div key={d.field} className="border border-slate-200 rounded p-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{d.field.replace('_', ' ')}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-red-50 text-red-900 p-2 rounded whitespace-pre-wrap"><span className="font-semibold text-red-700 block text-xs mb-1">v{compareVersions.from}</span>{d.old || '(empty)'}</div>
                            <div className="bg-green-50 text-green-900 p-2 rounded whitespace-pre-wrap"><span className="font-semibold text-green-700 block text-xs mb-1">v{compareVersions.to}</span>{d.new || '(empty)'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-700 mb-6">Version History</h3>
                  {versions.length <= 1 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700 mb-1">This test case currently has one version.</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">A new version will appear when you make a meaningful change to the title, steps, or requirements.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {versions.map((v, i) => (
                        <div key={v.id} className="relative pl-6 border-l-2 border-slate-200 last:border-0 pb-6 last:pb-0">
                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                              Version {v.version_number} 
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${v.change_type === 'Created' || v.change_type === 'Imported' ? 'bg-green-100 text-green-700' : v.change_type === 'Restored' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{v.change_type}</span>
                              {i === 0 && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-600 text-white">Current</span>}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              By {v.created_by?.name || 'System'} on {new Date(v.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-700 mt-2">{v.change_summary}</p>
                            {v.changed_fields?.length > 0 && (
                              <p className="text-xs text-slate-500 mt-2 flex flex-wrap gap-1">
                                <span className="font-medium mr-1">Changed:</span>
                                {v.changed_fields.map(f => <span key={f} className="bg-slate-100 px-1.5 py-0.5 rounded">{f.replace('_', ' ')}</span>)}
                              </p>
                            )}
                          </div>
                          {i !== 0 && (
                            <button 
                              onClick={() => handleRestore(v.version_number)}
                              disabled={restoring}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors"
                              title="Create a new version using this older content"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Execution' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-700 mb-1">Record Execution</h3>
                  <p className="text-sm text-slate-500 mb-6">Execute this test case and record what actually happened.</p>
                  
                  <form onSubmit={handleExecute} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Execution Result <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-500 mb-3">What was the result of this test?</p>
                      <div className="flex gap-3">
                        <select
                          value={execForm.execution_result}
                          onChange={e => setExecForm({ ...execForm, execution_result: e.target.value })}
                          className="w-full sm:w-auto border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          <option value="">Select result...</option>
                          <option value="Passed">Passed (The system behaved as expected)</option>
                          <option value="Failed">Failed (The system did not behave as expected)</option>
                          <option value="Blocked">Blocked (The test could not be completed)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Actual Result <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-500 mb-2">What actually happened when you performed the test?</p>
                      <textarea required value={execForm.actual_result} onChange={e => setExecForm({ ...execForm, actual_result: e.target.value })} rows={3} placeholder="Describe the actual outcome..." className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Environment</label>
                        <p className="text-xs text-slate-500 mb-2">Where did you run the test?</p>
                        <select value={execForm.environment} onChange={e => setExecForm({ ...execForm, environment: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select...</option>
                          <option value="Development">Development</option>
                          <option value="Testing">Testing</option>
                          <option value="Staging">Staging</option>
                          <option value="Production">Production</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Browser</label>
                        <p className="text-xs text-slate-500 mb-2">Which browser did you use?</p>
                        <select value={execForm.browser} onChange={e => setExecForm({ ...execForm, browser: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select...</option>
                          <option value="Chrome">Chrome</option>
                          <option value="Edge">Edge</option>
                          <option value="Firefox">Firefox</option>
                          <option value="Safari">Safari</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Comments</label>
                      <p className="text-xs text-slate-500 mb-2">Add any useful notes, observations, or problems.</p>
                      <textarea value={execForm.comments} onChange={e => setExecForm({ ...execForm, comments: e.target.value })} rows={2} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button type="submit" disabled={executing || !execForm.execution_result || !execForm.actual_result.trim()} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors w-full sm:w-auto">
                      {executing ? 'Saving...' : 'Save Execution'}
                    </button>
                  </form>
                </div>

                {executions.length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-semibold text-slate-700 mb-4">Execution History</h3>
                    <div className="space-y-3">
                      {executions.map(exec => (
                        <div key={exec.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <ExecBadge result={exec.execution_result} />
                          <div className="text-sm flex-1">
                            {exec.actual_result && <p className="text-slate-700">{exec.actual_result}</p>}
                            {exec.comments && <p className="text-slate-500 mt-1">{exec.comments}</p>}
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(exec.executed_at).toLocaleString()}
                              {exec.environment && ` • ${exec.environment}`}
                              {exec.browser && ` • ${exec.browser}`}
                            </p>
                          </div>
                          {exec.execution_result === 'Failed' && (
                            <Link to={`/defects/create?test_case_id=${testCase.id}&execution_id=${exec.id}`} className="flex-shrink-0 text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                              Create Defect
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
                    <p className="text-sm font-medium text-slate-700 mb-1">No executions yet.</p>
                    <p className="text-xs text-slate-500">Run this test case to record the first result.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Quality' && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> AI Quality Review
                  </h3>
                  <p className="text-sm text-slate-500">AI reviews your test case to find missing information and possible improvements.</p>
                  
                  <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
                    <p className="font-semibold mb-2">What does AI check?</p>
                    <ul className="space-y-1">
                      <li><span className="font-semibold">Completeness:</span> Does the test contain all important information?</li>
                      <li><span className="font-semibold">Clarity:</span> Are the test steps and expected result easy to understand?</li>
                      <li><span className="font-semibold">Relevance:</span> Does the test actually verify the requirement?</li>
                      <li><span className="font-semibold">Consistency:</span> Do the different parts of the test case agree with each other?</li>
                    </ul>
                  </div>
                </div>
                
                {quality ? (
                  <div>
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="text-center">
                        <span className="text-6xl font-black text-indigo-600 tracking-tighter">{quality.overall_score}</span>
                        <span className="text-lg text-slate-500 block -mt-1 font-medium">/ 100</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1 text-lg">Overall Quality Score</h4>
                        <p className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                          quality.overall_score >= 90 ? 'bg-green-100 text-green-700' :
                          quality.overall_score >= 70 ? 'bg-blue-100 text-blue-700' :
                          quality.overall_score >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {quality.overall_score >= 90 ? 'Excellent' : quality.overall_score >= 70 ? 'Good' : quality.overall_score >= 50 ? 'Needs Improvement' : 'Poor'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                      {[
                        { title: 'Completeness', score: quality.completeness_score, desc: 'Does the test contain all important information?' },
                        { title: 'Clarity', score: quality.clarity_score, desc: 'Is the test easy to understand and follow?' },
                        { title: 'Relevance', score: quality.relevance_score, desc: 'Does the test correctly test the requirement?' },
                        { title: 'Consistency', score: quality.consistency_score, desc: 'Do the description, steps, and expected result agree?' }
                      ].map(metric => (
                        <div key={metric.title} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-start gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                            metric.score >= 80 ? 'bg-green-50 text-green-700' : metric.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {metric.score}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm mb-0.5">{metric.title}</h5>
                            <p className="text-xs text-slate-500 mb-2">{metric.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {quality.suggestions && quality.suggestions.length > 0 && (
                      <div className="bg-indigo-50 p-5 rounded-xl text-sm text-indigo-900 border border-indigo-100 mb-8">
                        <p className="font-bold mb-3 uppercase tracking-wider text-xs text-indigo-800">Actionable Suggestions</p>
                        <ul className="space-y-3">
                          {quality.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-indigo-500 font-black mt-0.5">•</span> 
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <button onClick={handleEvaluate} disabled={evaluating} className="w-full font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {evaluating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{loadingMsg}</span>
                        </>
                      ) : 'Re-evaluate Test Case with AI'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                    <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-4 opacity-50" />
                    <p className="text-sm font-medium text-slate-700 mb-1">No AI quality review yet</p>
                    <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">Ask AI to review this test case for completeness, clarity, relevance, and consistency.</p>
                    <button onClick={handleEvaluate} disabled={evaluating} className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto">
                      {evaluating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{loadingMsg}</span>
                        </>
                      ) : 'Evaluate Test Case with AI'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-3">AI provides a review to help you improve the test case, but does not guarantee correctness.</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 text-xs mt-0.5">Priority</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 block">{testCase.priority}</span>
                    <span className="text-[10px] text-slate-400">How important this test is.</span>
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-slate-500 text-xs mt-0.5">Risk</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 block">{testCase.risk}</span>
                    <span className="text-[10px] text-slate-400">Impact if functionality fails.</span>
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-slate-500 text-xs mt-0.5">Status</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 block">{testCase.status}</span>
                    <span className="text-[10px] text-slate-400">
                      {testCase.status === 'Draft' ? 'Still being prepared.' : 
                       testCase.status === 'Approved' ? 'Ready for use.' : 
                       testCase.status === 'Rejected' ? 'Not accepted for use.' : 'No longer active.'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium">{testCase.test_type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Versions</span><span className="font-medium bg-blue-100 text-blue-700 px-2 rounded-full text-xs">{testCase.version_count}</span></div>
              </div>
            </div>
            {testCase.requirements && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Source Requirement</h3>
                <Link to={`/requirements/${testCase.requirement_id}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                  <span className="font-mono text-xs bg-blue-50 px-2 py-0.5 rounded">{testCase.requirements.requirement_key || testCase.requirements.id}</span>
                  {testCase.requirements.title}
                </Link>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Linked Defects</h3>
                <Link to={`/defects?test_case_id=${testCase.id}`} className="text-xs text-blue-600 hover:underline">View All</Link>
              </div>
              <p className="text-xs text-slate-500">Check the Defects page for bugs related to this test case.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
