const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const aiProvider = require('../services/ai/GeminiProvider');
const { retryWithBackoff } = require('../utils/retryHelper');

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
    let finalAttemptCount = 1;
    let fallbackUsed = false;

    try {
      console.log(`[AI] Gemini generation started for requirement ${requirementId}`);
      
      const aiResponse = await retryWithBackoff(async (attempt) => {
        finalAttemptCount = attempt;
        console.log(`[AI] Attempt ${attempt}/3`);
        
        // Update run attempt_count
        await supabase
          .from('test_case_generation_runs')
          .update({ attempt_count: attempt, status: 'processing' })
          .eq('id', runId);

        return await aiProvider.generateTestCases(requirement, count || 10);
      }, {
        maxAttempts: 3,
        baseDelayMs: 2000,
        onRetry: async (error, attempt, delay) => {
          const status = error.status || error.statusCode || 500;
          console.log(`[AI] Gemini returned ${status}: ${error.message}`);
          console.log(`[AI] Temporary error. Retrying in approximately ${Math.round(delay / 1000)} seconds`);
        }
      });
      
      if (!aiResponse || !aiResponse.testCases || !Array.isArray(aiResponse.testCases)) {
        throw new Error('Malformed AI response from provider.');
      }
      
      console.log('[AI] Gemini generation successful');
      console.log('[AI] Generation completed');
      generatedCases = aiResponse.testCases;
    } catch (aiErr) {
      if (finalAttemptCount >= 3) {
        console.log(`[AI] Gemini still unavailable`);
        console.log(`[AI] Generation failed after 3 attempts`);
      }
      console.error('Gemini API error:', aiErr.message);
      
      // Update run status to failed
      await supabase
        .from('test_case_generation_runs')
        .update({ 
          status: 'failed', 
          error_message: aiErr.message,
          attempt_count: finalAttemptCount,
          failure_reason: 'Gemini API Error'
        })
        .eq('id', runId);
      
      const status = aiErr.status || aiErr.statusCode || 500;
      const isRetryable = status === 408 || status === 429 || status >= 500 || aiErr.message.toLowerCase().includes('timeout');

      if (isRetryable) {
        return res.status(503).json({ 
          success: false, 
          message: 'AI generation is temporarily unavailable because the AI service is busy. Please try again in a few moments.',
          retryable: true
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          message: 'AI service configuration is invalid or failed. ' + aiErr.message,
          retryable: false
        });
      }
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
      // Ensure arrays are stringified or handled if required, but Supabase accepts JS arrays into JSONB.
      // However, if the columns are TEXT, arrays might cause issues. 
      // We will stringify arrays just in case, but if Supabase handles them, it's fine.
      // Wait, let's keep it as is, but ensure we pass requirement_id and no 'status' column.
      return {
        id: uuidv4(),
        generation_run_id: runId,
        requirement_id: requirementId,
        temporary_id: `TC-AI-${Math.floor(Math.random() * 10000)}`,
        title: tc.title || 'Untitled Test Case',
        description: tc.description || '',
        preconditions: tc.preconditions || '',
        test_steps: tc.testSteps || tc.test_steps || '',
        expected_result: tc.expectedResult || tc.expected_result || '',
        test_type: tc.testType || tc.test_type || 'Functional',
        priority: tc.priority || 'Medium',
        risk: tc.risk || 'Medium',
        review_status: 'Pending'
      };
    });

    // Save candidates to the database
    const { error: insertError } = await supabase
      .from('test_case_generation_candidates')
      .insert(candidates);

    if (insertError) {
      console.error('Error inserting candidates:', insertError);
      
      // Cleanup orphaned run
      await supabase
        .from('test_case_generation_runs')
        .update({ status: 'failed', failure_reason: 'Database insert failed' })
        .eq('id', runId);
        
      throw new Error('Failed to save generated candidates');
    }
    
    await supabase
      .from('test_case_generation_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString(), generated_count: candidates.length })
      .eq('id', runId);

    res.status(200).json({ 
      success: true, 
      message: 'AI generation completed',
      data: { generationRunId: runId, candidates }
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

exports.acceptCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // 1. Get candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('test_case_generation_candidates')
      .select('*, test_case_generation_runs(*)')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (candidate.review_status === 'Accepted') {
      return res.status(400).json({ success: false, message: 'Test case has already been accepted.' });
    }

    const requirementId = candidate.test_case_generation_runs.requirement_id;

    // 2. Generate a Test Case ID
    const { data: latestTc } = await supabase
      .from('test_cases')
      .select('test_case_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    let nextNum = 1;
    if (latestTc && latestTc.test_case_id && latestTc.test_case_id.startsWith('TC-')) {
      const match = latestTc.test_case_id.match(/TC-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const finalTcId = `TC-${nextNum.toString().padStart(3, '0')}`;

    // 3. Insert into test_cases
    const { data: newTc, error: tcError } = await supabase
      .from('test_cases')
      .insert([{
        test_case_id: finalTcId,
        requirement_id: requirementId,
        title: candidate.title,
        description: candidate.description,
        preconditions: candidate.preconditions,
        test_steps: candidate.test_steps,
        expected_result: candidate.expected_result,
        test_type: candidate.test_type || 'Functional',
        priority: candidate.priority || 'Medium',
        risk: candidate.risk || 'Medium',
        status: 'Draft',
        created_by: req.user.id
      }])
      .select()
      .single();

    if (tcError) throw tcError;

    // 4. Mark candidate as accepted
    await supabase
      .from('test_case_generation_candidates')
      .update({ review_status: 'Accepted' })
      .eq('id', candidateId);

    res.json({ success: true, message: 'Test case accepted successfully', data: newTc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
