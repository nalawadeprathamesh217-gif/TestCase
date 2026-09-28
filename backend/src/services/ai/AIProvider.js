class AIProvider {
  constructor() {
    if (this.constructor === AIProvider) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  isConfigured() {
    throw new Error("Method 'isConfigured()' must be implemented.");
  }

  getProviderName() {
    throw new Error("Method 'getProviderName()' must be implemented.");
  }

  getModelName() {
    throw new Error("Method 'getModelName()' must be implemented.");
  }

  async generateTestCases(requirement, count = 10) {
    throw new Error("Method 'generateTestCases()' must be implemented.");
  }

  async evaluateQuality(requirement, testCase, ruleFindings) {
    throw new Error("Method 'evaluateQuality()' must be implemented.");
  }

  async getRequirementCoverage(requirement, testCase) {
    throw new Error("Method 'getRequirementCoverage()' must be implemented.");
  }

  async createEmbedding(text) {
    throw new Error("Method 'createEmbedding()' must be implemented.");
  }
}

module.exports = AIProvider;
