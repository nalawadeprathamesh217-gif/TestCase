const AIProvider = require('./AIProvider');
const { 
  buildTestCaseGenerationPrompt, 
  buildQualityEvaluationPrompt, 
  buildCoveragePrompt 
} = require('./prompts');

class OpenRouterProvider extends AIProvider {
  constructor() {
    super();
    this.enabled = process.env.AI_OPENROUTER_ENABLED === 'true';
    this.providerName = 'openrouter';
    this.modelName = process.env.OPENROUTER_MODEL || 'openrouter/free';
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  isConfigured() {
    return this.enabled && !!this.apiKey && !!this.modelName;
  }

  getProviderName() {
    return this.providerName;
  }

  getModelName() {
    return this.modelName;
  }

  async _callOpenAICompatibleAPI(prompt) {
    if (!this.isConfigured()) {
      const err = new Error('OpenRouter Provider is not configured.');
      err.status = 401;
      throw err;
    }

    if (process.env.AI_FAILOVER_TEST_MODE === 'true' && process.env.AI_FAIL_OPENROUTER === 'true') {
      const err = new Error('Simulated OpenRouter Failure');
      err.status = 503;
      throw err;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'http://localhost:5000'
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are an AI assistant. You must always return your response in valid JSON format. Do NOT wrap in markdown code blocks.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
      err.status = response.status;
      err.details = errorText;
      throw err;
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    content = content.trim();
    if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(content);
  }

  async generateTestCases(requirement, count = 10) {
    const prompt = buildTestCaseGenerationPrompt(requirement, count);
    return this._callOpenAICompatibleAPI(prompt);
  }

  async evaluateQuality(requirement, testCase, ruleFindings) {
    const prompt = buildQualityEvaluationPrompt(requirement, testCase, ruleFindings);
    return this._callOpenAICompatibleAPI(prompt);
  }

  async getRequirementCoverage(requirement, testCase) {
    const prompt = buildCoveragePrompt(requirement, testCase);
    return this._callOpenAICompatibleAPI(prompt);
  }

  async createEmbedding(text) {
    throw new Error('Embeddings not supported by OpenRouterProvider');
  }
}

module.exports = new OpenRouterProvider();
