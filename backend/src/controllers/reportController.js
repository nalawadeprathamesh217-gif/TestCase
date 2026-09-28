const supabase = require('../config/supabase');

exports.getQaSummary = async (req, res) => {
  try {
    const { data: reqs } = await supabase.from('requirements').select('status');
    const { data: tcs } = await supabase.from('test_cases').select('status, execution_result');
    const { data: quals } = await supabase.from('test_case_quality_evaluations').select('overall_score');
    const { data: dups } = await supabase.from('test_case_duplicates').select('id');
    
    res.json({
      success: true,
      data: {
        requirements: reqs ? reqs.length : 0,
        test_cases: tcs ? tcs.length : 0,
        executed: tcs ? tcs.filter(t => t.execution_result !== 'Not Executed').length : 0,
        passed: tcs ? tcs.filter(t => t.execution_result === 'Passed').length : 0,
        average_quality: quals && quals.length > 0 ? (quals.reduce((a, b) => a + b.overall_score, 0) / quals.length).toFixed(1) : 0,
        duplicates_flagged: dups ? dups.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExecutionReport = async (req, res) => {
  try {
    const { data: executions, error } = await supabase
      .from('test_case_executions')
      .select(`
        id, execution_result, actual_result, environment, browser, comments, executed_at,
        test_cases (test_case_id, title, requirement_id),
        profiles (full_name)
      `)
      .order('executed_at', { ascending: false });
      
    if (error) throw error;
    
    // For requirement tracking
    const { data: requirements } = await supabase.from('requirements').select('id, requirement_id');
    const reqMap = (requirements || []).reduce((acc, r) => {
      acc[r.id] = r.requirement_id;
      return acc;
    }, {});
    
    const formatted = (executions || []).map(ex => ({
      test_case_id: ex.test_cases?.test_case_id || 'Unknown',
      title: ex.test_cases?.title || 'Unknown',
      requirement_id: reqMap[ex.test_cases?.requirement_id] || 'N/A',
      result: ex.execution_result,
      environment: ex.environment || 'N/A',
      browser: ex.browser || 'N/A',
      actual_result: ex.actual_result || '',
      comments: ex.comments || '',
      executed_by: ex.profiles?.full_name || 'System',
      executed_at: ex.executed_at
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTestQualityReport = async (req, res) => {
  try {
    const { data: quality, error } = await supabase
      .from('test_case_quality_evaluations')
      .select(`
        id, completeness_score, clarity_score, relevance_score, consistency_score, overall_score,
        evaluation_method, ai_provider, ai_model, created_at,
        test_cases (test_case_id, title)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const formatted = (quality || []).map(q => ({
      test_case_id: q.test_cases?.test_case_id || 'Unknown',
      title: q.test_cases?.title || 'Unknown',
      completeness: q.completeness_score,
      clarity: q.clarity_score,
      relevance: q.relevance_score,
      consistency: q.consistency_score,
      overall_score: q.overall_score,
      evaluation_method: q.evaluation_method || 'AI',
      ai_provider: q.ai_provider || 'Unknown',
      ai_model: q.ai_model || 'Unknown',
      evaluated_at: q.created_at
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
