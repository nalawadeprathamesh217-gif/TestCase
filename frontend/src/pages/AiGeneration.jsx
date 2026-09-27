import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Bot, ArrowLeft, Check, X, Sparkles, AlertCircle } from 'lucide-react';

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

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/requirements/${requirementId}`);
      setRequirement(res.data.data);
      // In a real app, you'd fetch existing unreviewed candidates from the DB
      // For this demo, we'll start with an empty array until they click "Generate"
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
    setLoadingText('Generating test cases with Gemini...');

    // Since the backend handles retries internally and waits, 
    // we simulate progress updates for the user based on expected backend delay timings.
    const t1 = setTimeout(() => setLoadingText('Gemini is temporarily busy. Retrying...'), 3500);
    const t2 = setTimeout(() => setLoadingText('Retrying AI generation (attempt 2 of 3)...'), 7500);
    const t3 = setTimeout(() => setLoadingText('Retrying AI generation (attempt 3 of 3)...'), 13000);

    try {
      const res = await api.post(`/requirements/${requirementId}/generate-test-cases`, { count: 3 });
      
      const generated = res.data?.data?.candidates || [];
      if (generated.length === 0) {
        setError('No test cases were generated.');
      }
      setCandidates(generated.map(c => ({...c, status: 'Pending'})));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test cases.');
      if (err.response?.data?.retryable) {
        setIsRetryable(true);
      }
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setGenerating(false);
      setLoadingText('');
    }
  };



  const handleReview = (id, action) => {
    if (action === 'Rejected') {
      setCandidates(candidates.map(c => c.id === id ? { ...c, status: action } : c));
    }
  };

  const handleAcceptCandidate = async (id) => {
    setAcceptingId(id);
    setError('');
    setSuccessMessage('');
    try {
      await api.post(`/requirements/candidates/${id}/accept`);
      setSuccessMessage('Test case accepted successfully.');
      setCandidates(candidates.filter(c => c.id !== id));
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
            {candidates.map(candidate => (
              <div key={candidate.id} className={`bg-white rounded-xl border p-5 shadow-sm transition-colors ${candidate.status === 'Accepted' ? 'border-green-400 bg-green-50/30' : candidate.status === 'Rejected' ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{candidate.test_type}</span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">{candidate.priority}</span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-base">{candidate.title}</h4>
                    <p className="text-sm text-slate-600 mt-2">{candidate.description}</p>
                  </div>
                  
                  {candidate.status === 'Pending' ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleReview(candidate.id, 'Rejected')} className="flex items-center gap-1 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors" title="Do not add this suggestion to your test suite.">
                        <X className="w-4 h-4" /> Reject
                      </button>
                      <button 
                        onClick={() => handleAcceptCandidate(candidate.id)} 
                        disabled={acceptingId === candidate.id}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        title="Save this suggestion as a real test case."
                      >
                        {acceptingId === candidate.id ? 'Accepting...' : <><Check className="w-4 h-4" /> Accept</>}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium flex items-center gap-1 ${candidate.status === 'Accepted' ? 'text-green-600' : 'text-red-600'}`}>
                        {candidate.status === 'Accepted' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {candidate.status}
                      </span>
                      <button onClick={() => handleReview(candidate.id, 'Pending')} className="text-xs text-slate-400 hover:text-slate-600 underline ml-2">Undo</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
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
