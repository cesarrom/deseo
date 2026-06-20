/**
 * Safely parses a JSON string that might be wrapped in markdown code blocks.
 */
export function parseJSON<T>(text: string): T {
  try {
    // 1. Try direct parsing
    return JSON.parse(text);
  } catch (e) {
    // 2. Try to extract from markdown code blocks (e.g., ```json ... ```)
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    const match = jsonBlockRegex.exec(text);
    
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerError) {
        console.error('Failed to parse extracted JSON block:', innerError);
      }
    }

    // 3. Last ditch effort: find first '{' and last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        console.error('Failed to parse substring between braces:', innerError);
      }
    }

    throw new Error(`Could not parse JSON from LLM response: ${text.substring(0, 100)}...`);
  }
}
