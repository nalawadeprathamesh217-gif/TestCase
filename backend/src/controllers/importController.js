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

exports.saveMapping = async (req, res) => {
  try {
    const importId = req.params.id;
    const { mappings, sheetName } = req.body;
    
    // 1. Get import record to find storage path
    const { data: importRecord } = await supabase
      .from('test_case_imports')
      .select('*')
      .eq('id', importId)
      .single();
      
    if (!importRecord) throw new Error('Import not found');

    // 2. Download file
    const { data: fileData } = await supabase.storage
      .from('test-case-imports')
      .download(importRecord.storage_path);
      
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Parse all data
    const parseResult = parserService.parseAllData(
      buffer, 
      importRecord.file_type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      importRecord.file_name,
      sheetName
    );

    // 4. Save mappings
    const mappingInserts = mappings.map(m => ({
      import_id: importId,
      source_column: m.source,
      target_field: m.target,
      mapping_type: m.type || 'manual'
    }));

    await supabase.from('test_case_import_mappings').delete().eq('import_id', importId);
    await supabase.from('test_case_import_mappings').insert(mappingInserts);

    // 5. Transform and save rows
    const rowInserts = parseResult.data.map((rawRow, idx) => {
      const mappedData = {};
      mappings.forEach(m => {
        if (m.target !== 'Ignore' && rawRow[m.source] !== undefined) {
          mappedData[m.target] = rawRow[m.source];
        }
      });
      return {
        import_id: importId,
        row_number: idx + 2, // Assuming header is 1
        raw_data: rawRow,
        mapped_data: mappedData,
        validation_status: 'pending'
      };
    });

    await supabase.from('test_case_import_rows').delete().eq('import_id', importId);
    
    // Batch insert for safety
    for(let i=0; i<rowInserts.length; i+=100) {
       await supabase.from('test_case_import_rows').insert(rowInserts.slice(i, i+100));
    }

    // Update status
    await supabase.from('test_case_imports').update({ 
      status: 'mapping', 
      total_records: rowInserts.length,
      worksheet_name: sheetName
    }).eq('id', importId);

    res.json({ success: true, message: 'Mapping saved and rows extracted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateRows = async (req, res) => {
  try {
    const importId = req.params.id;
    
    const { data: rows } = await supabase
      .from('test_case_import_rows')
      .select('*')
      .eq('import_id', importId);

    let validCount = 0;
    let invalidCount = 0;
    let warningsCount = 0;

    for (const row of rows) {
      const mapped = row.mapped_data;
      const errors = [];
      let status = 'valid';

      if (!mapped['Title']) errors.push({ field: 'Title', message: 'Title is required' });
      if (!mapped['Test Steps']) errors.push({ field: 'Test Steps', message: 'Test Steps are required' });
      
      const validTypes = ['Functional', 'Negative', 'Validation', 'Boundary', 'Integration', 'Regression', 'Security', 'Performance', 'Other'];
      if (mapped['Test Type'] && !validTypes.includes(mapped['Test Type'])) {
        errors.push({ field: 'Test Type', message: `Test Type must be one of: ${validTypes.join(', ')}` });
      }

      const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
      if (mapped['Priority'] && !validPriorities.includes(mapped['Priority'])) {
        errors.push({ field: 'Priority', message: `Priority must be one of: ${validPriorities.join(', ')}` });
      }

      if (errors.length > 0) {
        status = 'invalid';
        invalidCount++;
      } else {
        validCount++;
        if (!mapped['Priority'] || !mapped['Test Type']) {
          status = 'warning';
          warningsCount++;
        }
      }

      await supabase.from('test_case_import_rows').update({
        validation_status: status,
        validation_errors: errors
      }).eq('id', row.id);
    }

    await supabase.from('test_case_imports').update({
      status: 'validating',
      valid_records: validCount,
      invalid_records: invalidCount
    }).eq('id', importId);

    res.json({ success: true, data: { valid: validCount, invalid: invalidCount, warnings: warningsCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPreviewRows = async (req, res) => {
  try {
    const importId = req.params.id;
    const { data } = await supabase
      .from('test_case_import_rows')
      .select('*')
      .eq('import_id', importId)
      .order('row_number', { ascending: true })
      .limit(50);
      
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkDuplicates = async (req, res) => {
  try {
    const importId = req.params.id;
    
    const { data: rows } = await supabase
      .from('test_case_import_rows')
      .select('*')
      .eq('import_id', importId)
      .in('validation_status', ['valid', 'warning']);
      
    let duplicates = 0;

    for (const row of rows) {
      if (row.mapped_data['Test Case ID']) {
        const { data: existing } = await supabase
          .from('test_cases')
          .select('id')
          .eq('test_case_id', row.mapped_data['Test Case ID'])
          .single();
          
        if (existing) {
          duplicates++;
          await supabase.from('test_case_import_rows').update({
            duplicate_status: 'exact_duplicate',
            duplicate_test_case_id: existing.id,
            import_decision: 'skip'
          }).eq('id', row.id);
          continue;
        }
      }
      
      await supabase.from('test_case_import_rows').update({
        duplicate_status: 'no_duplicate',
        import_decision: 'import'
      }).eq('id', row.id);
    }
    
    await supabase.from('test_case_imports').update({
      duplicate_records: duplicates,
      status: 'ready'
    }).eq('id', importId);

    res.json({ success: true, data: { duplicates } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.performImport = async (req, res) => {
  try {
    const importId = req.params.id;
    
    const { data: rows } = await supabase
      .from('test_case_import_rows')
      .select('*')
      .eq('import_id', importId)
      .eq('import_decision', 'import')
      .in('validation_status', ['valid', 'warning']);
      
    let imported = 0;
    let failed = 0;

    for (const row of rows) {
      const m = row.mapped_data;
      
      let reqId = null;
      if (m['Requirement ID']) {
        const { data: reqRecord } = await supabase
          .from('requirements')
          .select('id')
          .eq('requirement_id', m['Requirement ID'])
          .single();
        if (reqRecord) reqId = reqRecord.id;
      }
      
      const tc = {
        test_case_id: m['Test Case ID'] || `TC-IMP-${Date.now()}-${row.row_number}`,
        title: m['Title'],
        description: m['Description'] || '',
        test_steps: m['Test Steps'],
        expected_result: m['Expected Result'] || '',
        test_type: m['Test Type'] || 'Functional',
        priority: m['Priority'] || 'Medium',
        risk: 'Medium',
        status: 'Draft',
        execution_result: 'Not Executed',
        requirement_id: reqId,
        source_type: 'import',
        source_import_id: importId,
        source_row_number: row.row_number,
        created_by: req.user.id
      };
      
      const { data: inserted, error: insertError } = await supabase
        .from('test_cases')
        .insert([tc])
        .select()
        .single();
        
      if (insertError) {
        failed++;
        await supabase.from('test_case_import_rows').update({ validation_status: 'invalid', validation_errors: [{message: insertError.message}] }).eq('id', row.id);
      } else {
        imported++;
        await supabase.from('test_case_import_rows').update({ created_test_case_id: inserted.id }).eq('id', row.id);
      }
    }
    
    await supabase.from('test_case_imports').update({
      status: 'completed',
      imported_records: imported,
      failed_records: failed,
      completed_at: new Date().toISOString()
    }).eq('id', importId);

    res.json({ success: true, data: { imported, failed } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
