import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import {
  ArrowLeft, Save, AlertCircle, Loader2
} from 'lucide-react';

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES   = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Archived'];

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

export default function RequirementCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    requirement_id: '',
    title: '',
    description: '',
    actor: '',
    preconditions: '',
    business_rules: '',
    acceptance_criteria: '',
    priority: 'Medium',
    status: 'Draft',
  });
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.requirement_id?.trim()) errors.requirement_id = 'Requirement ID is required';
    if (!form.title?.trim())          errors.title = 'Title is required';
    if (!form.description?.trim())    errors.description = 'Description is required';
    if (!PRIORITIES.includes(form.priority)) errors.priority = 'Select a valid priority';
    if (!STATUSES.includes(form.status))     errors.status = 'Select a valid status';
    return errors;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setPageError('');

    try {
      const res = await api.post(`/requirements`, form);
      const newReq = res.data.data;
      navigate(`/requirements/${newReq.id}`);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Could not create the requirement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/requirements');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/requirements" className="hover:text-slate-800 transition-colors">Requirements</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">New</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Requirement</h1>
            <p className="text-slate-500 text-sm mt-1">
              Describe what your software needs to do.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        </div>

        {pageError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{pageError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Requirement ID"
                required
                error={formErrors.requirement_id}
                hint="Unique identifier, for example REQ-AUTH-001"
              >
                <input
                  id="requirement_id"
                  type="text"
                  value={form.requirement_id}
                  onChange={e => handleChange('requirement_id', e.target.value)}
                  className={inputCls(formErrors.requirement_id)}
                  placeholder="REQ-001"
                />
              </FormField>

              <FormField label="Status" required error={formErrors.status} hint="Current review state of this requirement.">
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

            <FormField label="Title" required error={formErrors.title} hint="Short name describing what the system must do.">
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                className={inputCls(formErrors.title)}
                placeholder="e.g. User Authentication"
              />
            </FormField>

            <FormField label="Description" required error={formErrors.description} hint="Describe the required system behavior.">
              <textarea
                id="description"
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                rows={5}
                className={inputCls(formErrors.description)}
                placeholder="The system shall..."
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Actor" error={formErrors.actor} hint="Who performs or uses this functionality?">
                <input
                  id="actor"
                  type="text"
                  value={form.actor}
                  onChange={e => handleChange('actor', e.target.value)}
                  className={inputCls(formErrors.actor)}
                  placeholder="e.g. End User"
                />
              </FormField>

              <FormField label="Priority" required error={formErrors.priority} hint="How important is this requirement?">
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

            <FormField label="Preconditions" error={formErrors.preconditions} hint="What must already be true before this requirement can be used?">
              <textarea
                id="preconditions"
                value={form.preconditions}
                onChange={e => handleChange('preconditions', e.target.value)}
                rows={2}
                className={inputCls(formErrors.preconditions)}
                placeholder="Conditions that must be true..."
              />
            </FormField>

            <FormField label="Business Rules" error={formErrors.business_rules} hint="Rules the system must follow.">
              <textarea
                id="business_rules"
                value={form.business_rules}
                onChange={e => handleChange('business_rules', e.target.value)}
                rows={2}
                className={inputCls(formErrors.business_rules)}
                placeholder="Specific business rules or constraints..."
              />
            </FormField>

            <FormField label="Acceptance Criteria" error={formErrors.acceptance_criteria} hint="How will we know this requirement is satisfied?">
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

          <div className="flex items-center justify-end mt-5 py-4 border-t border-slate-200 gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <><Save className="w-4 h-4" /> Create Requirement</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
