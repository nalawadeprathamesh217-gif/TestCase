const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const aiProviderManager = require('../services/ai/AIProviderManager');

// [AI-EVALUATION]
// ============================================================
// AI FEATURE: TEST CASE QUALITY EVALUATION
// ============================================================
//
// The LLM reviews the meaning and quality of the test case.
//
// The AI receives:
// 1. Original requirement
// 2. Test case
// 3. Results from deterministic rule checks
//
// The AI then explains whether the test case properly covers
// the requirement.
//
// AI output is stored as an evaluation.
// A test case may be edited after AI evaluation.
// Therefore an older quality score may no longer represent
// the current test case. Quality evaluations are stored as history 
// so we can understand how the test case changed over time.
exports.evaluateQuality = async (req, res) => {
  try {
    const testCaseId = req.params.id;

    // 1. Verify test case exists
    const { data: testCase, error: tcError } = await supabase
      .from('test_cases')
      .select('*')
      .eq('id', testCaseId)
      .single();

    if (tcError || !testCase) {
      return res.status(404).json({ success: false, message: 'Test case not found' });
    }

    // 2. Fetch requirement to provide to AI
    const { data: requirement } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', testCase.requirement_id)
      .single();

    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Associated requirement not found' });
    }

    // 3. Real AI Quality Evaluation
    let aiEvaluation;
    let providerUsed = process.env.AI_PROVIDER || 'gemini';
    let modelUsed = process.env.AI_MODEL || 'gemini-3.5-flash';
    let fallbackUsed = false;
    
    try {
      const missing = [];
      if (!testCase.title) missing.push('Title');
      if (!testCase.description) missing.push('Description');
      if (!testCase.preconditions) missing.push('Preconditions');
      if (!testCase.test_steps || testCase.test_steps === '[]') missing.push('Test Steps');
      if (!testCase.expected_result) missing.push('Expected Result');
      if (!testCase.test_type) missing.push('Test Type');
      if (!testCase.priority) missing.push('Priority');
      if (!testCase.risk) missing.push('Risk');

      let ruleFindings = missing.length > 0
        ? `Missing critical fields: ${missing.join(', ')}.`
        : 'All required fields are present.';
        
      if (testCase.test_steps && testCase.test_steps.length < 20) {
        ruleFindings += ' Warning: Test steps might be too vague or short.';
      }

      const { result, metadata } = await aiProviderManager.evaluateQuality(requirement, testCase, ruleFindings);
      aiEvaluation = result;
      
      providerUsed = metadata.final_provider;
      modelUsed = metadata.final_model;
      fallbackUsed = metadata.fallback_level > 0;
      
    } catch (aiErr) {
      console.error('AI quality evaluation error:', aiErr);
      
      if (aiErr.code === 'ALL_AI_PROVIDERS_FAILED') {
        return res.status(503).json({ success: false, message: 'All configured AI providers are currently unavailable. No evaluation was generated.' });
      }

      return res.status(500).json({ success: false, message: 'AI quality evaluation failed. Please try again.' });
    }

    const evaluation = {
      id: uuidv4(),
      test_case_id: testCaseId,
      completeness_score: aiEvaluation.completeness?.score ?? aiEvaluation.completenessScore ?? 0,
      clarity_score: aiEvaluation.clarity?.score ?? aiEvaluation.clarityScore ?? 0,
      relevance_score: aiEvaluation.relevance?.score ?? aiEvaluation.relevanceScore ?? 0,
      consistency_score: aiEvaluation.consistency?.score ?? aiEvaluation.consistencyScore ?? 0,
      overall_score: aiEvaluation.overall ?? aiEvaluation.overallScore ?? 0,
      evaluation_method: 'AI',
      ai_provider: providerUsed,
      ai_model: modelUsed,
      suggestions: {
        suggestions: aiEvaluation.suggestions || [],
        completeness_reason: aiEvaluation.completeness?.reason ?? aiEvaluation.completenessReason ?? '',
        clarity_reason: aiEvaluation.clarity?.reason ?? aiEvaluation.clarityReason ?? '',
        relevance_reason: aiEvaluation.relevance?.reason ?? aiEvaluation.relevanceReason ?? '',
        consistency_reason: aiEvaluation.consistency?.reason ?? aiEvaluation.consistencyReason ?? '',
        covered_requirement_behavior: aiEvaluation.coveredRequirementBehavior || [],
        unsupported_assumptions: aiEvaluation.unsupportedAssumptions || []
      }
    };

    const { data: result, error: insertError } = await supabase
      .from('test_case_quality_evaluations')
      .insert([evaluation])
      .select()
      .single();

    if (insertError) throw insertError;

    // Reset the quality_stale flag since it's freshly evaluated
    await supabase.from('test_cases').update({ quality_stale: false }).eq('id', testCaseId);

    const formattedData = {
      id: result.id,
      testCaseId: result.test_case_id,
      completeness: {
        score: result.completeness_score,
        reason: result.suggestions?.completeness_reason || ''
      },
      clarity: {
        score: result.clarity_score,
        reason: result.suggestions?.clarity_reason || ''
      },
      relevance: {
        score: result.relevance_score,
        reason: result.suggestions?.relevance_reason || ''
      },
      consistency: {
        score: result.consistency_score,
        reason: result.suggestions?.consistency_reason || ''
      },
      overall: result.overall_score,
      coveredRequirementBehavior: result.suggestions?.covered_requirement_behavior || [],
      unsupportedAssumptions: result.suggestions?.unsupported_assumptions || [],
      suggestions: result.suggestions?.suggestions || [],
      aiProvider: result.ai_provider,
      aiModel: result.ai_model,
      evaluatedAt: result.evaluated_at
    };

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQualityScore = async (req, res) => {
  try {
    const testCaseId = req.params.id;
    
    const { data, error } = await supabase
      .from('test_case_quality_evaluations')
      .select('*')
      .eq('test_case_id', testCaseId)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    
    if (!data) {
      return res.json({ success: true, data: null });
    }

    const formattedData = {
      id: data.id,
      testCaseId: data.test_case_id,
      completeness: {
        score: data.completeness_score,
        reason: data.suggestions?.completeness_reason || ''
      },
      clarity: {
        score: data.clarity_score,
        reason: data.suggestions?.clarity_reason || ''
      },
      relevance: {
        score: data.relevance_score,
        reason: data.suggestions?.relevance_reason || ''
      },
      consistency: {
        score: data.consistency_score,
        reason: data.suggestions?.consistency_reason || ''
      },
      overall: data.overall_score,
      coveredRequirementBehavior: data.suggestions?.covered_requirement_behavior || [],
      unsupportedAssumptions: data.suggestions?.unsupported_assumptions || [],
      suggestions: data.suggestions?.suggestions || [],
      aiProvider: data.ai_provider,
      aiModel: data.ai_model,
      evaluatedAt: data.evaluated_at
    };

    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
