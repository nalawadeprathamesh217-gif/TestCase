const express = require('express');
const router = express.Router();
const requirementController = require('../controllers/requirementController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// All requirement routes require authentication
router.use(requireAuth);

router.get('/', requirementController.getRequirements);
router.get('/:id', requirementController.getRequirementById);

// Only admins and testers can modify requirements
router.post('/', requireRole(['admin', 'tester']), requirementController.createRequirement);
router.put('/:id', requireRole(['admin', 'tester']), requirementController.updateRequirement);
router.delete('/:id', requireRole(['admin', 'tester']), requirementController.deleteRequirement);

module.exports = router;
