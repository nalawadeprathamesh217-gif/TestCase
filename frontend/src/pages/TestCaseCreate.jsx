import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import {
  ArrowLeft, Save, AlertCircle, Loader2, Plus, Trash2, GripVertical
} from 'lucide-react';

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const RISKS = ['High', 'Medium', 'Low'];
const TEST_TYPES = ['Functional', 'Negative', 'Validation', 'Boundary', 'Integration', 'Regression', 'Security', 'Performance', 'Other'];
const STATUSES = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Obsolete'];

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

export default function TestCaseCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    test_case_id: '',
    requirement_id: '',
    title: '',
    description: '',
    preconditions: '',
    expected_result: '',
    test_type: 'Functional',
    priority: 'Medium',
    risk: 'Medium',
    status: 'Draft',
  });
  const [steps, setSteps] = useState(['']);
  
  const [requirements, setRequirements] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchReqs = async () => {
      try {
        const res = await api.get('/requirements');
        // If paginated, res.data.data may contain requirements, or it may be res.data.data.items
        const reqs = res.data.data?.items || res.data.data || [];
        setRequirements(reqs);
      } catch (err) {
        setPageError('Failed to load requirements. You can still create a test case, but linking may not work.');
      } finally {
        setLoadingReqs(false);
      }
    };
    fetchReqs();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const addStep = () => {
    setSteps([...steps, '']);
  };

  const removeStep = (index) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index);
      setSteps(newSteps);
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.test_case_id?.trim())    errors.test_case_id = 'Test Case ID is required';
    if (!form.title?.trim())           errors.title = 'Title is required';
    if (!form.description?.trim())     errors.description = 'Description is required';
    if (!form.requirement_id)          errors.requirement_id = 'Requirement selection is required';
    if (!form.expected_result?.trim()) errors.expected_result = 'Expected result is required';
    if (!TEST_TYPES.includes(form.test_type)) errors.test_type = 'Select a valid test type';
    if (!PRIORITIES.includes(form.priority))  errors.priority = 'Select a valid priority';
    if (!RISKS.includes(form.risk))           errors.risk = 'Select a valid risk';
    if (!STATUSES.includes(form.status))      errors.status = 'Select a valid status';
    
    // Check steps
    const validSteps = steps.filter(s => s.trim() !== '');
    if (validSteps.length === 0) {
      errors.steps = 'At least one test step is required';
    }
    
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
      const validSteps = steps.filter(s => s.trim() !== '');
      const testStepsStr = JSON.stringify(validSteps);
      
      const payload = {
        ...form,
        test_steps: testStepsStr,
      };

      const res = await api.post(`/test-cases`, payload);
      const newTc = res.data.data;
      navigate(`/test-cases/${newTc.id}`);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Could not create the test case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/test-cases');
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/test-cases" className="hover:text-slate-800 transition-colors">Test Cases</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">New</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Test Case</h1>
            <p className="text-slate-500 text-sm mt-1">
              Create a step-by-step test that verifies a requirement.
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            
            {/* ID, Requirement, Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Test Case ID" required error={formErrors.test_case_id} hint="Unique identifier (e.g. TC-001)">
                <input
                  id="test_case_id"
                  type="text"
                  value={form.test_case_id}
                  onChange={e => handleChange('test_case_id', e.target.value)}
                  className={inputCls(formErrors.test_case_id)}
                  placeholder="TC-001"
                />
              </FormField>

              <FormField label="Requirement" required error={formErrors.requirement_id} hint="Link to an existing requirement">
                {loadingReqs ? (
                  <div className="text-sm text-slate-500 py-2 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading requirements...</div>
                ) : requirements.length === 0 ? (
                  <div className="text-sm text-amber-600 py-2">No requirements available. <Link to="/requirements/new" className="underline font-medium">Create a requirement first.</Link></div>
                ) : (
                  <select
                    id="requirement_id"
                    value={form.requirement_id}
                    onChange={e => handleChange('requirement_id', e.target.value)}
                    className={inputCls(formErrors.requirement_id)}
                  >
                    <option value="">[ Select requirement... ]</option>
                    {requirements.map(req => (
                      <option key={req.id} value={req.id}>
                        {req.requirement_id} — {req.title}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <FormField label="Title" required error={formErrors.title} hint="Short descriptive name for this test scenario.">
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                className={inputCls(formErrors.title)}
                placeholder="e.g. Verify login with valid credentials"
              />
            </FormField>

            <FormField label="Description" required error={formErrors.description} hint="What is being tested and why?">
              <textarea
                id="description"
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                rows={3}
                className={inputCls(formErrors.description)}
                placeholder="This test case verifies that..."
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Test Type" required error={formErrors.test_type}>
                <select
                  value={form.test_type}
                  onChange={e => handleChange('test_type', e.target.value)}
                  className={inputCls(formErrors.test_type)}
                >
                  {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              
              <FormField label="Priority" required error={formErrors.priority}>
                <select
                  value={form.priority}
                  onChange={e => handleChange('priority', e.target.value)}
                  className={inputCls(formErrors.priority)}
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              
              <FormField label="Risk" required error={formErrors.risk}>
                <select
                  value={form.risk}
                  onChange={e => handleChange('risk', e.target.value)}
                  className={inputCls(formErrors.risk)}
                >
                  {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormField>
              
              <FormField label="Status" required error={formErrors.status}>
                <select
                  value={form.status}
                  onChange={e => handleChange('status', e.target.value)}
                  className={inputCls(formErrors.status)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Preconditions" error={formErrors.preconditions} hint="State of the system required before starting the test.">
              <textarea
                id="preconditions"
                value={form.preconditions}
                onChange={e => handleChange('preconditions', e.target.value)}
                rows={2}
                className={inputCls(formErrors.preconditions)}
                placeholder="e.g. User is logged in as Admin"
              />
            </FormField>

            {/* Test Steps section */}
            <div>
              <div className="flex flex-col mb-2">
                <label className="block text-sm font-medium text-slate-700">Test Steps<span className="text-red-500 ml-0.5">*</span></label>
                <p className="text-xs text-slate-400 mt-1">Add the actions the tester should perform.</p>
              </div>
              
              {formErrors.steps && <p className="text-xs text-red-500 mb-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{formErrors.steps}</p>}
              
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100 mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-grow">
                      <textarea
                        value={step}
                        onChange={(e) => handleStepChange(index, e.target.value)}
                        className={`${inputCls()} resize-y`}
                        rows={2}
                        placeholder="Enter test step instructions..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      disabled={steps.length <= 1}
                      className="flex-shrink-0 mt-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      title="Remove step"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addStep}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>

            <FormField label="Expected Result" required error={formErrors.expected_result} hint="What should happen if the system works correctly?">
              <textarea
                id="expected_result"
                value={form.expected_result}
                onChange={e => handleChange('expected_result', e.target.value)}
                rows={3}
                className={inputCls(formErrors.expected_result)}
                placeholder="e.g. The dashboard loads successfully showing correct user data."
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
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <><Save className="w-4 h-4" /> Create Test Case</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
