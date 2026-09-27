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
    try {
      // Mock API call to generation controller
      await api.post(`/requirements/${requirementId}/generate-test-cases`, { count: 3 });
      
      // Simulate AI delay and returning candidates
      setTimeout(() => {
        setCandidates([
          { id: 'c1', title: 'Verify successful login with valid credentials', test_type: 'Functional', priority: 'High', description: 'User should be able to log in when providing correct email and password.', status: 'Pending' },
          { id: 'c2', title: 'Verify error on invalid password', test_type: 'Negative', priority: 'High', description: 'System should reject login attempts with incorrect passwords and show an error message.', status: 'Pending' },
          { id: 'c3', title: 'Verify SQL injection protection on login', test_type: 'Security', priority: 'Critical', description: 'Ensure that login form inputs are sanitized against basic SQL injection payloads.', status: 'Pending' }
        ]);
        setGenerating(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate test cases.');
      setGenerating(false);
    }
  };

  const handleReview = (id, action) => {
    setCandidates(candidates.map(c => c.id === id ? { ...c, status: action } : c));
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
            <h1 className="text-2xl font-bold text-slate-800">AI Generation</h1>
            <p className="text-slate-500 text-sm">Generate test cases for: {requirement?.title}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl p-8 mb-8 text-white shadow-lg flex items-center justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/30 text-blue-100 px-3 py-1 rounded-full text-xs font-medium mb-4 border border-blue-400/30">
              <Sparkles className="w-3 h-3" /> Phase 3 Feature
            </div>
            <h2 className="text-2xl font-bold mb-2">Generate Test Cases with AI</h2>
            <p className="text-blue-100/80 text-sm mb-6">
              Our AI will analyze the requirement, preconditions, and business rules to generate a comprehensive suite of Functional, Negative, and Edge-case scenarios.
            </p>
            <button 
              onClick={handleGenerate} 
              disabled={generating || requirement?.status !== 'Approved'}
              className="bg-white text-indigo-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <><Bot className="w-5 h-5" /> Generate Test Cases</>
              )}
            </button>
            {requirement?.status !== 'Approved' && (
              <p className="text-xs text-red-300 mt-2 mt-2 font-medium">Requirement must be Approved before generation.</p>
            )}
          </div>
          <div className="hidden lg:block opacity-20">
            <Bot className="w-48 h-48" />
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 text-lg mb-4">Review Candidates</h3>
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
                      <button onClick={() => handleReview(candidate.id, 'Rejected')} className="flex items-center gap-1 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => handleReview(candidate.id, 'Accepted')} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                        <Check className="w-4 h-4" /> Accept
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
            
            {candidates.every(c => c.status !== 'Pending') && (
              <div className="mt-6 flex justify-end">
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
                  Save Results to Database
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
