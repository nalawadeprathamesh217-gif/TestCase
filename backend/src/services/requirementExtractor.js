// [ALGO-REQUIREMENT-EXTRACTION]
// ============================================================
// SERVICE: REQUIREMENT EXTRACTION FROM DOCUMENT TEXT
// ============================================================
//
// Strategy:
//   1. PRIMARY: Gemini AI — structured JSON extraction with
//      explicit ID preservation, title, description, priority.
//   2. FALLBACK: Regex-based extraction — when AI is not
//      configured or fails. Detects common ID formats and
//      requirement keywords.
//
// ID Handling:
//   - If the source document contains an explicit requirement ID
//     (e.g. REQ-AI-005, FR-01, NFR-001), that ID is preserved
//     verbatim in the `requirement_id` field.
//   - The database `id` (UUID) is always the primary key.
//   - `source_reference` stores the original raw ID string
//     found in the document.
//   - If no explicit ID exists, a sequential fallback is used:
//     SRC-<DOCPREFIX>-<NNN> and `source_reference` is null.
//
// Supported ID formats (auto-detected):
//   REQ-XXXX-NNN, REQ-NNN, FR-NN, BR-NN, NFR-NNN, UC-NN
//   and any alphanumeric prefix followed by a dash and digits.

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// ── Regex: matches requirement-like IDs anywhere in text ──────────────────────
// Captures patterns like: REQ-AI-005, REQ-001, FR-01, NFR-001, BR-03, UC-12
const EXPLICIT_ID_REGEX = /\b([A-Z]{1,8}-[A-Z]{0,6}-?\d{1,5})\b/g;

// Matches a line that IS an ID definition header (e.g. "REQ-AI-005: AI Generation")
const ID_HEADER_REGEX = /^([A-Z]{1,8}-[A-Z]{0,6}-?\d{1,5})[:\s–\-]+(.+)$/;

// Requirement keyword signal
const KEYWORD_REGEX = /\b(shall|must|should|required to|will)\b/i;

/**
 * Extract all explicit requirement IDs found in a block of text.
 * Returns an array of unique ID strings in document order.
 */
function detectExplicitIds(text) {
  const matches = [];
  const seen = new Set();
  let m;
  const re = new RegExp(EXPLICIT_ID_REGEX.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      matches.push(id);
    }
  }
  return matches;
}

/**
 * Parse a text chunk into structured requirement blocks using
 * explicit ID markers in the document.
 *
 * The document is split on known ID headers. Each block:
 *   - starts with the ID header line
 *   - continues until the next ID header or end of text
 *
 * Returns array of { sourceId, headerLine, bodyText }
 */
function parseRequirementBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentBlock = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(ID_HEADER_REGEX);

    if (headerMatch) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = {
        sourceId: headerMatch[1].trim(),
        headerLine: trimmed,
        bodyLines: [trimmed],
      };
    } else if (currentBlock) {
      currentBlock.bodyLines.push(trimmed);
    }
  }

  if (currentBlock) blocks.push(currentBlock);
  return blocks;
}

/**
 * Fallback: sentence-level keyword extraction when no structured
 * ID blocks are found. Assigns generated SRC-<PREFIX>-NNN IDs.
 */
function fallbackExtract(text, docPrefix) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const results = [];
  let n = 1;

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    if (!KEYWORD_REGEX.test(s)) continue;

    // Try to detect an inline explicit ID in the sentence
    const inlineIds = detectExplicitIds(s);
    const sourceId = inlineIds.length > 0 ? inlineIds[0] : null;

    const paddedN = String(n).padStart(3, '0');
    const reqId = sourceId || `SRC-${docPrefix}-${paddedN}`;

    results.push({
      requirement_id: reqId,
      title: buildTitleFromSentence(s),
      description: s,
      priority: /\b(must|shall)\b/i.test(s) ? 'High' : 'Medium',
      source_requirement_id: sourceId,
      source_reference: sourceId,
      is_source_id: !!sourceId,
    });
    n++;
  }
  return results;
}

/**
 * Derive a short title from a sentence (first meaningful clause).
 */
function buildTitleFromSentence(sentence) {
  // Strip leading ID patterns
  const stripped = sentence.replace(/^[A-Z]{1,8}-[A-Z]{0,6}-?\d{1,5}[:\s–\-]+/, '').trim();
  // Take first clause up to comma/semicolon/period, max 80 chars
  const firstClause = stripped.split(/[,;.]/)[0].trim();
  return firstClause.length > 80 ? firstClause.substring(0, 77) + '...' : firstClause;
}

// ── AI Extraction via Gemini ──────────────────────────────────────────────────

/**
 * Use Gemini to extract structured requirements from document text.
 * The prompt instructs Gemini to:
 *   - Find explicit requirement IDs and preserve them exactly
 *   - Extract title and full description without summarizing
 *   - Set priority and infer source_requirement_id
 */
