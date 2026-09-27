const supabase = require('../config/supabase');

// [ALGO-SHA256]
// ============================================================
// ALGORITHM: SHA-256 EXACT DUPLICATE DETECTION
// ============================================================
//
// Purpose: Detect test cases that are exactly the same after normalization.
//
// Step 1: Build canonical text from important fields (Title, Description, Steps, etc).
// Step 2: Normalize formatting such as extra whitespace.
// Step 3: Generate a SHA-256 hash.
// Step 4: Compare the hash with existing test cases.
//
// Same hash: → Exact duplicate candidate
// Different hash: → Not an exact duplicate
//
// IMPORTANT:
// SHA-256 detects exact content equality. It does NOT understand meaning.
// "Login using valid credentials" and "Verify successful login"
// may mean the same thing but will have different hashes.
// Semantic duplicate detection is handled separately using embeddings and similarity.

exports.getTestCases = async (req, res) => {
  try {
    const { requirement_id } = req.query;
    let query = supabase.from('test_cases').select('*').order('created_at', { ascending: false });
    
    if (requirement_id) {
      query = query.eq('requirement_id', requirement_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTestCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, requirements(title, requirement_id)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Test case not found' });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTestCase = async (req, res) => {
  try {
    const { 
      test_case_id, requirement_id, title, description, 
      preconditions, test_steps, expected_result, 
      test_type, priority, risk, status 
    } = req.body;
    
    const { data, error } = await supabase
      .from('test_cases')
      .insert([{ 
        test_case_id, requirement_id, title, description, 
        preconditions, test_steps, expected_result, 
        test_type, priority, risk, status, 
        created_by: req.user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('test_cases')
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

exports.deleteTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('test_cases')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Test case deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.executeTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { execution_result, actual_result, comments } = req.body;
    
    // 1. Record execution history
    const { data: execution, error: execError } = await supabase
      .from('test_case_executions')
      .insert([{
        test_case_id: id,
        executed_by: req.user.id,
        execution_result,
        actual_result,
        comments
      }])
      .select()
      .single();

    if (execError) throw execError;

    // 2. Update the main test case status
    const { data: testCase, error: tcError } = await supabase
      .from('test_cases')
      .update({ execution_result })
      .eq('id', id)
      .select()
      .single();
      
    if (tcError) throw tcError;

    res.status(201).json({ success: true, data: execution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
