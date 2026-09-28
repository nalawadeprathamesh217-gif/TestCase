# AI Test Manager — AI & Algorithms

## 1. Overview
AI Test Manager leverages both deterministic algorithms and Artificial Intelligence (AI) to streamline Quality Assurance. It integrates Large Language Models (LLMs) into the test case lifecycle while maintaining a strict "Human-in-the-Loop" architecture.

## 2. AI Architecture
The system uses AI to automate tedious QA tasks (e.g., test case generation and quality evaluation) while relying on human experts for final approvals. AI acts as an assistant, never as an autonomous decision-maker.

**Gemini LLM**: The core large language model powering the AI capabilities.
**Gemini API**: The communication interface connecting the backend to the LLM.
**Node.js Backend**: Controls the AI workflow and maintains the API key securely.
**Prompt**: The structured context and instructions sent to Gemini.
**Structured Output**: The JSON-formatted response returned by Gemini.
**Validation**: The backend logic that verifies the AI response before saving to the database.

*We are NOT developing or training Gemini. We are integrating Google's pretrained Gemini LLM into our software testing workflow.*

## 3. AI Provider Abstraction
An abstraction layer (`GeminiProvider.js`) allows the application to cleanly interface with the Google Generative AI SDK. Business controllers interact with this provider, keeping SDK logic out of HTTP route handlers.

## 4. Requirement Extraction
Requirements are extracted from documents using rule-based NLP (e.g., detecting keywords like "shall" or "must"). While AI can also be used here, simple deterministic rules often provide a fast baseline for identifying candidate requirements.

## 5. AI Test Case Generation
**[AI-GENERATION]**
Approved requirements are sent to an LLM with a structured prompt. The LLM generates test case *candidates* (JSON). These candidates must be reviewed and approved by a human tester before becoming official test cases.

## 6. Test Case Quality Scoring
**[ALGO-SCORING]**
A deterministic algorithm calculates an overall quality score using a weighted average of completeness, clarity, relevance, and consistency (each worth 25%). 

## 7. Requirement Coverage
**[AI-COVERAGE]**
The AI compares a requirement to a test case and explains which parts are covered, partially covered, or missing. This provides explainability but does not automatically approve coverage.

## 8. SHA-256 Exact Duplicate Detection
**[ALGO-SHA256]**
A cryptographic hash (SHA-256) is generated from normalized canonical text (Title, Description, Steps). If two test cases have identical hashes, they are exact text duplicates. This approach is fast but cannot detect semantic duplicates.

## 9. Text Embeddings
**[ALGO-EMBEDDING]**
Text embeddings convert test case text into numerical vectors representing semantic meaning. Similar meanings yield vectors that are mathematically close to each other.

## 10. Cosine Similarity
**[ALGO-COSINE]**
Cosine similarity calculates the angle between two embedding vectors. A similarity score closer to 1 indicates that two test cases are semantically similar.

## 11. PostgreSQL pgvector
The `pgvector` extension allows PostgreSQL to store embeddings and perform fast vector similarity searches directly in the database.

## 12. Semantic Duplicate Detection
**[AI-DUPLICATE]**
Uses embeddings and cosine similarity via `pgvector` to find potentially duplicate test cases, even if they use different wording (e.g., "Log in" vs. "Sign in").

## 13. AI Duplicate Classification
When similarity is high, the AI compares the test cases and classifies their relationship (e.g., "Likely Duplicate", "Related but Distinct"). A human makes the final merge/delete decision.

## 14. AI Defect Analysis
**[AI-DEFECT]**
If enabled, the AI analyzes execution failures against the requirement and test steps to suggest root causes and defect severity.

## 15. Human-in-the-Loop Architecture
Every AI feature generates *candidates* or *suggestions*. A human must always review and approve the action. AI never automatically modifies the source of truth.

## 16. AI Security
AI API keys are strictly kept on the backend. Prompts are sanitized, and AI JSON responses are strictly validated to prevent injection or corruption of database records.

## 17. AI Failure Handling
If the AI provider is down or returns invalid JSON, the system degrades gracefully, informing the user without crashing the application.

## 18. Complete Data Flow
Requirement (Text) -> AI LLM -> Test Case Candidate (JSON) -> Human Approval -> Test Case (DB) -> Embedding Model -> Vector (pgvector) -> Cosine Similarity -> Duplicate Analysis.

## 19. Core Terminology Definitions

To ensure clarity, the following definitions govern this architecture:

- **Gemini / Fallback Provider**: The primary and fallback Artificial Intelligence / Large Language Model (AI/LLM) used for text generation, evaluation, and explanation.
- **SHA-256**: The cryptographic algorithm used for exact duplicate detection.
- **Embedding**: A numerical vector representing the semantic representation (meaning) of a text.
- **Cosine Similarity**: The mathematical similarity calculation used to compare embeddings.
- **pgvector**: The PostgreSQL extension used for vector storage and semantic search.
- **Rule-based Checks**: Deterministic logic (e.g., checking if fields are empty) used before or after AI processes.
- **Weighted Scoring**: The deterministic quality calculation based on mathematical weighting, distinct from AI generation.

## 20. Algorithms vs AI Models

| Feature | Technique | AI? |
|---|---|---|
| Requirement extraction | Rule-based NLP | Optional AI |
| Test generation | Prompting + structured output | Yes |
| Quality checks | Rule-based validation | No |
| Quality evaluation | LLM reasoning | Yes |
| Quality score | Weighted average | No |
| Exact duplicates | SHA-256 | No |
| Semantic duplicates | Embeddings | AI/ML |
| Similarity | Cosine similarity | Algorithm |
| Vector search | pgvector | No |
| Duplicate classification | LLM | Yes |
| Defect analysis | LLM | Yes |

## 21. Interview/Viva Explanation
This architecture proves that AI can be safely integrated into enterprise software by combining non-deterministic LLMs with strict deterministic validation, embedding-based semantic search, and mandatory human oversight.
