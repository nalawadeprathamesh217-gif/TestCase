const supabase = require('../config/supabase');

exports.globalSearch = async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q) return res.json({ success: true, data: { test_cases: [], requirements: [] } });

    let testCases = [];
    let requirements = [];

    // Format query for websearch_to_tsquery (handles spaces, operators naturally)
    // or phraseto_tsquery for exact phrase. We'll use plainto_tsquery.
    const tsQuery = q.trim().replace(/\s+/g, ' & ');

    if (!type || type === 'test_case') {
      const { data, error } = await supabase
        .from('test_cases')
        .select('id, test_case_id, title, status, priority, risk')
        .textSearch('search_vector', tsQuery, { config: 'english' })
        .limit(10);
      if (!error) testCases = data;
    }

    if (!type || type === 'requirement') {
      const { data, error } = await supabase
        .from('requirements')
        .select('id, requirement_id, title, status, priority')
        .textSearch('search_vector', tsQuery, { config: 'english' })
        .limit(10);
      if (!error) requirements = data;
    }

    res.json({ success: true, data: { test_cases: testCases, requirements } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.advancedTestCaseSearch = async (req, res) => {
  try {
    const { 
      q, requirement_id, test_type, priority, risk, status, 
      quality_min, quality_max, duplicate_status, source_type,
      page = 1, limit = 25, sort = 'updated_at', order = 'desc'
    } = req.query;

    let query = supabase.from('test_cases').select('*, requirements(title, requirement_id)', { count: 'exact' });

    if (q) {
      const tsQuery = q.trim().replace(/\s+/g, ' & ');
      query = query.textSearch('search_vector', tsQuery, { config: 'english' });
    }
    
    if (requirement_id) query = query.eq('requirement_id', requirement_id);
    if (test_type) query = query.eq('test_type', test_type);
    if (priority) query = query.eq('priority', priority);
    if (risk) query = query.eq('risk', risk);
    if (status) query = query.eq('status', status);
    if (source_type) query = query.eq('source_type', source_type);

    // Sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ 
      success: true, 
      data: {
        items: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
