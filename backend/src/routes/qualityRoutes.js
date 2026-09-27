const express = require('express');
const router = express.Router();
const qualityController = require('../controllers/qualityController');
const { requireAuth } = require('../middleware/authMiddleware');

// The route prefix will be /api/test-cases
// so this mounts as /api/test-cases/:id/quality

router.post('/:id/quality/evaluate', requireAuth, qualityController.evaluateQuality);
router.get('/:id/quality', requireAuth, qualityController.getQualityScore);

module.exports = router;
