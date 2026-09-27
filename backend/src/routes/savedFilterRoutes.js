const express = require('express');
const router = express.Router();
const savedFilterController = require('../controllers/savedFilterController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', savedFilterController.getFilters);
router.post('/', savedFilterController.createFilter);
router.delete('/:id', savedFilterController.deleteFilter);

module.exports = router;
