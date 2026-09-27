const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// [REAL-AI]
//
// This function calls the real Gemini API.
// It must never return a fake or randomized AI response.

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.AI_MODEL || 'gemini-1.5-pro';
    
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  // [AI-GENERATION]
  //
  // Gemini is the Large Language Model used by AI Test Manager.
  //
  // The backend sends an approved requirement to Gemini.
  // Gemini analyzes the natural-language requirement and
  // generates structured test-case candidates.
  //
  // We are NOT training Gemini.
  // We are integrating a pretrained LLM into our application.
  async generateTestCases(requirement, count = 10) {
    if (!this.isConfigured()) {
      throw new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    const prompt = `You are an expert software testing assistant.

Analyze the following approved software requirement.

Requirement:
${requirement.title}
${requirement.description}

Generate ${count} relevant test case candidates.

Include applicable:
- Functional scenarios
- Positive scenarios
- Negative scenarios
- Validation scenarios
- Boundary scenarios
- Business-rule scenarios

Do not invent functionality that is not supported by the requirement.

Return ONLY structured JSON.

Expected format:
{
  "testCases": [
    {
      "title": "...",
      "description": "...",
      "preconditions": "...",
      "testSteps": "...",
      "expectedResult": "...",
      "testType": "Functional",
      "priority": "Medium",
      "risk": "Medium"
    }
  ]
}
`;

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
              preconditions: { type: SchemaType.STRING },
              testSteps: { type: SchemaType.STRING },
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

  // [AI-EVALUATION]
  //
  // Gemini evaluates test-case quality against the
  // original requirement.
  async evaluateQuality(requirement, testCase, ruleFindings) {
    if (!this.isConfigured()) {
      throw new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    const prompt = `You are a software testing quality reviewer.

Evaluate the following test case against the requirement.

Requirement:
${requirement.title}
${requirement.description}

Test Case:
Title: ${testCase.title}
Description: ${testCase.description}
Preconditions: ${testCase.preconditions}
Test Steps: ${testCase.testSteps || testCase.test_steps}
Expected Result: ${testCase.expectedResult || testCase.expected_result}

Deterministic rule findings:
${ruleFindings}

Evaluate:
1. Completeness
2. Clarity
3. Relevance
4. Consistency

Return scores from 0 to 100.

Also explain:
- what the test case covers
- what requirement behavior is missing
- unsupported assumptions
- improvement suggestions

Return structured JSON only.
Do not approve or reject the test case automatically.`;

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        completenessScore: { type: SchemaType.INTEGER },
        clarityScore: { type: SchemaType.INTEGER },
        relevanceScore: { type: SchemaType.INTEGER },
        consistencyScore: { type: SchemaType.INTEGER },
        overallScore: { type: SchemaType.INTEGER },
        suggestions: { 
            type: SchemaType.ARRAY, 
            items: { type: SchemaType.STRING } 
        },
        coveredRequirementBehavior: { type: SchemaType.STRING },
        unsupportedAssumptions: { type: SchemaType.STRING }
      },
      required: ['completenessScore', 'clarityScore', 'relevanceScore', 'consistencyScore', 'overallScore', 'suggestions', 'coveredRequirementBehavior', 'unsupportedAssumptions']
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
      throw new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
    }

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    const prompt = `Analyze requirement coverage.

Requirement:
${requirement.title}
${requirement.description}

Test Case:
${testCase.title}
${testCase.test_steps}
${testCase.expected_result}

Determine coverageType: Full, Partial, or None.`;

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
      throw new Error('AI Provider is not configured (missing GEMINI_API_KEY).');
    }
    const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}

module.exports = new GeminiProvider();
