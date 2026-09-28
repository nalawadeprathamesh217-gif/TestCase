function validateTestCases(data, count) {
  if (!data || !data.testCases || !Array.isArray(data.testCases)) {
    throw new Error('Invalid response structure: expected testCases array');
  }
  
  if (data.testCases.length === 0) {
    throw new Error('Invalid response: testCases array is empty');
  }

  data.testCases.forEach((tc, index) => {
    if (!tc.title) throw new Error(`Test case ${index} missing title`);
    if (!tc.expectedResult && !tc.expected_result) throw new Error(`Test case ${index} missing expectedResult`);
    if (!tc.testSteps && !tc.test_steps) throw new Error(`Test case ${index} missing testSteps`);
  });

  return data;
}

function validateQualityEvaluation(data) {
  if (!data) throw new Error('Invalid response structure');
  
  const requiredFields = [
    'completeness', 'clarity', 'relevance', 
    'consistency', 'overall', 'suggestions', 
    'coveredRequirementBehavior', 'unsupportedAssumptions'
  ];

  for (const field of requiredFields) {
    // If the old flat format is returned, it will be handled safely by the controller.
    // For validation, we check for either nested or flat.
    if (data[field] === undefined && data[`${field}Score`] === undefined) {
      throw new Error(`Quality evaluation missing field: ${field}`);
    }
  }

  return data;
}

function validateCoverage(data) {
  if (!data) throw new Error('Invalid response structure');

  const required = [
    'coverageType', 'coveredBehavior', 'coverageReason', 
    'coverageScore', 'unsupportedAssumptions'
  ];

  for (const field of required) {
    if (data[field] === undefined) {
      throw new Error(`Coverage missing field: ${field}`);
    }
  }

  return data;
}

module.exports = {
  validateTestCases,
  validateQualityEvaluation,
  validateCoverage
};
