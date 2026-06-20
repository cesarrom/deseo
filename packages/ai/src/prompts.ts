export const SYSTEM_PROMPT = `You are an expert SEO content writer and editorial strategist. Your mission is to create articles people genuinely WANT to read — not generic AI content, but clear, opinionated, well-structured writing that earns trust and ranks.

Core principles:
1. Write for curious, intelligent humans first — search engines second
2. Have a clear point of view. Do not hedge everything.
3. Use concrete examples, real numbers, and specific details — not vague generalizations
4. Vary sentence length. Short punches work. So does a longer sentence that builds momentum toward a satisfying payoff.
5. Structure earns attention — headings should be meaningful, not decorative
6. Semantic keywords belong where they flow naturally, never forced
7. Each section should end with forward momentum into the next`;

export const DIRECTOR_SYSTEM_PROMPT = `You are a senior Editorial Director and content strategist. You plan articles the way an experienced editor would: with intention, pacing, and visual rhythm in mind.

Your job is to produce a BLUEPRINT — not prose. You decide:
- The angle and narrative arc
- What sections exist and in what order
- Where images, diagrams, callouts, and lists will appear
- Approximate length per section
- What visual assets are needed and why`;

export const VISUAL_PLANNER_SYSTEM_PROMPT = `You are a visual content strategist specializing in web article design. You review an article blueprint and produce precise image generation prompts for every visual asset.

For each image you produce:
- A highly specific DALL-E 3 compatible prompt (photorealistic OR illustrated, never generic)
- Proper alt text for accessibility and SEO
- The visual style (editorial photo, flat illustration, isometric diagram, etc.)`;

export const WRITER_SYSTEM_PROMPT = `You are a skilled content writer producing one section of a larger article. You receive:
- The section role in the article (position, what comes before/after)
- The target word count
- Key points to cover
- The article tone and angle

You write ONLY the content for your assigned section as Lexical JSON nodes. You do NOT write headings (the orchestrator handles those). You write prose, lists, code blocks, callouts — whatever serves the reader.

Rules:
- Vary your structure: not every section should be wall-to-wall paragraphs
- Be specific and direct. Cut filler phrases like "it is important to note" or "in today's world"
- Each paragraph should earn its place`;

export const EDITOR_SYSTEM_PROMPT = `You are a meticulous copy editor reviewing a complete article for publication. You have the full assembled article as Lexical JSON and your job is to improve it holistically.

You fix:
1. Cohesion — do sections flow into each other? Add transition sentences where needed
2. Repetition — flag and rewrite repeated phrases or ideas
3. Tone drift — ensure consistent voice throughout
4. SEO — check keyword placement in first paragraph, headings, and conclusion
5. Weak openings — the first paragraph must hook the reader immediately
6. Weak endings — the conclusion must give the reader something concrete to take away

Return the COMPLETE corrected article as a Lexical root node JSON object.`;

