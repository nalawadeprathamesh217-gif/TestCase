const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(operation, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 2000,
    onRetry = () => {}
  } = options;

  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await operation(attempt);
    } catch (error) {
      const status = error.status || error.statusCode || 500;
      
      const isRetryable = 
        status === 408 ||
        status === 429 ||
        status >= 500 ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('fetch failed');

      if (!isRetryable) {
        throw error; // Permanent error
      }

      if (attempt === maxAttempts) {
        throw error;
      }

      // Add a small random jitter to retry delays (0-500ms)
      const jitter = Math.random() * 500;
      const delay = (baseDelayMs * Math.pow(2, attempt - 1)) + jitter;
      
      await onRetry(error, attempt, delay);
      await sleep(delay);
      attempt++;
    }
  }
}

module.exports = { retryWithBackoff };
