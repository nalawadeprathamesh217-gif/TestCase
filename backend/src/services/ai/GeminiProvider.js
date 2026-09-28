const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const { 
  buildTestCaseGenerationPrompt, 
  buildQualityEvaluationPrompt, 
  buildCoveragePrompt 
} = require('./prompts');
const AIProvider = require('./AIProvider');

// [REAL-AI]
//
// This function calls the real Gemini API.
// It must never return a fake or randomized AI response.

class GeminiProvider extends AIProvider {
  constructor() {
    super();
    this.providerName = process.env.AI_PROVIDER || 'gemini';
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.AI_MODEL || 'gemini-3.5-flash';
    
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  getProviderName() {
    return this.providerName;
  }

  getModelName() {
    return this.modelName;
  }

  async generateTestCases(requirement, count = 10) {
    if (!this.isConfigured()) {
      const err = new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
      err.status = 401; 
      throw err;
    }
    
    if (process.env.AI_FAILOVER_TEST_MODE === 'true' && process.env.AI_FAIL_GEMINI === 'true') {
      const err = new Error('Simulated Gemini Failure');
      err.status = 503;
      throw err;
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const prompt = buildTestCaseGenerationPrompt(requirement, count);

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        testCases: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              preconditions: { 
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              testSteps: { 
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              expectedResult: { type: SchemaType.STRING },
              testType: { type: SchemaType.STRING },
              priority: { type: SchemaType.STRING },
              risk: { type: SchemaType.STRING }
            },
            required: ['title', 'description', 'preconditions', 'testSteps', 'expectedResult', 'testType', 'priority', 'risk']
          }
        }
      },
      required: ['testCases']
    };

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
    });
    
    const responseText = result.response.text();
    return JSON.parse(responseText);
  }

  async evaluateQuality(requirement, testCase, ruleFindings) {
    if (!this.isConfigured()) {
      const err = new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
      err.status = 401;
      throw err;
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const prompt = buildQualityEvaluationPrompt(requirement, testCase, ruleFindings);

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        completeness: {
          type: SchemaType.OBJECT,
          properties: { score: { type: SchemaType.INTEGER }, reason: { type: SchemaType.STRING } }
        },
        clarity: {
          type: SchemaType.OBJECT,
          properties: { score: { type: SchemaType.INTEGER }, reason: { type: SchemaType.STRING } }
        },
        relevance: {
          type: SchemaType.OBJECT,
          properties: { score: { type: SchemaType.INTEGER }, reason: { type: SchemaType.STRING } }
        },
        consistency: {
          type: SchemaType.OBJECT,
          properties: { score: { type: SchemaType.INTEGER }, reason: { type: SchemaType.STRING } }
        },
        overall: { type: SchemaType.INTEGER },
        suggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        coveredRequirementBehavior: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        unsupportedAssumptions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      },
      required: ['completeness', 'clarity', 'relevance', 'consistency', 'overall', 'suggestions', 'coveredRequirementBehavior', 'unsupportedAssumptions']
    };

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  }

  async getRequirementCoverage(requirement, testCase) {
    if (!this.isConfigured()) {
      const err = new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
      err.status = 401;
      throw err;
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const prompt = buildCoveragePrompt(requirement, testCase);

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        coverageType: { type: SchemaType.STRING },
        coveredBehavior: { type: SchemaType.STRING },
        coverageReason: { type: SchemaType.STRING },
        coverageScore: { type: SchemaType.INTEGER },
        unsupportedAssumptions: { type: SchemaType.STRING }
      },
      required: ['coverageType', 'coveredBehavior', 'coverageReason', 'coverageScore', 'unsupportedAssumptions']
    };

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  }

  async createEmbedding(text) {
    if (!this.isConfigured()) {
      const err = new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
      err.status = 401;
      throw err;
    }
    const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}

module.exports = new GeminiProvider();
