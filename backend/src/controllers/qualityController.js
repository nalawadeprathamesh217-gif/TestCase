const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const aiProvider = require('../services/ai/GeminiProvider');

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

      aiEvaluation = await aiProvider.evaluateQuality(requirement, testCase, ruleFindings);
      
      if (!aiEvaluation || typeof aiEvaluation.overallScore !== 'number') {
        throw new Error('Malformed AI quality evaluation response.');
      }
    } catch (aiErr) {
      return res.status(500).json({ success: false, message: 'AI quality evaluation failed. Please try again.' });
    }

    const evaluation = {
      id: uuidv4(),
      test_case_id: testCaseId,
      completeness_score: aiEvaluation.completenessScore,
      clarity_score: aiEvaluation.clarityScore,
      relevance_score: aiEvaluation.relevanceScore,
      consistency_score: aiEvaluation.consistencyScore,
      overall_score: aiEvaluation.overallScore,
      evaluation_method: 'AI',
      ai_provider: 'gemini',
      ai_model: process.env.AI_MODEL || 'gemini-1.5-pro',
      suggestions: aiEvaluation.suggestions || []
    };

    const { data: result, error: insertError } = await supabase
      .from('test_case_quality_evaluations')
      .insert([evaluation])
      .select()
      .single();

    if (insertError) throw insertError;

    // Reset the quality_stale flag since it's freshly evaluated
    await supabase.from('test_cases').update({ quality_stale: false }).eq('id', testCaseId);


    res.status(200).json({ success: true, data: result });
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
    
    res.json({ success: true, data: data || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
