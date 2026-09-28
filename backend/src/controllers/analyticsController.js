const supabase = require('../config/supabase');

exports.getOverview = async (req, res) => {
  try {
    const { from, to } = req.query; // Used for date filtering if provided

    let reqQuery = supabase.from('requirements').select('*', { count: 'exact' });
    let tcQuery = supabase.from('test_cases').select('*', { count: 'exact' });

    if (from) {
      reqQuery = reqQuery.gte('created_at', from);
      tcQuery = tcQuery.gte('created_at', from);
    }
    if (to) {
      reqQuery = reqQuery.lte('created_at', to);
      tcQuery = tcQuery.lte('created_at', to);
    }

    const [reqs, tcs] = await Promise.all([reqQuery, tcQuery]);

    // Requirements aggregation
    const reqData = reqs.data || [];
    const reqTotal = reqs.count || 0;
    const reqApproved = reqData.filter(r => r.status === 'Approved').length;
    const reqDraft = reqData.filter(r => r.status === 'Draft').length;

    // Test Cases aggregation
    const tcData = tcs.data || [];
    const tcTotal = tcs.count || 0;
    const tcApproved = tcData.filter(tc => tc.status === 'Approved').length;
    const tcDraft = tcData.filter(tc => tc.status === 'Draft').length;

    // Execution aggregation
    const passed = tcData.filter(tc => tc.execution_result === 'Passed').length;
    const failed = tcData.filter(tc => tc.execution_result === 'Failed').length;
    const blocked = tcData.filter(tc => tc.execution_result === 'Blocked').length;
    const notExecuted = tcData.filter(tc => tc.execution_result === 'Not Executed').length;

    // Coverage aggregation
    const activeReqs = reqData.filter(r => r.status !== 'Archived');
    const coveredReqIds = new Set(tcData.filter(tc => tc.status !== 'Archived' && tc.requirement_id).map(tc => tc.requirement_id));
    
    let covered = 0;
    activeReqs.forEach(r => {
      if (coveredReqIds.has(r.id)) covered++;
    });
    
    const uncovered = activeReqs.length - covered;
    const coveragePercentage = activeReqs.length > 0 ? ((covered / activeReqs.length) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        requirements: { total: reqTotal, approved: reqApproved, draft: reqDraft },
        testCases: { total: tcTotal, approved: tcApproved, draft: tcDraft },
        execution: { passed, failed, blocked, notExecuted },
        coverage: { covered, uncovered, percentage: parseFloat(coveragePercentage) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExecution = async (req, res) => {
  try {
    const { data, error } = await supabase.from('test_cases').select('execution_result, test_type');
    if (error) throw error;
    
    // Distribute by test type
    const byType = {};
    data.forEach(tc => {
      if (!byType[tc.test_type]) byType[tc.test_type] = { passed: 0, failed: 0, blocked: 0, total: 0 };
      if (tc.execution_result === 'Passed') byType[tc.test_type].passed++;
      if (tc.execution_result === 'Failed') byType[tc.test_type].failed++;
      if (tc.execution_result === 'Blocked') byType[tc.test_type].blocked++;
      byType[tc.test_type].total++;
    });

    res.json({ success: true, data: { byType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuality = async (req, res) => {
  try {
    const { data, error } = await supabase.from('test_case_quality_evaluations').select('overall_score, completeness_score, clarity_score, relevance_score, consistency_score');
    if (error) throw error;
    
    let total = 0, comp = 0, clar = 0, rel = 0, cons = 0;
    const distribution = { excellent: 0, good: 0, needs_improvement: 0, poor: 0 };
    
    data.forEach(q => {
      total += q.overall_score;
      comp += q.completeness_score;
      clar += q.clarity_score;
      rel += q.relevance_score;
      cons += q.consistency_score;
      
      if (q.overall_score >= 90) distribution.excellent++;
      else if (q.overall_score >= 75) distribution.good++;
      else if (q.overall_score >= 50) distribution.needs_improvement++;
      else distribution.poor++;
    });

    const count = data.length || 1; // avoid division by zero
    
    res.json({ 
      success: true, 
      data: {
        average: {
          overall: Math.round(total / count),
          completeness: Math.round(comp / count),
          clarity: Math.round(clar / count),
          relevance: Math.round(rel / count),
          consistency: Math.round(cons / count),
        },
        distribution,
        evaluated_count: data.length
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRequirements = async (req, res) => {
  try {
    const { data, error } = await supabase.from('requirements').select('status, priority');
    if (error) throw error;
    
    const byStatus = { Draft: 0, 'Under Review': 0, Approved: 0, Rejected: 0, Archived: 0 };
    const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    
    data.forEach(r => {
      if (byStatus[r.status] !== undefined) byStatus[r.status]++;
      if (byPriority[r.priority] !== undefined) byPriority[r.priority]++;
    });

    res.json({ success: true, data: { byStatus, byPriority, total: data.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDuplicates = async (req, res) => {
  try {
    const { data, error } = await supabase.from('test_case_duplicates').select('review_status, similarity_score');
    if (error) throw error;
    
    const byStatus = { pending: 0, confirmed: 0, not_duplicate: 0, dismissed: 0 };
    let exact = 0;
    let semantic = 0;
    
    data.forEach(d => {
      const st = d.review_status || 'pending';
      if (byStatus[st] !== undefined) byStatus[st]++;
      if (d.similarity_score > 0.98) exact++;
      else semantic++;
    });

    res.json({ success: true, data: { byStatus, types: { exact, semantic }, total: data.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAi = async (req, res) => {
  try {
    const [runsRes, candsRes] = await Promise.all([
      supabase.from('test_case_generation_runs').select('id, ai_provider, status, requested_count'),
      supabase.from('test_case_generation_candidates').select('id, review_status')
    ]);
    
    if (runsRes.error) throw runsRes.error;
    if (candsRes.error) throw candsRes.error;
    
    const runs = runsRes.data || [];
    const candidates = candsRes.data || [];
    
    const overview = {
      runs: runs.length,
      candidates: candidates.length,
      accepted: candidates.filter(c => c.review_status === 'Accepted').length,
      rejected: candidates.filter(c => c.review_status === 'Rejected').length,
      edited: candidates.filter(c => c.review_status === 'Edited').length
    };
    
    const providers = {};
    runs.forEach(r => {
      const p = r.ai_provider || 'Unknown';
      if (!providers[p]) providers[p] = 0;
      providers[p]++;
    });

    res.json({ success: true, data: { overview, providers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
