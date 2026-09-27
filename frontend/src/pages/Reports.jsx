import React, { useState } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { FileText, Download, Shield } from 'lucide-react';

export default function Reports() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (type) => {
    setGenerating(true);
    try {
      if (type === 'qa-summary') {
        const res = await api.get('/reports/qa-summary');
        const data = res.data.data;
        
        // Simple CSV generation
        const csv = `QA Summary Report\nGenerated,${new Date().toLocaleString()}\n\nMetric,Value\nTotal Requirements,${data.requirements}\nTotal Test Cases,${data.test_cases}\nTests Executed,${data.executed}\nTests Passed,${data.passed}\nAverage Quality Score,${data.average_quality}\nDuplicates Flagged,${data.duplicates_flagged}`;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'qa_summary_report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert('This report is queued for implementation.');
      }
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Download simple, factual CSV exports of your testing data.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4"><Shield className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">QA Summary</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">Overall QA status and coverage. Contains total requirements, test cases, and high-level execution stats.</p>
            <button onClick={() => handleGenerate('qa-summary')} disabled={generating} className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              <Download className="w-4 h-4" /> {generating ? 'Generating...' : 'Export CSV'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full opacity-60">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Execution Report</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">Test execution results, including passed, failed, and blocked status for all tracked test cases.</p>
            <button onClick={() => handleGenerate('execution')} disabled={generating} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-500 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full opacity-60">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Test Quality</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">Quality evaluation results for AI-generated test cases, including completeness and clarity scores.</p>
            <button onClick={() => handleGenerate('quality')} disabled={generating} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-500 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
