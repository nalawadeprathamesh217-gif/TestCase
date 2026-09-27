const express = require('express');
const router = express.Router();
const aiGenerationController = require('../controllers/aiGenerationController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/:id/generate-test-cases', requireRole(['admin', 'tester', 'test_manager']), aiGenerationController.generateTestCases);
router.get('/:id/generation-history', aiGenerationController.getGenerationHistory);

module.exports = router;
