const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/overview', analyticsController.getOverview);
router.get('/execution', analyticsController.getExecution);
router.get('/quality', analyticsController.getQuality);
router.get('/requirements', analyticsController.getRequirements);
router.get('/duplicates', analyticsController.getDuplicates);

module.exports = router;
