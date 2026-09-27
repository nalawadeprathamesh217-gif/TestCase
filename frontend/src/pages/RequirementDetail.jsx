import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { ArrowLeft, FileText, FlaskConical, Sparkles, Calendar, User, Edit2 } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const colors = { 'Draft': 'bg-slate-100 text-slate-600', 'Under Review': 'bg-amber-100 text-amber-700', 'Approved': 'bg-green-100 text-green-700', 'Rejected': 'bg-red-100 text-red-700', 'Archived': 'bg-slate-100 text-slate-400' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
};

export default function RequirementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reqRes, tcRes] = await Promise.all([
          api.get(`/requirements/${id}`),
          api.get(`/test-cases?requirement_id=${id}`),
        ]);
        setRequirement(reqRes.data.data);
        setTestCases(tcRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <AppLayout><div className="text-center py-20 text-slate-400">Loading...</div></AppLayout>;
  if (!requirement) return <AppLayout><div className="text-center py-20 text-slate-500">Requirement not found.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/requirements')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
          <div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Requirement Details</h1>
            <p className="text-slate-500 text-sm mt-1">Review the requirement and its source before creating test cases.</p>
          </div>
          <Link
            to={`/requirements/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Detail */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <StatusBadge status={requirement.status} />
                <span className="text-sm text-slate-500">Priority: <strong>{requirement.priority}</strong></span>
              </div>
              {[
                { label: 'Description', value: requirement.description },
                { label: 'Actor', value: requirement.actor },
                { label: 'Preconditions', value: requirement.preconditions },
                { label: 'Business Rules', value: requirement.business_rules },
                { label: 'Acceptance Criteria', value: requirement.acceptance_criteria },
              ].map(field => field.value && (
                <div key={field.label} className="mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{field.label}</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600"><User className="w-4 h-4 text-slate-400" /> {requirement.actor || 'N/A'}</div>
                <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(requirement.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Related Test Cases</h3>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{testCases.length}</span>
              </div>
              {testCases.length === 0 ? (
                <p className="text-sm text-slate-400">No test cases yet.</p>
              ) : (
                <div className="space-y-2">
                  {testCases.map(tc => (
                    <Link key={tc.id} to={`/test-cases/${tc.id}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                      <FlaskConical className="w-3 h-3" />{tc.test_case_id} — {tc.title}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-slate-100 pt-4">
                {requirement.status === 'Approved' ? (
                  <>
                    <p className="text-[10px] text-slate-500 mb-3 text-center leading-relaxed">
                      Create AI-generated test case suggestions from this approved requirement. You can review, edit, accept, or reject each suggestion.
                    </p>
                    <Link to={`/requirements/${id}/generate`} className="flex items-center justify-center gap-2 w-full p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors shadow-sm">
                      <Sparkles className="w-4 h-4" />
                      Generate AI Test Cases
                    </Link>
                  </>
                ) : (
                  <div className="text-center bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-800">Approve this requirement before generating AI test cases.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