async function extractWithGemini(text, documentId, chunkId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.AI_MODEL || 'gemini-1.5-pro';
  const model = genAI.getGenerativeModel({ model: modelName });

  // Limit text length to avoid token overflow — split into windows if needed
  const MAX_CHARS = 28000;
  const textWindow = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;

  const prompt = `You are an expert requirements analyst reading a Software Requirements Specification (SRS) document.

Your task: extract ALL requirements from the document text below.

CRITICAL RULES:
1. If the document contains an explicit requirement ID (e.g. REQ-AI-005, REQ-AUTH-001, FR-01, NFR-001, BR-01), preserve it EXACTLY in the "source_requirement_id" field and also use it as the "requirement_id".
2. Do NOT invent, generate, or randomize requirement IDs.
3. Extract the actual title of the requirement from the document (e.g. "AI Generation", "User Authentication"). Do NOT use generic titles like "Extracted Requirement N".
4. Extract the FULL description sentence(s) — do not summarize or shorten. Preserve all conditions, actors, limits, and business rules.
5. If no explicit ID exists for a requirement, set source_requirement_id to null.
6. Set priority based on modal verbs: "shall"/"must" → "High", "should" → "Medium", "may"/"will" → "Low".
7. Status is always "Draft" — never auto-approve.
8. Return ONLY the JSON array. No markdown, no explanation.

Document text:
${textWindow}

Return a JSON array of requirement objects.`;

  const schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        requirement_id: { type: SchemaType.STRING },
        source_requirement_id: { type: SchemaType.STRING, nullable: true },
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        priority: { type: SchemaType.STRING },
        actor: { type: SchemaType.STRING, nullable: true },
        preconditions: { type: SchemaType.STRING, nullable: true },
        business_rules: { type: SchemaType.STRING, nullable: true },
        acceptance_criteria: { type: SchemaType.STRING, nullable: true },
      },
      required: ['requirement_id', 'title', 'description', 'priority'],
    },
  };

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);
  if (!Array.isArray(parsed)) throw new Error('Gemini returned non-array response');
  return parsed;
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Extract requirements from document text.
 *
 * @param {string} text          - Full extracted document text
 * @param {string} documentId    - UUID of the requirement_document row
 * @param {string} chunkId       - UUID of the document_text_chunks row
 * @param {string} fileName      - Original file name (for fallback ID prefix)
 * @param {string} createdBy     - User UUID
 * @returns {Promise<{ requirements: object[], stats: object }>}
 */
async function extractRequirements(text, documentId, chunkId, fileName, createdBy) {
  // Build a safe 3-char doc prefix for fallback IDs
  const docPrefix = (fileName || 'DOC').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'DOC';

  let rawRequirements = [];
  let extractionMethod = 'unknown';

  // ── Attempt 1: Gemini AI ──────────────────────────────────────────────────
  try {
    const aiResults = await extractWithGemini(text, documentId, chunkId);
    if (aiResults && aiResults.length > 0) {
      rawRequirements = aiResults;
      extractionMethod = 'gemini-ai';
      console.log(`[requirementExtractor] Gemini extracted ${aiResults.length} requirements`);
    }
  } catch (aiErr) {
    console.warn(`[requirementExtractor] Gemini extraction failed: ${aiErr.message}. Falling back to rule-based.`);
  }

  // ── Attempt 2: Structured block parsing (regex) ────────────────────────────
  if (rawRequirements.length === 0) {
    const blocks = parseRequirementBlocks(text);
    if (blocks.length > 0) {
      extractionMethod = 'regex-block';
      rawRequirements = blocks.map(block => {
        const body = block.bodyLines.join(' ').trim();
        // Title is the text after the ID on the header line
        const titleFromHeader = block.headerLine
          .replace(/^[A-Z]{1,8}-[A-Z]{0,6}-?\d{1,5}[:\s–\-]+/, '')
          .trim();
        const priority = KEYWORD_REGEX.test(body)
          ? /\b(must|shall)\b/i.test(body) ? 'High' : 'Medium'
          : 'Low';
        return {
          requirement_id: block.sourceId,
          source_requirement_id: block.sourceId,
          title: titleFromHeader || buildTitleFromSentence(body),
          description: body,
          priority,
        };
      });
      console.log(`[requirementExtractor] Regex-block extracted ${rawRequirements.length} requirements`);
    }
  }

  // ── Attempt 3: Sentence-level keyword fallback ─────────────────────────────
  if (rawRequirements.length === 0) {
    rawRequirements = fallbackExtract(text, docPrefix);
    extractionMethod = 'keyword-fallback';
    console.log(`[requirementExtractor] Keyword fallback extracted ${rawRequirements.length} requirements`);
  }

  // ── Deduplicate by requirement_id ─────────────────────────────────────────
  const seen = new Set();
  const deduped = [];
  for (const req of rawRequirements) {
    const key = req.requirement_id || req.source_requirement_id;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduped.push(req);
  }

  // ── Build final DB rows ────────────────────────────────────────────────────
  let counter = 1;
  const requirements = deduped.map(req => {
    const hasSourceId = !!(req.source_requirement_id);
    const paddedN = String(counter++).padStart(3, '0');

    // The display/business ID: prefer the source doc ID exactly
    const reqId = req.requirement_id
      || req.source_requirement_id
      || `SRC-${docPrefix}-${paddedN}`;

    return {
      // UUID primary key is added by Supabase (uuid_generate_v4())
      requirement_id: reqId,
      title: (req.title || '').trim() || reqId,
      description: (req.description || '').trim(),
      priority: req.priority || 'Medium',
      status: 'Draft',
      actor: req.actor || null,
      preconditions: req.preconditions || null,
      business_rules: req.business_rules || null,
      acceptance_criteria: req.acceptance_criteria || null,
      source_document_id: documentId,
      source_chunk_id: chunkId,
      source_page_number: req.source_page_number || null,
      // source_reference stores the exact ID string found in the document
      source_reference: hasSourceId ? req.source_requirement_id : null,
      created_by: createdBy,
    };
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const withSourceId = requirements.filter(r => r.source_reference !== null).length;
  const withoutSourceId = requirements.length - withSourceId;

  const stats = {
    extractionMethod,
    totalExtracted: requirements.length,
    withExplicitSourceId: withSourceId,
    withGeneratedId: withoutSourceId,
  };

  return { requirements, stats };
}

module.exports = { extractRequirements, detectExplicitIds };
