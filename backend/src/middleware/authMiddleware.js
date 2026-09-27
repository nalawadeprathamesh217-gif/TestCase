const supabase = require('../config/supabase');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    // In a real app, you would verify the JWT signature here securely.
    // For simplicity using Supabase, we can use getUser. 
    // However, the best practice is to verify the JWT on the backend using the JWT secret.
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Fetch user profile to get role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(403).json({ success: false, message: 'Forbidden: Role not found' });
      }

      if (!roles.includes(profile.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      }

      req.user.role = profile.role;
      next();
    } catch (error) {
      console.error('Role Middleware Error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
};

const requireAdmin = requireRole(['admin']);
const requireTestManager = requireRole(['admin', 'test_manager']);

module.exports = { requireAuth, requireRole, requireAdmin, requireTestManager };
