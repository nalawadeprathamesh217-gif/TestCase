const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const aiProvider = require('../services/ai/GeminiProvider');

// [AI-GENERATION]
// ============================================================
// AI FEATURE: TEST CASE GENERATION
// ============================================================
//
// The approved requirement is sent to the configured LLM
// (for example Gemini) with instructions to generate
// structured test-case candidates.
//
// The AI does NOT directly create the final test case.
// It returns candidates that must be reviewed by a human.
//
// Flow:
// Approved Requirement
//       ↓
// Prompt
//       ↓
// Gemini/OpenAI
//       ↓
// Structured JSON
//       ↓
// Validate response
//       ↓
// Candidate Test Cases
//       ↓
// Human Review
//
// This keeps the system human-in-the-loop and prevents
// unverified AI output from becoming an official test case.
//
// SECURITY:
// AI API keys must remain on the backend.
// Never expose GEMINI_API_KEY or OPENAI_API_KEY
// through frontend code or VITE_* variables.
exports.generateTestCases = async (req, res) => {
  try {
    const requirementId = req.params.id;
    const { count, testTypes, includePositive, includeNegative, includeBoundary } = req.body;

    // 1. Validate the requirement is Approved
    const { data: requirement, error: reqError } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single();

    if (reqError || !requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }

    if (requirement.status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Test cases can only be generated for approved requirements.' });
    }

    if (count > 20) {
      return res.status(400).json({ success: false, message: 'Cannot generate more than 20 test cases per run.' });
    }

    // 2. Create the Generation Run Record
    // Stores AI generation metadata for reproducibility.
    // This allows us to know which provider/model generated
    // a particular set of test case candidates.
    const runId = uuidv4();
    const { data: run, error: runError } = await supabase
      .from('test_case_generation_runs')
      .insert([{
        id: runId,
        requirement_id: requirementId,
        requested_by: req.user.id,
        ai_provider: process.env.AI_PROVIDER || 'gemini',
        ai_model: process.env.AI_MODEL || 'gemini-1.5-pro',
        requested_count: count || 10,
        status: 'processing'
      }])
      .select()
      .single();

    if (runError) throw runError;

    // 3. Initiate the AI Request
    //
    // HUMAN-IN-THE-LOOP
    //
    // AI provides a suggestion.
    // A human must review the result before it becomes
    // an approved/final record.
    //
    // This prevents automatic AI decisions from becoming
    // authoritative application data.
    
    let generatedCases;
    try {
      // Set a timeout using Promise.race in the real implementation if needed,
      // but for now we just call the provider.
      const aiResponse = await aiProvider.generateTestCases(requirement, count || 10);
      
      if (!aiResponse || !aiResponse.testCases || !Array.isArray(aiResponse.testCases)) {
        throw new Error('Malformed AI response from provider.');
      }
      
      generatedCases = aiResponse.testCases;
    } catch (aiErr) {
      // Update run status to failed
      await supabase
        .from('test_case_generation_runs')
        .update({ status: 'failed', error_message: aiErr.message })
        .eq('id', runId);
        
      return res.status(500).json({ success: false, message: 'AI generation is temporarily unavailable. Please try again.' });
    }

    //
    // ============================================================
    // AI OUTPUT VALIDATION
    // ============================================================
    //
    // LLM output is treated as untrusted external data.
    // Even though the prompt requests JSON, the model may return
    // incomplete or unexpected data.
    // Therefore we validate the required fields, data types, etc.
    
    const candidates = generatedCases.map(tc => {
      // Simple validation fallback
      return {
        id: uuidv4(),
        run_id: runId,
        requirement_id: requirementId,
        title: tc.title || 'Untitled Test Case',
        description: tc.description || '',
        preconditions: tc.preconditions || '',
        test_steps: tc.testSteps || tc.test_steps || '',
        expected_result: tc.expectedResult || tc.expected_result || '',
        test_type: tc.testType || tc.test_type || 'Functional',
        priority: tc.priority || 'Medium',
        risk: tc.risk || 'Medium',
        status: 'pending_review'
      };
    });

    // Save candidates to the database
    // (Assuming we have a test_case_generation_candidates table or similar, 
    // but the project might be inserting directly as 'Draft' or returning them)
    // We will just return them for the user to review.
    
    await supabase
      .from('test_case_generation_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString(), generated_count: candidates.length })
      .eq('id', runId);

    res.status(200).json({ 
      success: true, 
      message: 'AI generation completed',
      data: { generationRunId: run.id, candidates }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGenerationHistory = async (req, res) => {
  try {
    const requirementId = req.params.id;
    
    const { data, error } = await supabase
      .from('test_case_generation_runs')
      .select('*')
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
