import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createOpenRouterClient, DEFAULT_MODEL, FAST_MODEL, SMART_MODEL } from './client';
import { generateImage } from './image-generator';
import type { ImageStorageProvider } from './storage';
import { parseMarkdownToNodes } from './article-generator';
import {
  DIRECTOR_SYSTEM_PROMPT,
  VISUAL_PLANNER_SYSTEM_PROMPT,
  WRITER_SYSTEM_PROMPT,
  EDITOR_SYSTEM_PROMPT,
  directorPrompt,
  visualPlannerPrompt,
  writerPrompt,
  editorPrompt,
} from './prompts';

// ---------------------------------------------------------------------------
// Lexical node types (recursive — kept as interfaces, not Zod schemas)
// ---------------------------------------------------------------------------

export interface LexicalTextNode {
  type: 'text';
  text: string;
  version: number;
  format: number;
}

export interface LexicalElementNode {
  type: string;
  version: number;
  tag?: string;
  listType?: string;
  language?: string;
  children: LexicalNode[];
  [key: string]: unknown;
}

export interface LexicalImageNode {
  type: 'image';
  version: number;
  src: string;
  altText: string;
  width?: number;
  height?: number;
  showCaption?: boolean;
  caption?: string;
  maxWidth?: number;
}

export type LexicalNode = LexicalTextNode | LexicalElementNode | LexicalImageNode;

export interface LexicalRoot {
  type: 'root';
  version: number;
  children: LexicalNode[];
}

// ---------------------------------------------------------------------------
// Zod schemas — source of truth for structured agent outputs
// ---------------------------------------------------------------------------

const BlueprintVisualSchema = z.object({
  type: z.string(),
  prompt: z.string(),
  alt: z.string(),
  style: z.string(),
}).nullable();

const BlueprintSectionSchema = z.object({
  id: z.string(),
  role: z.enum(['introduction', 'body', 'callout', 'conclusion']).catch('body'),
  heading: z.string().nullable().optional(),
  level: z.number().optional(),
  wordCount: z.number().optional(),
  keyPoints: z.array(z.string()).optional(),
  type: z.enum(['tip', 'warning', 'info', 'stat']).catch('info').optional(),
  text: z.string().optional(),
  visualAfter: BlueprintVisualSchema.optional(),
});

const ArticleBlueprintSchema = z.object({
  title: z.string(),
  slug: z.string(),
  metaDescription: z.string(),
  excerpt: z.string(),
  angle: z.string(),
  targetAudience: z.string(),
  tone: z.string(),
  schemaType: z.string(),
  targetKeywords: z.array(z.string()),
  heroImage: z.object({ prompt: z.string(), alt: z.string(), style: z.string() }),
  sections: z.array(BlueprintSectionSchema),
});

const ImageSpecSchema = z.object({
  sectionId: z.string(),
  prompt: z.string(),
  alt: z.string(),
  style: z.string(),
  size: z.enum(['1792x1024', '1024x1024', '1024x1792']).catch('1024x1024'),
});

const VisualPlanSchema = z.object({
  images: z.array(ImageSpecSchema),
});

// ---------------------------------------------------------------------------
// Exported types (inferred from schemas where applicable)
// ---------------------------------------------------------------------------

export type BlueprintVisual = z.infer<typeof BlueprintVisualSchema>;
export type BlueprintSection = z.infer<typeof BlueprintSectionSchema>;
export type ArticleBlueprint = z.infer<typeof ArticleBlueprintSchema>;
export type ImageSpec = z.infer<typeof ImageSpecSchema>;
export type VisualPlan = z.infer<typeof VisualPlanSchema>;

