import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import InfoTooltip from '../components/InfoTooltip';
import { ArrowLeft, History, FileText, CheckCircle, Search, RefreshCw, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { normalizeListField } from '../utils/testCaseFormatters';

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
  
  const [execForm, setExecForm] = useState({ execution_result: '', actual_result: '', comments: '', environment: '', browser: '' });
  const [executing, setExecuting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  
  const [compareVersions, setCompareVersions] = useState({ from: '', to: '' });
  const [diff, setDiff] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('AI is reviewing this test case...');

  useEffect(() => {
    if (evaluating) {
      setLoadingMsg('Evaluating completeness, clarity, relevance and consistency...');
    }
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
      setExecForm({ execution_result: '', actual_result: '', comments: '', environment: '', browser: '' });
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
      const res = await api.post(`/test-cases/${id}/quality/evaluate`);
      const newQuality = res.data.data;
      if (newQuality.aiProvider === 'groq') {
        alert('Gemini was temporarily unavailable. The test case was evaluated using Groq.');
      } else if (newQuality.aiProvider === 'openrouter') {
        alert('Gemini and Groq were unavailable. The test case was evaluated using OpenRouter.');
      } else if (newQuality.aiProvider === 'mistral') {
        alert('The test case was evaluated using Mistral after the previous AI providers were unavailable.');
      }
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

  let steps = normalizeListField(testCase.test_steps);
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
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Description</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{testCase.description || <span className="italic text-slate-400">No description provided.</span>}</p>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Preconditions</h3>
                  <p className="text-xs text-slate-500 mb-2">What needs to be ready before you start this test.</p>
                  {(() => {
                    const preconds = normalizeListField(testCase.preconditions);
                    if (preconds.length === 0) {
                      return <p className="text-sm text-slate-500 italic">No preconditions provided.</p>;
                    }
                    
                    return (
                      <ol className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 list-decimal pl-8">
                        {preconds.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ol>
                    );
                  })()}
                </div>
                
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
                      {diff.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No changes detected between these versions.</p> : diff.map(d => {
                        const isList = d.field === 'preconditions' || d.field === 'test_steps';
                        let oldVal = d.old || '(empty)';
                        let newVal = d.new || '(empty)';
                        
                        if (isList) {
                          const oldList = normalizeListField(d.old);
                          const newList = normalizeListField(d.new);
                          oldVal = oldList.length ? oldList.map((item, i) => `${i+1}. ${item}`).join('\n') : '(empty)';
                          newVal = newList.length ? newList.map((item, i) => `${i+1}. ${item}`).join('\n') : '(empty)';
                        }
                        
                        return (
                          <div key={d.field} className="border border-slate-200 rounded p-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{d.field.replace('_', ' ')}</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-red-50 text-red-900 p-2 rounded whitespace-pre-wrap"><span className="font-semibold text-red-700 block text-xs mb-1">v{compareVersions.from}</span>{oldVal}</div>
                              <div className="bg-green-50 text-green-900 p-2 rounded whitespace-pre-wrap"><span className="font-semibold text-green-700 block text-xs mb-1">v{compareVersions.to}</span>{newVal}</div>
                            </div>
                          </div>
                        );
                      })}
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
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Execute Test Steps</h3>
                  {steps.length > 0 ? (
                    <div className="space-y-4">
                      {steps.map((step, i) => (
                        <div key={i} className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Step {i + 1}</span>
                          <span className="text-sm text-slate-700 font-medium">{step.replace(/^\d+\.\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-100">No test steps provided.</p>
                  )}
                  {testCase.expected_result && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                      <span className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 block">Expected Result</span>
                      <span className="text-sm text-green-900 font-medium">{testCase.expected_result}</span>
                    </div>
                  )}
                </div>

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

            {activeTab === 'Quality' && (() => {
              // --- Helper functions scoped inside Quality tab ---
              const overallScore = quality?.overall ?? quality?.overall_score ?? null;
              const getLabel = (s) => s >= 90 ? 'Excellent' : s >= 75 ? 'Good' : s >= 50 ? 'Needs Improvement' : 'Poor';
              const getLabelColor = (s) => s >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s >= 75 ? 'bg-blue-100 text-blue-700 border-blue-200' : s >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
              const getBarColor = (s) => s >= 90 ? 'bg-emerald-500' : s >= 75 ? 'bg-blue-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';
              const getScoreTextColor = (s) => s >= 90 ? 'text-emerald-600' : s >= 75 ? 'text-blue-600' : s >= 50 ? 'text-amber-600' : 'text-red-600';
              const getOverallHelper = (s) => {
                if (s >= 90) return 'Your test case is well-written and covers the requirement effectively.';
                if (s >= 75) return 'Your test case is good overall, but some areas could be strengthened.';
                if (s >= 50) return 'Your test case is usable, but some important parts of the requirement are not covered.';
                return 'Your test case has significant gaps. Consider adding missing information before using it.';
              };

              const metrics = quality ? [
                { key: 'completeness', title: 'Completeness', score: quality.completeness?.score ?? quality.completeness_score ?? 0, reason: quality.completeness?.reason ?? '', desc: 'Does the test contain all important information?', tooltip: 'Checks whether the test contains enough information and covers the important parts of the requirement.' },
                { key: 'clarity', title: 'Clarity', score: quality.clarity?.score ?? quality.clarity_score ?? 0, reason: quality.clarity?.reason ?? '', desc: 'Are the steps easy to follow?', tooltip: 'Checks whether another tester can easily understand and follow the test steps.' },
                { key: 'relevance', title: 'Relevance', score: quality.relevance?.score ?? quality.relevance_score ?? 0, reason: quality.relevance?.reason ?? '', desc: 'Does it test the requirement?', tooltip: 'Checks whether the test actually verifies the selected requirement.' },
                { key: 'consistency', title: 'Consistency', score: quality.consistency?.score ?? quality.consistency_score ?? 0, reason: quality.consistency?.reason ?? '', desc: 'Do the parts agree?', tooltip: 'Checks whether the title, description, preconditions, steps and expected result agree with each other.' }
              ] : [];

              const goodPoints = quality ? metrics.filter(m => m.score >= 75) : [];
              const improvementPoints = quality ? metrics.filter(m => m.score < 75) : [];

              const covered = quality?.coveredRequirementBehavior || [];
              const assumptions = quality?.unsupportedAssumptions || [];
              const suggestions = quality?.suggestions || [];

              return (
              <div className="space-y-6">

                {/* ============ SECTION 1: Overall Score Hero ============ */}
                {quality ? (
                  <>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 pt-8 pb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-5 h-5 text-indigo-500" />
                          <h3 className="text-lg font-bold text-slate-800">AI Quality Review</h3>
                          <InfoTooltip text="AI evaluates your test case across four quality areas. Scores range from 0–100." />
                        </div>
                        <p className="text-sm text-slate-500">How good is this test case?</p>
                      </div>

                      <div className="px-8 pb-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          {/* Score circle */}
                          <div className="relative flex-shrink-0">
                            <svg viewBox="0 0 120 120" className="w-28 h-28">
                              <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                              <circle cx="60" cy="60" r="52" fill="none" stroke={overallScore >= 90 ? '#10b981' : overallScore >= 75 ? '#3b82f6' : overallScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(overallScore / 100) * 327} 327`} transform="rotate(-90 60 60)" className="transition-all duration-700" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-3xl font-black tracking-tight ${getScoreTextColor(overallScore)}`}>{overallScore}</span>
                              <span className="text-xs text-slate-400 font-medium -mt-0.5">/ 100</span>
                            </div>
                          </div>

                          {/* Label and explanation */}
                          <div className="text-center sm:text-left flex-1">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getLabelColor(overallScore)} mb-2`}>
                              {getLabel(overallScore)}
                            </span>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {getOverallHelper(overallScore)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ============ SECTION 2: Quality Breakdown ============ */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Quality Breakdown</h4>
                      <p className="text-xs text-slate-500 mb-6">How your test case scores in each quality area.</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metrics.map(metric => (
                          <div key={metric.key} className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-slate-800 text-sm">{metric.title}</h5>
                                <InfoTooltip text={metric.tooltip} />
                              </div>
                              <span className={`text-lg font-black ${getScoreTextColor(metric.score)}`}>{metric.score}<span className="text-xs font-medium text-slate-400"> / 100</span></span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                              <div className={`h-full rounded-full transition-all duration-700 ${getBarColor(metric.score)}`} style={{ width: `${metric.score}%` }} />
                            </div>

                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getLabelColor(metric.score)} mb-2`}>
                              {getLabel(metric.score)}
                            </span>

                            {metric.reason && (
                              <p className="text-xs text-slate-600 leading-relaxed mt-1">{metric.reason}</p>
                            )}
                            {!metric.reason && (
                              <p className="text-xs text-slate-400 italic mt-1">{metric.desc}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ============ SECTION 3: What is already good? ============ */}
                    {goodPoints.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">What is already good?</h4>
                        <p className="text-xs text-slate-500 mb-4">These areas of your test case are strong.</p>
                        <ul className="space-y-2">
                          {goodPoints.map(m => (
                            <li key={m.key} className="flex items-start gap-2.5 text-sm">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-700">
                                <span className="font-semibold">{m.title}</span>
                                {m.reason ? ` — ${m.reason}` : ` — scored ${m.score}/100.`}
                              </span>
                            </li>
                          ))}
                          {covered.length > 0 && covered.map((b, i) => (
                            <li key={`cov-${i}`} className="flex items-start gap-2.5 text-sm">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-700">{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ============ SECTION 4: What needs improvement? ============ */}
                    {(improvementPoints.length > 0 || assumptions.length > 0) && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">What needs improvement?</h4>
                        <p className="text-xs text-slate-500 mb-4">These areas could make your test case stronger.</p>
                        <ul className="space-y-2">
                          {improvementPoints.map(m => (
                            <li key={m.key} className="flex items-start gap-2.5 text-sm">
                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-700">
                                <span className="font-semibold">{m.title}</span>
                                {m.reason ? ` — ${m.reason}` : ` — scored ${m.score}/100.`}
                              </span>
                            </li>
                          ))}
                          {assumptions.length > 0 && assumptions.map((a, i) => (
                            <li key={`assum-${i}`} className="flex items-start gap-2.5 text-sm">
                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-700">{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ============ SECTION 5: Requirement Coverage ============ */}
                    {(covered.length > 0 || assumptions.length > 0) && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Requirement Coverage</h4>
                          <InfoTooltip text="Shows which requirement behaviors this test case actually checks, and which are missing." />
                        </div>
                        <p className="text-xs text-slate-500 mb-4">What this test actually checks against the requirement.</p>

                        {covered.length > 0 && assumptions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-3 mb-5 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                            <span className="text-sm font-bold text-slate-700">{covered.length} of {covered.length + assumptions.length} behaviors covered</span>
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden min-w-[80px]">
                              <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(Math.round((covered.length / (covered.length + assumptions.length)) * 100))}`} style={{ width: `${Math.round((covered.length / (covered.length + assumptions.length)) * 100)}%` }} />
                            </div>
                            <span className={`text-sm font-bold ${getScoreTextColor(Math.round((covered.length / (covered.length + assumptions.length)) * 100))}`}>
                              {Math.round((covered.length / (covered.length + assumptions.length)) * 100)}%
                            </span>
                          </div>
                        )}

                        {covered.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Covered</p>
                            <ul className="space-y-1.5">
                              {covered.map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {assumptions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Not Covered or Assumed</p>
                            <ul className="space-y-1.5">
                              {assumptions.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ============ SECTION 6: How can I improve? ============ */}
                    {suggestions.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">How can I improve this test case?</h4>
                        <p className="text-xs text-slate-500 mb-4">Actionable steps to make your test case stronger.</p>
                        <ol className="space-y-3">
                          {suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                              <span className="text-slate-700 leading-relaxed">{s}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* ============ SECTION 7: What should I do next? ============ */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">What should I do next?</h4>
                      <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                        {overallScore >= 90
                          ? 'Your test case looks great! You can proceed to execute it or generate more test cases for full requirement coverage.'
                          : overallScore >= 75
                          ? 'Your test case is good. Consider addressing the suggestions above to make it even better.'
                          : overallScore >= 50
                          ? 'Your test case is usable, but improving requirement coverage would make it stronger.'
                          : 'Your test case needs significant improvements. Edit the test case to address the missing areas before using it.'}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link to={`/test-cases/${id}/edit`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                          <FileText className="w-4 h-4" /> Edit Test Case
                        </Link>
                        {testCase?.requirement_id && (
                          <Link to={`/requirements/${testCase.requirement_id}/generate`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors">
                            <Sparkles className="w-4 h-4" /> Generate More Test Cases
                          </Link>
                        )}
                        <button onClick={handleEvaluate} disabled={evaluating} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
                          {evaluating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Evaluating...</> : <><RefreshCw className="w-4 h-4" /> Re-evaluate</>}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3">Run the evaluation again after you improve the test case.</p>
                    </div>

                    {/* ============ SECTION 8: AI Information ============ */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">AI Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">AI Provider Used</p>
                          <p className="font-semibold text-slate-700 capitalize flex items-center gap-1">
                            {quality.aiProvider || 'Unknown'}
                            <InfoTooltip text="Which AI service evaluated this test case. If the primary provider was unavailable, a fallback provider was used automatically." />
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">AI Model</p>
                          <p className="font-semibold text-slate-700">{quality.aiModel || 'Default'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Last Evaluated</p>
                          <p className="font-semibold text-slate-700">
                            {quality.evaluatedAt ? new Date(quality.evaluatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span>How this score was calculated:</span>
                        <InfoTooltip text="The AI evaluates Completeness, Clarity, Relevance, and Consistency (each 25%). The overall score is the weighted average." />
                        <span className="font-medium">AI evaluation — 4 dimensions, each worth 25%.</span>
                      </p>
                    </div>
                  </>
                ) : (
                  /* ============ EMPTY STATE ============ */
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-center py-16 px-8">
                      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">No AI quality review yet</h3>
                      <p className="text-sm text-slate-500 mb-2 max-w-md mx-auto">
                        Ask AI to review this test case for completeness, clarity, relevance, and consistency.
                      </p>
                      <p className="text-xs text-slate-400 mb-8 max-w-sm mx-auto">
                        The AI will check how well this test case covers the requirement and suggest improvements.
                      </p>
                      <button onClick={handleEvaluate} disabled={evaluating} className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                        {evaluating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{loadingMsg}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Evaluate Test Case with AI
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-400 mt-4">AI provides a review to help you improve the test case, but does not guarantee correctness.</p>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}

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
