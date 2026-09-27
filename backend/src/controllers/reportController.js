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
