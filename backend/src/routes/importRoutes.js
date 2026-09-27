const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { requireAuth } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for memory storage (for processing before sending to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (process.env.MAX_IMPORT_FILE_SIZE_MB || 25) * 1024 * 1024
  }
});

router.use(requireAuth);

router.post('/', upload.single('file'), importController.uploadFile);
router.get('/', importController.listImports);
router.get('/:id', importController.getImport);
router.post('/:id/analyze', importController.analyzeFile);
router.get('/:id/mapping', importController.getMapping);
router.put('/:id/mapping', importController.saveMapping);
router.post('/:id/validate', importController.validateRows);
router.get('/:id/rows', importController.getPreviewRows);
router.post('/:id/check-duplicates', importController.checkDuplicates);
router.post('/:id/import', importController.performImport);

module.exports = router;
