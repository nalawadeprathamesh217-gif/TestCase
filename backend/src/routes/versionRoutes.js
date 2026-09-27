const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/:id/versions', versionController.getVersions);
router.get('/:id/versions/compare', versionController.compareVersions);
router.get('/:id/versions/:versionNumber', versionController.getVersion);
router.post('/:id/versions/:versionNumber/restore', requireRole(['admin', 'tester', 'test_manager']), versionController.restoreVersion);

module.exports = router;