export interface AgentPipelineOptions {
  topic: string;
  keywords: string[];
  productContext: string;
  targetAudience?: string;
  smartModel?: string;
  writerModel?: string;
  fastModel?: string;
  imageModel?: string;
  apiKey?: string;
  generateImages?: boolean;
  imageStorage?: ImageStorageProvider;
  suggestionContext?: { title: string; description: string; angle?: string; hook?: string; targetAudience?: string; keySubheadings?: string[]; whyNow?: string; productVertical?: string; productVerticalUrl?: string; callToAction?: string };
}

export interface PipelineResult {
  blueprint: ArticleBlueprint;
  lexicalRoot: LexicalRoot;
  heroImageUrl?: string;
}

// ---------------------------------------------------------------------------
// Lexical node helpers
// ---------------------------------------------------------------------------

function textNode(text: string, format = 0): LexicalTextNode {
  return { type: 'text', text, version: 1, format };
}

function paragraphNode(children: LexicalNode[]): LexicalElementNode {
  return { type: 'paragraph', version: 1, children };
}

function headingNode(tag: 'h1' | 'h2' | 'h3' | 'h4', children: LexicalNode[]): LexicalElementNode {
  return { type: 'heading', version: 1, tag, children };
}

function calloutNode(text: string, variant: string): LexicalElementNode {
  return { type: 'quote', version: 1, children: [textNode(`[${variant.toUpperCase()}] ${text}`)] };
}

function imageNode(src: string, altText: string, caption?: string): LexicalImageNode {
  return { type: 'image', version: 1, src, altText, showCaption: !!caption, caption, maxWidth: 1200 };
}

// Fallback: parse markdown text into Lexical nodes when structured output fails
function markdownToLexical(text: string): LexicalNode[] {
  const contentNodes = parseMarkdownToNodes(text);
  return contentNodes.map((cn): LexicalElementNode => {
    switch (cn.type) {
      case 'heading':
        return headingNode(`h${cn.level}` as 'h1' | 'h2' | 'h3' | 'h4', [textNode(cn.text)]);
      case 'list':
        return {
          type: 'list', version: 1,
          listType: cn.ordered ? 'number' : 'bullet',
          children: cn.items.map(item => ({ type: 'listitem', version: 1, children: [textNode(item)] })),
        };
      case 'blockquote':
        return { type: 'quote', version: 1, children: [textNode(cn.text)] };
      case 'code':
        return { type: 'code', version: 1, language: cn.language, children: [textNode(cn.code, 16)] };
      case 'divider':
        return { type: 'horizontalrule', version: 1, children: [] };
      default:
        return paragraphNode([textNode('text' in cn ? (cn as { text: string }).text : '')]);
    }
  });
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function runDirectorAgent(options: AgentPipelineOptions): Promise<ArticleBlueprint> {
  console.log('🎬 [Director] Planning article blueprint...');
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.smartModel || SMART_MODEL);

  const { output } = await generateText({
    model,
    system: DIRECTOR_SYSTEM_PROMPT,
    prompt: directorPrompt({
      topic: options.topic,
      keywords: options.keywords,
      productContext: options.productContext,
      targetAudience: options.targetAudience,
      suggestionContext: options.suggestionContext,
    }),
    temperature: 0.7,
    output: Output.object({ schema: ArticleBlueprintSchema }),
  });

  console.log(`✅ [Director] Blueprint: "${output.title}" — ${output.sections.length} sections`);
  return output;
}

export async function runVisualPlannerAgent(
  blueprint: ArticleBlueprint,
  productContext: string,
  options: Pick<AgentPipelineOptions, 'apiKey' | 'fastModel'>,
): Promise<VisualPlan> {
  console.log('🎨 [VisualPlanner] Planning visuals...');
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.fastModel || FAST_MODEL);

  const { output } = await generateText({
    model,
    system: VISUAL_PLANNER_SYSTEM_PROMPT,
    prompt: visualPlannerPrompt(blueprint, productContext),
    temperature: 0.5,
    output: Output.object({ schema: VisualPlanSchema }),
  });

  console.log(`✅ [VisualPlanner] ${output.images.length} assets planned`);
  return output;
}

