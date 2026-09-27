const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

exports.getDocuments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requirement_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requirement_documents')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const file = req.file;
    const documentId = uuidv4();
    const safeFilename = `${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${req.user.id}/${documentId}/${safeFilename}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_DOCUMENT_BUCKET || 'requirement-documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    // 2. Insert DB Record
    const { data: document, error: dbError } = await supabase
      .from('requirement_documents')
      .insert([{
        id: documentId,
        file_name: safeFilename,
        original_file_name: file.originalname,
        file_type: file.originalname.split('.').pop().toLowerCase(),
        mime_type: file.mimetype,
        storage_path: storagePath,
        file_size: file.size,
        processing_status: 'UPLOADED',
        uploaded_by: req.user.id
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. (Async) Trigger Processing Logic Here...
    // parseDocumentAsync(documentId);

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDocumentChunks = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('document_text_chunks')
      .select('*')
      .eq('document_id', req.params.id)
      .order('chunk_index', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reprocessDocument = async (req, res) => {
  res.status(501).json({ success: false, message: 'Reprocess not implemented yet' });
};

exports.deleteDocument = async (req, res) => {
  // Add deletion logic and cleanup of storage bucket
  res.status(501).json({ success: false, message: 'Delete not implemented yet' });
};
