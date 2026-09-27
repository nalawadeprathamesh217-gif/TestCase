const express = require('express');
const router = express.Router();
const duplicateController = require('../controllers/duplicateController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/check', requireAuth, duplicateController.findDuplicates);
router.get('/queue', requireAuth, duplicateController.getReviewQueue);
router.put('/:id/review', requireAuth, duplicateController.reviewDuplicate);

module.exports = router;
