const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', searchController.globalSearch);
router.get('/advanced', searchController.advancedTestCaseSearch);

module.exports = router;
