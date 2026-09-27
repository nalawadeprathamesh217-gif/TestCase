const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

exports.getVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('test_case_versions')
      .select('*, created_by:profiles(id, name, email)')
      .eq('test_case_id', id)
      .order('version_number', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const { data, error } = await supabase
      .from('test_case_versions')
      .select('*, created_by:profiles(id, name, email)')
      .eq('test_case_id', id)
      .eq('version_number', versionNumber)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.compareVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const { data: vFrom, error: errFrom } = await supabase.from('test_case_versions').select('*').eq('test_case_id', id).eq('version_number', from).single();
    const { data: vTo, error: errTo } = await supabase.from('test_case_versions').select('*').eq('test_case_id', id).eq('version_number', to).single();

    if (errFrom || errTo) throw new Error('Versions not found');

    const changedFields = [];
    const fieldsToCompare = ['title', 'description', 'test_steps', 'expected_result', 'priority', 'risk', 'status', 'test_type'];
    
    fieldsToCompare.forEach(field => {
      const vFromStr = typeof vFrom[field] === 'object' ? JSON.stringify(vFrom[field]) : vFrom[field];
      const vToStr = typeof vTo[field] === 'object' ? JSON.stringify(vTo[field]) : vTo[field];
      if (vFromStr !== vToStr) {
        changedFields.push({ field, old: vFrom[field], new: vTo[field] });
      }
    });

    res.json({ success: true, data: { from: vFrom, to: vTo, differences: changedFields } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.restoreVersion = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;

    // 1. Get the target version
    const { data: targetVersion, error: fetchErr } = await supabase
      .from('test_case_versions')
      .select('*')
      .eq('test_case_id', id)
      .eq('version_number', versionNumber)
      .single();

    if (fetchErr || !targetVersion) throw new Error('Version not found');

    // 2. Find the current max version number
    const { data: latestVersion, error: maxErr } = await supabase
      .from('test_case_versions')
      .select('version_number')
      .eq('test_case_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

    // 3. Create the new version
    const newVersion = {
      ...targetVersion,
      id: uuidv4(),
      version_number: nextVersionNumber,
      change_type: 'Restored',
      change_summary: `Restored test case from version ${versionNumber}.`,
      changed_fields: [],
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };
    
    // Remove the original ID and created_at from the spread object to avoid conflicts
    delete newVersion.id;

    const { error: insertErr } = await supabase.from('test_case_versions').insert([newVersion]);
    if (insertErr) throw insertErr;

    // 4. Update the actual test case
    const tcUpdate = {
      title: targetVersion.title,
      description: targetVersion.description,
      preconditions: targetVersion.preconditions,
      test_steps: targetVersion.test_steps,
      expected_result: targetVersion.expected_result,
      test_type: targetVersion.test_type,
      priority: targetVersion.priority,
      risk: targetVersion.risk,
      status: targetVersion.status,
      quality_stale: true,
      duplicates_stale: true,
      version_count: nextVersionNumber,
      updated_at: new Date().toISOString()
    };

    const { data: updatedTc, error: tcErr } = await supabase.from('test_cases').update(tcUpdate).eq('id', id).select().single();
    if (tcErr) throw tcErr;

    res.json({ success: true, data: { version: nextVersionNumber, test_case: updatedTc } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
