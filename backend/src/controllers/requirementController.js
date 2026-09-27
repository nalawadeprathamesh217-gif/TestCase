const supabase = require('../config/supabase');

// [ALGO-RULE-BASED]
// ============================================================
// ALGORITHM: RULE-BASED REQUIREMENT CANDIDATE EXTRACTION
// ============================================================
//
// When documents are parsed, this step can use simple NLP/text rules
// rather than an AI model to extract requirements.
//
// The system looks for requirement-related keywords such as:
// "shall", "must", "should", "required".
//
// Example:
// "The system shall allow users to reset passwords."
//
// Because the sentence contains "shall", it is considered
// a possible requirement.
//
// This is a candidate-generation technique, not final
// requirement approval. Human review is required before the
// requirement becomes an approved requirement.

// [AI-COVERAGE]
// ============================================================
// AI FEATURE: REQUIREMENT COVERAGE EXPLANATION
// ============================================================
//
// The AI compares the requirement with the test case and
// explains which requirement behaviors are actually tested.
//
// Example:
// Requirement: "The account must lock after five failed login attempts."
// Test Case: "Enter an incorrect password once."
//
// AI may identify:
// Covered: Invalid password behavior
// Missing: Five-attempt threshold, Account lock behavior
//
// Therefore the test case may provide PARTIAL coverage.
// This is an explanation/analysis feature. It does not automatically approve the test case.

exports.getRequirements = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRequirementById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Requirement not found' });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRequirement = async (req, res) => {
  try {
    const { requirement_id, title, description, priority, status } = req.body;
    
    const { data, error } = await supabase
      .from('requirements')
      .insert([{ requirement_id, title, description, priority, status, created_by: req.user.id }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the requirement exists first
    const { data: existing, error: fetchErr } = await supabase
      .from('requirements')
      .select('id, source_document_id, source_chunk_id, source_page_number, source_reference')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    // Whitelist only the fields users are allowed to edit.
    // Source traceability fields are NEVER overwritten from user input.
    const EDITABLE_FIELDS = [
      'requirement_id', 'title', 'description', 'actor',
      'preconditions', 'business_rules', 'acceptance_criteria',
      'priority', 'status',
    ];

    const safeUpdates = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        safeUpdates[field] = req.body[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
    }

    // Validate required fields when present
    if (safeUpdates.requirement_id !== undefined && !safeUpdates.requirement_id.trim()) {
      return res.status(400).json({ success: false, message: 'Requirement ID cannot be empty' });
    }
    if (safeUpdates.title !== undefined && !safeUpdates.title.trim()) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }

    const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
    if (safeUpdates.priority && !VALID_PRIORITIES.includes(safeUpdates.priority)) {
      return res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const VALID_STATUSES = ['Draft', 'Under Review', 'Approved', 'Rejected', 'Archived'];
    if (safeUpdates.status && !VALID_STATUSES.includes(safeUpdates.status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('requirements')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Requirement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
