import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Bot, ArrowLeft, Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { normalizeListField } from '../utils/testCaseFormatters';

export default function AiGeneration() {
  const { id: requirementId } = useParams();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRetryable, setIsRetryable] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [acceptingId, setAcceptingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [acceptedTcIds, setAcceptedTcIds] = useState({});
  const [editForm, setEditForm] = useState({
    title: '', description: '', preconditions: [], testSteps: [], expectedResult: '', testType: 'Functional', priority: 'Medium', risk: 'Medium'
  });

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/requirements/${requirementId}`);
      setRequirement(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load requirement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [requirementId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setIsRetryable(false);
    setLoadingText('Generating test cases...');

    try {
      const res = await api.post(`/requirements/${requirementId}/generate-test-cases`, { count: 3 });
      
      const generated = res.data?.data?.candidates || [];
      const finalProvider = res.data?.data?.finalProvider || 'gemini';
      
      if (generated.length === 0) {
        setError('No test cases were generated.');
      } else {
        if (finalProvider.toLowerCase() === 'gemini') {
          setSuccessMessage('Test cases generated successfully using Gemini.');
        } else if (finalProvider.toLowerCase() === 'groq') {
          setSuccessMessage('Gemini was temporarily unavailable. Test cases were generated using Groq.');
        } else if (finalProvider.toLowerCase() === 'openrouter') {
          setSuccessMessage('Gemini and Groq were unavailable. Test cases were generated using OpenRouter.');
        } else if (finalProvider.toLowerCase() === 'mistral') {
          setSuccessMessage('Test cases were generated using Mistral after the previous AI providers were unavailable.');
        } else {
          setSuccessMessage(`Test cases generated successfully using ${finalProvider}.`);
        }
      }
      setCandidates(generated.map(c => ({...c, status: 'Pending'})));
    } catch (err) {
      if (err.response?.data?.code === 'ALL_AI_PROVIDERS_FAILED') {
        setError('All configured AI providers are currently unavailable. No test cases were generated.');
      } else {
        setError(err.response?.data?.message || 'Failed to generate test cases.');
      }
      if (err.response?.data?.retryable) {
        setIsRetryable(true);
      }
    } finally {
      setGenerating(false);
      setLoadingText('');
    }
  };

  const handleReview = (id, action) => {
    if (action === 'Rejected' || action === 'Pending') {
      setCandidates(candidates.map(c => c.id === id ? { ...c, status: action, reviewStatus: action } : c));
    }
  };

  const handleSaveEdit = async (id) => {
    setSavingEdit(true);
    try {
      const res = await api.put(`/requirements/candidates/${id}`, editForm);
      setCandidates(candidates.map(c => c.id === id ? { ...c, ...res.data.data } : c));
      setEditingId(null);
      setSuccessMessage('Candidate updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save edit.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAcceptCandidate = async (id) => {
    setAcceptingId(id);
    setError('');
    setSuccessMessage('');
    try {
      const res = await api.post(`/requirements/candidates/${id}/accept`);
      const newTcId = res.data?.data?.id;
      setAcceptedTcIds(prev => ({...prev, [id]: newTcId}));
      setSuccessMessage('Test case accepted successfully.');
      setCandidates(candidates.map(c => c.id === id ? { ...c, status: 'Accepted', reviewStatus: 'Accepted' } : c));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept test case.');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) return <AppLayout><div className="text-center py-20">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/requirements/${requirementId}`)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Generate Test Cases with AI</h1>
            <p className="text-slate-500 text-sm">Create test case suggestions from an approved requirement.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 p-4 rounded-xl mb-6 shadow-sm border border-green-200">
            <Check className="w-5 h-5" /> {successMessage}
          </div>
        )}

        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl p-8 mb-8 text-white shadow-lg flex items-center justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/30 text-blue-100 px-3 py-1 rounded-full text-xs font-medium mb-4 border border-blue-400/30">
              <Sparkles className="w-3 h-3" /> Phase 3 Feature
            </div>
            <h2 className="text-2xl font-bold mb-2">What does AI do here?</h2>
            <p className="text-blue-100/80 text-sm mb-4">
              AI reads the requirement and suggests different ways to test it, such as normal, negative, validation, and boundary scenarios.
            </p>
            <div className="bg-blue-900/50 border border-blue-700/50 rounded-xl p-4 mb-6 text-sm">
              <p className="font-semibold mb-2">Workflow:</p>
              <p>Requirement → AI analyzes the requirement → AI creates test suggestions → You review the suggestions → You accept, edit, or reject them</p>
              <p className="mt-3 font-medium text-yellow-300">IMPORTANT: AI suggestions are not automatically approved. Review them before adding them to your test suite.</p>
            </div>
            <button 
              onClick={handleGenerate} 
              disabled={generating || requirement?.status !== 'Approved'}
              className="bg-white text-indigo-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <>{loadingText}</>
              ) : isRetryable ? (
                <><Bot className="w-5 h-5" /> Try Again</>
              ) : (
                <><Bot className="w-5 h-5" /> Generate Test Cases</>
              )}
            </button>
            <p className="text-xs text-blue-200 mt-2">AI will create test case suggestions. You can review them before saving.</p>
            {requirement && (
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-900/50 border border-blue-700/50 rounded-lg px-3 py-1.5 text-xs text-blue-100">
                <span className="font-semibold text-blue-300">Requirement:</span> {requirement.requirement_id || requirement.id} — {requirement.title}
              </div>
            )}
            {requirement?.status !== 'Approved' && (
              <p className="text-xs text-red-300 mt-2 font-medium">Approve this requirement before generating AI test cases.</p>
            )}
          </div>
          <div className="hidden lg:block opacity-20">
            <Bot className="w-48 h-48" />
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">Review AI-Generated Test Cases</h3>
              <p className="text-sm text-slate-500">Review the test cases suggested by AI before adding them to your test suite.</p>
              <p className="text-xs text-slate-400 mt-1">AI generated this suggestion from the selected requirement. Always check that the steps and expected result match the requirement.</p>
            </div>
            {candidates.map(candidate => {
              const isEditing = editingId === candidate.id;
              
              const renderList = (items, emptyMessage) => {
                const normalized = normalizeListField(items);
                if (normalized.length === 0) return <p className="text-sm text-slate-500 italic">{emptyMessage}</p>;
                return (
                  <ol className="space-y-1 list-decimal pl-4">
                    {normalized.map((item, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ol>
                );
              };

              const riskColors = { 'High': 'bg-red-100 text-red-700', 'Medium': 'bg-amber-100 text-amber-700', 'Low': 'bg-green-100 text-green-700' };
              const riskColor = riskColors[candidate.risk] || 'bg-slate-100 text-slate-700';

              if (isEditing) {
                return (
                  <div key={candidate.id} className="bg-white rounded-xl border border-blue-400 p-5 shadow-md">
                    <h4 className="font-semibold text-slate-800 mb-4">Edit Candidate</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                        <input className="w-full border rounded p-2 text-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                        <textarea className="w-full border rounded p-2 text-sm" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Preconditions (one per line)</label>
                        <textarea className="w-full border rounded p-2 text-sm" value={editForm.preconditions.join('\n')} onChange={e => setEditForm({...editForm, preconditions: e.target.value.split('\n')})} rows={3} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Test Steps (one per line)</label>
                        <textarea className="w-full border rounded p-2 text-sm" value={editForm.testSteps.join('\n')} onChange={e => setEditForm({...editForm, testSteps: e.target.value.split('\n')})} rows={4} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Expected Result</label>
                        <textarea className="w-full border rounded p-2 text-sm" value={editForm.expectedResult} onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Test Type</label>
                          <input className="w-full border rounded p-2 text-sm" value={editForm.testType} onChange={e => setEditForm({...editForm, testType: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                          <select className="w-full border rounded p-2 text-sm" value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Risk</label>
                          <select className="w-full border rounded p-2 text-sm" value={editForm.risk} onChange={e => setEditForm({...editForm, risk: e.target.value})}>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-slate-600">Cancel</button>
                      <button onClick={() => handleSaveEdit(candidate.id)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={savingEdit}>
                        {savingEdit ? 'Saving...' : 'Save Edit'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
              <div key={candidate.id} className={`bg-white rounded-xl border p-6 shadow-sm transition-colors ${candidate.reviewStatus === 'Accepted' || candidate.status === 'Accepted' ? 'border-green-400 bg-green-50/30' : candidate.reviewStatus === 'Rejected' || candidate.status === 'Rejected' ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider rounded">{candidate.testType}</span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded">{candidate.priority}</span>
                    <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded ${riskColor}`}>Risk: {candidate.risk || 'Not specified'}</span>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{candidate.title}</h4>
                    <div className="mt-4">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</h5>
                      <p className="text-sm text-slate-700">{candidate.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mt-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Preconditions</h5>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full">
                        {renderList(candidate.preconditions, 'No preconditions specified.')}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Test Steps</h5>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full">
                        {renderList(candidate.testSteps, 'No test steps were generated.')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Expected Result</h5>
                    {candidate.expectedResult ? (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm text-green-900 font-medium">
                        {candidate.expectedResult}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No expected result was generated.</p>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-400 font-medium">
                      Status: <span className="text-slate-600">{candidate.reviewStatus || candidate.status || 'Pending'}</span>
                    </div>

                    {(candidate.reviewStatus === 'Pending' || candidate.reviewStatus === 'Edited' || candidate.status === 'Pending') ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          setEditingId(candidate.id);
                          setEditForm({
                            title: candidate.title,
                            description: candidate.description,
                            preconditions: candidate.preconditions || [],
                            testSteps: candidate.testSteps || [],
                            expectedResult: candidate.expectedResult,
                            testType: candidate.testType,
                            priority: candidate.priority,
                            risk: candidate.risk
                          });
                        }} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleReview(candidate.id, 'Rejected')} className="flex items-center gap-1 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button 
                          onClick={() => handleAcceptCandidate(candidate.id)} 
                          disabled={acceptingId === candidate.id}
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {acceptingId === candidate.id ? 'Accepting...' : <><Check className="w-4 h-4" /> Accept</>}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {(candidate.reviewStatus === 'Accepted' || candidate.status === 'Accepted') && acceptedTcIds[candidate.id] && (
                          <button onClick={() => navigate(`/test-cases/${acceptedTcIds[candidate.id]}`)} className="text-sm font-bold text-blue-600 hover:underline">
                            View Test Case
                          </button>
                        )}
                        <span className={`text-sm font-bold flex items-center gap-1 ${(candidate.reviewStatus === 'Accepted' || candidate.status === 'Accepted') ? 'text-green-600' : 'text-red-600'}`}>
                          {(candidate.reviewStatus === 'Accepted' || candidate.status === 'Accepted') ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {(candidate.reviewStatus || candidate.status)}
                        </span>
                        <button onClick={() => handleReview(candidate.id, 'Pending')} className="text-xs text-slate-400 hover:text-slate-600 underline">Undo</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
            
            {candidates.every(c => c.status !== 'Pending') && candidates.length > 0 && candidates.some(c => c.status === 'Rejected') && (
              <div className="mt-6 flex justify-end">
                <p className="text-sm text-slate-500 italic">All pending candidates have been reviewed.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
