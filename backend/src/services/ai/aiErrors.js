class AIError extends Error {
  constructor(message, code, isTransient, isQuotaExceeded) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.isTransient = isTransient;
    this.isQuotaExceeded = isQuotaExceeded;
  }
}

function classifyError(error) {
  const status = error.status || error.statusCode || error.response?.status;
  const message = error.message?.toLowerCase() || '';

  // Quota exceeded
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
    return new AIError(error.message, 'AI_QUOTA_EXCEEDED', false, true);
  }

  // Transient errors
  if (
    status === 408 || 
    status === 502 || 
    status === 503 || 
    status === 504 || 
    message.includes('timeout') ||
    message.includes('fetch error') ||
    message.includes('econnreset')
  ) {
    return new AIError(error.message, 'AI_PROVIDER_UNAVAILABLE', true, false);
  }

  // Permanent/Configuration errors (400, 401, 403)
  if (status === 400 || status === 401 || status === 403) {
    return new AIError(error.message, 'AI_CONFIGURATION_ERROR', false, false);
  }

  // Default to non-transient error
  return new AIError(error.message, 'AI_GENERATION_FAILED', false, false);
}

module.exports = {
  AIError,
  classifyError
};
