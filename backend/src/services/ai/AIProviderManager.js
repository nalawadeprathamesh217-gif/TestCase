const { classifyError } = require('./aiErrors');
const { 
  validateTestCases, 
  validateQualityEvaluation, 
  validateCoverage 
} = require('./structuredOutputValidator');
const GeminiProvider = require('./GeminiProvider');
const GroqProvider = require('./GroqProvider');
const OpenRouterProvider = require('./OpenRouterProvider');
const MistralProvider = require('./MistralProvider');

class AIProviderManager {
  constructor() {
    // Exact order required: Gemini -> Groq -> OpenRouter -> Mistral
    this.providers = [
      { provider: GeminiProvider, level: 0 },
      { provider: GroqProvider, level: 1 },
      { provider: OpenRouterProvider, level: 2 },
      { provider: MistralProvider, level: 3 }
    ];
  }

  async _executeWithFailover(operationName, args, validator) {
    const attemptedProviders = [];
    const providerStatus = {};
    let finalProvider = null;
    let finalModel = null;
    let fallbackLevel = 0;
    const primaryProviderName = this.providers[0].provider.getProviderName();

    for (let i = 0; i < this.providers.length; i++) {
      const { provider, level } = this.providers[i];
      
      if (!provider.isConfigured()) {
        console.log(`[AI] Provider ${i + 1}/4: ${provider.getProviderName()} -> NOT CONFIGURED`);
        providerStatus[provider.getProviderName()] = 'skipped: not configured';
        continue;
      }

      console.log(`[AI] Provider ${i + 1}/4: ${provider.getProviderName()}`);
      attemptedProviders.push(provider.getProviderName());

      const maxRetries = 2; // For 503/timeout
      let attempt = 1;
      let success = false;
      let result = null;

      while (attempt <= maxRetries) {
        try {
          result = await provider[operationName](...args);
          if (validator) {
            result = validator(result);
          }
          success = true;
          break; // Success
        } catch (error) {
          const classified = classifyError(error);
          
          if (classified.isQuotaExceeded) { // 429
            console.log(`[AI] ${provider.getProviderName()} failed: RATE_LIMIT`);
            providerStatus[provider.getProviderName()] = 'failed: 429';
            break; // Move to next provider immediately (do not retry 429)
          }
          
          if (classified.code === 'AI_CONFIGURATION_ERROR' || classified.code === 'AI_PROVIDER_UNAVAILABLE') {
            if (classified.code === 'AI_PROVIDER_UNAVAILABLE' && attempt < maxRetries) {
              console.log(`[AI] ${provider.getProviderName()} failed temporarily. Retrying attempt ${attempt + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              attempt++;
              continue;
            }
            console.log(`[AI] ${provider.getProviderName()} failed: ${error.status || 500}`);
            providerStatus[provider.getProviderName()] = `failed: ${error.status || 500}`;
            break; // Move to next provider
          }
          
          // Other generic failures or malformed outputs
          console.log(`[AI] ${provider.getProviderName()} failed: ${error.message}`);
          providerStatus[provider.getProviderName()] = `failed: ${error.status || 500}`;
          break; // Move to next provider
        }
      }

      if (success) {
        if (level > 0) {
          console.log(`[AI] Primary provider failed. Switching to fallback provider`);
          console.log(`[AI] Fallback provider: ${provider.getProviderName()}`);
        }
        console.log(`[AI] ${provider.getProviderName()} succeeded`);
        console.log(`[AI] Final provider: ${provider.getProviderName()}`);
        
        finalProvider = provider.getProviderName();
        finalModel = provider.getModelName();
        fallbackLevel = level;
        providerStatus[provider.getProviderName()] = 'success';
        
        return {
          result,
          metadata: {
            primary_provider: primaryProviderName,
            attempted_providers: attemptedProviders,
            final_provider: finalProvider,
            final_model: finalModel,
            fallback_level: fallbackLevel,
            provider_status: providerStatus,
            generation_status: 'completed'
          }
        };
      } else {
        console.log(`[AI] Provider ${i + 1}/4: ${provider.getProviderName()} -> FAILED`);
      }
    }

    // If we get here, all providers failed
    const error = new Error("All configured AI providers are currently unavailable. No data was generated.");
    error.code = 'ALL_AI_PROVIDERS_FAILED';
    error.status = 503;
    error.metadata = {
      primary_provider: primaryProviderName,
      attempted_providers: attemptedProviders,
      provider_status: providerStatus,
      generation_status: 'failed'
    };
    throw error;
  }

  async generateTestCases(requirement, count = 10) {
    return this._executeWithFailover(
      'generateTestCases',
      [requirement, count],
      (data) => validateTestCases(data, count)
    );
  }

  async evaluateQuality(requirement, testCase, ruleFindings) {
    return this._executeWithFailover(
      'evaluateQuality',
      [requirement, testCase, ruleFindings],
      validateQualityEvaluation
    );
  }

  async getRequirementCoverage(requirement, testCase) {
    return this._executeWithFailover(
      'getRequirementCoverage',
      [requirement, testCase],
      validateCoverage
    );
  }

  async createEmbedding(text) {
    // Embeddings logic remains Gemini-only usually, or generic
    return this.providers[0].provider.createEmbedding(text);
  }
}

module.exports = new AIProviderManager();
