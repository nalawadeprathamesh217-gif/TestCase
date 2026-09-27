import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, Info,
  Tag, AlertTriangle, FileText, Loader2,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES   = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Archived'];

// Fields the user may edit
const EDITABLE_FIELDS = [
  'requirement_id', 'title', 'description', 'actor',
  'preconditions', 'business_rules', 'acceptance_criteria',
  'priority', 'status',
];

// Status colours
const STATUS_COLORS = {
  Draft:         'bg-slate-100 text-slate-600',
  'Under Review':'bg-amber-100 text-amber-700',
  Approved:      'bg-green-100 text-green-700',
  Rejected:      'bg-red-100 text-red-700',
  Archived:      'bg-slate-100 text-slate-400',
};

const PRIORITY_COLORS = {
  Critical: 'bg-red-100 text-red-800',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  Low:      'bg-blue-100 text-blue-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k] ?? '';
  return out;
}

function hasChanged(original, current) {
  return EDITABLE_FIELDS.some(f => original[f] !== current[f]);
}

// ── Approve-change confirmation modal ─────────────────────────────────────────
function ApproveWarningModal({ onContinue, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Editing an Approved Requirement</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          This requirement is currently <strong>Approved</strong>. Changing its content may affect
          existing test cases, coverage reports, and AI generation results that depend on it.
          <br /><br />
          Do you want to continue editing?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Discard confirmation modal ────────────────────────────────────────────────
function DiscardModal({ onDiscard, onKeep }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Discard unsaved changes?</h2>
        <p className="text-sm text-slate-500 mb-6">Your edits will be lost if you leave now.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onKeep}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Keep Editing
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form Field components ─────────────────────────────────────────────────────
function FormField({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full border rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
    err ? 'border-red-300 focus:ring-red-300' : 'border-slate-300 focus:ring-indigo-400 focus:border-indigo-400'
  }`;

// ── Main Edit Page ────────────────────────────────────────────────────────────
export default function RequirementEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [original, setOriginal] = useState(null);   // raw DB row
  const [form, setForm]         = useState(null);   // current edited state
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [pageError, setPageError]  = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [showApproveWarning, setShowApproveWarning] = useState(false);
  const [showDiscardModal, setShowDiscardModal]     = useState(false);
  const [approvedWarningShown, setApprovedWarningShown] = useState(false);

  // ── Fetch requirement ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/requirements/${id}`);
        const req = res.data.data;
        setOriginal(req);
        setForm(pick(req, EDITABLE_FIELDS));
      } catch (err) {
        setPageError(err.response?.data?.message || 'Failed to load requirement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Dirty flag ──────────────────────────────────────────────────────────
  const isDirty = original && form ? hasChanged(pick(original, EDITABLE_FIELDS), form) : false;

  // ── Field change handler ─────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
    setSuccessMsg('');

    // Warn once when editing an Approved requirement (any field change)
    if (
      original?.status === 'Approved' &&
      !approvedWarningShown &&
      !showApproveWarning
    ) {
      setShowApproveWarning(true);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!form.requirement_id?.trim()) errors.requirement_id = 'Requirement ID is required';
    if (!form.title?.trim())          errors.title = 'Title is required';
    if (!form.description?.trim())    errors.description = 'Description is required';
    if (!PRIORITIES.includes(form.priority)) errors.priority = 'Select a valid priority';
    if (!STATUSES.includes(form.status))     errors.status = 'Select a valid status';
    return errors;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setPageError('');
    setSuccessMsg('');

    try {
      // PUT /api/requirements/:id — backend only applies whitelisted editable fields;
      // source traceability fields are never overwritten.
      await api.put(`/requirements/${id}`, form);
      setSuccessMsg('Requirement updated successfully.');

      // Navigate to detail page after a short pause so the message is visible
      setTimeout(() => navigate(`/requirements/${id}`), 1200);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel ───────────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      navigate(`/requirements/${id}`);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading requirement...
        </div>
      </AppLayout>
    );
  }

  if (pageError && !form) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-10">
          <Link to="/requirements" className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-medium mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Requirements
          </Link>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {pageError}
          </div>
        </div>
      </AppLayout>
    );
  }

  const hasSourceId = !!original?.source_reference;
  const isApproved  = original?.status === 'Approved';

  return (
    <AppLayout>
      {/* Approve-change warning modal */}
      {showApproveWarning && (
        <ApproveWarningModal
          onContinue={() => {
            setShowApproveWarning(false);
            setApprovedWarningShown(true);
          }}
          onCancel={() => {
            setShowApproveWarning(false);
            // Revert the last change by re-reading original
            setForm(pick(original, EDITABLE_FIELDS));
          }}
        />
      )}

      {/* Discard changes modal */}
      {showDiscardModal && (
        <DiscardModal
          onDiscard={() => navigate(`/requirements/${id}`)}
          onKeep={() => setShowDiscardModal(false)}
        />
      )}

      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/requirements" className="hover:text-slate-800 transition-colors">Requirements</Link>
          <span>/</span>
          <Link to={`/requirements/${id}`} className="hover:text-slate-800 transition-colors font-mono">
            {original?.requirement_id}
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Edit</span>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Requirement</h1>
            <p className="text-slate-500 text-sm mt-1">
              Changes are saved to the database immediately on save.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        </div>

        {/* Approved warning banner (persistent reminder) */}
        {isApproved && approvedWarningShown && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              You are editing an <strong>Approved</strong> requirement. Saving changes may affect existing test cases.
            </p>
          </div>
        )}

        {/* Success banner */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <span className="text-sm text-green-800 font-medium">{successMsg}</span>
          </div>
        )}

        {/* General error */}
        {pageError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{pageError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Main card ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">

            {/* Source traceability info bar */}
            {(hasSourceId || original?.source_document_id) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex flex-wrap items-center gap-3 text-xs text-indigo-700">
                <Info className="w-4 h-4 shrink-0" />
                <span className="font-semibold">Source Traceability (read-only):</span>
                {original?.source_reference && (
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                    <Tag className="w-3 h-3 inline mr-1" />{original.source_reference}
                  </span>
                )}
                {original?.source_document_id && (
                  <Link
                    to={`/requirement-documents/${original.source_document_id}`}
                    className="flex items-center gap-1 underline hover:text-indigo-900"
                  >
                    <FileText className="w-3 h-3" /> Source Document
                  </Link>
                )}
              </div>
            )}

            {/* Row 1: Requirement ID + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Requirement ID"
                required
                error={formErrors.requirement_id}
                hint={hasSourceId ? 'Preserve the original source ID when possible' : undefined}
              >
                <input
                  id="requirement_id"
                  type="text"
                  value={form.requirement_id}
                  onChange={e => handleChange('requirement_id', e.target.value)}
                  className={inputCls(formErrors.requirement_id)}
                  placeholder="REQ-AI-005"
                />
              </FormField>

              <FormField label="Status" required error={formErrors.status}>
                <select
                  id="status"
                  value={form.status}
                  onChange={e => handleChange('status', e.target.value)}
                  className={inputCls(formErrors.status)}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Row 2: Title */}
            <FormField label="Title" required error={formErrors.title}>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                className={inputCls(formErrors.title)}
                placeholder="e.g. AI Generation"
              />
            </FormField>

            {/* Row 3: Description */}
            <FormField label="Description" required error={formErrors.description}>
              <textarea
                id="description"
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                rows={5}
                className={inputCls(formErrors.description)}
                placeholder="The system shall..."
              />
            </FormField>

            {/* Row 4: Actor + Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Actor" error={formErrors.actor}>
                <input
                  id="actor"
                  type="text"
                  value={form.actor}
                  onChange={e => handleChange('actor', e.target.value)}
                  className={inputCls(formErrors.actor)}
                  placeholder="e.g. Test Manager"
                />
              </FormField>

              <FormField label="Priority" required error={formErrors.priority}>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={e => handleChange('priority', e.target.value)}
                  className={inputCls(formErrors.priority)}
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Row 5: Preconditions */}
            <FormField label="Preconditions" error={formErrors.preconditions}>
              <textarea
                id="preconditions"
                value={form.preconditions}
                onChange={e => handleChange('preconditions', e.target.value)}
                rows={2}
                className={inputCls(formErrors.preconditions)}
                placeholder="Conditions that must be true before this requirement applies..."
              />
            </FormField>

            {/* Row 6: Business Rules */}
            <FormField label="Business Rules" error={formErrors.business_rules}>
              <textarea
                id="business_rules"
                value={form.business_rules}
                onChange={e => handleChange('business_rules', e.target.value)}
                rows={2}
                className={inputCls(formErrors.business_rules)}
                placeholder="Specific business rules or constraints..."
              />
            </FormField>

            {/* Row 7: Acceptance Criteria */}
            <FormField label="Acceptance Criteria" error={formErrors.acceptance_criteria}>
              <textarea
                id="acceptance_criteria"
                value={form.acceptance_criteria}
                onChange={e => handleChange('acceptance_criteria', e.target.value)}
                rows={3}
                className={inputCls(formErrors.acceptance_criteria)}
                placeholder="Conditions under which this requirement is considered fulfilled..."
              />
            </FormField>
          </div>

          {/* ── Action Bar ── */}
          <div className="flex items-center justify-between mt-5 py-4 border-t border-slate-200">
            {/* Left: unsaved indicator */}
            <div className="text-sm text-slate-400">
              {isDirty ? (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                  No changes
                </span>
              )}
            </div>

            {/* Right: Cancel + Save */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
