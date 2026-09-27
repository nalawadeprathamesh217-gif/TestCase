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

module.exports = router;
