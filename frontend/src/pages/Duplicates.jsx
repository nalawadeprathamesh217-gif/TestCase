import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Copy, AlertTriangle, Check, X, ArrowRight } from 'lucide-react';

export default function Duplicates() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/duplicates/queue');
      setQueue(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async (id, status) => {
    setReviewingId(id);
    try {
      await api.put(`/duplicates/${id}/review`, { status, comment: 'Reviewed via UI' });
      setQueue(queue.filter(q => q.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewingId(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.95) return 'text-red-600 bg-red-100';
    if (score >= 0.85) return 'text-orange-600 bg-orange-100';
    return 'text-amber-600 bg-amber-100';
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Duplicate Review Queue</h1>
          <p className="text-slate-500 text-sm mt-1">Find and merge similar test cases using AI.</p>
        </div>

        {/* Workflow Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-2">How it works:</p>
          <p>AI compares new test cases against existing ones to prevent duplicates. Review the suggestions below and decide whether they are duplicates or unique tests.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading queue...</div>
        ) : queue.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-20 text-center">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">All caught up!</h3>
            <p className="text-slate-500 mt-1">There are no pending duplicates to review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {queue.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <span className="font-semibold text-slate-700">Potential Duplicate Detected</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreColor(item.similarity_score)}`}>
                    {(item.similarity_score * 100).toFixed(1)}% Match
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-full items-center justify-center border border-slate-200 z-10">
                    <Copy className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* New Test Case */}
                  <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">New Test Case</div>
                    {item.new_test_case ? (
                      <>
                        <Link to={`/test-cases/${item.new_test_case.id}`} className="font-semibold text-slate-800 hover:text-blue-600 block mb-2">
                          {item.new_test_case.test_case_id} — {item.new_test_case.title}
                        </Link>
                        <p className="text-sm text-slate-600">{item.new_test_case.description}</p>
                      </>
                    ) : (
                      <span className="text-slate-500 text-sm italic">Test case data unavailable</span>
                    )}
                  </div>

                  {/* Existing Test Case */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Existing Test Case</div>
                    {item.existing_test_case ? (
                      <>
                        <Link to={`/test-cases/${item.existing_test_case.id}`} className="font-semibold text-slate-800 hover:text-blue-600 block mb-2">
                          {item.existing_test_case.test_case_id} — {item.existing_test_case.title}
                        </Link>
                        <p className="text-sm text-slate-600">{item.existing_test_case.description}</p>
                      </>
                    ) : (
                      <span className="text-slate-500 text-sm italic">Test case data unavailable</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex justify-end gap-3">
                  <button 
                    onClick={() => handleReview(item.id, 'not_duplicate')}
                    disabled={reviewingId === item.id}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    <Check className="w-4 h-4 text-green-500" /> Not a Duplicate
                  </button>
                  <button 
                    onClick={() => handleReview(item.id, 'confirmed_duplicate')}
                    disabled={reviewingId === item.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" /> Confirm Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