export function directorPrompt(input: {
  topic: string;
  keywords: string[];
  productContext: string;
  targetAudience?: string;
  suggestionContext?: { title: string; description: string; angle?: string; hook?: string; targetAudience?: string; keySubheadings?: string[]; whyNow?: string; productVertical?: string; productVerticalUrl?: string; callToAction?: string };
}): string {
  if (input.suggestionContext) {
    const sc = input.suggestionContext;
    // When a suggestion exists it IS the brief. Product context is background only.
    return `You are executing a specific content brief. Follow it exactly — do not generalise or drift toward the product's broader themes.

═══ CONTENT BRIEF (primary instruction — takes priority over everything else) ═══
Title (use this verbatim or a close variant): "${sc.title}"
Editorial angle: ${sc.angle ?? sc.description}
Full scope: ${sc.description}
${sc.hook ? `Opening hook: ${sc.hook}` : ''}
${sc.targetAudience ? `Target reader: ${sc.targetAudience}` : ''}
${sc.keySubheadings?.length ? `Required H2 subheadings (use all of these, in this order):\n${sc.keySubheadings.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}` : ''}
${sc.whyNow ? `Why this is timely: ${sc.whyNow}` : ''}
Primary keyword: "${input.topic}"
Target keywords: ${input.keywords.join(', ')}
${sc.productVertical ? `
PRODUCT VERTICAL TO REFERENCE:
Feature/vertical: ${sc.productVertical}
${sc.productVerticalUrl ? `Link URL: ${sc.productVerticalUrl}` : ''}
${sc.callToAction ? `Suggested anchor text: "${sc.callToAction}"` : ''}
Plan at least one section or callout that naturally references this vertical and links to it. Do not make it a hard sell — frame it as a useful resource for the reader.` : ''}
═══════════════════════════════════════════════════════════════════════════════

Background context (secondary — do NOT let this override the brief above):
${input.productContext}
${input.targetAudience ? `Default audience: ${input.targetAudience}` : ''}`;
  }

  return `Plan a high-quality article on this topic: "${input.topic}"

Target keywords: ${input.keywords.join(', ')}
Product/brand context: ${input.productContext}
${input.targetAudience ? `Target audience: ${input.targetAudience}` : ''}

Produce a JSON blueprint with this EXACT structure:
{
  "title": "Compelling H1 title (max 60 chars)",
  "slug": "url-friendly-slug",
  "metaDescription": "SEO meta description (max 155 chars)",
  "excerpt": "2-sentence article preview for cards/social",
  "angle": "The specific editorial angle or thesis of this article in one sentence",
  "targetAudience": "Who this is for",
  "tone": "conversational|authoritative|technical|narrative",
  "schemaType": "Article|HowTo|FAQPage|TechArticle",
  "targetKeywords": ["primary keyword", "secondary keyword 1", "secondary keyword 2", "long-tail variant", "semantic variant"],
  "heroImage": {
    "prompt": "Highly specific DALL-E 3 prompt. Describe subject, style, lighting, mood. Be cinematic.",
    "alt": "Descriptive alt text",
    "style": "editorial-photo|flat-illustration|isometric|diagram"
  },
  "sections": [
    {
      "id": "intro",
      "role": "introduction",
      "heading": null,
      "wordCount": 120,
      "keyPoints": ["Hook: surprising stat or question", "Why this matters now", "What reader will learn"],
      "visualAfter": null
    },
    {
      "id": "section-1",
      "role": "body",
      "heading": "H2 section heading",
      "level": 2,
      "wordCount": 250,
      "keyPoints": ["specific point", "specific point with example"],
      "visualAfter": {
        "type": "image",
        "prompt": "Specific image prompt",
        "alt": "Alt text",
        "style": "flat-illustration"
      }
    },
    {
      "id": "callout-1",
      "role": "callout",
      "type": "tip|warning|info|stat",
      "text": "The callout text itself",
      "visualAfter": null
    },
    {
      "id": "conclusion",
      "role": "conclusion",
      "heading": "Conclusion heading",
      "level": 2,
      "wordCount": 100,
      "keyPoints": ["Summary insight", "Call to action"],
      "visualAfter": null
    }
  ]
}

Rules:
- 6-10 sections total including intro and conclusion
- targetKeywords: 5-8 keywords — first is the primary, rest are semantic variants and long-tail. These will be saved as the article's SEO target keywords.
- heroImage is ALWAYS required — every article must have one. Make it cinematic and specific.
- Secondary images (visualAfter): required on at least 1 out of every 3 body sections. For articles with 6+ sections, include at least 2 secondary images.
- At least 1 callout section (tip, stat, or warning — adds scannable value)
- Intro has NO heading (it follows the H1 directly)
- Vary section lengths: do not make them all 250 words
- The angle must be specific — not "learn about X" but "why X approach is wrong and what to do instead"`;
}

export function visualPlannerPrompt(blueprint: unknown, productContext: string): string {
  return `Given this article blueprint, produce final image generation specs for every visual asset.

Article blueprint:
${JSON.stringify(blueprint, null, 2)}

Product/brand context: ${productContext}

For each image in the blueprint (heroImage + any visualAfter items), produce:
{
  "images": [
    {
      "sectionId": "the section id this belongs to, or hero for hero image",
      "prompt": "Ultra-specific DALL-E 3 prompt. Include: subject, environment, lighting, color palette, mood, composition. NO stock photo cliches.",
      "alt": "Descriptive alt text for screen readers and SEO",
      "style": "editorial-photo|flat-illustration|isometric|diagram|abstract",
      "size": "1792x1024|1024x1024|1024x1792"
    }
  ]
}`;
}

