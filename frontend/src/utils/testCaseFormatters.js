export function normalizeListField(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    } catch (e) {
      // Not a JSON array, fall through
    }

    // Fallback: split by newlines if it's a multiline string
    return trimmed.split(/\r?\n/)
      .map(line => line.trim())
      .map(line => line.replace(/^(\d+\.|\*|-|•)\s*/, '')) // Remove bullet points or numbers
      .filter(Boolean);
  }

  return [String(value)];
}
