import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Upload, FileSpreadsheet, Download, Clock, CheckCircle2, XCircle, ChevronRight, AlertTriangle } from 'lucide-react';

export default function Imports() {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const fetchImports = async () => {
    try {
      const res = await api.get('/test-case-imports');
      setImports(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch imports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImports(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!allowed.includes(file.type) && !file.name.endsWith('.csv')) {
      alert('Only .xlsx, .xls, and .csv files are supported');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/test-case-imports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/imports/${res.data.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-700',
      'failed': 'bg-red-100 text-red-700',
      'cancelled': 'bg-slate-100 text-slate-700',
      'ready': 'bg-blue-100 text-blue-700',
    };
    return colors[status] || 'bg-amber-100 text-amber-700';
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Test Case Imports</h1>
            <p className="text-slate-500 text-sm mt-1">Import existing test cases from Excel or CSV files.</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div 
          className={`bg-white border-2 border-dashed rounded-2xl p-10 text-center mb-8 transition-colors relative
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files[0]); }}
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Drag & drop Excel/CSV file here</h3>
          <p className="text-slate-500 text-sm mb-4">or</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors inline-block">
            Browse Files
            <input 
              type="file" 
              className="hidden" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={(e) => handleUpload(e.target.files[0])}
            />
          </label>
          <p className="text-slate-400 text-xs mt-4">XLSX • XLS • CSV (Max 25 MB)</p>
          
          {uploading && (
            <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
              <div className="text-blue-600 font-medium animate-pulse">Uploading and Initializing Import...</div>
            </div>
          )}
        </div>

        {/* Import History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Import History</h3>
          </div>
          {loading ? (
            <div className="p-10 text-center text-slate-500">Loading...</div>
          ) : imports.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>No imports yet. Upload a file to begin.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {imports.map(item => (
                <div key={item.id} onClick={() => navigate(`/imports/${item.id}`)} className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className={`w-5 h-5 ${item.file_type === 'csv' ? 'text-green-600' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 text-sm">{item.file_name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        {item.worksheet_name && (
                          <>
                            <span>•</span>
                            <span>Sheet: {item.worksheet_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-slate-700">{item.imported_records} / {item.total_records}</div>
                      <div className="text-xs text-slate-500">Imported</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
