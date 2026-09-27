const express = require('express');
const router = express.Router();
const testCaseController = require('../controllers/testCaseController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', testCaseController.getTestCases);
router.get('/:id', testCaseController.getTestCaseById);

router.post('/', requireRole(['admin', 'tester']), testCaseController.createTestCase);
router.put('/:id', requireRole(['admin', 'tester']), testCaseController.updateTestCase);
router.delete('/:id', requireRole(['admin', 'tester']), testCaseController.deleteTestCase);

router.post('/:id/executions', requireRole(['admin', 'tester']), testCaseController.executeTestCase);

module.exports = router;
