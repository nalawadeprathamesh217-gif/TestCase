module.exports = {
  buildTestCaseGenerationPrompt: (requirement, count) => {
    return `You are an expert software testing assistant.

Analyze the following approved software requirement.

Requirement:
${requirement.title}
${requirement.description}

Generate ${count} relevant test case candidates.

Generate test cases ONLY for the supplied requirement. Do not introduce unrelated application behavior. Do not invent unsupported features, APIs, workflows, business rules, or requirements.

Include applicable:
- Functional scenarios
- Positive scenarios
- Negative scenarios
- Validation scenarios
- Boundary scenarios
- Business-rule scenarios

Return ONLY structured JSON.

Expected format:
{
  "testCases": [
    {
      "title": "...",
      "description": "...",
      "preconditions": ["...", "..."],
      "testSteps": ["...", "..."],
      "expectedResult": "...",
      "testType": "Functional",
      "priority": "Medium",
      "risk": "Medium"
    }
  ]
}
`;
  },
  
  buildQualityEvaluationPrompt: (requirement, testCase, ruleFindings) => {
    return `You are a software testing quality reviewer.

Evaluate the following test case against the requirement.
Evaluate ONLY the supplied requirement and test case.

Do not invent requirements.
Do not assume unsupported application behavior.
Do not reward a test case for testing functionality that is not present in the requirement.

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

Return ONLY structured JSON matching this exact format:
{
  "completeness": {
    "score": 0,
    "reason": ""
  },
  "clarity": {
    "score": 0,
    "reason": ""
  },
  "relevance": {
    "score": 0,
    "reason": ""
  },
  "consistency": {
    "score": 0,
    "reason": ""
  },
  "overall": 0,
  "coveredRequirementBehavior": [],
  "unsupportedAssumptions": [],
  "suggestions": []
}

Do not approve or reject the test case automatically.`;
  },

  buildCoveragePrompt: (requirement, testCase) => {
    return `Analyze requirement coverage.

Requirement:
${requirement.title}
${requirement.description}

Test Case:
${testCase.title}
${testCase.test_steps}
${testCase.expected_result}

Determine coverageType: Full, Partial, or None.`;
  }
};
