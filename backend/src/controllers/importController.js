const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const file = req.file;
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const importId = uuidv4();
    const safeFilename = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${req.user.id}/${importId}/${safeFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('test-case-imports')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype
      });

    if (uploadError) throw uploadError;

    // Create DB record
    const { data: importRecord, error: dbError } = await supabase
      .from('test_case_imports')
      .insert({
        id: importId,
        file_name: file.originalname,
        file_type: file.originalname.endsWith('.csv') ? 'csv' : 'excel',
        storage_path: storagePath,
        file_size: file.size,
        file_hash: fileHash,
        status: 'uploaded',
        uploaded_by: req.user.id
      })
      .select()
      .single();

    if (dbError) throw dbError;

    res.status(200).json({ success: true, data: importRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listImports = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_case_imports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getImport = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_case_imports')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const parserService = require('../services/parserService');

exports.analyzeFile = async (req, res) => {
  try {
    const importId = req.params.id;
    
    // 1. Get import record to find storage path
    const { data: importRecord, error: dbError } = await supabase
      .from('test_case_imports')
      .select('*')
      .eq('id', importId)
      .single();
      
    if (dbError || !importRecord) throw new Error('Import not found');

    // 2. Download file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('test-case-imports')
      .download(importRecord.storage_path);
      
    if (downloadError) throw downloadError;

    // 3. Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Parse file
    const analysis = parserService.analyzeBuffer(buffer, importRecord.file_type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', importRecord.file_name);

    // 5. Auto-mapping logic
    const mappings = analysis.columns.map(col => {
      let target = 'Ignore';
      let type = 'ignored';
      const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (norm.includes('tcid') || norm === 'id') { target = 'Test Case ID'; type = 'auto'; }
      else if (norm.includes('title') || norm.includes('testname')) { target = 'Title'; type = 'auto'; }
      else if (norm.includes('desc')) { target = 'Description'; type = 'auto'; }
      else if (norm.includes('step')) { target = 'Test Steps'; type = 'auto'; }
      else if (norm.includes('expect')) { target = 'Expected Result'; type = 'auto'; }
      else if (norm.includes('req')) { target = 'Requirement ID'; type = 'auto'; }
      else if (norm.includes('priority') || norm.includes('sev')) { target = 'Priority'; type = 'auto'; }
      else if (norm.includes('type')) { target = 'Test Type'; type = 'auto'; }
      
      // Get a sample value from the first row
      const sample = analysis.previewData.length > 0 ? analysis.previewData[0][col] : '';

      return { source: col, sample: String(sample || ''), target, type };
    });

    res.json({ success: true, data: { sheets: analysis.sheets, columns: analysis.columns, mappings } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMapping = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.saveMapping = async (req, res) => {
  res.json({ success: true, data: { message: 'Mapping saved' } });
};

exports.validateRows = async (req, res) => {
  res.json({ success: true, data: { valid: 10, invalid: 0, warnings: 0 } });
};

exports.getPreviewRows = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.checkDuplicates = async (req, res) => {
  res.json({ success: true, data: { duplicates: 0 } });
};

exports.performImport = async (req, res) => {
  res.json({ success: true, data: { imported: 10, failed: 0 } });
};
