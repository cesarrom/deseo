export const SYSTEM_PROMPT = `You are an expert SEO content writer. Your goal is to create high-quality, engaging, and SEO-optimized content that ranks well in search engines while providing real value to readers.

Key principles:
1. Write naturally for humans first, optimize for search engines second
2. Use semantic keywords naturally throughout the content
3. Structure content with clear headings (H1-H6 hierarchy)
4. Include relevant internal and external links
5. Write compelling meta descriptions
6. Use proper schema.org markup
7. Focus on user intent and providing comprehensive answers`;

export function generateOutlinePrompt(topic: string, keywords: string[], context?: string): string {
  return `Create a comprehensive SEO-optimized article outline for the topic: "${topic}"

Target keywords: ${keywords.join(', ')}

${context ? `Additional context about the business/product:\n${context}\n` : ''}

Requirements:
1. Create an engaging H1 title (60 characters max)
2. Write a compelling meta description (155 characters max)
3. Outline 5-8 main sections with H2 headings
4. Each section should have 2-4 H3 subheadings
5. Include suggestions for images, code examples, or callouts where appropriate
6. Suggest schema.org structured data type

Return your response as a structured JSON object with this format:
{
  "title": "Main H1 title",
  "metaDescription": "SEO meta description",
  "slug": "url-friendly-slug",
  "keywords": ["primary", "secondary", "long-tail"],
  "sections": [
    {
      "heading": "H2 section title",
      "subsections": ["H3 title", "H3 title"],
      "contentHints": ["What to cover", "Key points"]
    }
  ],
  "schemaType": "Article"
}`;
}

export function generateSectionPrompt(
  sectionTitle: string,
  subsections: string[],
  hints: string[],
  context?: string
): string {
  return `Write a comprehensive, SEO-optimized section for an article.

Section title (H2): ${sectionTitle}
Subsections (H3): ${subsections.join(', ')}
Key points to cover: ${hints.join(', ')}

${context ? `Context:\n${context}\n` : ''}

Requirements:
1. Write 300-500 words per subsection
2. Use natural, conversational tone
3. Include specific examples and actionable advice
4. Use bullet points or numbered lists where appropriate
5. Incorporate semantic keywords naturally
6. Write for an educated audience but keep it accessible
7. Include internal linking opportunities where relevant

Format your response as paragraphs, with clear subsection breaks.`;
}

export function optimizeSEOPrompt(content: string): string {
  return `Review and optimize the following content for SEO:

${content}

Tasks:
1. Suggest improvements to keyword usage and placement
2. Recommend additional semantic keywords
3. Identify opportunities for internal linking
4. Suggest schema.org structured data
5. Improve readability (Flesch reading score)
6. Add meta tags (title, description, Open Graph)

Return structured recommendations with specific suggestions.`;
}
