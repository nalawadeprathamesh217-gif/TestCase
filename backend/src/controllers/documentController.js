const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const { extractText } = require('../services/documentParser');
const { extractRequirements } = require('../services/requirementExtractor');

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
        file_type: file.originalname.split('.').pop().toLowerCase(),
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

exports.processDocument = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Mark as processing
    await supabase.from('requirement_documents').update({ processing_status: 'PROCESSING' }).eq('id', id);

    // 2. Fetch document info
    const { data: doc, error: fetchError } = await supabase
      .from('requirement_documents')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !doc) throw new Error('Document not found');

    // 3. Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(process.env.SUPABASE_DOCUMENT_BUCKET || 'requirement-documents')
      .download(doc.storage_path);
    if (downloadError) throw new Error('Failed to download from storage: ' + downloadError.message);

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 4. Extract raw text from PDF/DOCX/TXT
    const text = await extractText(buffer, doc.file_type, doc.file_name);

    // 5. Clean up any previous extraction results (idempotent retry support)
    await supabase.from('requirements').delete().eq('source_document_id', id);
    await supabase.from('document_text_chunks').delete().eq('document_id', id);

    // 6. Store the full text as a single chunk and capture its UUID
    const chunkId = uuidv4();
    const { error: chunkError } = await supabase.from('document_text_chunks').insert([{
      id: chunkId,
      document_id: id,
      chunk_index: 0,
      content: text,
      character_start: 0,
      character_end: text.length,
    }]);
    if (chunkError) throw new Error('Failed to store text chunk: ' + chunkError.message);

    // 7. Extract requirements using AI (Gemini) with regex fallback.
    //    Explicit source IDs from the document are preserved verbatim.
    const { requirements: extractedReqs, stats } = await extractRequirements(
      text,
      id,
      chunkId,
      doc.file_name,
      req.user.id
    );

    // 8. Batch-insert all candidate requirements (status = Draft, NOT auto-approved)
    if (extractedReqs.length > 0) {
      const { error: insertError } = await supabase.from('requirements').insert(extractedReqs);
      if (insertError) throw new Error('Failed to insert requirements: ' + insertError.message);
    }

    // 9. Mark document as PROCESSED
    await supabase.from('requirement_documents').update({ processing_status: 'PROCESSED' }).eq('id', id);

    console.log(`[processDocument] doc=${id} method=${stats.extractionMethod} total=${stats.totalExtracted} withSourceId=${stats.withExplicitSourceId} generated=${stats.withGeneratedId}`);

    res.json({
      success: true,
      message: 'Document processed successfully',
      data: {
        extractedCount: extractedReqs.length,
        extractionMethod: stats.extractionMethod,
        withExplicitSourceId: stats.withExplicitSourceId,
        withGeneratedId: stats.withGeneratedId,
      },
    });
  } catch (error) {
    await supabase.from('requirement_documents').update({ processing_status: 'FAILED' }).eq('id', id);
    console.error('[processDocument] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  // Add deletion logic and cleanup of storage bucket
  res.status(501).json({ success: false, message: 'Delete not implemented yet' });
};
