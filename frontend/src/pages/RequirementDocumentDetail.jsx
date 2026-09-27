import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import {
  FileText, CheckCircle, XCircle, Clock, RefreshCw, ChevronLeft,
  AlertTriangle, Tag, Edit2, ThumbsUp, ThumbsDown, Info, BarChart2
} from 'lucide-react';

// ── Status Badge ──────────────────────────────────────────────────────────────
const DocStatusBadge = ({ status }) => {
  const cfg = {
    UPLOADED:   { cls: 'bg-slate-100 text-slate-600',   icon: Clock },
    PROCESSING: { cls: 'bg-blue-100 text-blue-700',     icon: RefreshCw },
    PROCESSED:  { cls: 'bg-green-100 text-green-700',   icon: CheckCircle },
    FAILED:     { cls: 'bg-red-100 text-red-700',       icon: XCircle },
  };
  const { cls, icon: Icon } = cfg[status] || cfg['UPLOADED'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
};

// ── Requirement Status Badge ──────────────────────────────────────────────────
const ReqStatusBadge = ({ status }) => {
  const colors = {
    Draft:        'bg-slate-100 text-slate-600 border border-slate-300',
    'Under Review':'bg-amber-100 text-amber-700 border border-amber-300',
    Approved:     'bg-green-100 text-green-700 border border-green-300',
    Rejected:     'bg-red-100 text-red-700 border border-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || colors.Draft}`}>
      {status || 'Draft'}
    </span>
  );
};

// ── Priority Badge ────────────────────────────────────────────────────────────
const PriorityBadge = ({ priority }) => {
  const colors = {
    High:     'bg-red-50 text-red-700 border border-red-200',
    Medium:   'bg-amber-50 text-amber-700 border border-amber-200',
    Low:      'bg-blue-50 text-blue-600 border border-blue-200',
    Critical: 'bg-red-100 text-red-800 border border-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.Medium}`}>
      {priority || 'Medium'}
    </span>
  );
};

// ── Individual Requirement Card ───────────────────────────────────────────────
function RequirementCard({ req, onStatusChange }) {
  const [updating, setUpdating] = useState(false);

  const changeStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/requirements/${req.id}`, { status: newStatus });
      onStatusChange(req.id, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdating(false);
    }
  };

  const hasSourceId = !!req.source_reference;

  return (
    <div className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
      req.status === 'Approved' ? 'border-green-200' :
      req.status === 'Rejected' ? 'border-red-200' :
      'border-slate-200'
    }`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1">
          {/* Requirement ID */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {req.requirement_id}
            </span>
            {hasSourceId ? (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                <Tag className="w-3 h-3" /> Source ID preserved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <Tag className="w-3 h-3" /> Generated ID
              </span>
            )}
          </div>
          {/* Title */}
          <h3 className="text-base font-semibold text-slate-800 leading-snug">
            <Link to={`/requirements/${req.id}`} className="hover:text-indigo-600 transition-colors">
              {req.title}
            </Link>
          </h3>
        </div>
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <PriorityBadge priority={req.priority} />
          <ReqStatusBadge status={req.status} />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 mb-4">
        {req.description}
      </p>

      {/* Traceability row */}
      {req.source_reference && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <Info className="w-3 h-3 shrink-0" />
          <span>Source reference: <span className="font-mono text-slate-600">{req.source_reference}</span></span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <Link
          to={`/requirements/${req.id}/edit`}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </Link>

        {req.status !== 'Approved' && (
          <button
            onClick={() => changeStatus('Approved')}
            disabled={updating}
            className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 px-3 py-1.5 rounded-lg border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50"
          >
            <ThumbsUp className="w-3 h-3" /> Approve
          </button>
        )}

        {req.status !== 'Rejected' && (
          <button
            onClick={() => changeStatus('Rejected')}
            disabled={updating}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50"
          >
            <ThumbsDown className="w-3 h-3" /> Reject
          </button>
        )}

        {(req.status === 'Approved' || req.status === 'Rejected') && (
          <button
            onClick={() => changeStatus('Draft')}
            disabled={updating}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Reset to Draft
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RequirementDocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchDocument = async () => {
    try {
      const res = await api.get(`/requirement-documents/${id}`);
      setDoc(res.data.data);
      const reqRes = await api.get('/requirements');
      if (reqRes.data?.data) {
        const filtered = reqRes.data.data.filter(r => r.source_document_id === id);
        setRequirements(filtered);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocument(); }, [id]);

  const handleProcess = async () => {
    setProcessing(true);
    setError('');
    setProcessResult(null);
    setDoc(prev => ({ ...prev, processing_status: 'PROCESSING' }));
    try {
      const res = await api.post(`/requirement-documents/${id}/process`);
      if (res.data?.data) setProcessResult(res.data.data);
      await fetchDocument();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process document.');
      await fetchDocument();
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = (reqId, newStatus) => {
    setRequirements(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
  };

  // Stats from current requirements list
  const stats = {
    total: requirements.length,
    withSourceId: requirements.filter(r => r.source_reference).length,
    draft: requirements.filter(r => r.status === 'Draft').length,
    approved: requirements.filter(r => r.status === 'Approved').length,
    rejected: requirements.filter(r => r.status === 'Rejected').length,
  };

  const visibleRequirements = filterStatus === 'All'
    ? requirements
    : requirements.filter(r => r.status === filterStatus);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-slate-500">Loading document...</div>
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-10">
          <Link to="/requirement-documents" className="text-blue-600 hover:underline flex items-center gap-1 mb-6">
            <ChevronLeft className="w-4 h-4" /> Back to Documents
          </Link>
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Document not found or you don't have access.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <Link to="/requirement-documents" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-6 text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Documents
        </Link>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}

        {/* Document Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 break-all">{doc.original_file_name || doc.file_name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                  <span>Type: {doc.file_type?.toUpperCase()}</span>
                  <span>•</span>
                  <span>Size: {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}</span>
                  <span>•</span>
                  <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <DocStatusBadge status={doc.processing_status} />
                </div>
              </div>
            </div>

            <div className="shrink-0">
              {(doc.processing_status === 'UPLOADED' || doc.processing_status === 'FAILED') && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className={`${doc.processing_status === 'FAILED' ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-5 py-2 rounded-lg font-medium disabled:opacity-60 flex items-center gap-2 transition-colors`}
                >
                  {processing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> :
                    doc.processing_status === 'FAILED' ? 'Retry Processing' : 'Process Document'}
                </button>
              )}
              {doc.processing_status === 'PROCESSING' && (
                <button disabled className="bg-blue-100 text-blue-700 px-5 py-2 rounded-lg font-medium flex items-center gap-2 cursor-not-allowed">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing... Please wait.
                </button>
              )}
              {doc.processing_status === 'PROCESSED' && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="bg-white border border-slate-300 text-slate-700 px-5 py-2 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-60 flex items-center gap-2 transition-colors"
                >
                  {processing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Re-processing...</> : <><RefreshCw className="w-4 h-4" /> Re-process</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Extraction Result Banner */}
        {processResult && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
            <BarChart2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="text-sm text-indigo-800">
              <span className="font-semibold">Extraction complete</span> via <span className="font-mono bg-indigo-100 px-1 rounded">{processResult.extractionMethod}</span>
              {' — '}
              <span className="font-semibold">{processResult.extractedCount}</span> requirements found,{' '}
              <span className="text-green-700 font-semibold">{processResult.withExplicitSourceId}</span> with explicit source IDs,{' '}
              <span className="text-amber-700 font-semibold">{processResult.withGeneratedId}</span> with generated IDs.
            </div>
          </div>
        )}

        {/* Extracted Requirements Section */}
        {doc.processing_status === 'PROCESSED' && (
          <div className="mt-2">
            {/* Section Header with Stats */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Extracted Candidate Requirements</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Review each requirement before approving. Requirements are in <span className="font-semibold">Draft</span> status and require explicit approval.
                </p>
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Total: {stats.total}</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  <Tag className="w-3 h-3 inline mr-1" />Source IDs: {stats.withSourceId}
                </span>
                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">Draft: {stats.draft}</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Approved: {stats.approved}</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">Rejected: {stats.rejected}</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
              {['All', 'Draft', 'Approved', 'Rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterStatus === f
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Requirement Cards */}
            {requirements.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No requirements were extracted from this document.</p>
                <p className="text-slate-400 text-sm mt-1">Try re-processing the document.</p>
              </div>
            ) : visibleRequirements.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500">No requirements match the selected filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visibleRequirements.map(req => (
                  <RequirementCard
                    key={req.id}
                    req={req}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
