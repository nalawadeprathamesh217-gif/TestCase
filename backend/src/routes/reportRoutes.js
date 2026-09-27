const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/qa-summary', reportController.getQaSummary);

module.exports = router;
