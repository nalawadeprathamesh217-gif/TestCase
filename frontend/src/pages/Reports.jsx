import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { FileText, Download, Shield } from 'lucide-react';

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const [reportStats, setReportStats] = useState({ executions: 0, quality: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [execRes, qualRes] = await Promise.all([
          api.get('/reports/execution'),
          api.get('/reports/quality')
        ]);
        setReportStats({
          executions: execRes.data.data.length,
          quality: qualRes.data.data.length
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleGenerate = async (type) => {
    if (generating) return;
    setGenerating(type);
    try {
      if (type === 'qa-summary') {
        const res = await api.get('/reports/qa-summary');
        const data = res.data?.data;
        if (!data) throw new Error('Invalid response format');
        
        const csv = `QA Summary Report\nGenerated At,${new Date().toLocaleString()}\n\nMetric,Value\nTotal Requirements,${data.requirements}\nTotal Test Cases,${data.test_cases}\nTests Executed,${data.executed}\nTests Passed,${data.passed}\nAverage Quality Score,${data.average_quality}\nDuplicates,${data.duplicates_flagged}`;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qa_summary_report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (type === 'execution') {
        const res = await api.get('/reports/execution');
        const data = res.data?.data;
        if (!data) throw new Error('Invalid response format');
        if (data.length === 0) {
          alert('No execution results yet.');
          return;
        }
        
        const headers = 'Test Case ID,Test Case Title,Requirement,Result,Environment,Browser,Actual Result,Comments,Executed By,Executed At\n';
        const rows = data.map(d => `"${d.test_case_id}","${(d.title || '').replace(/"/g, '""')}","${d.requirement_id}","${d.result}","${d.environment}","${d.browser}","${(d.actual_result || '').replace(/"/g, '""')}","${(d.comments || '').replace(/"/g, '""')}","${d.executed_by}","${d.executed_at}"`).join('\n');
        
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'execution_report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (type === 'quality') {
        const res = await api.get('/reports/quality');
        const data = res.data?.data;
        if (!data) throw new Error('Invalid response format');
        if (data.length === 0) {
          alert('No quality evaluations yet.');
          return;
        }
        
        const headers = 'Test Case ID,Test Case Title,Completeness,Clarity,Relevance,Consistency,Overall Score,Evaluation Method,AI Provider,AI Model,Evaluated At\n';
        const rows = data.map(d => `"${d.test_case_id}","${(d.title || '').replace(/"/g, '""')}","${d.completeness}","${d.clarity}","${d.relevance}","${d.consistency}","${d.overall_score}","${d.evaluation_method}","${d.ai_provider}","${d.ai_model}","${d.evaluated_at}"`).join('\n');
        
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test_quality_report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      // We could show a toast here, but for now just let it complete silently to keep the user on /reports
      console.log('Report downloaded successfully.');
    } catch (err) {
      console.error('[REPORT ERROR]', err);
      alert('Could not generate the report. Please try again. If the problem continues, check the server logs.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-[60vh] text-slate-500">Loading Reports...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Generate test execution, coverage, and AI generation reports.</p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-2">How to use reports:</p>
          <p>Export your testing data as CSV files to share with your team, present to stakeholders, or analyze in Excel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4"><Shield className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">QA Summary</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">Overall QA status and coverage. Contains total requirements, test cases, and high-level execution stats.</p>
            <button onClick={() => handleGenerate('qa-summary')} disabled={generating} className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              <Download className="w-4 h-4" /> {generating === 'qa-summary' ? 'Generating...' : 'Export CSV'}
            </button>
          </div>

          <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full ${reportStats.executions === 0 ? 'opacity-60' : ''}`}>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Execution Report</h3>
            {reportStats.executions === 0 ? (
              <div className="mb-6 flex-1 text-sm text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">No execution results yet.</p>
                <p>Execute a test case to start building your execution report.</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-6 flex-1">Test execution results, including passed, failed, and blocked status for all tracked test cases.</p>
            )}
            <button onClick={() => handleGenerate('execution')} disabled={generating || reportStats.executions === 0} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${reportStats.executions > 0 ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}>
              <Download className="w-4 h-4" /> {generating === 'execution' ? 'Generating...' : 'Export CSV'}
            </button>
          </div>

          <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full ${reportStats.quality === 0 ? 'opacity-60' : ''}`}>
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4"><FileText className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Test Quality</h3>
            {reportStats.quality === 0 ? (
              <div className="mb-6 flex-1 text-sm text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">No quality evaluations yet.</p>
                <p>Evaluate a test case using AI to generate a quality report.</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-6 flex-1">Quality evaluation results for AI-generated test cases, including completeness and clarity scores.</p>
            )}
            <button onClick={() => handleGenerate('quality')} disabled={generating || reportStats.quality === 0} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${reportStats.quality > 0 ? 'bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-50' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}>
              <Download className="w-4 h-4" /> {generating === 'quality' ? 'Generating...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