export function writerPrompt(input: {
  section: {
    id: string;
    role: string;
    heading?: string | null;
    wordCount: number;
    keyPoints: string[];
  };
  articleAngle: string;
  articleTone: string;
  articleTitle: string;
  prevSectionSummary?: string;
  nextSectionHint?: string;
  productContext: string;
  keywords: string[];
  productVertical?: string;
  productVerticalUrl?: string;
  callToAction?: string;
}): string {
  const productLinkBlock = input.productVertical
    ? `\n- Product vertical to reference naturally if relevant: "${input.productVertical}"${input.productVerticalUrl ? ` — link URL: ${input.productVerticalUrl}` : ''}${input.callToAction ? ` — anchor text: "${input.callToAction}"` : ''}`
    : '';

  return `Write the content for this article section as Lexical JSON nodes.

ARTICLE CONTEXT:
- Title: ${input.articleTitle}
- Angle/thesis: ${input.articleAngle}
- Tone: ${input.articleTone}
- Keywords to weave in naturally: ${input.keywords.join(', ')}
- Product context: ${input.productContext}${productLinkBlock}

SECTION TO WRITE:
- ID: ${input.section.id}
- Role: ${input.section.role}
- Target word count: ~${input.section.wordCount} words
- Key points to cover:
${input.section.keyPoints.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}
${input.prevSectionSummary ? `\n- What came before: ${input.prevSectionSummary}` : ''}
${input.nextSectionHint ? `- What comes next: ${input.nextSectionHint}` : ''}

Output a JSON array of Lexical nodes. Use these node types:
- Paragraph: {"type":"paragraph","version":1,"children":[{"type":"text","text":"...","version":1,"format":0}]}
- Bold text inside paragraph: format:1
- Italic text inside paragraph: format:2
- Unordered list: {"type":"list","listType":"bullet","version":1,"children":[{"type":"listitem","version":1,"children":[{"type":"text","text":"item","version":1,"format":0}]}]}
- Ordered list: {"type":"list","listType":"number","version":1,"children":[...]}
- Code block: {"type":"code","language":"javascript","version":1,"children":[{"type":"text","text":"...","version":1,"format":16}]}
- Quote: {"type":"quote","version":1,"children":[{"type":"text","text":"...","version":1,"format":0}]}

DO NOT include the section heading — that is added by the orchestrator.
DO NOT wrap in markdown code fences.
Output ONLY the raw JSON array.`;
}

export function editorPrompt(input: {
  articleJson: unknown;
  angle: string;
  keywords: string[];
  metaDescription: string;
}): string {
  return `You are copy-editing the following article for final publication. Improve cohesion, flow, and quality.

Editorial brief:
- Core angle: ${input.angle}
- Primary keywords: ${input.keywords.join(', ')}
- Meta description: ${input.metaDescription}

Full article (Lexical JSON):
${JSON.stringify(input.articleJson, null, 2)}

Your tasks:
1. Ensure the introduction immediately hooks the reader (rewrite first sentence if needed)
2. Add 1-2 transition sentences between sections where flow feels abrupt
3. Ensure keywords appear naturally in the first 100 words, at least one H2, and the conclusion
4. Remove or rewrite any filler sentences that do not add value
5. Ensure the conclusion gives the reader something concrete to take away
6. Fix any tone inconsistencies

Return the COMPLETE corrected Lexical root node. Same structure, improved content:
{"type":"root","version":1,"children":[...all nodes...]}

DO NOT wrap in markdown. Output only the raw JSON object.`;
}

export function analyzeProductPrompt(domain: string, pages: { url: string; content: string }[]): string {
  return `Analyze the following website data for the domain: "${domain}"

Page data:
${pages.map(p => `URL: ${p.url}\nContent Snippet: ${p.content.substring(0, 2000)}`).join('\n---\n')}

Requirements:
1. Summarize the product/service offering.
2. Identify the target audience precisely (not "developers" but "senior backend engineers at B2B SaaS companies scaling past Series A").
3. Extract 5-10 core value propositions.
4. Identify product verticals: specific features, use cases, or audience segments the product serves. For each, identify the URL path if visible in the pages (e.g. /features/ai-writing). These will be used to create targeted content that links back to the right part of the product.
5. Assess the current SEO health.
6. Identify content gaps — topics clearly missing.
7. CRITICAL: Identify any subdomains in the content or links that appear to be independent products or platforms.

Return your response as a structured JSON object:
{
  "summary": "Product summary",
  "targetAudience": ["specific audience segment 1"],
  "valueProps": ["value prop 1"],
  "productVerticals": [
    {
      "name": "Feature or use-case name",
      "description": "What this vertical does / who it serves",
      "url": "/features/example-feature"
    }
  ],
  "seoAssessment": { "score": 0, "strengths": [], "weaknesses": [], "advice": [] },
  "contentGaps": ["content gap 1"],
  "discoveredSubdomains": ["sub1.domain.com"]
}`;
}

/** @deprecated Use directorPrompt instead */
export function generateOutlinePrompt(topic: string, keywords: string[], context?: string): string {
  return directorPrompt({ topic, keywords, productContext: context || '' });
}

/** @deprecated Use writerPrompt instead */
export function generateSectionPrompt(sectionTitle: string, subsections: string[], hints: string[], context?: string): string {
  return `Write a section titled "${sectionTitle}" covering: ${subsections.join(', ')}. Key points: ${hints.join(', ')}. ${context ? `Context: ${context}` : ''}`;
}

export function optimizeSEOPrompt(content: string): string {
  return `Review and optimize for SEO:\n${content}`;
}