export async function runSectionWriterAgent(
  section: BlueprintSection,
  context: {
    articleTitle: string;
    articleAngle: string;
    articleTone: string;
    productContext: string;
    keywords: string[];
    prevSectionSummary?: string;
    nextSectionHint?: string;
    productVertical?: string;
    productVerticalUrl?: string;
    callToAction?: string;
  },
  options: Pick<AgentPipelineOptions, 'apiKey' | 'writerModel'>,
): Promise<LexicalNode[]> {
  if (section.role === 'callout' && section.text) {
    return [calloutNode(section.text, section.type || 'info')];
  }

  console.log(`✍️  [Writer] Writing section: ${section.id}`);
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.writerModel || DEFAULT_MODEL);
  const prompt = writerPrompt({
    section: {
      id: section.id,
      role: section.role,
      heading: section.heading,
      wordCount: section.wordCount || 200,
      keyPoints: section.keyPoints || [],
    },
    articleAngle: context.articleAngle,
    articleTone: context.articleTone,
    articleTitle: context.articleTitle,
    productContext: context.productContext,
    keywords: context.keywords,
    prevSectionSummary: context.prevSectionSummary,
    nextSectionHint: context.nextSectionHint,
    productVertical: context.productVertical,
    productVerticalUrl: context.productVerticalUrl,
    callToAction: context.callToAction,
  });

  try {
    const { output } = await generateText({
      model,
      system: WRITER_SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
      output: Output.array({ element: z.record(z.unknown()) }),
    });
    console.log(`✅ [Writer] ${section.id}: ${output.length} nodes`);
    return output as LexicalNode[];
  } catch {
    // Fallback: regenerate without Output constraint, parse markdown
    console.warn(`⚠️  [Writer] Structured output failed for ${section.id}, falling back to text`);
    const { text } = await generateText({ model, system: WRITER_SYSTEM_PROMPT, prompt, temperature: 0.8 });
    const nodes = markdownToLexical(text);
    console.log(`✅ [Writer] ${section.id}: ${nodes.length} nodes (fallback)`);
    return nodes;
  }
}

export async function generateArticleImage(
  spec: ImageSpec,
  options?: { apiKey?: string; imageModel?: string; storage?: ImageStorageProvider },
): Promise<string | null> {
  console.log(`🖼️  [ImageGen] Generating image for: ${spec.sectionId}`);
  try {
    const url = await generateImage({
      prompt: spec.prompt,
      model: options?.imageModel,
      apiKey: options?.apiKey,
      size: spec.size,
      storage: options?.storage,
    });
    console.log(`✅ [ImageGen] Done for ${spec.sectionId}`);
    return url;
  } catch (error) {
    console.error(`⚠️  [ImageGen] Failed for ${spec.sectionId}:`, error);
    return null;
  }
}

export function assembleArticle(
  blueprint: ArticleBlueprint,
  sectionNodes: Map<string, LexicalNode[]>,
  imageUrls: Map<string, string>,
): LexicalRoot {
  console.log('🔧 [Assembler] Assembling Lexical document...');
  const children: LexicalNode[] = [];

  children.push(headingNode('h1', [textNode(blueprint.title)]));

  const heroUrl = imageUrls.get('hero');
  if (heroUrl) children.push(imageNode(heroUrl, blueprint.heroImage.alt, blueprint.title));

  for (const section of blueprint.sections) {
    if (section.heading && section.level) {
      const tag = `h${Math.min(section.level, 4)}` as 'h2' | 'h3' | 'h4';
      children.push(headingNode(tag, [textNode(section.heading)]));
    }
    const nodes = sectionNodes.get(section.id);
    if (nodes && nodes.length > 0) children.push(...nodes);
    if (section.visualAfter) {
      const imgUrl = imageUrls.get(section.id);
      if (imgUrl) children.push(imageNode(imgUrl, section.visualAfter.alt));
    }
  }

  console.log(`✅ [Assembler] ${children.length} top-level nodes`);
  return { type: 'root', version: 1, children };
}

