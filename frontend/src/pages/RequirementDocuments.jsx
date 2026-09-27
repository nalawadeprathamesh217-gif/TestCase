import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import AppLayout from '../layouts/AppLayout';
import { Upload, FileText, FileType, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatusBadge = ({ status }) => {
  const cfg = {
    'UPLOADED': { cls: 'bg-slate-100 text-slate-600', icon: Clock },
    'PROCESSING': { cls: 'bg-blue-100 text-blue-700', icon: RefreshCw },
    'PROCESSED': { cls: 'bg-green-100 text-green-700', icon: CheckCircle },
    'FAILED': { cls: 'bg-red-100 text-red-700', icon: XCircle },
  };
  const { cls, icon: Icon } = cfg[status] || cfg['UPLOADED'];
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cls}`}><Icon className="w-3 h-3" />{status}</span>;
};

export default function RequirementDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const handleViewDocument = (documentId) => {
    navigate(`/requirement-documents/${documentId}`);
  };

  const MAX_SIZE_MB = 25;
  const ALLOWED_TYPES = ['.pdf', '.docx', '.txt'];

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/requirement-documents');
      setDocuments(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const validateFile = (file) => {
    if (!file) return 'No file selected.';
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) return `Unsupported file type. Please upload PDF, DOCX, or TXT.`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File is too large. Maximum allowed size is ${MAX_SIZE_MB} MB.`;
    return null;
  };

  const handleFileSelect = (file) => {
    setError('');
    const err = validateFile(file);
    if (err) { setError(err); setSelectedFile(null); return; }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress('Uploading...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await api.post('/requirement-documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSelectedFile(null);
      setUploadProgress('');
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
      setUploadProgress('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Requirement Documents</h1>
          <p className="text-slate-500 text-sm mt-1">Upload a PDF, DOCX, or TXT file to extract requirements from your existing documentation.</p>
        </div>

        {/* Workflow Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-2">How it works:</p>
          <p className="mb-2">Upload Document → Extract Text → Find Candidate Requirements → Review and Edit → Approve Requirements</p>
          <p className="text-blue-700 italic">AI or automatic extraction provides suggestions. Always review extracted requirements before approving them.</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Upload Document</h2>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => handleFileSelect(e.target.files[0])} />
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">Drag & drop your file here</p>
            <p className="text-sm text-slate-400 mt-1">or <span className="text-blue-600 font-medium">Browse Files</span></p>
            <p className="text-xs text-slate-400 mt-3">PDF, DOCX, TXT • Max {MAX_SIZE_MB} MB</p>
          </div>

          {error && <div className="mt-3 flex items-center gap-2 text-red-600 text-sm"><AlertTriangle className="w-4 h-4" />{error}</div>}

          {selectedFile && !error && (
            <div className="mt-4 flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500 text-sm">Remove</button>
                <button onClick={handleUpload} disabled={uploading} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400">
                  {uploading ? uploadProgress || 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Document Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Documents</h2>
            <span className="text-sm text-slate-400">{documents.length} documents</span>
          </div>
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-800 font-medium mb-1">No documents yet</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">Upload a document above to automatically extract requirements using AI.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['File Name', 'Type', 'Size', 'Status', 'Uploaded', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{doc.original_file_name || doc.file_name}</td>
                      <td className="px-4 py-3 text-slate-500 uppercase">{doc.file_type}</td>
                      <td className="px-4 py-3 text-slate-500">{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={doc.processing_status} /></td>
                      <td className="px-4 py-3 text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => handleViewDocument(doc.id)} 
                          className="p-1 text-slate-400 hover:text-blue-600 rounded inline-flex cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
