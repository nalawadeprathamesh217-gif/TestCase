import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ImportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [importData, setImportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [working, setWorking] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [validationData, setValidationData] = useState({ valid: 0, invalid: 0, warnings: 0, total: 0 });
  const [importResultData, setImportResultData] = useState({ imported: 0, failed: 0 });
  const [previewRows, setPreviewRows] = useState([]);

  const fetchImport = async () => {
    try {
      const res = await api.get(`/test-case-imports/${id}`);
      setImportData(res.data.data);
      if (res.data.data.status === 'completed') setStep(4);
      
      if (res.data.data.status === 'uploaded') {
        const analyzeRes = await api.post(`/test-case-imports/${id}/analyze`);
        setMappings(analyzeRes.data.data.mappings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImport(); }, [id]);

  const updateMapping = (idx, target) => {
    const newMappings = [...mappings];
    newMappings[idx].target = target;
    setMappings(newMappings);
  };

  const handleNextStep = async () => {
    setWorking(true);
    try {
      if (step === 1) {
        // Save mappings
        await api.post(`/test-case-imports/${id}/mapping`, { mappings });
        
        // Validate rows
        const valRes = await api.post(`/test-case-imports/${id}/validate`);
        
        // Get Preview
        const previewRes = await api.get(`/test-case-imports/${id}/preview`);
        setPreviewRows(previewRes.data.data || []);
        
        setValidationData({
          valid: valRes.data.data.valid,
          invalid: valRes.data.data.invalid,
          warnings: valRes.data.data.warnings,
          total: valRes.data.data.valid + valRes.data.data.invalid
        });
        
        setStep(3); // Skip step 2 (loading state) since we did it inline
      } else if (step === 3) {
        // Import
        await api.post(`/test-case-imports/${id}/duplicates`); // Process duplicates (optional if handled in import, but we'll call it to set status)
        const impRes = await api.post(`/test-case-imports/${id}/import`);
        setImportResultData(impRes.data.data);
        setStep(4);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <AppLayout><div className="text-center py-20">Loading...</div></AppLayout>;
  if (!importData) return <AppLayout><div className="text-center py-20">Import not found.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/imports')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Import: {importData.file_name}</h1>
            <p className="text-slate-500 text-sm">Status: <span className="uppercase font-semibold">{importData.status}</span></p>
          </div>
        </div>

        {/* Wizard Progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 flex justify-between items-center">
          {['Mapping', 'Validation', 'Preview', 'Complete'].map((label, idx) => (
            <div key={label} className={`flex items-center gap-2 ${idx + 1 <= step ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx + 1 === step ? 'bg-blue-600 text-white' : idx + 1 < step ? 'bg-blue-100 text-blue-600' : 'bg-slate-100'}`}>
                {idx + 1 < step ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${idx + 1 === step ? 'text-slate-800' : ''}`}>{label}</span>
              {idx < 3 && <div className={`w-10 h-0.5 ml-4 ${idx + 1 < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          {step === 1 && (
            <div className="p-6 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Column Mapping</h3>
              <p className="text-sm text-slate-600 mb-6">We've automatically mapped columns from your file. Please review and correct them.</p>
              
              <table className="w-full text-sm text-left text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Source Column</th>
                    <th className="py-3 px-4">Sample Value</th>
                    <th className="py-3 px-4">Target Field</th>
                    <th className="py-3 px-4 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappings.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{m.source}</td>
                      <td className="py-3 px-4 text-slate-500 italic">"{m.sample}"</td>
                      <td className="py-3 px-4">
                        <select 
                          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full outline-none focus:border-blue-500 bg-white" 
                          value={m.target}
                          onChange={(e) => updateMapping(i, e.target.value)}
                        >
                          <option value="Test Case ID">Test Case ID</option>
                          <option value="Requirement ID">Requirement ID</option>
                          <option value="Title">Title</option>
                          <option value="Description">Description</option>
                          <option value="Test Steps">Test Steps</option>
                          <option value="Expected Result">Expected Result</option>
                          <option value="Priority">Priority</option>
                          <option value="Test Type">Test Type</option>
                          <option value="Ignore">Ignore</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.type === 'auto' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{m.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-16 h-16 text-blue-500 mb-4 animate-spin-slow" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Validating Rows...</h3>
              <p className="text-slate-500 max-w-md">Checking required fields, enums, and data types for all imported rows. This may take a moment for large files.</p>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 flex-1">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Import Preview</h3>
              <div className="flex gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg flex-1 border border-slate-200">
                  <div className="text-2xl font-bold text-slate-800">{validationData.total}</div><div className="text-sm text-slate-500">Total Rows</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg flex-1 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{validationData.valid}</div><div className="text-sm text-green-600">Valid</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg flex-1 border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{validationData.invalid}</div><div className="text-sm text-red-600">Invalid</div>
                </div>
              </div>

              {previewRows.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Title</th>
                        <th className="py-2 px-3">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 px-3 text-slate-500">{row.row_number}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.validation_status === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {row.validation_status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{row.mapped_data?.Title || '-'}</td>
                          <td className="py-2 px-3 text-red-600 text-xs">
                            {row.validation_errors?.map((err, idx) => (
                              <div key={idx}>{err.message}</div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Import Complete!</h3>
              <p className="text-slate-500 mb-6">Successfully imported {importResultData.imported} test cases from {importData.file_name}.</p>
              {importResultData.failed > 0 && (
                <p className="text-red-500 mb-6">{importResultData.failed} records failed to import.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => navigate('/test-cases')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">View Test Cases</button>
                <button onClick={() => navigate('/imports')} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Back to Imports</button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          {step < 4 && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
              <button 
                onClick={handleNextStep} 
                disabled={working || (step === 3 && validationData.valid === 0)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {working ? 'Processing...' : step === 3 ? 'Import Valid Records' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
