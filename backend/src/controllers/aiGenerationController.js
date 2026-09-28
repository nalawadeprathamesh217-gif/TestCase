const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const aiProviderManager = require('../services/ai/AIProviderManager');
const { retryWithBackoff } = require('../utils/retryHelper'); // Kept for other uses if needed

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
        status: 'processing',
        requested_count: count || 10
      }])
      .select()
      .single();

    if (runError) throw runError;

    let generatedCases;
    let metadata;
    
    try {
      console.log(`[AI] Generation started for requirement ${requirementId}`);
      
      const resultObj = await aiProviderManager.generateTestCases(requirement, count || 10);
      generatedCases = resultObj.result.testCases;
      metadata = resultObj.metadata;

      // Update run metadata
      await supabase
        .from('test_case_generation_runs')
        .update({ 
          status: 'processing',
          ai_provider: metadata.final_provider,
          ai_model: metadata.final_model,
          fallback_used: metadata.fallback_level > 0,
          attempt_count: metadata.attempted_providers.length,
          failure_reason: Object.keys(metadata.provider_status).length > 1 ? JSON.stringify(metadata.provider_status) : null
        })
        .eq('id', runId);

      console.log('[AI] Generation completed');
    } catch (aiErr) {
      console.error('AI API error:', aiErr.message);
      
      // Update run status to failed
      await supabase
        .from('test_case_generation_runs')
        .update({ 
          status: 'failed', 
          error_message: aiErr.message,
          failure_reason: aiErr.metadata ? JSON.stringify({
            code: aiErr.code || 'AI_API_ERROR',
            status: aiErr.metadata.provider_status
          }) : (aiErr.code || 'AI_API_ERROR'),
          ai_provider: aiErr.metadata?.primary_provider,
          attempt_count: aiErr.metadata?.attempted_providers?.length || 1
        })
        .eq('id', runId);

      if (aiErr.code === 'ALL_AI_PROVIDERS_FAILED') {
        return res.status(503).json({
          success: false,
          code: 'ALL_AI_PROVIDERS_FAILED',
          message: aiErr.message,
          retryable: false
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: 'AI generation is currently unavailable. Please try again later.',
        retryable: false,
        code: aiErr.code || 'AI_GENERATION_FAILED'
      });
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
    
    const safeParseArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
        
        const lines = value.split(/\r?\n/)
          .map(line => line.replace(/^(\d+\.|\*|-|•)\s*/, '').trim())
          .filter(line => line.length > 0);
          
        if (lines.length > 0) return lines;
        return [value.trim()];
      }
      return [];
    };

    const candidates = generatedCases.map(tc => {
      return {
        id: uuidv4(),
        generation_run_id: runId,
        requirement_id: requirementId,
        temporary_id: `TC-AI-${Math.floor(Math.random() * 10000)}`,
        title: tc.title || 'Untitled Test Case',
        description: tc.description || '',
        preconditions: safeParseArray(tc.preconditions),
        test_steps: safeParseArray(tc.testSteps || tc.test_steps),
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
      data: { 
        generationRunId: runId, 
        candidates: candidates.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          preconditions: c.preconditions,
          testSteps: c.test_steps,
          expectedResult: c.expected_result,
          testType: c.test_type,
          priority: c.priority,
          risk: c.risk,
          reviewStatus: c.review_status
        })),
        fallbackUsed: metadata?.fallback_used || metadata?.fallback_level > 0,
        finalProvider: metadata?.final_provider,
        attemptedProviders: metadata?.attempted_providers 
      }
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
    const safeStringify = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return String(val);
    };

    const { data: newTc, error: tcError } = await supabase
      .from('test_cases')
      .insert([{
        test_case_id: finalTcId,
        requirement_id: requirementId,
        title: candidate.title,
        description: candidate.description,
        preconditions: safeStringify(candidate.preconditions),
        test_steps: safeStringify(candidate.test_steps),
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

exports.updateCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const {
      title, description, preconditions, testSteps, expectedResult, testType, priority, risk
    } = req.body;

    const { data: candidate, error: updateError } = await supabase
      .from('test_case_generation_candidates')
      .update({
        title,
        description,
        preconditions,
        test_steps: testSteps,
        expected_result: expectedResult,
        test_type: testType,
        priority,
        risk,
        review_status: 'Edited'
      })
      .eq('id', candidateId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    res.json({
      success: true,
      data: {
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        preconditions: candidate.preconditions,
        testSteps: candidate.test_steps,
        expectedResult: candidate.expected_result,
        testType: candidate.test_type,
        priority: candidate.priority,
        risk: candidate.risk,
        reviewStatus: candidate.review_status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
