const supabase = require('../config/supabase');

// [AI-DEFECT]
// ============================================================
// AI FEATURE: DEFECT ANALYSIS (Future Enhancement)
// ============================================================
//
// When fully implemented, the AI receives:
// Requirement, Test Case, Expected Result, Actual Result, Execution Info.
//
// It analyzes the failure and provides:
// - possible cause
// - suggested severity
// - suggested priority
// - investigation suggestions
//
// IMPORTANT:
// These are AI suggestions. The tester/test manager makes the final decision.
// The AI must not automatically close, resolve, or approve a defect.

// Get all defects with pagination and filtering
exports.getDefects = async (req, res, next) => {
  try {
    const { status, severity, priority, assigned_to, reported_by, test_case_id, search, limit = 25, offset = 0 } = req.query;

    let query = supabase
      .from('defects')
      .select(`
        *,
        assigned_profile:assigned_to(full_name, email),
        reported_profile:reported_by(full_name, email),
        test_case:test_case_id(title, test_case_key)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    if (priority) query = query.eq('priority', priority);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (reported_by) query = query.eq('reported_by', reported_by);
    if (test_case_id) query = query.eq('test_case_id', test_case_id);
    if (search) {
      query = query.or(`title.ilike.%${search}%,defect_key.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ success: true, data, count });
  } catch (error) {
    next(error);
  }
};

// Get a single defect
exports.getDefectById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('defects')
      .select(`
        *,
        assigned_profile:assigned_to(full_name, email),
        reported_profile:reported_by(full_name, email),
        test_case:test_case_id(title, test_case_key),
        requirement:requirement_id(title, requirement_key)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Create a defect
exports.createDefect = async (req, res, next) => {
  try {
    const defectData = {
      ...req.body,
      reported_by: req.user.id,
    };

    const { data, error } = await supabase
      .from('defects')
      .insert(defectData)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DEFECT_CREATED',
      entity_type: 'defect',
      entity_id: data.id,
      description: `Created defect ${data.defect_key}: ${data.title}`
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Update defect
exports.updateDefect = async (req, res, next) => {
  try {
    const allowedUpdates = ['title', 'description', 'severity', 'priority', 'status', 'assigned_to', 'steps_to_reproduce', 'resolution'];
    const updateData = { updated_at: new Date().toISOString() };
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    if (updateData.status === 'Resolved' || updateData.status === 'Closed') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('defects')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DEFECT_UPDATED',
      entity_type: 'defect',
      entity_id: data.id,
      description: `Updated defect ${data.defect_key}`
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Reopen defect
exports.reopenDefect = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('defects')
      .update({
        status: 'Reopened',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'DEFECT_REOPENED',
      entity_type: 'defect',
      entity_id: data.id,
      description: `Reopened defect ${data.defect_key}`
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
