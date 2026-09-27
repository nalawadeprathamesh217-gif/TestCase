const express = require('express');
const router = express.Router();
const defectController = require('../controllers/defectController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', defectController.getDefects);
router.post('/', defectController.createDefect);
router.get('/:id', defectController.getDefectById);
router.put('/:id', defectController.updateDefect);
router.post('/:id/reopen', defectController.reopenDefect);

module.exports = router;