export async function runEditorAgent(
  lexicalRoot: LexicalRoot,
  blueprint: ArticleBlueprint,
  options: Pick<AgentPipelineOptions, 'apiKey' | 'smartModel'>,
): Promise<LexicalRoot> {
  console.log('✏️  [Editor] Reviewing article...');

  // Pull image nodes out before sending to the LLM — the editor should only
  // touch text content. LLMs drop image nodes when serialising JSON output.
  const savedImages: Array<{ index: number; node: LexicalImageNode }> = [];
  const textChildren = lexicalRoot.children.filter((node, index) => {
    if (node.type === 'image') {
      savedImages.push({ index, node: node as LexicalImageNode });
      return false;
    }
    return true;
  });
  const textOnlyRoot: LexicalRoot = { ...lexicalRoot, children: textChildren };

  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.smartModel || SMART_MODEL);

  let editedRoot = textOnlyRoot;
  try {
    const { output } = await generateText({
      model,
      system: EDITOR_SYSTEM_PROMPT,
      prompt: editorPrompt({
        articleJson: textOnlyRoot,
        angle: blueprint.angle,
        keywords: blueprint.sections.filter(s => s.keyPoints).flatMap(s => s.keyPoints ?? []).slice(0, 5),
        metaDescription: blueprint.metaDescription,
      }),
      temperature: 0.4,
      output: Output.json(),
    });

    const edited = output as unknown as LexicalRoot;
    if (edited?.type === 'root' && Array.isArray(edited.children)) {
      editedRoot = edited;
      console.log('✅ [Editor] Article polished');
    } else {
      console.warn('⚠️  [Editor] Unexpected root shape, using unedited text');
    }
  } catch (error) {
    console.error('⚠️  [Editor] Failed, using unedited text:', error);
  }

  // Re-inject image nodes at their original positions
  if (savedImages.length > 0) {
    const finalChildren = [...editedRoot.children];
    for (const { index, node } of savedImages) {
      finalChildren.splice(Math.min(index, finalChildren.length), 0, node);
    }
    return { ...editedRoot, children: finalChildren };
  }

  return editedRoot;
}

export async function runArticlePipeline(options: AgentPipelineOptions): Promise<PipelineResult> {
  const blueprint = await runDirectorAgent(options);

  const visualPlan = options.generateImages !== false
    ? await runVisualPlannerAgent(blueprint, options.productContext, options)
    : { images: [] };

  const sectionNodes = new Map<string, LexicalNode[]>();
  for (let i = 0; i < blueprint.sections.length; i++) {
    const section = blueprint.sections[i]!;
    const nodes = await runSectionWriterAgent(
      section,
      {
        articleTitle: blueprint.title,
        articleAngle: blueprint.angle,
        articleTone: blueprint.tone,
        productContext: options.productContext,
        keywords: options.keywords,
        prevSectionSummary: blueprint.sections[i - 1]?.heading ?? blueprint.sections[i - 1]?.id,
        nextSectionHint: blueprint.sections[i + 1]?.heading ?? blueprint.sections[i + 1]?.role,
      },
      options,
    );
    sectionNodes.set(section.id, nodes);
  }

  const imageUrls = new Map<string, string>();
  if (options.generateImages !== false) {
    for (const spec of visualPlan.images) {
      const url = await generateArticleImage(spec, { apiKey: options.apiKey, imageModel: options.imageModel, storage: options.imageStorage });
      if (url) imageUrls.set(spec.sectionId, url);
    }
  }

  const assembled = assembleArticle(blueprint, sectionNodes, imageUrls);
  const finalRoot = await runEditorAgent(assembled, blueprint, options);
  return { blueprint, lexicalRoot: finalRoot, heroImageUrl: imageUrls.get('hero') };
}
