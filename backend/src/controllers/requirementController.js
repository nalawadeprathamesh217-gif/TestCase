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
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('requirements')
      .update(updates)
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
