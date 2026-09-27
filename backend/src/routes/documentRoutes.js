const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const documentController = require('../controllers/documentController');

// Multer config for file upload - keeping it in memory for processing and streaming to Supabase
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: process.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 || 25 * 1024 * 1024 } 
});

router.use(requireAuth);

router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/chunks', documentController.getDocumentChunks);

router.post('/', requireRole(['admin', 'tester']), upload.single('file'), documentController.uploadDocument);
router.post('/:id/process', requireRole(['admin', 'tester']), documentController.processDocument);
router.delete('/:id', requireRole(['admin', 'tester']), documentController.deleteDocument);

module.exports = router;
