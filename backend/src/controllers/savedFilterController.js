const supabase = require('../config/supabase');

exports.getFilters = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_filters')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFilter = async (req, res) => {
  try {
    const { name, entity_type, filter_config } = req.body;
    
    const { data, error } = await supabase
      .from('saved_filters')
      .insert([{
        user_id: req.user.id,
        name,
        entity_type,
        filter_config
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFilter = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('saved_filters')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id); // extra security check

    if (error) throw error;
    res.json({ success: true, message: 'Filter deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
