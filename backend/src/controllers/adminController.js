const supabase = require('../config/supabase');

exports.getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id, full_name, email, role, status, created_at, last_sign_in_at');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'test_manager', 'tester'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single();
    if (error) throw error;
    
    res.json({ success: true, data, message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select().single();
    if (error) throw error;
    
    res.json({ success: true, data, message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    // Check DB
    const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
    
    res.json({
      success: true,
      data: {
        api: 'Healthy',
        database: dbError ? 'Unavailable' : 'Healthy',
        storage: 'Healthy',
        ai_provider: process.env.GEMINI_API_KEY ? 'Configured' : 'Not Configured'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
