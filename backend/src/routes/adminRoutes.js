const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/system-health', adminController.getSystemHealth);

router.get('/ai-config', (req, res) => {
  res.json({
    success: true,
    data: {
      primaryProvider: process.env.AI_PROVIDER || 'gemini',
      primaryModel: process.env.AI_MODEL || 'gemini-3.5-flash',
      primaryConfigured: !!process.env.GEMINI_API_KEY,
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED === 'true',
      fallbackProvider: process.env.AI_FALLBACK_PROVIDER || 'fallback-provider',
      fallbackModel: process.env.AI_FALLBACK_MODEL || 'fallback-model',
      fallbackConfigured: process.env.AI_FALLBACK_ENABLED === 'true' && !!process.env.AI_FALLBACK_API_KEY
    }
  });
});

module.exports = router;
