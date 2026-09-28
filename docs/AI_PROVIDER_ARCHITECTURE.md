# AI Provider Architecture

This document describes the AI Provider architecture for the AI Test Manager application, including how the system uses Gemini as the primary provider and how it handles fallback to secondary providers.

## 1. Why Gemini is Primary
The application is built around Gemini for generating test cases, evaluating test case quality, and explaining coverage. Gemini provides reliable structured output (JSON) and is the default AI provider configured for the platform.

## 2. What Fallback AI Means
When Gemini cannot complete an AI request due to a supported failure (such as quota exhaustion or temporary unavailability), the system can automatically switch to a configured Fallback AI Provider. This ensures that users can continue generating test cases without interruption. The fallback AI is a real API service (e.g., an OpenAI-compatible endpoint), never a mock or randomized response.

## 3. Provider Abstraction
The system uses a centralized AI Provider Manager (`AIProviderManager.js`) that handles routing requests between the primary and fallback providers. Both `GeminiProvider` and `FallbackProvider` implement a common interface for:
- `generateTestCases(requirement, count)`
- `evaluateQuality(requirement, testCase, ruleFindings)`
- `getRequirementCoverage(requirement, testCase)`
- `createEmbedding(text)`

This abstraction ensures that AI features do not call providers directly, but rather use the manager.

## 4. Error Classification
Errors are intercepted and classified using `aiErrors.js` to determine the next steps:
- **Transient Errors (e.g., 503, 502, 504, 408):** Can be retried.
- **Quota Exceeded (e.g., 429):** Retries are immediately stopped, and the request moves to the fallback provider if enabled.
- **Permanent Errors (e.g., 400, 401, 403):** Not retried.

## 5. Retry Strategy
Transient errors from the primary provider are retried up to 3 times with exponential backoff and jitter. If all attempts fail, the system falls back to the secondary provider if one is configured.

## 6. Quota Handling
A 429 (Quota Exceeded) error from Gemini immediately stops retrying, skipping straight to the fallback provider. If no fallback is configured, a clear quota error is returned to the frontend.

## 7. Fallback Flow
1. Attempt primary provider (Gemini).
2. If transient failure, retry.
3. If quota exhausted or max retries reached, switch to Fallback Provider (if enabled).
4. If fallback succeeds, return result and record `fallback_used: true`.
5. If fallback fails, return an error.

## 8. Structured Output Validation
All AI responses are validated using `structuredOutputValidator.js` before they are sent back to the application or saved in the database. This guarantees that both Gemini and the fallback provider return the exact same normalized structure (e.g., containing `testCases` array with required properties).

## 9. Human Review
Regardless of which provider generated the test case candidates, human review is mandatory. Candidates appear in the same review UI, and a human must explicitly accept them before they become actual test cases in the database.

## 10. Security
API keys (`GEMINI_API_KEY` and `AI_FALLBACK_API_KEY`) are kept exclusively on the backend via environment variables and are never exposed to the frontend, browser, or API responses. 

## 11. Database Tracking
The database schema (`test_case_generation_runs`, etc.) tracks metadata for every AI operation, including:
- `ai_provider`
- `ai_model`
- `attempt_count`
- `fallback_used`
- `failure_reason`
This ensures reproducibility and auditing of AI interactions.

## 12. Example Generation Flow
1. User clicks "Generate Test Cases".
2. `AIProviderManager` tries Gemini (Attempt 1).
3. Gemini returns 503 Service Unavailable.
4. Manager retries (Attempt 2). Gemini returns 429 Quota Exceeded.
5. Manager stops retrying Gemini and switches to Fallback Provider.
6. Fallback Provider succeeds.
7. Validation succeeds.
8. Database is updated with the candidate test cases and run metadata (`fallback_used: true`).
9. Frontend shows a small informational message: "Gemini was temporarily unavailable. The test cases were generated using the configured fallback AI provider."
10. User reviews the candidates and accepts them.
