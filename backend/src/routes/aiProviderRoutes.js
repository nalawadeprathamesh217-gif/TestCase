const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const AIProviderManager = require('../services/ai/AIProviderManager');

// GET /api/ai/providers/status
router.get('/status', requireAuth, requireRole(['admin']), (req, res) => {
  const providers = AIProviderManager.providers.map(({ provider, level }) => {
    return {
      provider: provider.getProviderName(),
      enabled: provider.enabled || provider.isConfigured(),
      configured: provider.isConfigured(),
      role: level === 0 ? 'primary' : `fallback_${level}`,
      model: provider.getModelName()
    };
  });

  res.json({
    success: true,
    providers
  });
});

// POST /api/ai/providers/test
router.post('/test', requireAuth, requireRole(['admin']), async (req, res) => {
  const { provider: requestedProvider } = req.body;

  if (!['gemini', 'groq', 'openrouter', 'mistral'].includes(requestedProvider)) {
    return res.status(400).json({ success: false, message: 'Invalid provider' });
  }

  const providerObj = AIProviderManager.providers.find(p => p.provider.getProviderName() === requestedProvider);
  if (!providerObj) {
    return res.status(404).json({ success: false, message: 'Provider not found in manager' });
  }

  const provider = providerObj.provider;

  if (!provider.isConfigured()) {
    return res.status(400).json({ success: false, message: 'Provider is not configured' });
  }

  const testRequirement = {
    id: "req-test-001",
    req_number: "REQ-LOGIN-001",
    title: "Login",
    description: "The system shall allow a registered user to log in using a valid email address and password. If the credentials are invalid, the system shall display an appropriate error message."
  };

  const startTime = Date.now();
  try {
    const result = await provider.generateTestCases(testRequirement, 2);
    const endTime = Date.now();

    res.json({
      success: true,
      provider: provider.getProviderName(),
      model: provider.getModelName(),
      responseTimeMs: endTime - startTime,
      result
    });
  } catch (error) {
    const endTime = Date.now();
    res.status(500).json({
      success: false,
      provider: provider.getProviderName(),
      model: provider.getModelName(),
      responseTimeMs: endTime - startTime,
      message: error.message,
      errorType: error.status || 'UNKNOWN'
    });
  }
});

module.exports = router;
